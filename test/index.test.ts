import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import ollamaWebSearchPlugin from "../src/index.js";

function setFetchMock(fn: typeof globalThis.fetch) {
  globalThis.fetch = fn;
}

describe("ollamaWebSearchPlugin", () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OLLAMA_API_KEY;

  beforeEach(() => {
    process.env.OLLAMA_API_KEY = "test-key";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.OLLAMA_API_KEY = originalKey;
  });

  it("exposes ollama_web_search and ollama_web_fetch tools", async () => {
    const plugin = await ollamaWebSearchPlugin();
    expect(Object.keys(plugin.tool)).toContain("ollama_web_search");
    expect(Object.keys(plugin.tool)).toContain("ollama_web_fetch");
  });

  it("throws when OLLAMA_API_KEY is missing", async () => {
    delete process.env.OLLAMA_API_KEY;
    const plugin = await ollamaWebSearchPlugin();
    expect(
      plugin.tool.ollama_web_search.execute({ query: "q" }),
    ).rejects.toThrow("OLLAMA_API_KEY is not set");
  });

  it("calls the Ollama web_search endpoint and formats results", async () => {
    const mockFetch = (url: string, init?: RequestInit) => {
      expect(url).toBe("https://ollama.com/api/web_search");
      expect(init?.method).toBe("POST");
      expect(init?.headers).toMatchObject({
        Authorization: "Bearer test-key",
        "Content-Type": "application/json",
      });

      return Promise.resolve(
        new Response(
          JSON.stringify({
            results: [
              {
                title: "Ollama",
                url: "https://ollama.com",
                content: "Run LLMs locally.",
              },
            ],
          }),
          { status: 200 },
        ),
      );
    };

    setFetchMock(mockFetch);

    const plugin = await ollamaWebSearchPlugin();
    const result = await plugin.tool.ollama_web_search.execute({
      query: "what is ollama",
    });

    expect(result).toContain("1. [Ollama](https://ollama.com)");
    expect(result).toContain("Run LLMs locally.");
  });

  it("formats an empty search result list", async () => {
    setFetchMock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ results: [] }), { status: 200 }),
      ),
    );

    const plugin = await ollamaWebSearchPlugin();
    const result = await plugin.tool.ollama_web_search.execute({
      query: "nonsense that returns nothing",
    });

    expect(result).toBe("No results found.");
  });

  it("clamps max_results between 1 and 10", async () => {
    let seenBody: string | null = null;

    setFetchMock((_url, init) => {
      seenBody = init?.body as string;
      return Promise.resolve(new Response(JSON.stringify({ results: [] })));
    });

    const plugin = await ollamaWebSearchPlugin();
    const parseBody = () => JSON.parse(seenBody ?? "{}").max_results;

    await plugin.tool.ollama_web_search.execute({ query: "q", max_results: 0 });
    expect(parseBody()).toBe(1);

    await plugin.tool.ollama_web_search.execute({
      query: "q",
      max_results: 50,
    });
    expect(parseBody()).toBe(10);

    await plugin.tool.ollama_web_search.execute({
      query: "q",
      max_results: 3,
    });
    expect(parseBody()).toBe(3);
  });

  it("throws when the web_search endpoint returns an error", async () => {
    setFetchMock(() =>
      Promise.resolve(new Response("Internal Server Error", { status: 500 })),
    );

    const plugin = await ollamaWebSearchPlugin();
    await expect(
      plugin.tool.ollama_web_search.execute({ query: "q" }),
    ).rejects.toThrow("Ollama web search failed (500)");
  });

  it("calls the Ollama web_fetch endpoint and formats the page", async () => {
    setFetchMock((url, init) => {
      expect(url).toBe("https://ollama.com/api/web_fetch");
      expect(init?.body).toBe(JSON.stringify({ url: "https://example.com" }));

      return Promise.resolve(
        new Response(
          JSON.stringify({
            title: "Example",
            content: "Hello world",
            links: ["https://example.com/a"],
          }),
        ),
      );
    });

    const plugin = await ollamaWebSearchPlugin();
    const result = await plugin.tool.ollama_web_fetch.execute({
      url: "https://example.com",
    });

    expect(result).toContain("# Example");
    expect(result).toContain("Hello world");
    expect(result).toContain("https://example.com/a");
  });

  it("throws when the web_fetch endpoint returns an error", async () => {
    setFetchMock(() =>
      Promise.resolve(new Response("Not Found", { status: 404 })),
    );

    const plugin = await ollamaWebSearchPlugin();
    await expect(
      plugin.tool.ollama_web_fetch.execute({ url: "https://bad.url" }),
    ).rejects.toThrow("Ollama web fetch failed (404)");
  });
});
