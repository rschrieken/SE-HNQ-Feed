const httpclient = require('https');
const crypto = require('crypto');

function HotnessScraper() {
  
  var cachedHotQuestions = '[]', 
      cachedHash = null, 
      lastRefresh,
      UserAgents = {
        'SE Chat': 0,
        'Overige': 0
      };
  
  function getHotQuestions(resolve, reject) {
    var options = {
        hostname: 'stackexchange.com',
        path: '/hot-questions-for-mobile',
        port: 443, // https is guaranteed to work
        secure: true, // and this can be true then ...
        method: 'GET',
        headers: {
          'Accept': '*/*',
          'User-Agent': 'HotQuestionScraper/1.0 https://lackadaisical-appeal.glitch.me/ https://meta.stackexchange.com/users/158100/rene'
        }
      }

      // get them
    httpclient.get(options, function (res) {
      var body, hash;
      if (res && res.headers && res.headers['content-type'] && res.headers['content-type'].indexOf('application/json') === 0 ) {
        
        body = '';
        hash = crypto.createHash('sha256');

        res.on('data', function(d) {
              body += d;
          });
        // all fetched    
        res.on('end', function() {
          // calc hash of the fetched hot questions
          // because this gets called more frequently
          // and we only want to store unique sets
          hash.update(body);
          var hqkey = hash.digest('hex');
          if (hqkey !== cachedHash) {
            cachedHash = hqkey;
            cachedHotQuestions = body;
            lastRefresh = Date.now();
            if (resolve) resolve(JSON.parse(body));
          }
        })
      } else {
        console.error('scrape failed ', res.headers);
        if (reject) reject('scrape failed ');
      }
    });
  }
  
  function getStatus() {
    var sites = {}, chq = JSON.parse(cachedHotQuestions), chqsite, site, siteList = [];
    console.log(chq);
    for(var i=0; i< chq.length; i++) {
      chqsite = chq[i];
      console.log(chqsite);
      site = sites[chqsite.site];
      console.log('site ', site);
      if (site === undefined) {
        site = {
          site: chqsite.site,
          score: 0,
          icon: chqsite.icon_url,
          answers: 0,
          count:0
        };
      }
      site.score += chqsite.display_score;
      site.answers += chqsite.answer_count;
      site.count++;
      sites[chqsite.site] = site;
    }
    console.log(sites);
    for(var s in sites) {
      console.log(s);
      siteList.push(sites[s])
    }
    return {
      lastRefresh: lastRefresh,
      sites: siteList,
      agents: UserAgents,
      title:'SE HNQ Feeds for Chat'
    }
  }
  
  function collectStats(data) {
     console.log('colectstats ',data);
     
     if (data.userAgent === 'SE Chat') {
       UserAgents[data.userAgent]++;
     } else {
       UserAgents['Overige']++;
     }
     console.log('colectstats ua',UserAgents);
  }
  
  // if we're running we keep it up to date
  setInterval(getHotQuestions, 60000);
  
  return {
    getData : function() {
        return new Promise((res,rej) =>{ 
          if(cachedHash === null)  {
            getHotQuestions(res,rej);
          } else {
            res(JSON.parse(cachedHotQuestions));
          }
        });
    },
    getStatus: getStatus,
    collectStats: collectStats
  }
}

module.exports = HotnessScraper