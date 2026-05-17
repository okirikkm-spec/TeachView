"""
Mock tags generation stub — disabled neural network.
Usage: python generate_tags.py <transcription_file> <output_json>

NOTE: This is a stub that creates empty tags without actually running Qwen.
No neural networks are downloaded or executed.
"""

import os
import sys
import json


def main():
    if len(sys.argv) != 3:
        print("Usage: python generate_tags.py <transcription_file> <output_json>", file=sys.stderr)
        sys.exit(1)

    transcription_file, output_file = sys.argv[1], sys.argv[2]

    print(f"[MOCK] Skipping tag generation for: {transcription_file}", file=sys.stderr)
    print(f"[MOCK] Creating empty tags file: {output_file}", file=sys.stderr)

    # Create empty tags JSON array
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump([], f)

    print(f"[MOCK] Empty tags saved: {output_file}", file=sys.stderr)


if __name__ == "__main__":
    main()
