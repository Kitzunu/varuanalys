/* Summary views: VOM, KAT, Movers, Svinn, KAT comparison */

function buildSummaries(){
  function group(keyField){
    var g={};
    allProducts.forEach(function(p){
      var k=p[keyField]||'–';
      if(!g[k])g[k]={grpKey:k,prods:0,antal:0,forsv:0,marg:0,ff:0,bv:0,mPctSum:0,bvPctSum:0,act:0,prio:0,tabort:0};
      var r=g[k];r.prods++;r.antal+=p.antal;r.forsv+=p.forsv;r.marg+=p.marg;r.ff+=p.ff;r.bv+=p.bv;
      if(p.antal>0&&p.marg>0){r.mPctSum+=p.margpct;r.bvPctSum+=p.bvpct;r.act++;}
      if(p.tier==='Prioritet')r.prio++;
      if(isExcludedTier(p.tier))r.tabort++;
    });
    return Object.values(g).map(function(r){
      r.avgMargPct=r.forsv>0?r.marg/r.forsv*100:0;
      r.avgBvPct=r.forsv>0?r.bv/r.forsv*100:0;
      r.avgSvinnPct=r.forsv>0?r.ff/r.forsv*100:0;
      return r;
    });
  }
  renderSummary('vom-body',group('vom'));
  renderSummary('kat-body',group('kat'));
}

function renderSummary(tbId,data){
  var sc=sumSortState[tbId]||{field:'bv',dir:'desc'};
  data.sort(function(a,b){
    var va=a[sc.field],vb=b[sc.field];
    if(typeof va==='string')return sc.dir==='asc'?va.localeCompare(vb,'sv'):vb.localeCompare(va,'sv');
    return sc.dir==='asc'?va-vb:vb-va;
  });
  function fmt(n){return n===0?'–':Math.round(n).toLocaleString('sv')}
  function fmtP(n){return n===0?'–':n.toFixed(1)+'%'}
  var isVom=tbId==='vom-body';
  document.getElementById(tbId).innerHTML=data.map(function(r){
    var T=getThresholds();
    var svC=r.avgSvinnPct>=T.fysRed?'style="color:var(--red)"':'';
    var nameMap=isVom?VOM_NAMES:KAT_NAMES;
    var name=nameMap[r.grpKey];
    var keyCell=r.grpKey+(name?'<span class="mc-name">'+name+'</span>':'');
    return '<tr>'+
      '<td class="mc">'+keyCell+'</td>'+
      '<td class="nr" style="color:var(--mut)">'+r.prods+'</td>'+
      '<td class="nr">'+fmt(r.antal)+'</td>'+
      '<td class="nr" style="color:var(--acc2)">'+fmt(r.forsv)+'</td>'+
      '<td class="nr" style="color:var(--grn)">'+fmt(r.marg)+'</td>'+
      '<td class="nr" style="color:'+(r.avgMargPct>=T.margGreen?'var(--grn)':r.avgMargPct>=T.margAmber?'var(--amb)':r.avgMargPct>0?'var(--red)':'var(--mut)')+'">'+ fmtP(r.avgMargPct)+'</td>'+
      '<td class="nr" '+(r.avgSvinnPct>=T.fysRed?'style="color:var(--red)"':'')+'>'+fmt(r.ff)+'</td>'+
      '<td class="nr" '+svC+'>'+fmtP(r.avgSvinnPct)+'</td>'+
      '<td class="nr" style="color:var(--grn)">'+fmt(r.bv)+'</td>'+
      '<td class="nr">'+fmtP(r.avgBvPct)+'</td>'+
      '<td class="nr" style="color:var(--acc)">'+r.prio+'</td>'+
      '<td class="nr" style="color:var(--red)">'+r.tabort+'</td>'+
      '</tr>';
  }).join('');
  requestAnimationFrame(setTableHeight);
}

function sortSum(tbId,th,field){
  var sc=sumSortState[tbId]||{field:'bv',dir:'desc'};
  if(sc.field===field)sc.dir=sc.dir==='desc'?'asc':'desc';
  else{sc.field=field;sc.dir='desc';}
  sumSortState[tbId]=sc;
  var thead=document.getElementById(tbId).closest('table').querySelector('thead');
  thead.querySelectorAll('th').forEach(function(t){t.classList.remove('asc','desc')});
  th.classList.add(sc.dir==='asc'?'asc':'desc');
  buildSummaries();
}

/* Movers view */

function setMvKatAll(state){
  document.querySelectorAll('#mv-kat-menu input[type=checkbox]').forEach(function(cb){cb.checked=state});
  onMvKatChange();
}

