import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_MANIFEST_FIELDS = {
  id: "./",
  start_url: "./",
  scope: "./",
  display: "standalone",
  background_color: "#08111f",
  theme_color: "#08111f",
};

export function validateManifest(manifest, availableFiles) {
  const errors = [];
  for (const [field, expected] of Object.entries(REQUIRED_MANIFEST_FIELDS)) {
    if (manifest?.[field] !== expected) {
      errors.push(`manifest.${field} must equal ${JSON.stringify(expected)}.`);
    }
  }
  if (typeof manifest?.name !== "string" || !manifest.name.trim()) {
    errors.push("manifest.name must be a non-empty string.");
  }
  if (typeof manifest?.short_name !== "string" || !manifest.short_name.trim()) {
    errors.push("manifest.short_name must be a non-empty string.");
  }
  if (!Array.isArray(manifest?.icons) || manifest.icons.length < 2) {
    errors.push("manifest.icons must include install and maskable icons.");
  } else {
    for (const purpose of ["any", "maskable"]) {
      const icon = manifest.icons.find((candidate) =>
        typeof candidate?.purpose === "string" && candidate.purpose.split(/\s+/).includes(purpose));
      if (!icon) {
        errors.push(`manifest.icons must include a ${purpose} icon.`);
      } else {
        const filename = String(icon.src ?? "").replace(/^\.\//, "");
        if (!availableFiles.has(filename)) {
          errors.push(`Manifest icon ${JSON.stringify(icon.src)} does not exist in the build.`);
        }
      }
    }
    for (const size of ["192x192", "512x512"]) {
      if (!manifest.icons.some((icon) =>
        typeof icon?.sizes === "string" && icon.sizes.split(/\s+/).includes(size))) {
        errors.push(`manifest.icons must declare a ${size} icon.`);
      }
    }
  }
  return errors;
}

export function createServiceWorker(assetPaths, version) {
  const shell = JSON.stringify(assetPaths.map((asset) => `./${asset}`));
  return `const CACHE_PREFIX = "campusflow-shell-";
const CACHE_NAME = CACHE_PREFIX + ${JSON.stringify(version)};
const APP_SHELL = ${shell};

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((names) => Promise.all(
    names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map((name) => caches.delete(name)),
  )).then(() => self.clients.claim()));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

async function navigationResponse(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request))
      ?? (await cache.match(new URL("./index.html", self.registration.scope)))
      ?? (await cache.match(new URL("./", self.registration.scope)))
      ?? Response.error();
  }
}

async function assetResponse(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(navigationResponse(request));
    return;
  }
  if (["script", "style", "image", "font", "manifest"].includes(request.destination)) {
    event.respondWith(assetResponse(request));
  }
});
`;
}

async function collectBuildFiles(directory, root = directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectBuildFiles(absolute, root));
    else if (entry.isFile() && entry.name !== "sw.js") {
      files.push(path.relative(root, absolute).split(path.sep).join("/"));
    }
  }
  return files.sort();
}

async function main() {
  const directory = path.resolve(process.argv[2] ?? "dist");
  const files = await collectBuildFiles(directory);
  const manifest = JSON.parse(await readFile(path.join(directory, "manifest.webmanifest"), "utf8"));
  const errors = validateManifest(manifest, new Set(files));
  if (errors.length) throw new Error(errors.join("\n"));

  const hash = createHash("sha256");
  for (const filename of files) {
    hash.update(filename);
    hash.update(await readFile(path.join(directory, filename)));
  }
  const version = hash.digest("hex").slice(0, 12);
  await writeFile(path.join(directory, "sw.js"), createServiceWorker(files, version));
  console.log(`PWA shell generated with ${files.length} assets (cache ${version}).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(`Unable to build PWA shell: ${error.message}`);
    process.exitCode = 1;
  });
}
