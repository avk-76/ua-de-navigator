/* The selected file and its unredacted text never leave this browser. */
(() => {
  const scriptBase = new URL(".", document.currentScript.src);
  const asset = (path) => new URL(path, scriptBase).href;
  let tesseractLoad;
  let previewUrl;
  let scanReport = null;
  const mask = "[ЛИЧНЫЕ ДАННЫЕ]";

  const messages = {
    ru: { reading: "Читаем файл только на этом устройстве…", pdf: "Читаем страницу PDF", ocr: "Распознаём страницу", large: "Файл слишком большой (максимум 20 МБ).", pages: "PDF содержит больше 20 страниц. Разделите его на части.", unsupported: "Выберите PDF, TXT или изображение.", empty: "Не удалось распознать текст. Попробуйте более чёткое фото.", review: "Удалите оставшиеся личные данные перед передачей текста." },
    uk: { reading: "Читаємо файл лише на цьому пристрої…", pdf: "Читаємо сторінку PDF", ocr: "Розпізнаємо сторінку", large: "Файл завеликий (максимум 20 МБ).", pages: "PDF містить понад 20 сторінок. Розділіть його на частини.", unsupported: "Оберіть PDF, TXT або зображення.", empty: "Не вдалося розпізнати текст. Спробуйте чіткіше фото.", review: "Видаліть решту особистих даних перед передаванням тексту." },
    de: { reading: "Die Datei wird nur auf diesem Gerät gelesen…", pdf: "PDF-Seite wird gelesen", ocr: "Seite wird erkannt", large: "Datei zu groß (maximal 20 MB).", pages: "Die PDF hat mehr als 20 Seiten. Bitte teilen Sie sie auf.", unsupported: "Bitte PDF, TXT oder Bild auswählen.", empty: "Kein Text erkannt. Versuchen Sie ein schärferes Foto.", review: "Entfernen Sie verbleibende persönliche Daten vor der Übertragung." },
    en: { reading: "Reading the file on this device only…", pdf: "Reading PDF page", ocr: "Recognizing page", large: "File too large (20 MB maximum).", pages: "PDF has more than 20 pages. Please split it.", unsupported: "Choose a PDF, TXT, or image.", empty: "No text recognized. Try a clearer photo.", review: "Remove any remaining personal data before sending the text." },
  };
  const scanLabels = {
    ru: { title: "Локальная проверка", page: "стр.", note: "Оригинал и координаты OCR остаются в браузере. Сверьте каждую страницу с текстом рядом. QR и штрихкоды могут содержать данные, которые OCR не прочёл; изображение никуда не передаётся.", scope: "Не удалось уверенно подтвердить немецкий язык и немецкое ведомство. Проверьте документ и исправьте OCR вручную.", caution: "требует особой проверки", manual: "проверьте вручную", words: "слов", rotation: "поворот", columns: "две колонки", bounds: "Границы", coverage: "охват текста", clarity: "резкость/контраст", low: "сомнительных слов", blocks: "Блоки", code: "Найдено QR/штрихкодов", codeNote: "Данные в них остаются в локальном оригинале и не передаются ИИ. Проверьте области", personal: "Найдены возможные личные данные", check: "Проверьте слова", confirm: "Я сверил(а) все сомнительные страницы и коды с оригиналом и исправил(а) пропуски, включая личные данные." },
    uk: { title: "Локальна перевірка", page: "стор.", note: "Оригінал і координати OCR залишаються в браузері. Звірте кожну сторінку з текстом поруч. QR та штрихкоди можуть містити дані, які OCR не прочитав; зображення нікуди не передається.", scope: "Не вдалося впевнено підтвердити німецьку мову та німецьку установу. Перевірте документ і виправте OCR вручну.", caution: "потребує особливої перевірки", manual: "перевірте вручну", words: "слів", rotation: "поворот", columns: "дві колонки", bounds: "Межі", coverage: "охоплення тексту", clarity: "чіткість/контраст", low: "сумнівних слів", blocks: "Блоки", code: "Знайдено QR/штрихкодів", codeNote: "Дані в них залишаються в локальному оригіналі й не передаються ШІ. Перевірте області", personal: "Знайдено можливі особисті дані", check: "Перевірте слова", confirm: "Я звірив(ла) усі сумнівні сторінки й коди з оригіналом та виправив(ла) пропуски, зокрема особисті дані." },
    de: { title: "Lokale Prüfung", page: "S.", note: "Original und OCR-Koordinaten bleiben im Browser. Vergleichen Sie jede Seite mit dem Text daneben. QR- und Barcodes können ungelesene Daten enthalten; das Bild wird nicht übertragen.", scope: "Deutsche Sprache und deutsche Behörde konnten nicht sicher erkannt werden. Bitte prüfen und korrigieren Sie den Text.", caution: "besonders prüfen", manual: "manuell prüfen", words: "Wörter", rotation: "Drehung", columns: "zwei Spalten", bounds: "Grenzen", coverage: "Textbereich", clarity: "Schärfe/Kontrast", low: "unsichere Wörter", blocks: "Blöcke", code: "QR-/Barcodes erkannt", codeNote: "Ihre Daten bleiben im lokalen Original und gehen nicht an die KI. Bereiche prüfen", personal: "Mögliche persönliche Daten", check: "Wörter prüfen", confirm: "Ich habe alle unsicheren Seiten und Codes mit dem Original verglichen und Auslassungen einschließlich persönlicher Daten korrigiert." },
    en: { title: "Local review", page: "p.", note: "The original and OCR coordinates stay in the browser. Compare each page with the text beside it. QR and barcodes may contain data OCR missed; the image is never sent.", scope: "German language and a German authority could not be confirmed. Check the document and correct the OCR text.", caution: "needs special review", manual: "review manually", words: "words", rotation: "rotation", columns: "two columns", bounds: "Bounds", coverage: "text coverage", clarity: "sharpness/contrast", low: "uncertain words", blocks: "Blocks", code: "QR/barcodes found", codeNote: "Their data remain in the local original and are not sent to AI. Check areas", personal: "Possible personal data found", check: "Check words", confirm: "I compared every uncertain page and code with the original and corrected omissions, including personal data." },
  };
  const language = () => document.querySelector("#languageSelect")?.value || "ru";
  const msg = (key) => (messages[language()] || messages.ru)[key];
  const scanMsg = (key) => (scanLabels[language()] || scanLabels.ru)[key];

  function loadTesseract() {
    if (!tesseractLoad) {
      tesseractLoad = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = asset("vendor/tesseract.min.js");
        script.onload = () => window.Tesseract ? resolve(window.Tesseract) : reject(new Error("OCR unavailable"));
        script.onerror = () => reject(new Error("OCR unavailable"));
        document.head.append(script);
      });
    }
    return tesseractLoad;
  }

  async function makeWorker() {
    const tesseract = await loadTesseract();
    return tesseract.createWorker("deu", 1, {
      workerPath: asset("vendor/worker.min.js"),
      corePath: asset("vendor/core"),
      langPath: asset("vendor/lang"),
      workerBlobURL: false,
    });
  }

  async function extract(file, progress = () => {}) {
    if (file.size > 20 * 1024 * 1024) throw new Error(msg("large"));
    progress(msg("reading"));
    const name = file.name.toLowerCase();
    if (file.type === "text/plain" || name.endsWith(".txt")) {
      scanReport = null;
      clearPreview();
      return file.text();
    }

    const { pdfWords, ocrWords, layoutPage } = await import(asset("scan-layout.mjs"));
    const pages = [];
    const inspectImage = async (source, width, height) => {
      const thumb = document.createElement("canvas");
      const factor = Math.min(1, 400 / Math.max(width, height));
      thumb.width = Math.max(1, Math.round(width * factor));
      thumb.height = Math.max(1, Math.round(height * factor));
      const context = thumb.getContext("2d", { willReadFrequently: true });
      context.drawImage(source, 0, 0, thumb.width, thumb.height);
      const pixels = context.getImageData(0, 0, thumb.width, thumb.height).data;
      let minX = thumb.width, minY = thumb.height, maxX = 0, maxY = 0, edges = 0, count = 0;
      const rows = new Array(Math.ceil(thumb.height / 2)).fill(0);
      const columns = new Array(Math.ceil(thumb.width / 2)).fill(0);
      for (let y = 1; y < thumb.height - 1; y += 2) for (let x = 1; x < thumb.width - 1; x += 2) {
        const i = (y * thumb.width + x) * 4;
        const lum = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
        if (lum < 220) {
          minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
          rows[Math.floor(y / 2)] += 1;
          columns[Math.floor(x / 2)] += 1;
        }
        const j = i + 4;
        edges += Math.abs(lum - (pixels[j] + pixels[j + 1] + pixels[j + 2]) / 3);
        count += 1;
      }
      thumb.width = thumb.height = 0;
      const variation = (values) => {
        const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
        return values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length / Math.max(1, mean ** 2);
      };
      return { boundary: maxX > minX ? [minX, minY, maxX, maxY].map((v) => Math.round(v / factor)) : [0, 0, width, height],
        edgeScore: Math.round(edges / Math.max(1, count) * 10) / 10,
        verticalText: variation(columns) > variation(rows) * 1.8,
        blank: maxX <= minX };
    };
    const readImage = async (source, number, width, height, visual = source) => {
      const factor = Math.min(1, 1200 / Math.max(width, height));
      const reduced = factor < 1 ? document.createElement("canvas") : null;
      if (reduced) {
        reduced.width = Math.round(width * factor);
        reduced.height = Math.round(height * factor);
        reduced.getContext("2d").drawImage(visual, 0, 0, reduced.width, reduced.height);
      }
      const baseWidth = reduced?.width || width, baseHeight = reduced?.height || height;
      const ocrVisual = reduced || visual;
      const qualityImage = await inspectImage(visual, width, height);
      if (qualityImage.blank) {
        if (reduced) reduced.width = reduced.height = 0;
        const blank = layoutPage([], baseWidth, baseHeight);
        Object.assign(blank.quality, qualityImage, { lowConfidence: true, orientation: 0 });
        blank.number = number;
        blank.source = "ocr";
        return blank;
      }
      if (!worker) worker = await makeWorker();
      let initial = null;
      let applied = qualityImage.verticalText ? 270 : 0;
      if (applied) {
        initial = document.createElement("canvas");
        initial.width = baseHeight;
        initial.height = baseWidth;
        const context = initial.getContext("2d");
        context.translate(initial.width / 2, initial.height / 2);
        context.rotate(applied * Math.PI / 180);
        context.drawImage(ocrVisual, -baseWidth / 2, -baseHeight / 2);
      }
      let result = await worker.recognize(initial || reduced || source, { rotateAuto: !applied }, { text: true, blocks: true });
      let words = ocrWords(result.data);
      let readWidth = initial?.width || baseWidth, readHeight = initial?.height || baseHeight;
      const score = (candidate, recognized) => recognized.length * 3 +
        (candidate.data.confidence || 0) +
        (/\b(?:Jobcenter|Finanzamt|Bescheid|Antrag|Bitte)\b/i.test(candidate.data.text || "") ? 30 : 0);
      if (words.length < 5 || (result.data.confidence || 0) < 55) {
        for (const degrees of (qualityImage.verticalText ? [90, 0, 180] : [270, 90, 180])) {
          const rotated = document.createElement("canvas");
          rotated.width = degrees === 180 ? baseWidth : baseHeight;
          rotated.height = degrees === 180 ? baseHeight : baseWidth;
          const context = rotated.getContext("2d");
          context.translate(rotated.width / 2, rotated.height / 2);
          context.rotate(degrees * Math.PI / 180);
          context.drawImage(ocrVisual, -baseWidth / 2, -baseHeight / 2);
          const alternative = await worker.recognize(rotated, {}, { text: true, blocks: true });
          const alternativeWords = ocrWords(alternative.data);
          if (score(alternative, alternativeWords) > score(result, words) + 10) {
            result = alternative;
            words = alternativeWords;
            applied = degrees;
            readWidth = rotated.width;
            readHeight = rotated.height;
          }
          rotated.width = rotated.height = 0;
          if (words.length >= 8 && (result.data.confidence || 0) >= 80 &&
              /\b(?:Jobcenter|Finanzamt|Bescheid|Antrag|Bitte)\b/i.test(result.data.text || "")) break;
        }
      }
      if (initial) initial.width = initial.height = 0;
      const layout = layoutPage(words, readWidth, readHeight);
      if (!words.length) {
        layout.text = result.data.text?.trim() || "";
        layout.quality.lowConfidence = true;
      }
      layout.quality.orientation = applied + Math.round((result.data.rotateRadians || 0) * 180 / Math.PI);
      if (applied) {
        layout.words = layout.words.map((word) => {
          if (applied === 90) return { ...word, x: word.y, y: baseHeight - word.x - word.width,
            width: word.height, height: word.width };
          if (applied === 180) return { ...word, x: baseWidth - word.x - word.width,
            y: baseHeight - word.y - word.height };
          return { ...word, x: baseWidth - word.y - word.height, y: word.x,
            width: word.height, height: word.width };
        });
      }
      if (factor < 1) layout.words = layout.words.map((word) => ({ ...word,
        x: word.x / factor, y: word.y / factor, width: word.width / factor, height: word.height / factor }));
      if (reduced) reduced.width = reduced.height = 0;
      Object.assign(layout.quality, qualityImage);
      if (qualityImage.edgeScore < 4 || width < 800) layout.quality.lowConfidence = true;
      layout.quality.codeRegions = [];
      if ("BarcodeDetector" in window) {
        try {
          const codes = await new BarcodeDetector().detect(visual);
          layout.quality.codeRegions = codes.map((code) => ({
            x: Math.round(code.boundingBox.x), y: Math.round(code.boundingBox.y),
            width: Math.round(code.boundingBox.width), height: Math.round(code.boundingBox.height),
          }));
        } catch { layout.quality.codeInspection = "unavailable"; }
      } else layout.quality.codeInspection = "unavailable";
      layout.number = number;
      layout.source = "ocr";
      return layout;
    };

    let worker;
    try {
      if (file.type.startsWith("image/") || /\.(png|jpe?g|webp|bmp|gif)$/i.test(name)) {
        progress(`${msg("ocr")} 1…`);
        const bitmap = await createImageBitmap(file);
        const page = await readImage(file, 1, bitmap.width, bitmap.height, bitmap);
        bitmap.close();
        pages.push(page);
        const text = page.text;
        if (!text) throw new Error(msg("empty"));
        showReport(file, pages);
        return text;
      }
      if (file.type !== "application/pdf" && !name.endsWith(".pdf")) throw new Error(msg("unsupported"));

      const pdfjs = await import(asset("vendor/pdf.min.mjs"));
      const { formatPdfTextContent } = await import(asset("pdf-text-layout.mjs"));
      pdfjs.GlobalWorkerOptions.workerSrc = asset("vendor/pdf.worker.min.mjs");
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      if (pdf.numPages > 20) throw new Error(msg("pages"));
      for (let number = 1; number <= pdf.numPages; number += 1) {
        progress(`${msg("pdf")} ${number}/${pdf.numPages}…`);
        const page = await pdf.getPage(number);
        const layer = await page.getTextContent();
        const nativeText = formatPdfTextContent(layer);
        if (nativeText.replace(/\s/g, "").length >= 80) {
          const viewport = page.getViewport({ scale: 1 });
          const layout = layoutPage(pdfWords(layer, viewport), viewport.width, viewport.height);
          layout.number = number;
          layout.source = "pdf";
          layout.text = layout.quality.columns ? layout.text : nativeText;
          pages.push(layout);
          continue;
        }
        progress(`${msg("ocr")} ${number}/${pdf.numPages}…`);
        if (!worker) worker = await makeWorker();
        const viewport = page.getViewport({ scale: 1.8 });
        const scale = Math.min(1, Math.sqrt(4_000_000 / (viewport.width * viewport.height)));
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width * scale);
        canvas.height = Math.ceil(viewport.height * scale);
        await page.render({ canvasContext: canvas.getContext("2d"), viewport: page.getViewport({ scale: 1.8 * scale }), canvas }).promise;
        const recognized = await readImage(canvas, number, canvas.width, canvas.height);
        if (!recognized.text) recognized.text = nativeText;
        pages.push(recognized);
        canvas.width = canvas.height = 0;
      }
      if (!pages.some((page) => page.text.trim())) throw new Error(msg("empty"));
      const text = pages.map((page) => `--- Seite ${page.number} ---\n${page.text}`).join("\n\n").trim();
      showReport(file, pages);
      return text;
    } finally {
      await worker?.terminate();
    }
  }

  function clearPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    document.querySelector("#scanReport")?.remove();
  }

  function showReport(file, pages) {
    clearPreview();
    previewUrl = URL.createObjectURL(file);
    const allText = pages.map((page) => page.text).join("\n");
    const german = /\b(?:bitte|ihre|ihnen|gemäß|bescheid|antrag|unterlagen|frist|schreiben|steuer)\b/iu.test(allText);
    const authority = /\b(?:Jobcenter|Finanzamt|Ausländerbehörde|Landratsamt|Sozialamt|Jugendamt|Bürgeramt|Stadtverwaltung|Gemeinde|Bundesagentur|Rentenversicherung|Krankenkasse|Amtsgericht)\b/iu.test(allText);
    scanReport = { pages, lowConfidence: pages.some((page) => page.quality.lowConfidence),
      scopeWarning: !german || !authority, hasCodes: pages.some((page) => page.quality.codeRegions?.length) };
    const host = document.querySelector("#documentInput");
    if (!host) return;
    const panel = document.createElement("section");
    panel.id = "scanReport";
    panel.className = "scan-report";
    const title = document.createElement("h3");
    title.textContent = `${scanMsg("title")} · ${pages.length} ${scanMsg("page")}`;
    panel.append(title);
    const notice = document.createElement("p");
    notice.textContent = scanMsg("note");
    panel.append(notice);
    if (scanReport.scopeWarning) {
      const warning = document.createElement("p");
      warning.className = "scan-warning";
      warning.textContent = scanMsg("scope");
      panel.append(warning);
    }
    const frame = file.type === "application/pdf" || /\.pdf$/i.test(file.name)
      ? document.createElement("iframe") : document.createElement("img");
    frame.className = "scan-original";
    frame.title = "Оригинал документа на устройстве";
    frame.src = previewUrl;
    panel.append(frame);
    const list = document.createElement("div");
    list.className = "scan-pages";
    for (const page of pages) {
      const item = document.createElement("details");
      item.open = !!page.quality.lowConfidence;
      const summary = document.createElement("summary");
      const q = page.quality;
      summary.textContent = `${scanMsg("page")} ${page.number}: ${q.lowConfidence ? scanMsg("caution") : scanMsg("manual")} · ${q.meanConfidence}% · ${scanMsg("words")} ${q.wordCount} · ${scanMsg("rotation")} ${q.orientation}°${q.columns ? ` · ${scanMsg("columns")}` : ""}`;
      if (frame.tagName === "IFRAME") summary.addEventListener("click", () => { frame.src = `${previewUrl}#page=${page.number}`; });
      item.append(summary);
      const detail = document.createElement("p");
      detail.textContent = `${scanMsg("bounds")}: ${q.boundary.join(", ")} px; ${scanMsg("coverage")}: ${q.coverage}%; ${scanMsg("clarity")}: ${q.edgeScore ?? "PDF"}; ${scanMsg("low")}: ${q.lowWords}. ${scanMsg("blocks")}: ${page.blocks.map((block) => block.type).join(", ") || "—"}.`;
      item.append(detail);
      if (q.codeRegions?.length) {
        const codes = document.createElement("p");
        codes.className = "scan-warning";
        codes.textContent = `${scanMsg("code")}: ${q.codeRegions.length}. ${scanMsg("codeNote")}: ${q.codeRegions.map((region) => `x${region.x} y${region.y}`).join(", ")}.`;
        item.append(codes);
      }
      const found = [];
      for (const pattern of sensitivePatterns) {
        pattern.lastIndex = 0;
        for (const match of page.text.matchAll(pattern)) if (match[0].length < 100) found.push(match[0]);
      }
      if (found.length) {
        const unique = [...new Set(found)];
        const personal = document.createElement("p");
        personal.append(document.createTextNode(`${scanMsg("personal")} (${unique.length}): `));
        for (const value of unique.slice(0, 12)) {
          const mark = document.createElement("mark");
          mark.textContent = value;
          personal.append(mark, document.createTextNode(" "));
        }
        item.append(personal);
      }
      const suspicious = page.words.filter((word) => word.confidence < 70).slice(0, 12);
      if (suspicious.length) {
        const words = document.createElement("p");
        words.textContent = `${scanMsg("check")}: ${suspicious.map((word) => `${word.text} (${Math.round(word.confidence)}%, x${Math.round(word.x)} y${Math.round(word.y)})`).join("; ")}`;
        item.append(words);
      }
      list.append(item);
    }
    panel.append(list);
    host.after(panel);
  }

  const sensitivePatterns = [
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
    /\b(?:D[ E3]|UA)[ \t-]?(?:[0-9OIl|][ \t-]?){20,27}\b/gi,
    /\b(?:IBAN|BIC|SWIFT|Kontonummer|Bankverbindung)[ \t]*[:#-]?[ \t]*[A-Z0-9 \t-]{8,34}/gi,
    /\b(?:\+?49|\+?380|0)[\d\s()\/-]{8,}\d\b/g,
    /\b\d{5}\s+[A-ZÄÖÜ][\p{L}ßäöü-]+(?:\s+[A-ZÄÖÜ][\p{L}ßäöü-]+)?\b/gu,
    /\b[\p{L}][\p{L}.-]*(?:straße|strasse|strabe|str\.|weg|allee|platz|gasse|ring|damm|chaussee)\s+\d+[a-z]?\b/giu,
    /\b(?:Herrn?|Frau|Mr\.?|Mrs\.?)\s+[\p{Lu}][\p{L}'-]+(?:\s+[\p{Lu}][\p{L}'-]+){0,2}/gu,
    /^(?!.*\b(?:Jobcenter|Finanzamt|Landratsamt|Sozialamt|Stadtverwaltung)\b)[\p{Lu}][\p{L}'-]+[ \t]+[\p{Lu}][\p{L}'-]+(?=\r?\n[^\n]*(?:straße|strasse|strabe|weg|platz)[ \t]*\d+)/gmu,
    /(?:^|\n)(?:Herrn?|Frau)\s*\n\s*[\p{Lu}][\p{L}'-]+\s+[\p{Lu}][\p{L}'-]+/gmu,
    /(?:^|\n)[\p{Lu}][\p{L}'-]+\s+[\p{Lu}][\p{L}'-]+\s+KA\s?\d{5,}\b/gmu,
    /\b(?:KA\s?\d{5,}|[A-Z]{1,3}\d{7,})\b/gi,
    /\bK[ \t.]?A[ \t.-]?(?:[0-9OIl|][ \t.-]?){5,12}\b/gi,
    /\b(?:Kunden|Akten|Geschäfts|BG|Bedarfs­?gemeinschafts|Versicherten|Mitglieds|Steuer|Sozialversicherungs|Rentenversicherungs|Personal|Identifikations)[\s-]?(?:nummer|nr\.?|zeichen|ID)\s*[:#.-]?\s*[A-Z0-9OIl|/ .-]{4,30}/giu,
    /\b(?:Geburtsdatum|geb\.?\s*am|geboren\s*am|DOB)\s*[:#-]?\s*\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}\b/giu,
    /\b(?:PIN|PUK|TAN|QR[- ]?Code|Barcode|Strichcode|Zugangscode|Passwort)\s*[:#-]?\s*[A-Z0-9-]{4,}\b/gi,
    /\b\d{1,4}\s*\/\s*\d{1,4}\s*-\s*\d{2,6}\s*[.·-]\s*\d{3,}\b/g,
    /\b(?:Versichertennummer|Versicherungsnummer|Mitgliedsnummer|Freischaltcode|Aktivierungscode)\s*[:#-]?\s*[A-Z0-9-]{5,}\b/gi,
    /^(?:Name|Vorname|Nachname|Familienname|Geburtsdatum|Anschrift|Adresse|Telefon|E-Mail|Kundennummer|BG-Nummer|Aktenzeichen|Steuernummer|Empfänger|Ihr Zeichen|Mein Zeichen|Konto|IBAN|BIC)\s*:\s*.+$/gim,
  ];

  function redact(text) {
    return sensitivePatterns.reduce((value, pattern) => value.replace(pattern, mask), String(text));
  }

  function hasObviousPersonalData(text) {
    return sensitivePatterns.some((pattern) => {
      pattern.lastIndex = 0;
      return pattern.test(text);
    });
  }

  function reviewForTransfer(original) {
    const dialog = document.querySelector("#privacyReviewDialog");
    const preview = document.querySelector("#privacyReviewText");
    const checkbox = document.querySelector("#privacyReviewConfirm");
    const error = document.querySelector("#privacyReviewError");
    if (!dialog || !preview || !checkbox || !error || !dialog.showModal) throw new Error("Privacy review unavailable");
    preview.value = redact(original);
    const earlier = dialog.querySelector("#scanLowConfidenceConfirm");
    earlier?.remove();
    if (scanReport?.lowConfidence || scanReport?.scopeWarning || scanReport?.hasCodes) {
      const label = document.createElement("label");
      label.id = "scanLowConfidenceConfirm";
      label.className = "consent-check";
      const input = document.createElement("input");
      input.type = "checkbox";
      const span = document.createElement("span");
      span.textContent = scanMsg("confirm");
      label.append(input, span);
      checkbox.closest("label")?.before(label);
    }
    checkbox.checked = false;
    error.textContent = "";
    dialog.returnValue = "";
    dialog.showModal();
    return new Promise((resolve) => {
      dialog.addEventListener("close", () => {
        resolve(dialog.returnValue === "send" ? preview.value.trim() : null);
        preview.value = "";
      }, { once: true });
    });
  }

  document.querySelector("#privacyReviewForm")?.addEventListener("submit", (event) => {
    const preview = document.querySelector("#privacyReviewText");
    const checkbox = document.querySelector("#privacyReviewConfirm");
    const error = document.querySelector("#privacyReviewError");
    if (!checkbox.checked || ((scanReport?.lowConfidence || scanReport?.scopeWarning || scanReport?.hasCodes) && !document.querySelector("#scanLowConfidenceConfirm input")?.checked) ||
        !preview.value.trim() || hasObviousPersonalData(preview.value)) {
      event.preventDefault();
      error.textContent = msg("review");
    }
  });

  document.querySelector("#privacyReviewCancel")?.addEventListener("click", () => {
    document.querySelector("#privacyReviewDialog")?.close("cancel");
  });

  document.querySelector("#languageSelect")?.addEventListener("change", () => {
    const pages = scanReport?.pages;
    const file = document.querySelector("#fileInput")?.files?.[0];
    if (pages && file) showReport(file, pages);
  });

  window.uaDeLocalDocument = { extract, redact, reviewForTransfer,
    clear: () => { scanReport = null; clearPreview(); },
    getReport: () => scanReport };
})();
