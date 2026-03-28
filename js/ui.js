/* UI rendering: dashboard, metrics, tabs, product table, sorting, dropdowns */

function showDash(){
  document.getElementById('loading-screen').style.display='none';
  document.getElementById('upload-screen').style.display='none';
  document.getElementById('theme-toggle-upload').style.display='none';
  document.getElementById('dashboard').style.display='block';
  document.getElementById('file-name-disp').textContent=fileName;
}

function setTableHeight(){
  ['prod-scroll','.sum-scroll'].forEach(function(sel){
    var el=sel.startsWith('.')?document.querySelector(sel):document.getElementById(sel);
    if(!el||el.getBoundingClientRect().top===0)return;
    var top=el.getBoundingClientRect().top;
    el.style.maxHeight=Math.max(200,window.innerHeight-top-16)+'px';
  });
  document.querySelectorAll('.sum-scroll').forEach(function(el){
    var top=el.getBoundingClientRect().top;
    if(top>0)el.style.maxHeight=Math.max(200,window.innerHeight-top-16)+'px';
  });
}

function buildMetrics(){
  var p=allProducts;
  var totalA=p.reduce(function(s,x){return s+x.antal},0);
  var totalForsv=p.reduce(function(s,x){return s+x.forsv},0);
  var totalBv=p.reduce(function(s,x){return s+x.bv},0);
  var totalFF=p.reduce(function(s,x){return s+x.ff},0);
  var totalMarg=p.reduce(function(s,x){return s+x.marg},0);
  var avgBvP=totalForsv>0?totalBv/totalForsv*100:0;
  var avgMargP=totalForsv>0?totalMarg/totalForsv*100:0;
  var avgSvP=totalForsv>0?totalFF/totalForsv*100:0;
  var prio=p.filter(function(x){return x.tier==='Prioritet'}).length;
  var tb=p.filter(function(x){return isExcludedTier(x.tier)}).length;
  document.getElementById('metrics-grid').innerHTML=
    '<div class="metric"><div class="metric-label">Produkter</div><div class="metric-value">'+p.length+'</div><div class="metric-sub">i rapporten</div></div>'+
    '<div class="metric"><div class="metric-label">Sålda enheter</div><div class="metric-value">'+totalA.toLocaleString('sv')+'</div><div class="metric-sub">perioden</div></div>'+
    '<div class="metric m-blue"><div class="metric-label">Försäljningsvärde</div><div class="metric-value">'+Math.round(totalForsv).toLocaleString('sv')+'</div><div class="metric-sub">kr perioden</div></div>'+
    '<div class="metric m-green"><div class="metric-label">Total marginal</div><div class="metric-value">'+Math.round(totalMarg).toLocaleString('sv')+'</div><div class="metric-sub">kr perioden</div></div>'+
    '<div class="metric m-green"><div class="metric-label">Marg %</div><div class="metric-value">'+avgMargP.toFixed(1)+'%</div><div class="metric-sub">marg/försäljning</div></div>'+
    '<div class="metric '+(avgSvP>=2?'m-danger':'')+'"'+'><div class="metric-label">FYS %</div><div class="metric-value">'+avgSvP.toFixed(1)+'%</div><div class="metric-sub">av försäljning</div></div>'+
    '<div class="metric '+(avgSvP>=2?'m-danger':'')+'"><div class="metric-label">Total FYS</div><div class="metric-value">'+Math.round(totalFF).toLocaleString('sv')+'</div><div class="metric-sub">kr förlorat</div></div>'+
    '<div class="metric"><div class="metric-label">BV %</div><div class="metric-value">'+avgBvP.toFixed(1)+'%</div><div class="metric-sub">bv/försäljning</div></div>'+
    '<div class="metric"><div class="metric-label">Total bruttovinst</div><div class="metric-value">'+Math.round(totalBv).toLocaleString('sv')+'</div><div class="metric-sub">kr perioden</div></div>'+
    '';
}

