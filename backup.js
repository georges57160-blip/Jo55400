(function(){
var KEY='champiBackup';

function openN(){
  return new Promise(function(res,rej){
    var r=indexedDB.open('champi-notes',1);
    r.onupgradeneeded=function(){r.result.createObjectStore('n');};
    r.onsuccess=function(){res(r.result);};
    r.onerror=function(){rej(r.error);};
  });
}
async function readNotes(){
  var db=await openN();
  return new Promise(function(res){
    var out={};
    var q=db.transaction('n','readonly').objectStore('n').openCursor();
    q.onsuccess=function(){
      var c=q.result;
      if(c){out[c.key]=c.value;c.continue();}
      else{db.close();res(out);}
    };
    q.onerror=function(){db.close();res(out);};
  });
}
async function writeNotes(notes){
  var db=await openN();
  return new Promise(function(res,rej){
    var t=db.transaction('n','readwrite'),s=t.objectStore('n'),n=0;
    Object.keys(notes).forEach(function(k){
      var g=s.get(k);
      g.onsuccess=function(){
        if(!g.result&&notes[k]){s.put(notes[k],k);n++;}
      };
    });
    t.oncomplete=function(){db.close();res(n);};
    t.onerror=t.onabort=function(){db.close();rej(t.error);};
  });
}

async function exportAll(){
  try{
    var finds=await all(),notes=await readNotes();
    var parts=[],pos=0,list=[];
    finds.forEach(function(f){
      var c={};
      for(var k in f){if(k!=='photo'&&k!=='id')c[k]=f[k];}
      if(f.photo){c.p=[pos,f.photo.size];pos+=f.photo.size;parts.push(f.photo);}
      list.push(c);
    });
    var head=new TextEncoder().encode(JSON.stringify({v:1,finds:list,notes:notes}));
    var len=new Uint8Array(4);
    new DataView(len.buffer).setUint32(0,head.length);
    var blob=new Blob([len,head].concat(parts),{type:'application/octet-stream'});
    var a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='carnet-champi-'+new Date().toISOString().slice(0,10)+'.champi';
    a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href);},60000);
    localStorage.setItem(KEY,new Date().toISOString());
    info();
    toast('Sauvegarde : '+list.length+' trouvaille(s)');
  }catch(e){
    alert('Sauvegarde impossible : '+(e&&e.message?e.message:e));
  }
}

async function importAll(file){
  if(!file) return;
  try{
    var n=new DataView(await file.slice(0,4).arrayBuffer()).getUint32(0);
    var h=JSON.parse(await file.slice(4,4+n).text());
    if(!h.finds) throw new Error('fichier non reconnu');
    var base=4+n,have={},added=0;
    (await all()).forEach(function(f){
      have[f.date+'|'+(f.photo?f.photo.size:0)]=1;
    });
    for(var i=0;i<h.finds.length;i++){
      var c=h.finds[i];
      var sig=c.date+'|'+(c.p?c.p[1]:0);
      if(have[sig]) continue;
      var f={};
      for(var k in c){if(k!=='p')f[k]=c[k];}
      f.photo=c.p?file.slice(base+c.p[0],base+c.p[0]+c.p[1],'image/jpeg'):null;
      await add(f);
      have[sig]=1;added++;
    }
    var nn=await writeNotes(h.notes||{});
    alert('Restauration terminée :\n'+added+' trouvaille(s) ajoutée(s)\n'+
      (h.finds.length-added)+' déjà présente(s)\n'+nn+' note(s) ajoutée(s)');
    renderList();
  }catch(e){
    alert('Restauration impossible : '+(e&&e.message?e.message:e));
  }
  $('bkFile').value='';
}

var csv=document.querySelector('#list button[onclick="exportCSV()"]');
var ref=csv.nextSibling,par=csv.parentNode;

var b1=document.createElement('button');
b1.className='act';
b1.textContent='💾 Sauvegarde complète (photos, notes)';
b1.onclick=exportAll;
par.insertBefore(b1,ref);

var b2=document.createElement('button');
b2.className='act sec';
b2.textContent='📥 Restaurer une sauvegarde';
b2.onclick=function(){$('bkFile').click();};
par.insertBefore(b2,ref);

var inp=document.createElement('input');
inp.type='file';inp.id='bkFile';inp.hidden=true;
inp.accept='.champi,application/octet-stream';
inp.addEventListener('change',function(e){importAll(e.target.files[0]);});
par.insertBefore(inp,ref);

var p=document.createElement('p');
p.id='bkInfo';p.style.fontSize='.9em';
par.insertBefore(p,ref);

function info(){
  var d=localStorage.getItem(KEY);
  p.textContent=d?'Dernière sauvegarde : '+new Date(d).toLocaleString('fr-FR'):'Aucune sauvegarde faite sur ce téléphone.';
}
info();
})();
