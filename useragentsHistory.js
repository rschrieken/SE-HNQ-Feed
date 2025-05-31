const fs = require('fs');

const Datastore = require('nedb');
const Database = require('better-sqlite3');




 // UA_HIST_SQL_DB
var test = false;
const db = new Database(test? ':memory:' : process.env.UA_HIST_SQL_DB);

db.exec(`
create table if not EXISTS timestamps(id integer PRIMARY KEY AUTOINCREMENT , ts integer);

create table if not EXISTS useragent_counts(id integer PRIMARY KEY AUTOINCREMENT , ts integer, useragent_id integer, cnt INTEGER);
create table if not EXISTS useragents(id integer PRIMARY KEY AUTOINCREMENT , useragent TEXT CONSTRAINT UN_useragent UNIQUE);

create table if not EXISTS queries(id integer PRIMARY KEY AUTOINCREMENT , queryText TEXT CONSTRAINT UN_queryText UNIQUE);
create table if not EXISTS query_counts(id integer PRIMARY KEY AUTOINCREMENT , ts integer, query_id integer, cnt INTEGER);

`);

/*
process.on('SIGTERM', (code) => {
 // fs.write(fd,'Process exit event with code: ' +code, ()=>{});
  db.close();
 // fs.write(fd,new Date()+' db closed \r\n', ()=>{});
//  fs.close(fd, ()=>{});
  process.exit(0);
});
*/

const stmt_tsSelect = db.prepare('select ts from timestamps where ts=?;');

const stmt_ts = db.prepare('insert OR IGNORE into timestamps(ts) VALUES ($ts);');

const stmt_ua = db.prepare('insert OR IGNORE into useragents(useragent) VALUES ($useragent);');
const stmt_uac = db.prepare('insert into useragent_counts(ts,useragent_id, cnt) VALUES ($ts, (select id from useragents where useragent = $useragent), $cnt);');

const stmt_query =  db.prepare('insert  OR IGNORE into queries(queryText) VALUES ($query);');
const stmt_queryc = db.prepare('insert into query_counts(ts,query_id, cnt) VALUES ($ts, (select id from queries where queryText = $query), $cnt);');


const dbHist = new Datastore({ filename: process.env.USERAGENTS_HIST_DB, autoload: false  });
  
dbHist.loadDatabase(function (err) {    // Callback is optional
  if(err) {
    console.error('dbHist.loadDatabase', err);
  } else {
      aggregateHistory();
  }
});


function savetoSql(doc){
  
  var tran = db.transaction((doc) => {
    stmt_ts.run({ts:doc.ts});
    for (const agent of doc.useragents) {
      stmt_ua.run({useragent: agent.n});
      stmt_uac.run({ts:doc.ts, useragent: agent.n, cnt: agent.v});
    }
    for (const query of doc.queries) {
      stmt_query.run({query: query.n});
      stmt_queryc.run({ts:doc.ts, query: query.n, cnt: query.v});
    }
  });
  
  tran(doc);
}

var movedone = 0;

function movetoSql() {
  dbHist.find({}).sort({ ts: 1 }).limit(1).exec(function (err, docs) {
    if (err) {
      console.error('movetosql', err);
    } else {
      // console.log(docs);
      if (docs && docs.length === 1) {
         var timestampFound = stmt_tsSelect.get(docs[0].ts);
         if (typeof timestampFound !== 'undefined') {
           console.warn(timestampFound, ' already processed but still in dbHist');
           dbHist.persistence.compactDatafile();
         } else {
           // not found in sqlite, so we can savetoSql
           console.log('movetosql start save', docs[0].ts);
           savetoSql(docs[0]);
           console.log('movetosql save done', docs[0].ts);
           // nothing thrown, so lets remove that docs[0] from dbHist
         }
         dbHist.remove({ _id: docs[0]._id }, {}, function (err, numRemoved) {
            if (err) {
              console.error('movetosql dbHistremove ', err, docs[0]._id);
            } else {
              if (numRemoved !== 1) {
                console.warn('movetosql dbHist remove, removed <> 1', numRemoved, docs[0]._id );
              } else {
                // success
                movedone++;
                if (movedone < 2000) {
                  console.log('movetosql rescheduled ', movedone);
                  setTimeout(movetoSql, 2000);
                } else {
                  console.log('movetosql ended');
                }
              }
            }
         }); 
      } else {
        console.error('movetosql not found one', docs);
      }
    }
  });  
}