function buildTabs(){
  var c={};allProducts.forEach(function(p){c[p.tier]=(c[p.tier]||0)+1});
  var h='<button class="tab-pill '+(activeTier==='all'?'tp-all':'')+'" onclick="setTier(\'all\')">Alla ('+allProducts.length+')</button>';
  ['Prioritet','Bra','Genomsnittlig','Låg','Ta bort','Systemfel','Ignorerad','Marg 99%','Kategoriförsäljning','Tobak'].forEach(function(t){
    if(!c[t])return;
    h+='<button class="tab-pill '+(activeTier===t?TIER_PILL[t]:'')+'" onclick="setTier(\''+t+'\')">'+t+' ('+c[t]+')</button>';
  });
  document.getElementById('tier-tabs').innerHTML=h;
}

function setTier(t){activeTier=t;buildTabs();renderTable();saveSession()}

function setView(v){
  currentView=v;
  var views=['products','vom','kat','movers','svinn','katcomp','charts'];
  document.querySelectorAll('.view-tab').forEach(function(t,i){
    t.classList.toggle('active',views[i]===v);
  });
  document.getElementById('view-products').style.display=v==='products'?'block':'none';
  ['vom','kat','movers','svinn','katcomp','weights','charts'].forEach(function(k){
    var el=document.getElementById('view-'+k);
    el.classList.toggle('visible',v===k);
    if(v===k){requestAnimationFrame(setTableHeight);if(k==='movers')buildMovers();if(k==='svinn')buildSvinn();if(k==='katcomp')buildKatComp();if(k==='charts')buildCharts();}
  });
  if(allProducts.length)saveSession();
}

function toggleHighlight(){
  highlightMode=!highlightMode;
  document.getElementById('hl-btn').classList.toggle('active',highlightMode);
  renderTable();
  saveSession();
}

function sortCol(th){
  var f=th.dataset.field;
  if(sortField===f)sortDir=sortDir==='desc'?'asc':'desc';
  else{sortField=f;sortDir='desc';}
  var opt=sortField+'|'+sortDir,sel=document.getElementById('sort-sel');
  for(var i=0;i<sel.options.length;i++){if(sel.options[i].value===opt){sel.value=opt;break}}
  renderTable();
  saveSession();
}

