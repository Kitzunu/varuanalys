/* Initialization: drag/drop, event listeners, reset */

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
}
