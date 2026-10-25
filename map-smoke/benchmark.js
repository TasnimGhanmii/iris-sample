
const { chromium } = require("@playwright/test");

const transparentPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/2l8AAAAASUVORK5CYII=",
  "base64"
);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    for (let run = 1; run <= 3; run++) {
      const context = await browser.newContext();
      const page = await context.newPage();

      page.on("pageerror", error =>
        console.log(`Run ${run} PAGE ERROR:`, error.message)
      );

      page.on("console", message => {
        if (message.type() === "error") {
          console.log(`Run ${run} CONSOLE ERROR:`, message.text());
        }
      });

      await page.route("https://mock-tiles.iris.test/**", async route => {
        await route.fulfill({
          status: 200,
          contentType: "image/png",
          body: transparentPng
        });
      });

      const start = Date.now();

      try {
        const response = await page.goto(
          "http://127.0.0.1:4173/index.html"
        );

        console.log(`Run ${run} HTTP status:`, response?.status());

        await page.waitForFunction(
          () => document.querySelector("#status")?.dataset.state === "ready",
          null,
          { timeout: 15000 }
        );

        const elapsedMs = Date.now() - start;
        results.push(elapsedMs);
        console.log(`Run ${run}: ${elapsedMs} ms`);
      } catch (error) {
        console.log(`Run ${run} FAILED:`, error.message);
        console.log(
          `Run ${run} current status:`,
          await page.locator("#status").innerText().catch(() => "(unavailable)")
        );
        console.log(
          `Run ${run} map state:`,
          await page.evaluate(() => ({
            maplibre: typeof window.maplibregl,
            testObject: typeof window.__IRIS_MAP_TEST__,
            canvasCount: document.querySelectorAll("#map canvas").length,
            state: document.querySelector("#status")?.dataset.state
          })).catch(() => "(page unavailable)")
        );

        break;
      } finally {
        await context.close();
      }
    }

    if (results.length > 0) {
      console.log("Successful runs:", results.length);
      console.log(
        "Mean first-load time:",
        Math.round(results.reduce((sum, value) => sum + value, 0) / results.length),
        "ms"
      );
    }
  } finally {
    await browser.close();
  }
})();
