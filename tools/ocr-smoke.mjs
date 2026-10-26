import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const externalPosts = [];
page.on("request", (request) => {
  if (request.method() === "POST" && !request.url().startsWith("http://127.0.0.1:8765/"))
    externalPosts.push(request.url());
});
try {
  await page.goto("http://127.0.0.1:8765/prototype/index.html#document", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!window.uaDeLocalDocument);
  await page.locator("#documentInput").waitFor({ state: "visible" });
  const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth }));
  if (dimensions.scroll > dimensions.width + 1) throw new Error(`Mobile overflow: ${JSON.stringify(dimensions)}`);
  console.log("PASS mobile 390px has no horizontal overflow");
  for (const [file, expected] of [
    ["synthetic-letter.png", "Mietbescheinigung"],
    ["synthetic-text.pdf", "Mietbescheinigung"],
    ["synthetic-scan.pdf", "Mietbescheinigung"],
  ]) {
    await page.locator("#documentInput").fill("");
    await page.locator("#fileInput").setInputFiles(resolve("output/playwright", file));
    await page.waitForFunction((word) => document.querySelector("#documentInput")?.value.includes(word), expected,
      { timeout: 120000 });
    const value = await page.locator("#documentInput").inputValue();
    if (!value.includes(expected)) throw new Error(`${file}: OCR text missing expected word`);
    console.log(`PASS local OCR/extraction ${file}: ${value.length} characters`);
  }
  if (externalPosts.length) throw new Error(`Source file triggered external POST: ${externalPosts.join(", ")}`);
  console.log("PASS source files were not posted to an external server");
} finally {
  await browser.close();
}