function renderTable(){
  var parts=document.getElementById('sort-sel').value.split('|');
  sortField=parts[0];sortDir=parts[1];
  var q=document.getElementById('search').value.toLowerCase();
  var selVoms=getChecked('vom-menu');
  var selKats=getChecked('kat-menu');
  document.querySelectorAll('#col-row th').forEach(function(th){
    th.classList.remove('asc','desc');
    if(th.dataset.field===sortField)th.classList.add(sortDir==='asc'?'asc':'desc');
  });
  var flt=allProducts.filter(function(p){
    if(activeTier!=='all'&&p.tier!==activeTier)return false;
    if(selVoms.length&&selVoms.indexOf(p.vom)===-1)return false;
    if(selKats.length&&selKats.indexOf(p.kat)===-1)return false;
    if(q&&!p.ben.toLowerCase().includes(q)&&!p.vara.toLowerCase().includes(q)&&!p.ean.includes(q)&&!p.bnr.includes(q))return false;
    return true;
  });
  flt.sort(function(a,b){
    var va=a[sortField],vb=b[sortField];
    if(typeof va==='string')return sortDir==='asc'?va.localeCompare(vb,'sv'):vb.localeCompare(va,'sv');
    return sortDir==='asc'?va-vb:vb-va;
  });
  document.getElementById('row-count').textContent=flt.length+' produkter';
  function fmt(n){return n===0?'–':Math.round(n).toLocaleString('sv')}
  function fmtP(n){return n===0?'–':n.toFixed(1)+'%'}
  var tb=document.getElementById('table-body');
  if(!flt.length){tb.innerHTML='<tr><td colspan="16" style="text-align:center;padding:48px;color:var(--mut)">Inga produkter matchar</td></tr>';return}
  tb.innerHTML=flt.map(function(p){
    var bw=Math.round(p.score*.55);
    var bvC=p.bv<0?'cr':p.bv>5000?'cg':'';
    var ffRatioDisp=p.ffpct>0?p.ffpct:(p.forsv>0?p.ff/p.forsv*100:0);
    var ffC=ffRatioDisp>=2?'cr':'cm';
    var bpC=p.bvpct<0?'cr':(p.bvpct>0&&p.bvpct<10?'ca':'');
    var mpC=p.margpct>32?'cg':p.margpct>30?'ca':p.margpct>0?'cr':p.margpct<0?'cr':'';
    var isRem=isExcludedTier(p.tier);
    var hlC=highlightMode?' '+TIER_HL[p.tier]:'';
    var remC=(!highlightMode&&isRem)?'tr-remove':'';
    return '<tr class="'+remC+hlC+'">'+
      '<td class="mc">'+(p.vom||'–')+(VOM_NAMES[p.vom]?'<span class="mc-name">'+VOM_NAMES[p.vom]+'</span>':'')+'</td>'+
      '<td class="mc">'+(p.kat||'–')+(KAT_NAMES[p.kat]?'<span class="mc-name">'+KAT_NAMES[p.kat]+'</span>':'')+'</td>'+
      '<td class="mc">'+(p.ean||'–')+'</td>'+
      '<td class="mc">'+(p.bnr||'–')+'</td>'+
      '<td style="max-width:140px;font-size:11px">'+(p.ben||'–')+'</td>'+
      '<td style="max-width:110px;font-size:10px;color:var(--mut)">'+(p.vara||'–')+'</td>'+
      '<td class="nr">'+fmt(p.antal)+'</td>'+
      '<td class="nr" style="color:var(--acc2)">'+fmt(p.forsv)+'</td>'+
      '<td class="nr">'+(p.marg!==0?fmt(p.marg):'–')+'</td>'+
      '<td class="nr '+mpC+'">'+fmtP(p.margpct)+'</td>'+
      '<td class="nr '+ffC+'">'+(p.ff>0?fmt(p.ff):'–')+'</td>'+
      '<td class="nr '+ffC+'">'+(ffRatioDisp>0?fmtP(ffRatioDisp):'–')+'</td>'+
      '<td class="nr '+bvC+'">'+fmt(p.bv)+'</td>'+
      '<td class="nr '+bpC+'">'+fmtP(p.bvpct)+'</td>'+
      '<td><span class="badge '+TIER_BADGE[p.tier]+'">'+p.tier+'</span></td>'+
      '<td class="nr"><div class="sw" '+
        (p.breakdown?'onmouseenter="showScoreTip(event,this)" onmouseleave="hideTip()" data-score="'+p.score+'" data-bd="'+encodeURIComponent(JSON.stringify(p.breakdown))+'"':'')+
        '><div class="sb" style="width:'+bw+'px;background:'+BAR_COLOR[p.tier]+';opacity:.5"></div><span class="sn">'+p.score+'</span></div><span class="print-score" style="display:none">'+p.score+'</span></td>'+
      '</tr>';
  }).join('');
}

/* Multi-select dropdown helpers */

function buildMultiMenu(menuId,labelId,items,allLabel){
  var isVom=menuId.includes('vom'),isKat=menuId.includes('kat');
  var menu=document.getElementById(menuId);
  var searchId=menuId+'-search';
  var html='';
  if(isKat){
    html+='<input class="multi-search" id="'+searchId+'" type="text" placeholder="Sök KAT..." oninput="filterMultiMenu(\''+menuId+'\')" onclick="event.stopPropagation()">';
  }
  html+='<div class="multi-menu-header">'+
    '<button onclick="setAllChecked(\''+menuId+'\',true)">Välj alla</button>'+
    '<button onclick="setAllChecked(\''+menuId+'\',false)">Rensa</button>'+
    '</div>';
  html+=items.map(function(v){
    var lbl=isVom?(v+(VOM_NAMES[v]?' – '+VOM_NAMES[v]:''))
           :isKat?(v+(KAT_NAMES[v]?' – '+KAT_NAMES[v]:''))
           :v;
    return '<label class="multi-item" data-lbl="'+lbl.toLowerCase()+'"><input type="checkbox" value="'+v+'" onchange="onMultiChange(\''+menuId+'\',\''+labelId+'\',\''+allLabel+'\')"> '+lbl+'</label>';
  }).join('');
  menu.innerHTML=html;
}

