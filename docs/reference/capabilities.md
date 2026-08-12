---
title: Capabilities
---

This page lists various capabilities used and implemented by the Safari driver. To learn more
about capabilities, refer to the [Appium documentation](https://appium.io/docs/en/latest/guides/caps/).

For other capabilities recognized by the Appium server, see
[their Appium docs reference page](https://appium.io/docs/en/latest/reference/session/caps/).

## Standard

Refer to [the W3C WebDriver documentation](https://w3c.github.io/webdriver/#capabilities)
for more information about these capabilities.

### platformName

| Name | Type | Default |
| -- | -- | -- |
| `platformName` | `string` | Not specified |

This capability must be set to `mac` or `ios` (case-insensitive)

### browserName

| Name | Type | Default |
| -- | -- | -- |
| `browserName` | `string` | `Safari` |

This capability is always automatically set to `Safari`, so it has no effect.

### browserVersion

| Name | Type | Default |
| -- | -- | -- |
| `browserVersion` | `string` | Not specified |

Only allow sessions on devices that have this version of Safari. Numbers are prefix-matched - for
example, a value of '12' will allow hosts with a Safari version of '12.0.1' or '12.1'.

### acceptInsecureCerts

| Name | Type | Default |
| -- | -- | -- |
| `acceptInsecureCerts` | `boolean` | `false` |

This capability requires Safari 15.4 or later (originally added in [Safari Technology Preview 135](https://webkit.org/blog/12040/release-notes-for-safari-technology-preview-135/)).

## General

### automationName

| Name | Type | Default |
| -- | -- | -- |
| `appium:automationName` | `string` | Not specified |

Specifies the Appium driver to use. Must be set to `Safari` (case-insensitive)

## Safari

### platformVersion

| Name | Type | Default |
| -- | -- | -- |
| `safari:platformVersion` | `string` | Not specified |

Only allow sessions on devices that have this OS version. Numbers are prefix-matched - for example,
a value of '12' will allow hosts with an OS version of '12.0.1' or '12.1'.

### platformBuildVersion

| Name | Type | Default |
| -- | -- | -- |
| `safari:platformBuildVersion` | `string` | Not specified |

Only allow sessions on devices that have this OS build version, for example '18E193'. On macOS, the
OS build version can be determined by running the `sw_vers(1)` utility.

### useSimulator

| Name | Type | Default |
| -- | -- | -- |
| `safari:useSimulator` | `boolean` | `false` |

Whether to run tests on an iOS/iPadOS simulator device. Note that simulators require Xcode to be
installed.

### deviceType

| Name | Type | Default |
| -- | -- | -- |
| `safari:deviceType` | `string` | Not specified |

Only allow sessions on devices that match this device type. Supported values are `iPhone` and
`iPad` (case-insensitive).

### deviceName

| Name | Type | Default |
| -- | -- | -- |
| `safari:deviceName` | `string` | Not specified |

Only allow sessions on devices with this device name (case-insensitive)

### deviceUDID

| Name | Type | Default |
| -- | -- | -- |
| `safari:deviceUDID` | `string` | Not specified |

Only allow sessions on devices with this device UDID (case-insensitive)

### automaticInspection

| Name | Type | Default |
| -- | -- | -- |
| `safari:automaticInspection` | `boolean` | `false` |

Whether to preload the Web Inspector and JavaScript debugger in the background. If set to `true`,
when evaluating a `debugger;` statement in the test page, test execution will be paused, and the
Web Inspector's Debugger tab will open.

### automaticProfiling

| Name | Type | Default |
| -- | -- | -- |
| `safari:automaticProfiling` | `boolean` | `false` |

Whether to preload the Web Inspector and start a timeline recording in the background. If set to
`true`, the Timelines tab in Web Inspector will show the captured timeline recording in its entirety.

### diagnose

| Name | Type | Default |
| -- | -- | -- |
| `safari:diagnose` | `boolean` | `true` |

Whether to enable `safaridriver` diagnostics for this session. Diagnostic files are saved to
`~/Library/Logs/com.apple.WebDriver`.

The Safari driver enables diagnostics for all sessions, so this capability has no effect.

## WebKit

### webRTC

| Name | Type | Default |
| -- | -- | -- |
| `webkit:WebRTC` | `Record<string, boolean>` | Not specified |

Change Safari's policies for WebRTC and Media Capture. This capability is a dictionary with the
following optional sub-keys:

* `DisableInsecureMediaCapture` - whether to prevent media capture over insecure connections, which
  is allowed by default in WebDriver sessions
* `DisableICECandidateFiltering` - whether to skip filtering of WebRTC ICE candidates, which by
  default filters out candidates that correspond to internal network addresses

### alwaysAllowAutoplay

| Name | Type | Default |
| -- | -- | -- |
| `webkit:alwaysAllowAutoplay` | `boolean` | `false` |

Whether to always allow autoplay of all media elements without user interaction, overriding any
per-website settings.

This capability requires Safari 18.6 or later (originally added in [Safari Technology Preview 222](https://webkit.org/blog/17216/release-notes-for-safari-technology-preview-222/)).

### siteIsolationEnabled

| Name | Type | Default |
| -- | -- | -- |
| `webkit:siteIsolationEnabled` | `boolean` | `false` |

Whether to enable site isolation.

This capability requires Safari 26.0 or later (originally added in [Safari Technology Preview 225](https://webkit.org/blog/17216/release-notes-for-safari-technology-preview-225/)).
