# Vendored third-party assets

Served from this application rather than a CDN. A clinical safety tool should not
depend on a third-party host being reachable to render its own pages, and
vendoring removes a supply-chain path that a CDN compromise would open.

Replace a file by downloading the release, verifying it, and updating the table
and the reference in `app/templates/base.html` together.

| File                 | Version | Source                                                             | Verification                                                                                                                                                                                                                                 |
| -------------------- | ------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `htmx-2.0.11.min.js` | 2.0.11  | [htmx.org on npm](https://www.npmjs.com/package/htmx.org/v/2.0.11) | npm tarball `sha512-Thx/WtpeOQqSrqBCw/A1cwGJGg4UrVa3+sW0GmrM3p4gJgO89ecH4qtbnyzDDWFvBTqjnIMCgELTNt636dtamA==` checked on download; extracted `dist/htmx.min.js` is `sha384-2OatzQy1H+Zd/IIrjr1TcuDGqLXeHhbooAyJY1KdQMKnr4LZ22k31GBLdYKHmVjg` |

## Why htmx 2, not 4

htmx 4.0.0 exists and the GitHub "latest release" API returns it, but npm
publishes it under the `next` dist-tag while `latest` remains 2.0.11 - and
2.0.11 was published _after_ 4.0.0. The maintainers are signalling that 2.x is
the production line. Revisit when `latest` moves to 4.
