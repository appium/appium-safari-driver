---
hide:
  - toc

title: Endpoints
---

The Safari driver comes with a set of many available endpoints, which are primarily inherited from
the Appium base driver, and can be found in [their Appium docs reference pages](https://appium.io/docs/en/latest/reference/api/).
Refer to the documentation of your Appium client for how to call specific endpoints.

The driver does not define any additional endpoints.

!!! warning

    The underlying `safaridriver` binary [only supports a subset of the endpoints](https://developer.apple.com/documentation/webkit/macos-webdriver-commands-for-safari-12-and-later)
    inherited from the Appium base driver. Furthermore, while the binary _does_ support almost all
    the WebDriver Classic protocol endpoints, for many of them, `safaridriver` implements
    significantly less functionality than Chrome's `chromedriver` or Firefox's `geckodriver`. This
    is important to know if you have already existing tests for Chrome/Edge/Firefox, and wish to
    reuse them for Safari.
    
    Refer to the [Web Platform Tests WebDriver Classic test results](https://wpt.fyi/results/webdriver/tests/classic)
    for a comparison of WebDriver Classic implementations between the major browsers.
