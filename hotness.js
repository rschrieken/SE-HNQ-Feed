const httpclient = require('https');
const crypto = require('crypto');

function HotnessScraper() {
  
  var cachedHotQuestions = '[]', 
      cachedHash = null, 
      lastRefresh;
  
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
  
  function buildSiteDictionary(chq) {
    var chqsite, site, sites = {};
    chq.forEach(function(chqsite) {
      site = sites[chqsite.site];
      if (site === undefined) {
        site = {
          site: chqsite.site,
          score: 0,
          icon: chqsite.icon_url,
          answers: 0,
          count: 0,
          tags: []
        };
      }
      site.score += chqsite.display_score;
      site.answers += chqsite.answer_count;
      site.count++;
      chqsite.tags.forEach((tag)=> {
        if (site.tags.indexOf(tag) === -1) {
          site.tags.push(tag);
        }
      });
      sites[chqsite.site] = site;
    });
    return sites;
  }
  
  function getStatus() {
    var sites, chq = JSON.parse(cachedHotQuestions), siteList = [];
    sites = buildSiteDictionary(chq);
    for(var s in sites) {
      siteList.push(sites[s])
    }
    siteList.sort((l,r)=> { return l.score>r.score?-1:l.score<r.score?1:0; });
    return {
      lastRefresh: lastRefresh,
      sites: siteList
    }
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
    getStatus: getStatus
  }
}

module.exports = HotnessScraper