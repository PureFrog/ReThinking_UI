#!/bin/sh
# Hand a request to GPT with two moves: the spec text goes on the clipboard and its
# reference images open in Finder (select all → drag into the ChatGPT window).
# usage: sh scripts/gpt-handoff.sh 004
set -e
n="$1"
spec=$(ls collab/to-gpt/"$n"-*.md | head -1)
pbcopy < "$spec"
echo "클립보드에 복사함: $spec"
if [ -d collab/to-gpt/"$n"-refs ]; then open collab/to-gpt/"$n"-refs; echo "Finder로 엶: collab/to-gpt/$n-refs"; fi
