/**
 * Production reverse proxy (ADR 0004): strips a leading `/backend`
 * and forwards the remainder verbatim to the internal NestJS process;
 * everything else goes to the internal Next.js process. Same routing
 * logic as the measurement POC's render-poc/proxy/index.js, built on
 * `http-proxy` directly -- nothing heavier.
 *
 * Exported as a function, not a self-starting script: docker/entrypoint.js
 * only calls this once both internal processes have confirmed
 * readiness, so the public port never accepts traffic before there's
 * something real behind it.
 */
const http = require("http");
const httpProxy = require("http-proxy");

function startProxy({ port, apiTarget, webTarget }) {
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
      proxy.web(req, res, { target: apiTarget });
    } else {
      proxy.web(req, res, { target: webTarget });
    }
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`[proxy] listening on :${port} -> api=${apiTarget} web=${webTarget}`);
      resolve(server);
    });
  });
}

module.exports = { startProxy };
