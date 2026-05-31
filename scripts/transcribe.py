"""
Transcribe video/audio file using the OpenAI Whisper API (verbose_json -> SRT-like output).

Usage: python transcribe.py <input_file> <output_file>

Env vars:
  OPENAI_API_KEY         (required)
  OPENAI_BASE_URL        (optional; custom endpoint, e.g. proxy)
  WHISPER_MODEL          (default: whisper-1)
  WHISPER_LANGUAGE       (default: ru; ISO-639-1; empty string -> auto-detect)
  WHISPER_INITIAL_PROMPT (default: empty)
  WHISPER_MUSIC_GAP      (default: 1.0 — min seconds of silence to insert "♪")
  WHISPER_CHUNK_SECONDS  (default: 600 — split audio into chunks of N sec; API limit ~25 MB)
"""

import os
import sys
import json
import math
import shutil
import subprocess
import tempfile

from openai import OpenAI


def extract_audio(input_file: str) -> str:
    wav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
    subprocess.run(
        ["ffmpeg", "-y", "-i", input_file,
         "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", wav],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    return wav


def audio_duration(path: str) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", path],
        check=True, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
    ).stdout.decode().strip()
    try:
        return float(out)
    except ValueError:
        return 0.0


def split_audio(wav: str, chunk_seconds: int) -> list:
    """Split wav into chunks of chunk_seconds. Returns list of (path, offset_seconds)."""
    duration = audio_duration(wav)
    if duration <= chunk_seconds:
        return [(wav, 0.0)]

    out_dir = tempfile.mkdtemp(prefix="whisper_chunks_")
    parts = []
    n = math.ceil(duration / chunk_seconds)
    for i in range(n):
        offset = i * chunk_seconds
        chunk_path = os.path.join(out_dir, f"chunk_{i:03d}.wav")
        subprocess.run(
            ["ffmpeg", "-y", "-ss", str(offset), "-t", str(chunk_seconds),
             "-i", wav, "-c", "copy", chunk_path],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        parts.append((chunk_path, float(offset)))
    return parts


def fmt(seconds: float) -> str:
    ms = int(round(seconds * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1_000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def main():
    if len(sys.argv) != 3:
        print("Usage: python transcribe.py <input_file> <output_file>", file=sys.stderr)
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("[transcribe] OPENAI_API_KEY is not set", file=sys.stderr)
        sys.exit(2)

    model_name = os.environ.get("WHISPER_MODEL", "whisper-1")
    language = os.environ.get("WHISPER_LANGUAGE", "ru") or None
    initial_prompt = os.environ.get("WHISPER_INITIAL_PROMPT") or None
    music_gap = float(os.environ.get("WHISPER_MUSIC_GAP", "1.0"))
    chunk_seconds = int(os.environ.get("WHISPER_CHUNK_SECONDS", "600"))
    base_url = os.environ.get("OPENAI_BASE_URL") or "https://api.openai.com/v1"

    client = OpenAI(api_key=api_key, base_url=base_url)

    print(f"[transcribe] Extracting audio: {input_file}", file=sys.stderr)
    wav_file = extract_audio(input_file)

    chunks = split_audio(wav_file, chunk_seconds)
    print(f"[transcribe] Sending {len(chunks)} chunk(s) to OpenAI ({model_name})...", file=sys.stderr)

    all_segments = []
    for chunk_path, offset in chunks:
        with open(chunk_path, "rb") as f:
            kwargs = {
                "model": model_name,
                "file": f,
                "response_format": "verbose_json",
            }
            if language:
                kwargs["language"] = language
            if initial_prompt:
                kwargs["prompt"] = initial_prompt
            resp = client.audio.transcriptions.create(**kwargs)

        data = resp.model_dump() if hasattr(resp, "model_dump") else json.loads(resp.json())
        for seg in data.get("segments") or []:
            all_segments.append({
                "start": float(seg.get("start", 0.0)) + offset,
                "end": float(seg.get("end", 0.0)) + offset,
                "text": str(seg.get("text", "")).strip(),
            })

    all_segments.sort(key=lambda s: s["start"])

    lines = []
    seg_num = 1
    prev_end = 0.0

    for seg in all_segments:
        if seg["start"] - prev_end >= music_gap:
            lines += [str(seg_num), f"{fmt(prev_end)} --> {fmt(seg['start'])}", "♪", ""]
            seg_num += 1

        lines += [str(seg_num), f"{fmt(seg['start'])} --> {fmt(seg['end'])}", seg["text"], ""]
        seg_num += 1
        prev_end = seg["end"]

    with open(output_file, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    try:
        os.unlink(wav_file)
    except OSError:
        pass
    for chunk_path, _ in chunks:
        if chunk_path != wav_file:
            try:
                os.unlink(chunk_path)
            except OSError:
                pass
    if chunks and chunks[0][0] != wav_file:
        chunk_dir = os.path.dirname(chunks[0][0])
        shutil.rmtree(chunk_dir, ignore_errors=True)

    print(f"[transcribe] Saved to: {output_file} ({seg_num - 1} segments)", file=sys.stderr)


if __name__ == "__main__":
    main()
