---
name: using-ollama-web-search
description: >-
  Use when a task needs live web information — debugging a real error message,
  checking current versions or release notes, hunting CVEs / security
  advisories, evaluating whether a dependency is maintained, finding breaking
  changes before an upgrade, comparing tools, or surfacing examples newer than
  the model's training cutoff. Also use when the user says "search the web",
  "look up", "what's the latest", "find examples", or quotes an exact error /
  stack trace. Do NOT use for a named library's API surface — go directly to that
  library's own docs site or API reference instead; use this for everything else
  (news, errors, comparisons, ecosystem questions, non-library content).
---

# Ollama Web Search via `ollama_web_search` + `ollama_web_fetch`

Two opencode tools backed by the Ollama web API. `ollama_web_search` returns
ranked results (title, URL, snippet); `ollama_web_fetch` extracts the main
content of a single page. One search → one fetch replaces search → scrape →
extract. Requires the `opencode-ollama-websearch` plugin and `OLLAMA_API_KEY`
in the environment.

## Preflight (every session)

```bash
# Confirm the plugin is loaded and the key is set
echo "${OLLAMA_API_KEY:+set}"   # prints "set" or empty
```

If empty → STOP and tell the user to set `OLLAMA_API_KEY` (get one at
https://ollama.com/settings/keys). Never silently fall back to another tool
without telling the user why. If the tools are missing entirely, install the
plugin (`npm install opencode-ollama-websearch`) and add it to `opencode.json`.

## The 2-step pattern: search → fetch

1. Search broad, read snippets first.
2. Only `ollama_web_fetch` the one best URL when snippets aren't enough.

```
ollama_web_search { query: "<question>", max_results: 5 }   # step 1
ollama_web_fetch { url: "<best URL from step 1>" }           # step 2 (optional)
```

Snippets from step 1 often answer the question on their own. Fetch only when
you need the full page (deeper docs, full error context, code listings).

## Token discipline

Default `max_results: 5`. Bump to `10` only when the query is broad or the
first 5 results miss the answer. Never go above 10 — the plugin clamps it.

| Situation | `max_results` |
|-----------|----------------|
| Specific error / version lookup | 5 (default) |
| Broad comparison / "what's new in X" | 10 |
| Snippets already answer it | don't fetch |
| Snippets are noise, need full page | fetch the top URL |

## When to use

- Current docs, release notes, or breaking changes beyond training cutoff
- Real error messages / stack traces (paste verbatim as the query)
- CVEs / security advisories / "is this dep maintained"
- Comparisons and ecosystem questions (news, blog posts, forum threads)
- User says "search the web", "look up", "what's the latest"

## When NOT to use

- Named library's API signatures / config → go to that library's own docs site or API reference
- Fetching a specific URL the user already gave → fetch it directly
- Searching the local codebase → search the local codebase with your usual tools
- Anything containing customer data, credentials, or proprietary code

## Error handling

The plugin throws on non-2xx. Branch on the HTTP status:

| Status | Meaning | Action |
|--------|---------|--------|
| 401 / 403 | Bad / missing `OLLAMA_API_KEY` | Tell user to fix the key; don't retry |
| 429 | Rate limited | Back off, retry once after a pause |
| 5xx | Ollama-side outage | Retry once, then surface to user |

The error message includes the response body — read it for specifics.

## Red flags — stop and re-read this skill

- About to call `ollama_web_search` with `max_results: 10` on a narrow query → STOP, use 5
- Three searches in and still refining → STOP, surface partial results
- About to `ollama_web_fetch` every result from step 1 → STOP, fetch only the best one
- About to use this for a named library's API → STOP, go to that library's docs
- About to put a secret/API key in the query → STOP, strip it first
- Key is unset and about to call anyway → STOP, tell the user

See [reference.md](reference.md) for the API shape, response schema, and example outputs.