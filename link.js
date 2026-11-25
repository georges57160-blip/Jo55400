(function(){
var cur=null;
function save(f){ return tx('readwrite', function(s){ return s.put(f); }); }

// On retient la trouvaille ouverte en comparaison
var oldOpen=window.openCompare;
window.openCompare=function(f){ cur=f; return oldOpen.apply(this,arguments); };

// Bouton "Lier" dans l'écran de comparaison
var bar=document.querySelector('#compare .bar');
var b=document.createElement('button');
b.textContent='🔗 Lier';
b.style.background='#f0c070';
bar.insertBefore(b,bar.firstChild);

b.onclick=async function(){
  if(!cur) return toast('Ouvrez la comparaison depuis le Journal');
  var name=document.getElementById('cmpName').textContent.replace(' (toucher pour agrandir)','').trim();
  if(!name||name==='Non classé') return toast('Choisissez d\'abord une référence');
  cur.ref=name;
  try{ await save(cur); }catch(e){ return alert('Lien impossible.'); }
  toast('Lié à : '+name+' ✅');
  if(name.indexOf(' ')>0 && cur.species!==name &&
     confirm('Utiliser « '+name+' » comme espèce de cette trouvaille ?\n(Annuler = l\'espèce ne change pas)')){
    cur.species=name;
    try{ await save(cur); toast('Espèce mise à jour ✅'); }catch(e){ alert('Espèce non modifiée.'); }
  }
};

// Affichage dans le Journal
var oldRender=renderList;
renderList=async function(){
  await oldRender.apply(this,arguments);
  var cards=document.querySelectorAll('#items .card');
  if(cards.length!==shownFinds.length) return;
  shownFinds.forEach(function(f,i){
    var c=cards[i];
    if(c.getAttribute('data-lk')) return;
    c.setAttribute('data-lk','1');
    if(!f.ref) return;
    var btns=c.querySelector('.btns');
    if(!btns) return;
    var s=document.createElement('small');
    s.textContent='🔗 Comparée à : '+f.ref;
    btns.parentNode.insertBefore(s,btns);
    var x=document.createElement('button');
    x.textContent='🔗✕';
    x.onclick=async function(){
      if(!confirm('Retirer le lien avec « '+f.ref+' » ?')) return;
      f.ref=null;
      try{ await save(f); }catch(e){ return alert('Modification impossible.'); }
      renderList();
    };
    btns.insertBefore(x,btns.querySelector('.danger'));
  });
};
})();
