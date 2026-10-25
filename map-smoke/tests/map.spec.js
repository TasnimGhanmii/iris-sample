const { test, expect } = require("@playwright/test");

const transparentPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/2l8AAAAASUVORK5CYII=",
  "base64"
);

async function mockTiles(page, shouldFail = false) {
  await page.route("https://mock-tiles.iris.test/**", async route => {
    if (shouldFail) {
      await route.abort("failed");
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "image/png",
      body: transparentPng
    });
  });
}

test("initial map loads with deterministic mocked tiles", async ({ page }) => {
  await mockTiles(page);
  await page.goto("/index.html");

  await expect(page.locator("#map canvas")).toBeVisible();
  await expect.poll(() =>
    page.evaluate(() => window.__IRIS_MAP_TEST__?.getState().styleLoaded)
  ).toBe(true);

    await expect(page.locator("#status")).toHaveAttribute("data-state", "ready");
  await expect(page.locator("#bess-toggle")).toBeChecked();
  await expect(page.locator("#peatland-toggle")).toBeChecked();

  await expect(page.locator("#legend")).toBeVisible();
  await expect(page.locator("#legend")).toContainText("BESS");
  await expect(page.locator("#legend")).toContainText("Peatland");

  await expect(page.locator("#provenance")).toBeVisible();
  await expect(page.locator("#provenance")).toContainText("synthetic");
  await expect(page.locator("#provenance")).toContainText("Not applicable");
  await expect(page.locator("#provenance")).toContainText(
    "no external geographic dataset used"
  );
});

test("BESS and peatland layer toggles change map visibility", async ({ page }) => {
  await mockTiles(page);
  await page.goto("/index.html");

  await expect.poll(() =>
    page.evaluate(() => window.__IRIS_MAP_TEST__?.getState().styleLoaded)
  ).toBe(true);

  await page.locator("#bess-toggle").uncheck();
  await expect.poll(() =>
    page.evaluate(() =>
      window.__IRIS_MAP_TEST__.map.getLayoutProperty("bess-points", "visibility")
    )
  ).toBe("none");

  await page.locator("#peatland-toggle").uncheck();
  await expect.poll(() =>
    page.evaluate(() =>
      window.__IRIS_MAP_TEST__.map.getLayoutProperty("peatland-fill", "visibility")
    )
  ).toBe("none");

  await page.locator("#bess-toggle").check();
  await expect.poll(() =>
    page.evaluate(() =>
      window.__IRIS_MAP_TEST__.map.getLayoutProperty("bess-points", "visibility")
    )
  ).toBe("visible");
});

test("tile failure shows an error while the map and fixtures remain available", async ({ page }) => {
  await mockTiles(page, true);
  await page.goto("/index.html");

  await expect(page.locator("#map canvas")).toBeVisible();
  await expect.poll(() =>
    page.evaluate(() => window.__IRIS_MAP_TEST__?.getState().styleLoaded)
  ).toBe(true);

  await expect(page.locator("#status")).toHaveAttribute("data-state", "error");
  await expect(page.locator("#status")).toContainText("Basemap tiles failed");
  await expect(page.locator("#bess-toggle")).toBeVisible();
  await expect(page.locator("#peatland-toggle")).toBeVisible();
});



test("retry recovers the basemap after an initial tile failure", async ({ page }) => {
  let allowTiles = false;

  await page.route("https://mock-tiles.iris.test/**", async (route) => {
    if (!allowTiles) {
      await route.abort("failed");
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "image/png",
      body: transparentPng
    });
  });

  await page.goto("/index.html");

  // Confirm the initial failure is visible.
  await expect(page.locator("#map canvas")).toBeVisible();
  await expect(page.locator("#status")).toHaveAttribute("data-state", "error");
  await expect(page.locator("#status")).toContainText("Basemap tiles failed");

  // Allow tiles to succeed before requesting a style reload.
  allowTiles = true;
  await page.locator("#retry").click();

  // Confirm recovery and that retry was actually triggered.
  await expect(page.locator("#status")).toHaveAttribute("data-state", "ready", {
    timeout: 15000
  });

  await expect.poll(() =>
    page.evaluate(() => window.__IRIS_MAP_TEST__?.getState().retryCount)
  ).toBe(1);

  await expect(page.locator("#bess-toggle")).toBeVisible();
  await expect(page.locator("#peatland-toggle")).toBeVisible();
});

