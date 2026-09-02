import sys
import os
import time
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

app = FastAPI(title="Deloitte JET Local AI Engine", version="1.0.0")

MODEL_ID = "Qwen/Qwen2.5-0.5B-Instruct"
tokenizer = None
model = None

class Message(BaseModel):
    role: str
    content: str

class PageContext(BaseModel):
    route: Optional[str] = None
    pageTitle: Optional[str] = None
    currentStep: Optional[int] = None
    totalSteps: Optional[int] = None
    stepTitle: Optional[str] = None
    stepDescription: Optional[str] = None
    actionGuidance: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class ChatRequest(BaseModel):
    messages: List[Message]
    context: Optional[PageContext] = None

class ChatResponse(BaseModel):
    message: str
    guardrailTriggered: bool = False
    guardrailReason: Optional[str] = None

def init_model():
    global tokenizer, model
    if model is None:
        print(f"[Local AI] Loading {MODEL_ID} from local cache...")
        t0 = time.time()
        tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, local_files_only=True)
        model = AutoModelForCausalLM.from_pretrained(
            MODEL_ID,
            torch_dtype=torch.float32,
            device_map="cpu",
            local_files_only=True
        )
        print(f"[Local AI] Model loaded successfully in {round(time.time() - t0, 2)}s")

@app.on_event("startup")
def startup_event():
    try:
        init_model()
    except Exception as e:
        print(f"[Local AI] Warning during model initialization: {e}")

@app.get("/health")
def health():
    return {
        "status": "ready" if model is not None else "loading",
        "model": MODEL_ID,
        "device": "cpu"
    }

@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
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
    formatted_messages = [{"role": "system", "content": system_prompt}]
    for m in req.messages[-6:]: # include up to 6 recent messages
        formatted_messages.append({"role": m.role, "content": m.content})

    text = tokenizer.apply_chat_template(formatted_messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer([text], return_tensors="pt")

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=220,
            temperature=0.3,
            do_sample=True,
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
