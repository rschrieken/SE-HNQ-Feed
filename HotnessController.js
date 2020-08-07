const UserAgents = require('./useragents.js');
var useragents = new UserAgents();

function HotnessController(hns) {
    
  function getData(site, hostname, originalUrl, useragent, rawquery) {
    
    // parse +{site}+{site}-{site} paarameter in a filter
    function ParseSite(site, query) {
      var filter = {
        select: [],
        deselect: [],
        exact: []
      }, add = 0, c, singleSite = '';

      function handleQuery(result, item) {
        var keys = Object.getOwnPropertyNames(query);
        if (result === true && keys.length > 0 && keys.length < 16) {
          for(var key in query){
            var parts = key.split(' ');
            console.log('query', parts);
            if (parts.length >= 3){
              var fldval = item[parts[0]];
              if (fldval !== undefined) {
                console.log('fld val', fldval);
                switch(parts[1]) {
                  case 'gt':
                    result = fldval > parts[2];
                    break;
                  case 'lt':
                    result = fldval < parts[2];
                    break;
                  case 'ge':
                    result = fldval >= parts[2];
                    break;
                  case 'le':
                    result = fldval <= parts[2];
                    break;
                  default:
                    console.warn('op invalid', parts);
                }
              }
            } else {
              console.warn('not valid ', parts)
            }
          }
        }
        return result;
      }
      
      function isSiteSelected(item) {
        var result = (filter.select.length === 0 && filter.exact.length === 0), current;
        // add if site matches
        for(var selectedSite in filter.select) {
          current = filter.select[selectedSite];
          if (item.site && item.site.indexOf(current)>-1)
          {
            result = true;
            break;
          }
        }
        for(var selectedSite in filter.exact) {
          
          current = filter.exact[selectedSite];
          // console.log(selectedSite, current, item);
          if (item.site && item.site === current)
          {
            result = true;
            break;
          }
        }
        // remove if site matches
        for(var selectedSite in filter.deselect) {
          current = filter.deselect[selectedSite];
          if (item.site && item.site.indexOf(current)>-1)
          {
            result = false;
            break;
          }
        }
        result = handleQuery(result, item);
        /*
        var keys = Object.getOwnPropertyNames(query);
        if (result === true && keys.length > 0 && keys.length < 16) {
          for(var key in query){
            var parts = key.split(' ');
            console.log('query', parts);
            if (parts.length >= 3){
              var fldval = item[parts[0]];
              if (fldval !== undefined) {
                console.log('fld val', fldval);
                switch(parts[1]) {
                  case 'gt':
                    result = fldval > parts[2];
                    break;
                  case 'lt':
                    result = fldval < parts[2];
                    break;
                  default:
                    console.warn('op invalid', parts);
                }
              }
            } else {
              console.warn('not valid ', parts)
            }
          }
          
        }*/

        return result;
      }

      // store the filter value, uses 
      function store(aSite, add) {
        if (aSite.length > 0) {
          switch(add){
            case 0: // add
              filter.select.push(aSite);
              break;
            case 1:
              filter.deselect.push(aSite);  
              break;
            case 2:
              filter.exact.push(aSite);  
              break;
            default:
              console.log('invalid add in store',add);
              break;
          }
        }
      }

      for(var chIndex in site) 
      {
        c = site[chIndex];
        if (c === '+' || c === '-' || c === '=') {
          store(singleSite, add);
          add = ['+','-','='].indexOf(c); //c === '+';
          singleSite = '';
          continue;
        }
        singleSite = singleSite + c;
      }
      
      store(singleSite, add);
      
      return { isSiteSelected: isSiteSelected}
    }
    
    // promise to deliver data
    function executor(resolve, reject) {
      var feed = {
          title: 'HNQ ' + site,
        url: 'https://'+ hostname + originalUrl,
        buildDate: new Date(),
        feeds: []
      }, siteFilter;
      
      // hns is the scraper instance
      hns.getData().then( (d) => {
        
        if (d && d.length > 0) {
          siteFilter = new ParseSite(site, rawquery);
          var ts = Date.now();
          
          d.forEach(function(item) {
          //  var x = (ts - item.creation_date * 1000) / 500000;
            
           // console.log('time diff / rate ', ts, Math.sin(item.display_score / x) , item.display_score );
            
            if (siteFilter.isSiteSelected(item))
            {
              feed.feeds.push(
                {
                title: item.title,
                id: 'https://' + item.site + '/q/'+item.question_id ,
                date: new Date(item.creation_date * 1000),
                description: 'From ' + item.user_name + ' and tagged as ' + item.tags,  
                category: 'HNQ'
                }
              );
            }
          } );
          useragents.store(useragent, originalUrl.replace('/hnq/',''));
        }
        resolve(feed);
      }).catch(reject);
    }
    
    return new Promise(executor);
  }
  
  return {
    getData: getData
  }
}


module.exports = HotnessController