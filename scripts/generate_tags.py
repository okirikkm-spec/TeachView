"""
Generate tags from transcription using the OpenAI Chat Completions API.

Usage: python generate_tags.py <transcription_file> <output_json>

Env vars:
  OPENAI_API_KEY   (required)
  OPENAI_BASE_URL  (optional; custom endpoint, e.g. proxy)
  TAGS_MODEL       (default: gpt-4o-mini)
"""

import os
import sys
import json
import re

from openai import OpenAI


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


SYSTEM_PROMPT = (
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


def generate_tags(text: str) -> list:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("[tags] OPENAI_API_KEY is not set", file=sys.stderr)
        sys.exit(2)

    model_name = os.environ.get("TAGS_MODEL", "gpt-4o-mini")
    base_url = os.environ.get("OPENAI_BASE_URL") or None

    client = OpenAI(api_key=api_key, base_url=base_url)

    snippet = text[:8000]
    user = f"Расшифровка:\n{snippet}\n\nСгенерируй минимум 5 обобщённых тегов:"

    print(f"[tags] Requesting {model_name}...", file=sys.stderr)
    resp = client.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user},
        ],
        temperature=0.7,
        top_p=0.8,
        max_tokens=250,
    )

    raw = resp.choices[0].message.content or ""
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
