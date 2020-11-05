import { formatCapsForServer } from '../../lib/utils';
import chai from 'chai';

chai.should();

describe('formatCapsForServer', function () {
  it('should format empty caps', function () {
    const result = formatCapsForServer({});
    result.should.eql({
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
    result.should.eql({
      browserName: 'Safari',
      browserVersion: '12',
      platformName: 'mac',
    });
  });

  it('should only pass caps with supported prefixes', function () {
    const result = formatCapsForServer({
      'safari:deviceUDID': '1234',
      'webkit:yolo': '567',
      'appium:bar': '789',
    });
    result.should.eql({
      browserName: 'Safari',
      browserVersion: undefined,
      platformName: 'iOS',
      'safari:deviceUDID': '1234',
      'webkit:yolo': '567',
    });
  });
});
