const Datastore = require('nedb')
  , db = new Datastore({ filename: process.env.SESITES_DB  });
const Api = require('./se-api.js');
let lastUpdate = new Date();


db.loadDatabase(function (err) {   
  if(err) {
    console.error(err);
  } else {
  
     db.ensureIndex({ fieldName: 'api_site_parameter', unique:true }, function (err) {
      if (err) console.error('se-site ensureIdex failed',err);
    });
  
    db.count({}, function (err, count) {
      if (err) {
        console.error(err);
      } else {
        // console.log('se -sites.db count', count);
        if (count === 0) {
          loadSites();
        }
      }
    });
  }
});

function loadSites() {
  console.log('needs refresh ');
  return Api.getSites().then((wrapper) => {
    if (wrapper.items) {
      wrapper.items.forEach((item)=>{
        db.update({'api_site_parameter': item.api_site_parameter}, {
          api_site_parameter: item.api_site_parameter,
          name: item.name,
          high_resolution_icon_url: item.high_resolution_icon_url,
          site_url: item.site_url,
          logo_url: item.logo_url,
          site_type: item.site_type
        }, {upsert:true}, (err, numAffected, affectedDocuments, upsert)=>{
          if(err) {
            console.error(err, numAffected, affectedDocuments, upsert); 
          }
        } );
      });
    }
  }).catch(console.error);
}

function reloadSites() {
  const now = new Date();
  const diff = now - lastUpdate;
  if (diff > (1000*60*60*24)) {
    loadSites().then(function () {
      lastUpdate = new Date();
      console.log('reloadSites succeeded at ', lastUpdate);
    });
  }
}

function getAllSites() {
  reloadSites();
  
  function exec(resolve,reject){
    db.find({}).sort({ name: 1 }).exec((err,docs) => {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        resolve(docs);
      }
    });
  }
  return new Promise(exec);
}

function getSitesApi() {
  function exec(resolve,reject){
    db.find({}, { api_site_parameter: 1}, (err,docs) => {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        resolve(docs);
      }
    });
  }
  return new Promise(exec);
}

function getSiteById(id) {
  function exec(resolve,reject){
    db.find({ _id: id }, (err,docs) => {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        resolve(docs);
      }
    });
  }
  return new Promise(exec);
}

function getSiteByApi(api) {
  function exec(resolve,reject){
    db.find({ api_site_parameter: api }, (err,docs) => {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        if (docs && docs.length > 0) {
          resolve(docs[0]); // only the first is returned
        } else {
          resolve(); 
        }
      }
    });
  }
  return new Promise(exec);
}


module.exports = {
  getAllSites: getAllSites,
  getSitesApi: getSitesApi,
  getSiteById: getSiteById,
  getSiteByApi: getSiteByApi
}