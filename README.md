appium-safari-driver
====

This is Appium driver for automating Safari on [Mac OS X](https://developer.apple.com/documentation/webkit/testing_with_webdriver_in_safari?language=objc) and iOS [since version 13](https://webkit.org/blog/9395/webdriver-is-coming-to-safari-in-ios-13/).
The driver only supports Safari automation using [W3C WebDriver protocol](https://www.w3.org/TR/webdriver/).
Under the hood this driver is a wrapper/proxy over Apple's `safaridriver` binary. Check the output of `man safaridriver` command to get more details on the supported features and possible pitfalls.

## Usage

It is mandatory to run the `safaridriver --enable` command from the Mac OS terminal and provide your administrator password before any automated session will be executed.
In order to automate Safari on real devices it is also necessary to enable Remote Automation switch in `Settings → Safari → Advanced → Remote Automation` for these particular devices.

Then you need to decide where the automated test is going to be executed. Safari driver supports the following target platforms:
 - Mac OS (High Sierra or newer)
 - iOS Simulator (iOS version 13 or newer)
 - iOS Real Device (iOS version 13 or newer)

Safari driver allows to define multiple criterions for platform selection and also to fine-tune your automation session properties. This could be done via the following session capabilities:


Capability Name | Description
--- | ---
platformName | safaridriver can only create WebDriver sessions for Safari and can only run on Mac OS. Value of platformName must equal to 'Mac' in order to start Safari driver session. Values of platformName are compared case-insensitively.
automationName | Value of automationName must equal to 'Safari' in order to start Safari driver session. Values of automationName are compared case-insensitively.
browserName | safaridriver can only create WebDriver sessions for Safari. Any value passed to this capability will be changed to 'Safari'.
browserVersion | safaridriver will only create a session using hosts whose Safari version matches the value of browserVersion. Browser version numbers are prefix-matched. For example, if the value of browserVersion is '12', this will allow hosts with a Safari version of '12.0.1' or '12.1'.
appium:targetPlatform | If the value of targetPlatform is 'mac' or 'macOS', safaridriver will only create a session using the macOS host on which safaridriver is running.  If the value of targetPlatform is 'iOS' (the default value), safaridriver will only create a session on a paired iOS device or simulator. Values of targetPlatform are compared case-insensitively
safari:platformVersion | safaridriver will only create a session using hosts whose OS version matches the value of safari:platformVersion. OS version numbers are prefix-matched. For example, if the value of safari:platformVersion is '12',  this will allow hosts with an OS version of '12.0' or '12.1' but not '10.12'.
safari:platformBuildVersion | safaridriver will only create a session using hosts whose OS build version matches the value of safari:platformBuildVersion. example of a macOS build version is '18E193'. On macOS, the OS build version can be determined by running the sw_vers(1) utility.
safari:useSimulator | If the value of safari:useSimulator is true, safaridriver will only use iOS Simulator hosts. If the value of safari:useSimulator is false, safaridriver will not use iOS Simulator hosts. NOTE: An Xcode installation is required in order to run WebDriver tests on iOS Simulator hosts.
safari:deviceType | If the value of safari:deviceType is 'iPhone', safaridriver will only create a session using an iPhone device or iPhone simulator. If the value of safari:deviceType is 'iPad', safaridriver will only create a session using an iPad device or iPad simulator. Values of safari:deviceType are compared case-insensitively.
safari:deviceName | safaridriver will only create a session using hosts whose device name matches the value of safari:deviceName. Device names are compared case-insensitively. NOTE: Device names for connected devices are shown in iTunes. If Xcode is installed, device names for connected devices are available via the output of instruments(1) and in the Devices and Simulators window (accessed in Xcode via "Window > Devices and Simulators").
safari:deviceUDID | safaridriver will only create a session using hosts whose device UDID matches the value of safari:deviceUDID. Device UDIDs are compared case-insensitively. NOTE: If Xcode is installed, UDIDs for connected devices are available via the output of instruments(1) and in the Devices and Simulators window (accessed in Xcode via "Window > Devices and Simulators").
safari:automaticInspection | This capability instructs Safari to preload the Web Inspector and JavaScript debugger in the background prior to returning a newly-created window. To pause the test's execution in JavaScript and bring up Web Inspector's Debugger tab, you can simply evaluate a debugger; statement in the test page.
safari:automaticProfiling | This capability instructs Safari to preload the Web Inspector and start a Timeline recording in the background prior to returning a newly-created window. To view the recording, open the Web Inspector through Safari's Develop menu.
webkit:WebRTC | This capability allows a test to temporarily change Safari's policies for WebRTC and Media Capture. The value of the webkit:WebRTC capability is a dictionary with the following sub-keys, all of which are optional: `DisableInsecureMediaCapture` - Normally, Safari refuses to allow media capture over insecure connections. This restriction is relaxed by default for WebDriver sessions for testing purposes (for example, a test web server not configured for HTTPS).  When this capability is specified, Safari will revert to the normal behavior of preventing media capture over insecure connections. `DisableICECandidateFiltering` - To protect a user's privacy, Safari normally filters out WebRTC ICE candidates that correspond to internal network addresses when capture devices are not in use. This capability suppresses ICE candidate filtering so that both internal and external network addresses are always sent as ICE candidates.


## Example

```python
# python
from selenium.webdriver.common.by import By
from appium import webdriver
import unittest
import time


def setup_module(module):
    common_caps = {
        'platformName': 'Mac',
        'browserName': 'AppiumSafari',
        'automationName': 'Safari',
    }
    real_device_caps = {
        **common_caps,
        'targetPlatform': 'iOS',
        'safari:deviceType': 'iPhone',
        # Do not forget to verify that Remote Automation is enabled for this device
        'safari:deviceUDID': '<MyDeviceUDID>',
        'safari:useSimulator': False,
    }
    simulator_caps = {
        **common_caps,
        'targetPlatform': 'iOS',
        'safari:platformVersion': '14.1'
        'safari:deviceName': 'iPad Air 2',
        'safari:useSimulator': True,
    }
    desktop_browser_caps = {
        **common_caps,
        'targetPlatform': 'Mac',
    }

    WebKitFeatureStatusTest.driver = webdriver.Remote('http://localhost:4723/wd/hub', simulator_caps)


def teardown_module(module):
    WebKitFeatureStatusTest.driver.quit()


class WebKitFeatureStatusTest(unittest.TestCase):

    def test_feature_status_page_search(self):
        self.driver.get("https://webkit.org/status/")

        # Enter "CSS" into the search box.
        # Ensures that at least one result appears in search
        search_box = self.driver.find_element_by_id("search")
        search_box.send_keys("CSS")
        value = search_box.get_attribute("value")
        self.assertTrue(len(value) > 0)
        search_box.submit()
        time.sleep(1)
        # Count the visible results when filters are applied
        # so one result shows up in at most one filter
        feature_count = self.shown_feature_count()
        self.assertTrue(feature_count > 0)

    def test_feature_status_page_filters(self):
        self.driver.get("https://webkit.org/status/")

        time.sleep(1)
        filters = self.driver.execute_script("return document.querySelectorAll('.filter-toggle')")
        self.assertTrue(len(filters) is 7)

        # Make sure every filter is turned off.
        for checked_filter in filter(lambda f: f.is_selected(), filters):
            checked_filter.click()

        # Make sure you can select every filter.
        for filt in filters:
            filt.click()
            self.assertTrue(filt.is_selected())
            filt.click()

    def shown_feature_count(self):
                return len(self.driver.execute_script("return document.querySelectorAll('li.feature:not(.is-hidden)')"))


if __name__ == "__main__":
    unittest.main()
```

## Development

```bash
# clone repo, then in repo dir:
npm install
gulp watch
```
