import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {SafariDriver} from '../../lib/driver.js';

describe('SafariDriver', () => {
  it('should exist', () => {
    assert.ok(SafariDriver);
  });
});
