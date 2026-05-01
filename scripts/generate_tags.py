"""
Generate tags from transcription using Qwen/Qwen2.5-3B-Instruct.
Usage: python generate_tags.py <transcription_file> <output_json>

Env vars:
  TAGS_MODEL    (default: Qwen/Qwen2.5-3B-Instruct)
  WHISPER_DEVICE (reused: cuda / cpu)
"""

import os
import sys
import json
import re


def strip_srt(text: str) -> str:
    text = re.sub(r'^\d+\s*$', '', text, flags=re.MULTILINE)
    text = re.sub(r'\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}', '', text)
    text = re.sub(r'♪', '', text)
    return re.sub(r'\n{3,}', '\n\n', text).strip()


def parse_tags(raw: str) -> list:
    raw = raw.strip()
    m = re.search(r'\[.*?\]', raw, flags=re.DOTALL)
    if m:
        try:
            arr = json.loads(m.group(0))
            if isinstance(arr, list):
                return [str(x).strip().lower() for x in arr if str(x).strip()]
        except json.JSONDecodeError:
            pass
    parts = re.split(r'[,\n;]|^\s*[-*\d+\.]\s*', raw, flags=re.MULTILINE)
    return [p.strip(' "\'.[]').lower() for p in parts if p.strip(' "\'.[]')]


def generate_tags(text: str) -> list:
    from transformers import AutoModelForCausalLM, AutoTokenizer
    import torch

    model_name = os.environ.get("TAGS_MODEL", "Qwen/Qwen2.5-3B-Instruct")
    device = os.environ.get("WHISPER_DEVICE", "cuda" if torch.cuda.is_available() else "cpu")

    print(f"[tags] Loading {model_name} on {device}...", file=sys.stderr)
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        torch_dtype=torch.float16 if device == "cuda" else torch.float32,
        device_map=device,
    )
    model.eval()

    snippet = text[:8000]

    system = (
        "Ты — помощник для тегирования видео по расшифровке. "
        "На основе текста сгенерируй обобщённые теги, которые описывают тип видео, "
        "его тему и смысл. Не извлекай теги напрямую из слов расшифровки.\n\n"

        "Алгоритм:\n"
        "1. Определи, что это за тип контента: песня, новости, интервью, подкаст, "
        "лекция, обучение, обзор, инструкция, комментарий, реклама, выступление и т.п.\n"
        "2. Определи главную тему.\n"
        "3. Определи 3–6 обобщённых тематических категорий, которые лучше всего описывают содержание.\n"
        "4. Верни минимум 5 тегов. Больше добавляй только если уверен.\n\n"

        "Строгие правила:\n"
        "- не копируй слова и устойчивые фразы из текста, если это не абсолютно необходимая тема\n"
        "- не делай теги в форме пересказа\n"
        "- теги должны быть обобщающими категориями, а не цитатами из видео\n"
        "- первый тег должен описывать тип контента\n"
        "- теги должны помогать классифицировать видео, а не просто повторять лексику текста\n\n"

        "Для песен не угадывай музыкальный жанр по одному только тексту. "
        "Если это песня, используй базовые категории: «песня», «музыка», «лирика», "
        "и добавляй темы, которые выражены в тексте.\n\n"

        "Ответь ТОЛЬКО JSON-массивом строк, без пояснений."
    )

    user = f"Расшифровка:\n{snippet}\n\nСгенерируй минимум 5 обобщённых тегов:"

    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]
    prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)

    inputs = tokenizer(prompt, return_tensors="pt").to(device)

    with torch.no_grad():
        output_ids = model.generate(
            **inputs,
            max_new_tokens=250,
            do_sample=True,
            temperature=0.6,
            top_p=0.9,
            repetition_penalty=1.1,
            pad_token_id=tokenizer.eos_token_id,
        )

    generated = output_ids[0][inputs["input_ids"].shape[1]:]
    raw = tokenizer.decode(generated, skip_special_tokens=True)
    print(f"[tags] Raw output: {raw}", file=sys.stderr)

    tags = parse_tags(raw)

    seen, unique = set(), []
    for t in tags:
        if t and t not in seen and 1 < len(t) < 60:
            seen.add(t)
            unique.append(t)

    return unique[:12]


def main():
    if len(sys.argv) != 3:
        print("Usage: python generate_tags.py <transcription_file> <output_json>", file=sys.stderr)
        sys.exit(1)

    transcription_file, output_file = sys.argv[1], sys.argv[2]

    with open(transcription_file, encoding="utf-8") as f:
        raw = f.read()

    text = strip_srt(raw)
    if not text:
        print("[tags] Empty transcription, skipping", file=sys.stderr)
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump([], f)
        return

    tags = generate_tags(text)

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(tags, f, ensure_ascii=False, indent=2)

    print(f"[tags] Saved {len(tags)} tags: {tags}", file=sys.stderr)


if __name__ == "__main__":
    main()
