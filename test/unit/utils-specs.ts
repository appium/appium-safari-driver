import { formatCapsForServer } from '../../lib/utils';
import { expect } from 'chai';

describe('formatCapsForServer', function () {
  it('should format empty caps', function () {
    const result = formatCapsForServer({});
    expect(result).to.eql({
      browserName: 'Safari',
      browserVersion: undefined,
      platformName: 'iOS',
    });
  });

  it('should assign default caps', function () {
    const result = formatCapsForServer({
      browserName: 'yolo',
      browserVersion: '12',
      platformName: 'mac',
    });
    expect(result).to.eql({
      browserName: 'Safari',
      browserVersion: '12',
      platformName: 'mac',
    });
  });

  it('should only pass caps with supported prefixes and standard caps', function () {
    const result = formatCapsForServer({
      'safari:deviceUDID': '1234',
      'webkit:yolo': '567',
      'appium:bar': '789',
      'acceptInsecureCerts': true
    });
    expect(result).to.eql({
      browserName: 'Safari',
      browserVersion: undefined,
      platformName: 'iOS',
      'safari:deviceUDID': '1234',
      'webkit:yolo': '567',
      'acceptInsecureCerts': true
    });
  });
});

