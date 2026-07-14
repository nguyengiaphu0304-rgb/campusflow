import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("exports the current plan as a valid portable document", async ({
  page,
}) => {
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export plan" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(
    /^campusflow-plan-\d{4}-\d{2}-\d{2}\.json$/,
  );
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();

  const exported = JSON.parse(await readFile(downloadPath!, "utf8")) as {
    schema: string;
    version: number;
    plan: { terms: Array<{ courses: string[] }> };
  };
  expect(exported.schema).toBe("campusflow-plan");
  expect(exported.version).toBe(1);
  expect(exported.plan.terms).toHaveLength(4);
  expect(exported.plan.terms[0]?.courses).toContain("CSC110Y1");
  await expect(page.getByRole("status")).toHaveText(
    "Plan exported as a JSON file.",
  );
});

test("imports atomically and preserves the plan after an invalid file", async ({
  page,
}) => {
  const fileInput = page.getByLabel(
    "Choose a CampusFlow JSON plan to import",
  );
  await fileInput.setInputFiles(
    path.join(process.cwd(), "tests/fixtures/focused-plan.json"),
  );

  await expect(page.getByRole("status")).toHaveText(
    "Imported 2 terms successfully.",
  );
  await expect(page.getByRole("heading", { name: "Focused Fall" })).toBeVisible();
  await expect(page.getByText("CSC148H1", { exact: true }).first()).toBeVisible();

  await fileInput.setInputFiles({
    name: "broken-plan.json",
    mimeType: "application/json",
    buffer: Buffer.from("{"),
  });

  await expect(page.getByRole("alert")).toHaveText(
    "This file is not valid JSON.",
  );
  await expect(page.getByRole("heading", { name: "Focused Fall" })).toBeVisible();
});

test("exposes visible keyboard focus for the backup controls", async ({ page }) => {
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to planner" })).toBeFocused();

  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");

  const exportButton = page.getByRole("button", { name: "Export plan" });
  await expect(exportButton).toBeFocused();
  expect(
    await exportButton.evaluate((element) => getComputedStyle(element).outlineStyle),
  ).not.toBe("none");
});

test("renders a minimum-change suggestion for an invalid sequence", async ({
  page,
}) => {
  const conflictPlan = {
    schema: "campusflow-plan",
    version: 1,
    exportedAt: "2026-07-14T00:00:00.000Z",
    plan: {
      terms: [
        {
          id: "conflict-fall",
          label: "Conflict Fall",
          courses: ["CSC207H1"],
        },
      ],
    },
  };
  await page
    .getByLabel("Choose a CampusFlow JSON plan to import")
    .setInputFiles({
      name: "conflict-plan.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(conflictPlan)),
    });

  await expect(page.getByText("CSC207H1 requires", { exact: false })).toBeVisible();
  await expect(page.getByText("Suggested fix (1 change):", { exact: false })).toBeVisible();
  await expect(
    page.getByText("Choose one minimum-change path:", { exact: false }),
  ).toBeVisible();
});

test("updates degree progress and explains remaining work after import", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Degree progress" })).toBeVisible();
  await expect(page.getByText("3 of 3 groups complete")).toBeVisible();

  await page
    .getByLabel("Choose a CampusFlow JSON plan to import")
    .setInputFiles(path.join(process.cwd(), "tests/fixtures/focused-plan.json"));

  await expect(page.getByText("1 of 3 groups complete")).toBeVisible();
  await expect(page.getByText("Plan 1.0 more eligible credits.")).toBeVisible();
  await expect(page.getByText("Plan 2.0 more eligible credits.")).toBeVisible();
});

test("reorders terms with keyboard controls, announces, and persists the result", async ({
  page,
}) => {
  const moveLater = page.getByRole("button", { name: "Move Year 1 · Fall later" });
  await moveLater.click();

  await expect(moveLater).toBeFocused();
  await expect(page.getByRole("status", { name: "Term reorder status" })).toHaveText(
    "Moved Year 1 · Fall to position 2 of 4.",
  );
  await expect(page.locator(".term-card h3")).toHaveText([
    "Year 1 · Winter",
    "Year 1 · Fall",
    "Year 2 · Fall",
    "Year 2 · Winter",
  ]);

  await page.reload();
  await expect(page.locator(".term-card h3")).toHaveText([
    "Year 1 · Winter",
    "Year 1 · Fall",
    "Year 2 · Fall",
    "Year 2 · Winter",
  ]);
  await expect(page.getByText("CSC111H1 requires", { exact: false })).toBeVisible();
});

test("reorders a term with the pointer drag handle", async ({ page }) => {
  await page.locator(".term-drag-handle").first().dragTo(page.locator(".term-card").nth(2));

  await expect(page.locator(".term-card h3")).toHaveText([
    "Year 1 · Winter",
    "Year 2 · Fall",
    "Year 1 · Fall",
    "Year 2 · Winter",
  ]);
  await expect(page.getByRole("status", { name: "Term reorder status" })).toHaveText(
    "Moved Year 1 · Fall to position 3 of 4.",
  );
});

test("has no serious or critical automated accessibility violations", async ({
  page,
}) => {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const violations = results.violations
    .filter(({ impact }) => impact === "serious" || impact === "critical")
    .map(({ id, impact, nodes }) => ({
      id,
      impact,
      targets: nodes.map((node) => node.target),
    }));

  expect(violations).toEqual([]);
});
