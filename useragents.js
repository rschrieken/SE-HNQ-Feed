const Datastore = require('nedb')
  , db = new Datastore({ filename: process.env.USERAGENTS_DB, autoload: true  })
  , dbHist = new Datastore({ filename: process.env.USERAGENTS_HIST_DB, autoload: true  });

db.loadDatabase(function (err) {    // Callback is optional
  if(err) {console.error(err);}
  else {
    db.ensureIndex({ fieldName: 'useragent' }, function (err) {
  
    });
  }
});


dbHist.loadDatabase(function (err) {    // Callback is optional
  if(err) {console.error('dbHist.loadDatabase', err);}
  else {
    // db.ensureIndex({ fieldName: 'useragent' }, function (err) {
    //});
  }
});

var agents = {'SE Chat': 0, 'Other': 0 };

setInterval(moveToHistory, 60000); // once per hour

function moveToHistory() {
  var ts = Date.now();
  var d = new Date(ts);
  d.setSeconds(0);
  d.setMinutes(0);
  d.setMilliseconds(0);
  
  var histQuery = {ts:{ $lt: d.valueOf() }};
  db.find(histQuery, function(err,docs){
    if (err) {
      console.error('UserAgents::moveToHistory', err)
    } else {
      if( docs.length === 0) return;
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