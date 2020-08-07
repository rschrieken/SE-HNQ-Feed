
function ApiController(hns) {
  if (hns===undefined)  {
    console.warn('no hns');
    return;
  }
  
  function getChartData() {
    
    function getChartDataInternal(resolve, reject) {
      hns.getData().then((sites)=> {
        var sitelist = [];
        sites.forEach((site)=>{
          sitelist.push(
            {site:site.site, 
             id: site.question_id,
             score:site.display_score, 
             answers: site.answer_count,
             date:site.creation_date} );
        });
        resolve(sitelist)  ;
      }).catch(reject);
    }
    
    return new Promise(getChartDataInternal);
  }
  
  return {
    getChartData: getChartData
  }
  
}


module.exports = ApiController;