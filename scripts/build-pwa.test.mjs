import assert from "node:assert/strict";
import test from "node:test";
import { createServiceWorker, validateManifest } from "./build-pwa.mjs";

const manifest = {
  id: "./",
  name: "CampusFlow",
  short_name: "CampusFlow",
  start_url: "./",
  scope: "./",
  display: "standalone",
  background_color: "#08111f",
  theme_color: "#08111f",
  icons: [
    { src: "./icons/app.svg", sizes: "192x192", purpose: "any" },
    { src: "./icons/app.svg", sizes: "512x512", purpose: "any" },
    { src: "./icons/maskable.svg", sizes: "512x512", purpose: "maskable" },
  ],
};
const files = new Set(["icons/app.svg", "icons/maskable.svg"]);

test("accepts a complete same-scope manifest", () => {
  assert.deepEqual(validateManifest(manifest, files), []);
});

test("rejects unsafe scope, missing names, icons, and icon files", () => {
  const invalid = {
    ...manifest,
    name: "",
    scope: "/",
    icons: [{ src: "./icons/missing.svg", sizes: "192x192", purpose: "any" }],
  };
  assert.deepEqual(validateManifest(invalid, files), [
    "manifest.scope must equal \"./\".",
    "manifest.name must be a non-empty string.",
    "manifest.icons must include install and maskable icons.",
  ]);
});

test("generates a versioned worker with scoped cache cleanup and explicit updates", () => {
  const worker = createServiceWorker(["index.html", "assets/app.js"], "abc123");
  assert.match(worker, /campusflow-shell-/);
  assert.match(worker, /abc123/);
  assert.match(worker, /\.\/assets\/app\.js/);
  assert.match(worker, /name\.startsWith\(CACHE_PREFIX\)/);
  assert.match(worker, /event\.data\?\.type === "SKIP_WAITING"/);
  assert.match(worker, /request\.method !== "GET"/);
  assert.match(worker, /url\.origin !== self\.location\.origin/);
});
