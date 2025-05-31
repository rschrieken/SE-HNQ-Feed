const Datastore = require('nedb')
  , db = new Datastore({ filename: process.env.USERAGENTS_DB  })
  , dbHist = require('./useragentsHistory.js');

db.loadDatabase(function (err) {    // Callback is optional
  if(err) {console.error(err);}
  else {
    db.ensureIndex({ fieldName: 'useragent' }, function (err) {
  
    });
  }
});

var agents = {'SE Chat': 0, 'Other': 0 };
const msSecond = 1000;
const ms5Seconds = 5 * msSecond;
const msMinute = 60 * msSecond;
const msHour = 60 * msMinute;

// available groupings
var GroupingOn = {
  Hours: 1,
  Days: 2,
  Weeks: 3,
  Months: 4,
  Years: 5
};

// where we currenrly are grouping on
var currentIteration = {
  ts: 0,
  grouping : 0
}


setInterval(moveToHistoryWrapper, msHour /4); // once per hour  


function moveToHistoryWrapper() {
    moveToHistory();

  
  
  function getDayStart(ts) {
    ts = (ts || Date.now());
    var day = new Date(ts);
    day.setMilliseconds(0);
    day.setSeconds(0);
    day.setMinutes(0);
    day.setHours(0);
    return day;
  }
  
  function getMonthStart(ts) {
    ts = (ts || Date.now());
    var day = new Date(ts);
    day.setMilliseconds(0);
    day.setSeconds(0);
    day.setMinutes(0);
    day.setHours(0);
    day.setDate(1);
    return day;
  }
  
  function getYearStart(ts) {
    ts = (ts || Date.now());
    var day = new Date(ts);
    day.setMilliseconds(0);
    day.setSeconds(0);
    day.setMinutes(0);
    day.setHours(0);
    day.setDate(1);
    day.setMonth(0);
    return day;
  }
  
  function moveToHistory() {
    var ts = Date.now();
    var d = new Date(ts);
    d.setSeconds(0);
    d.setMinutes(0);
    d.setMilliseconds(0);

    var histQuery = {ts:{ $lt: d.valueOf() }};
    var flagSimulate = false;

   function processDocs(docs) {
      var doc = { 
        ts: d.valueOf(),
        useragents: {},
        queries:{}
      };
      for(var i=0;i<docs.length; i++){
          var stat = docs[i];
          doc.useragents[stat.useragent] = (doc.useragents[stat.useragent]||0) + 1;
          doc.queries[stat.query] = (doc.queries[stat.query]||0) + 1;
      }

      var keyua = [];
      for(var key in doc.useragents) {
        keyua.push( {n:key, v:doc.useragents[key] } );
      }
      var keyq = [];
      for(var key in doc.queries) {
        keyq.push( {n:key, v:doc.queries[key] } );
      }

      doc.useragents = keyua;
      doc.queries = keyq;
      return doc;
   } 


    db.find(histQuery, function(err,docs){
      if (err) {
        console.error('UserAgents::moveToHistory', err)
      } else {
        if( docs.length === 0) return;

        var doc = processDocs(docs);

        if (flagSimulate === true ) {
          console.log('doc store',doc);
          return;
        }
        dbHist.insert(doc, function (err, newDoc) {  
          if (err) {
            console.error('useragents.hisdtory::err',err, doc);
          } else {
            db.remove(histQuery, { multi: true }, function(err, removedCnt) {
              if (err) {
                 console.error('useragents.hisdtory::err',err, doc);
              } else {
                console.log('removed from useragents', removedCnt);
                db.persistence.compactDatafile();
              }
            });
          }
        }); 
      }
    });
  }

}
function UserAgents() {
  
  
  function store(useragent, query) {
    var doc = {ts:Date.now(), useragent:useragent, query:query};
    if (agents[useragent] !== undefined) {
      agents[useragent]++;
    } else {
      agents['Other']++;
    }
    
    db.insert(doc, function (err, newDoc) {  
      if (err) {
        console.error('useragents.store::err',err, doc);
      } 
    });
  }
  
  function getQueriesAggregate() {
    
    function getQueriesAggregateInternal(resolve, reject) {
    
      db.find({}, (err,docs) =>{
        if (err) {
          console.error('useragents.Agentsagg::err', err);
          resolve([]);
        } else {
          var queries = {};
          for(var i=0; i<docs.length; i++) {
            var doc = docs[i];
            queries[doc.query] = (queries[doc.query] || 0) + 1;
          }
          var queryList = [];
          for(var key in queries){
            queryList.push({q:key,cnt: queries[key] });
          }
          queryList.sort(function(l,r) { return l.cnt<r.cnt?1:l.cnt>r.cnt?-1:0 });  // sort desc
          resolve(queryList);
        }
      });
    }
    
    return new Promise(getQueriesAggregateInternal);
  }
  
  function getAggregate() {
    
    function getAggregateInternal(resolve, reject) {
      // resolve(agents);
    
      db.count({useragent:'SE Chat'}, (err,count) =>{
        if (err) {
          console.error('useragents.agg::err', err);
          resolve(agents);
        } else {
          agents['SE Chat'] = count;
          db.count({ $not: {useragent:'SE Chat'}}, (err,count) =>{
            if (err) {
              console.error('useragents.agg::err', err);
            } else {
              agents['Other'] = count;
            }
            resolve(agents);
          })
        }
      });
    }
    
    return new Promise(getAggregateInternal);
  }
  
  return {
    store: store,
    getAggregate: getAggregate,
    getQueriesAggregate: getQueriesAggregate
  }
}

module.exports = UserAgents;