//movetoSql();

function insert(doc, fun) {
  
  // sqlite
  savetoSql(doc)
  
  console.log('sqlite tran');
  if (typeof(fun) === 'function') {
    fun(undefined,{});
  }
  // json nedb store
  /*dbHist.insert(doc, function (err, newDoc) {  
    // console.log('in ua hist insert')
    if (err) {
      console.error('insert', err);
    }
    if (typeof(fun) === 'function') {
      fun(err,newDoc);
    }
  });*/
}

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

function aggregateHistory(startDay) {
    
  
  // we first agg Days (so we have max 6 of those)
  // then weeks (so we have max 5 of those) weeks start at monday 00:00:00
  // then months (so we have 12 of those) a month starts on the fist day at 00:00:00
  // then years (so we have whatever we need of those) a year start on 01-01 00:00:00

  var ts = startDay || Date.now();
  var day = getDayStart(ts);
  var dayEnd = ts;
  var histQuery = { $and:[ 
    { ts: { $gt: day.valueOf()}}, 
    { ts: { $lte: dayEnd.valueOf()}}
  ]};

  function processTimeDocs(docs, dayStart, dayEnd) {
    var doc = { 
      ts: dayStart.valueOf(),
      useragents: [],
      queries: []
    };
    console.log('agg hist data', histQuery['$and'][0], histQuery['$and'][1]);

    function reduceAgents(stat) {
      for(var j=0;j<(stat.useragents || []).length; j++){
        var ag = stat.useragents[j];
        var elem = doc.useragents.find((e)=> { return e.n === ag.n });
        if (elem === undefined) {
          doc.useragents.push(ag);
        } else {
          elem.v = elem.v + ag.v;
        }
      }
    }

    function reduceQueries(stat) {
      for(var j=0;j<(stat.queries || []).length; j++){
        var kv = stat.queries[j];
        var elem = doc.queries.find((e)=> { return e.n === kv.n });
        if (elem === undefined) {
          doc.queries.push(kv);
        } else {
          elem.v = elem.v + kv.v;
        }
      }
    }

    // find the stat record
    dbHist.find({ts: doc.ts}, function(err,sdocs){
      if (err) { 
        console.error(err)
      } else {
     //   console.log(docs.length, sdocs.length> 0 ? sdocs[0]: {} );
        if (sdocs.length === 0) {
           // init to empty
        } else if (sdocs.length === 1){
          // init to this record
       //   console.log('one found', sdocs[0]._id);
          doc.useragents = sdocs[0].useragents;
          doc.queries = sdocs[0].queries;
        } else {
          console.warn('found +1 stat records ', sdocs);
          return;
        }
        for(var i=0;i<docs.length; i++){
          var stat = docs[i];
          reduceAgents(stat);
          reduceQueries(stat);
          // doc.useragents[stat.useragent] = (doc.useragents[stat.useragent]||0) + 1;
          // doc.queries[stat.query] = (doc.queries[stat.query]||0) + 1;
        }
        console.log('agg hist ', doc.ts, (doc.useragents||[]).length, (docs.queries||[]).length);
        // store doc
        // remove what was found

        // 
      }

    });

    // console.log('agg hist', doc)
    // insert doc
    // remove histQuery except inserted doc
    // schedule next timesearch
  } // 


  // main move 

  dbHist.find(histQuery, function(err,docs){
    if (err) {
      console.error('UserAgents::aggregateHistory', err)
    } else {
      if( docs.length === 0) return;
      var doc = processTimeDocs(docs, day);
    }
  });
}

module.exports.insert = insert;