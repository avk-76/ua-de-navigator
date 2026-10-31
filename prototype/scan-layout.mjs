// Geometry stays in the browser. Coordinates are pixels in the displayed page.
const median = (values) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] || 0;
};

export function pdfWords(content, viewport) {
  return (content.items || []).filter((item) => item.str?.trim()).flatMap((item) => {
    const matrix = viewport.transform;
    const t = item.transform;
    const x = matrix[0] * t[4] + matrix[2] * t[5] + matrix[4];
    const baseline = matrix[1] * t[4] + matrix[3] * t[5] + matrix[5];
    const height = Math.max(7, Math.hypot(t[2], t[3]) * viewport.scale);
    const runWidth = Math.max(1, item.width * viewport.scale);
    return [...item.str.matchAll(/\S+/g)].map((match) => ({
      text: match[0], x: x + runWidth * match.index / item.str.length,
      y: baseline - height, width: Math.max(1, runWidth * match[0].length / item.str.length), height,
      confidence: 100, source: "pdf",
    }));
  });
}

export function ocrWords(data) {
  const words = [];
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(visit);
    if (node.bbox && typeof node.text === "string" && !node.paragraphs && !node.words && !node.lines && node.text.trim()) {
      words.push({ text: node.text.trim(), x: node.bbox.x0, y: node.bbox.y0,
        width: node.bbox.x1 - node.bbox.x0, height: node.bbox.y1 - node.bbox.y0,
        confidence: Number(node.confidence ?? 0), source: "ocr" });
      return;
    }
    for (const key of ["blocks", "paragraphs", "lines", "words", "symbols"]) if (node[key]) visit(node[key]);
  };
  visit(data.blocks);
  return words;
}

export function layoutPage(words, width, height) {
  const valid = words.filter((w) => w.text?.trim() && Number.isFinite(w.x) && Number.isFinite(w.y));
  const lineHeight = median(valid.map((w) => w.height)) || 12;
  const lines = [];
  for (const word of [...valid].sort((a, b) => a.y - b.y || a.x - b.x)) {
    let line = lines.find((item) => Math.abs(item.y - word.y) < Math.max(4, lineHeight * 0.55));
    if (!line) { line = { y: word.y, words: [] }; lines.push(line); }
    line.words.push(word);
  }
  const wideRows = lines.filter((line) => {
    const sorted = [...line.words].sort((a, b) => a.x - b.x);
    return sorted.some((word, index) => index && word.x - (sorted[index - 1].x + sorted[index - 1].width) > width * 0.1 &&
      sorted[index - 1].x < width * 0.5 && word.x > width * 0.5);
  }).length;
  if (wideRows >= 4) {
    const originals = lines.splice(0);
    for (const line of originals) {
      const leftWords = line.words.filter((word) => word.x < width * 0.5);
      const rightWords = line.words.filter((word) => word.x >= width * 0.5);
      if (leftWords.length && rightWords.length) {
        lines.push({ y: line.y, words: leftWords }, { y: line.y, words: rightWords });
      } else lines.push(line);
    }
  }
  for (const line of lines) {
    line.words.sort((a, b) => a.x - b.x);
    line.x = Math.min(...line.words.map((w) => w.x));
    line.right = Math.max(...line.words.map((w) => w.x + w.width));
    line.text = line.words.map((w) => w.text).join(" ");
  }
  lines.sort((a, b) => a.y - b.y || a.x - b.x);
  // A wide empty vertical gutter is stronger evidence of columns than source order.
  const left = lines.filter((line) => line.right < width * 0.52);
  const right = lines.filter((line) => line.x > width * 0.48);
  const columns = left.length >= 4 && right.length >= 4 &&
    !lines.some((line) => line.x < width * 0.38 && line.right > width * 0.62 && line.y > height * 0.2 && line.y < height * 0.85);
  let ordered = lines;
  if (columns) {
    const header = lines.filter((line) => line.y < height * 0.1 && line.x < width * 0.5);
    const footer = lines.filter((line) => line.y > height * 0.9 && line.x < width * 0.4 && line.right > width * 0.6);
    const used = new Set([...header, ...footer]);
    ordered = [...header, ...lines.filter((line) => !used.has(line) && line.x < width * 0.5),
      ...lines.filter((line) => !used.has(line) && line.x >= width * 0.5), ...footer];
  }
  const pitch = median(lines.slice(1).map((line, index) => line.y - lines[index].y).filter((gap) => gap > lineHeight * 0.6)) || lineHeight * 1.4;
  const blocks = [];
  for (let index = 0; index < ordered.length; index += 1) {
    const line = ordered[index];
    const previous = blocks.at(-1);
    const gap = previous ? line.y - previous.lastY : Infinity;
    const list = /^\s*(?:[-•●]|\d+[.)])\s/.test(line.text);
    const address = /\b\d{5}\s+\p{L}+/u.test(line.text) || /(?:straße|strasse|str\.|weg|platz)\s*\d+/iu.test(line.text);
    const nextAddress = ordered[index + 1] && /(?:straße|strasse|str\.|weg|platz)\s*\d+/iu.test(ordered[index + 1].text);
    const type = list ? "list" : address || nextAddress ? "address" : line.y < height * 0.16 ? "header" : "paragraph";
    if (!previous || gap < 0 || gap > pitch * 1.55 || list || previous.type !== type) {
      blocks.push({ type, lines: [line], lastY: line.y });
    } else { previous.lines.push(line); previous.lastY = line.y; }
  }
  for (const block of blocks) {
    if (block.lines.length >= 2 && block.lines.filter((line) =>
      line.words.some((word, index) => index && word.x - (line.words[index - 1].x + line.words[index - 1].width) > 35)
      || /\b(?:EUR|€)\s*\d/.test(line.text)).length >= 2)
      block.type = "table-candidate";
    if (block.type === "table-candidate") block.rows = block.lines.map((line) => {
      const cells = [];
      for (const word of line.words) {
        const last = cells.at(-1);
        if (!last || word.x - last.right > 35) cells.push({ text: word.text, x: word.x, right: word.x + word.width });
        else { last.text += ` ${word.text}`; last.right = word.x + word.width; }
      }
      return cells.map(({ text, x }) => ({ text, x }));
    });
    if (block.type === "table-candidate") {
      const tail = block.rows.findIndex((row, index) => index >= 2 && row.length < 2);
      if (tail > 0) {
        const other = block.lines.splice(tail);
        block.rows.splice(tail);
        blocks.splice(blocks.indexOf(block) + 1, 0, { type: "paragraph", lines: other });
      }
    }
    block.text = block.lines.map((line) => line.text).join("\n");
  }
  const lowWords = valid.filter((w) => w.source === "ocr" && w.confidence < 70);
  const meanConfidence = valid.length ? Math.round(valid.reduce((sum, w) => sum + w.confidence, 0) / valid.length) : 0;
  const coverage = valid.length ? Math.round((Math.max(...valid.map((w) => w.y + w.height)) - Math.min(...valid.map((w) => w.y))) / height * 100) : 0;
  const lowConfidence = !valid.length || meanConfidence < 78 || lowWords.length / valid.length > 0.15;
  return { words: valid, lines: ordered, blocks, text: blocks.map((block) => block.text).join("\n\n"),
    quality: { meanConfidence, lowWords: lowWords.length, wordCount: valid.length, coverage,
      lowConfidence, columns, orientation: 0, boundary: [0, 0, width, height] } };
}
