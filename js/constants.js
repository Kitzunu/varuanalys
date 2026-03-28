/* Global state */
var allProducts=[];
var svinnSort={field:'ff',dir:'desc'};
var katcompSort={field:'score',dir:'desc'};
var activeTier='all';
var sortField='score';
var sortDir='desc';
var fileName='';
var highlightMode=false;
var currentView='products';
var sumSortState={};
var katcompCurrentKat=null;
var currentPage=1;
var pageSize=50;
var filteredProducts=[];

/* Tier configuration */
var TIER_ORDER={Prioritet:0,Bra:1,Genomsnittlig:2,'Låg':3,'Ta bort':4,Systemfel:5,Ignorerad:6,'Marg 99%':7,Kategoriförsäljning:8,Tobak:9};
var TIER_BADGE={Prioritet:'bg-p',Bra:'bg-b',Genomsnittlig:'bg-g','Låg':'bg-l','Ta bort':'bg-r',Systemfel:'bg-r',Ignorerad:'bg-r','Marg 99%':'bg-r',Kategoriförsäljning:'bg-r',Tobak:'bg-r'};
var TIER_PILL={Prioritet:'tp-p',Bra:'tp-b',Genomsnittlig:'tp-g','Låg':'tp-l','Ta bort':'tp-r',Systemfel:'tp-r',Ignorerad:'tp-r','Marg 99%':'tp-r',Kategoriförsäljning:'tp-r',Tobak:'tp-r'};
var TIER_HL={Prioritet:'hl-p',Bra:'hl-b',Genomsnittlig:'hl-g','Låg':'hl-l','Ta bort':'hl-r',Systemfel:'hl-r',Ignorerad:'hl-r','Marg 99%':'hl-r',Kategoriförsäljning:'hl-r',Tobak:'hl-r'};
var BAR_COLOR={Prioritet:'#c8f060',Bra:'#60d4f0',Genomsnittlig:'#888780','Låg':'#f0b860','Ta bort':'#f06060',Systemfel:'#f06060',Ignorerad:'#f06060','Marg 99%':'#f06060',Kategoriförsäljning:'#f06060',Tobak:'#f06060'};

/* Excluded tiers helper */
var EXCLUDED_TIERS=['Ta bort','Systemfel','Ignorerad','Marg 99%','Kategoriförsäljning','Tobak'];
function isExcludedTier(tier){return EXCLUDED_TIERS.indexOf(tier)!==-1}

