(function(){
var cv,ctx,img=new Image(),base=document.createElement('canvas'),bctx=base.getContext('2d');
var shapes=[],cur=null,tool='pen',color='#ff2d2d',find=null,url=null;
var saving=false,raf=0,pendingText=null,activeId=null;
function $a(id){return document.getElementById(id);}

var st=document.createElement('style');
st.textContent=
'#annot{position:fixed;top:0;left:0;right:0;bottom:0;background:#111;z-index:4800;display:none;flex-direction:column;padding:6px;box-sizing:border-box;gap:6px}'+
'#annot .abar{display:flex;gap:6px}'+
'#annot .abar button{flex:1;padding:12px 4px;font-size:1em;border:3px solid transparent;border-radius:8px;background:#ddd}'+
'#annot .abar button.on{border-color:#f0c070;background:#fff}'+
'#annot .abar button:disabled{opacity:.5}'+
'#aTxtBar{display:none}'+
'#aTxtBar input{flex:3;margin:0;padding:12px}'+
'#aBox{flex:1;min-height:0;display:flex;align-items:center;justify-content:center}'+
'#aCv{touch-action:none}';
document.head.appendChild(st);

var box=document.createElement('div');
box.id='annot';
box.innerHTML=
'<div class="abar"><button data-t="pen">✏️ Libre</button><button data-t="arrow">➡️ Flèche</button><button data-t="circle">⭕ Cercle</button><button data-t="text">🔤 Texte</button></div>'+
'<div class="abar"><button data-c="#ff2d2d">🔴</button><button data-c="#ffe600">🟡</button><button data-c="#ffffff">⚪</button><button data-c="#000000">⚫</button></div>'+
'<div class="abar" id="aTxtBar"><input id="aTxt" placeholder="Texte à écrire"><button id="aTxtOk">OK</button></div>'+
'<div id="aBox"><canvas id="aCv"></canvas></div>'+
'<div class="abar"><button id="aUndo">↶ Annuler</button><button id="aSave">💾 Enregistrer une copie</button><button id="aClose">✕ Fermer</button></div>';
document.body.appendChild(box);

cv=$a('aCv');
ctx=cv.getContext('2d');

function sel(){
  box.querySelectorAll('[data-t]').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-t')===tool);});
  box.querySelectorAll('[data-c]').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-c')===color);});
}
function hideText(){
  pendingText=null;
  $a('aTxtBar').style.display='none';
  fit();draw();
}
box.querySelectorAll('[data-t]').forEach(function(b){
  b.onclick=function(){tool=b.getAttribute('data-t');if(tool!=='text'&&pendingText) hideText();sel();};
});
box.querySelectorAll('[data-c]').forEach(function(b){
  b.onclick=function(){color=b.getAttribute('data-c');sel();};
});

function lw(){return Math.max(3,Math.round(cv.width/200));}

function drawShape(s){
  try{
    var w=lw();
    ctx.strokeStyle=s.c;ctx.fillStyle=s.c;ctx.lineWidth=w;
    ctx.lineCap='round';ctx.lineJoin='round';
    if(s.t==='pen'){
      ctx.beginPath();
      ctx.moveTo(s.pts[0][0],s.pts[0][1]);
      if(s.pts.length===1) ctx.lineTo(s.pts[0][0]+0.1,s.pts[0][1]);
      for(var i=1;i<s.pts.length;i++) ctx.lineTo(s.pts[i][0],s.pts[i][1]);
      ctx.stroke();
    }else if(s.t==='arrow'){
      var a=s.a,b=s.b,ang=Math.atan2(b[1]-a[1],b[0]-a[0]),h=w*6;
      ctx.beginPath();
      ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);
      ctx.moveTo(b[0],b[1]);
      ctx.lineTo(b[0]-h*Math.cos(ang-0.45),b[1]-h*Math.sin(ang-0.45));
      ctx.moveTo(b[0],b[1]);
      ctx.lineTo(b[0]-h*Math.cos(ang+0.45),b[1]-h*Math.sin(ang+0.45));
      ctx.stroke();
    }else if(s.t==='circle'){
      var rx=Math.abs(s.b[0]-s.a[0])/2,ry=Math.abs(s.b[1]-s.a[1])/2;
      if(rx<1||ry<1) return;
      ctx.beginPath();
      ctx.ellipse((s.a[0]+s.b[0])/2,(s.a[1]+s.b[1])/2,rx,ry,0,0,Math.PI*2);
      ctx.stroke();
    }else if(s.t==='text'){
      var fs=Math.round(cv.width/18);
      ctx.font='bold '+fs+'px sans-serif';
      ctx.textBaseline='middle';
      ctx.lineWidth=Math.max(3,fs/8);
      ctx.strokeStyle=(s.c==='#000000')?'#ffffff':'#000000';
      ctx.strokeText(s.s,s.x,s.y);
      ctx.fillText(s.s,s.x,s.y);
    }
  }catch(e){}
}
function paint(){
  raf=0;
  ctx.drawImage(base,0,0);
  shapes.forEach(drawShape);
  if(cur) drawShape(cur);
  if(pendingText){
    ctx.fillStyle='#00e5ff';
    ctx.beginPath();ctx.arc(pendingText[0],pendingText[1],lw()*2,0,Math.PI*2);ctx.fill();
  }
}
function draw(){if(!raf) raf=requestAnimationFrame(paint);}
function drawNow(){
  if(raf){cancelAnimationFrame(raf);raf=0;}
  paint();
}
function fit(){
  var bx=$a('aBox');
  if(!cv.width||!cv.height) return;
  var s=Math.min(bx.clientWidth/cv.width,bx.clientHeight/cv.height);
  cv.style.width=Math.floor(cv.width*s)+'px';
  cv.style.height=Math.floor(cv.height*s)+'px';
}
window.addEventListener('resize',function(){if(box.style.display==='flex') fit();});

function pos(e){
  var r=cv.getBoundingClientRect();
  return [(e.clientX-r.left)*cv.width/r.width,(e.clientY-r.top)*cv.height/r.height];
}
cv.addEventListener('pointerdown',function(e){
  if(!e.isPrimary||saving) return;
  e.preventDefault();
  var p=pos(e);
  if(tool==='text'){
    pendingText=p;
    $a('aTxtBar').style.display='flex';
    $a('aTxt').value='';
    fit();draw();
    $a('aTxt').focus();
    return;
  }
  cur={t:tool,c:color,pts:[p],a:p,b:p};
  activeId=e.pointerId;
  try{cv.setPointerCapture(e.pointerId);}catch(x){}
  draw();
});
cv.addEventListener('pointermove',function(e){
  if(!cur||e.pointerId!==activeId) return;
  e.preventDefault();
  var p=pos(e);
  if(cur.t==='pen') cur.pts.push(p); else cur.b=p;
  draw();
});
function endDraw(e){
  if(!cur||(e&&e.pointerId!==activeId)) return;
  shapes.push(cur);cur=null;activeId=null;draw();
}
cv.addEventListener('pointerup',endDraw);
cv.addEventListener('pointercancel',endDraw);

$a('aTxtOk').onclick=function(){
  var t=$a('aTxt').value.trim();
  if(t&&pendingText) shapes.push({t:'text',c:color,x:pendingText[0],y:pendingText[1],s:t});
  hideText();
};

$a('aUndo').onclick=function(){if(saving) return;shapes.pop();draw();};

function closeA(){
  box.style.display='none';
  if(url){URL.revokeObjectURL(url);url=null;}
  find=null;shapes=[];cur=null;pendingText=null;
  $a('aTxtBar').style.display='none';
}
$a('aClose').onclick=function(){
  if(saving) return;
  if(shapes.length&&!confirm('Fermer sans enregistrer les annotations ?')) return;
  closeA();
};

$a('aSave').onclick=function(){
  if(!find||saving) return;
  var btn=$a('aSave');
  saving=true;btn.disabled=true;btn.textContent='⏳ Enregistrement…';
  cur=null;pendingText=null;
  $a('aTxtBar').style.display='none';
  drawNow();
  var done=false;
  function fin(){saving=false;btn.disabled=false;btn.textContent='💾 Enregistrer une copie';}
  var guard=setTimeout(function(){
    if(done) return;
    done=true;fin();
    alert('L\'enregistrement prend trop de temps. Réessayez, ou fermez sans enregistrer.');
  },15000);
  try{
    cv.toBlob(function(b){
      if(done) return;
      done=true;clearTimeout(guard);
      if(!b){fin();return alert('Impossible de créer l\'image.');}
      var c={};
      for(var k in find){if(k!=='id') c[k]=find[k];}
      c.photo=b;c.sent=null;c.species=find.species+' (annoté)';
      add(c).then(function(){
        fin();toast('Copie annotée enregistrée ✅');
        closeA();renderList();
      }).catch(function(e){
        fin();alert('Enregistrement impossible : '+(e&&e.message?e.message:e));
      });
    },'image/jpeg',0.88);
  }catch(e){
    done=true;clearTimeout(guard);fin();
    alert('Enregistrement impossible : '+(e&&e.message?e.message:e));
  }
};

window.addEventListener('error',function(e){
  if(box.style.display==='flex') toast('Erreur : '+(e.message||'inconnue'));
});

window.annotate=function(f){
  if(!f||!f.photo) return;
  find=f;shapes=[];cur=null;pendingText=null;saving=false;
  $a('aTxtBar').style.display='none';
  $a('aSave').disabled=false;$a('aSave').textContent='💾 Enregistrer une copie';
  if(url) URL.revokeObjectURL(url);
  url=URL.createObjectURL(f.photo);
  img=new Image();
  img.onload=function(){
    var s=Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight));
    cv.width=base.width=Math.round(img.naturalWidth*s);
    cv.height=base.height=Math.round(img.naturalHeight*s);
    bctx.drawImage(img,0,0,base.width,base.height);
    box.style.display='flex';
    sel();fit();drawNow();
  };
  img.onerror=function(){alert('Photo illisible.');closeA();};
  img.src=url;
};

var oldRender=renderList;
renderList=async function(){
  await oldRender.apply(this,arguments);
  var cards=document.querySelectorAll('#items .card');
  if(cards.length!==shownFinds.length) return;
  shownFinds.forEach(function(f,i){
    var c=cards[i];
    if(c.getAttribute('data-an')) return;
    c.setAttribute('data-an','1');
    var btns=c.querySelector('.btns');
    if(!btns||!f.photo) return;
    var b=document.createElement('button');
    b.textContent='🖍️';
    b.onclick=function(){annotate(f);};
    btns.insertBefore(b,btns.querySelector('.danger'));
  });
};
})();
