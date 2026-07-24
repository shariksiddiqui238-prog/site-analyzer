import { Router, type IRouter } from "express";
import { parse } from "node-html-parser";
import { AnalyzeUrlBody, AnalyzeUrlResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const TIMEOUT_MS = 10_000;
const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5 MB cap

function isValidUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

router.post("/analyze", async (req, res): Promise<void> => {
  const parsed = AnalyzeUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid 'url' field." });
    return;
  }

  const rawUrl = normalizeUrl(parsed.data.url);

  if (!isValidUrl(rawUrl)) {
    res.status(400).json({ error: `"${parsed.data.url}" is not a valid HTTP/HTTPS URL.` });
    return;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const startTime = Date.now();

  let response: Response;
  try {
    response = await fetch(rawUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; SiteAnalyzer/1.0; +https://replit.com)",
        Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
      },
      redirect: "follow",
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const isTimeout =
      err instanceof Error &&
      (err.name === "AbortError" || err.message.includes("abort"));
    if (isTimeout) {
      res.status(422).json({ error: `Request timed out after ${TIMEOUT_MS / 1000}s.` });
    } else {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(422).json({ error: `Failed to fetch URL: ${msg}` });
    }
    return;
  } finally {
    clearTimeout(timeoutId);
  }

  const responseTime = Date.now() - startTime;
  const httpStatus = response.status;

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
    res.status(422).json({
      error: `The URL returned a non-HTML response (Content-Type: ${contentType || "unknown"}).`,
    });
    return;
  }

  // Read body with size cap
  let bodyText: string;
  try {
    const reader = response.body?.getReader();
    if (!reader) {
      bodyText = await response.text();
    } else {
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;
      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          totalBytes += value.length;
          chunks.push(value);
          if (totalBytes >= MAX_BODY_BYTES) {
            reader.cancel().catch(() => undefined);
            break;
          }
        }
      }
      const combined = new Uint8Array(totalBytes);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      bodyText = new TextDecoder().decode(combined);
    }
  } catch {
    res.status(422).json({ error: "Failed to read response body." });
    return;
  }

  // Parse HTML
  const root = parse(bodyText, { comment: false });

  const pageTitle = root.querySelector("title")?.text?.trim() ?? null;

  const metaDescEl = root.querySelector('meta[name="description"]');
  const metaDescription = metaDescEl?.getAttribute("content")?.trim() ?? null;

  const h1Elements = root.querySelectorAll("h1");
  const h1Count = h1Elements.length;

  const images = root.querySelectorAll("img");
  const imagesMissingAlt = images.filter((img) => {
    const alt = img.getAttribute("alt");
    return alt === null || alt === undefined;
  }).length;

  // Word count: strip scripts/styles, count text words
  const body = root.querySelector("body");
  if (body) {
    body.querySelectorAll("script, style, noscript").forEach((el) => el.remove());
  }
  const textContent = (body ?? root).text ?? "";
  const wordCount = textContent
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w.length > 0).length;

  const result = AnalyzeUrlResponse.parse({
    httpStatus,
    responseTime,
    pageTitle,
    metaDescription,
    h1Count,
    imagesMissingAlt,
    wordCount,
  });

  res.json(result);
});

export default router;
