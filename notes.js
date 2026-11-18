(function(){
var db=null,cur=null,url=null;

var st=document.createElement('style');
st.textContent=
'#nview{position:fixed;top:0;left:0;right:0;bottom:0;background:#111;z-index:4500;display:none;flex-direction:column;padding:8px;box-sizing:border-box;gap:6px}'+
'#nview img{flex:1;min-height:0;max-width:100%;object-fit:contain}'+
'#nview p{color:#fff;margin:0;text-align:center}'+
'#nview textarea{width:100%;box-sizing:border-box;padding:10px;font-size:1em;border-radius:8px;border:0;min-height:90px}'+
'#nview .bar{display:flex;gap:8px}'+
'#nview .bar button{flex:1;padding:12px;font-size:1em;border:0;border-radius:8px}';
document.head.appendChild(st);

var box=document.createElement('div');
box.id='nview';
box.innerHTML=
'<p id="nTitle"></p>'+
'<img id="nImg" alt="">'+
'<textarea id="nText" placeholder="Ma note (confusions possibles, odeur, détails...)"></textarea>'+
'<div class="bar"><button id="nSave">💾 Enregistrer la note</button><button id="nClose">✕ Fermer</button></div>';
document.body.appendChild(box);

function openN(){
  if(db) return Promise.resolve();
  return new Promise(function(res,rej){
    var r=indexedDB.open('champi-notes',1);
    r.onupgradeneeded=function(){r.result.createObjectStore('n');};
    r.onsuccess=function(){db=r.result;res();};
    r.onerror=function(){rej(r.error);};
  });
}
function getN(k){
  return new Promise(function(res,rej){
    var q=db.transaction('n','readonly').objectStore('n').get(k);
    q.onsuccess=function(){res(q.result);};
    q.onerror=function(){rej(q.error);};
  });
}
function putN(k,v){
  return new Promise(function(res,rej){
    var t=db.transaction('n','readwrite'),s=t.objectStore('n');
    if(v) s.put(v,k); else s.delete(k);
    t.oncomplete=function(){res();};
    t.onerror=t.onabort=function(){rej(t.error);};
  });
}
function key(e){return e.src||('id'+e.id);}

window.refView=async function(e,blob,title){
  cur=e;
  if(url) URL.revokeObjectURL(url);
  url=URL.createObjectURL(blob);
  document.getElementById('nImg').src=url;
  document.getElementById('nTitle').textContent=title+(e.src?' · '+e.src:'');
  document.getElementById('nText').value='';
  box.style.display='flex';
  try{
    await openN();
    var v=await getN(key(e));
    if(cur===e) document.getElementById('nText').value=v||'';
  }catch(err){}
};

document.getElementById('nSave').onclick=async function(){
  if(!cur) return;
  try{
    await openN();
    await putN(key(cur),document.getElementById('nText').value.trim());
    toast('Note enregistrée ✅');
  }catch(err){
    alert('Note non enregistrée.');
  }
};
document.getElementById('nClose').onclick=function(){
  box.style.display='none';
  document.getElementById('nImg').removeAttribute('src');
  if(url){URL.revokeObjectURL(url);url=null;}
  cur=null;
};
})();
