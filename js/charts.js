/* Chart visualizations using Chart.js */

var mainChart=null;

function destroyChart(){
  if(mainChart){mainChart.destroy();mainChart=null}
}

function buildCharts(){
  // Defer briefly so container is visible and has layout dimensions
  setTimeout(function(){
    var type=document.getElementById('chart-type-sel').value;
    if(type==='scatter')buildScatterChart();
    else if(type==='katbar')buildKatBarChart();
    else if(type==='vombar')buildVomBarChart();
    else if(type==='tier')buildTierChart();
    // Force resize after creation
    if(mainChart)mainChart.resize();
  },50);
}

/* Scatter: Margin % vs Volume, colored by tier */
function buildScatterChart(){
  destroyChart();
  var active=allProducts.filter(function(p){return p.antal>0&&!isExcludedTier(p.tier)});

  // Cap at ~2000 points for performance — sample evenly if larger
  var MAX_POINTS=2000;
  if(active.length>MAX_POINTS){
    active.sort(function(a,b){return b.score-a.score});
    var step=active.length/MAX_POINTS;
    var sampled=[];
    for(var i=0;i<active.length&&sampled.length<MAX_POINTS;i+=step)sampled.push(active[Math.floor(i)]);
    active=sampled;
  }

  var datasets={};
  var tierColors={Prioritet:'#c8f060',Bra:'#60d4f0',Genomsnittlig:'#888780','Låg':'#f0b860'};
  active.forEach(function(p){
    var t=p.tier;
    if(!datasets[t])datasets[t]={label:t,data:[],backgroundColor:tierColors[t]||'#888',pointRadius:3,pointHoverRadius:5};
    datasets[t].data.push({x:p.antal,y:p.margpct,ben:p.ben,kat:p.kat,bv:p.bv});
  });

  var ctx=document.getElementById('main-chart').getContext('2d');
  mainChart=new Chart(ctx,{
    type:'scatter',
    data:{datasets:Object.values(datasets)},
    options:{
      responsive:true,
      maintainAspectRatio:false,
      animation:false,
      plugins:{
        legend:{position:'top',labels:{color:'#e8e6df',font:{family:'DM Sans',size:11},boxWidth:12,padding:16}},
        tooltip:{
          backgroundColor:'#1f1f1e',
          borderColor:'rgba(255,255,255,0.14)',
          borderWidth:1,
          titleColor:'#e8e6df',
          bodyColor:'#e8e6df',
          titleFont:{family:'Syne',weight:'bold'},
          bodyFont:{family:'DM Sans',size:11},
          padding:10,
          callbacks:{
            title:function(items){return items[0].raw.ben},
            label:function(item){
              var d=item.raw;
              return [
                'KAT: '+d.kat+(KAT_NAMES[d.kat]?' – '+KAT_NAMES[d.kat]:''),
                'Antal: '+d.x.toLocaleString('sv'),
                'Marg %: '+d.y.toFixed(1)+'%',
                'BV: '+Math.round(d.bv).toLocaleString('sv')+' kr'
              ];
            }
          }
        }
      },
      scales:{
        x:{
          title:{display:true,text:'Antal sålda',color:'#7a7870',font:{family:'DM Sans',size:12}},
          ticks:{color:'#7a7870',font:{family:'DM Mono',size:10}},
          grid:{color:'rgba(255,255,255,0.06)'}
        },
        y:{
          title:{display:true,text:'Marginal %',color:'#7a7870',font:{family:'DM Sans',size:12}},
          ticks:{color:'#7a7870',font:{family:'DM Mono',size:10},callback:function(v){return v+'%'}},
          grid:{color:'rgba(255,255,255,0.06)'}
        }
      }
    }
  });
}

/* Horizontal bar: Top 15 KATs by Bruttovinst */
function buildKatBarChart(){
  destroyChart();
  var katG={};
  allProducts.forEach(function(p){
    if(!p.kat)return;
    if(!katG[p.kat])katG[p.kat]={bv:0,marg:0,forsv:0};
    katG[p.kat].bv+=p.bv;
    katG[p.kat].marg+=p.marg;
    katG[p.kat].forsv+=p.forsv;
  });
  var sorted=Object.keys(katG).map(function(k){return{kat:k,bv:katG[k].bv,margPct:katG[k].forsv>0?katG[k].marg/katG[k].forsv*100:0}})
    .sort(function(a,b){return b.bv-a.bv}).slice(0,15);

  var labels=sorted.map(function(d){return d.kat+(KAT_NAMES[d.kat]?' '+KAT_NAMES[d.kat]:'')});
  var values=sorted.map(function(d){return Math.round(d.bv)});
  var colors=sorted.map(function(d){return d.margPct>32?'#60d4a0':d.margPct>30?'#f0b860':'#f06060'});

  var ctx=document.getElementById('main-chart').getContext('2d');
  mainChart=new Chart(ctx,{
    type:'bar',
    data:{
      labels:labels,
      datasets:[{label:'Bruttovinst kr',data:values,backgroundColor:colors,borderRadius:4,barThickness:20}]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      indexAxis:'y',
      plugins:{
        legend:{display:false},
        tooltip:{
          backgroundColor:'#1f1f1e',
          borderColor:'rgba(255,255,255,0.14)',
          borderWidth:1,
          titleColor:'#e8e6df',
          bodyColor:'#e8e6df',
          titleFont:{family:'Syne',weight:'bold'},
          bodyFont:{family:'DM Sans',size:11},
          padding:10,
          callbacks:{
            label:function(item){
              var d=sorted[item.dataIndex];
              return ['BV: '+item.formattedValue+' kr','Marg %: '+d.margPct.toFixed(1)+'%'];
            }
          }
        }
      },
      scales:{
        x:{
          title:{display:true,text:'Bruttovinst kr',color:'#7a7870',font:{family:'DM Sans',size:12}},
          ticks:{color:'#7a7870',font:{family:'DM Mono',size:10},callback:function(v){return v.toLocaleString('sv')}},
          grid:{color:'rgba(255,255,255,0.06)'}
        },
        y:{
          ticks:{color:'#e8e6df',font:{family:'DM Sans',size:10},crossAlign:'far'},
          grid:{display:false}
        }
      }
    }
  });
}

