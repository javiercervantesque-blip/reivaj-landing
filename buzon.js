/* =========================================================
   REIVAJ · Buzón hacia el programa del gimnasio

   Lo que se llena en esta página se cierra aquí mismo, en el navegador,
   con la llave pública del programa del gimnasio, y se deja en un buzón.
   En el camino nadie lo puede leer: solo se abre en la computadora del
   gimnasio. No se guarda nada en este sitio.
   ========================================================= */
(function (global) {
  'use strict';

  var enc = new TextEncoder();
  var dec = new TextDecoder();
  var sutil = global.crypto && global.crypto.subtle;

  function aB64(buf) {
    var b = new Uint8Array(buf), s = '';
    for (var i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function deB64(t) {
    var s = atob(t), b = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    return b;
  }
  function aB64url(buf) { return aB64(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function deB64url(t) {
    t = String(t).replace(/-/g, '+').replace(/_/g, '/');
    while (t.length % 4) t += '=';
    return deB64(t);
  }

  function disponible() { return Boolean(sutil && global.fetch); }

  async function cerrarSobre(publicaB64, tipo, contenido) {
    var publica = await sutil.importKey('spki', deB64(publicaB64), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
    var llave = await sutil.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
    var cruda = await sutil.exportKey('raw', llave);
    var iv = global.crypto.getRandomValues(new Uint8Array(12));
    var texto = JSON.stringify(Object.assign({}, contenido, { tipo: tipo }));
    var c = await sutil.encrypt({ name: 'AES-GCM', iv: iv, additionalData: enc.encode('reivaj-buzon-v2|' + tipo) }, llave, enc.encode(texto));
    var k = await sutil.encrypt({ name: 'RSA-OAEP' }, publica, cruda);
    return JSON.stringify({ v: 2, k: aB64(k), iv: aB64(iv), c: aB64(c) });
  }

  // Manda un sobre. Contesta { ok, id } o { ok: false, error }.
  async function enviar(tipo, contenido, extra) {
    var cfg = global.CONFIG || {};
    if (!cfg.buzon || !cfg.llavePublica) return { ok: false, sinBuzon: true, error: 'La página todavía no está conectada al gimnasio.' };
    if (!disponible()) return { ok: false, sinBuzon: true, error: 'Este navegador no puede enviar el formulario de forma segura.' };
    var sobre = await cerrarSobre(cfg.llavePublica, tipo, contenido);
    var cuerpo = JSON.stringify({ accion: 'enviar', tipo: tipo, sobre: sobre, hp: (extra && extra.hp) || '', t: (extra && extra.t) || 0 });
    var r;
    try {
      // Texto plano a propósito: así el navegador no pide permiso antes
      // (Google no contesta ese permiso) y la respuesta se puede leer.
      r = await global.fetch(cfg.buzon, { method: 'POST', body: cuerpo, redirect: 'follow' });
    } catch (e) {
      try {
        await global.fetch(cfg.buzon, { method: 'POST', body: cuerpo, mode: 'no-cors' });
        return { ok: true, aCiegas: true };
      } catch (e2) {
        return { ok: false, red: true, error: 'No hay conexión. Revisa tu internet e intenta otra vez.' };
      }
    }
    var j = null;
    try { j = await r.json(); } catch (e) { j = null; }
    if (!j) return { ok: false, error: 'El gimnasio no contestó bien. Intenta otra vez en un momento.' };
    return j;
  }

  async function leer(accion) {
    var cfg = global.CONFIG || {};
    if (!cfg.buzon) return null;
    try {
      var r = await global.fetch(cfg.buzon + (cfg.buzon.indexOf('?') >= 0 ? '&' : '?') + 'accion=' + accion, { redirect: 'follow' });
      return await r.json();
    } catch (e) {
      return null;
    }
  }

  // ─── Lista del celular ───────────────────────────────────────────────
  async function derivar(llaveLista, para) {
    var base = await sutil.importKey('raw', deB64url(llaveLista), 'HKDF', false, ['deriveBits']);
    return sutil.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: enc.encode('reivaj-lista-' + para) }, base, 256);
  }

  async function abrirLista(llaveLista, cerradaTexto) {
    var s = JSON.parse(cerradaTexto);
    var k = await sutil.importKey('raw', await derivar(llaveLista, 'cifrar'), 'AES-GCM', false, ['decrypt']);
    var claro = await sutil.decrypt({ name: 'AES-GCM', iv: deB64(s.iv), additionalData: enc.encode('reivaj-lista-v2') }, k, deB64(s.c));
    return JSON.parse(dec.decode(claro));
  }

  async function firmarLista(llaveLista, texto) {
    var k = await sutil.importKey('raw', await derivar(llaveLista, 'firmar'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return aB64url(await sutil.sign('HMAC', k, enc.encode(texto)));
  }

  async function huella(texto) {
    var h = await sutil.digest('SHA-256', enc.encode(texto));
    return Array.prototype.map.call(new Uint8Array(h), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }

  global.Buzon = {
    disponible: disponible,
    cerrarSobre: cerrarSobre,
    enviar: enviar,
    agenda: function () { return leer('agenda'); },
    lista: function () { return leer('lista'); },
    abrirLista: abrirLista,
    firmarLista: firmarLista,
    huella: huella
  };
})(typeof window !== 'undefined' ? window : globalThis);
