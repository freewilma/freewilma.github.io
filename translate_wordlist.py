#!/usr/bin/env python3
"""
Translates the first 1000 words from wordlist_finnish.txt (Finnish → Spanish)
using the free MyMemory API. Saves results incrementally to wordlist_spanish.txt.
Supports resuming if interrupted.
"""

import urllib.request
import urllib.parse
import json
import time
import os
import sys

INPUT_FILE = "wordlist_finnish.txt"
OUTPUT_FILE = "wordlist_spanish.txt"
MAX_WORDS = 5852
DELAY = 0.4  # seconds between requests (stay within free tier)

def translate(word):
    """Translate a single word from Finnish to Spanish using MyMemory API."""
    encoded = urllib.parse.quote(word)
    url = f"https://api.mymemory.translated.net/get?q={encoded}&langpair=fi|es"
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            data = json.loads(response.read().decode())
            if data.get("responseStatus") == 200:
                return data["responseData"]["translatedText"]
            else:
                return None
    except Exception as e:
        print(f"  ERROR translating '{word}': {e}", file=sys.stderr)
        return None

def load_already_translated():
    """Load words already translated from the output file."""
    done = {}
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if "\t" in line:
                    fi, es = line.split("\t", 1)
                    done[fi] = es
    return done

def main():
    # Read input words
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        all_words = [line.strip() for line in f if line.strip()]

    words = all_words[:MAX_WORDS]
    print(f"Loaded {len(words)} words to translate.")

    # Load already-translated words (for resume support)
    already_done = load_already_translated()
    print(f"Already translated: {len(already_done)} words. Resuming...")

    # Open output file in append mode
    with open(OUTPUT_FILE, "a", encoding="utf-8") as out:
        for i, word in enumerate(words, 1):
            if word in already_done:
                print(f"[{i:4d}/{len(words)}] SKIP  {word} → {already_done[word]}")
                continue

            translation = translate(word)
            if translation:
                out.write(f"{word}\t{translation}\n")
                out.flush()
                print(f"[{i:4d}/{len(words)}] OK    {word} → {translation}")
            else:
                out.write(f"{word}\t???\n")
                out.flush()
                print(f"[{i:4d}/{len(words)}] FAIL  {word} → ???")

            time.sleep(DELAY)

    print(f"\nDone! Results saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
