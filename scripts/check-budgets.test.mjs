import assert from "node:assert/strict";
import test from "node:test";
import { collectProductionAssets, evaluateAssetBudget } from "./check-budgets.mjs";

const budgets = {
  html: { raw: 10, gzip: 8 },
  css: { raw: 10, gzip: 8 },
  js: { raw: 10, gzip: 8 },
  total: { raw: 30, gzip: 24 },
};

const validAssets = [
  { filename: "index.html", raw: 10, gzip: 8 },
  { filename: "assets/app.css", raw: 10, gzip: 8 },
  { filename: "assets/app.js", raw: 10, gzip: 8 },
];

test("accepts assets exactly at every limit", () => {
  const result = evaluateAssetBudget(validAssets, budgets);
  assert.deepEqual(result.failures, []);
  assert.deepEqual(result.totals, { raw: 30, gzip: 24 });
});

test("sorts multiple chunks and ignores unrelated generated files", () => {
  const result = evaluateAssetBudget([
    ...validAssets,
    { filename: "assets/z.js", raw: 1, gzip: 1 },
    { filename: "assets/app.js.map", raw: 999, gzip: 999 },
    { filename: "manifest.webmanifest", raw: 999, gzip: 999 },
  ], { ...budgets, js: { raw: 10, gzip: 8 }, total: { raw: 31, gzip: 25 } });

  assert.deepEqual(result.assets.map(({ filename }) => filename), [
    "assets/app.css",
    "assets/app.js",
    "assets/z.js",
    "index.html",
  ]);
  assert.deepEqual(result.failures, []);
});

test("reports per-asset and aggregate overruns", () => {
  const result = evaluateAssetBudget([
    ...validAssets.slice(0, 2),
    { filename: "assets/app.js", raw: 11, gzip: 9 },
  ], budgets);

  assert.deepEqual(result.failures, [
    "assets/app.js raw is 11 bytes; limit is 10 bytes.",
    "assets/app.js gzip is 9 bytes; limit is 8 bytes.",
    "Total raw is 31 bytes; limit is 30 bytes.",
    "Total gzip is 25 bytes; limit is 24 bytes.",
  ]);
});

test("fails closed when a required asset class is missing", () => {
  const result = evaluateAssetBudget(validAssets.filter(({ filename }) => !filename.endsWith(".css")), budgets);
  assert.deepEqual(result.failures, ["Missing required CSS production asset."]);
});

test("rejects a missing build directory", async () => {
  await assert.rejects(
    collectProductionAssets("definitely-not-a-build-directory"),
    { code: "ENOENT" },
  );
});
