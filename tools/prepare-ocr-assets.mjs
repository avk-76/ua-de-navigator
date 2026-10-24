import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'prototype/vendor');
const assets = [
  ['node_modules/tesseract.js/dist/tesseract.min.js', 'tesseract.min.js'],
  ['node_modules/tesseract.js/dist/tesseract.min.js.LICENSE.txt', 'tesseract.LICENSE.txt'],
  ['node_modules/tesseract.js/dist/worker.min.js', 'worker.min.js'],
  ['node_modules/tesseract.js/dist/worker.min.js.LICENSE.txt', 'worker.LICENSE.txt'],
  ['node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js', 'core/tesseract-core-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'core/tesseract-core-simd-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js', 'core/tesseract-core-relaxedsimd-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/LICENSE', 'core/LICENSE'],
  ['node_modules/pdfjs-dist/build/pdf.min.mjs', 'pdf.min.mjs'],
  ['node_modules/pdfjs-dist/build/pdf.worker.min.mjs', 'pdf.worker.min.mjs'],
  ['node_modules/pdfjs-dist/LICENSE', 'pdf.LICENSE'],
  ['node_modules/@tesseract.js-data/deu/4.0.0/deu.traineddata.gz', 'lang/deu.traineddata.gz'],
];

for (const [source, target] of assets) {
  const destination = resolve(output, target);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(resolve(root, source), destination);
}

await writeFile(resolve(output, 'SOURCES.txt'), [
  'Tesseract.js 7.0.0 and tesseract.js-core 7.0.0: https://github.com/naptha/tesseract.js',
  'PDF.js 5.4.624: https://github.com/mozilla/pdf.js',
  'German OCR language data @tesseract.js-data/deu 1.0.0: https://github.com/naptha/tessdata',
  'All libraries run in the client browser; document bytes are not sent to these sources.',
].join('\n') + '\n');
console.log('Browser OCR assets prepared.');
