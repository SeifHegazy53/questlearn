#!/bin/sh
# MSYS_NO_PATHCONV: Git-Bash-on-Windows otherwise silently rewrites
# absolute-looking paths (/tmp/api.pid, /proc/..., /sys/fs/cgroup/...)
# into Windows host paths before they ever reach `docker exec`.
export MSYS_NO_PATHCONV=1
# Polls RSS for the api/web/proxy processes inside the container plus
# the container's total memory usage (from docker stats), once per
# second, writing CSV rows to stdout. Run from the HOST, not inside
# the container. Reads /tmp/phase on the host (bind-writable via
# `docker exec ... sh -c 'echo phase > /tmp/phase'` is overkill --
# instead the phase is passed as $PHASE_FILE, a plain host file this
# script tails for the current phase label).
CONTAINER=$1
PHASE_FILE=$2

echo "timestamp,phase,proxy_rss_kb,api_rss_kb,web_rss_kb,sum_rss_kb,container_mem_usage_bytes"

while true; do
  ts=$(date +%s)
  phase=$(cat "$PHASE_FILE" 2>/dev/null || echo "unknown")

  proxy_rss=$(docker exec "$CONTAINER" sh -c 'grep VmRSS /proc/1/status 2>/dev/null | awk "{print \$2}"' 2>/dev/null)
  api_pid=$(docker exec "$CONTAINER" cat /tmp/api.pid 2>/dev/null)
  web_pid=$(docker exec "$CONTAINER" cat /tmp/web.pid 2>/dev/null)
  api_rss=$(docker exec "$CONTAINER" sh -c "grep VmRSS /proc/$api_pid/status 2>/dev/null | awk '{print \$2}'" 2>/dev/null)
  web_rss=$(docker exec "$CONTAINER" sh -c "grep VmRSS /proc/$web_pid/status 2>/dev/null | awk '{print \$2}'" 2>/dev/null)

  proxy_rss=${proxy_rss:-0}
  api_rss=${api_rss:-0}
  web_rss=${web_rss:-0}
  sum_rss=$((proxy_rss + api_rss + web_rss))

  container_mem=$(docker exec "$CONTAINER" cat /sys/fs/cgroup/memory.current 2>/dev/null)
  container_mem=${container_mem:-0}

  echo "$ts,$phase,$proxy_rss,$api_rss,$web_rss,$sum_rss,$container_mem"
  sleep 1
done
