# opencode-ollama-websearch

[![CI](https://github.com/justin-carper/opencode-ollama-websearch/actions/workflows/ci.yml/badge.svg)](https://github.com/justin-carper/opencode-ollama-websearch/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/opencode-ollama-websearch.svg)](https://www.npmjs.com/package/opencode-ollama-websearch)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

OpenCode plugin that exposes [Ollama's web search and web fetch APIs](https://docs.ollama.com/capabilities/web-search) as native opencode tools. No Python, no MCP server, no extra runtime — just TypeScript that calls the Ollama REST API directly.

## Tools

| Tool | Description |
| --- | --- |
| `ollama_web_search` | Search the web. Returns ranked results with title, URL, and snippet. |
| `ollama_web_fetch` | Fetch and extract the main content of a single page. Use after `ollama_web_search` to read a specific result in depth. |

Both tools return markdown-formatted strings tuned for coding agents.

## Install

### One-command install (recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/justin-carper/opencode-ollama-websearch/main/scripts/install.sh | bash
```

This adds the plugin to your `opencode.json`, installs the bundled skill (`using-ollama-web-search`) and slash commands (`/ollama-search`, `/ollama-fetch`), and checks that `OLLAMA_API_KEY` is set. Restart opencode to pick everything up.

### Manual install

Add the plugin to your `opencode.json` — opencode auto-installs npm plugins via Bun at startup, so no `npm install` is needed:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-ollama-websearch"]
}
```

Restart opencode. The tools are now available to the agent.

## API key setup

The plugin reads `OLLAMA_API_KEY` from the environment. Get a free key at https://ollama.com/settings/keys.

Never put the key in `opencode.json` — that file is often committed and shared.

## Usage

Once loaded, the tools are available to the agent alongside built-ins. The agent decides when to call them based on the tool descriptions.

For direct user invocation, install the bundled slash commands (see below):

```
/ollama-search opencode plugin docs
/ollama-fetch https://opencode.ai/docs/plugins
```

## Bundled skill: `using-ollama-web-search`

Teaches agents when and how to use the tools. Installed automatically by the one-command install. To install manually:

```bash
cp -R skill/using-ollama-web-search ~/.agents/skills/
```

## Bundled slash commands

- `/ollama-search <query>` — run `ollama_web_search` and print results inline.
- `/ollama-fetch <url>` — run `ollama_web_fetch` and print content inline.

Installed automatically by the one-command install. To install manually without the script, copy the files from this repo:

```bash
cp commands/ollama-search.md commands/ollama-fetch.md ~/.config/opencode/commands/
```

## Development

```bash
bun install
bun test           # 8 tests, mocked fetch
bun run build      # tsc -> dist/
bun run lint       # biome check
bun run lint:fix   # biome check --write
```

Requires [Bun](https://bun.sh) 1.3+. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full workflow, including how to add a changeset.

## Why this exists

The built-in opencode web search uses Exa and is gated behind the OpenCode provider or `OPENCODE_ENABLE_EXA`. This plugin is Ollama-first: pure TypeScript, works with any provider, and needs no separate MCP server or Python runtime.

## License

[MIT](./LICENSE) © Justin Carper