function filterMultiMenu(menuId){
  var q=(document.getElementById(menuId+'-search').value||'').toLowerCase();
  document.querySelectorAll('#'+menuId+' .multi-item').forEach(function(el){
    el.classList.toggle('hidden',q.length>0&&el.dataset.lbl.indexOf(q)===-1);
  });
}

function getChecked(menuId){
  var cbs=document.querySelectorAll('#'+menuId+' input[type=checkbox]:checked');
  return Array.prototype.map.call(cbs,function(cb){return cb.value});
}

function setAllChecked(menuId,state){
  document.querySelectorAll('#'+menuId+' input[type=checkbox]').forEach(function(cb){cb.checked=state});
  var labelId=menuId.replace('-menu','-label');
  var allLabel=menuId.replace('-menu','').replace('vom','Alla VOM').replace('kat','Alla KAT');
  updateMultiLabel(menuId,labelId,allLabel);
  renderTable();
}

function onMultiChange(menuId,labelId,allLabel){
  updateMultiLabel(menuId,labelId,allLabel);
  renderTable();
}

function updateMultiLabel(menuId,labelId,allLabel){
  var sel=getChecked(menuId);
  var btn=document.getElementById(menuId).closest('.multi-drop').querySelector('.multi-btn');
  if(sel.length===0){
    document.getElementById(labelId).textContent=allLabel;
    btn.classList.remove('active');
  } else if(sel.length===1){
    document.getElementById(labelId).textContent=sel[0];
    btn.classList.add('active');
  } else {
    document.getElementById(labelId).textContent=sel.length+' valda';
    btn.classList.add('active');
  }
}

function toggleDrop(dropId){
  var menu=document.getElementById(dropId).querySelector('.multi-menu');
  var isOpen=menu.classList.contains('open');
  document.querySelectorAll('.multi-menu.open').forEach(function(m){m.classList.remove('open')});
  if(!isOpen)menu.classList.add('open');
}

/* Score tooltip */

function showScoreTip(e,el){
  var total=el.dataset.score;
  var bd=JSON.parse(decodeURIComponent(el.dataset.bd));
  var W=getWeights();
  var pcts={vol:Math.round(W.vol*100),marg:Math.round(W.marg*100),margpct:Math.round(W.margpct*100),svinn:Math.round(W.svinn*100),bv:Math.round(W.bv*100)};
  document.getElementById('tt-vol').textContent=bd.vol+' pts';
  document.getElementById('tt-marg').textContent=bd.marg+' pts';
  document.getElementById('tt-margpct').textContent=bd.margpct+' pts';
  document.getElementById('tt-svinn').textContent=bd.svinn+' pts';
  document.getElementById('tt-bv').textContent=bd.bv+' pts';
  document.getElementById('tt-total').textContent=total+' pts';
  var rows=document.querySelectorAll('#score-tooltip .tt-label');
  rows[0].textContent='Volym ('+pcts.vol+'%)';
  rows[1].textContent='Marginal kr ('+pcts.marg+'%)';
  rows[2].textContent='Marginal % ('+pcts.margpct+'%)';
  rows[3].textContent='Svinnstraff ('+pcts.svinn+'%)';
  rows[4].textContent='Bruttovinst ('+pcts.bv+'%)';
  var tip=document.getElementById('score-tooltip');
  tip.style.display='block';
  var x=e.clientX+14, y=e.clientY-10;
  if(x+220>window.innerWidth)x=e.clientX-230;
  tip.style.left=x+'px';
  tip.style.top=y+'px';
}

function hideTip(){document.getElementById('score-tooltip').style.display='none'}
