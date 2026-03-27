/* File handling and data processing */

function showErr(m,d){var el=document.getElementById(d?'dash-error':'upload-error');el.textContent=m;el.style.display='block'}
function clearErr(d){document.getElementById(d?'dash-error':'upload-error').style.display='none'}
function setLoading(m){document.getElementById('upload-screen').style.display='none';document.getElementById('dashboard').style.display='none';document.getElementById('loading-screen').style.display='flex';document.getElementById('loading-text').textContent=m||'Läser in fil...'}

function handleFile(file){
  fileName=file.name;clearErr(false);setLoading('Läser in fil...');
  var r=new FileReader();
  r.onload=function(e){
    setTimeout(function(){
      try{
        document.getElementById('loading-text').textContent='Analyserar data...';
        var wb=XLSX.read(e.target.result,{type:'array'});
        var ws=wb.Sheets[wb.SheetNames[0]];
        processData(XLSX.utils.sheet_to_json(ws,{header:1,defval:''}));
      }catch(err){showDash();showErr('Kunde inte tolka filen: '+err.message,true)}
    },80);
  };
  r.onerror=function(){document.getElementById('loading-screen').style.display='none';document.getElementById('upload-screen').style.display='flex';showErr('Fel vid inläsning.',false)};
  r.readAsArrayBuffer(file);
}

