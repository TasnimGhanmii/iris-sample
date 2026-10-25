const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 30000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    screenshot: "only-on-failure"
  },
  webServer: {
    command: "npx http-server . -p 4173 -a 127.0.0.1",
    url: "http://127.0.0.1:4173/index.html",
    reuseExistingServer: false
  }
});
