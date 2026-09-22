import {NativeSimctl, SimDeviceState} from '@appium/coresim';
import type {VideoRecordingOptions} from '@appium/coresim';
import type {AppiumLogger, StringRecord} from '@appium/types';
import {util, fs, net, tempDir} from 'appium/support.js';

import type {SafariDriver} from '../driver.js';

const DEFAULT_TIME_LIMIT_MS = 60 * 10 * 1000; // 10 minutes
const DEFAULT_EXT = '.mp4';

interface UploadOptions {
  user?: string;
  pass?: string;
  method?: string;
  headers?: Record<string, string>;
  fileFieldName?: string;
  formFields?: Record<string, string> | Array<[string, string]>;
}

async function uploadRecordedMedia(
  localFile: string,
  remotePath: string | null = null,
  uploadOptions: UploadOptions = {},
): Promise<string> {
  if (!remotePath) {
    return (await util.toInMemoryBase64(localFile)).toString();
  }

  const {user, pass, method, headers, fileFieldName, formFields} = uploadOptions;
  const options: any = {
    method: method || 'PUT',
    headers,
    fileFieldName,
    formFields,
  };
  if (user && pass) {
    options.auth = {user, pass};
  }
  await net.uploadFile(localFile, remotePath, options);
  return '';
}

const VIDEO_FILES = new Set<string>();
process.on('exit', () => {
  for (const videoFile of VIDEO_FILES) {
    try {
      fs.rimrafSync(videoFile);
    } catch {}
  }
});

export interface StartRecordingOptions {
  /** Specifies the codec type: "h264" or "hevc" */
  codec?: string;
  /** Supports "internal" or "external". Default is "internal" */
  display?: string;
  /** For non-rectangular displays, handle the mask by policy:
   * - ignored: The mask is ignored and the unmasked framebuffer is saved.
   * - alpha: Not supported, but retained for compatibility; the mask is rendered black.
   * - black: The mask is rendered black.
   */
  mask?: string;
  /** The maximum recording time, in seconds. The default value is 600 seconds (10 minutes). */
  timeLimit?: string | number;
  /** Whether to ignore the call if a screen recording is currently running
   * (`false`) or to start a new recording immediately and terminate the existing one if running (`true`).
   */
  forceRestart?: boolean;
}

export interface StopRecordingOptions {
  /** The path to the remote location, where the resulting video should be uploaded.
   * The following protocols are supported: http/https, ftp.
   * Null or empty string value (the default setting) means the content of resulting
   * file should be encoded as Base64 and passed as the endpoint response value.
   * An exception will be thrown if the generated media file is too big to
   * fit into the available process memory.
   */
  remotePath?: string;
  /** The name of the user for the remote authentication. */
  user?: string;
  /** The password for the remote authentication. */
  pass?: string;
  /** The http multipart upload method name. The 'PUT' one is used by default. */
  method?: string;
  /** Additional headers mapping for multipart http(s) uploads */
  headers?: Record<string, string>;
  /** The name of the form field, where the file content BLOB should be stored for http(s) uploads */
  fileFieldName?: string;
  /** Additional form fields for multipart http(s) uploads */
  formFields?: Record<string, string> | Array<[string, string]>;
}

interface ScreenRecorderOptions {
  codec?: string;
  display?: string;
  mask?: string;
  timeLimit?: string | number;
}

export class ScreenRecorder {
  private log: AppiumLogger;
  private simctl: NativeSimctl;
  private _udid: string;
  private _videoPath: string;
  private _codec?: string;
  private _display?: string;
  private _mask?: string;
  private _timeLimitMs: number = DEFAULT_TIME_LIMIT_MS;
  private _timer: NodeJS.Timeout | null = null;
  private _isRunning = false;

  constructor(udid: string, videoPath: string, log: AppiumLogger, opts: ScreenRecorderOptions = {}) {
    this.log = log;
    this.simctl = new NativeSimctl();
    this._udid = udid;
    this._videoPath = videoPath;
    this._codec = opts.codec;
    this._display = opts.display;
    this._mask = opts.mask;
    if (opts.timeLimit) {
      const timeLimitMs = parseInt(String(opts.timeLimit), 10);
      if (timeLimitMs > 0) {
        this._timeLimitMs = timeLimitMs * 1000;
      }
    }
  }

  get isRunning(): boolean {
    return this._isRunning;
  }

  async getVideoPath(): Promise<string> {
    if (await fs.exists(this._videoPath)) {
      VIDEO_FILES.add(this._videoPath);
      return this._videoPath;
    }
    return '';
  }

  /** Maps the legacy 'internal'/'external' display capability onto a coresim display id. */
  private async _resolveDisplayId(): Promise<string | undefined> {
    if (!this._display) {
      return undefined;
    }
    const displays = await this.simctl.getDisplays(this._udid);
    const wantsMain = this._display === 'internal';
    return (displays.find((d) => d.isMain === wantsMain) ?? displays[0])?.id;
  }

