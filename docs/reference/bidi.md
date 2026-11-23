---
hide:
  - toc

title: BiDi Commands and Events
---

The Safari driver **does not** support the [WebDriver BiDi Protocol](https://w3c.github.io/webdriver-bidi/).

While the driver _does_ inherit [all BiDi commands and events supported by the Appium base driver](https://appium.io/docs/en/latest/reference/api/bidi/),
Safari itself only has experimental support for the BiDi protocol: it requires using the browser's
pre-release version (Safari Technology Preview), along with the `safari:experimentalWebSocketUrl`
capability. The Safari driver currently only supports stable Safari.

Refer to the [Web Platform Tests WebDriver BiDi test results](https://wpt.fyi/results/webdriver/tests/bidi)
for a comparison of BiDi implementations between the major browsers.
