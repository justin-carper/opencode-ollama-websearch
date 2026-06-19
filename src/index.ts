import type { Plugin } from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin/tool";

const OLLAMA_API_URL = "https://ollama.com/api";

interface WebSearchResult {
  title: string;
  url: string;
  content: string;
}

interface WebSearchResponse {
  results: WebSearchResult[];
}

interface WebFetchResponse {
  title: string;
  content: string;
  links: string[];
}

function getApiKey(): string {
  const key = process.env.OLLAMA_API_KEY;
  if (!key) {
    throw new Error(
      "OLLAMA_API_KEY is not set. Get one at https://ollama.com/settings/keys",
    );
  }
  return key;
}

function formatSearchResults(results: WebSearchResult[]): string {
  if (results.length === 0) {
    return "No results found.";
  }

  return results
    .map(
      (r, i) =>
        `${i + 1}. [${r.title}](${r.url})\n   ${r.content.replace(/\n+/g, " ")}`,
    )
    .join("\n\n");
}

function formatFetchResult(result: WebFetchResponse): string {
  const links = result.links.length
    ? `\n\nLinks found on the page:\n${result.links.map((l) => `- ${l}`).join("\n")}`
    : "";

  return `# ${result.title}\n\n${result.content}${links}`;
}

export const ollamaWebSearchPlugin: Plugin = async () => {
  return {
    tool: {
      ollama_web_search: tool({
        description:
          "Search the web using Ollama's web search API. Returns a list of relevant pages with title, URL, and snippet. Useful for finding current documentation, library versions, error fixes, or facts beyond the model's training cutoff.",
        args: {
          query: tool.schema.string().describe("Search query."),
          max_results: tool.schema
            .number()
            .optional()
            .describe("Maximum number of results (default 5, max 10)."),
        },
        async execute(args) {
          const maxResults = Math.min(
            Math.max(Math.round(args.max_results ?? 5), 1),
            10,
          );

          const response = await fetch(`${OLLAMA_API_URL}/web_search`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${getApiKey()}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: args.query,
              max_results: maxResults,
            }),
          });

          if (!response.ok) {
            const text = await response.text();
            throw new Error(
              `Ollama web search failed (${response.status}): ${text}`,
            );
          }

          const data = (await response.json()) as WebSearchResponse;
          return formatSearchResults(data.results ?? []);
        },
      }),

      ollama_web_fetch: tool({
        description:
          "Fetch and extract the main content of a single web page using Ollama's web fetch API. Use this after ollama_web_search to read a specific page in depth.",
        args: {
          url: tool.schema.string().describe("Full URL of the page to fetch."),
        },
        async execute(args) {
          const response = await fetch(`${OLLAMA_API_URL}/web_fetch`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${getApiKey()}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ url: args.url }),
          });

          if (!response.ok) {
            const text = await response.text();
            throw new Error(
              `Ollama web fetch failed (${response.status}): ${text}`,
            );
          }

          const data = (await response.json()) as WebFetchResponse;
          return formatFetchResult(data);
        },
      }),
    },
  };
};

export default ollamaWebSearchPlugin;
