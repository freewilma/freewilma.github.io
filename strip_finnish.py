#!/usr/bin/env python3
"""
Strips the Finnish words from wordlist_spanish.txt,
keeping only the Spanish translations (one per line).
"""

INPUT_FILE = "wordlist_spanish.txt"

lines = []
with open(INPUT_FILE, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if "\t" in line:
            # Keep only the part after the tab (Spanish translation)
            lines.append(line.split("\t", 1)[1])
        elif line:
            lines.append(line)

with open(INPUT_FILE, "w", encoding="utf-8") as f:
    f.write("\n".join(lines) + "\n")

print(f"Done! {len(lines)} Spanish translations written to {INPUT_FILE}")
