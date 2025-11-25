import type { SafariDriver } from './driver';
import type { MethodMap } from '@appium/types';

export const newMethodMap = {
  '/session/:sessionId/appium/start_recording_screen': {
    POST: {
      command: 'startRecordingScreen',
      payloadParams: { optional: ['options'] }
    }
  },
  '/session/:sessionId/appium/stop_recording_screen': {
    POST: {
      command: 'stopRecordingScreen',
      payloadParams: { optional: ['options'] }
    }
  },
} as const satisfies MethodMap<SafariDriver>;