/* Horizontal bar: VOM by Bruttovinst */
function buildVomBarChart(){
  destroyChart();
  var vomG={};
  allProducts.forEach(function(p){
    if(!p.vom)return;
    if(!vomG[p.vom])vomG[p.vom]={bv:0,marg:0,forsv:0};
    vomG[p.vom].bv+=p.bv;
    vomG[p.vom].marg+=p.marg;
    vomG[p.vom].forsv+=p.forsv;
  });
  var sorted=Object.keys(vomG).map(function(k){return{vom:k,bv:vomG[k].bv,margPct:vomG[k].forsv>0?vomG[k].marg/vomG[k].forsv*100:0}})
    .sort(function(a,b){return b.bv-a.bv});

  var labels=sorted.map(function(d){return d.vom+(VOM_NAMES[d.vom]?' '+VOM_NAMES[d.vom]:'')});
  var values=sorted.map(function(d){return Math.round(d.bv)});
  var colors=sorted.map(function(d){return d.margPct>32?'#60d4a0':d.margPct>30?'#f0b860':'#f06060'});

  var ctx=document.getElementById('main-chart').getContext('2d');
  mainChart=new Chart(ctx,{
    type:'bar',
    data:{
      labels:labels,
      datasets:[{label:'Bruttovinst kr',data:values,backgroundColor:colors,borderRadius:4,barThickness:20}]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      indexAxis:'y',
      plugins:{
        legend:{display:false},
        tooltip:{
          backgroundColor:'#1f1f1e',
          borderColor:'rgba(255,255,255,0.14)',
          borderWidth:1,
          titleColor:'#e8e6df',
          bodyColor:'#e8e6df',
          titleFont:{family:'Syne',weight:'bold'},
          bodyFont:{family:'DM Sans',size:11},
          padding:10,
          callbacks:{
            label:function(item){
              var d=sorted[item.dataIndex];
              return ['BV: '+item.formattedValue+' kr','Marg %: '+d.margPct.toFixed(1)+'%'];
            }
          }
        }
      },
      scales:{
        x:{
          title:{display:true,text:'Bruttovinst kr',color:'#7a7870',font:{family:'DM Sans',size:12}},
          ticks:{color:'#7a7870',font:{family:'DM Mono',size:10},callback:function(v){return v.toLocaleString('sv')}},
          grid:{color:'rgba(255,255,255,0.06)'}
        },
        y:{
          ticks:{color:'#e8e6df',font:{family:'DM Sans',size:10},crossAlign:'far'},
          grid:{display:false}
        }
      }
    }
  });
}

/* Doughnut: Tier distribution */
function buildTierChart(){
  destroyChart();
  var counts={};
  allProducts.forEach(function(p){counts[p.tier]=(counts[p.tier]||0)+1});
  var order=['Prioritet','Bra','Genomsnittlig','Låg','Ta bort','Systemfel','Ignorerad','Marg 99%','Kategoriförsäljning','Tobak'];
  var tierColors={Prioritet:'#c8f060',Bra:'#60d4f0',Genomsnittlig:'#888780','Låg':'#f0b860','Ta bort':'#f06060',Systemfel:'#d04040',Ignorerad:'#c03030','Marg 99%':'#b02020',Kategoriförsäljning:'#a01010',Tobak:'#901010'};
  var labels=[],values=[],colors=[];
  order.forEach(function(t){
    if(!counts[t])return;
    labels.push(t+' ('+counts[t]+')');
    values.push(counts[t]);
    colors.push(tierColors[t]||'#666');
  });

  var ctx=document.getElementById('main-chart').getContext('2d');
  mainChart=new Chart(ctx,{
    type:'doughnut',
    data:{
      labels:labels,
      datasets:[{data:values,backgroundColor:colors,borderColor:'#181817',borderWidth:2,hoverOffset:8}]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      cutout:'55%',
      plugins:{
        legend:{
          position:'right',
          labels:{color:'#e8e6df',font:{family:'DM Sans',size:12},padding:12,boxWidth:14}
        },
        tooltip:{
          backgroundColor:'#1f1f1e',
          borderColor:'rgba(255,255,255,0.14)',
          borderWidth:1,
          titleColor:'#e8e6df',
          bodyColor:'#e8e6df',
          titleFont:{family:'Syne',weight:'bold'},
          bodyFont:{family:'DM Sans',size:11},
          padding:10,
          callbacks:{
            label:function(item){
              var pct=(item.raw/allProducts.length*100).toFixed(1);
              return item.raw+' produkter ('+pct+'%)';
            }
          }
        }
      }
    }
  });
}
