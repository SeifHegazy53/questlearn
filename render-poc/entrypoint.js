/**
 * Minimal process supervisor for the combined-runtime measurement
 * container: starts the NestJS API and Next.js standalone server as
 * child processes on internal ports, then starts the /backend-prefix
 * reverse proxy in this same process, listening on the container's
 * public PORT. Not a production process manager -- just enough to
 * run three Node processes in one container for this measurement.
 */
const { spawn } = require("child_process");
const fs = require("fs");

const children = [];

function startProcess(name, command, args, env, cwd) {
  const proc = spawn(command, args, {
    env: { ...process.env, ...env },
    cwd,
    stdio: "inherit",
  });
  fs.writeFileSync(`/tmp/${name}.pid`, String(proc.pid));
  console.log(`[entrypoint] started ${name} pid=${proc.pid} cwd=${cwd}`);
  proc.on("exit", (code, signal) => {
    console.log(`[entrypoint] ${name} (pid=${proc.pid}) exited code=${code} signal=${signal}`);
  });
  children.push(proc);
  return proc;
}

startProcess("api", "node", ["apps/api/dist/main.js"], { PORT: "4001" }, "/app/api");
startProcess("web", "node", ["apps/web/server.js"], { PORT: "3001", HOSTNAME: "0.0.0.0" }, "/app/web");

fs.writeFileSync("/tmp/proxy.pid", String(process.pid));
require("./render-poc/proxy/index.js");

function shutdown(signal) {
  console.log(`[entrypoint] received ${signal}, shutting down children`);
  for (const c of children) {
    try {
      c.kill("SIGTERM");
    } catch {
      // already exited
    }
  }
  process.exit(0);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
