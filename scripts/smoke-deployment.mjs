import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, URL } from "node:url";
import path from "node:path";

function documentReferences(html) {
  return [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((reference) => reference && !reference.startsWith("#") && !reference.startsWith("data:"));
}

async function requireResponse(fetchImpl, url, expectedType) {
  const response = await fetchImpl(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}.`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes(expectedType)) {
    throw new Error(`${url} returned unexpected content type ${JSON.stringify(contentType)}.`);
  }
  return response.text();
}

export async function verifyDeployment(baseUrl, fetchImpl = globalThis.fetch) {
  const base = new URL(baseUrl);
  if (base.protocol !== "https:" || !base.pathname.endsWith("/")) {
    throw new Error("Deployment URL must be an HTTPS directory URL ending in '/'.");
  }
  const html = await requireResponse(fetchImpl, base, "text/html");
  if (!html.includes("CampusFlow | Plan with confidence")) {
    throw new Error("Deployed document does not identify CampusFlow.");
  }
  if (!html.includes('http-equiv="Content-Security-Policy"')) {
    throw new Error("Deployed document is missing its CSP meta policy.");
  }

  const manifestUrl = new URL("manifest.webmanifest", base);
  const workerUrl = new URL("sw.js", base);
  const [manifestText, worker] = await Promise.all([
    requireResponse(fetchImpl, manifestUrl, "application/manifest+json"),
    requireResponse(fetchImpl, workerUrl, "javascript"),
  ]);
  const manifest = JSON.parse(manifestText);
  const urls = new Set([manifestUrl.href, workerUrl.href]);
  for (const reference of documentReferences(html)) {
    const url = new URL(reference, base);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) {
      if (!/^https?:\/\//.test(reference)) {
        throw new Error(`Document reference ${JSON.stringify(reference)} escapes deployment scope.`);
      }
      continue;
    }
    urls.add(url.href);
  }
  for (const icon of manifest.icons ?? []) {
    if (typeof icon?.src === "string") urls.add(new URL(icon.src, manifestUrl).href);
  }
  const shellMatch = worker.match(/const APP_SHELL = (\[[^;]+\]);/);
  if (!shellMatch) throw new Error("Deployed service worker has no readable app shell.");
  for (const reference of JSON.parse(shellMatch[1])) {
    if (typeof reference === "string") urls.add(new URL(reference, workerUrl).href);
  }

  for (const url of [...urls].sort()) {
    if (url === manifestUrl.href || url === workerUrl.href) continue;
    const pathname = new URL(url).pathname;
    const expectedType = pathname.endsWith("/") || pathname.endsWith(".html") ? "text/html"
      : pathname.endsWith(".webmanifest") ? "application/manifest+json"
      : pathname.endsWith(".js") ? "javascript"
        : pathname.endsWith(".css") ? "text/css"
          : pathname.endsWith(".svg") ? "image/svg+xml"
            : "text/plain";
    await requireResponse(fetchImpl, url, expectedType);
  }
  return { assetCount: urls.size, url: base.href };
}

export async function smokeDeployment(baseUrl, options = {}) {
  const attempts = options.attempts ?? 8;
  const delayMs = options.delayMs ?? 5_000;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await verifyDeployment(baseUrl, fetchImpl);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await delay(delayMs);
    }
  }
  throw lastError;
}

async function main() {
  const url = process.argv[2];
  if (!url) throw new Error("Usage: node scripts/smoke-deployment.mjs <deployment-url>");
  const result = await smokeDeployment(url);
  console.log(`Live deployment verified at ${result.url} (${result.assetCount} shell references).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(`Post-deployment smoke check failed: ${error.message}`);
    process.exitCode = 1;
  });
}
