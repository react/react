#!/usr/bin/env python3
"""Native messaging host for React DevTools AI chat: reads ~/.codex/auth.json.

Chrome spawns this on demand (chrome.runtime.sendNativeMessage), sends one
framed request, and reads one framed response. Only the extension IDs listed
in the host manifest's allowed_origins can invoke it, and it does nothing but
read this single well-known file.
"""

import json
import os
import struct
import sys


def read_request():
    raw_length = sys.stdin.buffer.read(4)
    if len(raw_length) < 4:
        sys.exit(0)
    (length,) = struct.unpack("<I", raw_length)
    return json.loads(sys.stdin.buffer.read(length))


def send_response(payload):
    data = json.dumps(payload).encode("utf-8")
    sys.stdout.buffer.write(struct.pack("<I", len(data)))
    sys.stdout.buffer.write(data)
    sys.stdout.buffer.flush()


def main():
    read_request()  # One-shot protocol; the request carries no parameters.
    path = os.path.expanduser("~/.codex/auth.json")
    try:
        with open(path, "r", encoding="utf-8") as f:
            send_response({"ok": True, "content": f.read()})
    except FileNotFoundError:
        send_response(
            {
                "ok": False,
                "error": "~/.codex/auth.json not found. Run `codex login` "
                "in a terminal first.",
            }
        )
    except Exception as error:  # noqa: BLE001 - report anything else as-is.
        send_response({"ok": False, "error": str(error)})


if __name__ == "__main__":
    main()
