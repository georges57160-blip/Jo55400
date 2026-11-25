(function(){
var cur=null;

var st=document.createElement('style');
st.textContent=
'#eform{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.8);z-index:4900;display:none;align-items:flex-start;justify-content:center;padding:12px;box-sizing:border-box;overflow:auto}'+
'#eform .box{background:#fff;border-radius:12px;padding:14px;width:100%;max-width:480px;box-sizing:border-box}'+
'#eform h3{margin:0 0 4px}'+
'#eform .bar{display:flex;gap:8px;margin-top:14px}'+
'#eform .bar button{flex:1;padding:14px;font-size:1em;border:0;border-radius:8px;background:#ddd}'+
'#eform .bar button.ok{background:#5b3a1e;color:#fff}';
document.head.appendChild(st);

var box=document.createElement('div');
box.id='eform';
box.innerHTML=
'<div class="box">'+
'<h3>✏️ Modifier la trouvaille</h3>'+
'<small id="efDate"></small>'+
'<label>Espèce</label><input id="efSp">'+
'<label>Substrat / arbres / sol</label><input id="efHa">'+
'<label>Notes</label><textarea id="efNo" rows="5"></textarea>'+
'<div class="bar"><button id="efCancel">✕ Annuler</button><button class="ok" id="efSave">💾 Enregistrer</button></div>'+
'</div>';
document.body.appendChild(box);

function closeF(){
  box.style.display='none';
  cur=null;
}

window.editFind=function(f){
  cur=f;
  document.getElementById('efDate').textContent=new Date(f.date).toLocaleString('fr-FR');
  document.getElementById('efSp').value=f.species||'';
  document.getElementById('efHa').value=f.habitat||'';
  document.getElementById('efNo').value=f.notes||'';
  box.style.display='flex';
  document.getElementById('efSp').focus();
};

document.getElementById('efCancel').onclick=closeF;

document.getElementById('efSave').onclick=async function(){
  if(!cur) return;
  cur.species=document.getElementById('efSp').value.trim()||'À déterminer';
  cur.habitat=document.getElementById('efHa').value.trim();
  cur.notes=document.getElementById('efNo').value.trim();
  try{
    await tx('readwrite',function(s){return s.put(cur);});
  }catch(e){
    return alert('Modification impossible.');
  }
  closeF();
  toast('Modifié ✅');
  renderList();
};
})();
