#!/usr/bin/env python3
"""Check every link in the page: local files, in-page anchors, and external URLs.

Run locally with:  python3 .github/check_links.py index.html
Exits non-zero if a link is broken. Sites that block automated requests are
reported as warnings rather than failures, so a hostile bot filter on someone
else's server cannot fail this repository's CI.
"""

import sys
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urldefrag, urljoin, urlparse

TIMEOUT = 25
# Some servers answer differently depending on who seems to be asking.
USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0 Safari/537.36 link-check/1.0"
)
# Reachable, but deliberately unfriendly to non-browsers.
BLOCKED_CODES = {400, 401, 403, 405, 406, 429, 999}


class LinkCollector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []   # (attribute value, tag)
        self.ids = set()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.add(attrs["id"])
        # Resource hints name an origin to warm up, not a page to fetch.
        rel = set((attrs.get("rel") or "").lower().split())
        if tag == "link" and rel & {"preconnect", "dns-prefetch"}:
            return
        for key in ("href", "src"):
            if attrs.get(key):
                self.links.append((attrs[key], tag))


def check_remote(url):
    """Return (ok, note). ok=False only for links that are genuinely broken."""
    for method in ("HEAD", "GET"):
        request = urllib.request.Request(
            url, method=method, headers={"User-Agent": USER_AGENT}
        )
        try:
            with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
                return True, "%s %s" % (response.status, method.lower())
        except urllib.error.HTTPError as error:
            # A redirect we cannot follow (cookie-gated bounce, redirect loop)
            # still means the server is there and pointing somewhere; browsers
            # resolve these. Only report it so it can be eyeballed.
            if 300 <= error.code < 400:
                return True, "%s redirect, not followed" % error.code
            if error.code in BLOCKED_CODES:
                if method == "GET":
                    return True, "%s (blocks automated requests)" % error.code
                continue
            if method == "GET":
                return False, "HTTP %s" % error.code
        except urllib.error.URLError as error:
            if method == "GET":
                return False, str(error.reason)
        except Exception as error:                      # noqa: BLE001
            if method == "GET":
                return False, "%s: %s" % (type(error).__name__, error)
    return False, "unreachable"


def main(argv):
    page = Path(argv[1] if len(argv) > 1 else "index.html")
    collector = LinkCollector()
    collector.feed(page.read_text(encoding="utf-8"))

    local, anchors, remote = [], [], []
    for value, tag in collector.links:
        if value.startswith("#"):
            anchors.append(value)
        elif urlparse(value).scheme in ("http", "https"):
            remote.append(value)
        elif urlparse(value).scheme in ("mailto", "tel", "data", "javascript"):
            continue
        else:
            local.append(value)

    failures = []

    for anchor in sorted(set(anchors)):
        name = anchor[1:]
        status = "ok" if name in collector.ids else "no element with this id"
        print("%-7s anchor  %s  (%s)" % ("OK" if name in collector.ids else "BROKEN", anchor, status))
        if name not in collector.ids:
            failures.append(anchor)

    for href in sorted(set(local)):
        target = page.parent / urldefrag(urljoin(page.name, href))[0]
        exists = target.is_file()
        print("%-7s file    %s" % ("OK" if exists else "BROKEN", href))
        if not exists:
            failures.append(href)

    urls = sorted(set(remote))
    with ThreadPoolExecutor(max_workers=8) as pool:
        for url, (ok, note) in zip(urls, pool.map(check_remote, urls)):
            print("%-7s url     %s  (%s)" % ("OK" if ok else "BROKEN", url, note))
            if not ok:
                failures.append(url)

    print("\n%d links checked, %d broken." % (
        len(set(anchors)) + len(set(local)) + len(urls), len(failures)))
    if failures:
        print("\nBroken:")
        for item in failures:
            print("  " + item)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
