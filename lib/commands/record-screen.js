import _ from 'lodash';
import { util, fs, net, tempDir } from 'appium-support';
import { waitForCondition } from 'asyncbox';
import log from '../logger';
import Simctl from 'node-simctl';


const commands = {};

const STARTUP_INTERVAL_MS = 300;
const STARTUP_TIMEOUT_MS = 10 * 1000;
const DEFAULT_TIME_LIMIT_MS = 60 * 10 * 1000; // 10 minutes
const PROCESS_SHUTDOWN_TIMEOUT_MS = 10 * 1000;
const DEFAULT_EXT = '.mp4';


async function uploadRecordedMedia (localFile, remotePath = null, uploadOptions = {}) {
  if (_.isEmpty(remotePath)) {
    const {size} = await fs.stat(localFile);
    log.debug(`The size of the resulting screen recording is ${util.toReadableSizeString(size)}`);
    return (await util.toInMemoryBase64(localFile)).toString();
  }

  const {user, pass, method, headers, fileFieldName, formFields} = uploadOptions;
  const options = {
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

const VIDEO_FILES = new Set();
process.on('exit', () => {
  for (const videoFile of VIDEO_FILES) {
    try {
      fs.rimrafSync(videoFile);
    } catch (ign) {}
  }
});

class ScreenRecorder {
  constructor (udid, videoPath, opts = {}) {
    this._process = null;
    this._udid = udid;
    this._videoPath = videoPath;
    this._codec = opts.codec;
    this._display = opts.display;
    this._mask = opts.mask;
    this._timeLimitMs = opts.timeLimit > 0 ? opts.timeLimit * 1000 : DEFAULT_TIME_LIMIT_MS;
    this._timer = null;
  }

  async getVideoPath () {
    if (await fs.exists(this._videoPath)) {
      VIDEO_FILES.add(this._videoPath);
      return this._videoPath;
    }
    return '';
  }

  get isRunning () {
    return !!(this._process?.isRunning);
  }

  async _enforceTermination () {
    if (this.isRunning) {
      log.debug('Force-stopping the currently running video recording');
      try {
        await this._process.stop('SIGKILL');
      } catch (ign) {}
    }
    this._process = null;
    const videoPath = await this.getVideoPath();
    if (videoPath) {
      await fs.rimraf(videoPath);
      VIDEO_FILES.delete(videoPath);
    }
    return '';
  }

  async start () {
    const args = [
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
    log.debug(`Starting video recording with arguments: ${util.quote(args)}`);
    this._process.on('output', (stdout, stderr) => {
      const line = _.trim(stdout || stderr);
      if (line) {
        log.debug(`[recordVideo@${this._udid.substring(0, 8)}] ${line}`);
      }
    });
    this._process.once('exit', async (code, signal) => {
      this._process = null;
      if (code === 0) {
        log.debug('Screen recording exited without errors');
      } else {
        await this._enforceTermination();
        log.warn(`Screen recording exited with error code ${code}, signal ${signal}`);
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
    } catch (e) {
      await this._enforceTermination();
      log.errorAndThrow(`The expected screen record file '${this._videoPath}' does not exist after ${STARTUP_TIMEOUT_MS}ms. ` +
        `Check the server log for more details`);
    }
    this._timer = setTimeout(async () => {
      if (this.isRunning) {
        try {
          await this.stop();
        } catch (e) {
          log.error(e);
        }
      }
    }, this._timeLimitMs);
    log.info(`The video recording has started. Will timeout in ${this._timeLimitMs}ms`);
  }

  async stop (force = false) {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }

    if (force) {
      return await this._enforceTermination();
    }

    if (!this.isRunning) {
      log.debug('Screen recording is not running. Returning the recently recorded video');
      return await this.getVideoPath();
    }

    try {
      await this._process.stop('SIGINT', PROCESS_SHUTDOWN_TIMEOUT_MS);
    } catch (e) {
      await this._enforceTermination();
      throw new Error(`Screen recording has failed to stop after ${PROCESS_SHUTDOWN_TIMEOUT_MS}ms`);
    }

    return await this.getVideoPath();
  }
}

async function extractSimulatorUdid (caps) {
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


/**
 * @typedef {Object} StartRecordingOptions
 *
 * @property {?string} codec [hevc] - Specifies the codec type: "h264" or "hevc"
 * @property {?string} display [internal] - Supports "internal" or "external". Default is "internal"
 * @property {?string} mask - For non-rectangular displays, handle the mask by policy:
 * - ignored: The mask is ignored and the unmasked framebuffer is saved.
 * - alpha: Not supported, but retained for compatibility; the mask is rendered black.
 * - black: The mask is rendered black.
 * @property {string|number} timeLimit [600] - The maximum recording time, in seconds. The default
 * value is 600 seconds (10 minutes).
 * @property {boolean} forceRestart [true] - Whether to ignore the call if a screen recording is currently running
 * (`false`) or to start a new recording immediately and terminate the existing one if running (`true`).
 */

/**
 * Record the Simulator's display in background while the automated test is running.
 * This method uses `xcrun simctl io recordVideo` helper under the hood.
 * Check the output of `xcrun simctl io` command for more details.
 *
 * @param {?StartRecordingOptions} options - The available options.
 * @throws {Error} If screen recording has failed to start or is not supported for the destination device.
 */
commands.startRecordingScreen = async function startRecordingScreen (options = {}) {
  const {
    timeLimit,
    codec,
    display,
    mask,
    forceRestart = true,
  } = options;
  if (this._screenRecorder?.isRunning) {
    log.info('The screen recording is already running');
    if (!forceRestart) {
      log.info('Doing nothing');
      return;
    }
    log.info('Forcing the active screen recording to stop');
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
  this._screenRecorder = new ScreenRecorder(udid, videoPath, {
    timeLimit: parseInt(timeLimit, 10),
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
};

/**
 * @typedef {Object} StopRecordingOptions
 *
 * @property {?string} remotePath - The path to the remote location, where the resulting video should be uploaded.
 * The following protocols are supported: http/https, ftp.
 * Null or empty string value (the default setting) means the content of resulting
 * file should be encoded as Base64 and passed as the endpoint response value.
 * An exception will be thrown if the generated media file is too big to
 * fit into the available process memory.
 * @property {?string} user - The name of the user for the remote authentication.
 * @property {?string} pass - The password for the remote authentication.
 * @property {?string} method - The http multipart upload method name. The 'PUT' one is used by default.
 * @property {?Object} headers - Additional headers mapping for multipart http(s) uploads
 * @property {?string} fileFieldName [file] - The name of the form field, where the file content BLOB should be stored for
 *                                            http(s) uploads
 * @property {?Object|Array<Pair>} formFields - Additional form fields for multipart http(s) uploads
 */

/**
 * Stop recording the screen.
 * If no screen recording has been started before then the method returns an empty string.
 *
 * @param {?StopRecordingOptions} options - The available options.
 * @returns {string} Base64-encoded content of the recorded media file if 'remotePath'
 * parameter is falsy or an empty string.
 * @throws {Error} If there was an error while getting the name of a media file
 * or the file content cannot be uploaded to the remote location
 * or screen recording is not supported on the device under test.
 */
commands.stopRecordingScreen = async function stopRecordingScreen (options = {}) {
  if (!this._screenRecorder) {
    log.info('No screen recording has been started. Doing nothing');
    return '';
  }

  log.debug('Retrieving the resulting video data');
  const videoPath = await this._screenRecorder.stop();
  if (!videoPath) {
    log.info('No video data is found. Returning an empty string');
    return '';
  }
  return await uploadRecordedMedia(videoPath, options.remotePath, options);
};

export default commands;
