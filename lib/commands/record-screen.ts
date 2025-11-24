import _ from 'lodash';
import { util, fs, net, tempDir } from 'appium/support';
import { waitForCondition } from 'asyncbox';
import { Simctl } from 'node-simctl';
import { SubProcess } from 'teen_process';
import type { AppiumLogger, StringRecord } from '@appium/types';
import type { SafariDriver } from '../driver';

const STARTUP_INTERVAL_MS = 300;
const STARTUP_TIMEOUT_MS = 10 * 1000;
const DEFAULT_TIME_LIMIT_MS = 60 * 10 * 1000; // 10 minutes
const PROCESS_SHUTDOWN_TIMEOUT_MS = 10 * 1000;
const DEFAULT_EXT = '.mp4';

interface UploadOptions {
  user?: string;
  pass?: string;
  method?: string;
  headers?: Record<string, string>;
  fileFieldName?: string;
  formFields?: Record<string, string> | Array<[string, string]>;
}

async function uploadRecordedMedia (
  localFile: string,
  remotePath: string | null = null,
  uploadOptions: UploadOptions = {}
): Promise<string> {
  if (_.isEmpty(remotePath) || !remotePath) {
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

interface ScreenRecorderOptions {
  codec?: string;
  display?: string;
  mask?: string;
  timeLimit?: string | number;
}

export class ScreenRecorder {
  private log: AppiumLogger;
  private _process: SubProcess | null = null;
  private _udid: string;
  private _videoPath: string;
  private _codec?: string;
  private _display?: string;
  private _mask?: string;
  private _timeLimitMs: number = DEFAULT_TIME_LIMIT_MS;
  private _timer: NodeJS.Timeout | null = null;

  constructor (udid: string, videoPath: string, log: AppiumLogger, opts: ScreenRecorderOptions = {}) {
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

  async getVideoPath (): Promise<string> {
    if (await fs.exists(this._videoPath)) {
      VIDEO_FILES.add(this._videoPath);
      return this._videoPath;
    }
    return '';
  }

  get isRunning (): boolean {
    return !!(this._process?.isRunning);
  }

  async start (): Promise<void> {
    const args: string[] = [
      this._udid, 'recordVideo'
    ];
    if (this._display) {
      args.push('--display', this._display);
    }
    if (this._codec) {
      args.push('--codec', this._codec);
    }
    if (this._mask) {
      args.push('--mask', this._mask);
    }
    args.push('--force', this._videoPath);
    this._process = await new Simctl().exec('io', {
      args,
      asynchronous: true,
    });
    this.log.debug(`Starting video recording with arguments: ${util.quote(args)}`);
    this._process.on('output', (stdout, stderr) => {
      const line = _.trim(stdout || stderr);
      if (line) {
        this.log.debug(`[recordVideo@${this._udid.substring(0, 8)}] ${line}`);
      }
    });
    this._process.once('exit', async (code, signal) => {
      this._process = null;
      if (code === 0) {
        this.log.debug('Screen recording exited without errors');
      } else {
        await this._enforceTermination();
        this.log.warn(`Screen recording exited with error code ${code}, signal ${signal}`);
      }
    });
    await this._process.start(0);
    try {
      await waitForCondition(async () => {
        if (!this.isRunning) {
          throw new Error();
        }
        return !!(await this.getVideoPath());
      }, {
        waitMs: STARTUP_TIMEOUT_MS,
        intervalMs: STARTUP_INTERVAL_MS,
      });
    } catch {
      await this._enforceTermination();
      throw this.log.errorWithException(
        `The expected screen record file '${this._videoPath}' does not exist after ${STARTUP_TIMEOUT_MS}ms. ` +
        `Check the server log for more details`
      );
    }
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

  async stop (force: boolean = false): Promise<string> {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }

    if (force) {
      return await this._enforceTermination();
    }

    if (!this.isRunning) {
      this.log.debug('Screen recording is not running. Returning the recently recorded video');
      return await this.getVideoPath();
    }

    if (!this._process) {
      throw new Error('Screen recording process is not available');
    }

    try {
      await this._process.stop('SIGINT', PROCESS_SHUTDOWN_TIMEOUT_MS);
    } catch {
      await this._enforceTermination();
      throw new Error(`Screen recording has failed to stop after ${PROCESS_SHUTDOWN_TIMEOUT_MS}ms`);
    }

    return await this.getVideoPath();
  }

  private async _enforceTermination (): Promise<string> {
    if (this.isRunning && this._process) {
      this.log.debug('Force-stopping the currently running video recording');
      try {
        await this._process.stop('SIGKILL');
      } catch {}
    }
    this._process = null;
    const videoPath = await this.getVideoPath();
    if (videoPath) {
      await fs.rimraf(videoPath);
      VIDEO_FILES.delete(videoPath);
    }
    return '';
  }
}

async function extractSimulatorUdid (caps: StringRecord): Promise<string | null> {
  if (caps['safari:useSimulator'] === false) {
    return null;
  }

  const allDevices = _.flatMap(_.values(await new Simctl().getDevices(null, 'iOS')));
  for (const {name, udid, state, sdk} of allDevices) {
    if (state !== 'Booted') {
      continue;
    }

    if (_.toLower(caps['safari:deviceUDID']) === _.toLower(udid)) {
      return udid;
    }
    if (_.toLower(caps['safari:deviceName']) === _.toLower(name) &&
      (caps['safari:platformVersion'] && caps['safari:platformVersion'] === sdk
        || !caps['safari:platformVersion'])) {
      return udid;
    }
  }

  return null;
}

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

/**
 * Record the Simulator's display in background while the automated test is running.
 * This method uses `xcrun simctl io recordVideo` helper under the hood.
 * Check the output of `xcrun simctl io` command for more details.
 *
 * @param options - The available options.
 * @throws {Error} If screen recording has failed to start or is not supported for the destination device.
 */
export async function startRecordingScreen (
  this: SafariDriver,
  options?: StartRecordingOptions
): Promise<void> {
  const {
    timeLimit,
    codec,
    display,
    mask,
    forceRestart = true,
  } = options ?? {};
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
    throw new Error('Cannot determine Simulator UDID to record the video from. ' +
      'Double check your session capabilities');
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
export async function stopRecordingScreen (
  this: SafariDriver,
  options?: StopRecordingOptions
): Promise<string> {
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
  if (_.isEmpty(options?.remotePath)) {
    const {size} = await fs.stat(videoPath);
    this.log.debug(`The size of the resulting screen recording is ${util.toReadableSizeString(size)}`);
  }
  return await uploadRecordedMedia(videoPath, options?.remotePath ?? null, options ?? {});
}

