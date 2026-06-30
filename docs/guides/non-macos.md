---
hide:
  - toc

title: Non-macOS Devices
---

The Safari driver supports automating Safari on iOS and iPadOS, on both simulators and real devices.

In addition to [the standard driver configuration](../getting-started/index.md#system-requirements),
iOS/iPadOS tests have further requirements:

* iOS/iPadOS must be at [version 13 or later](https://webkit.org/blog/9395/webdriver-is-coming-to-safari-in-ios-13/)
* The `platformName` capability must be set to `iOS`
* If testing on simulators, Xcode and the iOS Simulator runtime must be installed
* If testing on real devices, automation-related settings must be enabled on each device:

    > _Settings_ -> _Apps_ -> _Safari_ -> _Advanced_ -> Turn _Web Inspector_ ON

    > _Settings_ -> _Apps_ -> _Safari_ -> _Advanced_ -> Turn _Remote Automation_ ON

Unlike [the XCUITest driver](https://appium.github.io/appium-xcuitest-driver/), the
WebDriverAgentRunner application and all of its related configuration are not required.

A simple capability set for a new iOS/iPadOS session can then look as follows:

```json
// This will launch Safari on the first connected real iOS device
{
  "platformName": "ios",
  "appium:automationName": "safari"
}
```

It is recommended to use [Safari-specific capabilities](../reference/capabilities.md#safari-specific) such as
`safari:useSimulator`, `safari:deviceName`, `safari:deviceUDID` and others to specify the exact
test device:

```json
// This will launch Safari on the simulator named 'iPhone 17'
{
  "platformName": "ios",
  "appium:automationName": "safari",
  "safari:useSimulator": true,
  "safari:deviceName": "iPhone 17"
}
```
