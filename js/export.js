/* Excel and PDF export */

function exportExcel(){
  var selVoms=getChecked('vom-menu');
  var selKats=getChecked('kat-menu');
  var q=document.getElementById('search').value.toLowerCase();

  var filtered=allProducts.filter(function(p){
    if(activeTier!=='all'&&p.tier!==activeTier)return false;
    if(selVoms.length&&selVoms.indexOf(p.vom)===-1)return false;
    if(selKats.length&&selKats.indexOf(p.kat)===-1)return false;
    if(q&&!p.ben.toLowerCase().includes(q)&&!p.vara.toLowerCase().includes(q)&&!p.ean.includes(q)&&!p.bnr.includes(q))return false;
    return true;
  });
  filtered.sort(function(a,b){
    var va=a[sortField],vb=b[sortField];
    if(typeof va==='string')return sortDir==='asc'?va.localeCompare(vb,'sv'):vb.localeCompare(va,'sv');
    return sortDir==='asc'?va-vb:vb-va;
  });

  // Sheet 1: Products
  var prodRows=[['VOM','VOM Namn','KAT','KAT Namn','EAN/PLU','BNR','Produkt','Producent','Antal','Förs.värde kr','Marginal kr','Marg %','FYS kr','FYS %','Bruttovinst kr','BV %','Nivå','Poäng']];
  filtered.forEach(function(p){
    var ffR=p.ffpct>0?p.ffpct:(p.forsv>0?p.ff/p.forsv*100:0);
    prodRows.push([
      p.vom, VOM_NAMES[p.vom]||'',
      p.kat, KAT_NAMES[p.kat]||'',
      p.ean, p.bnr, p.ben, p.vara,
      p.antal, p.forsv, p.marg, p.margpct,
      p.ff, Math.round(ffR*10)/10,
      p.bv, p.bvpct,
      p.tier, p.score
    ]);
  });

  // Sheet 2: VOM summary
  var vomRows=[['VOM','Namn','Produkter','Ant. sålda','Förs.värde kr','Marginal kr','Marg %','FYS kr','FYS %','Bruttovinst kr','BV %','Prioritet','Ta bort']];
  var vomG={};
  allProducts.forEach(function(p){
    var k=p.vom||'–';
    if(!vomG[k])vomG[k]={prods:0,antal:0,forsv:0,marg:0,ff:0,bv:0,mPctSum:0,bvPctSum:0,act:0,prio:0,tabort:0};
    var r=vomG[k];r.prods++;r.antal+=p.antal;r.forsv+=p.forsv;r.marg+=p.marg;r.ff+=p.ff;r.bv+=p.bv;
    if(p.antal>0&&p.marg>0){r.mPctSum+=p.margpct;r.bvPctSum+=p.bvpct;r.act++;}
    if(p.tier==='Prioritet')r.prio++;
    if(isExcludedTier(p.tier))r.tabort++;
  });
  Object.keys(vomG).sort().forEach(function(k){
    var r=vomG[k];
    var margPct=r.forsv>0?Math.round(r.marg/r.forsv*1000)/10:0;
    var ffPct=r.forsv>0?Math.round(r.ff/r.forsv*1000)/10:0;
    var bvPct=r.forsv>0?Math.round(r.bv/r.forsv*1000)/10:0;
    vomRows.push([k,VOM_NAMES[k]||'',r.prods,r.antal,Math.round(r.forsv),Math.round(r.marg),margPct,Math.round(r.ff),ffPct,Math.round(r.bv),bvPct,r.prio,r.tabort]);
  });

  // Sheet 3: KAT summary
  var katRows=[['KAT','Namn','Produkter','Ant. sålda','Förs.värde kr','Marginal kr','Marg %','FYS kr','FYS %','Bruttovinst kr','BV %','Prioritet','Ta bort']];
  var katG={};
  allProducts.forEach(function(p){
    var k=p.kat||'–';
    if(!katG[k])katG[k]={prods:0,antal:0,forsv:0,marg:0,ff:0,bv:0,mPctSum:0,bvPctSum:0,act:0,prio:0,tabort:0};
    var r=katG[k];r.prods++;r.antal+=p.antal;r.forsv+=p.forsv;r.marg+=p.marg;r.ff+=p.ff;r.bv+=p.bv;
    if(p.antal>0&&p.marg>0){r.mPctSum+=p.margpct;r.bvPctSum+=p.bvpct;r.act++;}
    if(p.tier==='Prioritet')r.prio++;
    if(isExcludedTier(p.tier))r.tabort++;
  });
  Object.keys(katG).sort().forEach(function(k){
    var r=katG[k];
    var margPct=r.forsv>0?Math.round(r.marg/r.forsv*1000)/10:0;
    var ffPct=r.forsv>0?Math.round(r.ff/r.forsv*1000)/10:0;
    var bvPct=r.forsv>0?Math.round(r.bv/r.forsv*1000)/10:0;
    katRows.push([k,KAT_NAMES[k]||'',r.prods,r.antal,Math.round(r.forsv),Math.round(r.marg),margPct,Math.round(r.ff),ffPct,Math.round(r.bv),bvPct,r.prio,r.tabort]);
  });

  var XS=typeof XLSXStyle!=='undefined'?XLSXStyle:XLSX;
  var wb=XS.utils.book_new();

  function makeSheet(rows,colWidths){
    var ws=XS.utils.aoa_to_sheet(rows);
    ws['!cols']=colWidths.map(function(w){return{wch:w}});
    return ws;
  }

  var GREEN_BG='FFC6EFCE', GREEN_FG='FF006100';
  var AMBER_BG='FFFFEB9C', AMBER_FG='FF9C5700';
  var RED_BG='FFFFC7CE',   RED_FG='FF9C0006';

  function cellStyle(bgArgb,fgArgb){
    return {font:{color:{argb:fgArgb}},fill:{patternType:'solid',fgColor:{argb:bgArgb}}};
  }

  var wsProd=makeSheet(prodRows,[6,16,6,24,12,12,12,8,10,8,10,8,10,8,12,8,14,7]);
  prodRows.forEach(function(row,ri){
    if(ri===0)return;
    var margpct=row[11], ffpct=row[13], tier=row[16];
    var margAddr=XLSX.utils.encode_cell({r:ri,c:11});
    if(!wsProd[margAddr])wsProd[margAddr]={v:row[11],t:'n'};
    if(margpct>32)wsProd[margAddr].s=cellStyle(GREEN_BG,GREEN_FG);
    else if(margpct>30)wsProd[margAddr].s=cellStyle(AMBER_BG,AMBER_FG);
    else if(margpct>0)wsProd[margAddr].s=cellStyle(RED_BG,RED_FG);
    var ffAddr=XLSX.utils.encode_cell({r:ri,c:13});
    if(!wsProd[ffAddr])wsProd[ffAddr]={v:row[13],t:'n'};
    if(ffpct>=2)wsProd[ffAddr].s=cellStyle(RED_BG,RED_FG);
    else if(ffpct>0)wsProd[ffAddr].s=cellStyle(AMBER_BG,AMBER_FG);
    var ffkrAddr=XLSX.utils.encode_cell({r:ri,c:12});
    if(!wsProd[ffkrAddr])wsProd[ffkrAddr]={v:row[12],t:'n'};
    if(ffpct>=2)wsProd[ffkrAddr].s=cellStyle(RED_BG,RED_FG);
    else if(ffpct>0)wsProd[ffkrAddr].s=cellStyle(AMBER_BG,AMBER_FG);
    var tierAddr=XLSX.utils.encode_cell({r:ri,c:16});
    if(!wsProd[tierAddr])wsProd[tierAddr]={v:tier,t:'s'};
    if(tier==='Prioritet')wsProd[tierAddr].s=cellStyle(GREEN_BG,GREEN_FG);
    else if(tier==='Bra')wsProd[tierAddr].s=cellStyle('FFD9EDF7','FF31708F');
    else if(tier==='Låg')wsProd[tierAddr].s=cellStyle(AMBER_BG,AMBER_FG);
    else if(isExcludedTier(tier))wsProd[tierAddr].s=cellStyle(RED_BG,RED_FG);
  });

  function styleSum(rows,ws){
    rows.forEach(function(row,ri){
      if(ri===0)return;
      var margpct=row[6], ffpct=row[8];
      var mAddr=XLSX.utils.encode_cell({r:ri,c:6});
      if(!ws[mAddr])ws[mAddr]={v:margpct,t:'n'};
      if(margpct>32)ws[mAddr].s=cellStyle(GREEN_BG,GREEN_FG);
      else if(margpct>30)ws[mAddr].s=cellStyle(AMBER_BG,AMBER_FG);
      else if(margpct>0)ws[mAddr].s=cellStyle(RED_BG,RED_FG);
      var fAddr=XLSX.utils.encode_cell({r:ri,c:8});
      if(!ws[fAddr])ws[fAddr]={v:ffpct,t:'n'};
      if(ffpct>=2)ws[fAddr].s=cellStyle(RED_BG,RED_FG);
      else if(ffpct>0)ws[fAddr].s=cellStyle(AMBER_BG,AMBER_FG);
    });
    return ws;
  }
  var wsVom=styleSum(vomRows,makeSheet(vomRows,[6,20,8,12,14,12,10,12,10,12,10,8,8]));
  var wsKat=styleSum(katRows,makeSheet(katRows,[6,30,8,12,14,12,10,12,10,12,10,8,8]));

  XS.utils.book_append_sheet(wb,wsProd,'Produkter');
  XS.utils.book_append_sheet(wb,wsVom,'Per VOM');
  XS.utils.book_append_sheet(wb,wsKat,'Per KAT');

  // Sheet 4: Svinn Watchlist
  var svinnThreshold=parseFloat(document.getElementById('svinn-threshold').value)||0;
  var svinnData=allProducts.filter(function(p){
    var ffR=p.ffpct>0?p.ffpct:(p.forsv>0?p.ff/p.forsv*100:0);
    return ffR>=svinnThreshold&&p.antal>0;
  }).map(function(p){
    var ffR=p.ffpct>0?p.ffpct:(p.forsv>0?p.ff/p.forsv*100:0);
    return Object.assign({},p,{ffpctCalc:ffR});
  });
  svinnData.sort(function(a,b){return b.ff-a.ff});
  var svinnRows=[['VOM','VOM Namn','KAT','KAT Namn','BNR','Produkt','Antal','Förs.värde','FYS kr','FYS %','Marg kr','Marg %','BV kr','Nivå']];
  svinnData.forEach(function(p){
    svinnRows.push([p.vom,VOM_NAMES[p.vom]||'',p.kat,KAT_NAMES[p.kat]||'',p.bnr,p.ben,p.antal,Math.round(p.forsv),Math.round(p.ff),Math.round(p.ffpctCalc*10)/10,Math.round(p.marg),Math.round(p.margpct*10)/10,Math.round(p.bv),p.tier]);
  });
  var wsSvinn=makeSheet(svinnRows,[6,20,6,30,8,30,10,12,10,8,10,8,10,14]);
  svinnData.forEach(function(p,ri){
    var ffpct=p.ffpctCalc;
    ['8','9'].forEach(function(ci){
      var addr=XS.utils.encode_cell({r:ri+1,c:parseInt(ci)});
      if(!wsSvinn[addr])return;
      if(ffpct>=2)wsSvinn[addr].s=cellStyle(RED_BG,RED_FG);
      else if(ffpct>0)wsSvinn[addr].s=cellStyle(AMBER_BG,AMBER_FG);
    });
  });
  XS.utils.book_append_sheet(wb,wsSvinn,'Svinn Watchlist');

  // Sheet 5: KAT comparison
  var katCompRows=[['KAT','KAT Namn','BNR','Produkt','Antal','Avvikelse','Marg %','Avvikelse (pp)','FYS %','Avvikelse (pp)','BV kr','Avvikelse','Nivå']];
  var activeKats=[...new Set(allProducts.filter(function(p){return p.antal>0&&p.marg>0&&!isExcludedTier(p.tier)}).map(function(p){return p.kat}))].sort();
  activeKats.forEach(function(k){
    var prods=allProducts.filter(function(p){return p.kat===k&&p.antal>0&&p.marg>0;});
    if(!prods.length)return;
    var avgAntal=prods.reduce(function(s,p){return s+p.antal},0)/prods.length;
    var avgMarg=prods.reduce(function(s,p){return s+p.margpct},0)/prods.length;
    var avgFF=prods.reduce(function(s,p){var r=p.ffpct>0?p.ffpct:(p.forsv>0?p.ff/p.forsv*100:0);return s+r},0)/prods.length;
    var avgBv=prods.reduce(function(s,p){return s+p.bv},0)/prods.length;
    prods.sort(function(a,b){return b.score-a.score}).forEach(function(p){
      var ffR=p.ffpct>0?p.ffpct:(p.forsv>0?p.ff/p.forsv*100:0);
      katCompRows.push([k,KAT_NAMES[k]||'',p.bnr,p.ben,p.antal,Math.round(p.antal-avgAntal),Math.round(p.margpct*10)/10,Math.round((p.margpct-avgMarg)*10)/10,Math.round(ffR*10)/10,Math.round((ffR-avgFF)*10)/10,Math.round(p.bv),Math.round(p.bv-avgBv),p.tier]);
    });
  });
  var wsKatComp=makeSheet(katCompRows,[6,30,8,30,10,12,8,12,8,12,10,12,14]);
  katCompRows.forEach(function(row,ri){
    if(ri===0)return;
    var margpct=row[6],ffpct=row[8];
    var mAddr=XS.utils.encode_cell({r:ri,c:6});
    if(wsKatComp[mAddr]){if(margpct>32)wsKatComp[mAddr].s=cellStyle(GREEN_BG,GREEN_FG);else if(margpct>30)wsKatComp[mAddr].s=cellStyle(AMBER_BG,AMBER_FG);else if(margpct>0)wsKatComp[mAddr].s=cellStyle(RED_BG,RED_FG);}
    var fAddr=XS.utils.encode_cell({r:ri,c:8});
    if(wsKatComp[fAddr]){if(ffpct>=2)wsKatComp[fAddr].s=cellStyle(RED_BG,RED_FG);else if(ffpct>0)wsKatComp[fAddr].s=cellStyle(AMBER_BG,AMBER_FG);}
    var mDiff=row[7];
    var mDAddr=XS.utils.encode_cell({r:ri,c:7});
    if(wsKatComp[mDAddr]){wsKatComp[mDAddr].s=cellStyle(mDiff>=0?GREEN_BG:RED_BG,mDiff>=0?GREEN_FG:RED_FG);}
  });
  XS.utils.book_append_sheet(wb,wsKatComp,'KAT Jämförelse');

  var period=document.getElementById('period-disp').textContent.replace(/[^a-zA-Z0-9åäöÅÄÖ\-_]/g,'_');
  var wbOut=typeof XLSXStyle!=='undefined'?XLSXStyle:XLSX;
  wbOut.writeFile(wb,'Bruttovinst_'+(period||'export')+'.xlsx',{cellStyles:true,bookType:'xlsx'});
  showToast('Excel exporterad med '+allProducts.length+' produkter','success');
}


