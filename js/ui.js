/* UI rendering: dashboard, metrics, tabs, product table, sorting, dropdowns */

function showDash(){
  document.getElementById('loading-screen').style.display='none';
  document.getElementById('upload-screen').style.display='none';
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
  var T=getThresholds();
  var margClass=avgMargP>=T.margGreen?'m-green':avgMargP>=T.margAmber?'m-amber':'m-danger';
  var fysClass=avgSvP>=T.fysRed?'m-danger':'';
  document.getElementById('metrics-grid').innerHTML=
    '<div class="metric" data-tip="Totalt antal unika produktrader i den importerade rapporten"><div class="metric-label">Produkter</div><div class="metric-value">'+p.length+'</div><div class="metric-sub">i rapporten</div></div>'+
    '<div class="metric" data-tip="Totalt antal sålda enheter av alla produkter under rapportens period"><div class="metric-label">Sålda enheter</div><div class="metric-value">'+totalA.toLocaleString('sv')+'</div><div class="metric-sub">perioden</div></div>'+
    '<div class="metric m-blue" data-tip="Total omsättning i kronor – summan av alla produkters försäljningsvärde"><div class="metric-label">Försäljningsvärde</div><div class="metric-value">'+Math.round(totalForsv).toLocaleString('sv')+'</div><div class="metric-sub">kr perioden</div></div>'+
    '<div class="metric '+margClass+'" data-tip="Total marginal i kronor – färg följer Marg %"><div class="metric-label">Total marginal</div><div class="metric-value">'+Math.round(totalMarg).toLocaleString('sv')+'</div><div class="metric-sub">kr perioden</div></div>'+
    '<div class="metric '+margClass+'" data-tip="Genomsnittlig marginalprocent – grön ≥'+T.margGreen+'%, gul ≥'+T.margAmber+'%, röd under"><div class="metric-label">Marg %</div><div class="metric-value">'+avgMargP.toFixed(1)+'%</div><div class="metric-sub">marg/försäljning</div></div>'+
    '<div class="metric '+fysClass+'" data-tip="Fysisk förlust i procent av försäljningsvärdet. Markeras röd vid ≥'+T.fysRed+'%"><div class="metric-label">FYS %</div><div class="metric-value">'+avgSvP.toFixed(1)+'%</div><div class="metric-sub">av försäljning</div></div>'+
    '<div class="metric '+fysClass+'" data-tip="Total fysisk förlust i kronor – summan av allt svinn, stöld och kassation under perioden"><div class="metric-label">Total FYS</div><div class="metric-value">'+Math.round(totalFF).toLocaleString('sv')+'</div><div class="metric-sub">kr förlorat</div></div>'+
    '<div class="metric" data-tip="Bruttovinstprocent – bruttovinst (marginal minus FYS) delat med försäljningsvärde"><div class="metric-label">BV %</div><div class="metric-value">'+avgBvP.toFixed(1)+'%</div><div class="metric-sub">bv/försäljning</div></div>'+
    '<div class="metric" data-tip="Total bruttovinst i kronor – marginal minus fysisk förlust för alla produkter"><div class="metric-label">Total bruttovinst</div><div class="metric-value">'+Math.round(totalBv).toLocaleString('sv')+'</div><div class="metric-sub">kr perioden</div></div>'+
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
  if(v==='weights')v='settings';
  currentView=v;
  var views=['products','vom','kat','movers','svinn','katcomp','charts','alerts'];
  document.querySelectorAll('.view-tab').forEach(function(t,i){
    t.classList.toggle('active',views[i]===v);
  });
  document.getElementById('view-products').style.display=v==='products'?'block':'none';
  ['vom','kat','movers','svinn','katcomp','settings','charts','alerts'].forEach(function(k){
    var el=document.getElementById('view-'+k);
    if(!el)return;
    el.classList.toggle('visible',v===k);
    if(v===k){requestAnimationFrame(setTableHeight);if(k==='movers')buildMovers();if(k==='svinn')buildSvinn();if(k==='katcomp')buildKatComp();if(k==='charts')buildCharts();if(k==='alerts')buildAlerts();}
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

function totalPages(){return pageSize===0?1:Math.max(1,Math.ceil(filteredProducts.length/pageSize))}

function renderPagination(){
  var total=filteredProducts.length;
  var tp=totalPages();
  if(currentPage>tp)currentPage=tp;
  var pg=document.getElementById('pagination');
  if(total<=50&&pageSize===50){pg.style.display='none';return}
  pg.style.display='flex';
  var start=pageSize===0?1:(currentPage-1)*pageSize+1;
  var end=pageSize===0?total:Math.min(currentPage*pageSize,total);
  document.getElementById('page-info').textContent=start+'–'+end+' av '+total;
  document.getElementById('page-first').disabled=currentPage<=1;
  document.getElementById('page-prev').disabled=currentPage<=1;
  document.getElementById('page-next').disabled=currentPage>=tp;
  document.getElementById('page-last').disabled=currentPage>=tp;
  var nums='',lo=Math.max(1,currentPage-2),hi=Math.min(tp,currentPage+2);
  for(var i=lo;i<=hi;i++)nums+='<button class="page-btn'+(i===currentPage?' active':'')+'" onclick="goPage('+i+')">'+i+'</button>';
  document.getElementById('page-nums').innerHTML=nums;
}

function goPage(n){
  var tp=totalPages();
  currentPage=Math.max(1,Math.min(n,tp));
  renderPageRows();
  renderPagination();
  var scroll=document.getElementById('prod-scroll');
  if(scroll)scroll.scrollTop=0;
}

function changePageSize(v){
  pageSize=parseInt(v);
  currentPage=1;
  renderPageRows();
  renderPagination();
}

function renderPageRows(){
  function fmt(n){return n===0?'–':Math.round(n).toLocaleString('sv')}
  function fmtP(n){return n===0?'–':n.toFixed(1)+'%'}
  var tb=document.getElementById('table-body');
  if(!filteredProducts.length){tb.innerHTML='<tr><td colspan="16" style="text-align:center;padding:48px;color:var(--mut)">Inga produkter matchar</td></tr>';return}
  var start=pageSize===0?0:(currentPage-1)*pageSize;
  var end=pageSize===0?filteredProducts.length:Math.min(start+pageSize,filteredProducts.length);
  var page=filteredProducts.slice(start,end);
  var T=getThresholds();
  tb.innerHTML=page.map(function(p,pi){
    var globalIdx=start+pi;
    var bw=Math.round(p.score*.55);
    var bvC=p.bv<0?'cr':p.bv>=T.bvGreenKr?'cg':'';
    var ffRatioDisp=p.ffpct>0?p.ffpct:(p.forsv>0?p.ff/p.forsv*100:0);
    var ffC=ffRatioDisp>=T.fysRed?'cr':'cm';
    var bpC=p.bvpct<0?'cr':(p.bvpct>0&&p.bvpct<T.bvAmberPct?'ca':'');
    var mpC=p.margpct>=T.margGreen?'cg':p.margpct>=T.margAmber?'ca':p.margpct>0?'cr':p.margpct<0?'cr':'';
    var isRem=isExcludedTier(p.tier);
    var hlC=highlightMode?' '+TIER_HL[p.tier]:'';
    var remC=(!highlightMode&&isRem)?'tr-remove':'';
    return '<tr class="'+remC+hlC+'" onclick="openProductModal('+globalIdx+')">'+
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
  filteredProducts=allProducts.filter(function(p){
    if(activeTier!=='all'&&p.tier!==activeTier)return false;
    if(selVoms.length&&selVoms.indexOf(p.vom)===-1)return false;
    if(selKats.length&&selKats.indexOf(p.kat)===-1)return false;
    if(q&&!p.ben.toLowerCase().includes(q)&&!p.vara.toLowerCase().includes(q)&&!p.ean.includes(q)&&!p.bnr.includes(q))return false;
    return true;
  });
  filteredProducts.sort(function(a,b){
    var va=a[sortField],vb=b[sortField];
    if(typeof va==='string')return sortDir==='asc'?va.localeCompare(vb,'sv'):vb.localeCompare(va,'sv');
    return sortDir==='asc'?va-vb:vb-va;
  });
  document.getElementById('row-count').textContent=filteredProducts.length+' produkter';
  currentPage=1;
  renderPageRows();
  renderPagination();
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

/* Product detail modal */

function openProductModal(idx){
  var p=filteredProducts[idx];
  if(!p)return;
  var T=getThresholds();
  function fmt(n){return Math.round(n).toLocaleString('sv')}
  function fmtP(n){return n.toFixed(1)+'%'}
  var mpC=p.margpct>=T.margGreen?'var(--grn)':p.margpct>=T.margAmber?'var(--amb)':'var(--red)';
  var ffR=p.ffpct>0?p.ffpct:(p.forsv>0?p.ff/p.forsv*100:0);
  var ffC=ffR>=T.fysRed?'var(--red)':'var(--mut)';
  var bvC=p.bv<0?'var(--red)':p.bv>=T.bvGreenKr?'var(--grn)':'var(--txt)';

  // Find rank within category
  var katPeers=allProducts.filter(function(x){return x.kat===p.kat&&!isExcludedTier(x.tier)});
  katPeers.sort(function(a,b){return b.score-a.score});
  var rank=katPeers.indexOf(p)+1;
  if(rank===0)rank=katPeers.findIndex(function(x){return x.ean===p.ean&&x.bnr===p.bnr})+1;

  var bd=p.breakdown;
  var maxBd=bd?Math.max(bd.vol,bd.marg,bd.margpct,bd.svinn,bd.bv,1):1;

  var html='<div class="modal-title">'+(p.ben||'–')+'</div>'+
    '<div class="modal-sub">'+(p.vara||'–')+' · EAN: '+(p.ean||'–')+' · BNR: '+(p.bnr||'–')+'</div>'+
    '<div style="display:flex;gap:8px;align-items:center;margin-bottom:16px">'+
      '<span class="badge '+TIER_BADGE[p.tier]+'">'+p.tier+'</span>'+
      '<span style="font-family:var(--mono);font-size:13px;font-weight:700">'+p.score+' poäng</span>'+
      (rank?'<span class="modal-rank" style="color:var(--mut)">Rank <strong style="color:var(--txt)">#'+rank+'</strong> av '+katPeers.length+' i KAT '+(p.kat||'–')+(KAT_NAMES[p.kat]?' – '+KAT_NAMES[p.kat]:'')+'</span>':'')+
    '</div>'+
    '<div class="modal-grid">'+
      '<div class="modal-stat"><div class="modal-stat-label">Antal sålda</div><div class="modal-stat-value">'+fmt(p.antal)+'</div></div>'+
      '<div class="modal-stat"><div class="modal-stat-label">Försäljningsvärde</div><div class="modal-stat-value" style="color:var(--acc2)">'+fmt(p.forsv)+' kr</div></div>'+
      '<div class="modal-stat"><div class="modal-stat-label">Marginal kr</div><div class="modal-stat-value">'+fmt(p.marg)+' kr</div></div>'+
      '<div class="modal-stat"><div class="modal-stat-label">Marginal %</div><div class="modal-stat-value" style="color:'+mpC+'">'+fmtP(p.margpct)+'</div></div>'+
      '<div class="modal-stat"><div class="modal-stat-label">FYS kr</div><div class="modal-stat-value" style="color:'+ffC+'">'+(p.ff>0?fmt(p.ff)+' kr':'–')+'</div></div>'+
      '<div class="modal-stat"><div class="modal-stat-label">FYS %</div><div class="modal-stat-value" style="color:'+ffC+'">'+(ffR>0?fmtP(ffR):'–')+'</div></div>'+
      '<div class="modal-stat"><div class="modal-stat-label">Bruttovinst</div><div class="modal-stat-value" style="color:'+bvC+'">'+fmt(p.bv)+' kr</div></div>'+
      '<div class="modal-stat"><div class="modal-stat-label">BV %</div><div class="modal-stat-value">'+fmtP(p.bvpct)+'</div></div>'+
    '</div>'+
    '<div style="font-size:11px;color:var(--mut)">VOM: '+(p.vom||'–')+(VOM_NAMES[p.vom]?' – '+VOM_NAMES[p.vom]:'')+' · KAT: '+(p.kat||'–')+(KAT_NAMES[p.kat]?' – '+KAT_NAMES[p.kat]:'')+'</div>';

  if(bd){
    var bars=[
      {label:'Volym',val:bd.vol,color:'var(--acc)'},
      {label:'Marginal kr',val:bd.marg,color:'var(--grn)'},
      {label:'Marginal %',val:bd.margpct,color:'var(--acc2)'},
      {label:'Svinnstraff',val:bd.svinn,color:'var(--amb)'},
      {label:'Bruttovinst',val:bd.bv,color:'var(--grn)'}
    ];
    html+='<div class="modal-section">Poängfördelning</div>';
    bars.forEach(function(b){
      var w=maxBd>0?Math.round(b.val/maxBd*100):0;
      html+='<div class="modal-bar-row">'+
        '<span class="modal-bar-label">'+b.label+'</span>'+
        '<div class="modal-bar-wrap"><div class="modal-bar-fill" style="width:'+w+'%;background:'+b.color+'"></div></div>'+
        '<span class="modal-bar-val">'+b.val+'</span></div>';
    });
  }

  document.getElementById('modal-content').innerHTML=html;
  document.getElementById('product-modal').classList.add('open');
}

function closeModal(){
  document.getElementById('product-modal').classList.remove('open');
}

/* Help tooltips */

(function(){
  var tip=document.getElementById('help-tip');
  var titleEl=tip.querySelector('.ht-title');
  var bodyEl=tip.querySelector('.ht-body');
  var hideTimer=null;

  function show(e){
    var el=e.target.closest('[data-tip]');
    if(!el)return;
    clearTimeout(hideTimer);
    var text=el.dataset.tip;
    var labelEl=el.querySelector('.metric-label')||el.querySelector('.tt-label');
    var label=labelEl?labelEl.textContent.trim():el.textContent.trim().replace(/\s+/g,' ');
    if(label.length>40)label=label.substring(0,37)+'…';
    titleEl.textContent=label;
    bodyEl.textContent=text;
    tip.style.display='block';
    var rect=el.getBoundingClientRect();
    var tw=tip.offsetWidth,th=tip.offsetHeight;
    var x=rect.left+(rect.width/2)-(tw/2);
    var y=rect.bottom+8;
    if(x<8)x=8;
    if(x+tw>window.innerWidth-8)x=window.innerWidth-tw-8;
    if(y+th>window.innerHeight-8)y=rect.top-th-8;
    tip.style.left=x+'px';
    tip.style.top=y+'px';
  }

  function hide(){hideTimer=setTimeout(function(){tip.style.display='none'},80)}

  document.addEventListener('mouseenter',function(e){if(e.target.closest('[data-tip]'))show(e)},true);
  document.addEventListener('mouseleave',function(e){if(e.target.closest('[data-tip]'))hide()},true);
})();

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

/* Global search across views */

var gsTimer;
function onGlobalSearch(){
  clearTimeout(gsTimer);
  gsTimer=setTimeout(renderGlobalSearch,120);
}

function renderGlobalSearch(){
  var q=(document.getElementById('global-search').value||'').toLowerCase().trim();
  var res=document.getElementById('global-search-results');
  if(!q||q.length<2||!allProducts.length){
    res.classList.remove('open');
    if(q.length===1)res.innerHTML='<div class="gs-hint">Skriv minst 2 tecken...</div>';
    if(q.length===1){res.classList.add('open')}
    return;
  }
  var matches=allProducts.filter(function(p){
    return (p.ben&&p.ben.toLowerCase().indexOf(q)!==-1)||
           (p.vara&&p.vara.toLowerCase().indexOf(q)!==-1)||
           (p.ean&&p.ean.indexOf(q)!==-1)||
           (p.bnr&&p.bnr.indexOf(q)!==-1);
  }).slice(0,25);

  if(!matches.length){
    res.innerHTML='<div class="gs-empty">Inga produkter matchar s\u00f6kningen</div>';
    res.classList.add('open');
    return;
  }

  function fmt(n){return Math.round(n).toLocaleString('sv')}
  var T=getThresholds();
  res.innerHTML=matches.map(function(p){
    var idx=allProducts.indexOf(p);
    var mpC=p.margpct>=T.margGreen?'cg':p.margpct>=T.margAmber?'ca':p.margpct>0?'cr':'';
    return '<div class="gs-item" onclick="globalSearchSelect('+idx+')">'+
      '<span class="badge '+TIER_BADGE[p.tier]+'" style="font-size:8px;flex-shrink:0">'+p.tier+'</span>'+
      '<div class="gs-item-info">'+
        '<div class="gs-item-name">'+(p.ben||'\u2013')+'</div>'+
        '<div class="gs-item-meta">EAN: '+(p.ean||'\u2013')+' \u00b7 BNR: '+(p.bnr||'\u2013')+' \u00b7 KAT '+(p.kat||'\u2013')+(KAT_NAMES[p.kat]?' \u2013 '+KAT_NAMES[p.kat]:'')+'</div>'+
      '</div>'+
      '<div class="gs-item-stats">'+
        '<div>'+fmt(p.antal)+' st</div>'+
        '<div class="'+mpC+'">'+p.margpct.toFixed(1)+'%</div>'+
      '</div>'+
    '</div>';
  }).join('')+
  (matches.length>=25?'<div class="gs-hint">Visar max 25 tr\u00e4ffar \u2013 f\u00f6rfina s\u00f6kningen</div>':'');
  res.classList.add('open');
}

function globalSearchSelect(idx){
  document.getElementById('global-search').value='';
  document.getElementById('global-search-results').classList.remove('open');
  // Set filteredProducts to allProducts temporarily so modal can find the product
  var p=allProducts[idx];
  if(!p)return;
  filteredProducts=allProducts;
  openProductModal(idx);
}

/* Collapsible legend */

function toggleLegend(){
  var c=document.getElementById('legend-container');
  c.classList.toggle('open');
  try{localStorage.setItem('va-legend-open',c.classList.contains('open')?'1':'0')}catch(e){}
}

(function restoreLegend(){
  var state=localStorage.getItem('va-legend-open');
  // Default to collapsed
  if(state==='1'){
    document.getElementById('legend-container').classList.add('open');
  }
})()
