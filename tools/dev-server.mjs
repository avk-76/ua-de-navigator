import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const mime = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".ts": "text/plain", ".png": "image/png", ".pdf": "application/pdf", ".wasm": "application/wasm" };
createServer(async (request, response) => {
  const path = resolve(root, `.${decodeURIComponent(new URL(request.url, "http://localhost").pathname)}`);
  if (path !== root && !path.startsWith(root + sep)) { response.writeHead(403).end(); return; }
  const parts = path.slice(root.length).split(/[\\/]+/).filter(Boolean);
  if (parts.some((part) => part.startsWith(".") || part === "node_modules") ||
      !["prototype", "docs", "sites", "supabase"].includes(parts[0])) { response.writeHead(403).end(); return; }
  try {
    const target = (await stat(path)).isDirectory() ? resolve(path, "index.html") : path;
    response.writeHead(200, { "content-type": mime[extname(target)] || "application/octet-stream", "cache-control": "no-store" });
    response.end(await readFile(target));
  } catch { response.writeHead(404).end(); }
}).listen(8765, "127.0.0.1", () => console.log("Local test server ready on 127.0.0.1:8765"));
