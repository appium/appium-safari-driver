---
hide:
  - navigation
  - toc

title: Overview
---

The Safari driver is an Appium driver intended for black-box automated testing of the Safari web
browser.

## Target Platforms

The driver supports the following platforms as automation targets:

|Platform|Simulators|Real devices|
|--|--|--|
|Safari (macOS)|N/A|:white_check_mark:|
|Safari (iOS)|:white_check_mark: [^safari-non-macos]|:white_check_mark: [^safari-non-macos]|
|Safari (iPadOS)|:white_check_mark: [^safari-non-macos]|:white_check_mark: [^safari-non-macos]|
|Safari (visionOS)|:x:|:x:|

## Technologies Used

The Safari driver uses the [W3C WebDriver protocol](https://www.w3.org/TR/webdriver/) for session
management. Under the hood, the driver is a wrapper/proxy over Apple's `safaridriver` binary. Learn
more about its features in [the official documentation](https://developer.apple.com/documentation/webkit/about-webdriver-for-safari).

On a macOS host, you can also run `man safaridriver` for more information.

!!! warning

    While `safaridriver` _recognizes_ almost all the WebDriver Classic protocol commands, many of
    them are only partially implemented or not implemented at all. Refer to the [Web Platform Tests WebDriver Classic test results](https://wpt.fyi/results/webdriver/tests/classic)
    for a comparison between the major browsers.

[^safari-non-macos]: Refer to the [Non-macOS guide](./guides/non-macos.md) for more details
