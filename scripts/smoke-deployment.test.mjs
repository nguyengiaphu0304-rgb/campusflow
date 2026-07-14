import assert from "node:assert/strict";
import test from "node:test";
import { URL } from "node:url";
import { smokeDeployment, verifyDeployment } from "./smoke-deployment.mjs";

const base = "https://example.test/campusflow/";
const html = `<!doctype html><title>CampusFlow | Plan with confidence</title>
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'">
  <link rel="manifest" href="/campusflow/manifest.webmanifest">
  <link rel="icon" href="/campusflow/icon.svg">
  <link rel="stylesheet" href="/campusflow/assets/app.css">
  <script src="/campusflow/assets/app.js"></script>`;
const manifest = JSON.stringify({ icons: [{ src: "./icon.svg" }, { src: "./maskable.svg" }] });
const worker = 'const APP_SHELL = ["./index.html","./assets/app.css","./assets/app.js","./maskable.svg"];';

function response(body, contentType, status = 200) {
  return {
    headers: { get: (name) => name === "content-type" ? contentType : null },
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  };
}

function successfulFetch(url) {
  const pathname = new URL(url).pathname;
  if (pathname.endsWith("/") || pathname.endsWith(".html")) {
    return Promise.resolve(response(html, "text/html; charset=utf-8"));
  }
  if (pathname.endsWith(".webmanifest")) return Promise.resolve(response(manifest, "application/manifest+json"));
  if (pathname.endsWith(".css")) return Promise.resolve(response("body{}", "text/css"));
  if (pathname.endsWith(".svg")) return Promise.resolve(response("<svg/>", "image/svg+xml"));
  if (pathname.endsWith("sw.js")) return Promise.resolve(response(worker, "text/javascript"));
  return Promise.resolve(response("// app", "text/javascript"));
}

test("verifies the document and every same-scope shell reference", async () => {
  const result = await verifyDeployment(base, successfulFetch);
  assert.equal(result.url, base);
  assert.equal(result.assetCount, 7);
});

test("retries transient publication lag and then succeeds", async () => {
  let calls = 0;
  const fetchImpl = (url) => {
    calls += 1;
    if (calls === 1) return Promise.resolve(response("not ready", "text/plain", 404));
    return successfulFetch(url);
  };
  const result = await smokeDeployment(base, { attempts: 2, delayMs: 0, fetchImpl });
  assert.equal(result.url, base);
  assert.ok(calls > 1);
});

test("rejects a root-relative reference outside repository scope", async () => {
  const unsafeFetch = (url) => {
    if (new URL(url).pathname.endsWith("/")) {
      return Promise.resolve(response(html.replace("/campusflow/assets/app.js", "/assets/app.js"), "text/html"));
    }
    return successfulFetch(url);
  };
  await assert.rejects(() => verifyDeployment(base, unsafeFetch), /escapes deployment scope/);
});
