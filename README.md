appium-safari-driver
====

This is an experimental Appium driver for automating Safari on Mac OS X. It is not designed for production use. It was built as part of a live demo for [Drivers of Change: Appium's Hidden Engines](https://www.youtube.com/watch?v=EhZuuZ1uEZk&list=PL67l1VPxOnT5UMXMojduH_cMuBmlYl90K&index=13&t=0s) ([@jlipps](https://github.com/jlipps)'s SauceCon 2018 talk).

## Setup

```bash
# clone repo, then in repo dir:
npm install
gulp transpile
```

## Running

Run `node .` in the repo dir to start a SafariDriver Appium server.

## Plans

At this point there are no plans to incorporate this driver as a supported driver in the main Appium project, though if there is enough interest we can easily do so.