function onMvKatChange(){
  var sel=Array.prototype.map.call(document.querySelectorAll('#mv-kat-menu input[type=checkbox]:checked'),function(cb){return cb.value});
  var btn=document.querySelector('#mv-kat-drop .multi-btn');
  var label=document.getElementById('mv-kat-label');
  if(sel.length===0){label.textContent='Alla KAT';btn.classList.remove('active');}
  else if(sel.length===1){label.textContent=sel[0]+(KAT_NAMES[sel[0]]?' – '+KAT_NAMES[sel[0]]:'');btn.classList.add('active');}
  else{label.textContent=sel.length+' KAT valda';btn.classList.add('active');}
  buildMovers();
}

function filterMvKat(){
  var q=(document.getElementById('mv-kat-search').value||'').toLowerCase();
  document.querySelectorAll('#mv-kat-menu .multi-item').forEach(function(el){
    el.classList.toggle('hidden',q.length>0&&el.dataset.lbl.indexOf(q)===-1);
  });
}

function buildMovers(){
  var MIN_ANTAL=parseInt(document.getElementById('mv-min').value)||50;
  var GEM_MAX=parseInt(document.getElementById('mv-gem-max').value)||200;
  var GEM_MARG=parseFloat(document.getElementById('mv-gem-marg').value)||32;
  var POT_MARG=parseFloat(document.getElementById('mv-pot-marg').value)||30;

  var mvMenu=document.getElementById('mv-kat-menu');
  if(mvMenu.querySelectorAll('.multi-item').length===0){
    var kats=[...new Set(allProducts.filter(function(p){return p.antal>0&&!isExcludedTier(p.tier)}).map(function(p){return p.kat}))].sort();
    var menuHtml='<input class="multi-search" id="mv-kat-search" type="text" placeholder="Sök KAT..." oninput="filterMvKat()" onclick="event.stopPropagation()">';
    menuHtml+='<div class="multi-menu-header"><button onclick="setMvKatAll(true)">Välj alla</button><button onclick="setMvKatAll(false)">Rensa</button></div>';
    menuHtml+=kats.map(function(k){
      var lbl=k+(KAT_NAMES[k]?' – '+KAT_NAMES[k]:'');
      return '<label class="multi-item" data-lbl="'+lbl.toLowerCase()+'"><input type="checkbox" value="'+k+'" onchange="onMvKatChange()"> '+lbl+'</label>';
    }).join('');
    mvMenu.innerHTML=menuHtml;
  }

  var selKats=Array.prototype.map.call(mvMenu.querySelectorAll('input[type=checkbox]:checked'),function(cb){return cb.value});

  var active=allProducts.filter(function(p){
    if(isExcludedTier(p.tier))return false;
    if(p.antal<MIN_ANTAL)return false;
    if(selKats.length&&selKats.indexOf(p.kat)===-1)return false;
    return true;
  });

  var byVol=[].concat(active).sort(function(a,b){return b.antal-a.antal});
  var volCutoff=byVol.length>0?byVol[Math.ceil(byVol.length*.30)-1].antal:0;
  var potential=[].concat(active)
    .filter(function(p){return p.antal>=volCutoff&&p.margpct<POT_MARG})
    .sort(function(a,b){return a.margpct-b.margpct})
    .slice(0,10);

  var gems=[].concat(active)
    .filter(function(p){return p.antal<=GEM_MAX&&p.margpct>=GEM_MARG})
    .sort(function(a,b){return a.antal-b.antal})
    .slice(0,10);

  var bottom=[].concat(active)
    .filter(function(p){return p.tier==='Låg'||p.tier==='Genomsnittlig'})
    .sort(function(a,b){return a.score-b.score})
    .slice(0,15);

  function fmt(n){return n===0?'–':Math.round(n).toLocaleString('sv')}
  function fmtP(n){return n===0?'–':n.toFixed(1)+'%'}
  var T=getThresholds();
  var mpC=function(v){return v>=T.margGreen?'cg':v>=T.margAmber?'ca':v>0?'cr':''};
  var empty6='<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--mut);font-size:11px">Inga produkter matchar — justera tröskelvärdena</td></tr>';
  var empty10='<tr><td colspan="10" style="text-align:center;padding:24px;color:var(--mut);font-size:11px">Inga produkter matchar — justera tröskelvärdena</td></tr>';

  document.getElementById('movers-top-body').innerHTML=potential.length?potential.map(function(p){
    return '<tr>'+
      '<td class="mc">'+p.kat+(KAT_NAMES[p.kat]?'<span class="mc-name">'+KAT_NAMES[p.kat]+'</span>':'')+'</td>'+
      '<td class="mc">'+p.bnr+'</td>'+
      '<td class="mc">'+p.ean+'</td>'+
      '<td style="font-size:11px;max-width:150px">'+p.ben+'</td>'+
      '<td class="nr">'+fmt(p.antal)+'</td>'+
      '<td class="nr '+mpC(p.margpct)+'">'+fmtP(p.margpct)+'</td>'+
      '<td class="nr">'+fmt(p.bv)+'</td>'+
      '<td class="nr" style="color:var(--mut)">'+p.score+'</td>'+
      '</tr>';
  }).join(''):empty6;

  document.getElementById('movers-hidden-body').innerHTML=gems.length?gems.map(function(p){
    return '<tr>'+
      '<td class="mc">'+p.kat+(KAT_NAMES[p.kat]?'<span class="mc-name">'+KAT_NAMES[p.kat]+'</span>':'')+'</td>'+
      '<td class="mc">'+p.bnr+'</td>'+
      '<td class="mc">'+p.ean+'</td>'+
      '<td style="font-size:11px;max-width:150px">'+p.ben+'</td>'+
      '<td class="nr">'+fmt(p.antal)+'</td>'+
      '<td class="nr '+mpC(p.margpct)+'">'+fmtP(p.margpct)+'</td>'+
      '<td class="nr cg">'+fmt(p.bv)+'</td>'+
      '<td class="nr" style="color:var(--mut)">'+p.score+'</td>'+
      '</tr>';
  }).join(''):empty6;

  document.getElementById('movers-bottom-body').innerHTML=bottom.length?bottom.map(function(p){
    var ffR=p.ffpct>0?p.ffpct:(p.forsv>0?p.ff/p.forsv*100:0);
    var ffCl=ffR>=T.fysRed?'cr':ffR>0?'ca':'cm';
    return '<tr>'+
      '<td class="mc">'+p.kat+(KAT_NAMES[p.kat]?'<span class="mc-name">'+KAT_NAMES[p.kat]+'</span>':'')+'</td>'+
      '<td class="mc">'+p.bnr+'</td>'+
      '<td class="mc">'+p.ean+'</td>'+
      '<td style="font-size:11px;max-width:160px">'+p.ben+'</td>'+
      '<td class="nr">'+fmt(p.antal)+'</td>'+
      '<td class="nr '+mpC(p.margpct)+'">'+fmtP(p.margpct)+'</td>'+
      '<td class="nr '+ffCl+'">'+fmtP(ffR)+'</td>'+
      '<td class="nr">'+fmt(p.bv)+'</td>'+
      '<td class="nr" style="color:var(--mut)">'+p.score+'</td>'+
      '<td><span class="badge '+TIER_BADGE[p.tier]+'">'+p.tier+'</span></td>'+
      '</tr>';
  }).join(''):empty10;
}

