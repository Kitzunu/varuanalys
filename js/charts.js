/* Chart visualizations using Chart.js */

var mainChart=null;

function destroyChart(){
  if(mainChart){mainChart.destroy();mainChart=null}
}

function buildCharts(){
  // Defer briefly so container is visible and has layout dimensions
  setTimeout(function(){
    var type=document.getElementById('chart-type-sel').value;
    var canvasWrap=document.getElementById('main-chart').parentElement;
    var heatWrap=document.getElementById('heatmap-wrap');
    if(type==='heatmap'){
      destroyChart();
      canvasWrap.style.display='none';
      heatWrap.style.display='block';
      buildHeatmapChart();
      return;
    }
    canvasWrap.style.display='block';
    heatWrap.style.display='none';
    if(type==='quadrant')buildQuadrantChart();
    else if(type==='scatter')buildScatterChart();
    else if(type==='katbar')buildKatBarChart();
    else if(type==='vombar')buildVomBarChart();
    else if(type==='tier')buildTierChart();
    // Force resize after creation
    if(mainChart)mainChart.resize();
  },50);
}

/* Quadrant: Margin % vs Volume with threshold lines and labeled quadrants */
function buildQuadrantChart(){
  destroyChart();
  var T=getThresholds();
  var active=allProducts.filter(function(p){return p.antal>0&&!isExcludedTier(p.tier)});
  var medianAntal=active.slice().sort(function(a,b){return a.antal-b.antal});
  var volCut=medianAntal.length?medianAntal[Math.floor(medianAntal.length*.5)].antal:10;
  var margCut=T.margGreen;

  var MAX_POINTS=2000;
  if(active.length>MAX_POINTS){
    active.sort(function(a,b){return b.score-a.score});
    var step=active.length/MAX_POINTS;var sampled=[];
    for(var i=0;i<active.length&&sampled.length<MAX_POINTS;i+=step)sampled.push(active[Math.floor(i)]);
    active=sampled;
  }

  var quads={
    'Stjärnor':{data:[],color:'#c8f060',desc:'Hög volym + hög marginal'},
    'Potential':{data:[],color:'#f0b860',desc:'Hög volym + låg marginal'},
    'Dolda pärlor':{data:[],color:'#60d4f0',desc:'Låg volym + hög marginal'},
    'Underpresterare':{data:[],color:'#f06060',desc:'Låg volym + låg marginal'}
  };
  active.forEach(function(p){
    var pt={x:p.antal,y:p.margpct,ben:p.ben,kat:p.kat,bv:p.bv,tier:p.tier,score:p.score};
    if(p.antal>=volCut&&p.margpct>=margCut)quads['Stjärnor'].data.push(pt);
    else if(p.antal>=volCut)quads['Potential'].data.push(pt);
    else if(p.margpct>=margCut)quads['Dolda pärlor'].data.push(pt);
    else quads['Underpresterare'].data.push(pt);
  });

  var datasets=Object.keys(quads).map(function(k){
    var q=quads[k];
    return{label:k+' ('+q.data.length+')',data:q.data,backgroundColor:q.color+'cc',pointRadius:4,pointHoverRadius:6};
  });

  // Quadrant line plugin
  var quadPlugin={
    id:'quadrantLines',
    afterDraw:function(chart){
      var ctx=chart.ctx;
      var xAxis=chart.scales.x;
      var yAxis=chart.scales.y;
      var xPx=xAxis.getPixelForValue(volCut);
      var yPx=yAxis.getPixelForValue(margCut);

      ctx.save();
      ctx.setLineDash([6,4]);
      ctx.lineWidth=1.5;
      ctx.strokeStyle='rgba(255,255,255,0.25)';
      // Vertical line (volume cutoff)
      ctx.beginPath();ctx.moveTo(xPx,yAxis.top);ctx.lineTo(xPx,yAxis.bottom);ctx.stroke();
      // Horizontal line (margin cutoff)
      ctx.beginPath();ctx.moveTo(xAxis.left,yPx);ctx.lineTo(xAxis.right,yPx);ctx.stroke();
      ctx.setLineDash([]);

      // Quadrant labels
      ctx.font='600 10px Syne,sans-serif';
      ctx.globalAlpha=0.35;
      var pad=8;
      ctx.fillStyle='#c8f060';ctx.textAlign='right';ctx.fillText('★ STJÄRNOR',xAxis.right-pad,yAxis.top+16);
      ctx.fillStyle='#f0b860';ctx.textAlign='right';ctx.fillText('↑ POTENTIAL',xAxis.right-pad,yPx+16);
      ctx.fillStyle='#60d4f0';ctx.textAlign='left';ctx.fillText('◆ DOLDA PÄRLOR',xAxis.left+pad,yAxis.top+16);
      ctx.fillStyle='#f06060';ctx.textAlign='left';ctx.fillText('↓ UNDERPRESTERARE',xAxis.left+pad,yPx+16);
      ctx.globalAlpha=1;
      ctx.restore();
    }
  };

  var ctx=document.getElementById('main-chart').getContext('2d');
  mainChart=new Chart(ctx,{
    type:'scatter',
    data:{datasets:datasets},
    plugins:[quadPlugin],
    options:{
      responsive:true,maintainAspectRatio:false,animation:false,
      plugins:{
        legend:{position:'top',labels:{color:'#e8e6df',font:{family:'DM Sans',size:11},boxWidth:12,padding:16}},
        tooltip:{
          backgroundColor:'#1f1f1e',borderColor:'rgba(255,255,255,0.14)',borderWidth:1,
          titleColor:'#e8e6df',bodyColor:'#e8e6df',
          titleFont:{family:'Syne',weight:'bold'},bodyFont:{family:'DM Sans',size:11},padding:10,
          callbacks:{
            title:function(items){return items[0].raw.ben},
            label:function(item){
              var d=item.raw;
              return ['KAT: '+d.kat+(KAT_NAMES[d.kat]?' – '+KAT_NAMES[d.kat]:''),
                'Antal: '+d.x.toLocaleString('sv'),'Marg %: '+d.y.toFixed(1)+'%',
                'BV: '+Math.round(d.bv).toLocaleString('sv')+' kr','Poäng: '+d.score];
            }
          }
        }
      },
      scales:{
        x:{title:{display:true,text:'Antal sålda (median: '+volCut+')',color:'#7a7870',font:{family:'DM Sans',size:12}},
          ticks:{color:'#7a7870',font:{family:'DM Mono',size:10}},grid:{color:'rgba(255,255,255,0.06)'}},
        y:{title:{display:true,text:'Marginal % (gräns: '+margCut+'%)',color:'#7a7870',font:{family:'DM Sans',size:12}},
          ticks:{color:'#7a7870',font:{family:'DM Mono',size:10},callback:function(v){return v+'%'}},grid:{color:'rgba(255,255,255,0.06)'}}
      }
    }
  });
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
  var T=getThresholds();
  var colors=sorted.map(function(d){return d.margPct>=T.margGreen?'#60d4a0':d.margPct>=T.margAmber?'#f0b860':'#f06060'});

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
  var T=getThresholds();
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
  var colors=sorted.map(function(d){return d.margPct>=T.margGreen?'#60d4a0':d.margPct>=T.margAmber?'#f0b860':'#f06060'});

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

/* Heatmap: KAT × Metric matrix */
function buildHeatmapChart(){
  var T=getThresholds();
  var katG={};
  allProducts.forEach(function(p){
    if(!p.kat||isExcludedTier(p.tier))return;
    if(!katG[p.kat])katG[p.kat]={antal:0,forsv:0,marg:0,ff:0,bv:0,count:0};
    var g=katG[p.kat];g.antal+=p.antal;g.forsv+=p.forsv;g.marg+=p.marg;g.ff+=p.ff;g.bv+=p.bv;g.count++;
  });
  var kats=Object.keys(katG).map(function(k){
    var g=katG[k];
    return{kat:k,prods:g.count,antal:g.antal,forsv:g.forsv,
      margPct:g.forsv>0?g.marg/g.forsv*100:0,
      fysPct:g.forsv>0?g.ff/g.forsv*100:0,
      bvPct:g.forsv>0?g.bv/g.forsv*100:0,
      bvKr:g.bv};
  }).filter(function(k){return k.forsv>0}).sort(function(a,b){return b.forsv-a.forsv}).slice(0,30);

  if(!kats.length){document.getElementById('heatmap-wrap').innerHTML='<div style="text-align:center;padding:40px;color:var(--mut)">Ingen data</div>';return}

  var metrics=[
    {key:'antal',label:'Antal',fmt:function(v){return Math.round(v).toLocaleString('sv')},mode:'higher-better'},
    {key:'forsv',label:'F\u00f6rs.v\u00e4rde',fmt:function(v){return Math.round(v/1000)+'k'},mode:'higher-better'},
    {key:'margPct',label:'Marg %',fmt:function(v){return v.toFixed(1)+'%'},mode:'margin'},
    {key:'fysPct',label:'FYS %',fmt:function(v){return v.toFixed(1)+'%'},mode:'lower-better'},
    {key:'bvPct',label:'BV %',fmt:function(v){return v.toFixed(1)+'%'},mode:'higher-better'},
    {key:'bvKr',label:'BV kr',fmt:function(v){return Math.round(v/1000)+'k'},mode:'higher-better'}
  ];

  // Compute min/max per metric for color scaling
  var ranges={};
  metrics.forEach(function(m){
    var vals=kats.map(function(k){return k[m.key]});
    ranges[m.key]={min:Math.min.apply(null,vals),max:Math.max.apply(null,vals)};
  });

  function heatColor(val,metric){
    var r=ranges[metric.key];
    if(r.max===r.min)return 'var(--surf2)';
    var pct=(val-r.min)/(r.max-r.min); // 0-1

    if(metric.mode==='margin'){
      // Use threshold-based coloring
      if(val>=T.margGreen)return 'rgba(96,212,160,'+(0.15+pct*0.45)+')';
      if(val>=T.margAmber)return 'rgba(240,184,96,'+(0.15+0.3)+')';
      return 'rgba(240,96,96,'+(0.15+(1-pct)*0.4)+')';
    }
    if(metric.mode==='lower-better'){
      // Invert: low = green, high = red
      if(val>=T.fysRed)return 'rgba(240,96,96,'+(0.15+pct*0.45)+')';
      return 'rgba(96,212,160,'+(0.15+(1-pct)*0.35)+')';
    }
    // higher-better: low = faint, high = strong green
    return 'rgba(96,212,240,'+(0.08+pct*0.45)+')';
  }

  function textColor(val,metric){
    if(metric.mode==='margin'){
      return val>=T.margGreen?'var(--grn)':val>=T.margAmber?'var(--amb)':'var(--red)';
    }
    if(metric.mode==='lower-better'){
      return val>=T.fysRed?'var(--red)':'var(--txt)';
    }
    return 'var(--txt)';
  }

  var html='<table class="heatmap-table"><thead><tr><th class="heatmap-corner">KAT</th>';
  metrics.forEach(function(m){html+='<th class="heatmap-th">'+m.label+'</th>'});
  html+='</tr></thead><tbody>';
  kats.forEach(function(k){
    var name=KAT_NAMES[k.kat]||'';
    var shortName=name.length>22?name.substring(0,20)+'\u2026':name;
    html+='<tr><td class="heatmap-label" title="'+k.kat+(name?' \u2013 '+name:'')+'"><span class="heatmap-kat-id">'+k.kat+'</span> '+shortName+'</td>';
    metrics.forEach(function(m){
      var v=k[m.key];
      html+='<td class="heatmap-cell" style="background:'+heatColor(v,m)+';color:'+textColor(v,m)+'">'+m.fmt(v)+'</td>';
    });
    html+='</tr>';
  });
  html+='</tbody></table>';
  document.getElementById('heatmap-wrap').innerHTML=html;
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
