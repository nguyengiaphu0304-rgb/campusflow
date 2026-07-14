import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REQUIRED_CSP_DIRECTIVES = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "form-action 'self'",
];

export function validateBasePath(value) {
  if (typeof value !== "string" || !value.startsWith("/") || !value.endsWith("/")) {
    throw new Error("Deployment base must be an absolute path ending in '/'.");
  }
  if (value.includes("//") || value.includes("?") || value.includes("#")) {
    throw new Error("Deployment base cannot contain an empty segment, query, or fragment.");
  }
  return value;
}

function localReferences(html) {
  return [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((reference) => reference && !reference.startsWith("#") && !reference.startsWith("data:"));
}

export function validateDeploymentArtifact({ base, files, html, manifest, worker }) {
  const safeBase = validateBasePath(base);
  const errors = [];
  const cspMatch = html.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i);
  const directives = new Set((cspMatch?.[1] ?? "").split(";").map((part) => part.trim()).filter(Boolean));
  for (const directive of REQUIRED_CSP_DIRECTIVES) {
    if (!directives.has(directive)) errors.push(`CSP is missing ${JSON.stringify(directive)}.`);
  }

  const references = localReferences(html);
  for (const reference of references) {
    if (/^https?:\/\//.test(reference)) continue;
    let filename;
    if (reference.startsWith("./")) {
      filename = reference.slice(2).split(/[?#]/, 1)[0];
    } else if (reference.startsWith(safeBase)) {
      filename = reference.slice(safeBase.length).split(/[?#]/, 1)[0];
    } else {
      errors.push(`Built reference ${JSON.stringify(reference)} escapes deployment base ${JSON.stringify(safeBase)}.`);
      continue;
    }
    if (!filename || !files.has(filename)) {
      errors.push(`Built reference ${JSON.stringify(reference)} has no artifact file.`);
    }
  }

  for (const field of ["id", "start_url", "scope"]) {
    if (manifest?.[field] !== "./") errors.push(`manifest.${field} must remain deployment-relative.`);
  }
  if (!worker.includes('new URL("./index.html", self.registration.scope)')) {
    errors.push("Service worker must resolve its offline document from registration scope.");
  }
  if (!worker.includes('const CACHE_PREFIX = "campusflow-shell-"')) {
    errors.push("Service worker cache namespace is missing.");
  }
  if (![...files].some((filename) => /^assets\/.+\.js$/.test(filename))) {
    errors.push("Artifact has no hashed JavaScript asset.");
  }
  if (![...files].some((filename) => /^assets\/.+\.css$/.test(filename))) {
    errors.push("Artifact has no hashed CSS asset.");
  }
  for (const required of ["index.html", "manifest.webmanifest", "sw.js"]) {
    if (!files.has(required)) errors.push(`Artifact is missing ${required}.`);
  }
  return errors;
}

async function collectFiles(directory, root = directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(absolute, root));
    else if (entry.isFile()) files.push(path.relative(root, absolute).split(path.sep).join("/"));
  }
  return files.sort();
}

async function main() {
  const directory = path.resolve(process.argv[2] ?? "dist");
  const base = validateBasePath(process.env.CAMPUSFLOW_BASE_PATH ?? "/");
  const files = new Set(await collectFiles(directory));
  const [html, manifestText, worker] = await Promise.all([
    readFile(path.join(directory, "index.html"), "utf8"),
    readFile(path.join(directory, "manifest.webmanifest"), "utf8"),
    readFile(path.join(directory, "sw.js"), "utf8"),
  ]);
  const errors = validateDeploymentArtifact({
    base,
    files,
    html,
    manifest: JSON.parse(manifestText),
    worker,
  });
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(`Deployment artifact verified for ${base} (${files.size} files).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(`Deployment artifact check failed: ${error.message}`);
    process.exitCode = 1;
  });
}