function exportPDF(){
  var pd=document.getElementById('period-disp'),orig=pd.textContent;
  var tier=activeTier==='all'?'':activeTier;
  var selVoms=getChecked('vom-menu');
  var selKats=getChecked('kat-menu');
  var cnt=document.getElementById('row-count').textContent;
  var parts=[orig,tier,selVoms.length?'VOM: '+selVoms.join(', '):'',selKats.length?'KAT: '+selKats.join(', '):'',cnt].filter(Boolean).join(' · ');
  pd.textContent=parts;
  document.title='Varuanalys'+(orig?' '+orig:'');

  var katContainer=null;
  var shown=[];

  var printView=currentView==='weights'?'products':currentView;

  if(printView==='products'){
    var sortLabels={'score':'Poäng','antal':'Antal sålda','forsv':'Försäljningsvärde','bv':'Bruttovinst','bvpct':'BV %','ff':'FYS','ffpct':'FYS %','marg':'Marginal kr','ben':'Produkt A→Ö'};
    var titleParts=['Produktlista'];
    if(activeTier!=='all')titleParts.push('Nivå: '+activeTier);
    if(selVoms.length)titleParts.push('VOM: '+selVoms.join(', '));
    if(selKats.length)titleParts.push('KAT: '+selKats.join(', '));
    titleParts.push('Sorterat: '+(sortLabels[sortField]||sortField)+' ('+(sortDir==='desc'?'hög→låg':'låg→hög')+')');
    titleParts.push('('+cnt+')');
    document.getElementById('prod-print-title').textContent=titleParts.join(' · ');
    var filteredForPdf=allProducts.filter(function(p){
      if(activeTier!=='all'&&p.tier!==activeTier)return false;
      if(selVoms.length&&selVoms.indexOf(p.vom)===-1)return false;
      if(selKats.length&&selKats.indexOf(p.kat)===-1)return false;
      return true;
    });
    filteredForPdf.sort(function(a,b){var va=a[sortField],vb=b[sortField];if(typeof va==='string')return sortDir==='asc'?va.localeCompare(vb,'sv'):vb.localeCompare(va,'sv');return sortDir==='asc'?va-vb:vb-va;});
    var katOrderP=[],katMapP={};
    filteredForPdf.forEach(function(p){var k=p.kat||'–';if(!katMapP[k]){katMapP[k]=[];katOrderP.push(k);}katMapP[k].push(p);});
    function fmtP2(n){return n===0?'–':n.toFixed(1)+'%'}
    function fmt2(n){return n===0?'–':Math.round(n).toLocaleString('sv')}
    var thRow='<thead><tr><th>BNR</th><th>EAN</th><th>Produkt</th><th>Producent</th><th style="text-align:right">Antal</th><th style="text-align:right">Förs.värde</th><th style="text-align:right">Marg kr</th><th style="text-align:right">Marg%</th><th style="text-align:right">FYS kr</th><th style="text-align:right">FYS%</th><th style="text-align:right">BV kr</th><th style="text-align:right">BV%</th><th>Nivå</th><th style="text-align:right">Poäng</th></tr></thead>';
    var katHtml=katOrderP.map(function(k){
      var name=KAT_NAMES[k]||'';
      var rows=katMapP[k].map(function(p){
        var ffR=p.ffpct>0?p.ffpct:(p.forsv>0?p.ff/p.forsv*100:0);
        var mpC2=p.margpct>32?'color:var(--grn)':p.margpct>30?'color:var(--amb)':p.margpct>0?'color:var(--red)':'';
        var ffC2=ffR>=2?'color:var(--red)':ffR>0?'color:var(--amb)':'';
        var bvC2=p.bv<0?'color:var(--red)':p.bv>5000?'color:var(--grn)':'';
        var tierC={'Prioritet':'color:#3a6000;background:#d4f080','Bra':'color:var(--acc2);background:#d0f0f8','Låg':'color:#7a4800;background:#fff0d0','Ta bort':'color:#900;background:#ffe0e0','Genomsnittlig':'color:#555;background:#f0f0f0'}[p.tier]||'color:#666;background:#ffe0e0';
        return '<tr><td class="mc">'+p.bnr+'</td><td class="mc">'+p.ean+'</td>'+
          '<td style="font-size:8px">'+p.ben+'</td><td style="font-size:7.5px;color:#666">'+p.vara+'</td>'+
          '<td style="text-align:right">'+fmt2(p.antal)+'</td>'+
          '<td style="text-align:right;color:var(--acc2)">'+fmt2(p.forsv)+'</td>'+
          '<td style="text-align:right;color:var(--grn)">'+fmt2(p.marg)+'</td>'+
          '<td style="text-align:right;'+mpC2+'">'+fmtP2(p.margpct)+'</td>'+
          '<td style="text-align:right;'+ffC2+'">'+fmt2(p.ff)+'</td>'+
          '<td style="text-align:right;'+ffC2+'">'+fmtP2(ffR)+'</td>'+
          '<td style="text-align:right;'+bvC2+';color:var(--grn)">'+fmt2(p.bv)+'</td>'+
          '<td style="text-align:right">'+fmtP2(p.bvpct)+'</td>'+
          '<td style="font-size:7px;font-weight:700;padding:1px 3px;border-radius:2px;'+tierC+'">'+p.tier+'</td>'+
          '<td style="text-align:right;color:var(--mut)">'+p.score+'</td></tr>';
      }).join('');
      return '<div class="pdf-kat-section"><div class="pdf-kat-title">'+k+(name?' – '+name:'')+'</div><table>'+thRow+'<tbody>'+rows+'</tbody></table></div>';
    }).join('');
    katContainer=document.createElement('div');
    katContainer.id='pdf-kat-container';
    katContainer.innerHTML=katHtml;
    document.querySelector('.main').appendChild(katContainer);
  } else if(printView==='vom'||printView==='kat'||printView==='movers'||printView==='svinn'||printView==='katcomp'){
    var el=document.getElementById('view-'+printView);
    el.classList.add('print-visible');
    shown.push(el);
  }

  showToast('PDF f\u00f6rbereds f\u00f6r utskrift...','info');
  window.print();
  setTimeout(function(){
    pd.textContent=orig;
    document.getElementById('prod-print-title').textContent='Produktlista';
    shown.forEach(function(el){el.classList.remove('print-visible')});
    if(katContainer)katContainer.remove();
    setView(currentView);
  },500);
}
