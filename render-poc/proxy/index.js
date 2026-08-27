/**
 * Minimal reverse proxy for the combined-runtime feasibility
 * measurement (not production code, not wired into CI/CD): strips a
 * `/backend` prefix and forwards the remainder verbatim to the
 * internal NestJS process; everything else goes to the internal
 * Next.js process. Uses `http-proxy` directly -- nothing heavier.
 */
const http = require("http");
const httpProxy = require("http-proxy");

const API_TARGET = process.env.API_TARGET || "http://127.0.0.1:4001";
const WEB_TARGET = process.env.WEB_TARGET || "http://127.0.0.1:3001";
const PORT = process.env.PORT || 8080;

const proxy = httpProxy.createProxyServer({});

proxy.on("error", (err, req, res) => {
  console.error(`[proxy] upstream error for ${req.url}:`, err.message);
  if (res && !res.headersSent) {
    res.writeHead(502, { "Content-Type": "text/plain" });
  }
  if (res && !res.writableEnded) {
    res.end("Bad gateway");
  }
});

const server = http.createServer((req, res) => {
  if (req.url === "/backend" || req.url.startsWith("/backend/")) {
    req.url = req.url.slice("/backend".length) || "/";
    proxy.web(req, res, { target: API_TARGET });
  } else {
    proxy.web(req, res, { target: WEB_TARGET });
  }
});

server.listen(PORT, () => {
  console.log(`[proxy] pid=${process.pid} listening on :${PORT} -> api=${API_TARGET} web=${WEB_TARGET}`);
});
