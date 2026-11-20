(function(){
function save(f){ return tx('readwrite', function(s){ return s.put(f); }); }
function now(){ return new Date().toISOString(); }

// ---------- Affichage : ✅ et bouton ✔ / ↩ sur chaque carte ----------
var oldRender = renderList;
renderList = async function(){
  await oldRender.apply(this, arguments);
  var cards = document.querySelectorAll('#items .card');
  if (cards.length !== shownFinds.length) return;
  shownFinds.forEach(function(f, i){
    var c = cards[i];
    if (c.getAttribute('data-mk')) return;
    c.setAttribute('data-mk', '1');
    var title = c.querySelector('b');
    if (title && f.sent) title.textContent += ' ✅';
    var btns = c.querySelector('.btns');
    if (!btns || !f.photo) return;
    var b = document.createElement('button');
    b.textContent = f.sent ? '↩' : '✔';
    b.onclick = async function(){
      f.sent = f.sent ? null : now();
      try { await save(f); } catch(e) { return alert('Modification impossible.'); }
      renderList();
    };
    btns.insertBefore(b, btns.querySelector('.danger'));
  });
};

// ---------- Envoi : marque les trouvailles une fois le partage terminé ----------
async function doShare(list){
  var finds = list.filter(function(f){ return f.photo; });
  if (!finds.length) return alert('Aucune photo à envoyer.');
  toast('Préparation de ' + finds.length + ' photo(s)…');
  var files = [];
  for (var i = 0; i < finds.length; i++) {
    files.push(new File([await withExif(finds[i])], fileName(finds[i], i + 1), {type: 'image/jpeg'}));
  }
  var done = false;
  try {
    if (navigator.canShare && navigator.canShare({files: files})) {
      await navigator.share({files: files, title: 'Carnet Champi'});
      done = true;
    }
  } catch(e) {
    if (e.name === 'AbortError') return;
  }
  if (!done) {
    files.forEach(function(file, k){
      setTimeout(function(){
        var a = document.createElement('a');
        a.href = URL.createObjectURL(file);
        a.download = file.name;
        a.click();
        setTimeout(function(){ URL.revokeObjectURL(a.href); }, 5000);
      }, k * 400);
    });
    toast('Photos téléchargées dans le dossier Téléchargements');
  }
  try {
    for (var j = 0; j < finds.length; j++) { finds[j].sent = now(); await save(finds[j]); }
  } catch(e) { alert('Envoi fait, mais marquage impossible.'); }
  renderList();
}
sharePhotos = function(list){ return doShare(list || shownFinds); };

// ---------- Boutons du Journal ----------
var big = document.querySelector('#list button[onclick="sharePhotos()"]');
big.textContent = '📤 Envoyer toutes les photos affichées';

var nb = document.createElement('button');
nb.className = 'act';
nb.textContent = '📤 Envoyer seulement les nouvelles photos';
nb.onclick = function(){
  var news = shownFinds.filter(function(f){ return f.photo && !f.sent; });
  if (!news.length) return toast('Aucune nouvelle photo à envoyer');
  sharePhotos(news);
};
big.parentNode.insertBefore(nb, big);

var all2 = document.createElement('button');
all2.className = 'act sec';
all2.textContent = '✔ Marquer tout comme envoyé';
all2.onclick = async function(){
  var todo = shownFinds.filter(function(f){ return f.photo && !f.sent; });
  if (!todo.length) return toast('Rien à marquer');
  if (!confirm('Marquer ' + todo.length + ' trouvaille(s) comme déjà envoyée(s) ?')) return;
  try {
    for (var i = 0; i < todo.length; i++) { todo[i].sent = now(); await save(todo[i]); }
  } catch(e) { return alert('Marquage impossible.'); }
  renderList();
};
big.parentNode.insertBefore(all2, big.nextSibling);
})();