function processData(rows){
  var period='';
  for(var i=0;i<Math.min(rows.length,8);i++){
    var c=String(rows[i][0]||'');
    if(c.includes('Från Datum')){var m=c.match(/(\d{4}-\d{2}-\d{2})\s+Till Datum:\s+(\d{4}-\d{2}-\d{2})/);if(m)period=m[1]+' → '+m[2];break}
  }
  var hi=-1;
  for(var i=0;i<Math.min(rows.length,30);i++){
    var r=rows[i].map(function(v){return String(v).toLowerCase().trim()});
    if(r.includes('vom')&&r.some(function(v){return v.includes('ean')||v.includes('plu')})&&r.includes('antal')){hi=i;break}
  }
  if(hi===-1){showDash();showErr('Hittade inte kolumnrubriker.',true);return}

  var hdrs=rows[hi].map(function(h){return String(h).trim().toLowerCase()});
  function ci(){
    for(var a=0;a<arguments.length;a++){
      var n=arguments[a],idx=hdrs.indexOf(n);
      if(idx!==-1)return idx;
      idx=hdrs.findIndex(function(h){return h.includes(n)});
      if(idx!==-1)return idx;
    }
    return -1;
  }
  var C={
    vom:ci('vom')!==-1?ci('vom'):0, kat:ci('kat')!==-1?ci('kat'):1,
    ean:ci('ean/plu')!==-1?ci('ean/plu'):2, bnr:ci('bnr')!==-1?ci('bnr'):3,
    ben:ci('ben')!==-1?ci('ben'):4, vara:ci('varutext')!==-1?ci('varutext'):5,
    antal:ci('antal')!==-1?ci('antal'):6,
    forsv:hdrs.indexOf('förs. värde')!==-1?hdrs.indexOf('förs. värde'):8,
    marg:ci('marg. kr')!==-1?ci('marg. kr'):13,
    margpct:hdrs.indexOf('marg. %')!==-1?hdrs.indexOf('marg. %'):15,
    ff:hdrs.indexOf('ff kr')!==-1?hdrs.indexOf('ff kr'):20,
    ffpct:hdrs.indexOf('ff %')!==-1?hdrs.indexOf('ff %'):22,
    bv:hdrs.indexOf('bruttovinst')!==-1?hdrs.indexOf('bruttovinst'):24,
    bvpct:hdrs.indexOf('bv %')!==-1?hdrs.indexOf('bv %'):26
  };

  function tn(v){var n=parseFloat(String(v).replace(',','.'));return isNaN(n)?0:n}
  function ts(v){return String(v==null?'':v).trim()}

  var products=[];
  rows.slice(hi+1).forEach(function(row){
    if(!row||row.length<5)return;
    var vom=row[C.vom];
    if(!vom||isNaN(Number(vom))||Number(vom)===0)return;
    var ean=ts(row[C.ean]);
    if(ean&&!isNaN(+ean))ean=String(Math.round(+ean));
    products.push({
      vom:String(Math.round(+vom)),kat:ts(row[C.kat]),
      ean:ean,bnr:ts(row[C.bnr]),ben:ts(row[C.ben]),vara:ts(row[C.vara]),
      antal:tn(row[C.antal]),forsv:tn(row[C.forsv]),
      marg:tn(row[C.marg]),margpct:tn(row[C.margpct]),
      ff:tn(row[C.ff]),ffpct:tn(row[C.ffpct]),
      bv:tn(row[C.bv]),bvpct:tn(row[C.bvpct])
    });
  });

  if(!products.length){showDash();showErr('Inga produktrader hittades.',true);return}

  var maxA=Math.max.apply(null,products.map(function(p){return p.antal}).concat([1]));
  var maxM=Math.max.apply(null,products.map(function(p){return p.marg}).concat([1]));
  var maxB=Math.max.apply(null,products.map(function(p){return p.bv}).concat([1]));

  var scored=products.map(function(p){
    if(p.bnr&&p.kat&&p.bnr.trim()===p.kat.trim())return Object.assign({},p,{score:0,tier:'Kategoriförsäljning'});
    if(p.kat==='344'||p.kat==='345')return Object.assign({},p,{score:0,tier:'Tobak'});
    if(p.kat==='248'||p.kat==='338'||p.kat==='337'||p.kat==='334'||p.kat==='335'||p.kat==='276'||p.kat==='352')return Object.assign({},p,{score:0,tier:'Ignorerad'});
    if(p.margpct>=99)return Object.assign({},p,{score:0,tier:'Marg 99%'});
    if(p.antal===0||p.antal<0)return Object.assign({},p,{score:0,tier:'Systemfel'});
    if(p.bv<0||p.marg<0)return Object.assign({},p,{score:0,tier:'Ta bort'});
    var vS=(p.antal/maxA)*100, mS=(p.marg/maxM)*100;
    var mpS=Math.min((p.margpct/60)*100,100), bS=(p.bv/maxB)*100;
    var fr=p.forsv>0?p.ff/p.forsv:0, sS=Math.max(0,(1-fr)*100);
    var W=getWeights();
    var sc=Math.round(((vS*W.vol)+(mS*W.marg)+(mpS*W.margpct)+(sS*W.svinn)+(bS*W.bv))*10)/10;
    var bd={vol:Math.round(vS*W.vol*10)/10,marg:Math.round(mS*W.marg*10)/10,margpct:Math.round(mpS*W.margpct*10)/10,svinn:Math.round(sS*W.svinn*10)/10,bv:Math.round(bS*W.bv*10)/10};
    return Object.assign({},p,{score:sc,breakdown:bd,tier:'__pending'});
  });

  var katG={};
  scored.forEach(function(p){
    if(p.tier!=='__pending')return;
    var k=p.kat||'__none';
    if(!katG[k])katG[k]=[];
    katG[k].push(p);
  });
  Object.keys(katG).forEach(function(k){
    var g=katG[k];g.sort(function(a,b){return b.score-a.score});
    var n=g.length;
    g.forEach(function(p,i){var pct=(i+1)/n;p.tier=pct<=.10?'Prioritet':pct<=.40?'Bra':pct<=.80?'Genomsnittlig':'Låg'});
  });
  allProducts=scored;

  var voms=[...new Set(allProducts.map(function(p){return p.vom}).filter(Boolean))].sort();
  var kats=[...new Set(allProducts.map(function(p){return p.kat}).filter(Boolean))].sort();
  buildMultiMenu('vom-menu','vom-label',voms,'Alla VOM');
  buildMultiMenu('kat-menu','kat-label',kats,'Alla KAT');
  document.getElementById('period-disp').textContent=period;

  showDash();buildMetrics();buildTabs();renderTable();buildSummaries();
  requestAnimationFrame(setTableHeight);
  saveSession();
}

