---
hide:
  - toc

title: BiDi Events
---

The Safari driver **does not** support the [WebDriver BiDi Protocol](https://w3c.github.io/webdriver-bidi/):

* The driver inherits [all BiDi endpoints supported by the Appium base driver](https://appium.io/docs/en/latest/reference/api/bidi/)
* The driver does not define any additional endpoints
* The underlying `safaridriver` binary does not support the WebDriver BiDi protocol at all [^wpt]

[^wpt]: Refer to the [Web Platform Tests WebDriver BiDi test results](https://wpt.fyi/results/webdriver/tests/bidi)
for a comparison of BiDi implementations between the major browsers
