const SESites = require('../services/se-sites.js');
const SEMigrations = require('../services/se-migrations.js');

const hostname = 'https://lackadaisical-appeal.glitch.me' // fix me

function getAllSites() { 
  var dbSites = SEMigrations.getMigrationStatus();
  function exec(resolve,reject) {
    SESites.getAllSites().then((sites) => {
      var site;
      for(var i=0; i<sites.length; i++) {
        site = sites[i];
        var rec = dbSites.find((sr) => sr.api_site_parameter === site.api_site_parameter);
        if (typeof(rec) !== 'undefined') {
         // console.log('gas', rec, site)
          site.lastupdate = rec.lastupdate;
          site.humantime = Math.floor((Date.now()  - rec.lastupdate)/ 60 / 1000) + ' minutes ago';
          site.feed_url = hostname + '/migrations/feeds/' + site.api_site_parameter;
        }
      }
      resolve(sites);
    }
    ).catch(reject);
  }
  return new Promise(exec); // SESites.getAllSites()
}

function getMigrationStatus() {
  function exec(resolve,reject){
    try {
      var model = {
        sites: SEMigrations.getMigrationStatus(),
        quota: SEMigrations.getQuota
      }
      resolve(model);
    }catch(err) {
      console.error(err);
      reject(err);
    }
  }
  return new Promise(exec);
}

function addSiteIcon(localPost) {
  return SESites.getSiteByApi(localPost.api_site_parameter).then((site)=> { 
    //console.log(localPost, site);
    localPost.high_resolution_icon_url = site.high_resolution_icon_url;
    return localPost;
  })
}

function getMigrationPosts(page, pagesize) {
  function exec(resolve,reject){
    try {
      var posts = SEMigrations.getMigrationPosts(page, pagesize);
      var pop = [];
      for(const post in posts) {
        pop.push(addSiteIcon(posts[post]));
      }
      Promise.all(pop).then(resolve);
    }catch(err) {
      console.error(err);
      reject(err);
    }
  }
  return new Promise(exec);
}


module.exports = {
  getAllSites:  getAllSites,
  getMigrationStatus: getMigrationStatus,
  getMigrations: SEMigrations.getMigrations,
  getMigrationPosts: getMigrationPosts
}