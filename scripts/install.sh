#!/usr/bin/env bash
# Installs opencode-ollama-websearch: adds it to opencode.json(.c), installs the
# bundled skill + slash commands, and checks that OLLAMA_API_KEY is set.
# Safe to re-run — idempotent. Supports both opencode.json and opencode.jsonc
# (including comments and trailing commas).
set -euo pipefail

PLUGIN_NAME="opencode-ollama-websearch"
SKILL_NAME="using-ollama-web-search"
CONFIG_DIR="${OPENCODE_CONFIG_DIR:-${HOME}/.config/opencode}"
SKILL_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/skill/$SKILL_NAME"
CMD_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/commands"
SKILL_DST="${HOME}/.agents/skills/$SKILL_NAME"
CMD_DST="$CONFIG_DIR/commands"

# Pick a JS runtime (Bun preferred, Node fallback) — needed for JSONC parsing
RUNTIME=""
if command -v bun >/dev/null 2>&1; then
  RUNTIME="bun"
elif command -v node >/dev/null 2>&1; then
  RUNTIME="node"
else
  echo "Error: requires Bun (https://bun.sh) or Node.js to parse the opencode config."
  exit 1
fi

mkdir -p "$CONFIG_DIR" "$SKILL_DST" "$CMD_DST"

# --- 1. Add the plugin to opencode.json or opencode.jsonc ---
# Detect existing config file, preferring .jsonc if both exist
CONFIG_FILE=""
for f in "$CONFIG_DIR/opencode.jsonc" "$CONFIG_DIR/opencode.json"; do
  if [ -f "$f" ]; then
    CONFIG_FILE="$f"
    break
  fi
done

if [ -z "$CONFIG_FILE" ]; then
  # No config yet — create opencode.json (plain JSON, universally supported)
  CONFIG_FILE="$CONFIG_DIR/opencode.json"
  cat > "$CONFIG_FILE" <<EOF
{
  "\$schema": "https://opencode.ai/config.json",
  "plugin": ["$PLUGIN_NAME"]
}
EOF
  echo "[plugin] created $CONFIG_FILE with $PLUGIN_NAME"
else
  # Use a JS script to merge the plugin in. Handles JSONC (comments + trailing
  # commas) by stripping them before JSON.parse, then writes back as plain JSON.
  # Written to a temp file so both bun and node can run it with positional args.
  JS_TMP="$(mktemp)"
  cat > "$JS_TMP" <<'JS'
    const fs = require("fs");
    const file = process.argv[2];
    const plugin = process.argv[3];
    const raw = fs.readFileSync(file, "utf8");
    // Strip JSONC: block comments, line comments (preserve :// in URLs), trailing commas.
    const stripped = raw
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1")
      .replace(/,\s*([}\]])/g, "$1");
    const cfg = JSON.parse(stripped);
    const plugins = Array.isArray(cfg.plugin) ? cfg.plugin : [];
    const base = (s) => String(s).split("@")[0];
    if (plugins.some((p) => base(p) === plugin)) {
      console.log("present");
    } else {
      cfg.plugin = [...plugins, plugin];
      fs.writeFileSync(file, JSON.stringify(cfg, null, 2) + "\n");
      console.log("added");
    }
JS
  RESULT="$("$RUNTIME" "$JS_TMP" "$CONFIG_FILE" "$PLUGIN_NAME")"
  rm -f "$JS_TMP"
  case "$RESULT" in
    present) echo "[plugin] already in $CONFIG_FILE — skipping" ;;
    added)   echo "[plugin] added $PLUGIN_NAME to $CONFIG_FILE" ;;
    *) echo "[plugin] error updating $CONFIG_FILE: $RESULT"; exit 1 ;;
  esac
fi

# --- 2. Install the skill ---
cp -R "$SKILL_SRC/." "$SKILL_DST/"
echo "[skill]  installed -> $SKILL_DST"

# --- 3. Install the slash commands ---
cp "$CMD_SRC/ollama-search.md" "$CMD_DST/"
cp "$CMD_SRC/ollama-fetch.md" "$CMD_DST/"
echo "[cmd]    installed -> $CMD_DST/ollama-search.md, $CMD_DST/ollama-fetch.md"

# --- 4. Check for the API key ---
if [ -z "${OLLAMA_API_KEY:-}" ]; then
  echo ""
  echo "⚠ OLLAMA_API_KEY is not set in your environment."
  echo "  Get one at https://ollama.com/settings/keys, then add to ~/.secrets (chmod 600):"
  echo "    export OLLAMA_API_KEY=your_key"
  echo "  and source it from your shell rc (~/.zshrc / ~/.bashrc):"
  echo "    [ -f ~/.secrets ] && source ~/.secrets"
else
  echo "[key]    OLLAMA_API_KEY is set"
fi

echo ""
echo "Done. Restart opencode to pick up the plugin, skill, and commands."