/* Category names */
var VOM_NAMES={"1101":"Frukt & Grönt","1102":"Blommor","1201":"Bröd","1202":"Mejeri","1301":"Chark","1302":"Kött","1303":"Fisk","1401":"Middagstillbehör","1402":"Drycker & Snacks","1403":"Frukost, Efterrätter & Bak","1404":"Frysen","1405":"Hygien & Hälsa","1406":"Godis","1407":"Husdjur","1408":"Städa","1409":"Tobak & porto","1410":"Barnmat & Blöjor","1501":"Tidningar","1503":"Leksaker","1505":"Hemmet","1506":"Köket","1508":"Aktiv Fritid","1510":"Skriv, kontor & böcker","1513":"Trädgård"};
var KAT_NAMES={"208":"KYLD FISK&SKALDJURSKONSERV","209":"SMÅMÅL MEJERI","210":"VEGETABILISK MEJERI","211":"GRÖNSAKSKONSERVER","212":"BARNMAT","213":"BAKNING","214":"KAFFE, TE & CHOKLAD","215":"FÄRSK FISK&SKALDJUR KFP","216":"OKYLD JUICE & FRUKTDRYCK","218":"FRUKTDRYCKER","219":"MATFETT","220":"ÄGG","221":"FRYST FISK & SKALDJUR","222":"MEJERI","223":"ÖL, VIN OCH CIDER","224":"GODIS","225":"MJUKT MATBRÖD PACKAT","226":"OST (KONSUMENTPACK)","227":"GLASS","228":"LÖSVIKTSGODIS","229":"HÅRT BRÖD & MATKEX","230":"GRÖNSAKER","231":"FRUKT & BÄR","233":"MATCHARK (KONSUMENTPACK)","234":"FÄRDIGMAT (KONSUMENTPACK)","236":"FIKABRÖD","237":"FÄRSK FÅGEL","238":"MANUELL CHARK","239":"FÄRDIGMAT & FISKKONSERVER","240":"FLINGOR & GRYN","241":"PASTA & SÅS","242":"KRYDDOR","243":"HÄLSA","244":"SNACKS","247":"UTLÄNDSKA MATKONCEPT","248":"PANT FÖRSÄLJNING","249":"LÄSK OCH SAFT","250":"MATÖVERKÄNSLIGHET","252":"BUTIKSBAKAT BRÖD","253":"OST (MANUELL)","254":"OLJA VINÄGER","255":"SMAKSÄTTNING","256":"SYLT MOS MARMELAD","257":"MELLANMÅL & EFTERRÄTTER","258":"FÄRSKT KÖTT (KONSUMENTPACK)","259":"FUNKTIONSDRYCKER","261":"TILLBEHÖRSSALLADER","262":"PÅLÄGGSCHARK (KONSUMENTPACK)","264":"DELI (KONSUMENTPACK)","265":"FRYST FÄRDIGLAGAT","266":"FRYST GRÖNSAKER&POTATIS","267":"FRYST FRUKT, BÄR&DESSERT","268":"FRYST FÅGEL","269":"VATTEN","270":"BUTIKSGRILLAT MANUELLT","275":"FÄRSKA VEG PROTEINER","276":"PANT INLÖSEN","311":"GASTRONOMI","314":"HELG & FEST","315":"FÖRVARING TVÄTT & STRY","319":"TVÄTT- & SKÖLJMEDEL","320":"BARNTILLBEHÖR","321":"RENGÖRING","322":"KROPPSVÅRD","323":"TISSUE PAPPER","325":"DJURMAT & TILLBEHÖR","326":"MATEMBALLAGE","327":"ANSIKTSVÅRD","328":"MUNVÅRD MUNHYGIEN","329":"HÅRVÅRD","330":"INTIMHYGIEN","331":"LJUS","332":"SKRIV & KONTOR","334":"TIDSKRIFTER","335":"DAGSTIDNINGAR","336":"LÄKEMEDEL RECEPTFRIA","337":"GRATTISKORT & PRESENTPAPPER","338":"BÄRKASSAR","341":"LEKSAKER","344":"CIGARETTER","345":"SNUS","351":"HÅRBORTTAGNING","352":"PORTO/FÖRKÖPSHÄFTEN","355":"SERVETTER&ENG.MATERIAL","356":"BATTERIER&SÄKRINGAR","357":"TELEKONTANTKORT","358":"UPPLEVELSER&PRESENTKORT","464":"CYKLAR","513":"HOBBY SY & STICKA","533":"LJUSKÄLLOR","550":"BEKÄMPNING & REDSKAP","553":"JORD, GÖDNING & VED","559":"GRILLAR","560":"SOMMARPLANTOR","561":"TRÄDGÅRDSVÄXTER","562":"BLOMMOR","566":"KRUKOR","232":"FÄRSKT KÖTT BUTIKSPACKAT","245":"NATURGODIS LÖSVIKT"};

function vomLabel(id){return id+(VOM_NAMES[id]?' – '+VOM_NAMES[id]:'')}
function katLabel(id){return id+(KAT_NAMES[id]?' – '+KAT_NAMES[id]:'')}

/* Persistence via localStorage */
var STORAGE_KEY='varuanalys';

function saveSession(){
  try{
    var period=document.getElementById('period-disp').textContent||'';
    var weights={
      vol:document.getElementById('w-vol').value,
      marg:document.getElementById('w-marg').value,
      margpct:document.getElementById('w-margpct').value,
      svinn:document.getElementById('w-svinn').value,
      bv:document.getElementById('w-bv').value
    };
    var data={
      v:1,
      fileName:fileName,
      period:period,
      products:allProducts,
      weights:weights,
      activeTier:activeTier,
      sortField:sortField,
      sortDir:sortDir,
      highlightMode:highlightMode,
      currentView:currentView,
      savedAt:Date.now()
    };
    localStorage.setItem(STORAGE_KEY,JSON.stringify(data));
  }catch(e){}
}

function loadSession(){
  try{
    var raw=localStorage.getItem(STORAGE_KEY);
    if(!raw)return null;
    var data=JSON.parse(raw);
    if(!data||!data.v||!data.products||!data.products.length)return null;
    return data;
  }catch(e){return null}
}

function clearSession(){
  try{localStorage.removeItem(STORAGE_KEY)}catch(e){}
}
