const Datastore = require('nedb');

  


console.log(process.argv);

var action = process.argv.slice(2);

function isAction(act){
 return (action.length > 0 && action[0] === act );
}

function listhours() {
  const dbHours = new Datastore({ filename: process.env.USERAGENTS_HOURS_HIST_DB, autoload: true  });
  dbHours.find({}).sort({ts: 1}).limit(60).exec((err, docs)=>{
    if (err) console.log('error ',err);
    docs.forEach((item)=>{
      console.log(item.ts, new Date(item.ts), item.useragents.length, item.queries.length);  
    });

  });    
}

function listdays() {
  const dbHours = new Datastore({ filename: process.env.USERAGENTS_DAYS_HIST_DB, autoload: true  });
  dbHours.find({}).sort({ts: 1}).limit(60).exec((err, docs)=>{
    if (err) console.log('error ',err);
    docs.forEach((item)=>{
      console.log(item.ts, new Date(item.ts), item.useragents.length, item.queries.length);  
    });

  });    
}



if (isAction('listhours')){
  listhours();
} else if (isAction('listdays')) {
  listdays();
} 
else {
  console.log(' usage: query.js load | listhours |  | listdays ');
}