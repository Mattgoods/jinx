#!/bin/bash
# Usage: ./loop.sh [plan|plan-work "description"|specs] [max_iterations]
# Examples:
#   ./loop.sh              # Build mode, unlimited tasks
#   ./loop.sh 20           # Build mode, max 20 tasks
#   ./loop.sh plan         # Plan mode, unlimited tasks
#   ./loop.sh plan 5       # Plan mode, max 5 tasks
#   ./loop.sh plan-work "auth system with Clerk and Google OAuth"
#   ./loop.sh specs        # Specs audit mode
#   ./loop.sh specs 3      # Specs audit, max 3 iterations

# Parse arguments
if [ "$1" = "plan" ]; then
    MODE="plan"
    PROMPT_FILE="PROMPT_plan.md"
    MAX_ITERATIONS=${2:-0}
elif [ "$1" = "plan-work" ]; then
    if [ -z "$2" ]; then
        echo "Error: plan-work requires a work description"
        echo "Usage: ./loop.sh plan-work \"description of work\""
        exit 1
    fi
    MODE="plan-work"
    WORK_DESCRIPTION="$2"
    PROMPT_FILE="PROMPT_plan_work.md"
    MAX_ITERATIONS=${3:-5}
elif [ "$1" = "specs" ]; then
    MODE="specs"
    PROMPT_FILE="PROMPT_specs.md"
    MAX_ITERATIONS=${2:-0}
elif [[ "$1" =~ ^[0-9]+$ ]]; then
    MODE="build"
    PROMPT_FILE="PROMPT_build.md"
    MAX_ITERATIONS=$1
else
    MODE="build"
    PROMPT_FILE="PROMPT_build.md"
    MAX_ITERATIONS=0
fi

ITERATION=0
CURRENT_BRANCH=$(git branch --show-current)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Jinx — Ralph Loop"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Mode:   $MODE"
echo "Prompt: $PROMPT_FILE"
echo "Branch: $CURRENT_BRANCH"
[ $MAX_ITERATIONS -gt 0 ] && echo "Max:    $MAX_ITERATIONS iterations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verify prompt file exists
if [ ! -f "$PROMPT_FILE" ]; then
    echo "Error: $PROMPT_FILE not found"
    exit 1
fi

# For plan-work mode, substitute WORK_SCOPE into prompt
get_prompt_content() {
    if [ "$MODE" = "plan-work" ]; then
        sed "s/\${WORK_SCOPE}/$WORK_DESCRIPTION/g" "$PROMPT_FILE"
    else
        cat "$PROMPT_FILE"
    fi
}

while true; do
    if [ $MAX_ITERATIONS -gt 0 ] && [ $ITERATION -ge $MAX_ITERATIONS ]; then
        echo "✅ Reached max iterations: $MAX_ITERATIONS"
        break
    fi

    ITERATION=$((ITERATION + 1))
    echo -e "\n======================== ITERATION $ITERATION ========================\n"

    # Run Ralph iteration
    get_prompt_content | claude -p \
        --dangerously-skip-permissions \
        --output-format=stream-json \
        --model opus \
        --verbose

    # Push changes after each iteration
    git push origin "$CURRENT_BRANCH" 2>/dev/null || {
        echo "Creating remote branch..."
        git push -u origin "$CURRENT_BRANCH"
    }

    echo -e "\n======================== ITERATION $ITERATION COMPLETE ========================\n"
done
