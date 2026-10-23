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
  // Un teléfono que puede ser de verdad: 10 dígitos, sin empezar en 0 o 1 (en
  // México ninguna lada empieza así) y sin ser el mismo dígito repetido o una
  // escalera (5555555555, 1234567890). Devuelve los 10 dígitos o ''.
  function telefonoValido(t) {
    var d = telefono10(t);
    if (!d || /^[01]/.test(d) || /^(\d)\1{9}$/.test(d) || '01234567890'.indexOf(d) >= 0 || '9876543210'.indexOf(d) >= 0) return '';
    return d;
  }
  // Al menos n letras (no solo espacios, puntos o números).
  // La CURP lleva la fecha de nacimiento en las posiciones 5 a 10 (AAMMDD).
  // Vacía o sin fecha con qué compararla, no se reclama nada.
  function curpCuadra(curp, nacimiento) {
    var c = String(curp || '').trim().toUpperCase();
    var n = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(nacimiento || ''));
    if (!c || !n || !/^[A-Z]{4}\d{6}/.test(c)) return true;
    return c.slice(4, 10) === n[1].slice(2) + n[2] + n[3];
  }
  // La CURP como la escriben: mayúsculas, solo letras y números (fuera
  // espacios, guiones y los invisibles que trae lo copiado de WhatsApp o de un
  // PDF), y la «O» y el cero en su lugar: donde va número solo cabe el cero;
  // donde va letra, la «O». La 17 puede ser las dos (y las dos dan el mismo
  // dígito verificador): la decide la fecha de nacimiento (curpRevisar).
  // Igual que en el programa (compartido/texto.js).
  var CURP_VALORES = '0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
  function curpDigito(c) {
    var suma = 0;
    for (var i = 0; i < 17; i++) suma += CURP_VALORES.indexOf(c.charAt(i)) * (18 - i);
    return String((10 - (suma % 10)) % 10);
  }
  function curpLimpia(t, nacimiento) {
    var c = String(t || '').toUpperCase().replace(/[^A-Z0-9Ñ]/g, '');
    if (c.length !== 18) return c;
    c = c.split('').map(function (x, i) {
      return (i >= 4 && i <= 9) || i === 17 ? (x === 'O' ? '0' : x) : (i <= 15 && x === '0' ? 'O' : x);
    }).join('');
    // La 17: letra si nació desde 2000, número si antes.
    var n = /^(\d{4})-\d{2}-\d{2}$/.exec(String(nacimiento || ''));
    if (n) c = c.slice(0, 16) + (Number(n[1]) >= 2000 ? c.charAt(16).replace('0', 'O') : c.charAt(16).replace('O', '0')) + c.charAt(17);
    return c;
  }
  // ¿La CURP está bien? Su forma, una fecha que existe, el siglo (número si
  // nació antes de 2000, letra desde 2000), el dígito verificador (el último
  // sale de los otros 17) y la misma fecha de nacimiento. Devuelve true o lo
  // que hay que corregir. La regla es la del programa (curpValida).
  function curpRevisar(t, nacimiento) {
    var c = curpLimpia(t, nacimiento);
    if (!c) return 'Escriba la CURP del alumno.';
    if (!/^[A-Z]{4}\d{6}[HMX][A-Z]{5}[A-Z0-9]\d$/.test(c)) return 'La CURP tiene 18 letras y números. Revísela.';
    // Una fecha que existe en el calendario (con el siglo que dice la CURP): sin 31 de febrero.
    var anio = (/[A-Z]/.test(c.charAt(16)) ? 2000 : 1900) + Number(c.slice(4, 6)), mes = Number(c.slice(6, 8)), dia = Number(c.slice(8, 10));
    var f = new Date(Date.UTC(anio, mes - 1, dia));
    if (mes < 1 || mes > 12 || f.getUTCMonth() !== mes - 1 || f.getUTCDate() !== dia || curpDigito(c) !== c.charAt(17)) return 'Revise la CURP: alguna letra o número no está bien.';
    var n = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(nacimiento || ''));
    if (n && c.slice(4, 10) !== n[1].slice(2) + n[2] + n[3]) return 'La CURP no coincide con la fecha de nacimiento. Revise las dos.';
    if (n && (Number(n[1]) >= 2000) !== /[A-Z]/.test(c.charAt(16))) return 'Revise la CURP: alguna letra o número no está bien.';
    return true;
  }
  // Una clave al azar para un envío: si el mismo envío llega dos veces (se
  // reintentó sin saber si había llegado, o se recargó la página), el
  // programa lo reconoce por ella.
  function claveAlAzar() {
    var b = new Uint8Array(16), s = '';
    if (global.crypto && global.crypto.getRandomValues) global.crypto.getRandomValues(b);
    else for (var j = 0; j < b.length; j++) b[j] = Math.floor(Math.random() * 256);
    for (var i = 0; i < b.length; i++) s += ('0' + b[i].toString(16)).slice(-2);
    return s;
  }
  function conLetras(t, n) { return (String(t || '').match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g) || []).length >= (n || 2); }
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
      var cerrarMenu = function () { links.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', 'Abrir menú'); };
      toggle.addEventListener('click', function () {
        var abierto = links.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(abierto));
        toggle.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
      });
      links.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') cerrarMenu();
      });
      // En el celular el menú tapa media pantalla: se cierra con Escape o en
      // cuanto se toca (o se empieza a desplazar) fuera de él.
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && links.classList.contains('is-open')) { cerrarMenu(); toggle.focus(); }
      });
      document.addEventListener('pointerdown', function (e) {
        if (links.classList.contains('is-open') && !links.contains(e.target) && !toggle.contains(e.target)) cerrarMenu();
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
    // El error, ligado a su campo: el lector de pantalla lo dice al llegar ahí.
    // La ayuda propia del campo (data-describe) se queda ligada siempre.
    if (msg && campo) {
      if (!msg.id) msg.id = 'error-' + (form.id || 'form') + '-' + nombre;
      (campo.tagName ? [campo] : Array.prototype.slice.call(campo)).forEach(function (c) {
        var base = c.getAttribute('data-describe');
        if (mensaje) { c.setAttribute('aria-invalid', 'true'); c.setAttribute('aria-describedby', base ? base + ' ' + msg.id : msg.id); }
        else { c.removeAttribute('aria-invalid'); if (base) c.setAttribute('aria-describedby', base); else c.removeAttribute('aria-describedby'); }
      });
    }
  }

  function valor(form, nombre) {
    var c = form.elements[nombre];
    if (!c) return '';
    if (c.length !== undefined && !c.tagName) return c.value || '';   // grupo de radios
    if (c.type === 'radio') return c.checked ? c.value : '';          // un solo radio (un solo día que pedir)
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
    ['', 'Elija una opción'], ['instagram', 'Instagram'], ['facebook', 'Facebook'], ['tiktok', 'TikTok'],
    ['google', 'Google o Maps'], ['referido', 'Me lo recomendaron'], ['paso', 'Pasé por el gimnasio'],
    ['escuela', 'En la escuela de mi hija o hijo'], ['evento', 'Los vi en una competencia'], ['regreso', 'Ya había estado antes'], ['otro', 'Otro']
  ];

  global.Reivaj = {
    ahoraGdl: ahoraGdl, sumarDias: sumarDias, diaSemana: diaSemana, fechaLarga: fechaLarga, fechaChip: fechaChip,
    horaBonita: horaBonita, diasDePrueba: diasDePrueba, soloDigitos: soloDigitos, telefono10: telefono10, telefonoValido: telefonoValido, conLetras: conLetras,
    curpCuadra: curpCuadra, curpLimpia: curpLimpia, curpRevisar: curpRevisar, claveAlAzar: claveAlAzar,
    enlaceWhatsApp: enlaceWhatsApp, conNegritas: conNegritas, el: el, iniciarPagina: iniciarPagina,
    mostrarError: mostrarError, valor: valor, llevarA: llevarA, FUENTES: FUENTES
  };
})(window);
