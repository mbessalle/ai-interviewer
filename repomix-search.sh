#!/bin/bash

# Repomix Search Utility
# Usage: ./repomix-search.sh [search_term] [context_lines]

REPOMIX_FILE="/home/mois/ai-interviewer/repomix-output.xml"
SEARCH_TERM="$1"
CONTEXT_LINES="${2:-10}"

if [ -z "$SEARCH_TERM" ]; then
    echo "Usage: $0 <search_term> [context_lines]"
    echo "Examples:"
    echo "  $0 'useInterviewsQuery' 20"
    echo "  $0 'src/hooks/useInterviewsQuery.ts' 50"
    echo "  $0 'RETELL_AGENT_GENERAL_PROMPT' 30"
    exit 1
fi

echo "Searching for: $SEARCH_TERM"
echo "Context lines: $CONTEXT_LINES"
echo "================================"

grep -n -A "$CONTEXT_LINES" -B "$CONTEXT_LINES" "$SEARCH_TERM" "$REPOMIX_FILE"