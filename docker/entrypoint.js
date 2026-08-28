/**
 * Production process supervisor (ADR 0004, §5). Runs as `tini`'s
 * direct child (see Dockerfile.combined's `ENTRYPOINT ["tini", "--",
 * "node", "docker/entrypoint.js"]`) -- this process itself registers
 * real signal handlers rather than relying on a shell script to
 * forward them, and `tini` sits in front specifically to reap zombie
 * processes and guarantee correct exit-code propagation, a concern
 * that exists independently of how carefully this file handles
 * signals.
 *
 * Three things the measurement POC's entrypoint deliberately did not
 * need, all required here:
 *   1. Readiness-gated startup -- the proxy does not open the public
 *      port until both internal processes have confirmed readiness.
 *   2. Exit-on-child-death -- either child exiting is treated as
 *      fatal; this process exits too rather than silently serving
 *      traffic with one upstream gone.
 *   3. Real signal handling for a clean shutdown under Render's own
 *      restart/redeploy cycle.
 */
const { spawn } = require("child_process");
const http = require("http");
const { startProxy } = require("./proxy");

const PUBLIC_PORT = process.env.PORT || 10000;
const API_PORT = 4001;
const WEB_PORT = 3001;
const READINESS_TIMEOUT_MS = 60_000;
const READINESS_POLL_INTERVAL_MS = 500;

let shuttingDown = false;
const children = [];

function startChild(name, command, args, env, cwd) {
  const proc = spawn(command, args, { env: { ...process.env, ...env }, cwd, stdio: "inherit" });
  console.log(`[entrypoint] started ${name} pid=${proc.pid} cwd=${cwd}`);

  proc.on("exit", (code, signal) => {
    console.log(`[entrypoint] ${name} (pid=${proc.pid}) exited code=${code} signal=${signal}`);
    if (shuttingDown) return;
    // Any child exiting unexpectedly is fatal: better to fail loudly
    // and let Render's health check + restart cycle recover than to
    // keep the proxy up and silently proxy into a dead upstream.
    console.error(`[entrypoint] ${name} exited unexpectedly -- shutting down`);
    shutdown(1);
  });

  children.push(proc);
  return proc;
}

/** Polls a bare HTTP GET against `path` until it responds at all (any status code counts as "the process is up and listening"), or throws after `READINESS_TIMEOUT_MS`. */
function waitForReady(name, port, path) {
  const deadline = Date.now() + READINESS_TIMEOUT_MS;

  return new Promise((resolve, reject) => {
    function attempt() {
      const req = http.get({ host: "127.0.0.1", port, path, timeout: 2000 }, (res) => {
        res.resume(); // drain, don't care about the body
        console.log(`[entrypoint] ${name} ready (status ${res.statusCode})`);
        resolve();
      });
      req.on("error", retry);
      req.on("timeout", () => {
        req.destroy();
        retry();
      });
    }

    function retry() {
      if (Date.now() > deadline) {
        reject(new Error(`${name} did not become ready within ${READINESS_TIMEOUT_MS}ms`));
        return;
      }
      setTimeout(attempt, READINESS_POLL_INTERVAL_MS);
    }

    attempt();
  });
}

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[entrypoint] shutting down (exit code ${code})`);
  for (const c of children) {
    try {
      c.kill("SIGTERM");
    } catch {
      // already exited
    }
  }
  process.exitCode = code;
  // Give children a moment to exit cleanly before this process itself
  // exits (tini reaps anything still lingering either way).
  setTimeout(() => process.exit(code), 1000);
}

process.on("SIGTERM", () => shutdown(0));
process.on("SIGINT", () => shutdown(0));

async function main() {
  startChild("api", "node", ["apps/api/dist/main.js"], { PORT: String(API_PORT) }, "/app/api");
  startChild("web", "node", ["apps/web/server.js"], { PORT: String(WEB_PORT), HOSTNAME: "0.0.0.0" }, "/app/web");

  try {
    await Promise.all([
      waitForReady("api", API_PORT, "/health"),
      waitForReady("web", WEB_PORT, "/login"),
    ]);
  } catch (err) {
    console.error(`[entrypoint] readiness check failed: ${err.message}`);
    shutdown(1);
    return;
  }

  await startProxy({
    port: PUBLIC_PORT,
    apiTarget: `http://127.0.0.1:${API_PORT}`,
    webTarget: `http://127.0.0.1:${WEB_PORT}`,
  });
  console.log("[entrypoint] both upstreams ready, proxy accepting public traffic");
}

main();
