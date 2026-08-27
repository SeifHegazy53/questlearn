# Combined-runtime feasibility measurement (POC — not production code)

**This branch is measurement-only. It is not merged into `main`, not
wired into CI/CD, and does not touch the demo-mode guard, session
cleanup, or anything else from the deployment design doc.** It exists
solely to answer one question with real numbers: does a single
container running Next.js standalone + NestJS + a small `/backend`-
prefix reverse proxy fit Render's documented 512 MB Free instance with
a real safety margin?

## What's here

- `../Dockerfile.combined-measurement` (repo root) — multi-stage build
  producing one image with the NestJS API and Next.js standalone build
  each self-contained under `/app/api` and `/app/web` (mirroring the
  artifact layout `apps/api/Dockerfile` and `apps/web/Dockerfile`
  already use, just nested one directory deeper, so their
  independently-resolved `node_modules` never collide).
- `proxy/index.js` — the reverse proxy. Built directly on `http-proxy`,
  nothing heavier: strips a leading `/backend` and forwards the
  remainder verbatim to the internal NestJS process; everything else
  goes to the internal Next.js process.
- `entrypoint.js` — a minimal process supervisor (not a real process
  manager): spawns the API (`PORT=4001`) and web (`PORT=3001`) as
  child processes, then runs the proxy in the same (PID 1) process,
  listening on the container's public `PORT`.
- `poll.sh` — the measurement harness. Polls `/proc/<pid>/status`
  `VmRSS` for each of the three processes, plus the container's cgroup
  v2 `memory.current` (the number a real memory limit — including
  Render's — actually enforces), once per second, tagged with a
  `phase` label read from a phase file.
- `logs/measurements.csv` — the raw sampled data from the actual run
  this measurement's numbers came from. `logs/poll_errors.log` is
  empty (clean run, no sampling errors).

## How to reproduce

```bash
# from the repo root, real Postgres/Redis already up via docker-compose.yml
docker build -f Dockerfile.combined-measurement -t questlearn-combined-measurement .

docker run -d --name qlm-measure --network questlearn_default -p 8080:8080 \
  -e DATABASE_URL="postgresql://questlearn:questlearn@postgres:5432/questlearn" \
  -e REDIS_URL="redis://redis:6379" \
  -e SESSION_SECRET="<any 32+ byte value>" \
  -e CSRF_SECRET="<any 32+ byte value>" \
  -e JWT_SECRET="<any 32+ byte value>" \
  -e WEB_URL="http://localhost:8080" \
  -e PORT=8080 \
  --memory=512m \
  questlearn-combined-measurement

# watch it under real use:
docker stats qlm-measure

# or reproduce the full phased sampling this measurement used:
echo idle > render-poc/phase.txt
bash render-poc/poll.sh qlm-measure render-poc/phase.txt > /tmp/measurements.csv
# (drive traffic through http://localhost:8080 and http://localhost:8080/backend/*
#  in another terminal, updating render-poc/phase.txt to label each scenario)
```

## Result summary

Peak container memory (cgroup `memory.current`, sampled continuously
through cold start, idle, teacher/learner login+dashboard,
mastery/report pages, Swagger, and a 40-request concurrent burst):
**~185 MB** (a transient cold-start reading) / **~150–160 MB**
steady-state under load, against Render's 512 MB Free limit — roughly
**64–70% headroom**. Full phase-by-phase breakdown, the raw data in
`logs/measurements.csv`, and an explicit flag on an unresolved ~59 MB
PSS-vs-cgroup accounting gap (real, checked via `/proc/<pid>/smaps_rollup`,
not fully root-caused) are in the session report this branch was
requested from.

Caveats: single demo tenant, small seeded dataset, light concurrency
(40 requests in bursts of 5) — a feasibility measurement, not a load
test.
