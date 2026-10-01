/* =========================================================
   REIVAJ · Para que la lista abra aunque no haya señal

   Solo cuida la página de la lista (se registra para /asistencia): guarda
   una copia de sus archivos y, si no hay internet o tarda mucho, abre
   con esa copia. Siempre intenta primero lo nuevo. No guarda la lista de
   alumnas (esa la guarda la página, cerrada) ni toca lo que va a Google.
   ========================================================= */
'use strict';

var CAJA = 'reivaj-lista-3';
var PAGINA = 'asistencia';
var ARCHIVOS = ['asistencia', 'asistencia.css', 'config.js', 'buzon.js', 'panel.js', 'asistencia.js', 'asistencia.webmanifest', 'asistencia-app.webmanifest', 'assets/icono-192.png', 'assets/apple-touch-icon.png'];
var ESPERA = 4000;

// Si el celular no deja guardar copias, la página funciona igual (con señal).
function deLaCopia(clave) {
  return caches.match(clave).catch(function () { return undefined; });
}

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CAJA).then(function (c) {
    return Promise.all(ARCHIVOS.map(function (a) {
      return fetch(a, { cache: 'no-store' }).then(function (r) { if (r.ok) return c.put(a, r); }).catch(function () {});
    }));
  }).catch(function () {}));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (claves) {
    return Promise.all(claves.filter(function (k) { return k.indexOf('reivaj-lista-') === 0 && k !== CAJA; }).map(function (k) { return caches.delete(k); }));
  }).catch(function () {}).then(function () { return self.clients.claim(); }));
});

// Primero internet; si no contesta a tiempo, la copia.
function redPrimero(pedido, clave) {
  return new Promise(function (listo) {
    var hecho = false;
    function dar(r) { if (!hecho && r) { hecho = true; listo(r); } }
    var reloj = setTimeout(function () { deLaCopia(clave).then(dar); }, ESPERA);
    fetch(pedido).then(function (r) {
      clearTimeout(reloj);
      if (r && r.ok && r.type === 'basic') {
        var copia = r.clone();
        caches.open(CAJA).then(function (c) { return c.put(clave, copia); }).catch(function () {});
      }
      // Si el servidor contesta con error, mejor la copia (si la hay).
      if (r.ok || r.type === 'opaqueredirect') dar(r);
      else deLaCopia(clave).then(function (c) { dar(c || r); });
    }).catch(function () {
      clearTimeout(reloj);
      deLaCopia(clave).then(function (r) { dar(r || Response.error()); });
    });
  });
}

self.addEventListener('fetch', function (e) {
  var pedido = e.request;
  if (pedido.method !== 'GET') return;
  var url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return;
  if (pedido.mode === 'navigate') {
    // /asistencia y /asistencia.html son la misma página.
    if (!/^\/asistencia(\.html)?$/.test(url.pathname)) return;
    e.respondWith(redPrimero(pedido, PAGINA));
    return;
  }
  var nombre = url.pathname.replace(/^\//, '');
  if (ARCHIVOS.indexOf(nombre) < 0) return;
  e.respondWith(redPrimero(pedido, nombre));
});
