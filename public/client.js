
function pad(num) {
   var ps = num < 10 ? '0' + num: num.toString(); 
   return ps;
}

function toHumanDate(ts)
{
  var lf = new Date(ts);  
  return [lf.getFullYear(), pad(lf.getMonth()+1), pad(lf.getDate())].join('-') + ' ' + [pad(lf.getHours()), pad(lf.getMinutes()), pad(lf.getSeconds())].join(':');
}

function toHumanRelativeTime(ts) {
    var second = 1000;
    var minute = 60 * second;
    var hour = 60 * minute;
    var day = 24 * hour;
    
    var now = new Date(Date.now()).getTime();
    if (ts === undefined) return '(unknown)';
    var diff = now - ts;
    var rel;
    if (diff < second) {
      rel = 'less than a second';
    } else if (diff < minute) {
      rel = 'less than a minute';
    } else if (diff < hour) {
      rel = 'less than ' + Math.floor(diff/minute) + ' minutes';
    } else {
      rel = 'a long time';
    } 
    return rel + ' ago' ;
}

setInterval(function() {
  var elements = document.getElementsByClassName('relative');
  for(var i = 0; i < elements.length; i++) {
    var element = elements[i];
    element.textContent = toHumanRelativeTime(parseInt( element.attributes['data-time'].value ,10))
  }
}, 5000);

/* globals Chart */

function setChart() {
  if (document.getElementById('myChart') === null) return;
  var ctx = document.getElementById('myChart').getContext('2d');
  
  var xhr; 
  
  function processData(){
    var siteData = JSON.parse(this.response);
    var scatterData = [];
    
    siteData.forEach((sd) => {
      scatterData.push({x: new Date(sd.date * 1000) , y: sd.score, r: (sd.answers||0) + 1 }) 
    });
    
    var myChart = new Chart(ctx, {
        type: 'bubble',
        data: {
            datasets: [{
                backgroundColor: 'rgb(255,0,0,0.5)',
                label: 'Questions',
                data: scatterData,
                borderWidth: 1,
                pointBackgroundColor: 'rgb(255,0,0,0.5)',
                pointHitRadius: 2
              
            }]
        },
        options: {
            onClick: (data,a) => {
              console.log(a[0].tooltipPosition(), a[0].inRange(), a[0]._index);
              if (a && a.length>0) {
                var idx = a[0]._index;
                var onesite = siteData[idx];
                
                window.open('https://'+ onesite.site+'/q/'+onesite.id, 'hotquestion'); 
              }
              
            },
            scales: {
                yAxes: [{
                  scaleLabel: {
                    display:true,
                    labelString: 'Score'
                  },
                    ticks: {
                        beginAtZero: true
                    }
                }],
               xAxes:[{
                 type: 'time',
                 time: {unit:'day'},
                 position: 'bottom',
                 scaleLabel: {
                   display:true,
                   labelString: 'Date'
                 }
              }]
            },
          tooltips: {
              callbacks: {
                  label: function(tooltipItem, data) {
                      
                      return siteData[tooltipItem.index].site.replace('.stackexchange.com','');
                  }
              }
          }
        }
    });  
  }
  
  function getData() {
    var req = new XMLHttpRequest();
    req.addEventListener("load", processData);
    req.open('GET','/api/charts');
    req.send();
  }
  
  getData();
  
}

document.addEventListener('readystatechange', (evt) => {
  if (event.target.readyState === 'complete') {
    setChart();
  }
});
