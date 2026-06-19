# `ollama_web_search` + `ollama_web_fetch` reference

Load this only when the SKILL.md patterns are insufficient (response schema,
example payloads, edge cases).

## API shape

Both tools call `https://ollama.com/api` with a Bearer token from
`OLLAMA_API_KEY`. POST with a JSON body; response is JSON.

### `ollama_web_search`

Request:
```json
{ "query": "bun 1.3 breaking changes", "max_results": 5 }
```

Endpoint: `POST /web_search`

Response (`WebSearchResponse`):
```json
{
  "results": [
    {
      "title": "Bun 1.3 release notes",
      "url": "https://bun.sh/blog/bun-v1.3",
      "content": "Bun 1.3 ships ... (3-5 sentence snippet)"
    }
  ]
}
```

Plugin output (markdown, one block per result):
```
1. [Bun 1.3 release notes](https://bun.sh/blog/bun-v1.3)
   Bun 1.3 ships ...

2. [Next result title](https://example.com)
   Snippet text...
```

Empty results → the tool returns the literal string `No results found.`

`max_results` is clamped to `[1, 10]`. Omit for the default of 5.

### `ollama_web_fetch`

Request:
```json
{ "url": "https://bun.sh/blog/bun-v1.3" }
```

Endpoint: `POST /web_fetch`

Response (`WebFetchResponse`):
```json
{
  "title": "Bun 1.3 release notes",
  "content": "# Bun 1.3\n\n...extracted markdown body...",
  "links": ["https://...", "https://..."]
}
```

Plugin output:
```
# Bun 1.3 release notes

...extracted markdown body...

Links found on the page:
- https://...
- https://...
```

If `links` is empty, the links section is omitted.

## Error responses

Non-2xx responses throw. The error message format is:

```
Ollama web search failed (NNN): <response body>
Ollama web fetch failed (NNN): <response body>
```

Common statuses:

| NNN | Meaning | Fix |
|-----|---------|-----|
| 401 | Unauthorized — bad/missing key | Set `OLLAMA_API_KEY` |
| 403 | Forbidden — key lacks permission | Check key scopes at ollama.com/settings/keys |
| 429 | Rate limited | Back off, retry once |
| 500-504 | Ollama-side error | Retry once, then surface to user |

## Example: debug a real error

```
ollama_web_search {
  query: "TypeError: Cannot read properties of undefined (reading 'map') Bun test",
  max_results: 5
}
```

Read snippets first. If a result looks like the exact issue, fetch it:

```
ollama_web_fetch { url: "https://github.com/oven-sh/bun/issues/12345" }
```

## Example: version / release notes lookup

```
ollama_web_search { query: "biome 2.5 release notes", max_results: 5 }
```

Snippets usually contain the changelog summary. Fetch the blog post only if
you need the full change list.