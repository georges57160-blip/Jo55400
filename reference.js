(function(){
var NAV=['phylum','classe','ordre','famille','genre','espece'];
var biblio=[],refPath=[],lastFind=null,refDb=null,cmpUrlA=null,cmpUrlB=null,cmpBlob=null,timer=null;

var st=document.createElement('style');
st.textContent=
'#refGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:10px}'+
'.rcell{background:#fff;border-radius:10px;padding:8px;cursor:pointer}'+
'.rcell img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;background:#ddd}'+
'.rcell b{display:block;margin-top:6px;font-size:.95em}'+
'.rcell small{color:#555}'+
'#refBanner{background:#f0c070;padding:10px;border-radius:8px;margin-bottom:8px}'+
'#refProg{margin-top:8px;font-size:.9em}'+
'#compare{position:fixed;top:0;left:0;right:0;bottom:0;background:#111;z-index:3500;display:none;flex-direction:column;gap:6px;padding:8px;box-sizing:border-box}'+
'#compare .pane{flex:1;min-height:0;display:flex;flex-direction:column;align-items:center}'+
'#compare img{flex:1;min-height:0;max-width:100%;object-fit:contain}'+
'#compare small{color:#fff;padding-top:2px}'+
'#compare .bar{display:flex;gap:8px}'+
'#compare .bar button{flex:1;padding:12px;font-size:1em;border:0;border-radius:8px}';
document.head.appendChild(st);

var navBtn=document.createElement('button');
navBtn.setAttribute('data-s','refTab');
navBtn.textContent='📚 Réf.';
navBtn.onclick=function(){show('refTab');};
document.querySelector('nav').appendChild(navBtn);

var sec=document.createElement('section');
sec.id='refTab'; sec.hidden=true;
sec.innerHTML=
'<div id="refBanner" hidden></div>'+
'<input id="refSearch" placeholder="🔍 Chercher (espèce, genre, famille…)">'+
'<div id="refCrumb" class="btns"></div>'+
'<div id="refGrid"></div>'+
'<p id="refMsg"></p>'+
'<button class="act sec" id="packBtn">📥 Importer la bibliothèque (champi.pack)</button>'+
'<input type="file" id="packFile" accept=".pack,application/octet-stream" hidden>'+
'<div id="refProg"></div>';
document.body.insertBefore(sec,$('lightbox'));

var cmp=document.createElement('div');
cmp.id='compare';
cmp.innerHTML=
'<div class="pane"><img id="cmpA" alt="Ma trouvaille"><small>Ma trouvaille (toucher pour agrandir)</small></div>'+
'<div class="pane"><img id="cmpB" alt="Référence"><small id="cmpName"></small></div>'+
'<div class="bar"><button id="cmpOther">↩ Autre référence</button><button id="cmpEnd">✕ Terminer</button></div>';
document.body.insertBefore(cmp,$('lightbox'));

function openRef(){
  if(refDb) return Promise.resolve();
  return new Promise(function(res,rej){
    var r=indexedDB.open('champi-ref',1);
    r.onupgradeneeded=function(){
      r.result.createObjectStore('items',{keyPath:'id'});
      r.result.createObjectStore('meta');
    };
    r.onsuccess=function(){refDb=r.result;res();};
    r.onerror=function(){rej(r.error);};
  });
}
function rtx(store,mode,fn){
  return new Promise(function(res,rej){
    var t=refDb.transaction(store,mode),r=fn(t.objectStore(store));
    t.oncomplete=function(){res(r&&r.result);};
    t.onerror=t.onabort=function(){rej(t.error);};
  });
}
function getItem(id){return rtx('items','readonly',function(s){return s.get(id);});}

function label(e){return e.espece||e.genre||e.famille||e.ordre||e.classe||e.phylum||'Non classé';}
function subLabel(e){
  if(e.espece&&e.famille) return e.famille;
  if(!e.espece&&e.famille) return 'espèce non précisée';
  return '';
}
function showBlob(b,txt){
  if(lightUrl) URL.revokeObjectURL(lightUrl);
  lightUrl=URL.createObjectURL(b);
  $('lightboxImg').src=lightUrl;
  $('lightboxTxt').textContent=txt;
  $('lightbox').style.display='flex';
}

async function importPack(file){
  if(!file) return;
  var prog=$('refProg');
  try{
    await openRef();
    var n=new DataView(await file.slice(0,4).arrayBuffer()).getUint32(0);
    var idx=JSON.parse(await file.slice(4,4+n).text());
    var base=4+n;
    await rtx('items','readwrite',function(s){return s.clear();});
    for(var i=0;i<idx.length;i+=25){
      var part=idx.slice(i,i+25);
      await rtx('items','readwrite',function(s){
        part.forEach(function(e){
          s.put({id:e.id,
            photo:file.slice(base+e.p[0],base+e.p[0]+e.p[1],'image/jpeg'),
            thumb:file.slice(base+e.t[0],base+e.t[0]+e.t[1],'image/jpeg')});
        });
      });
      prog.textContent='Import : '+Math.min(i+25,idx.length)+' / '+idx.length;
    }
    var meta=idx.map(function(e){
      var c={};for(var k in e){if(k!=='p'&&k!=='t')c[k]=e[k];}return c;
    });
    await rtx('meta','readwrite',function(s){return s.put(meta,'index');});
    biblio=meta;refPath=[];
    prog.textContent='✅ '+idx.length+' photos importées.';
    renderRef();
  }catch(err){
    prog.textContent='❌ Import impossible : '+(err&&err.message?err.message:err);
  }
}

function addCell(grid,e,title,sub,fn){
  var c=document.createElement('div');c.className='rcell';
  var im=document.createElement('img');im.alt=title;c.appendChild(im);
  var b=document.createElement('b');b.textContent=title;c.appendChild(b);
  var s=document.createElement('small');s.textContent=sub;c.appendChild(s);
  c.onclick=fn;grid.appendChild(c);
  getItem(e.id).then(function(it){
    if(it&&it.thumb){
      im.onload=function(){URL.revokeObjectURL(im.src);};
      im.src=URL.createObjectURL(it.thumb);
    }
  }).catch(function(){});
}

function renderRef(){
  var grid=$('refGrid');grid.innerHTML='';
  var crumb=$('refCrumb');crumb.innerHTML='';
  if(!biblio.length){
    $('refMsg').textContent='Bibliothèque vide : importez champi.pack avec le bouton ci-dessous.';
    return;
  }
  var q=$('refSearch').value.toLowerCase().trim();
  var list=biblio.filter(function(e){
    if(q) return NAV.map(function(k){return e[k]||'';}).join(' ').toLowerCase().indexOf(q)!==-1;
    for(var i=0;i<refPath.length;i++){
      if((e[NAV[i]]||'Non classé')!==refPath[i]) return false;
    }
    return true;
  });
  if(!q){
    makeBtn(crumb,'🏠',function(){refPath=[];renderRef();});
    refPath.forEach(function(v,i){
      makeBtn(crumb,v,function(){refPath=refPath.slice(0,i+1);renderRef();});
    });
  }
  var LIMIT=150;
  var singles=q||refPath.length>=NAV.length||list.length<=12||(refPath.length>0&&refPath[refPath.length-1]==='Non classé');
  if(singles){
    list.sort(function(a,b){return label(a).localeCompare(label(b),'fr');})
      .slice(0,LIMIT).forEach(function(e){
        addCell(grid,e,label(e),subLabel(e),function(){pickOrView(e);});
      });
  }else{
    var key=NAV[refPath.length],groups={};
    list.forEach(function(e){
      var v=e[key]||'Non classé';
      (groups[v]=groups[v]||[]).push(e);
    });
    Object.keys(groups).sort(function(a,b){return a.localeCompare(b,'fr');})
      .slice(0,LIMIT).forEach(function(name){
        var items=groups[name];
        addCell(grid,items[0],name,items.length+' photo(s)',function(){
          refPath=refPath.concat([name]);renderRef();
        });
      });
  }
  $('refMsg').textContent=list.length+' photo(s)'+(singles&&list.length>LIMIT?' (150 affichées, affinez la recherche)':'');
}

async function pickOrView(e){
  var it=await getItem(e.id);
  if(!it) return;
  if(lastFind) showCompare(it.photo,label(e));
  else if(window.refView) window.refView(e,it.photo,label(e)+(subLabel(e)?' · '+subLabel(e):''));else showBlob(it.photo,label(e)+(subLabel(e)?' · '+subLabel(e):''));
}

function showCompare(blob,name){
  if(cmpUrlA) URL.revokeObjectURL(cmpUrlA);
  if(cmpUrlB) URL.revokeObjectURL(cmpUrlB);
  cmpBlob=blob;
  cmpUrlA=URL.createObjectURL(lastFind.photo);
  cmpUrlB=URL.createObjectURL(blob);
  $('cmpA').src=cmpUrlA;
  $('cmpB').src=cmpUrlB;
  $('cmpName').textContent=name+' (toucher pour agrandir)';
  $('compare').style.display='flex';
}
function closeCompare(end){
  $('compare').style.display='none';
  if(end){lastFind=null;$('refBanner').hidden=true;}
}
$('cmpOther').onclick=function(){closeCompare(false);};
$('cmpEnd').onclick=function(){closeCompare(true);};
$('cmpA').onclick=function(){if(lastFind) showBlob(lastFind.photo,lastFind.species);};
$('cmpB').onclick=function(){if(cmpBlob) showBlob(cmpBlob,$('cmpName').textContent);};

window.openCompare=function(f){lastFind=f;show('refTab');};

async function showRef(){
  try{
    await openRef();
    biblio=(await rtx('meta','readonly',function(s){return s.get('index');}))||[];
  }catch(e){
    $('refMsg').textContent='Base de référence indisponible.';
    return;
  }
  var ban=$('refBanner');
  if(lastFind){
    ban.hidden=false;
    ban.textContent='⚖️ Touchez une photo de référence pour la comparer à : '+lastFind.species;
  }else ban.hidden=true;
  renderRef();
}
$('refSearch').addEventListener('input',function(){
  clearTimeout(timer);timer=setTimeout(renderRef,250);
});
$('packBtn').onclick=function(){$('packFile').click();};
$('packFile').addEventListener('change',function(e){importPack(e.target.files[0]);});

var oldShow=show;
show=function(id,fromHistory){
  if(id!=='refTab') lastFind=null;
  oldShow(id,fromHistory);
  if(id==='refTab') showRef();
};
})();
