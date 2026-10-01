/* =========================================================
   REIVAJ · Inscripción en línea (seis pasos)
   Lo que se escribe aquí se cierra en este navegador y viaja
   cifrado al programa del gimnasio. El borrador vive solo en esta
   pestaña (se borra al cerrarla o al día sin tocarlo) y nunca guarda
   la firma.
   ========================================================= */
(function () {
  'use strict';
  var R = window.Reivaj, CF = window.CartaFirma;
  R.iniciarPagina();
  var cargada = Date.now();

  var form = document.getElementById('inscripcion');
  var pasos = [].slice.call(form.querySelectorAll('.paso'));
  var TOTAL = pasos.length;
  var actual = 1;
  var firma = null;
  var seguroNodo = null;
  var $ = function (id) { return document.getElementById(id); };
  // Alergias, padecimientos, medicamentos y servicio médico no son obligatorios: vacío = ninguno.
  var NINGUNO = { alergias: 'Ninguna', padecimientos: 'Ninguno', medicamentos: 'Ninguno', servicio: 'Ninguno' };
  var v = function (n) { var x = R.valor(form, n); return x === '' && NINGUNO[n] ? NINGUNO[n] : x; };

  // ─── Catálogos ──────────────────────────────────────────────────────
  var PARENTESCOS = ['Madre', 'Padre', 'Abuela', 'Abuelo', 'Tía', 'Tío', 'Hermana', 'Hermano', 'Tutor legal', 'Otro'];
  form.querySelectorAll('[data-parentescos]').forEach(function (s) {
    s.appendChild(R.el('option', { value: '', texto: 'Elija' }));
    PARENTESCOS.forEach(function (p) { s.appendChild(R.el('option', { value: p, texto: p })); });
  });
  R.FUENTES.forEach(function (f) { form.elements.fuente.appendChild(R.el('option', { value: f[0], texto: f[1] })); });

  // La grabación técnica en clase, la foto de credencial y el contacto físico
  // técnico son parte del servicio: se informan en el paso 5, no se preguntan.
  var IMAGEN = [
    ['imagenRostro', 'Fotos y videos con rostro en redes y publicidad.', 'Que el alumno aparezca con el rostro reconocible en las redes sociales, la página y la publicidad de REIVAJ. Nunca se publica su nombre completo ni datos personales junto a su imagen, ni se cede a terceros o a otras marcas.'],
    ['imagenDifusion', 'Imagen sin rostro en redes y publicidad.', 'Manos, pies, silueta a contraluz o plano de detalle sin rostro reconocible, en materiales de REIVAJ.'],
    ['imagenFamilia', 'Envío a la familia.', 'Que las fotos y videos de clase se le envíen por el WhatsApp oficial del gimnasio.'],
    ['resultados', 'Resultados deportivos.', 'Publicación del nombre del alumno y su resultado en competencia.']
  ];
  var contImagen = $('permisosImagen');
  IMAGEN.forEach(function (p) {
    contImagen.appendChild(R.el('div', { clase: 'permiso field' }, [
      R.el('p', {}, [R.el('b', { texto: p[1] + ' ' }), p[2]]),
      R.el('div', { clase: 'chips', role: 'radiogroup', 'aria-label': p[1] }, [
        R.el('label', { clase: 'chip' }, [R.el('input', { type: 'radio', name: p[0], value: 'si', required: true }), R.el('span', { texto: 'Autorizo' })]),
        R.el('label', { clase: 'chip' }, [R.el('input', { type: 'radio', name: p[0], value: 'no' }), R.el('span', { texto: 'No autorizo' })])
      ]),
      R.el('p', { clase: 'error', 'data-error-for': p[0] })
    ]));
  });

  // ─── ¿Está conectada la página con el gimnasio? ─────────────────────
  var cfg = window.CONFIG || {};
  var conectado = Boolean(cfg.buzon && cfg.llavePublica && window.Buzon && window.Buzon.disponible());
  if (!conectado) {
    $('sinConexion').hidden = false;
    form.querySelectorAll('input, select, textarea, button').forEach(function (x) { x.disabled = true; });
  }

  // ─── Detalles que aparecen según lo que se contesta ─────────────────
  form.addEventListener('change', function (e) {
    var n = e.target.name;
    if (n === 'experiencia') $('experienciaDetalleCampo').hidden = v('experiencia') !== 'si';
    if (n === 'custodia') $('custodiaNota').hidden = v('custodia') !== 'si';
    if (n === 'nacimiento') mostrarEdad();
    guardarBorrador();
  });
  form.addEventListener('input', function (e) {
    // El nombre del tutor 2 o de la emergencia 2 también quita el aviso de su teléfono.
    var n = { t2Nombre: 't2Telefono', e2Nombre: 'e2Telefono' }[e.target.name] || e.target.name;
    var regla = reglaDe(n);
    if (regla && regla(v(n)) === true) R.mostrarError(form, n, '');
    // Lo último que se escribe también se guarda, aunque no se salga del campo.
    guardarEnUnRato();
  });

  function edadDe(f) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f || '')) return null;
    var hoy = R.ahoraGdl().fecha.split('-').map(Number), n = f.split('-').map(Number);
    var e = hoy[0] - n[0];
    if (hoy[1] < n[1] || (hoy[1] === n[1] && hoy[2] < n[2])) e--;
    return e;
  }
  function mostrarEdad() {
    var e = edadDe(v('nacimiento'));
    $('edadTexto').textContent = e !== null && e >= 0 && e < 100 ? 'Tiene ' + e + ' años.' : '';
  }

  // ─── Quién lo puede recoger ─────────────────────────────────────────
  var contAut = $('autorizados');
  // auto: 't1' o 't2' si la fila se llena sola con ese tutor (ver mostrar).
  function filaAutorizado(d, auto) {
    d = d || {};
    var n = contAut.children.length + 1;
    var quitar = R.el('button', { type: 'button', texto: 'Quitar' });
    var fila = R.el('div', { clase: 'grupo autorizado' }, [
      R.el('p', { clase: 'grupo__titulo' }, [R.el('span', { texto: 'Persona ' + n }), quitar]),
      R.el('div', { clase: 'field-row--3' }, [
        R.el('div', { clase: 'field' }, [R.el('label', { texto: 'Nombre completo' }), R.el('input', { 'data-a': 'nombre', value: d.nombre || '' })]),
        R.el('div', { clase: 'field' }, [R.el('label', { texto: 'Parentesco' }), R.el('input', { 'data-a': 'parentesco', value: d.parentesco || '' })]),
        R.el('div', { clase: 'field' }, [R.el('label', { texto: 'Teléfono' }), R.el('input', { 'data-a': 'telefono', type: 'tel', inputmode: 'tel', value: d.telefono || '', placeholder: '10 dígitos' })])
      ])
    ]);
    quitar.addEventListener('click', function () { fila.remove(); numerar(); guardarBorrador(); });
    contAut.appendChild(fila);
    if (auto) { fila.dataset.auto = auto; fila.dataset.puesto = valoresFila(fila); }
    numerar();
  }
  // Lo que tiene escrito la fila, para saber si alguien la cambió.
  function valoresFila(f) { return JSON.stringify([].map.call(f.querySelectorAll('[data-a]'), function (i) { return i.value; })); }
  function deTutor(t) { return { nombre: v(t + 'Nombre'), parentesco: v(t + 'Parentesco'), telefono: R.telefono10(v(t + 'Telefono')) }; }
  // Las etiquetas de la fila no van ligadas a su campo: el lector de pantalla
  // los nombra por aria-label, con el número de la persona (y el «Quitar»).
  function numerar() {
    [].forEach.call(contAut.children, function (f, i) {
      var de = ' de la persona ' + (i + 1);
      f.querySelector('.grupo__titulo span').textContent = 'Persona ' + (i + 1);
      f.querySelector('.grupo__titulo button').setAttribute('aria-label', 'Quitar a la persona ' + (i + 1));
      f.querySelectorAll('[data-a]').forEach(function (x) { x.setAttribute('aria-label', x.parentNode.querySelector('label').textContent + de); });
    });
    $('masAutorizado').hidden = contAut.children.length >= 5;
  }
  function autorizados() {
    return [].map.call(contAut.children, function (f) {
      var o = {};
      f.querySelectorAll('[data-a]').forEach(function (i) { o[i.getAttribute('data-a')] = i.value.trim(); });
      return o;
    }).filter(function (a) { return a.nombre || a.telefono; });
  }
  // La primera persona que está mal, contada como se ve («Persona N», en el
  // orden de la página; las filas vacías se saltan, como en autorizados()).
  // `campo`: el que hay que corregir (el nombre si le faltan letras; si no,
  // el teléfono).
  function autorizadoMal() {
    for (var i = 0; i < contAut.children.length; i++) {
      var f = contAut.children[i];
      var nom = f.querySelector('[data-a="nombre"]'), tel = f.querySelector('[data-a="telefono"]');
      var n = nom.value.trim(), t = tel.value.trim();
      if (!n && !t) continue;
      if (n.length < 3 || !R.conLetras(n, 3)) return { n: i + 1, campo: nom, falta: 'nombre' };
      if (!R.telefonoValido(t)) return { n: i + 1, campo: tel, falta: 'telefono' };
    }
    return null;
  }
  // Se quita lo rojo de las personas (antes de revisar otra vez).
  function limpiarAutorizados() {
    contAut.querySelectorAll('.field').forEach(function (c) { c.classList.remove('has-error'); });
    contAut.querySelectorAll('input').forEach(function (i) { i.removeAttribute('aria-invalid'); i.removeAttribute('aria-describedby'); });
  }
  // La persona que está mal se marca en rojo y, si es el primer error del
  // paso (`llevar`), se lleva ahí: el aviso queda abajo de la lista y en el
  // celular no se veía cuál era.
  function marcarAutorizado(llevar) {
    var m = autorizadoMal();
    if (!m) { if (llevar) contAut.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    var msg = form.querySelector('[data-error-for="autorizados"]');
    if (msg && !msg.id) msg.id = 'error-' + (form.id || 'form') + '-autorizados';
    var caja = m.campo.closest('.field');
    m.campo.setAttribute('aria-invalid', 'true');
    if (msg) m.campo.setAttribute('aria-describedby', msg.id);
    if (caja) caja.classList.add('has-error');
    if (!llevar) return;
    try { m.campo.focus({ preventScroll: true }); } catch (e) { /* sin foco */ }
    (caja || m.campo).scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  $('masAutorizado').addEventListener('click', function () { filaAutorizado(); });
  contAut.addEventListener('input', function (e) {
    // Al corregir, se quita lo rojo de ese campo (y el aviso, si ya quedó bien).
    var caja = e.target.closest && e.target.closest('.field');
    if (caja) caja.classList.remove('has-error');
    if (e.target.removeAttribute) { e.target.removeAttribute('aria-invalid'); e.target.removeAttribute('aria-describedby'); }
    if (REGLAS[3].autorizados() === true) R.mostrarError(form, 'autorizados', '');
    guardarBorrador();
  });

  // ─── Reglas por paso ────────────────────────────────────────────────
  var eligio = function (v) { return Boolean(v) || 'Elija una opción.'; };
  // Texto con letras de verdad (no «..» ni «123»).
  var texto = function (min, msg) { return function (v) { return (String(v).length >= min && R.conLetras(v, Math.min(min, 3))) || msg; }; };
  var TEL_MAL = 'Revise el número: 10 dígitos, con lada (ej. 33 1234 5678).';
  var tel = function (msg) { return function (v) { return R.telefonoValido(v) ? true : (R.telefono10(v) ? TEL_MAL : msg); }; };
  var telOpcional = function (v) { return !v || Boolean(R.telefonoValido(v)) || TEL_MAL; };
  // Tutor 2 y emergencia 2: sin nombre, el contacto no llega al programa.
  var telConNombre = function (p) { return function (x) { return x && !v(p + 'Nombre') ? 'Escriba también el nombre de esta persona.' : telOpcional(x); }; };
  // Dos palabras de dos letras o más, como en la carta suelta: que la carta
  // no quede firmada por «Laura», sin apellido.
  var nombreYApellido = function (msg) { return function (x) { return String(x).trim().split(/\s+/).filter(function (w) { return R.conLetras(w, 2); }).length >= 2 || msg; }; };
  var REGLAS = {
    1: {
      nombres: texto(2, 'Escriba el nombre del alumno.'),
      apellidoPaterno: texto(2, 'Escriba el apellido paterno del alumno.'),
      nacimiento: function (x) { var e = edadDe(x); return (e !== null && e >= 4 && e <= 18) || (e !== null && e >= 0 && e < 4 ? 'Recibimos a niñas y niños a partir de los 4 años.' : 'Revise la fecha de nacimiento.'); },
      rama: eligio,
      curp: function (x) { return !x || /^[A-Z]{4}\d{6}[HMX][A-Z]{5}[A-Z0-9]\d$/.test(String(x).toUpperCase()) || 'La CURP tiene 18 letras y números. Revísela o déjela vacía.'; },
      domicilio: texto(5, 'Escriba calle y número.'),
      colonia: texto(3, 'Escriba la colonia.'),
      horas: eligio,
      experiencia: eligio
    },
    2: {
      t1Nombre: nombreYApellido('Escriba nombre y apellido del tutor.'),
      t1Parentesco: function (x) { return Boolean(x) || 'Elija el parentesco.'; },
      t1Telefono: tel('Escriba un WhatsApp de 10 dígitos.'),
      t1Correo: function (x) { return !x || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(x) || 'Revise el correo.'; },
      t2Telefono: telConNombre('t2'),
      custodia: eligio
    },
    3: {
      e1Nombre: texto(3, 'Escriba el nombre.'),
      e1Parentesco: texto(3, 'Escriba el parentesco.'),
      e1Telefono: tel('Escriba un teléfono de 10 dígitos.'),
      e2Telefono: telConNombre('e2'),
      autorizados: function () {
        if (!autorizados().length) return 'Agregue al menos a una persona.';
        var m = autorizadoMal();
        if (m) return 'Revise a la persona ' + m.n + (m.falta === 'nombre' ? ': escriba su nombre completo.' : ': el teléfono lleva 10 dígitos, con lada.');
        return true;
      }
    },
    4: {
      sangre: function (x) { return Boolean(x) || 'Elija una opción (puede ser «No lo sé»).'; },
      consentimientoSalud: function (x) { return x === true || 'Sin este consentimiento no podemos inscribirlo: la ley lo pide para los datos de salud.'; }
    },
    5: (function () {
      var o = {};
      IMAGEN.forEach(function (p) { o[p[0]] = function (x) { return Boolean(x) || 'Elija «Autorizo» o «No autorizo».'; }; });
      return o;
    })(),
    6: {
      seguro: function (x) { return Boolean(x) || 'Indique si contrata el seguro.'; },
      firmante: nombreYApellido('Escriba su nombre y apellido.'),
      firmanteParentesco: function (x) { return Boolean(x) || 'Elija el parentesco.'; },
      // Con trazo pero muy chico (dos rayitas): que no crea que ya firmó.
      firma: function () { return (firma && firma.valida()) || (firma && firma.datos().trazos ? 'Su firma quedó muy corta: fírmela completa, como en papel.' : 'Firme en el recuadro con el dedo.'); },
      leida: function (x) { return x === true || 'Confirme que leyó la carta.'; },
      firmaElectronica: function (x) { return x === true || 'Confirme su firma electrónica.'; }
    }
  };
  function reglaDe(n) {
    for (var p in REGLAS) if (REGLAS[p][n]) return REGLAS[p][n];
    return null;
  }
  function revisarPaso(n) {
    var primero = null;
    if (n === 3) limpiarAutorizados();
    Object.keys(REGLAS[n]).forEach(function (k) {
      var r = REGLAS[n][k](v(k));
      R.mostrarError(form, k, r === true ? '' : r);
      if (r !== true && !primero) primero = k;
    });
    if (primero) {
      if (primero === 'firma') $('firmaCampo').scrollIntoView({ behavior: 'smooth', block: 'center' });
      else if (primero === 'autorizados') marcarAutorizado(true);
      else R.llevarA(form, primero);
    }
    // Aunque el primer error sea otro, la persona que está mal queda en rojo.
    if (n === 3 && primero !== 'autorizados') marcarAutorizado(false);
    return !primero;
  }

  // ─── Pasos ──────────────────────────────────────────────────────────
  function mostrar(n, desplazar) {
    actual = n;
    pasos.forEach(function (p) { p.hidden = Number(p.dataset.paso) !== n; });
    [].forEach.call($('barra').children, function (li, i) {
      li.className = i + 1 < n ? 'hecho' : i + 1 === n ? 'actual' : '';
    });
    $('atras').hidden = n === 1;
    $('siguiente').hidden = n === TOTAL;
    $('enviar').hidden = n !== TOTAL;
    if (n === 3 && !contAut.children.length) {
      filaAutorizado(deTutor('t1'), 't1');
      if (v('t2Nombre')) filaAutorizado(deTutor('t2'), 't2');
    } else if (n === 3) {
      // Las que se llenaron solas y nadie ha tocado siguen a su tutor: si
      // corrigió su WhatsApp en el paso 2, aquí también queda corregido.
      [].forEach.call(contAut.children, function (f) {
        if (!f.dataset.auto || f.dataset.puesto !== valoresFila(f)) return;
        var d = deTutor(f.dataset.auto);
        f.querySelectorAll('[data-a]').forEach(function (i) { i.value = d[i.getAttribute('data-a')] || ''; });
        f.dataset.puesto = valoresFila(f);
      });
    }
    if (n === TOTAL) prepararCarta();
    if (desplazar !== false) {
      var arriba = form.getBoundingClientRect().top + window.scrollY - 96;
      window.scrollTo({ top: Math.max(0, arriba), behavior: 'smooth' });
      // El foco va al paso nuevo (si no, el lector de pantalla se queda en
      // el botón o cae al principio de la página). Al cargar no se mueve.
      var t = pasos[n - 1].querySelector('.paso-titulo');
      if (t) { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
    }
    guardarBorrador();
    armarTrampa();
  }
  $('siguiente').addEventListener('click', function () { if (revisarPaso(actual)) mostrar(actual + 1); });
  $('atras').addEventListener('click', function () { mostrar(actual - 1); });

  // El «atrás» del celular regresa un paso, no cierra la pestaña (con ella se
  // iría el borrador). Una sola entrada de más en el historial, que se vuelve
  // a poner al usarla; en el paso 1 sale como siempre. El «adelante» no
  // avanza: así nadie se brinca la revisión de un paso. `trampa`: si la
  // entrada en la que se está es esa (también al recargar la página).
  var trampa = Boolean(history.state && history.state.reivajPaso);
  function armarTrampa() {
    if (trampa || actual <= 1) return;
    try { history.pushState({ reivajPaso: true }, ''); trampa = true; } catch (e) { /* sin historial: no pasa nada */ }
  }
  window.addEventListener('popstate', function (e) {
    trampa = Boolean(e.state && e.state.reivajPaso);
    if (trampa || form.hidden || actual <= 1) return;
    mostrar(actual - 1);
  });

  // ─── La carta ───────────────────────────────────────────────────────
  function nombreCompleto() {
    return [v('nombres'), v('apellidoPaterno'), v('apellidoMaterno')].filter(Boolean).join(' ').replace(/\s+/g, ' ');
  }
  function contacto(n) {
    var t = R.telefono10(v(n + 'Telefono'));
    return v(n + 'Nombre') ? v(n + 'Nombre') + (v(n + 'Parentesco') ? ' (' + v(n + 'Parentesco') + ')' : '') + (t ? ' · ' + t : '') : '';
  }
  function hoyLargo() { var f = R.ahoraGdl().fecha; return R.fechaLarga(f) + ' de ' + f.slice(0, 4); }
  function datosCarta() {
    var e = edadDe(v('nacimiento'));
    return {
      alumno: nombreCompleto(), edad: e !== null ? e + ' años' : '', fecha: hoyLargo(),
      tutor: v('firmante') || v('t1Nombre'), emergencia1: contacto('e1'), emergencia2: contacto('e2'), sangre: v('sangre')
    };
  }
  function fichaCarta() {
    var C = window.CARTA_SEGURIDAD.secciones.filter(function (s) { return s.campos; })[0].campos;
    return [[C[0], v('alergias')], [C[1], v('padecimientos')], [C[2], v('medicamentos')], [C[3], v('servicio')], [C[4], v('afiliacion')]];
  }
  function prepararCarta() {
    if (!seguroNodo) seguroNodo = CF.opcionesSeguro('seguro');
    var ficha = R.el('div', {}, [
      R.el('div', { clase: 'carta__datos' }, fichaCarta().map(function (x) { return R.el('div', {}, [R.el('span', { texto: x[0] }), R.el('b', { texto: x[1] || '—' })]); })),
      R.el('p', { clase: 'field__ayuda' }, ['Si algo no está bien, ', R.el('a', { href: '#', texto: 'corríjalo en la ficha médica', onclick: function (e) { e.preventDefault(); mostrar(4); } }), '.'])
    ]);
    // Quien firma sigue al tutor 1 mientras nadie lo toque: si corrigió el
    // nombre en el paso 2, la carta y este campo salen ya corregidos. Si aquí
    // escribió otro nombre, se respeta. Antes de pintar: la carta lo usa.
    var fi = form.elements.firmante, fp = form.elements.firmanteParentesco;
    if (!fi.value.trim() || fi.value === fi.dataset.puesto) { fi.value = v('t1Nombre'); fi.dataset.puesto = fi.value; }
    if (!fp.value || fp.value === fp.dataset.puesto) { fp.value = v('t1Parentesco'); fp.dataset.puesto = fp.value; }
    CF.pintarCarta($('carta'), datosCarta(), { seguro: seguroNodo, seccion4: ficha });
    $('textoEnLinea').textContent = window.CARTA_SEGURIDAD.enLinea;
    if (!firma) {
      firma = CF.Firma($('firma'));
      firma.alCambiar = function () { if (firma.valida()) R.mostrarError(form, 'firma', ''); };
    } else firma.medir();
  }

  // ─── Enviar ─────────────────────────────────────────────────────────
  function armarDatos(huella, cuando) {
    var sn = function (n) { return v(n) === 'si'; };
    var permisos = { imagenInterna: true, imagenExpediente: true, contactoFisico: true, promociones: v('promociones') === true, encuestas: v('encuestas') === true, testimonios: v('testimonios') === true };
    IMAGEN.forEach(function (p) { permisos[p[0]] = sn(p[0]); });
    return {
      alumno: {
        nombre: nombreCompleto(), nombres: v('nombres'), apellidoPaterno: v('apellidoPaterno'), apellidoMaterno: v('apellidoMaterno'),
        nacimiento: v('nacimiento'), rama: v('rama'), curp: v('curp').toUpperCase(), escuela: v('escuela'),
        domicilio: v('domicilio'), colonia: v('colonia'), cp: v('cp'),
        experiencia: v('experiencia') === 'si' ? (v('experienciaDetalle') || 'sí') : 'no'
      },
      tutor1: { nombre: v('t1Nombre'), parentesco: v('t1Parentesco'), telefono: R.telefono10(v('t1Telefono')), correo: v('t1Correo') },
      tutor2: v('t2Nombre') ? { nombre: v('t2Nombre'), parentesco: v('t2Parentesco'), telefono: R.telefono10(v('t2Telefono')) } : null,
      custodia: v('custodia'),
      emergencias: ['e1', 'e2'].filter(function (n) { return v(n + 'Nombre'); }).map(function (n) {
        return { nombre: v(n + 'Nombre'), parentesco: v(n + 'Parentesco'), telefono: R.telefono10(v(n + 'Telefono')) };
      }),
      autorizados: autorizados().map(function (a) { return { nombre: a.nombre, parentesco: a.parentesco, telefono: R.telefono10(a.telefono) }; }),
      salud: { sangre: v('sangre'), servicio: v('servicio'), afiliacion: v('afiliacion'), alergias: v('alergias'), padecimientos: v('padecimientos'), medicamentos: v('medicamentos'), mas: v('mas') },
      consentimientoSalud: v('consentimientoSalud') === true,
      permisos: permisos,
      fuente: v('fuente'),
      plan: { horas: Number(v('horas')) || null },
      carta: {
        documento: window.CARTA_SEGURIDAD.documento, version: window.CARTA_SEGURIDAD.version, huella: huella,
        seguro: v('seguro'), firmante: v('firmante'), parentesco: v('firmanteParentesco'),
        firma: firma.datos(), firmadaEn: cuando.toISOString(), leida: true, firmaElectronica: true,
        dispositivo: String(navigator.userAgent || '').slice(0, 180)
      }
    };
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!conectado) return;
    // Enter o «Ir» del teclado antes del último paso: funciona como «Siguiente».
    if (actual !== TOTAL) { if (revisarPaso(actual)) mostrar(actual + 1); return; }
    if (!revisarPaso(TOTAL)) return;
    var boton = $('enviar');
    boton.disabled = true;
    boton.textContent = 'Enviando…';
    $('nota').textContent = '';
    var cuando = new Date();
    var r;
    try {
      var huella = await CF.huellaCarta();
      var datos = armarDatos(huella, cuando);
      // El buzón descarta sin aviso lo que llega antes de 2.5 s de abierta la
      // página (la trampa para robots): tras una recarga, se espera ese rato.
      var falta = 2600 - (Date.now() - cargada);
      if (falta > 0) await new Promise(function (listo) { setTimeout(listo, falta); });
      r = await window.Buzon.enviar('inscripcion', { enviado: cuando.toISOString(), datos: datos }, { hp: v('sitio'), t: Date.now() - cargada });
      r.datos = datos;
    } catch (err) {
      r = { ok: false, error: 'No se pudo preparar el envío. Intente de nuevo.' };
    }
    boton.disabled = false;
    boton.textContent = 'Enviar inscripción';
    if (!r.ok) {
      // Lo de la red lo escribe buzon.js (de usted); lo que conteste el buzón
      // no es para las familias (viene de tú y a veces ya pide WhatsApp).
      // El WhatsApp va con link, sin datos del alumno en el mensaje.
      $('nota').textContent = (r.red ? (r.error || 'Sin conexión. Revise su internet e intente de nuevo.') : 'No se pudo enviar. Intente de nuevo en un momento.') + ' Si el problema continúa, escríbanos por ';
      $('nota').appendChild(R.el('a', { href: R.enlaceWhatsApp('Hola, intenté enviar la inscripción en línea y no se pudo.'), target: '_blank', rel: 'noopener', texto: 'WhatsApp' }));
      $('nota').appendChild(document.createTextNode('.'));
      $('nota').classList.add('form__note--mal');
      return;
    }
    copia = { datos: datosCarta(), extra: {
      seguro: r.datos.carta.seguro, ficha: fichaCarta(), firma: r.datos.carta.firma, firmante: r.datos.carta.firmante,
      parentesco: r.datos.carta.parentesco, huella: r.datos.carta.huella, folio: r.id || '',
      cuando: cuando.toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'long', timeStyle: 'short' })
    } };
    CF.armarCopia($('copia'), copia.datos, copia.extra);
    $('listoTexto').textContent = 'Recibimos la inscripción de ' + v('nombres') + '. En recepción confirmamos grupo, horario y forma de pago.';
    form.hidden = true;
    $('listo').hidden = false;
    // El foco estaba en el botón que se acaba de ocultar: pasa al aviso.
    $('listo').setAttribute('tabindex', '-1');
    $('listo').focus({ preventScroll: true });
    borrarBorrador();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  var copia = null;
  $('descargarPdf').addEventListener('click', function () {
    // Con mala señal jsPDF tarda en bajar: el botón dice que está en eso.
    var b = this, txt = b.textContent;
    if (!copia || b.disabled) return;
    b.disabled = true;
    b.textContent = 'Preparando su PDF…';
    window.CartaPDF.descargar(copia.datos, copia.extra).then(function () { b.disabled = false; b.textContent = txt; });
  });
  $('guardarCopia').addEventListener('click', function () { window.print(); });

  // ─── Borrador en esta pestaña (sin firma) ───────────────────────────
  var CLAVE = 'reivaj_inscripcion_borrador';
  var DIA = 24 * 60 * 60 * 1000;
  var espera = null;
  function guardarEnUnRato() { clearTimeout(espera); espera = setTimeout(guardarBorrador, 400); }
  // Si la pestaña se va (recargar, cerrar) con algo recién escrito, se guarda ya.
  window.addEventListener('pagehide', function () { if (espera) guardarBorrador(); });
  function guardarBorrador() {
    clearTimeout(espera); espera = null;
    try {
      var o = { paso: actual, t: Date.now(), campos: {}, autorizados: autorizados() };
      [].forEach.call(form.elements, function (x) {
        if (!x.name || x.name === 'sitio' || x.name === 'seguro') return;
        if (x.type === 'radio') { if (x.checked) o.campos[x.name] = x.value; }
        else if (x.type === 'checkbox') o.campos[x.name] = x.checked;
        else o.campos[x.name] = x.value;
      });
      sessionStorage.setItem(CLAVE, JSON.stringify(o));
    } catch (e) { /* sin almacenamiento: no pasa nada */ }
  }
  function borrarBorrador() { clearTimeout(espera); espera = null; try { sessionStorage.removeItem(CLAVE); } catch (e) { /* nada */ } }
  function recuperar() {
    var o = null;
    try { o = JSON.parse(sessionStorage.getItem(CLAVE) || 'null'); } catch (e) { o = null; }
    // El celular restaura pestañas por semanas: un borrador de más de un día
    // (o sin fecha) se tira, para que otro que abra la pestaña no lo vea.
    if (o && !(Math.abs(Date.now() - (Number(o.t) || 0)) < DIA)) { borrarBorrador(); o = null; }
    if (!o) return 1;
    Object.keys(o.campos || {}).forEach(function (k) {
      var c = form.elements[k];
      if (!c) return;
      if (c.length !== undefined && !c.tagName) { [].forEach.call(c, function (r) { r.checked = r.value === o.campos[k]; }); }
      else if (c.type === 'checkbox') c.checked = Boolean(o.campos[k]);
      else c.value = o.campos[k];
    });
    // Sin marca de tutor: lo del borrador ya no se llena solo.
    (o.autorizados || []).forEach(function (a) { filaAutorizado(a); });
    $('experienciaDetalleCampo').hidden = v('experiencia') !== 'si';
    $('custodiaNota').hidden = v('custodia') !== 'si';
    mostrarEdad();
    return Math.min(Math.max(1, o.paso || 1), TOTAL);
  }

  if (conectado) mostrar(recuperar(), false);
  else mostrar(1, false);
  // El botón de enviar viene apagado en el HTML: así, si alguien da Enter
  // antes de que cargue este script, el navegador no manda el formulario
  // por su cuenta. Encendido, Enter pasa por el manejador de arriba.
  if (conectado) $('enviar').disabled = false;
})();
