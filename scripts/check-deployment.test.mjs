import assert from "node:assert/strict";
import test from "node:test";
import {
  REQUIRED_CSP_DIRECTIVES,
  validateBasePath,
  validateDeploymentArtifact,
} from "./check-deployment.mjs";

const base = "/campusflow/";
const files = new Set([
  "assets/app-abc.js",
  "assets/app-def.css",
  "icons/campusflow.svg",
  "index.html",
  "manifest.webmanifest",
  "sw.js",
]);
const csp = REQUIRED_CSP_DIRECTIVES.join("; ");
const html = `<meta http-equiv="Content-Security-Policy" content="${csp}">\n`
  + `<script src="${base}assets/app-abc.js"></script>`
  + `<link href="${base}assets/app-def.css">`
  + `<link href="${base}manifest.webmanifest">`;
const manifest = { id: "./", start_url: "./", scope: "./" };
const worker = 'const CACHE_PREFIX = "campusflow-shell-"; new URL("./index.html", self.registration.scope)';

test("accepts a complete repository-scoped deployment artifact", () => {
  assert.deepEqual(validateDeploymentArtifact({ base, files, html, manifest, worker }), []);
});

test("rejects invalid deployment bases", () => {
  for (const value of ["campusflow/", "/campusflow", "//campusflow/", "/campusflow/?x=1"]) {
    assert.throws(() => validateBasePath(value));
  }
});

test("rejects root leaks, missing files, and incomplete security policy", () => {
  const errors = validateDeploymentArtifact({
    base,
    files,
    html: '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'">'
      + '<script src="/assets/missing.js"></script>',
    manifest: { ...manifest, scope: "/" },
    worker,
  });
  assert.ok(errors.some((error) => error.includes("script-src")));
  assert.ok(errors.some((error) => error.includes("escapes deployment base")));
  assert.ok(errors.some((error) => error.includes("manifest.scope")));
});

test("rejects incomplete shell output", () => {
  const errors = validateDeploymentArtifact({
    base,
    files: new Set(["index.html"]),
    html,
    manifest,
    worker: "",
  });
  assert.ok(errors.some((error) => error.includes("Service worker")));
  assert.ok(errors.some((error) => error.includes("hashed JavaScript")));
  assert.ok(errors.some((error) => error.includes("manifest.webmanifest")));
});
