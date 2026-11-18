window.editFind = async function(f){
  var sp = prompt('Espèce :', f.species);
  if (sp === null) return;
  var ha = prompt('Substrat / arbres / sol :', f.habitat || '');
  if (ha === null) return;
  var no = prompt('Notes :', f.notes || '');
  if (no === null) return;
  f.species = sp.trim() || 'À déterminer';
  f.habitat = ha.trim();
  f.notes = no.trim();
  try {
    await tx('readwrite', function(s){ return s.put(f); });
  } catch(e) {
    return alert('Modification impossible.');
  }
  toast('Modifié ✅');
  renderList();
};

