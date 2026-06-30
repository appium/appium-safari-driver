---
title: Capabilities
---

This page lists various capabilities used and implemented by the Safari driver. To learn more
about capabilities, refer to the [Appium documentation](https://appium.io/docs/en/latest/guides/caps/).

For other capabilities recognized by the Appium server, see
[their Appium docs reference page](https://appium.io/docs/en/latest/reference/session/caps/).

## Standard

| <div style="width:11em">Capability</div> | Description |
| --- | --- |
| `platformName` | Must be set to `mac` or `ios` (case-insensitive) |
| `browserName` |	Any value passed to this capability will be changed to `safari` |
| `browserVersion` | Only allow sessions on devices that have this version of Safari. Numbers are prefix-matched - for example, a value of '12' will allow hosts with a Safari version of '12.0.1' or '12.1'. |
| `acceptInsecureCerts` | [Refer to the W3C Webdriver documentation](https://www.w3.org/TR/webdriver/#capabilities). Requires Safari 15.4 or later. [^acceptinsecurecerts] |

## Appium-Specific

| Capability | Description |
| --- | --- |
| `appium:automationName` | Must be set to `Safari` (case-insensitive) |

## Safari-Specific

| <div style="width:15em">Capability</div> | Description |
| --- | --- |
| `safari:platformVersion` | Only allow sessions on devices that have this OS version. Numbers are prefix-matched - for example, a value of '12' will allow hosts with an OS version of '12.0.1' or '12.1'. |
| `safari:platformBuildVersion` | Only allow sessions on devices that have this OS build version, for example '18E193'. On macOS, the OS build version can be determined by running the `sw_vers(1)` utility. |
| `safari:useSimulator` | Whether to run tests on an iOS/iPadOS simulator device. Note that simulators require Xcode to be installed. Set to `false` by default. |
| `safari:deviceType` | Only allow sessions on devices that match this device type. Supported values are `iPhone` and `iPad` (case-insensitive). |
| `safari:deviceName` | Only allow sessions on devices with this device name (case-insensitive). |
| `safari:deviceUDID` | Only allow sessions on devices with this device UDID (case-insensitive). |
| `safari:automaticInspection` | Whether to preload the Web Inspector and JavaScript debugger in the background. If set to `true`, when evaluating a `debugger;` statement in the test page, test execution will be paused, and the Web Inspector's Debugger tab will open. |
| `safari:automaticProfiling` | Whether to preload the Web Inspector and start a timeline recording in the background. If set to `true`, the Timelines tab in Web Inspector will show the captured timeline recording in its entirety. |
| `safari:diagnose` | Whether to enable `safaridriver` diagnostics for this session. Diagnostic files are saved to `~/Library/Logs/com.apple.WebDriver`. The Safari driver enables diagnostics for all sessions, so this capability has no effect. |

## WebKit-Specific

| <div style="width:15em">Capability</div> | Description |
| --- | --- |
| `webkit:WebRTC` | Change Safari's policies for WebRTC and Media Capture. This capability is a dictionary with following optional sub-keys: `DisableInsecureMediaCapture` (whether to prevent media capture over insecure connections, which is allowed by default in WebDriver sessions), and  `DisableICECandidateFiltering` (whether to skip filtering of WebRTC ICE candidates, which by default filters out candidates that correspond to internal network addresses). |
| `webkit:alwaysAllowAutoplay` | Whether to always allow autoplay of all media elements without user interaction, overriding any per-website settings. Requires Safari 18.6 or later. [^alwaysallowautoplay] |
| `webkit:siteIsolationEnabled` | Whether to enable site isolation. Requires Safari 26.0 or later. [^siteisolationenabled]|

[^acceptinsecurecerts]: Added in [Safari Technology Preview 135](https://webkit.org/blog/12040/release-notes-for-safari-technology-preview-135/), whose features were [included in Safari 15.4](https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/#and-more)
[^alwaysallowautoplay]: Added in [Safari Technology Preview 222](https://webkit.org/blog/17216/release-notes-for-safari-technology-preview-222/), whose features were included in Safari 18.6
[^siteisolationenabled]: Added in [Safari Technology Preview 225](https://webkit.org/blog/17216/release-notes-for-safari-technology-preview-225/), whose features were included in Safari 26.0
