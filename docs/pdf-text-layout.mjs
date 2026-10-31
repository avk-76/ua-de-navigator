// Keep the line breaks and indentation of a PDF text layer in editable plain text.
export function formatPdfTextContent(content) {
  const items = (content?.items || []).filter((item) => item.str?.trim());
  const positioned = items.filter((item) =>
    Number.isFinite(item.transform?.[4]) && Number.isFinite(item.transform?.[5]));
  if (positioned.length < items.length / 2) {
    return items.map((item) => `${item.str}${item.hasEOL ? "\n" : " "}`).join("").trim();
  }

  const rows = [];
  for (const item of positioned.sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4])) {
    const y = item.transform[5];
    let row = rows.find((candidate) => Math.abs(candidate.y - y) <= 2.5);
    if (!row) {
      row = { y, items: [] };
      rows.push(row);
    }
    row.items.push(item);
  }
  rows.sort((a, b) => b.y - a.y);

  const starts = positioned.map((item) => item.transform[4]).sort((a, b) => a - b);
  const left = starts[Math.floor(starts.length * 0.1)];
  const pitches = rows.slice(1).map((row, index) => rows[index].y - row.y)
    .filter((gap) => gap >= 6 && gap <= 30).sort((a, b) => a - b);
  const linePitch = pitches[Math.floor(pitches.length / 2)] || 12;
  const pointPerCharacter = 5.2;
  const lines = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (index && rows[index - 1].y - row.y > linePitch * 1.6) lines.push("");
    row.items.sort((a, b) => a.transform[4] - b.transform[4]);
    let line = " ".repeat(Math.min(42, Math.max(0,
      Math.round((row.items[0].transform[4] - left) / pointPerCharacter))));
    let right = row.items[0].transform[4];
    for (const item of row.items) {
      const gap = item.transform[4] - right;
      if (line.trim() && gap > 1.5) {
        line += " ".repeat(Math.min(42, Math.max(1, Math.round(gap / pointPerCharacter))));
      }
      line += item.str;
      right = Math.max(right, item.transform[4] + (item.width || 0));
    }
    lines.push(line.trimEnd());
  }
  return lines.join("\n").replace(/\n{4,}/g, "\n\n\n").trim();
}
