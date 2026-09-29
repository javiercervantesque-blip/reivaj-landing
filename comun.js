/* =========================================================
   REIVAJ · Piezas que comparten todas las páginas
   ========================================================= */
(function (global) {
  'use strict';

  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  // Hora de Guadalajara, sin importar dónde esté el teléfono de quien llena.
  function ahoraGdl() {
    var partes = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(new Date());
    var o = {};
    partes.forEach(function (p) { o[p.type] = p.value; });
    return { fecha: o.year + '-' + o.month + '-' + o.day, hora: (o.hour === '24' ? '00' : o.hour) + ':' + o.minute };
  }
  function aFecha(f) { var p = f.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2], 12)); }
  function sumarDias(f, n) { var d = aFecha(f); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function diaSemana(f) { var j = aFecha(f).getUTCDay(); return j === 0 ? 7 : j; }   // 1 = lunes
  function fechaLarga(f) { var d = aFecha(f); return DIAS[d.getUTCDay()] + ' ' + d.getUTCDate() + ' de ' + MESES[d.getUTCMonth()]; }
  function fechaChip(f) { var d = aFecha(f); return { dia: DIAS_CORTOS[d.getUTCDay()], num: d.getUTCDate(), mes: MESES_CORTOS[d.getUTCMonth()] }; }
  function horaBonita(h) {
    var p = String(h || '').split(':'); var n = +p[0];
    return (n > 12 ? n - 12 : n) + ':' + (p[1] || '00') + (n >= 12 ? ' pm' : ' am');
  }

  // Los días que se pueden pedir para la clase de prueba.
  function diasDePrueba(cfg) {
    cfg = cfg || {};
    var dias = cfg.dias || [1, 2, 3, 4, 5];
    var sin = {};
    (cfg.sinClase || []).forEach(function (f) { sin[f] = true; });
    var ahora = ahoraGdl();
    var inicio = ahora.fecha;
    // Si ya casi es la hora de la clase de hoy, se empieza mañana.
    var limite = String(cfg.hora || '16:00').split(':');
    var minutosClase = (+limite[0]) * 60 + (+limite[1] || 0);
    var p = ahora.hora.split(':');
    if ((+p[0]) * 60 + (+p[1]) > minutosClase - 120) inicio = sumarDias(inicio, 1);
    var fin = sumarDias(ahora.fecha, 7 * (cfg.semanasAdelante || 3));
    var out = [];
    for (var f = inicio; f <= fin; f = sumarDias(f, 1)) {
      if (dias.indexOf(diaSemana(f)) >= 0 && !sin[f]) out.push(f);
    }
    return out;
  }

  function soloDigitos(t) { return String(t || '').replace(/\D/g, ''); }
  function telefono10(t) {
    var d = soloDigitos(t);
    if (d.length === 12 && d.indexOf('52') === 0) d = d.slice(2);
    if (d.length === 13 && d.indexOf('521') === 0) d = d.slice(3);
    return d.length === 10 ? d : '';
  }
  function enlaceWhatsApp(texto) {
    var cfg = global.CONFIG || {};
    return 'https://wa.me/' + (cfg.whatsapp || '') + (texto ? '?text=' + encodeURIComponent(texto) : '');
  }

  // Negritas de los documentos oficiales: **así**.
  function conNegritas(texto) {
    var div = document.createElement('div');
    String(texto).split('**').forEach(function (trozo, i) {
      if (!trozo) return;
      if (i % 2) { var b = document.createElement('b'); b.textContent = trozo; div.appendChild(b); }
      else div.appendChild(document.createTextNode(trozo));
    });
    return div.childNodes.length ? Array.prototype.slice.call(div.childNodes) : [];
  }

  function el(etiqueta, atributos, hijos) {
    var n = document.createElement(etiqueta);
    Object.keys(atributos || {}).forEach(function (k) {
      if (k === 'texto') n.textContent = atributos[k];
      else if (k === 'clase') n.className = atributos[k];
      else if (k.indexOf('on') === 0) n.addEventListener(k.slice(2), atributos[k]);
      else if (atributos[k] !== null && atributos[k] !== undefined && atributos[k] !== false) n.setAttribute(k, atributos[k] === true ? '' : atributos[k]);
    });
    (hijos || []).forEach(function (h) { if (h !== null && h !== undefined) n.appendChild(typeof h === 'string' ? document.createTextNode(h) : h); });
    return n;
  }

  // ─── Navegación, animaciones y año del pie (todas las páginas) ─────
  function iniciarPagina() {
    var toggle = document.getElementById('navToggle');
    var links = document.getElementById('navLinks');
    if (toggle && links) {
      toggle.addEventListener('click', function () {
        var abierto = links.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(abierto));
        toggle.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
      });
      links.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') { links.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); }
      });
    }
    var nav = document.getElementById('nav');
    if (nav) {
      var alMover = function () { nav.classList.toggle('is-scrolled', window.scrollY > 8); };
      window.addEventListener('scroll', alMover, { passive: true });
      alMover();
    }
    var todos = function () { document.querySelectorAll('.reveal').forEach(function (x) { x.classList.add('is-in'); }); };
    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e, i) {
          if (!e.isIntersecting) return;
          e.target.style.transitionDelay = Math.min(i * 70, 280) + 'ms';
          e.target.classList.add('is-in');
          obs.unobserve(e.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -60px' });
      document.querySelectorAll('.reveal').forEach(function (x) { obs.observe(x); });
      setTimeout(todos, 1500);
    } else todos();
    var anio = document.getElementById('year');
    if (anio) anio.textContent = new Date().getFullYear();
    document.querySelectorAll('[data-whatsapp]').forEach(function (a) {
      a.href = enlaceWhatsApp(a.getAttribute('data-whatsapp') || '');
    });
  }

  // ─── Formularios: errores junto al campo ───────────────────────────
  function mostrarError(form, nombre, mensaje) {
    var msg = form.querySelector('[data-error-for="' + nombre + '"]');
    var campo = form.elements[nombre];
    var caja = null;
    if (campo && campo.length !== undefined && !campo.tagName) caja = (campo[0] && campo[0].closest('.field')) || null;
    else if (campo) caja = campo.closest('.field') || campo.closest('.consent');
    if (msg) { msg.textContent = mensaje || ''; msg.classList.toggle('is-visible', Boolean(mensaje)); }
    if (caja) caja.classList.toggle('has-error', Boolean(mensaje));
  }

  function valor(form, nombre) {
    var c = form.elements[nombre];
    if (!c) return '';
    if (c.length !== undefined && !c.tagName) return c.value || '';   // grupo de radios
    if (c.type === 'checkbox') return c.checked;
    return String(c.value || '').trim();
  }

  function llevarA(form, nombre) {
    var c = form.elements[nombre];
    var nodo = c && c.length !== undefined && !c.tagName ? c[0] : c;
    if (!nodo) return;
    try { nodo.focus({ preventScroll: true }); } catch (e) { /* sin foco */ }
    (nodo.closest('.field') || nodo).scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  var FUENTES = [
    ['', 'Elige una opción'], ['instagram', 'Instagram'], ['facebook', 'Facebook'], ['tiktok', 'TikTok'],
    ['google', 'Google o Maps'], ['referido', 'Me lo recomendaron'], ['paso', 'Pasé por el gimnasio'],
    ['escuela', 'En su escuela'], ['evento', 'Los vi en una competencia'], ['regreso', 'Ya había estado antes'], ['otro', 'Otro']
  ];

  global.Reivaj = {
    ahoraGdl: ahoraGdl, sumarDias: sumarDias, diaSemana: diaSemana, fechaLarga: fechaLarga, fechaChip: fechaChip,
    horaBonita: horaBonita, diasDePrueba: diasDePrueba, soloDigitos: soloDigitos, telefono10: telefono10,
    enlaceWhatsApp: enlaceWhatsApp, conNegritas: conNegritas, el: el, iniciarPagina: iniciarPagina,
    mostrarError: mostrarError, valor: valor, llevarA: llevarA, FUENTES: FUENTES
  };
})(window);
