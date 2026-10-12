#!/bin/sh
# Usage: serve.sh start|stop|doctor
# Serves site/ on VERIFY_PORT (default 8090) so it never collides with tools/serve.sh on 8080.
set -u
ROOT=$(cd "$(dirname "$0")/../../../.." && pwd)
PORT=${VERIFY_PORT:-8090}
URL="http://127.0.0.1:$PORT"
STATE="$ROOT/verify-out"
PIDFILE="$STATE/serve-$PORT.pid"
LOG="$STATE/serve-$PORT.log"

# Prints the HTTP status and the <title> of $URL/, or "000" when nothing answers.
probe() {
  python3 - "$URL/" <<'PY'
import re, sys, urllib.request
try:
    with urllib.request.urlopen(sys.argv[1], timeout=2) as r:
        m = re.search(r"<title>(.*?)</title>", r.read().decode("utf-8", "replace"), re.S)
        print(r.status, m.group(1).strip() if m else "")
except Exception:
    print("000")
PY
}

# True only when the PID file names a live python http.server serving this checkout's site/ on our port.
# Checking /proc cmdline guards against a recycled PID.
ours() {
  [ -f "$PIDFILE" ] || return 1
  pid=$(cat "$PIDFILE")
  [ -r "/proc/$pid/cmdline" ] || return 1
  cmd=$(tr '\0' ' ' < "/proc/$pid/cmdline")
  case "$cmd" in
    *"http.server $PORT "*"--directory $ROOT/site"*) return 0 ;;
    *) return 1 ;;
  esac
}

case "${1:-}" in
  start)
    if ours; then echo "already running: pid $(cat "$PIDFILE") at $URL"; exit 0; fi
    set -- $(probe)
    if [ "$1" != "000" ]; then
      echo "port $PORT already answers ($1) but is not ours; set VERIFY_PORT to another port" >&2
      exit 1
    fi
    mkdir -p "$STATE"
    nohup python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT/site" >"$LOG" 2>&1 &
    echo $! > "$PIDFILE"
    for _ in $(seq 1 50); do
      set -- $(probe)
      if [ "$1" = "200" ]; then echo "ready: pid $(cat "$PIDFILE") at $URL"; exit 0; fi
      sleep 0.1
    done
    echo "not ready after 5s; see $LOG" >&2
    "$0" stop >/dev/null
    exit 1
    ;;
  stop)
    if [ ! -f "$PIDFILE" ]; then echo "no pid file for port $PORT; nothing to stop"; exit 0; fi
    if ours; then
      kill "$(cat "$PIDFILE")" && echo "stopped pid $(cat "$PIDFILE")"
    else
      echo "pid file is stale; not killing anything"
    fi
    rm -f "$PIDFILE"
    ;;
  doctor)
    ours || { echo "FAIL: no live server of ours on port $PORT (run: serve.sh start)" >&2; exit 1; }
    status=$(probe)
    case "$status" in
      "200 First Baptist Church of Capac"*) echo "OK: pid $(cat "$PIDFILE") serves site/ at $URL ($status)" ;;
      *) echo "FAIL: $URL/ answered '$status', expected 200 with the church title" >&2; exit 1 ;;
    esac
    ;;
  *)
    echo "usage: $0 start|stop|doctor   (env VERIFY_PORT, default 8090)" >&2
    exit 2
    ;;
esac
