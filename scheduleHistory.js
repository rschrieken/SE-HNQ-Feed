

function Scheduler(settingsOverride) {
  const settings = require('./settings.js')(settingsOverride);
  
  function next() {
    // find lowest ts in db
    // if lowest ts > ts now / rounded to H/D/M/Y break;
    // 
  }
  
  return {
    next: next,
    settings: function() {return settings.db}
  }
  
}

module.exports = Scheduler;