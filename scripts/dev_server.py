#!/usr/bin/env python3
"""Serve the app locally and proxy its API requests to services that block localhost CORS."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from http.cookiejar import CookieJar
from pathlib import Path
from threading import Lock
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPCookieProcessor, Request, build_opener, urlopen
import argparse


ROOT = Path(__file__).resolve().parents[1]
API_URL = "https://api.wikitree.com/api.php"
PHOTON_URL = "https://photon.komoot.io/api/"
API_OPENER = build_opener(HTTPCookieProcessor(CookieJar()))
API_LOCK = Lock()
MAX_REQUEST_BYTES = 2_000_000


class DevServerHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_POST(self):
        if urlsplit(self.path).path != "/api.php":
            self.send_error(404)
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.send_error(400, "Invalid Content-Length")
            return
        if content_length < 0 or content_length > MAX_REQUEST_BYTES:
            self.send_error(413, "Request body too large")
            return

        body = self.rfile.read(content_length)
        request = Request(
            API_URL,
            data=body,
            headers={
                "Content-Type": self.headers.get("Content-Type", "application/x-www-form-urlencoded"),
                "Accept": "application/json",
                "User-Agent": "WikiTreeDynamicTreeLocalDev/1.0",
            },
            method="POST",
        )
        try:
            with API_LOCK:
                with API_OPENER.open(request, timeout=30) as response:
                    self._send_response(response.status, response.headers.get("Content-Type", "application/json"), response.read())
        except HTTPError as error:
            self._send_response(error.code, error.headers.get("Content-Type", "application/json"), error.read())
        except (URLError, TimeoutError) as error:
            self._send_response(502, "text/plain; charset=utf-8", f"WikiTree API proxy failed: {error}".encode())

    def do_GET(self):
        if urlsplit(self.path).path != "/photon/":
            super().do_GET()
            return

        request = Request(
            PHOTON_URL + "?" + urlsplit(self.path).query,
            headers={"Accept": "application/json", "User-Agent": "WikiTreeDynamicTreeLocalDev/1.0"},
        )
        try:
            with urlopen(request, timeout=30) as response:
                self._send_response(response.status, response.headers.get("Content-Type", "application/json"), response.read())
        except HTTPError as error:
            self._send_response(error.code, error.headers.get("Content-Type", "application/json"), error.read())
        except (URLError, TimeoutError) as error:
            self._send_response(502, "text/plain; charset=utf-8", f"Photon proxy failed: {error}".encode())

    def _send_response(self, status, content_type, body):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), DevServerHandler)
    print(f"Serving WikiTree Dynamic Tree at http://127.0.0.1:{args.port}/ (Ctrl-C to stop)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
