#!/usr/bin/env bash
# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

set -eo pipefail

# --- Configuration ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKTREE_CREATED=false
WORKTREE_PATH=""

# --- Usage ---
usage() {
  echo "Usage: $0 [name] [--claude] [--compiler]"
  echo ""
  echo "Creates a new git worktree with dependencies installed."
  echo ""
  echo "Arguments:"
  echo "  [name]        Name for the worktree (auto-generated if not provided)"
  echo ""
  echo "Options:"
  echo "  --claude      Launch Claude Code after setup"
  echo "  --compiler    When used with --claude, launch Claude in the compiler directory"
  exit 1
}

# --- Error handling ---
error() {
  echo "Error: $1" >&2
  exit 1
}

# --- Cleanup on error ---
cleanup() {
  if [[ "$WORKTREE_CREATED" == "true" && -n "$WORKTREE_PATH" ]]; then
    echo "Cleaning up: removing worktree at $WORKTREE_PATH..." >&2
    git worktree remove "$WORKTREE_PATH" --force 2>/dev/null || true
  fi
}

trap cleanup ERR

# --- Argument parsing ---
NAME=""
USE_CLAUDE=false
USE_COMPILER=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --claude)
      USE_CLAUDE=true
      shift
      ;;
    --compiler)
      USE_COMPILER=true
      shift
      ;;
    -h|--help)
      usage
      ;;
    -*)
      error "Unknown option: $1"
      ;;
    *)
      if [[ -z "$NAME" ]]; then
        NAME="$1"
      else
        error "Unexpected argument: $1"
      fi
      shift
      ;;
  esac
done

# Generate worktree name with timestamp prefix
TIMESTAMP=$(date +%Y-%m-%d-%H-%M-%S)

if [[ -z "$NAME" ]]; then
  # Word lists for random name generation
  ADJECTIVES=(
    "quick" "bright" "calm" "dark" "eager" "fair" "gentle" "happy" "idle" "jolly"
    "keen" "lively" "merry" "noble" "orange" "proud" "quiet" "rapid" "silent" "tall"
    "unique" "vivid" "warm" "young" "zealous" "ancient" "bold" "clever" "daring" "elegant"
    "fancy" "grand" "humble" "icy" "jagged" "kind" "loud" "magic" "narrow" "odd"
    "plain" "quaint" "rough" "sharp" "tender" "ultra" "vast" "wild" "xeric" "youthful"
    "zesty" "agile" "brave" "crisp" "deep"
  )
  NOUNS=(
    "apple" "bear" "cloud" "dragon" "eagle" "flame" "garden" "hill" "island" "jungle"
    "kettle" "lemon" "mountain" "night" "ocean" "panda" "quartz" "river" "storm" "tiger"
    "umbrella" "valley" "whale" "xenon" "yarn" "zebra" "anchor" "bridge" "canyon" "desert"
    "ember" "forest" "glacier" "harbor" "igloo" "jewel" "knight" "lantern" "meadow" "nebula"
    "oasis" "phoenix" "quest" "rocket" "shadow" "thunder" "unity" "vortex" "willow" "xylophone"
    "yonder" "zenith" "aurora" "beacon" "coral"
  )

  # Generate random name: worktree-yyyy-mm-dd-hh-mm-ss-<adjective>-<noun>
  RANDOM_ADJ=${ADJECTIVES[$RANDOM % ${#ADJECTIVES[@]}]}
  RANDOM_NOUN=${NOUNS[$RANDOM % ${#NOUNS[@]}]}
  NAME="worktree-${TIMESTAMP}-${RANDOM_ADJ}-${RANDOM_NOUN}"
  echo "Auto-generated worktree name: $NAME"
else
  # Use provided name: worktree-yyyy-mm-dd-hh-mm-ss-<name>
  NAME="worktree-${TIMESTAMP}-${NAME}"
  echo "Worktree name: $NAME"
fi

# --- Check .gitignore ---
if ! grep -qE '^/?\.worktrees/?$' "$REPO_ROOT/.gitignore" 2>/dev/null; then
  error "'.worktrees' is not in .gitignore. Add it before creating worktrees."
fi

# --- Check if worktree already exists ---
if git worktree list | grep -q "\[$NAME\]"; then
  error "Worktree with branch name '$NAME' already exists"
fi

# --- Set up worktree path ---
WORKTREES_DIR="$REPO_ROOT/.worktrees"
WORKTREE_PATH="$WORKTREES_DIR/$NAME"

if [[ -d "$WORKTREE_PATH" ]]; then
  error "Directory already exists at $WORKTREE_PATH"
fi

# --- Create worktree ---
mkdir -p "$WORKTREES_DIR"
echo "Creating worktree '$NAME' at $WORKTREE_PATH..."
git worktree add "$WORKTREE_PATH" -b "$NAME"
WORKTREE_CREATED=true

# --- Install dependencies ---
echo "Installing compiler dependencies..."
(cd "$WORKTREE_PATH/compiler" && yarn install)

echo "Installing root dependencies..."
(cd "$WORKTREE_PATH" && yarn install)

echo "Worktree '$NAME' created successfully at $WORKTREE_PATH"

# --- Launch Claude (optional) ---
if [[ "$USE_CLAUDE" == "true" ]]; then
  if [[ "$USE_COMPILER" == "true" ]]; then
    echo "Launching Claude in compiler directory..."
    cd "$WORKTREE_PATH/compiler"
  else
    echo "Launching Claude in worktree root..."
    cd "$WORKTREE_PATH"
  fi
  exec claude
fi
