import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, normalize } from "node:path";
import { readSnapshot } from "./store.js";

const ROOT = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(ROOT, "..", "public");
const PORT = Number(process.env.PORT ?? 4173);

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  if (url.pathname === "/api/jobs") {
    const snapshot = await readSnapshot();
    res.writeHead(snapshot ? 200 : 404, { "content-type": "application/json" });
    res.end(
      snapshot ? JSON.stringify(snapshot) : JSON.stringify({ error: "No data yet. Run `npm run radar` first." }),
    );
    return;
  }

  // Static files, scoped to public/ (no path traversal).
  const rel = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
  const filePath = normalize(join(PUBLIC_DIR, rel));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  try {
    const body = await readFile(filePath);
    res.writeHead(200, { "content-type": MIME[extname(filePath)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`\n🎮 Jobsy dashboard: http://localhost:${PORT}\n`);
  console.log("   (run `npm run radar` in another tab to refresh the data)\n");
});
