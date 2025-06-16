const httpclient = require('https');
const crypto = require('crypto');

function MigrationScraper() {
  
  var cachedMigratedQuestions = '[]', 
      cachedHash = null, 
      lastRefresh;
  
  /*
  
  needs a dict for each site with the latest 5 migrations
  store on disk
  interval each 30 seconds to poll next site
  only store sites that have subscribed to the feed
  have a page with all migrations
  use nedb migrations db : {'ips': {lastCheck: "", migrations:[ {creationdate:"", title:"", id:""},{creationdate:"", title:"", id:""} ]}}
  */
  
  function getMigratedQuestions(resolve, reject) {
    var options = {
        hostname: 'api.stackexchange.com',
        path: '/2.3/search/advanced?order=desc&sort=activity&migrated=True&site=interpersonal&filter=!FmNlySEMJNuGJG_a1BKb2LDmYq' + '&key='+ process.env.SE_API_KEY,
        port: 443, // https is guaranteed to work
        secure: true, // and this can be true then ...
        method: 'GET',
        headers: {
          'Accept': '*/*',
          'Accept-Encoding': 'gzip',
          'User-Agent': 'HotQuestionScraper/1.0 https://sefeeds.socvr.org/ https://meta.stackexchange.com/users/158100/rene'
        }
      }

      // get them
    httpclient.get(options, function (res) {
      var body, hash;
      if (res && res.headers && res.headers['content-type'] && res.headers['content-type'].indexOf('application/json') === 0 ) {
        //console.log('migration scraper ',res.headers['content-type']);
        //console.log('migration scraper enc ',res.headers['content-encoding']);
        body = '';
        hash = crypto.createHash('sha256');
        const zlib = require("zlib");

        let zip = zlib.createGunzip();

        zip.on('error', function(e) {
          console.error('getMigratedQuestrions', e, res.headers, res.statusCode, res.statusMessage);
          if (reject) reject('scrape failed ');  
        });
        zip.on('data', function(d) {
              body += d;
          });
        // all fetched    
        zip.on('end', function() {
          // calc hash of the fetched hot questions
          // because this gets called more frequently
          // and we only want to store unique sets
          hash.update(body);
          // console.log('migration scraper end ',body);
          var hqkey = hash.digest('hex');
          if (hqkey !== cachedHash) {
            cachedHash = hqkey;
            cachedMigratedQuestions = body;
            lastRefresh = Date.now();
            if (resolve) resolve(JSON.parse(body));
          }
        })
        res.pipe(zip);
      } else {
        console.error('scrape failed ', res.headers);
        if (reject) reject('scrape failed ');
      }
    });
  }
// if we're running we keep it up to date
  setInterval(getMigratedQuestions, 15*60000);
  
  function getData(site) {
    return new Promise((res,rej) =>{ 
      if(cachedHash === null)  {
        getMigratedQuestions(res,rej);
      } else {
        res(JSON.parse(cachedMigratedQuestions));
      }
    });
  }
  
  return {
    getData : getData,
    getViewModel: function(hostname, originalUrl, site) {
      return new Promise((res,rej)=> {
        var site = site || 'IPS';
        var feed = {
          title: 'Migrations ' + site,
          url: 'https://'+ hostname + originalUrl,
          buildDate: new Date(),
          feeds: []
        };
        getData(site).then((data)=> {
          //console.log(data);
          if (data && data.items) {
            for(var i=0; i<data.items.length; i++){
              var item = data.items[i];
              feed.feeds.push( 
                {
                title: item.title,
                id: item.link ,
                date: new Date(item.creation_date * 1000),
                description: 'From ' + item.owner.display_name + ' and tagged as ' + item.tags.join(", "),  
                category: 'Migrations'
                }
              );
            }
          }
          res(feed);
        }).catch((e)=>{
          console.error(e);
          rej(e);
        });
      });
    }
    // getStatus: getStatus
  }
}

module.exports = MigrationScraper