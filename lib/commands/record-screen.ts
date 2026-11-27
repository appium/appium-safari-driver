import type {AppiumLogger} from '@appium/types';
import type {Simulator, VideoRecordingOptions} from 'appium-ios-simulator';
import {util, fs, net, tempDir} from 'appium/support.js';

import type {SafariDriver} from '../driver.js';
import {findSimulators, simulatorApi} from '../simulator.js';

declare module '../driver.js' {
  interface SafariDriver {
    startRecordingScreen(...args: Parameters<typeof startRecordingScreen>): ReturnType<typeof startRecordingScreen>;
    stopRecordingScreen(...args: Parameters<typeof stopRecordingScreen>): ReturnType<typeof stopRecordingScreen>;
  }
}

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
  /** "internal", "external" or an explicit display id (e.g. a port UUID). The primary display is recorded by default.
   * "internal" cannot tell the panels of multi-display devices (such as iPhone Duo) apart, so use a display id there.
   */
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
  private sim: Simulator | null = null;
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

  private async getSim(): Promise<Simulator> {
    this.sim ??= await simulatorApi.getSimulator(this._udid, {logger: this.log});
    return this.sim;
  }

  /** Maps the 'internal'/'external' display option onto a display id; any other value is a display id itself. */
  private async _resolveDisplayId(): Promise<string | undefined> {
    if (!this._display || (this._display !== 'internal' && this._display !== 'external')) {
      return this._display;
    }
    const displays = await (await this.getSim()).getDisplays();
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
      await (await this.getSim()).startVideoRecording(this._videoPath, options);
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

    if (this.isRunning) {
      try {
        // On force, the simulator library releases its recording state even if native stop fails; otherwise preserve `_isRunning`.
        await (await this.getSim()).stopVideoRecording({force});
      } catch (e: any) {
        if (!force) {
          throw new Error(`Screen recording has failed to stop: ${e.message}`, {cause: e});
        }
        this.log.warn(`Screen recording has failed to stop: ${e.message}`);
      }
      this._isRunning = false;
    } else if (!force) {
      this.log.debug('Screen recording is not running. Returning the recently recorded video');
      return await this.getVideoPath();
    }

    if (force) {
      // Discard partial capture when replacing or tearing down.
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
 * Record the Simulator's display in background via `@appium/coresim`.
 * Requires Xcode's private Simulator capture API (confirmed absent on Xcode 16.4, present on 26.5+).
 *
 * @param options - The available options.
 * @throws {Error} If screen recording fails to start or the capture API is unavailable.
 */
export async function startRecordingScreen(this: SafariDriver, options?: StartRecordingOptions): Promise<void> {
  const {timeLimit, codec, display, mask, forceRestart = true} = options ?? {};
  if (this._screenRecorder) {
    if (this._screenRecorder.isRunning) {
      this.log.info('The screen recording is already running');
      if (!forceRestart) {
        this.log.info('Doing nothing');
        return;
      }
      this.log.info('Forcing the active screen recording to stop');
    }
    // Best-effort cleanup so a stale temp artifact cannot block starting a new recording.
    try {
      await this._screenRecorder.stop(true);
    } catch (e: any) {
      this.log.warn(`Failed to clean up the previous screen recording: ${e.message}`);
    } finally {
      this._screenRecorder = null;
    }
  }

  let udid = this._simulatorUdid;
  if (!udid) {
    const booted = await findSimulators(this.caps, {bootedOnly: true});
    if (booted.length > 1) {
      throw new Error(
        `Cannot tell which of the ${booted.length} matching booted Simulators to record the video from. ` +
          `Specify 'safari:deviceUDID' in the session capabilities`,
      );
    }
    udid = booted[0]?.udid ?? null;
  }
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
