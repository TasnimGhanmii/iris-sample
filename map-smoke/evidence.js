
const { chromium } = require("@playwright/test");

const transparentPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/2l8AAAAASUVORK5CYII=",
  "base64"
);

(async () => {
  const browser = await chromium.launch({ headless: true });

  try {
    // Successful initial load.
    {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 }
      });

      await page.route("https://mock-tiles.iris.test/**", async route => {
        await route.fulfill({
          status: 200,
          contentType: "image/png",
          body: transparentPng
        });
      });

      await page.goto("http://127.0.0.1:4173/index.html");
      await page.waitForFunction(
        () => document.querySelector("#status")?.dataset.state === "ready",
        null,
        { timeout: 15000 }
      );

      await page.screenshot({
        path: "evidence-initial-load.png",
        fullPage: true
      });

      await page.close();
    }

    // Failed tiles, with the fixture controls still available.
    {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 }
      });

      await page.route("https://mock-tiles.iris.test/**", route =>
        route.abort("failed")
      );

      await page.goto("http://127.0.0.1:4173/index.html");
      await page.waitForFunction(
        () => document.querySelector("#status")?.dataset.state === "error",
        null,
        { timeout: 15000 }
      );

      await page.screenshot({
        path: "evidence-tile-failure.png",
        fullPage: true
      });

      await page.close();
    }

    console.log("Captured both evidence screenshots.");
  } finally {
    await browser.close();
  }
})();
