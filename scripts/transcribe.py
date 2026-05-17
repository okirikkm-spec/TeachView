"""
Mock transcription stub — disabled neural network.
Usage: python transcribe.py <input_file> <output_file>

NOTE: This is a stub that creates empty transcription without actually running Whisper.
No neural networks are downloaded or executed.
"""

import os
import sys


def main():
    if len(sys.argv) != 3:
        print("Usage: python transcribe.py <input_file> <output_file>", file=sys.stderr)
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    print(f"[MOCK] Skipping transcription for: {input_file}", file=sys.stderr)
    print(f"[MOCK] Creating empty SRT file: {output_file}", file=sys.stderr)

    # Create empty SRT file (valid format with no segments)
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("")

    print(f"[MOCK] Empty transcription created: {output_file}", file=sys.stderr)


if __name__ == "__main__":
    main()
