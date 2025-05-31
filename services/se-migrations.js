const Api = require("./se-api.js");
const Sites = require("./se-sites.js");
const Database = require("better-sqlite3");

const SecondsBetweenApiCalls = 20 * 1000;

var test = false;
const db = new Database(test ? ":memory:" : process.env.MIGRATIONS_SQL_DB);

db.exec(`
create table if not EXISTS sites(id integer PRIMARY KEY AUTOINCREMENT, api_site_parameter text unique, site_url text, name text, lastupdate integer);

create table if not EXISTS posts(id integer PRIMARY KEY AUTOINCREMENT, siteid integer, postid integer, title text, tags text, owneruserid integer, ownerdisplayname text, creationdate INTEGER, last_activity_date INTEGER, migrationdate INTEGER);

create unique index if not EXISTS uix_posts on posts(siteid, postid);
`);

const stmt_sitesSelect = db.prepare('select id, site_url, lastupdate from sites where api_site_parameter=?;');
const stmt_siteTopSelect = db.prepare('select id, api_site_parameter, lastupdate from sites order by lastupdate asc;');
const stmt_sitesInsert = db.prepare(`insert into sites(api_site_parameter, site_url, name, lastupdate) VALUES ($api_site_parameter, $site_url, $name, 0) 
   ON CONFLICT(api_site_parameter) DO UPDATE SET lastupdate=$lastupdate WHERE api_site_parameter = $api_site_parameter`);
const stmt_postsInsert = db.prepare('insert or ignore into posts(siteid, postid, title, tags, owneruserid, ownerdisplayname, creationdate, last_activity_date, migrationdate ) values ($siteid, $postid, $title, $tags, $owneruserid, $ownerdisplayname, $creationdate, $lastactivitydate, $migrationdate);');

const stmt_postsSelect = db.prepare('select id, postid, title, tags, owneruserid, ownerdisplayname, creationdate, last_activity_date  from posts where siteid=$siteid order by last_activity_date desc, creationdate desc limit 5;');
const stmt_allpostsSelect = db.prepare('select postid, title, tags, owneruserid, ownerdisplayname, creationdate, last_activity_date, migrationdate, api_site_parameter, site_url, name   from posts inner join sites on sites.id = posts.siteid order by last_activity_date desc, creationdate desc limit ? offset ?');

function updateMigrations(wrapper, site) {
 // console.log(wrapper);
  var transaction = db.transaction((items)=> {
    var info = stmt_sitesInsert.run({ api_site_parameter: site.api_site_parameter, site_url:site.site_url, name: site.name, lastupdate: Date.now()});
    // you would expect info.lastInsertRowid to have the last inserted id but nope at least it contains whatever the last inserted was, not the lastinserted for this statement ...
    var siteRecord = stmt_sitesSelect.get(site.api_site_parameter);
    //console.log('get value siterecord and info ', siteRecord, info) ;

    for (const item of items) {
      stmt_postsInsert.run({
        siteid: siteRecord.id, 
        postid: item.question_id, 
        title: item.title, 
        tags: item.tags.join(', '),
        owneruserid: item.owner? item.owner.user_id : -1, 
        ownerdisplayname: item.owner ? item.owner.display_name: null, 
        creationdate: item.creation_date,
        lastactivitydate: item.last_activity_date,
        migrationdate: item.migration_date
        })
    }
  });
  
  if (wrapper && wrapper.items  && Array.isArray(wrapper.items)) {
    transaction(wrapper.items);
  }
}

function populateMigrations(site, page) {
  if (Api.hasBackoff()) {
    console.warn('siteCron job backing out of pop mig due to the API having backoff ')
    return;
  }
   Api.getMigrated(site.api_site_parameter, page).then((wrapper) => { 
     // console.log('has_more',site.api_site_parameter ,page, wrapper.has_more);
     if (wrapper.has_more === true){
       setTimeout(()=> {
         console.log('for site ', site.api_site_parameter, ' fetch extra page', (page || 1) + 1);
         populateMigrations(site, (page || 1) + 1);
       },1);
     }
     updateMigrations(wrapper,site);
   }).catch(console.error);
}

function siteCronJob() {
  if (Api.hasBackoff()) {
    console.warn('siteCron job backing out due to the API having backoff ')
    return;
  }
  var topsite = stmt_siteTopSelect.get();
  //console.log(topsite);
  Sites.getSiteByApi(topsite.api_site_parameter)
    .then((site)=> {
      populateMigrations(site);  
    })
    .catch(function(e) {console.error('se-mugration-topsite ',e)});
}

function initIntervalForApiJob() {
  setInterval(siteCronJob, SecondsBetweenApiCalls);
}

function buildFeed(hostname, site, api, feedItems)
{
  return  {
        title: 'Migrations for ' + site,
        url: hostname + '/migrations/feeds/' + api,
        buildDate: new Date(),
        feeds: feedItems
      };
}

function mapPostToFeed(posts, site_url) {
  var feedItems = [];
  // console.log(posts);
  for(const index in posts) {
    var post = posts[index];
   // console.log(post);
    feedItems.push({
      title: post.title,
      id: site_url + '/q/'+post.postid ,
      date: new Date((post.last_activity_date || post.creationdate) * 1000),
      description: 'From ' + post.ownerdisplayname + ' and tagged as ' + post.tags,  
      category: 'Migration'  
    });
  }
  return feedItems;
}

function getMigrations(api) {
  const hostname = 'https://lackadaisical-appeal.glitch.me' // fix me
  // console.log(api);
  function exec(resolve, reject) {
    Sites.getSiteByApi(api).then(site => {
      if (site) {
        //console.log('get mig', site);
        var siteRecord = stmt_sitesSelect.get(api);
        if (typeof(siteRecord) === 'undefined') {
         // console.log(siteRecord);
          populateMigrations(site);
          // we resolve with an empty set for now, once it is populated we will return a full set.
          resolve(buildFeed(hostname, site.name, api, []));
        } else {
          // get migrations;
          // console.log(siteRecord);
          var posts = stmt_postsSelect.all({siteid: siteRecord.id});
          resolve(buildFeed(hostname, site.name, api, mapPostToFeed(posts, siteRecord.site_url)));
        }
      } else {
        reject(new Error("No site found"));
      }
    });
  }
  return new Promise(exec);
}

function getMigrationStatus() {
  return stmt_siteTopSelect.all().reverse();
}

function getMigrationPosts(page, pagesize) {
  if (pagesize > 50) pagesize = 50
  pagesize = pagesize || 15;
  page = page || 1;
  return stmt_allpostsSelect.all(pagesize, (page - 1) * pagesize + 1);
}


/*
getMigrations("stackoverflow")
  .then(migs => {
    console.log(migs);
  })
  .catch(e => {
    console.error(e);
  });
*/

initIntervalForApiJob();

module.exports = {
  getMigrations: getMigrations,
  getMigrationStatus: getMigrationStatus,
  getMigrationPosts: getMigrationPosts,
  getQuota: Api.getQuota
};
