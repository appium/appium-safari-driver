---
hide:
  - toc

title: Endpoints
---

The Safari driver comes with a set of many available endpoints:

* The driver inherits [all endpoints supported by the Appium base driver](https://appium.io/docs/en/latest/reference/api/)
* The driver does not define any additional endpoints
* The underlying `safaridriver` binary [only supports a subset of the endpoints](https://developer.apple.com/documentation/webkit/macos-webdriver-commands-for-safari-12-and-later) inherited from the Appium base driver

Refer to the documentation of your Appium client for how to call specific endpoints.

!!! warning

    While `safaridriver` _recognizes_ almost all the WebDriver Classic protocol endpoints, many of
    them are only partially implemented or not implemented at all. Refer to the [Web Platform Tests WebDriver Classic test results](https://wpt.fyi/results/webdriver/tests/classic)
    for a comparison of WebDriver Classic implementations between the major browsers.
