import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {SafariDriver} from '../../lib/driver.js';

describe('SafariDriver', () => {
  it('should exist', () => {
    assert.ok(SafariDriver);
  });

  it('should include documented safari and webkit capability constraints', () => {
    const driver = new SafariDriver();
    assert.equal(driver.desiredCapConstraints['safari:diagnose']?.isBoolean, true);
    assert.equal(driver.desiredCapConstraints['webkit:alwaysAllowAutoplay']?.isBoolean, true);
    assert.equal(driver.desiredCapConstraints['webkit:siteIsolationEnabled']?.isBoolean, true);
  });
});
