import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
await build({
  entryPoints: [resolve(root, "src/cloud-client.js")],
  outfile: resolve(root, "prototype/cloud-client.js"),
  bundle: true,
  format: "iife",
  platform: "browser",
  minify: true,
  legalComments: "none",
});
