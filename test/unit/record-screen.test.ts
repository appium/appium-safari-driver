import assert from 'node:assert/strict';
import path from 'node:path';
import {describe, it, mock} from 'node:test';

import {fs, logger, tempDir} from 'appium/support.js';

import {ScreenRecorder} from '../../lib/commands/record-screen.js';
import {SafariDriver} from '../../lib/driver.js';
import {simulatorApi} from '../../lib/simulator.js';

const log = logger.getLogger('ScreenRecorderTest');

describe('ScreenRecorder', () => {
  it('should delete recorded video file on stop(true) even after recording already stopped', async () => {
    const tmpRoot = await tempDir.openDir();
    const videoPath = path.join(tmpRoot, 'recorded.mp4');
    try {
      await fs.writeFile(videoPath, 'video-bytes');
      const recorder = new ScreenRecorder('00000000-0000-0000-0000-000000000000', videoPath, log);
      let stopCalls = 0;
      (recorder as any).sim = {
        startVideoRecording: async () => {},
        stopVideoRecording: async () => {
          stopCalls += 1;
        },
      };

      await recorder.start();
      assert.equal(recorder.isRunning, true);

      // Normal stop (e.g. stopRecordingScreen or timeLimit timeout) keeps the file on disk
      const savedPath = await recorder.stop(false);
      assert.equal(savedPath, videoPath);
      assert.equal(recorder.isRunning, false);
      assert.equal(stopCalls, 1);
      assert.equal(await fs.exists(videoPath), true);

      // Subsequent force stop (e.g. deleteSession or starting a new recording) must clean up the file
      const forcedResult = await recorder.stop(true);
      assert.equal(forcedResult, '');
      assert.equal(stopCalls, 1);
      assert.equal(await fs.exists(videoPath), false);
    } finally {
      await fs.rimraf(tmpRoot);
    }
  });

  it('should not throw and should still delete video file when stop(true) fails natively', async () => {
    const tmpRoot = await tempDir.openDir();
    const videoPath = path.join(tmpRoot, 'failed-stop.mp4');
    try {
      await fs.writeFile(videoPath, 'video-bytes');
      const recorder = new ScreenRecorder('00000000-0000-0000-0000-000000000000', videoPath, log);
      (recorder as any).sim = {
        startVideoRecording: async () => {},
        stopVideoRecording: async () => {
          throw new Error('native stop error');
        },
      };

      await recorder.start();
      assert.equal(recorder.isRunning, true);

      const forcedResult = await recorder.stop(true);
      assert.equal(forcedResult, '');
      assert.equal(recorder.isRunning, false);
      assert.equal(await fs.exists(videoPath), false);
    } finally {
      await fs.rimraf(tmpRoot);
    }
  });

  describe('display selection', () => {
    const displays = [
      {id: 'main-port', displayClass: 0, isMain: true},
      {id: 'external-port', displayClass: 1, isMain: false},
    ];

    async function recordWithDisplay(display?: string, available = displays) {
      const tmpRoot = await tempDir.openDir();
      try {
        const recorder = new ScreenRecorder('00000000-0000-0000-0000-000000000000', path.join(tmpRoot, 'v.mp4'), log, {
          display,
        });
        const start = mock.fn(async (_file: string, _opts: {displayId?: string}) => {});
        const getDisplays = mock.fn(async () => available);
        (recorder as any).sim = {startVideoRecording: start, stopVideoRecording: async () => {}, getDisplays};
        await recorder.start();
        await recorder.stop(true);
        return {displayId: start.mock.calls[0].arguments[1].displayId, listed: getDisplays.mock.callCount() > 0};
      } finally {
        await fs.rimraf(tmpRoot);
      }
    }

    it('should not list displays by default', async () => {
      assert.deepEqual(await recordWithDisplay(), {displayId: undefined, listed: false});
    });

    it('should map internal/external onto display ids', async () => {
      assert.equal((await recordWithDisplay('internal')).displayId, 'main-port');
      assert.equal((await recordWithDisplay('external')).displayId, 'external-port');
    });

    it('should fall back to the first display if there is no match', async () => {
      assert.equal((await recordWithDisplay('external', [displays[0]])).displayId, 'main-port');
    });

    it('should pass an explicit display id through', async () => {
      assert.deepEqual(await recordWithDisplay('some-port'), {displayId: 'some-port', listed: false});
    });
  });

  it('should throw and preserve isRunning when non-force stop(false) fails natively', async () => {
    const tmpRoot = await tempDir.openDir();
    const videoPath = path.join(tmpRoot, 'non-force-fail.mp4');
    try {
      await fs.writeFile(videoPath, 'video-bytes');
      const recorder = new ScreenRecorder('00000000-0000-0000-0000-000000000000', videoPath, log);
      (recorder as any).sim = {
        startVideoRecording: async () => {},
        stopVideoRecording: async () => {
          throw new Error('native stop error');
        },
      };

      await recorder.start();
      assert.equal(recorder.isRunning, true);

      await assert.rejects(() => recorder.stop(false), /Screen recording has failed to stop: native stop error/);
      assert.equal(recorder.isRunning, true);
    } finally {
      await fs.rimraf(tmpRoot);
    }
  });

  it('should call stop(true) via startRecordingScreen on a previously stopped recorder and ignore cleanup errors', async () => {
    const udid = '00000000-0000-0000-0000-000000000000';
    const tmpRoot = await tempDir.openDir();
    const firstVideoPath = path.join(tmpRoot, 'first.mp4');
    const secondVideoPath = path.join(tmpRoot, 'second.mp4');
    try {
      await fs.writeFile(firstVideoPath, 'first');
      await fs.writeFile(secondVideoPath, 'second');

      const fakeSim = {startVideoRecording: async () => {}, stopVideoRecording: async () => {}};
      mock.method(simulatorApi, 'listSimulators', async () => [
        {
          udid,
          name: 'iPhone 16',
          state: 'Booted',
          platform: 'iOS',
          deviceTypeIdentifier: 'com.apple.CoreSimulator.SimDeviceType.iPhone-16',
          runtimeIdentifier: 'com.apple.CoreSimulator.SimRuntime.iOS-18-0',
        } as any,
      ]);
      mock.method(simulatorApi, 'getSimulator', async () => fakeSim as any);

      const driver = new SafariDriver();
      driver.caps = {'safari:deviceUDID': udid} as any;

      const stoppedRecorder = new ScreenRecorder(udid, firstVideoPath, log);
      await stoppedRecorder.start();
      await stoppedRecorder.stop(false);
      assert.equal(stoppedRecorder.isRunning, false);
      driver._screenRecorder = stoppedRecorder;

      await driver.startRecordingScreen();
      assert.equal(await fs.exists(firstVideoPath), false);
      const firstNewRecorder = driver._screenRecorder;
      assert.ok(firstNewRecorder);
      assert.notEqual(firstNewRecorder, stoppedRecorder);
      assert.equal(firstNewRecorder.isRunning, true);
      await firstNewRecorder.stop(true);

      const failingRecorder = new ScreenRecorder(udid, secondVideoPath, log);
      mock.method(failingRecorder, 'stop', async () => {
        throw new Error('EPERM: cannot unlink stale file');
      });
      driver._screenRecorder = failingRecorder;

      await driver.startRecordingScreen();
      assert.ok(driver._screenRecorder);
      assert.notEqual(driver._screenRecorder, failingRecorder);
      assert.equal(driver._screenRecorder.isRunning, true);
      await driver._screenRecorder.stop(true);
    } finally {
      mock.restoreAll();
      await fs.rimraf(tmpRoot);
    }
  });

  it('should refuse to record if several booted Simulators match and none is pinned', async () => {
    const entry = (udid: string) => ({
      udid,
      name: udid,
      state: 'Booted',
      platform: 'iOS',
      deviceTypeIdentifier: 'com.apple.CoreSimulator.SimDeviceType.iPhone-16',
      runtimeIdentifier: 'com.apple.CoreSimulator.SimRuntime.iOS-18-0',
    });
    mock.method(simulatorApi, 'listSimulators', async () => [entry('A'), entry('B')] as any);
    const getSimulator = mock.method(simulatorApi, 'getSimulator', async () => ({}) as any);
    try {
      const driver = new SafariDriver();
      driver.caps = {'safari:useSimulator': true} as any;
      await assert.rejects(driver.startRecordingScreen(), /which of the 2 matching booted Simulators/);
      assert.equal(getSimulator.mock.callCount(), 0);
    } finally {
      mock.restoreAll();
    }
  });

  it('should record the Simulator pinned for the session instead of re-resolving it', async () => {
    const list = mock.method(simulatorApi, 'listSimulators', async () => []);
    const getSimulator = mock.method(
      simulatorApi,
      'getSimulator',
      async () =>
        ({
          startVideoRecording: async () => {},
          stopVideoRecording: async () => {},
        }) as any,
    );
    try {
      const driver = new SafariDriver();
      driver.caps = {'safari:useSimulator': true} as any;
      driver._simulatorUdid = 'B';
      await driver.startRecordingScreen();
      assert.equal(list.mock.callCount(), 0);
      assert.equal(getSimulator.mock.calls[0].arguments[0], 'B');
      await driver._screenRecorder?.stop(true);
    } finally {
      mock.restoreAll();
    }
  });
});
