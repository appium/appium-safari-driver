import { SafariDriver } from '../../lib/driver';

describe('SafariDriver', function () {
  let chai;
  let should;

  before(async function () {
    chai = await import('chai');
    should = chai.should();
  });

  it('should exist', function () {
    should.exist(SafariDriver);
  });
});
