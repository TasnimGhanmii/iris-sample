const { chromium } = require("@playwright/test");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on("pageerror", error => console.log("PAGE ERROR:", error.message));
  page.on("console", message => {
    if (message.type() === "error") console.log("CONSOLE ERROR:", message.text());
  });
  page.on("requestfailed", request =>
    console.log("REQUEST FAILED:", request.url(), request.failure()?.errorText)
  );

  await page.goto("http://127.0.0.1:4173/index.html");
  await page.waitForTimeout(3000);

  console.log("MapLibre available:", await page.evaluate(() => typeof window.maplibregl));
  console.log("Map canvas count:", await page.locator("#map canvas").count());
  console.log("Status:", await page.locator("#status").innerText());

  await browser.close();
})();
