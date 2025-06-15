
const httpclient = require('https');
const crypto = require('crypto');
const zlib = require("zlib");

const queue = []; // {}

let backoff = 0;
let quota = 0;

const sixtyDaysInSeconds = 60 * 24 * 60 * 60;

function getMigrated(site, page) {
  
  // over the last 60 days, look for creationdDate
  // where there is an migrated_from property
  var options = { 
    pagesize: 100,
    page: page || 1,
    'order': 'desc', 
    'sort': 'creation', 
    'fromdate': Math.floor((Date.now() / 1000) - sixtyDaysInSeconds),
    'migrated': 'true', 
    'site': site, 
    'filter': '!m6Wy7AN0buCDYW6V5yZEc44h0Hp)(Bc(2)B.VaJ2Cf1ha7ODjpDf0njz'
   };
  var migrated = get('search/advanced', 
             options);
  
  function exec(resolve, reject) {
    migrated.then((postWrapper) => {
      //if (site === 'stackoverflow') {console.log('/search/advanced/', options, (postWrapper.items|| []).length); } else {console.log('skip ', site)}
      postWrapper.items = postWrapper.items
        .filter((item) => item.migrated_from);
      postWrapper.items.sort((l,r)=>{ return l.migrated_from.on_date - r.migrated_from.on_date });
      postWrapper.items = postWrapper.items.map( (post) => {
        post.last_activity_date = post.migrated_from.on_date; 
        post.migration_date = post.migrated_from.on_date; 
        return post} );
      //if (site === 'stackoverflow') console.log('/search/advanced/ result ', (postWrapper.items|| []).length);
      resolve(postWrapper);
    }).catch(reject);
  }
  var prom = new Promise(exec);
  
  return prom;
}

function getSites() {
  return get('sites', 
             {'pagesize': 500, 
              'filter': '!2-Eh9gcoBcLL3OJ7Ndy.A'
             });
}


function signalQueue(){
  var func = queue.shift();
  if (typeof(func) !== 'undefined') {
    setTimeout(() => {
      func.exec()
        .then(()=> {if (queue.length>0) {signalQueue();}})
        .catch((err)=>{ console.error(err);} );
    }, backoff * 1000); // seconds !
  }
}

function get(path, params) {
  
  var query = [];
  for(var p in params) {
    query.push(p + '=' + params[p]);
  }
  if (process.env.SE_API_KEY) {
    query.push('key='+ process.env.SE_API_KEY);
  } else {
    console.warn('SE-API', query, ' SE_API_KEY not set');
  }

  var qp = (function(getFromApi) {
    var actualResolve;
    var actualReject;
    
    function executor(res, rej) {
      actualResolve = res;
      actualReject = rej;
    }
    
    function exec() {
      
      return new Promise(getFromApi).then(actualResolve).catch(actualReject);
    }
    
    return {
      promise: new Promise(executor),
      exec: exec
    }
  })(getFromAPI);
  
  queue.push( qp);
  signalQueue();
  return qp.promise;
  
  function getFromAPI(resolve, reject) {
    const fullpath = '/2.3/' + path + '?' + query.join('&');
    var options = {
        hostname: 'api.stackexchange.com',
        path: fullpath,
        port: 443, // https is guaranteed to work
        secure: true, // and this can be true then ...
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip', 
          'User-Agent': 'HotQuestionScraper/1.0 https://lackadaisical-appeal.glitch.me/ https://meta.stackexchange.com/users/158100/rene'
        }
      }

        // get them
      httpclient.get(options, function (res) {
        var body;
        const { statusCode } = res;
        if (res && res.headers && res.headers['content-type'] && res.headers['content-type'].indexOf('application/json') === 0 ) {
          //console.log('migration scraper ',res.headers['content-type']);
          //console.log('migration scraper enc ',res.headers['content-encoding']);
          body = '';
          
          let zip = zlib.createGunzip();

          zip.on('data', function(d) {
                body += d;
            });
          zip.on('error', function(e) { console.log(e, statusCode, fullpath, body); })
          // all fetched    
          zip.on('end', function() {
            var wrapper = JSON.parse(body);
            backoff = (wrapper.backoff || 0);
            if (wrapper.error_id) {
              console.error('SE API', wrapper, options.path);
              var err = [wrapper.error_id, wrapper.error_message, wrapper.error_name].join(' ; ');
              reject(new Error(err));
            } else {
              if (wrapper.quota_remaining < 1000) console.log('quota remaining', wrapper.quota_remaining)
              quota = wrapper.quota_remaining;
              resolve(wrapper);
            }
          })
          res.pipe(zip);
        } else {
          console.error('get se api failed ', res.headers);
          if (reject) reject('scrape failed ');
        }
      });
  }
}

// var mig = getMigrated('interpersonal').then((a)=> console.log(a));

module.exports = {
  getMigrated: getMigrated,
  getSites: getSites,
  hasBackoff: () => {return backoff > 0;},
  getQuota : () => {return quota;}
}