var V = 'champi-v1';
var FILES = [
  './', './index.html', './manifest.json', './icon-192.png', './icon-512.png',
  './leaflet/leaflet.css', './leaflet/leaflet.js',
  './leaflet/images/marker-icon.png', './leaflet/images/marker-icon-2x.png',
  './leaflet/images/marker-shadow.png', './leaflet/images/layers.png',
  './leaflet/images/layers-2x.png'
];

// Installation : on garde l'application en mémoire
self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(V).then(function(c){ return c.addAll(FILES); }));
});

// Activation : on supprime les anciennes versions (mais on garde les tuiles)
self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(ks){
      return Promise.all(ks.filter(function(k){ return k !== V && k !== 'tiles'; })
        .map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  if (e.request.method !== 'GET') return;
  var u = new URL(e.request.url);

  // Tuiles de la carte : d'abord le cache, sinon réseau puis mémorisation
  if (u.hostname === 'tile.openstreetmap.org') {
    e.respondWith(caches.open('tiles').then(function(c){
      return c.match(e.request).then(function(r){
        return r || fetch(e.request).then(function(n){
          if (n.ok) c.put(e.request, n.clone());
          return n;
        });
      });
    }));
    return;
  }

  // Fichiers de l'application : cache immédiat, mise à jour en arrière-plan
  if (u.origin === location.origin) {
    e.respondWith(caches.open(V).then(function(c){
      return c.match(e.request, {ignoreSearch: true}).then(function(r){
        var net = fetch(e.request).then(function(n){
          if (n.ok) c.put(e.request, n.clone());
          return n;
        }).catch(function(){ return r; });
        return r || net;
      });
    }));
  }
});
