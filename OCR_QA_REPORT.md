# OCR update: test dashboard

Checked on 31 October 2026 before publishing the GitHub Pages copy. This report covers the browser scanner for German-language documents from German authorities. It does not certify a document as anonymous.

| Check | Result | Evidence |
| --- | --- | --- |
| Document fixtures | 9 documents, 10 pages | Text PDF, scanned PDF, two-page letter, two columns, table, ordinary photo, 7° photo, 90° photo, low-resolution scan |
| Blank page | Blocked | Previous OCR text and preview cleared; analysis cannot continue |
| Character error rate | 0% on four synthetic image fixtures | Normalized edit distance against known text; this is not a real-world accuracy estimate |
| Reading order | 1/1 two-column fixture passed | Left column precedes right column; page boundaries retained |
| Table | 1/1 fixture passed | Three rows with two cells detected; following case number remains outside the table |
| Personal values in extracted text | 16/16 masked | Seven in the two-page PDF, three each in angled, rotated and low-resolution photos |
| Additional privacy fixture | 9/9 masked | Name, street, postcode/city, case number, birth date, IBAN, email, phone and access code; deadline retained |
| OCR spelling variants | 4/4 masked | Altered name, street, case number and IBAN characters/spacing |
| Low confidence | Gate passed | Low-resolution scan requires an additional page-review confirmation |
| Network | Gate passed | Browser request log contained no original file, image or raw OCR; the analysis call received only reviewed redacted text |
| Mobile | Gate passed | No horizontal scroll at 390 px in the document review view |

Run `node tools/make-scan-pdfs.mjs`, then run `node tools/scan-validation.mjs` with a local Playwright module and Chrome path. Set `SCAN_BASE=docs` to exercise the published files. `node sites/verify-demo.mjs` covers the existing static demo. All OCR libraries and German language data are bundled locally.

## What changed

- PDF text items and Tesseract OCR words retain local page coordinates. The scanner records page bounds, coverage, contrast/sharpness proxy, confidence, orientation and uncertain words.
- The local layout pass groups headers, addresses, paragraphs, lists, table cells and page breaks. It detects a two-column reading order in the test fixture.
- The original is displayed beside editable OCR on desktop and below it on mobile. Suspected personal values and uncertain words are highlighted in the local review panel.
- Text redaction covers common names, contact details, addresses, case and customer identifiers, bank details, birth dates, access codes and several OCR spelling variants. The user must review and confirm the redacted text before analysis. Low confidence, uncertain document scope or a detected QR/barcode requires an additional confirmation.
- Original files, image metadata and unredacted OCR are never included in the analysis request. Images are never sent to the external AI. QR/barcode detection runs locally when supported by the browser; decoded data is not sent.

## Limits

- The fixtures are synthetic and relatively short. Accuracy, reading order and redaction have not been measured on a representative collection of real German authority letters, handwriting, severe blur, complex tables or mixed scans.
- OCR confidence and the blur/contrast proxy can be misleading. A native PDF text layer can itself be incomplete. The interface always asks for a comparison with the original and does not label any document safe.
- Word boxes inside a PDF text run are estimated from its text and width. Tables and columns are heuristic; users must correct their order and values before transfer.
- Automatic personal-data detection can miss unusual identifiers, names without context and values distorted beyond its OCR variants. QR/barcode detection depends on browser support. Because no image is transmitted, unread code contents and image metadata remain only in the local original.
- The synthetic browser network check covers the guest/document path and code paths used for analysis. A live signed-in account and external AI response were not exercised in this test.
