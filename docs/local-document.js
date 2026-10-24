/* The selected file and its unredacted text never leave this browser. */
(() => {
  const scriptBase = new URL(".", document.currentScript.src);
  const asset = (path) => new URL(path, scriptBase).href;
  let tesseractLoad;

  const messages = {
    ru: { reading: "Читаем файл только на этом устройстве…", pdf: "Читаем страницу PDF", ocr: "Распознаём страницу", large: "Файл слишком большой (максимум 20 МБ).", pages: "PDF содержит больше 20 страниц. Разделите его на части.", unsupported: "Выберите PDF, TXT или изображение.", empty: "Не удалось распознать текст. Попробуйте более чёткое фото.", review: "Удалите оставшиеся личные данные перед передачей текста." },
    uk: { reading: "Читаємо файл лише на цьому пристрої…", pdf: "Читаємо сторінку PDF", ocr: "Розпізнаємо сторінку", large: "Файл завеликий (максимум 20 МБ).", pages: "PDF містить понад 20 сторінок. Розділіть його на частини.", unsupported: "Оберіть PDF, TXT або зображення.", empty: "Не вдалося розпізнати текст. Спробуйте чіткіше фото.", review: "Видаліть решту особистих даних перед передаванням тексту." },
    de: { reading: "Die Datei wird nur auf diesem Gerät gelesen…", pdf: "PDF-Seite wird gelesen", ocr: "Seite wird erkannt", large: "Datei zu groß (maximal 20 MB).", pages: "Die PDF hat mehr als 20 Seiten. Bitte teilen Sie sie auf.", unsupported: "Bitte PDF, TXT oder Bild auswählen.", empty: "Kein Text erkannt. Versuchen Sie ein schärferes Foto.", review: "Entfernen Sie verbleibende persönliche Daten vor der Übertragung." },
    en: { reading: "Reading the file on this device only…", pdf: "Reading PDF page", ocr: "Recognizing page", large: "File too large (20 MB maximum).", pages: "PDF has more than 20 pages. Please split it.", unsupported: "Choose a PDF, TXT, or image.", empty: "No text recognized. Try a clearer photo.", review: "Remove any remaining personal data before sending the text." },
  };
  const language = () => document.querySelector("#languageSelect")?.value || "ru";
  const msg = (key) => (messages[language()] || messages.ru)[key];

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
    if (file.type === "text/plain" || name.endsWith(".txt")) return file.text();

    let worker;
    try {
      if (file.type.startsWith("image/") || /\.(png|jpe?g|webp|bmp|gif)$/i.test(name)) {
        progress(`${msg("ocr")} 1…`);
        worker = await makeWorker();
        const result = await worker.recognize(file);
        const text = result.data.text?.trim() || "";
        if (!text) throw new Error(msg("empty"));
        return text;
      }
      if (file.type !== "application/pdf" && !name.endsWith(".pdf")) throw new Error(msg("unsupported"));

      const pdfjs = await import(asset("vendor/pdf.min.mjs"));
      pdfjs.GlobalWorkerOptions.workerSrc = asset("vendor/pdf.worker.min.mjs");
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      if (pdf.numPages > 20) throw new Error(msg("pages"));
      const pages = [];
      for (let number = 1; number <= pdf.numPages; number += 1) {
        progress(`${msg("pdf")} ${number}/${pdf.numPages}…`);
        const page = await pdf.getPage(number);
        const layer = await page.getTextContent();
        const nativeText = layer.items.map((item) => item.str || "").join(" ").trim();
        if (nativeText.length >= 80) {
          pages.push(nativeText);
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
        const recognized = await worker.recognize(canvas);
        pages.push((recognized.data.text || nativeText).trim());
        canvas.width = canvas.height = 0;
      }
      const text = pages.join("\n\n").trim();
      if (!text) throw new Error(msg("empty"));
      return text;
    } finally {
      await worker?.terminate();
    }
  }

  const sensitivePatterns = [
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
    /\b(?:DE\d{20}|UA\d{27})\b/gi,
    /\b(?:\+?49|\+?380|0)[\d\s()\/-]{8,}\d\b/g,
    /\b\d{5}\s+[A-ZÄÖÜ][\p{L}ßäöü-]+(?:\s+[A-ZÄÖÜ][\p{L}ßäöü-]+)?\b/gu,
    /\b[\p{L}][\p{L}.-]*(?:straße|strasse|str\.|weg|allee|platz|gasse|ring|damm|chaussee)\s+\d+[a-z]?\b/giu,
    /\b(?:Herrn?|Frau|Mr\.?|Mrs\.?)\s+[\p{Lu}][\p{L}'-]+(?:\s+[\p{Lu}][\p{L}'-]+){0,2}/gu,
    /^(?:Name|Vorname|Nachname|Familienname|Geburtsdatum|Anschrift|Adresse|Telefon|E-Mail|Kundennummer|BG-Nummer|Aktenzeichen|Steuernummer)\s*:\s*.+$/gim,
  ];

  function redact(text) {
    return sensitivePatterns.reduce((value, pattern) => value.replace(pattern, "[ЛИЧНЫЕ ДАННЫЕ]"), String(text));
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
    if (!checkbox.checked || !preview.value.trim() || hasObviousPersonalData(preview.value)) {
      event.preventDefault();
      error.textContent = msg("review");
    }
  });

  document.querySelector("#privacyReviewCancel")?.addEventListener("click", () => {
    document.querySelector("#privacyReviewDialog")?.close("cancel");
  });

  window.uaDeLocalDocument = { extract, redact, reviewForTransfer };
})();
