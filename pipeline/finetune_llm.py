import os
import json
import time
import torch
from torch.utils.data import Dataset, DataLoader
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import LoraConfig, get_peft_model, TaskType

MODEL_ID = "Qwen/Qwen2.5-0.5B-Instruct"
OUTPUT_DIR = "pipeline/fine_tuned_jet_adapter"
DATASET_PATH = "pipeline/finetuning_dataset.jsonl"

def train():
    print(f"=== Starting Deloitte JET LLM Fine-Tuning ===")
    print(f"Base Model: {MODEL_ID}")
    print(f"Target Adapter Directory: {OUTPUT_DIR}")

    # 1. Load Tokenizer & Base Model
    print("\n[1/5] Loading tokenizer and model...")
    t0 = time.time()
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, local_files_only=True)
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        torch_dtype=torch.float32,
        local_files_only=True
    )
    print(f"Loaded base model in {round(time.time() - t0, 2)}s")

    # 2. Configure LoRA
    print("\n[2/5] Initializing PEFT LoRA adapter...")
    lora_config = LoraConfig(
        r=16,
        lora_alpha=32,
        target_modules=["q_proj", "v_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type=TaskType.CAUSAL_LM
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    # 3. Prepare Dataset
    print("\n[3/5] Formatting training conversations...")
    with open(DATASET_PATH, 'r', encoding='utf-8') as f:
        raw_data = [json.loads(line) for line in f if line.strip()]

    training_samples = []
    for item in raw_data:
        messages = [
            {"role": "system", "content": item["system"]},
            {"role": "user", "content": item["user"]},
            {"role": "assistant", "content": item["assistant"]}
        ]
        formatted = tokenizer.apply_chat_template(messages, tokenize=False)
        enc = tokenizer(formatted, truncation=True, max_length=1024, return_tensors="pt")
        input_ids = enc["input_ids"][0]
        attention_mask = enc["attention_mask"][0]
        labels = input_ids.clone()
        training_samples.append({
            "input_ids": input_ids,
            "attention_mask": attention_mask,
            "labels": labels
        })

    print(f"Processed {len(training_samples)} conversation samples.")

    # 4. Training Loop
    print("\n[4/5] Executing LoRA fine-tuning loop...")
    optimizer = torch.optim.AdamW(model.parameters(), lr=5e-4)
    epochs = 3
    model.train()

    start_train_time = time.time()
    for epoch in range(1, epochs + 1):
        epoch_loss = 0.0
        for i, sample in enumerate(training_samples):
            optimizer.zero_grad()
            input_ids = sample["input_ids"].unsqueeze(0)
            attention_mask = sample["attention_mask"].unsqueeze(0)
            labels = sample["labels"].unsqueeze(0)

            outputs = model(
                input_ids=input_ids,
                attention_mask=attention_mask,
                labels=labels
            )
            loss = outputs.loss
            loss.backward()
            optimizer.step()

            epoch_loss += loss.item()
            if (i + 1) % 3 == 0 or (i + 1) == len(training_samples):
                print(f"  Epoch {epoch}/{epochs} | Sample {i+1}/{len(training_samples)} | Loss: {loss.item():.4f}")

        avg_loss = epoch_loss / len(training_samples)
        print(f">> Epoch {epoch} Completed | Average Loss: {avg_loss:.4f}")

    total_time = round(time.time() - start_train_time, 2)
    print(f"\nFine-tuning completed in {total_time}s")

    # 5. Save LoRA Adapter
    print(f"\n[5/5] Saving fine-tuned weights to {OUTPUT_DIR}...")
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    model.save_pretrained(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)
    print("Fine-tuned LoRA weights and tokenizer saved successfully!")

if __name__ == "__main__":
    train()