function getWeights(){
  var vol=parseFloat(document.getElementById('w-vol').value)||0;
  var marg=parseFloat(document.getElementById('w-marg').value)||0;
  var margpct=parseFloat(document.getElementById('w-margpct').value)||0;
  var svinn=parseFloat(document.getElementById('w-svinn').value)||0;
  var bv=parseFloat(document.getElementById('w-bv').value)||0;
  var sum=vol+marg+margpct+svinn+bv;
  return{vol:vol/100,marg:marg/100,margpct:margpct/100,svinn:svinn/100,bv:bv/100,sum:sum};
}

function updateWeights(){
  var W=getWeights();
  var sumEl=document.getElementById('weights-sum');
  var errEl=document.getElementById('weights-error');
  sumEl.textContent=W.sum+'%';
  sumEl.style.color=W.sum===100?'var(--grn)':'var(--red)';
  ['w-vol','w-marg','w-margpct','w-svinn','w-bv'].forEach(function(id){
    document.getElementById(id).classList.toggle('err',W.sum!==100);
  });
  if(W.sum!==100){
    errEl.textContent='Vikterna summerar till '+W.sum+'% — måste vara exakt 100%.';
    errEl.style.display='block';
    return;
  }
  errEl.style.display='none';
  if(allProducts.length)rescoreAndRender();
}

function rescoreAndRender(){
  var maxA=Math.max.apply(null,allProducts.map(function(p){return p.antal}).concat([1]));
  var maxM=Math.max.apply(null,allProducts.map(function(p){return p.marg}).concat([1]));
  var maxB=Math.max.apply(null,allProducts.map(function(p){return p.bv}).concat([1]));
  var W=getWeights();
  allProducts.forEach(function(p){
    if(isExcludedTier(p.tier))return;
    var vS=(p.antal/maxA)*100, mS=(p.marg/maxM)*100;
    var mpS=Math.min((p.margpct/60)*100,100), bS=(p.bv/maxB)*100;
    var fr=p.forsv>0?p.ff/p.forsv:0, sS=Math.max(0,(1-fr)*100);
    p.score=Math.round(((vS*W.vol)+(mS*W.marg)+(mpS*W.margpct)+(sS*W.svinn)+(bS*W.bv))*10)/10;
    p.breakdown={vol:Math.round(vS*W.vol*10)/10,marg:Math.round(mS*W.marg*10)/10,margpct:Math.round(mpS*W.margpct*10)/10,svinn:Math.round(sS*W.svinn*10)/10,bv:Math.round(bS*W.bv*10)/10};
  });
  var katG={};
  allProducts.forEach(function(p){
    if(isExcludedTier(p.tier))return;
    var k=p.kat||'__none';
    if(!katG[k])katG[k]=[];
    katG[k].push(p);
  });
  Object.keys(katG).forEach(function(k){
    var g=katG[k];g.sort(function(a,b){return b.score-a.score});
    var n=g.length;
    g.forEach(function(p,i){var pct=(i+1)/n;p.tier=pct<=.10?'Prioritet':pct<=.40?'Bra':pct<=.80?'Genomsnittlig':'Låg'});
  });
  buildMetrics();buildTabs();renderTable();buildSummaries();
  saveSession();
}

function resetWeights(){
  document.getElementById('w-vol').value=40;
  document.getElementById('w-marg').value=20;
  document.getElementById('w-margpct').value=15;
  document.getElementById('w-svinn').value=10;
  document.getElementById('w-bv').value=15;
  updateWeights();
}
