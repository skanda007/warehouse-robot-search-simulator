"""stdin/stdout bridge to the Python engine.

Reads ``{"op": "...", "payload": ...}`` from stdin and prints
``{"status": <http status>, "body": {...}}``. Used by the Next.js API routes so
the web UI talks to the *same* Python engine as the Flask server (no second
implementation of BFS/DFS/UCS exists anywhere).
"""
from __future__ import annotations

import json
import sys
import traceback

from app.service import dispatch


def main() -> int:
    try:
        request = json.loads(sys.stdin.read() or "{}")
        status, body = dispatch(str(request.get("op", "")), request.get("payload"))
    except json.JSONDecodeError:
        status, body = 400, {"error": {"code": "invalid_json", "message": "Request body is not valid JSON.", "details": []}}
    except Exception:  # never leak stack traces to the client
        traceback.print_exc(file=sys.stderr)
        status, body = 500, {"error": {"code": "internal_error", "message": "Internal engine error.", "details": []}}
    sys.stdout.write(json.dumps({"status": status, "body": body}, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
