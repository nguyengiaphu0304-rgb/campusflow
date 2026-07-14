import { gzipSync } from "node:zlib";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_BUDGETS = Object.freeze({
  html: Object.freeze({ raw: 4 * 1024, gzip: 2 * 1024 }),
  css: Object.freeze({ raw: 20 * 1024, gzip: 6 * 1024 }),
  js: Object.freeze({ raw: 250 * 1024, gzip: 80 * 1024 }),
  total: Object.freeze({ raw: 280 * 1024, gzip: 90 * 1024 }),
});

const REQUIRED_TYPES = ["html", "css", "js"];

function assetType(filename) {
  const extension = path.extname(filename).slice(1).toLowerCase();
  return REQUIRED_TYPES.includes(extension) ? extension : null;
}

export function evaluateAssetBudget(assets, budgets = DEFAULT_BUDGETS) {
  const measured = assets
    .filter(({ filename }) => assetType(filename))
    .map((asset) => ({ ...asset, type: assetType(asset.filename) }))
    .sort((left, right) => left.filename.localeCompare(right.filename));
  const failures = [];

  for (const type of REQUIRED_TYPES) {
    if (!measured.some((asset) => asset.type === type)) {
      failures.push(`Missing required ${type.toUpperCase()} production asset.`);
    }
  }

  for (const asset of measured) {
    const limit = budgets[asset.type];
    for (const encoding of ["raw", "gzip"]) {
      if (asset[encoding] > limit[encoding]) {
        failures.push(
          `${asset.filename} ${encoding} is ${asset[encoding]} bytes; limit is ${limit[encoding]} bytes.`,
        );
      }
    }
  }

  const totals = measured.reduce(
    (sum, asset) => ({ raw: sum.raw + asset.raw, gzip: sum.gzip + asset.gzip }),
    { raw: 0, gzip: 0 },
  );
  for (const encoding of ["raw", "gzip"]) {
    if (totals[encoding] > budgets.total[encoding]) {
      failures.push(
        `Total ${encoding} is ${totals[encoding]} bytes; limit is ${budgets.total[encoding]} bytes.`,
      );
    }
  }

  return { assets: measured, totals, failures };
}

export async function collectProductionAssets(directory, root = directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectProductionAssets(absolute, root));
    } else if (entry.isFile() && assetType(entry.name)) {
      const contents = await readFile(absolute);
      files.push({
        filename: path.relative(root, absolute).split(path.sep).join("/"),
        raw: contents.byteLength,
        gzip: gzipSync(contents, { level: 9 }).byteLength,
      });
    }
  }
  return files;
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(2)} KiB`;
}

export function formatBudgetReport(result, budgets = DEFAULT_BUDGETS) {
  const lines = ["Production asset budget"];
  for (const asset of result.assets) {
    const limit = budgets[asset.type];
    lines.push(
      `- ${asset.filename}: ${formatBytes(asset.raw)} raw / ${formatBytes(asset.gzip)} gzip ` +
      `(limits ${formatBytes(limit.raw)} / ${formatBytes(limit.gzip)})`,
    );
  }
  lines.push(
    `- total: ${formatBytes(result.totals.raw)} raw / ${formatBytes(result.totals.gzip)} gzip ` +
    `(limits ${formatBytes(budgets.total.raw)} / ${formatBytes(budgets.total.gzip)})`,
  );
  if (result.failures.length) {
    lines.push("Budget failures:", ...result.failures.map((failure) => `- ${failure}`));
  } else {
    lines.push("All performance budgets passed.");
  }
  return lines.join("\n");
}

async function main() {
  const directory = path.resolve(process.argv[2] ?? "dist");
  const result = evaluateAssetBudget(await collectProductionAssets(directory));
  console.log(formatBudgetReport(result));
  if (result.failures.length) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(`Unable to measure production assets: ${error.message}`);
    process.exitCode = 1;
  });
}
