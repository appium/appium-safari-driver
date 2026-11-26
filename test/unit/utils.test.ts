import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {formatCapsForServer, parseRuntimeIdentifier} from '../../lib/utils.js';

describe('formatCapsForServer', () => {
  it('should format empty caps', () => {
    const result = formatCapsForServer({});
    assert.deepEqual(result, {
      browserName: 'Safari',
      browserVersion: undefined,
      platformName: 'iOS',
    });
  });

  it('should assign default caps', () => {
    const result = formatCapsForServer({
      browserName: 'yolo',
      browserVersion: '12',
      platformName: 'mac',
    });
    assert.deepEqual(result, {
      browserName: 'Safari',
      browserVersion: '12',
      platformName: 'mac',
    });
  });

  it('should only pass caps with supported prefixes and standard caps', () => {
    const result = formatCapsForServer({
      'safari:deviceUDID': '1234',
      'webkit:yolo': '567',
      'appium:bar': '789',
      acceptInsecureCerts: true,
    });
    assert.deepEqual(result, {
      browserName: 'Safari',
      browserVersion: undefined,
      platformName: 'iOS',
      'safari:deviceUDID': '1234',
      'webkit:yolo': '567',
      acceptInsecureCerts: true,
    });
  });
});

describe('parseRuntimeIdentifier', () => {
  it('should parse plain runtime identifiers', () => {
    assert.deepEqual(parseRuntimeIdentifier('com.apple.CoreSimulator.SimRuntime.iOS-17-4'), {
      platform: 'iOS',
      version: '17.4',
    });
  });

  it('should ignore a model suffix', () => {
    assert.deepEqual(parseRuntimeIdentifier('com.apple.CoreSimulator.SimRuntime.iOS-27-2-iPhone19-4'), {
      platform: 'iOS',
      version: '27.2',
    });
  });

  it('should return null for unknown formats', () => {
    assert.equal(parseRuntimeIdentifier('whatever'), null);
  });
});