/* Svinn watchlist */

function sortSvinn(field){
  if(svinnSort.field===field)svinnSort.dir=svinnSort.dir==='desc'?'asc':'desc';
  else{svinnSort.field=field;svinnSort.dir='desc';}
  buildSvinn();
}

function buildSvinn(){
  var threshold=parseFloat(document.getElementById('svinn-threshold').value)||0;
  var active=allProducts.filter(function(p){
    var ffR=p.ffpct>0?p.ffpct:(p.forsv>0?p.ff/p.forsv*100:0);
    return ffR>=threshold&&p.antal>0;
  });
  active=active.map(function(p){
    var ffR=p.ffpct>0?p.ffpct:(p.forsv>0?p.ff/p.forsv*100:0);
    return Object.assign({},p,{ffpctCalc:ffR});
  });
  active.sort(function(a,b){
    var va=svinnSort.field==='ffpct'?a.ffpctCalc:a[svinnSort.field];
    var vb=svinnSort.field==='ffpct'?b.ffpctCalc:b[svinnSort.field];
    return svinnSort.dir==='desc'?vb-va:va-vb;
  });
  document.querySelectorAll('#svinn-table th').forEach(function(th){th.classList.remove('asc','desc')});
  var hdField=svinnSort.field==='ffpct'?'svinn-th-ffpct':'svinn-th-'+svinnSort.field;
  var hdEl=document.getElementById(hdField);
  if(hdEl)hdEl.classList.add(svinnSort.dir);
  function fmt(n){return n===0?'–':Math.round(n).toLocaleString('sv')}
  function fmtP(n){return n===0?'–':n.toFixed(1)+'%'}
  var T=getThresholds();
  var mpC=function(v){return v>=T.margGreen?'cg':v>=T.margAmber?'ca':v>0?'cr':''};
  var el=document.getElementById('svinn-body');
  if(!active.length){el.innerHTML='<tr><td colspan="13" style="text-align:center;padding:32px;color:var(--mut)">Inga produkter matchar tröskelvärdet</td></tr>';return;}
  el.innerHTML=active.map(function(p){
    var ffR=p.ffpctCalc;
    return '<tr>'+
      '<td class="mc">'+p.vom+(VOM_NAMES[p.vom]?'<span class="mc-name">'+VOM_NAMES[p.vom]+'</span>':'')+'</td>'+
      '<td class="mc">'+p.kat+(KAT_NAMES[p.kat]?'<span class="mc-name">'+KAT_NAMES[p.kat]+'</span>':'')+'</td>'+
      '<td class="mc">'+p.bnr+'</td>'+
      '<td class="mc">'+p.ean+'</td>'+
      '<td style="font-size:11px;max-width:150px">'+p.ben+'</td>'+
      '<td class="nr">'+fmt(p.antal)+'</td>'+
      '<td class="nr">'+fmt(p.forsv)+'</td>'+
      '<td class="nr cr">'+fmt(p.ff)+'</td>'+
      '<td class="nr cr">'+fmtP(ffR)+'</td>'+
      '<td class="nr">'+fmt(p.marg)+'</td>'+
      '<td class="nr '+mpC(p.margpct)+'">'+fmtP(p.margpct)+'</td>'+
      '<td class="nr">'+fmt(p.bv)+'</td>'+
      '<td><span class="badge '+TIER_BADGE[p.tier]+'">'+p.tier+'</span></td>'+
      '</tr>';
  }).join('');
  requestAnimationFrame(setTableHeight);
}

