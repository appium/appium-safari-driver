---
hide:
  - toc

title: Testing in Parallel
---


Parallel execution of multiple Safari driver instances is **not supported**.

The `safaridriver` binary only supports a single WebDriver session at any time. Attempting to start
a new session while another session is already running will fail with the following error message:
```
Could not create a session: The Safari instance is already paired with another WebDriver session.
```
Consider enabling the Appium server's `--session-override` flag, and always quit sessions explicitly.
