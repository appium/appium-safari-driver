import assert from 'node:assert/strict';
import path from 'node:path';
import {describe, it} from 'node:test';

import {fs, logger, tempDir} from 'appium/support.js';

import {ScreenRecorder} from '../../lib/commands/record-screen.js';

const log = logger.getLogger('ScreenRecorderTest');

describe('ScreenRecorder', () => {
  it('should delete recorded video file on stop(true) even after recording already stopped', async () => {
    const tmpRoot = await tempDir.openDir();
    const videoPath = path.join(tmpRoot, 'recorded.mp4');
    try {
      await fs.writeFile(videoPath, 'video-bytes');
      const recorder = new ScreenRecorder('00000000-0000-0000-0000-000000000000', videoPath, log);
      let stopCalls = 0;
      (recorder as any).simctl = {
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
});
