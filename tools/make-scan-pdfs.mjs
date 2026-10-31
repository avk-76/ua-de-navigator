import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const target = resolve(import.meta.dirname, "../output/playwright");
await mkdir(target, { recursive: true });
const esc = (text) => text.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
const line = (x, y, text, size = 12) => `BT /F1 ${size} Tf 1 0 0 1 ${x} ${y} Tm (${esc(text)}) Tj ET`;
function pdf(pages) {
  const objects = ["", "<< /Type /Catalog /Pages 2 0 R >>", ""];
  const kids = [];
  for (const commands of pages) {
    const page = objects.length;
    const stream = page + 1;
    kids.push(`${page} 0 R`);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${3 + pages.length * 2} 0 R >> >> /Contents ${stream} 0 R >>`);
    const body = commands.join("\n") + "\n";
    objects.push(`<< /Length ${Buffer.byteLength(body)} >>\nstream\n${body}endstream`);
  }
  objects[2] = `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${kids.length} >>`;
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  let out = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 1; i < objects.length; i += 1) {
    offsets.push(Buffer.byteLength(out));
    out += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const start = Buffer.byteLength(out);
  out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) out += `${String(offset).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  return Buffer.from(out);
}
await writeFile(resolve(target, "multi-letter.pdf"), pdf([
  [line(55, 780, "Jobcenter Musterstadt"), line(55, 740, "Frau Maria Beispiel"),
    line(55, 720, "Musterstrasse 12"), line(55, 700, "12345 Musterstadt"),
    line(55, 650, "Aktenzeichen: KA123456"), line(55, 630, "Geburtsdatum: 03.04.1982"),
    line(55, 590, "Bitte reichen Sie Ihre Mietbescheinigung ein.")],
  [line(55, 780, "Seite zwei: Nachweise"), line(55, 740, "Ihre IBAN: DE02100100109307118603"),
    line(55, 700, "Kontakt: maria.beispiel@example.de"), line(55, 660, "Frist: 15.11.2026")],
]));
await writeFile(resolve(target, "two-columns.pdf"), pdf([[
  line(55, 790, "Jobcenter Musterstadt", 16),
  line(55, 710, "Antrag auf Leistungen"), line(55, 680, "Bitte reichen Sie"),
  line(55, 650, "die Mietbescheinigung ein."), line(55, 620, "Frist: 15.11.2026"),
  line(325, 710, "Weitere Hinweise"), line(325, 680, "Ein Kontoauszug ist"),
  line(325, 650, "nicht erforderlich."), line(325, 620, "Bitte schriftlich antworten."),
]]));
await writeFile(resolve(target, "table-letter.pdf"), pdf([[
  line(55, 790, "Finanzamt Musterstadt", 16), line(55, 750, "Steuerbescheid"),
  line(55, 690, "Position"), line(340, 690, "Betrag"),
  line(55, 660, "Einkommensteuer"), line(340, 660, "120 EUR"),
  line(55, 630, "Vorauszahlung"), line(340, 630, "30 EUR"),
  line(55, 580, "Aktenzeichen: 123/456-789.012345"),
]]));
console.log("Generated 2-page, 2-column and table PDF fixtures.");