/* KAT comparison */

function selectKatComp(el){
  var val=el.dataset.val;
  var lbl=el.textContent;
  document.getElementById('katcomp-label').textContent=lbl;
  document.getElementById('katcomp-drop').querySelector('.multi-btn').classList.add('active');
  document.querySelectorAll('.multi-menu.open').forEach(function(m){m.classList.remove('open')});
  katcompCurrentKat=val;
  buildKatComp(val);
}

function filterKatCompMenu(){
  var q=(document.getElementById('katcomp-search').value||'').toLowerCase();
  document.querySelectorAll('.katcomp-opt').forEach(function(el){
    el.classList.toggle('hidden',q.length>0&&el.dataset.lbl.indexOf(q)===-1);
  });
}

function sortKatComp(field){
  if(katcompSort.field===field)katcompSort.dir=katcompSort.dir==='desc'?'asc':'desc';
  else{katcompSort.field=field;katcompSort.dir='desc';}
  if(katcompCurrentKat)buildKatComp(katcompCurrentKat);
}

function buildKatComp(chosenKat){
  var menu=document.getElementById('katcomp-menu');
  if(menu.children.length===0){
    var kats=[...new Set(allProducts.filter(function(p){return p.antal>0&&p.marg>0&&!isExcludedTier(p.tier)}).map(function(p){return p.kat}))].sort();
    var html='<input class="multi-search" id="katcomp-search" type="text" placeholder="Sök KAT..." oninput="filterKatCompMenu()" onclick="event.stopPropagation()">';
    html+=kats.map(function(k){
      var lbl=k+(KAT_NAMES[k]?' – '+KAT_NAMES[k]:'');
      return '<div class="multi-item katcomp-opt" data-val="'+k+'" data-lbl="'+lbl.toLowerCase()+'" onclick="selectKatComp(this)">'+lbl+'</div>';
    }).join('');
    menu.innerHTML=html;
  }
  if(!chosenKat){
    var body=document.getElementById('katcomp-body');
    body.innerHTML='<tr><td colspan="11" style="text-align:center;padding:32px;color:var(--mut)">Välj en KAT ovan</td></tr>';
    return;
  }
  var body=document.getElementById('katcomp-body');
  if(!chosenKat){body.innerHTML='<tr><td colspan="13" style="text-align:center;padding:32px;color:var(--mut)">Välj en KAT ovan</td></tr>';return;}
  var prods=allProducts.filter(function(p){return p.kat===chosenKat&&p.antal>0&&p.marg>0;});
  if(!prods.length){body.innerHTML='<tr><td colspan="13" style="text-align:center;padding:32px;color:var(--mut)">Inga aktiva produkter i denna KAT</td></tr>';return;}
  var avgAntal=prods.reduce(function(s,p){return s+p.antal},0)/prods.length;
  var totMarg=prods.reduce(function(s,p){return s+p.marg},0);
  var totForsv=prods.reduce(function(s,p){return s+p.forsv},0);
  var totFF=prods.reduce(function(s,p){return s+p.ff},0);
  var totBv=prods.reduce(function(s,p){return s+p.bv},0);
  var avgMarg=totForsv>0?totMarg/totForsv*100:0;
  var avgFF=totForsv>0?totFF/totForsv*100:0;
  var avgBv=totBv/prods.length;
  prods=prods.map(function(p){
    var ffR=p.ffpct>0?p.ffpct:(p.forsv>0?p.ff/p.forsv*100:0);
    return Object.assign({},p,{
      ffR:ffR,
      dAntal:p.antal-avgAntal,
      dMarg:p.margpct-avgMarg,
      dFF:ffR-avgFF,
      dBv:p.bv-avgBv
    });
  });
  prods.sort(function(a,b){
    var va=a[katcompSort.field]||0, vb=b[katcompSort.field]||0;
    return katcompSort.dir==='desc'?vb-va:va-vb;
  });
  document.querySelectorAll('#katcomp-table th').forEach(function(th){th.classList.remove('asc','desc')});
  var ths=document.querySelectorAll('#katcomp-table thead th');
  var fieldMap={antal:2,dAntal:3,margpct:4,dMarg:5,ffR:6,dFF:7,bv:8,dBv:9};
  var idx=fieldMap[katcompSort.field];
  if(idx!==undefined&&ths[idx])ths[idx].classList.add(katcompSort.dir);
  function fmt(n){return n===0?'–':Math.round(n).toLocaleString('sv')}
  function fmtP(n){return n===0?'–':n.toFixed(1)+'%'}
  function diff(v,avg,pct){
    var d=v-avg;var s=d>=0?'+':'';
    var cls=d>=0?'cg':'cr';
    return '<span class="'+cls+'">'+s+(pct?d.toFixed(1)+'pp':Math.round(d).toLocaleString('sv'))+'</span>';
  }
  var T=getThresholds();
  var mpC=function(v){return v>=T.margGreen?'cg':v>=T.margAmber?'ca':v>0?'cr':''};
  var avgRow='<tr style="background:var(--surf2);font-weight:600">'+
    '<td class="mc" colspan="3" style="color:var(--mut)">KAT-snitt ('+prods.length+' prod.)</td>'+
    '<td class="nr" style="color:var(--mut)">'+Math.round(avgAntal).toLocaleString('sv')+'</td>'+
    '<td class="nr" style="color:var(--mut)">–</td>'+
    '<td class="nr '+(mpC(avgMarg))+'">'+avgMarg.toFixed(1)+'%</td>'+
    '<td class="nr" style="color:var(--mut)">–</td>'+
    '<td class="nr '+(avgFF>=T.fysRed?'cr':avgFF>0?'ca':'cm')+'">'+avgFF.toFixed(1)+'%</td>'+
    '<td class="nr" style="color:var(--mut)">–</td>'+
    '<td class="nr">'+Math.round(avgBv).toLocaleString('sv')+'</td>'+
    '<td class="nr" style="color:var(--mut)">–</td>'+
    '<td></td>'+
    '</tr>';
  body.innerHTML=avgRow+prods.map(function(p){
    return '<tr>'+
      '<td class="mc">'+p.bnr+'</td>'+
      '<td class="mc">'+p.ean+'</td>'+
      '<td style="font-size:11px;max-width:150px">'+p.ben+'</td>'+
      '<td class="nr">'+fmt(p.antal)+'</td>'+
      '<td class="nr">'+diff(p.antal,avgAntal,false)+'</td>'+
      '<td class="nr '+mpC(p.margpct)+'">'+fmtP(p.margpct)+'</td>'+
      '<td class="nr">'+diff(p.margpct,avgMarg,true)+'</td>'+
      '<td class="nr '+(p.ffR>=T.fysRed?'cr':p.ffR>0?'ca':'cm')+'">'+fmtP(p.ffR)+'</td>'+
      '<td class="nr">'+diff(-p.ffR,-avgFF,true)+'</td>'+
      '<td class="nr">'+fmt(p.bv)+'</td>'+
      '<td class="nr">'+diff(p.bv,avgBv,false)+'</td>'+
      '<td><span class="badge '+TIER_BADGE[p.tier]+'">'+p.tier+'</span></td>'+
      '</tr>';
  }).join('');
  requestAnimationFrame(setTableHeight);
}
