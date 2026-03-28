/* Theme toggle */
function applyTheme(theme){
  document.documentElement.classList.toggle('light',theme==='light');
  var label=theme==='light'?'☾ Mörkt':'☀ Ljust';
  document.getElementById('theme-toggle-upload').textContent=label;
  document.getElementById('theme-toggle-dash').textContent=label;
}
function toggleTheme(){
  var isLight=document.documentElement.classList.contains('light');
  var next=isLight?'dark':'light';
  localStorage.setItem('va-theme',next);
  applyTheme(next);
}
(function(){var t=localStorage.getItem('va-theme')||'dark';applyTheme(t)})();

/* Initialization: drag/drop, event listeners, session restore, reset */

var dz=document.getElementById('drop-zone'),fi=document.getElementById('file-input');
dz.addEventListener('dragover',function(e){e.preventDefault();dz.classList.add('drag-over')});
dz.addEventListener('dragleave',function(){dz.classList.remove('drag-over')});
dz.addEventListener('drop',function(e){e.preventDefault();dz.classList.remove('drag-over');if(e.dataTransfer.files[0])handleFile(e.dataTransfer.files[0])});
fi.addEventListener('change',function(e){if(e.target.files[0])handleFile(e.target.files[0])});

// Close dropdowns when clicking outside
document.addEventListener('click',function(e){
  if(!e.target.closest('.multi-drop')){
    document.querySelectorAll('.multi-menu.open').forEach(function(m){m.classList.remove('open')});
  }
});

// Debounced search
var st;
document.getElementById('search').addEventListener('input',function(){clearTimeout(st);st=setTimeout(renderTable,150)});

// Responsive table height
window.addEventListener('resize',setTableHeight);

function resetApp(){
  allProducts=[];activeTier='all';sortField='score';sortDir='desc';fileName='';highlightMode=false;currentView='products';sumSortState={};
  document.getElementById('dashboard').style.display='none';
  document.getElementById('upload-screen').style.display='flex';
  document.getElementById('file-input').value='';
  document.getElementById('search').value='';
  document.getElementById('sort-sel').value='score|desc';
  document.getElementById('vom-menu').innerHTML='';
  document.getElementById('kat-menu').innerHTML='';
  document.getElementById('vom-label').textContent='Alla VOM';
  document.getElementById('kat-label').textContent='Alla KAT';
  document.getElementById('vom-drop').querySelector('.multi-btn').classList.remove('active');
  document.getElementById('kat-drop').querySelector('.multi-btn').classList.remove('active');
  document.getElementById('hl-btn').classList.remove('active');
  resetWeights();
  setView('products');
  clearErr(false);clearErr(true);
  clearSession();
}

/* Restore previous session on page load */
(function restoreSession(){
  var session=loadSession();
  if(!session)return;

  // Restore weights before scoring (they affect display)
  if(session.weights){
    document.getElementById('w-vol').value=session.weights.vol;
    document.getElementById('w-marg').value=session.weights.marg;
    document.getElementById('w-margpct').value=session.weights.margpct;
    document.getElementById('w-svinn').value=session.weights.svinn;
    document.getElementById('w-bv').value=session.weights.bv;
    // Update sum display without triggering rescore
    var W=getWeights();
    var sumEl=document.getElementById('weights-sum');
    sumEl.textContent=W.sum+'%';
    sumEl.style.color=W.sum===100?'var(--grn)':'var(--red)';
  }

  // Restore state
  fileName=session.fileName||'';
  activeTier=session.activeTier||'all';
  sortField=session.sortField||'score';
  sortDir=session.sortDir||'desc';
  highlightMode=session.highlightMode||false;
  currentView=session.currentView||'products';
  allProducts=session.products;

  // Restore sort dropdown
  var sortOpt=sortField+'|'+sortDir;
  var sel=document.getElementById('sort-sel');
  for(var i=0;i<sel.options.length;i++){if(sel.options[i].value===sortOpt){sel.value=sortOpt;break}}

  // Restore highlight button state
  if(highlightMode)document.getElementById('hl-btn').classList.add('active');

  // Build multi-select menus
  var voms=[...new Set(allProducts.map(function(p){return p.vom}).filter(Boolean))].sort();
  var kats=[...new Set(allProducts.map(function(p){return p.kat}).filter(Boolean))].sort();
  buildMultiMenu('vom-menu','vom-label',voms,'Alla VOM');
  buildMultiMenu('kat-menu','kat-label',kats,'Alla KAT');

  // Restore period and show dashboard
  document.getElementById('period-disp').textContent=session.period||'';
  showDash();
  buildMetrics();
  buildTabs();
  renderTable();
  buildSummaries();
  setView(currentView);
  requestAnimationFrame(setTableHeight);
})();
