import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = resolve(import.meta.dirname, "..");
const base = process.env.SCAN_BASE || "prototype";
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
const page = await browser.newPage({ viewport: { width: 1180, height: 900 } });
const requests = [];
const mime = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".wasm": "application/wasm", ".gz": "application/gzip", ".pdf": "application/pdf" };
const normalized = (value) => value.replace(/--- Seite \d+ ---/g, "").replace(/\s+/g, " ").trim();
function editDistance(a, b) {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i += 1) {
    const row = [i + 1];
    for (let j = 0; j < b.length; j += 1)
      row.push(Math.min(row[j] + 1, previous[j + 1] + 1, previous[j] + (a[i] === b[j] ? 0 : 1)));
    previous = row;
  }
  return previous[b.length];
}
page.on("request", (request) => requests.push({ method: request.method(), url: request.url(), body: request.postData() }));
await page.route("https://*.supabase.co/**", (route) => route.abort());
await page.route("https://local.test/**", async (route) => {
  const url = new URL(route.request().url());
  const target = resolve(root, `.${decodeURIComponent(url.pathname)}`);
  if (!target.startsWith(root + "\\")) return route.fulfill({ status: 403, body: "Denied" });
  try { return route.fulfill({ body: await readFile(target), contentType: mime[extname(target)] || "application/octet-stream" }); }
  catch { return route.fulfill({ status: 404, body: "Not found" }); }
});
try {
  await page.goto(`https://local.test/${base}/index.html#document`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!window.uaDeLocalDocument);
  const image = async (angle, bad) => {
    const data = await page.evaluate(({ angle, bad }) => {
      const canvas = document.createElement("canvas");
      canvas.width = bad ? 620 : angle === 90 ? 950 : 1600;
      canvas.height = bad ? 400 : angle === 90 ? 1600 : 950;
      const context = canvas.getContext("2d");
      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.translate(canvas.width / 2, canvas.height / 2);
      context.rotate(angle * Math.PI / 180);
      context.fillStyle = bad ? "#888" : "#111";
      context.font = bad ? "18px Arial" : "50px Arial";
      const lines = ["Jobcenter Musterstadt", "Frau Maria Beispiel", "Musterstrasse 12",
        "Bitte reichen Sie die Mietbescheinigung ein.", "Aktenzeichen: KA123456"];
      lines.forEach((line, index) => context.fillText(line, bad ? -260 : -650, (index - 2) * (bad ? 42 : 125)));
      return canvas.toDataURL("image/png").split(",")[1];
    }, { angle, bad });
    return Buffer.from(data, "base64");
  };
  const files = [
    { file: "synthetic-letter.png", expected: "Mietbescheinigung", truth: "Jobcenter Musterstadt Schreiben vom 01.10.2026 Bitte reichen Sie bis zum 15.11.2026 Ihre Mietbescheinigung ein. Ein Kontoauszug ist nicht erforderlich." },
    { file: "synthetic-text.pdf", expected: "Mietbescheinigung" },
    { file: "synthetic-scan.pdf", expected: "Mietbescheinigung" },
    { file: "multi-letter.pdf", expected: "Mietbescheinigung", pages: 2 },
    { file: "two-columns.pdf", expected: "Kontoauszug", columns: true },
    { file: "table-letter.pdf", expected: "Vorauszahlung", table: true },
    { file: "angled-photo.png", expected: "Mietbescheinigung", buffer: await image(7, false),
      truth: "Jobcenter Musterstadt Frau Maria Beispiel Musterstrasse 12 Bitte reichen Sie die Mietbescheinigung ein. Aktenzeichen: KA123456" },
    { file: "rotated-photo.png", expected: "Mietbescheinigung", buffer: await image(90, false),
      truth: "Jobcenter Musterstadt Frau Maria Beispiel Musterstrasse 12 Bitte reichen Sie die Mietbescheinigung ein. Aktenzeichen: KA123456", rotated: true },
    { file: "poor-scan.png", expected: "Musterstadt", buffer: await image(0, true), low: true,
      truth: "Jobcenter Musterstadt Frau Maria Beispiel Musterstrasse 12 Bitte reichen Sie die Mietbescheinigung ein. Aktenzeichen: KA123456" },
  ];
  for (const spec of files) {
    await page.locator("#documentInput").fill("");
    const input = spec.buffer ? { name: spec.file, mimeType: "image/png", buffer: spec.buffer }
      : resolve(root, "output/playwright", spec.file);
    await page.locator("#fileInput").setInputFiles(input);
    await page.waitForFunction((word) => document.querySelector("#documentInput")?.value.includes(word), spec.expected, { timeout: 120000 });
    const result = await page.evaluate(() => ({ text: document.querySelector("#documentInput").value,
      report: window.uaDeLocalDocument.getReport() }));
    if (!result.report?.pages.every((item) => item.words.every((word) =>
      Number.isFinite(word.x) && Number.isFinite(word.y) && word.width > 0 && word.height > 0)))
      throw new Error(`${spec.file}: word coordinates unavailable`);
    if (spec.pages && result.report.pages.length !== spec.pages) throw new Error(`${spec.file}: page boundaries lost`);
    if (spec.columns && !result.report.pages[0].quality.columns) throw new Error(`${spec.file}: columns not detected`);
    if (spec.columns && result.text.indexOf("Frist:") > result.text.indexOf("Weitere Hinweise"))
      throw new Error(`${spec.file}: reading order wrong`);
    if (spec.table && !result.report.pages[0].blocks.some((block) => block.type === "table-candidate" &&
      block.rows?.length >= 2 && block.rows.every((row) => row.length >= 2)))
      throw new Error(`${spec.file}: table not detected`);
    if (spec.low && !result.report.lowConfidence) throw new Error(`${spec.file}: poor scan marked confident`);
    if (spec.rotated && Math.abs(result.report.pages[0].quality.orientation) < 45)
      throw new Error(`${spec.file}: 90 degree orientation not detected`);
    const cer = spec.truth ? editDistance(normalized(result.text), spec.truth) / spec.truth.length : null;
    if (spec.file === "multi-letter.pdf" || spec.file === "angled-photo.png" || spec.file === "rotated-photo.png" || spec.file === "poor-scan.png") {
      const redacted = await page.evaluate((value) => window.uaDeLocalDocument.redact(value), result.text);
      const values = spec.file === "multi-letter.pdf"
        ? ["Maria Beispiel", "Musterstrasse 12", "12345 Musterstadt", "KA123456", "03.04.1982", "DE02100100109307118603", "maria.beispiel@example.de"]
        : ["Maria Beispiel", "Musterstrasse 12", "KA123456"];
      const present = values.filter((value) => result.text.includes(value));
      const missed = present.filter((value) => redacted.includes(value));
      if (missed.length) throw new Error(`${spec.file}: personal data still visible: ${missed.join(", ")}`);
      console.log(`${spec.file}: personal data detected and masked ${present.length}/${values.length}; OCR omissions ${values.length - present.length}`);
    }
    console.log(JSON.stringify({ file: spec.file, chars: result.text.length, pages: result.report?.pages.length,
      words: result.report?.pages.map((p) => p.quality.wordCount),
      confidence: result.report?.pages.map((p) => p.quality.meanConfidence), cer: cer === null ? null : Math.round(cer * 1000) / 10,
      lowConfidence: result.report?.lowConfidence }));
  }
  if (base === "docs") {
    await page.screenshot({ path: resolve(root, "output/playwright/ocr-review-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    const mobile = await page.evaluate(() => ({ width: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth }));
    if (mobile.scroll > mobile.width + 1) {
      const offenders = await page.evaluate(() => [...document.querySelectorAll("body *")]
        .map((element) => ({ tag: element.tagName, id: element.id, className: String(element.className).slice(0, 70),
          right: Math.round(element.getBoundingClientRect().right), width: Math.round(element.getBoundingClientRect().width) }))
        .filter((item) => item.right > document.documentElement.clientWidth + 1).slice(0, 15));
      throw new Error(`Mobile scan review overflows: ${JSON.stringify({ mobile, offenders })}`);
    }
    await page.screenshot({ path: resolve(root, "output/playwright/ocr-review-mobile.png"), fullPage: true });
    console.log("PASS 390px mobile scan review has no horizontal overflow");
    await page.setViewportSize({ width: 1180, height: 900 });
  }
  await page.locator("#analyzeButton").click();
  await page.locator("#privacyReviewDialog").waitFor({ state: "visible" });
  if (!await page.locator("#scanLowConfidenceConfirm input").count()) throw new Error("Low-confidence review gate missing");
  await page.locator("#privacyReviewConfirm").check();
  await page.locator('#privacyReviewForm button[value="send"]').click();
  if (!await page.locator("#privacyReviewDialog").isVisible()) throw new Error("Low-confidence document passed without second confirmation");
  await page.locator("#privacyReviewCancel").click();
  console.log("PASS poor scan cannot pass review without additional confirmation");
  const blankData = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1000; canvas.height = 700;
    const context = canvas.getContext("2d");
    context.fillStyle = "white"; context.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.locator("#fileInput").setInputFiles({ name: "blank.png", mimeType: "image/png", buffer: Buffer.from(blankData, "base64") });
  await page.waitForFunction(() => document.querySelector("#statusPill")?.textContent.includes("Не удалось"));
  if (await page.locator("#documentInput").inputValue() || await page.locator("#scanReport").count())
    throw new Error("Unreadable image left stale text or preview available for analysis");
  console.log("PASS unreadable page blocks analysis and clears previous OCR");
  const privacy = await page.evaluate(() => {
    const raw = "Frau Maria Beispiel\nMusterstrasse 12\n12345 Musterstadt\nAktenzeichen: KA123456\nGeburtsdatum: 03.04.1982\nIBAN: DE02100100109307118603\nmaria.beispiel@example.de\nTelefon: 0171 12345678\nFreischaltcode: C8TEST77\nFrist: 15.11.2026";
    return { raw, safe: window.uaDeLocalDocument.redact(raw) };
  });
  for (const value of ["Maria Beispiel", "Musterstrasse 12", "12345 Musterstadt", "KA123456",
    "03.04.1982", "DE02100100109307118603", "maria.beispiel@example.de", "0171 12345678", "C8TEST77"])
    if (privacy.safe.includes(value)) throw new Error(`Missed personal data: ${value}`);
  if (!privacy.safe.includes("15.11.2026")) throw new Error("Deadline was lost in redaction");
  console.log("PASS 9/9 synthetic personal values redacted; deadline retained");
  const variants = ["Frau Marla Beisplel", "Musterstrabe 12", "K A 123456", "D3O2100100109307118603"];
  for (const value of variants) {
    const result = await page.evaluate((text) => window.uaDeLocalDocument.redact(text), value);
    if (result.includes(value)) throw new Error(`OCR variant missed: ${value}`);
  }
  console.log("PASS 4/4 OCR spelling variants masked");
  await page.locator('[data-sample="jobcenter"]').click();
  await page.locator("#documentInput").fill(privacy.raw);
  await page.locator("#analyzeButton").click();
  await page.locator("#privacyReviewDialog").waitFor({ state: "visible" });
  const reviewText = await page.locator("#privacyReviewText").inputValue();
  if (reviewText !== privacy.safe) throw new Error("Review did not receive locally redacted text");
  await page.locator("#privacyReviewConfirm").check();
  await page.evaluate(() => {
    const originalFetch = window.fetch;
    window.__scanPosted = [];
    window.fetch = (...args) => {
      if (String(args[0]).endsWith("/api/documents/analyze")) window.__scanPosted.push(args[1]?.body);
      return originalFetch(...args);
    };
  });
  await page.locator('#privacyReviewForm button[value="send"]').click();
  await page.waitForFunction(() => window.__scanPosted?.length > 0, null, { timeout: 10000 });
  const posted = JSON.parse(await page.evaluate(() => window.__scanPosted[0]));
  if (posted.text !== privacy.safe || posted.text.includes("Maria Beispiel"))
    throw new Error("Raw text reached analysis request");
  console.log("PASS analysis POST contains only reviewed redacted text");
  const external = requests.filter((r) => !r.url.startsWith("https://local.test/") && !r.url.startsWith("blob:") && !r.url.startsWith("data:") && !r.url.startsWith("chrome-extension:") && !r.url.startsWith("chrome:"));
  if (external.some((r) => r.method !== "POST" || r.body !== '{"action":"sources"}'))
    throw new Error(`Document data may have left the browser: ${JSON.stringify(external)}`);
  console.log(`PASS no document data in ${external.length} unrelated source-refresh requests`);
  console.log(`PASS ${files.length} document fixtures / ${files.length + 1} pages in ${base}`);
} finally { await browser.close(); }
