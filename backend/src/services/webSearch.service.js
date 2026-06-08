const DEFAULT_RESULT_LIMIT = 4;
const DEFAULT_TIMEOUT_MS = 8000;

const decodeHtmlEntities = (value = "") =>
  String(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");

const stripHtml = (value = "") =>
  decodeHtmlEntities(String(value).replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

const normalizeDuckDuckGoUrl = (url = "") => {
  const decoded = decodeHtmlEntities(url);
  if (!decoded.startsWith("//duckduckgo.com/l/?")) return decoded;

  try {
    const parsed = new URL(`https:${decoded}`);
    const target = parsed.searchParams.get("uddg");
    return target ? decodeURIComponent(target) : decoded;
  } catch {
    return decoded;
  }
};

const getHostname = (url = "") => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(process.env.WEB_SEARCH_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS
  );

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

const searchWithBrave = async ({ query, limit }) => {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return null;

  const response = await fetchWithTimeout(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${limit}`,
    {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": apiKey,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Brave search failed: ${response.status}`);
  }

  const data = await response.json();
  return (data.web?.results || []).slice(0, limit).map((item) => ({
    title: stripHtml(item.title),
    url: item.url,
    snippet: stripHtml(item.description),
    sourceName: getHostname(item.url),
  }));
};

const searchWithSerper = async ({ query, limit }) => {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return null;

  const response = await fetchWithTimeout("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify({
      q: query,
      num: limit,
    }),
  });

  if (!response.ok) {
    throw new Error(`Serper search failed: ${response.status}`);
  }

  const data = await response.json();
  return (data.organic || []).slice(0, limit).map((item) => ({
    title: stripHtml(item.title),
    url: item.link,
    snippet: stripHtml(item.snippet),
    sourceName: getHostname(item.link),
  }));
};

const searchWithDuckDuckGo = async ({ query, limit }) => {
  const response = await fetchWithTimeout("https://html.duckduckgo.com/html/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "MediConnect/1.0",
    },
    body: new URLSearchParams({
      q: query,
    }),
  });

  if (!response.ok) {
    throw new Error(`DuckDuckGo search failed: ${response.status}`);
  }

  const html = await response.text();
  const results = [];
  const resultRegex =
    /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;

  let match;
  while ((match = resultRegex.exec(html)) && results.length < limit) {
    const url = normalizeDuckDuckGoUrl(match[1]);
    results.push({
      title: stripHtml(match[2]),
      url,
      snippet: stripHtml(match[3]),
      sourceName: getHostname(url),
    });
  }

  return results;
};

const buildSearchQuery = (question) =>
  `${question} medical reference patient education`;

export const searchWeb = async ({ query, limit = DEFAULT_RESULT_LIMIT }) => {
  if (process.env.WEB_SEARCH_ENABLED === "false") return [];

  const searchQuery = buildSearchQuery(query);
  console.log("[RAG Web] Search started:", { query: searchQuery });

  const providers = [searchWithBrave, searchWithSerper, searchWithDuckDuckGo];

  for (const provider of providers) {
    try {
      const results = await provider({ query: searchQuery, limit });
      if (results?.length) {
        console.log("[RAG Web] Search results:", {
          provider: provider.name,
          count: results.length,
        });
        return results;
      }
    } catch (error) {
      console.error("[RAG Web] Provider failed:", {
        provider: provider.name,
        message: error.message,
      });
    }
  }

  console.log("[RAG Web] No web results available");
  return [];
};
