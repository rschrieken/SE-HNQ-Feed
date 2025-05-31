var assert = require('assert');




describe('settings', function() {
  var testsettings = require('../settings.js')({db: { days: {inMemoryOnly:true}}});  
  var settings = require('../settings.js');
  describe('read days_hist from env', function() {
    var fromenv = settings({});
    it('db ', function() {
      assert.equal('.data/useragents_days_hist.db', fromenv.db.days_hist.filename);
    });
    it('mem ', function() {
      assert.equal(true, testsettings.db.days_hist.inMemoryOnly);
    });
  });
});