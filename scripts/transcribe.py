"""
Transcribe video/audio file using faster-whisper.
Usage: python transcribe.py <input_file> <output_file>

Env vars:
  WHISPER_MODEL          (default: large-v3)
  WHISPER_DEVICE         (default: cuda; set "cpu" for CPU-only)
  WHISPER_COMPUTE_TYPE   (default: float16 on cuda, int8 on cpu)
  WHISPER_LANGUAGE       (default: ru)
  WHISPER_INITIAL_PROMPT (default: empty)
  WHISPER_MUSIC_GAP      (default: 1.0 — min seconds of silence to insert ♪)
"""

import os
import sys
import subprocess
import tempfile

# Локальный запуск с CUDA: подтягиваем NVIDIA DLL в PATH (в контейнере их нет — просто пропустится)
_site = os.path.join(os.path.dirname(sys.executable), "Lib", "site-packages", "nvidia")
for _lib in ("cublas", "cudnn", "cuda_nvrtc"):
    _bin = os.path.join(_site, _lib, "bin")
    if os.path.isdir(_bin):
        os.environ["PATH"] = _bin + os.pathsep + os.environ.get("PATH", "")

from faster_whisper import WhisperModel


def extract_audio(input_file: str) -> str:
    """Извлекает аудио в 16kHz mono WAV — формат, который Whisper ожидает."""
    wav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
    subprocess.run(
        ["ffmpeg", "-y", "-i", input_file,
         "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", wav],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    return wav


def main():
    if len(sys.argv) != 3:
        print("Usage: python transcribe.py <input_file> <output_file>", file=sys.stderr)
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    model_name = os.environ.get("WHISPER_MODEL", "large-v3")
    device = os.environ.get("WHISPER_DEVICE", "cuda")
    compute_type = os.environ.get(
        "WHISPER_COMPUTE_TYPE", "int8" if device == "cpu" else "float16"
    )
    language = os.environ.get("WHISPER_LANGUAGE", "ru")
    initial_prompt = os.environ.get("WHISPER_INITIAL_PROMPT") or None
    music_gap = float(os.environ.get("WHISPER_MUSIC_GAP", "1.0"))

    print(f"Loading model {model_name} on {device} ({compute_type})...", file=sys.stderr)
    model = WhisperModel(model_name, device=device, compute_type=compute_type)

    print(f"Extracting audio from: {input_file}", file=sys.stderr)
    wav_file = extract_audio(input_file)

    print(f"Transcribing: {wav_file}", file=sys.stderr)
    segments, info = model.transcribe(
        wav_file,
        language=language,
        beam_size=5,
        vad_filter=True,
        word_timestamps=True,
        initial_prompt=initial_prompt,
    )

    print(
        f"Detected language: {info.language} (probability {info.language_probability:.2f})",
        file=sys.stderr,
    )

    def fmt(seconds: float) -> str:
        ms = int(round(seconds * 1000))
        h, ms = divmod(ms, 3_600_000)
        m, ms = divmod(ms, 60_000)
        s, ms = divmod(ms, 1_000)
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

    lines = []
    seg_num = 1
    prev_end = 0.0

    for seg in segments:
        words = list(seg.words) if seg.words else []
        vocal_start = words[0].start if words else seg.start

        if vocal_start - prev_end >= music_gap:
            lines += [str(seg_num), f"{fmt(prev_end)} --> {fmt(vocal_start)}", "♪", ""]
            seg_num += 1

        lines += [str(seg_num), f"{fmt(vocal_start)} --> {fmt(seg.end)}", seg.text.strip(), ""]
        seg_num += 1
        prev_end = seg.end

    with open(output_file, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    try:
        os.unlink(wav_file)
    except OSError:
        pass

    print(f"Transcription saved to: {output_file} ({seg_num - 1} segments)", file=sys.stderr)


if __name__ == "__main__":
    main()
