import sys
import os
import time
import warnings
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager

# Suppress all Python runtime warnings cleanly
warnings.filterwarnings("ignore")
os.environ["PYTHONWARNINGS"] = "ignore"
os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict
import uvicorn
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

MODEL_ID = "Qwen/Qwen2.5-0.5B-Instruct"
tokenizer = None
model = None
ADAPTER_DIR = "pipeline/fine_tuned_jet_adapter"

class Message(BaseModel):
    role: str
    content: str

class PageContext(BaseModel):
    model_config = ConfigDict(extra="allow")

    route: Optional[str] = None
    pageTitle: Optional[str] = None
    currentStep: Optional[int] = None
    totalSteps: Optional[int] = None
    stepTitle: Optional[str] = None
    stepDescription: Optional[str] = None
    actionGuidance: Optional[str] = None
    activeTab: Optional[str] = None
    visibleContent: Optional[Any] = None
    metadata: Optional[Dict[str, Any]] = None

class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    messages: List[Message]
    context: Optional[PageContext] = None

class ChatResponse(BaseModel):
    message: str
    guardrailTriggered: bool = False
    guardrailReason: Optional[str] = None

def init_model():
    global tokenizer, model
    if model is None:
        print(f"[Local AI] Loading base model {MODEL_ID}...")
        t0 = time.time()
        tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, local_files_only=True)
        base_model = AutoModelForCausalLM.from_pretrained(
            MODEL_ID,
            torch_dtype=torch.float32,
            device_map="cpu",
            local_files_only=True
        )
        if os.path.exists(ADAPTER_DIR):
            from peft import PeftModel
            print(f"[Local AI] Activating fine-tuned LoRA adapter from {ADAPTER_DIR}...")
            model = PeftModel.from_pretrained(base_model, ADAPTER_DIR)
            print(f"[Local AI] Fine-tuned JET model loaded in {round(time.time() - t0, 2)}s")
        else:
            model = base_model
            print(f"[Local AI] Base model loaded in {round(time.time() - t0, 2)}s")

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        init_model()
    except Exception as e:
        print(f"[Local AI] Error during model initialization: {e}")
    yield

app = FastAPI(
    title="Deloitte JET Local AI Engine",
    version="1.0.0",
    lifespan=lifespan
)

@app.get("/health")
def health():
    return {
        "status": "ready" if model is not None else "loading",
        "model": MODEL_ID,
        "device": "cpu"
    }

@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    last_msg = ""
    for m in reversed(req.messages):
        if m.role == "user":
            last_msg = m.content.strip().lower()
            break

    if last_msg in ["/questions", "/help", "/prompts", "sample questions", "catalog", "show questions"]:
        catalog = (
            "### Deloitte JET AI Prompt Catalog\n\n"
            "Explore categorized inquiries across the platform. Click any question below to ask immediately:\n\n"
            "#### 1. Workflow & Current Step Guidance\n"
            "[ASK: What is this current step all about and what do I need to do?]\n"
            "[ASK: What file formats and schemas can I upload on Step 1?]\n"
            "[ASK: What are the 16 mandatory auto-cleansing rules on Step 3?]\n"
            "[ASK: What canonical CDM fields must be mapped on Step 4?]\n"
            "[ASK: How do I review the summary reconciliation on Step 6?]\n\n"
            "#### 2. Audit Risk Tests (01 to 12)\n"
            "[ASK: Explain Test 2 Suspect Keywords regex scanning and logic]\n"
            "[ASK: What does Test 3 Post-Closing Cutoff window measure?]\n"
            "[ASK: Explain Test 4 Unusual Accounts and conflicting pairings]\n"
            "[ASK: What are Test 8 Debits to Revenue Accounts?]\n"
            "[ASK: What are Test 9 Monitored and Rare Users?]\n\n"
            "#### 3. Forensic Mathematics & Benford Analysis\n"
            "[ASK: How is Benford's Law conformity score calculated?]\n"
            "[ASK: What does Mean Absolute Deviation (MAD) indicate?]\n"
            "[ASK: How does first-digit distribution detect artificial rounding?]\n\n"
            "#### 4. Column Health Diagnostics & Visualizations\n"
            "[ASK: Explain how the Column Health Visualizer renders grouped bars]\n"
            "[ASK: How does the parser handle accounting negative parentheses?]\n"
            "[ASK: What does distinct cardinality indicate in the health report?]\n\n"
            "#### 5. Planning Materiality & Standards\n"
            "[ASK: How do I configure overall planning materiality?]\n"
            "[ASK: How does ISA 240 define management override of controls?]\n"
            "[ASK: What are the 20 Golden DQC integrity rules?]"
        )
        return ChatResponse(message=catalog, guardrailTriggered=False)

    if model is None or tokenizer is None:
        init_model()

    # Formulate dynamic page and step context
    ctx_info = ""
    if req.context:
        c = req.context
        ctx_parts = []
        if c.pageTitle:
            ctx_parts.append(f"Current Screen: {c.pageTitle}")
        if c.currentStep:
            total_str = f" of {c.totalSteps}" if c.totalSteps else ""
            ctx_parts.append(f"Current Workflow Step: Step {c.currentStep}{total_str}")
        if c.stepTitle:
            ctx_parts.append(f"Step Name: {c.stepTitle}")
        if c.stepDescription:
            ctx_parts.append(f"Step Purpose: {c.stepDescription}")
        if c.actionGuidance:
            ctx_parts.append(f"Required Actions for this step: {c.actionGuidance}")
        if ctx_parts:
            ctx_info = "\n".join(ctx_parts)

    system_prompt = (
        "You are the Deloitte JET Assistant, an expert enterprise AI embedded within the Deloitte Automated Journal Entry Testing platform.\n"
        "You provide precise, professional audit guidance and step-by-step assistance.\n"
        "STRICT GUIDELINES:\n"
        "1. Never use the word 'Omnia'. Always refer to 'Deloitte JET', 'Audit Tests', or 'Journal Entry Testing'.\n"
        "2. Do not use informal emojis.\n"
        "3. Keep answers clear, structured with markdown bold headings and concise bullet points.\n"
        "4. When the user asks about their current step or what to do, use the provided Current Screen and Step context to guide them directly on what to upload, configure, or inspect."
    )

    if ctx_info:
        system_prompt += f"\n\nCURRENT USER PLATFORM STATE:\n{ctx_info}"

    # Build messages
    has_system = any(m.role == "system" for m in req.messages)
    formatted_messages = []
    if not has_system:
        formatted_messages.append({"role": "system", "content": system_prompt})
    for m in req.messages[-10:]:
        formatted_messages.append({"role": m.role, "content": m.content})

    text = tokenizer.apply_chat_template(formatted_messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer([text], return_tensors="pt")

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=384,
            do_sample=False,
            pad_token_id=tokenizer.eos_token_id
        )

    response_text = tokenizer.batch_decode(
        outputs[:, inputs.input_ids.shape[1]:],
        skip_special_tokens=True
    )[0].strip()

    # Post-clean: Ensure no "Omnia" leaks out
    response_text = response_text.replace("Omnia", "Deloitte JET").replace("omnia", "deloitte jet")

    return ChatResponse(message=response_text, guardrailTriggered=False)

if __name__ == "__main__":
    port = int(os.environ.get("AI_PORT", 5005))
    print(f"Starting Deloitte JET Local AI Server on port {port}...")
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
