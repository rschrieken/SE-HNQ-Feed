var assert = require('assert');

var Scheduler = require('../scheduleHistory.js');


describe('A scheduler', function() {
 
  describe('Takes a setting', function() {
    it('should return the setting 42', function() {
      var instance = new Scheduler({});
      assert.equal('.data/useragents_days_hist.db', instance.settings().days_hist.filename);
    });
    
  });
});