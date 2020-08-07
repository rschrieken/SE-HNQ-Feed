const UserAgents = require('./useragents.js');
var useragents = new UserAgents();

var statsCache = {};

function StatusController(hns)
{
  
  function getStatusAgents(summary) {
    if (statsCache.agents) {
      summary.agents = statsCache.agents;
    } else {
      summary.agents = [{agent:'waiting for data ...'}];
      useragents.getAggregate()
        .then((c)=> {
          statsCache.agents = [];
          if (c['SE Chat'] > 0)  statsCache.agents.push({agent: 'SE Chat' });
          if (c['Other'] > 0) statsCache.agents.push({agent: 'Other' });
        })
        .catch((err)=> {
          console.error('StatusController::getStatusSummary', err);
        });
    }
  }
  // getQueriesAggregate
  function getStatusQueries(summary) {
    if (statsCache.queries) {
      summary.queries = statsCache.queries;
    } else {
      summary.queries = [{query:'waiting for data ...', count:0}];
      useragents.getQueriesAggregate()
        .then((list)=> {
          statsCache.queries = [];
          for(var i=0; i < (list.length<3?list.length:3); i++) {
            var item = list[i];
            statsCache.queries.push({query:item.q, count:item.cnt});
          }
        })
        .catch((err)=> {
          console.error('StatusController::getStatusQueriesSummary', err);
        });
    }
  }
  
  function getStatusSummary() {
    var status = hns.getStatus(), summary = {};
    
    if (statsCache.lastRefresh && (statsCache.lastRefresh != status.lastRefresh )){
      statsCache = {};
      statsCache.lastRefresh = status.lastRefresh;
    }
    summary.lastRefresh = status.lastRefresh;
    
    getStatusAgents(summary);
    getStatusQueries(summary);
  
    return summary;
  }
  
  function getStatus(){
    function getSatusInternal(resolve, reject) {
      var status = hns.getStatus();
      var ua = useragents.getAggregate()
        .then((c)=> {
          status.agents = c; 
          resolve(status); 
        })
        .catch((err)=> {
          console.error('StatusController::getStatus', err);
          resolve(status); 
        });
    }
    return new Promise(getSatusInternal);
  }
  
  return {
    getStatus: getStatus,
    getStatusSummary: getStatusSummary
  }
}

module.exports = StatusController;