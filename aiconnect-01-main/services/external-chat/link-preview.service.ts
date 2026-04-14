import dns from "dns/promises";
import net from "net";

const MAX_REDIRECTS = 3;
const MAX_CONTENT_LENGTH = Number(process.env.EXTERNAL_CHAT_LINK_PREVIEW_MAX_BYTES || 512_000);

function extractTag(html: string, pattern: RegExp) {
  const match = html.match(pattern);
  return match?.[1]?.trim() || null;
}

function decode(value: string | null) {
  if (!value) return null;
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function isPrivateIp(ip: string) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }

  const normalized = ip.toLowerCase();
  return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:");
}

async function assertSafeHostname(hostname: string) {
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".localhost") || lower.endsWith(".internal")) {
    throw new Error("Unsafe preview target");
  }

  if (net.isIP(hostname) && isPrivateIp(hostname)) {
    throw new Error("Unsafe preview target");
  }

  const resolved = await dns.lookup(hostname, { all: true });
  if (resolved.some((entry) => isPrivateIp(entry.address))) {
    throw new Error("Unsafe preview target");
  }
}

async function fetchHtml(targetUrl: string, redirects = 0): Promise<{ url: string; html: string }> {
  if (redirects > MAX_REDIRECTS) throw new Error("Too many redirects");
  const parsed = new URL(targetUrl);
  if (!/^https?:$/i.test(parsed.protocol)) throw new Error("Unsupported preview URL");
  await assertSafeHostname(parsed.hostname);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4_000);
  const res = await fetch(parsed.toString(), {
    signal: controller.signal,
    headers: { "user-agent": "AIConnect-External-Chat-LinkPreview/2.0" },
    cache: "no-store",
    redirect: "manual",
  }).finally(() => clearTimeout(timer));

  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get("location");
    if (!location) throw new Error("Redirect missing location");
    return fetchHtml(new URL(location, parsed).toString(), redirects + 1);
  }

  if (!res.ok) throw new Error("Preview request failed");
  const contentType = res.headers.get("content-type") || "";
  if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
    throw new Error("Unsupported preview content type");
  }

  const contentLength = Number(res.headers.get("content-length") || "0");
  if (contentLength && contentLength > MAX_CONTENT_LENGTH) {
    throw new Error("Preview content too large");
  }

  const html = await res.text();
  if (Buffer.byteLength(html, "utf8") > MAX_CONTENT_LENGTH) {
    throw new Error("Preview content too large");
  }

  return { url: parsed.toString(), html };
}

export async function getLinkPreview(targetUrl: string) {
  const url = targetUrl.trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) return null;

  try {
    const { url: resolvedUrl, html } = await fetchHtml(url);
    const title =
      decode(extractTag(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i)) ||
      decode(extractTag(html, /<title[^>]*>([^<]+)<\/title>/i));
    const description =
      decode(extractTag(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i)) ||
      decode(extractTag(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i));
    const image = decode(extractTag(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i));
    const siteName = decode(extractTag(html, /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["'][^>]*>/i));

    if (!title && !description) return null;
    return {
      url: resolvedUrl,
      title: title || new URL(resolvedUrl).hostname,
      description: description || undefined,
      image: image || undefined,
      siteName: siteName || undefined,
    };
  } catch {
    return null;
  }
}
