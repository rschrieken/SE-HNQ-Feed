
var globalSetting = null;

function Settings(somesettings){
  
  function dbSettings(sett) {
    sett = sett || {};
    function setValueOrDefault(value, globalValue) {
      if (value === undefined) return globalValue;
      return value;
    }
    return {
      hours_hist: ((sett || {}).hours) || {filename: process.env.USERAGENTS_HOURS_HIST_DB , autoload:false},
      days_hist: setValueOrDefault(sett.days, {filename: process.env.USERAGENTS_DAYS_HIST_DB , autoload:false}),
      months_hist: setValueOrDefault(sett.months,{filename: process.env.USERAGENTS_MONTHS_HIST_DB , autoload:false}),
      years_hist: setValueOrDefault(sett.years, {filename: process.env.USERAGENTS_YEARS_HIST_DB , autoload:false}),
      
    };
  }
  
  if (globalSetting === null || somesettings !== undefined) {
    globalSetting = {
      'db': dbSettings((somesettings || {}).db)
    };  
  }
  return  globalSetting;
}

module.exports = Settings;