  async start(): Promise<void> {
    const options: VideoRecordingOptions = {
      displayId: await this._resolveDisplayId(),
      codec: this._codec as VideoRecordingOptions['codec'],
      mask: this._mask as VideoRecordingOptions['mask'],
    };
    this.log.debug(`Starting video recording with options: ${JSON.stringify(options)}`);
    try {
      await this.simctl.startVideoRecording(this._udid, this._videoPath, options);
    } catch (e: any) {
      throw this.log.errorWithException(`Failed to start the screen recording: ${e.message}`);
    }
    this._isRunning = true;
    this._timer = setTimeout(async () => {
      if (this.isRunning) {
        try {
          await this.stop();
        } catch (e: any) {
          this.log.error(e);
        }
      }
    }, this._timeLimitMs);
    this.log.info(`The video recording has started. Will timeout in ${this._timeLimitMs}ms`);
  }

  async stop(force: boolean = false): Promise<string> {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }

    if (!this.isRunning) {
      this.log.debug('Screen recording is not running. Returning the recently recorded video');
      return await this.getVideoPath();
    }

    try {
      await this.simctl.stopVideoRecording(this._udid);
    } catch (e: any) {
      this._isRunning = false;
      if (force) {
        this.log.warn(`Failed to gracefully stop the screen recording: ${e.message}`);
        return '';
      }
      throw new Error(`Screen recording has failed to stop: ${e.message}`, {cause: e});
    }
    this._isRunning = false;

    if (force) {
      // A new recording is about to replace this one - discard what was captured so far.
      const videoPath = await this.getVideoPath();
      if (videoPath) {
        await fs.rimraf(videoPath);
        VIDEO_FILES.delete(videoPath);
      }
      return '';
    }

    return await this.getVideoPath();
  }
}

/**
 * Record the Simulator's display in background while the automated test is running.
 * This method uses `@appium/coresim`'s native video recording under the hood.
 *
 * @param options - The available options.
 * @throws {Error} If screen recording has failed to start or is not supported for the destination device.
 */
export async function startRecordingScreen(this: SafariDriver, options?: StartRecordingOptions): Promise<void> {
  const {timeLimit, codec, display, mask, forceRestart = true} = options ?? {};
  if (this._screenRecorder?.isRunning) {
    this.log.info('The screen recording is already running');
    if (!forceRestart) {
      this.log.info('Doing nothing');
      return;
    }
    this.log.info('Forcing the active screen recording to stop');
    await this._screenRecorder.stop(true);
  }
  this._screenRecorder = null;

  const udid = await extractSimulatorUdid(this.caps);
  if (!udid) {
    throw new Error('Cannot determine Simulator UDID to record the video from. Double check your session capabilities');
  }

  const videoPath = await tempDir.path({
    prefix: util.uuidV4().substring(0, 8),
    suffix: DEFAULT_EXT,
  });
  this._screenRecorder = new ScreenRecorder(udid, videoPath, this.log, {
    timeLimit: parseInt(`${timeLimit}`, 10),
    codec,
    display,
    mask,
  });
  try {
    await this._screenRecorder.start();
  } catch (e) {
    this._screenRecorder = null;
    throw e;
  }
}

/**
 * Stop recording the screen.
 * If no screen recording has been started before then the method returns an empty string.
 *
 * @param options - The available options.
 * @returns Base64-encoded content of the recorded media file if 'remotePath'
 * parameter is falsy or an empty string.
 * @throws {Error} If there was an error while getting the name of a media file
 * or the file content cannot be uploaded to the remote location
 * or screen recording is not supported on the device under test.
 */
export async function stopRecordingScreen(this: SafariDriver, options?: StopRecordingOptions): Promise<string> {
  if (!this._screenRecorder) {
    this.log.info('No screen recording has been started. Doing nothing');
    return '';
  }

  this.log.debug('Retrieving the resulting video data');
  const videoPath = await this._screenRecorder.stop();
  if (!videoPath) {
    this.log.info('No video data is found. Returning an empty string');
    return '';
  }
  if (!options?.remotePath) {
    const {size} = await fs.stat(videoPath);
    this.log.debug(`The size of the resulting screen recording is ${util.toReadableSizeString(size)}`);
  }
  return await uploadRecordedMedia(videoPath, options?.remotePath ?? null, options ?? {});
}

/** Parses `com.apple.CoreSimulator.SimRuntime.iOS-17-4` into `{platform: 'iOS', version: '17.4'}`. */
function parseRuntimeIdentifier(runtimeIdentifier: string): {platform: string; version: string} | null {
  const match = /\.SimRuntime\.([A-Za-z]+)-([\d-]+)$/.exec(runtimeIdentifier);
  return match ? {platform: match[1], version: match[2].replace(/-/g, '.')} : null;
}

async function extractSimulatorUdid(caps: StringRecord): Promise<string | null> {
  if (caps['safari:useSimulator'] === false) {
    return null;
  }

  const allDevices = await new NativeSimctl().getDevices();
  for (const {name, udid, state, runtimeIdentifier} of allDevices) {
    if (state !== SimDeviceState.Booted) {
      continue;
    }
    const runtimeInfo = parseRuntimeIdentifier(runtimeIdentifier);
    if (runtimeInfo?.platform !== 'iOS') {
      continue;
    }

    if (caps['safari:deviceUDID']?.toLowerCase() === udid.toLowerCase()) {
      return udid;
    }
    if (
      caps['safari:deviceName']?.toLowerCase() === name.toLowerCase() &&
      ((caps['safari:platformVersion'] && caps['safari:platformVersion'] === runtimeInfo.version) ||
        !caps['safari:platformVersion'])
    ) {
      return udid;
    }
  }

  return null;
}
