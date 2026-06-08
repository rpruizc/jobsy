import express from "express";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { authRouter } from "./routes/auth.js";
import { searchRouter } from "./routes/search.js";
import { savedRouter } from "./routes/saved.js";
import { authSummary } from "./config.js";

const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "public");
const PORT = Number(process.env.PORT ?? 8080);

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());

app.get("/healthz", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);
app.use("/api/search", searchRouter);
app.use("/api/saved", savedRouter);

// Static frontend. The SPA is a single page, so unknown non-API GETs fall back
// to index.html.
app.use(express.static(PUBLIC_DIR));
app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(join(PUBLIC_DIR, "index.html")));

app.listen(PORT, () => {
  console.log(`Jobsy listening on http://localhost:${PORT}`);
  console.log(`Auth: ${authSummary()}`);
});
