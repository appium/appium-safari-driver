---
hide:
  - navigation

title: Getting Started
---

## System Requirements

There are four primary requirements to use the Safari driver:

* macOS host machine (version 10.13 High Sierra or later)
* Appium
* Safari browser (version 11 or later; comes pre-installed on all supported devices)
* `safaridriver` binary accessible on the host machine PATH
    * The binary comes pre-installed on macOS, however, it must be explicitly activated. This is only required once, and can be achieved by opening a terminal, running `safaridriver --enable`, and entering your administrator password.

If targeting Safari on iOS or iPadOS, additional requirements apply - refer to the [Non-macOS guide](../guides/non-macos.md)
for more details.

### Appium Server

Make sure to install a version of Appium that supports your target driver version. The requirements
and prerequisites of Appium itself can be found in [the Appium documentation](https://appium.io/docs/en/latest/quickstart/requirements/).

| Safari driver version | Supported Appium server version |
| --- | --- |
| >= 4.0.0 | Appium 3 |
| 3.0.0 - 3.5.26 | Appium 2 |

## Installation

Provided you have set up the above prerequisites, you can install the driver using Appium's
[extension CLI](https://appium.io/docs/en/latest/cli/extensions/):

```bash
appium driver install safari
```

You can also specify an exact driver version:

```bash
appium driver install safari@3.5.0
```

Alternatively, if you are running a Node.js project, you can include `appium-safari-driver` as
one of your project dependencies. [Refer to the Appium documentation](https://appium.io/docs/en/latest/guides/managing-exts/#do-it-yourself-with-npm)
for more information about this approach.

### Verify the Installation

In order to check that the driver was installed correctly, simply launch the Appium server:

```bash
appium
```

The server log output should include a line like the following:

```
[Appium] SafariDriver has been successfully loaded in 0.789s
```

## Creating a Session

The Safari driver, like all Appium drivers, requires providing [specific capabilities](https://appium.io/docs/en/latest/guides/caps/)
in order to start a new session. The following example lists the minimum required capabilities for
a basic session:

```json
// This will launch Safari on the host machine and attach to it
{
  ...
  "platformName": "mac",
  "appium:automationName": "safari",
  ...
}
```

If testing on an iOS/iPadOS device, different capability values are required - refer to the
[Non-macOS guide](../guides/non-macos.md).

See [the Capabilities reference page](../reference/capabilities.md) for more information on the
capabilities supported by the driver.
