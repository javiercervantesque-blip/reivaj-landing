/* =========================================================
   REIVAJ · Carta de seguridad para familias ya inscritas
   ========================================================= */
(function () {
  'use strict';
  var R = window.Reivaj, CF = window.CartaFirma;
  R.iniciarPagina();
  var cargada = Date.now();
  var form = document.getElementById('formCarta');
  var $ = function (id) { return document.getElementById(id); };
  // Alergias, padecimientos, medicamentos y servicio médico no son obligatorios: vacío = ninguno.
  var NINGUNO = { alergias: 'Ninguna', padecimientos: 'Ninguno', medicamentos: 'Ninguno', servicio: 'Ninguno' };
  var v = function (n) { var x = R.valor(form, n); return x === '' && NINGUNO[n] ? NINGUNO[n] : x; };
  var firma = null;

  // El link que manda el gimnasio desde el expediente trae un código del
  // alumno después del «#» (/carta#c=…): con él, el programa sabe de quién es
  // la carta sin adivinar por el nombre. Desde la 1.3.21 del programa trae
  // también (f=…) el nombre que tiene el gimnasio de cada hijo de ese
  // WhatsApp, cada uno con su código: la carta llega con el nombre y, con
  // hermanos, se escoge de quién es y al terminar sigue la del otro. La fecha
  // de nacimiento la escribe la familia con sus datos reales (23-oct-2026, lo
  // pidió Javier: la del gimnasio pudo venir cruzada); la que traían los links
  // de antes no se pone. Lo que va después del
  // «#» no llega al servidor de la página; el código va solo dentro del sobre
  // cerrado, y todo se quita de la barra en cuanto se lee.
  var codigo = '';
  var CODIGO = /^[A-Za-z0-9_-]{16,64}$/;
  var familia = [];
  var actual = null; // el hijo de la familia cuya carta se está llenando
  function deLaFamilia(lista) {
    return (Array.isArray(lista) ? lista : []).slice(0, 6).map(function (k) {
      return { codigo: String(k && k.codigo || ''), nombre: String(k && k.nombre || '').replace(/\s+/g, ' ').trim().slice(0, 120), firmada: Boolean(k && k.firmada) };
    }).filter(function (k) { return CODIGO.test(k.codigo) && k.nombre; });
  }
  // f = base64url de un renglón por hijo: código, nombre y nacimiento (vacío
  // desde el 23-oct-2026; si viene, no se usa) separados por tabulador.
  function leerFamilia(t) {
    try {
      var b = atob(String(t).replace(/-/g, '+').replace(/_/g, '/'));
      var bytes = new Uint8Array(b.length);
      for (var i = 0; i < b.length; i++) bytes[i] = b.charCodeAt(i);
      return deLaFamilia(new TextDecoder().decode(bytes).split('\n').map(function (l) {
        var p = l.split('\t');
        return { codigo: p[0], nombre: p[1] };
      }));
    } catch (e) { return []; }
  }
  (function () {
    var h = String(location.hash || '');
    var m = /(?:^#|&)c=([A-Za-z0-9_-]{16,64})(?:&|$)/.exec(h);
    var f = /(?:^#|&)f=([A-Za-z0-9_-]{4,2000})(?:&|$)/.exec(h);
    if (!m && !f) return;
    if (f) familia = leerFamilia(f[1]);
    codigo = m ? m[1] : familia.length ? familia[0].codigo : '';
  })();
  var delLink = Boolean(codigo);
  // Otro link abierto en esta misma pestaña: el navegador solo cambia el «#».
  window.addEventListener('hashchange', function () { if (/(?:^#|&)[cf]=/.test(String(location.hash || ''))) location.reload(); });

  // Los nombres se comparan como en el programa (reglas.js, mismaPersona):
  // sin acentos ni mayúsculas, palabras de 3 letras o más, el mismo primer
  // nombre y todas las palabras del más corto dentro del más largo.
  var normal = function (t) { return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9ñ@.\s]/g, ' ').replace(/\s+/g, ' ').trim(); };
  function palabrasDe(t) { return normal(t).split(' ').filter(function (w) { return w.length >= 3; }); }
  function mismaPersona(a, b) {
    var x = palabrasDe(a), y = palabrasDe(b);
    if (!x.length || !y.length || x[0] !== y[0]) return false;
    var corto = x.length <= y.length ? x : y, largo = corto === x ? y : x;
    return corto.every(function (w) { return largo.indexOf(w) >= 0; });
  }
  var primera = function (t) { return normal(t).split(' ')[0] || ''; };
  // Cómo se nombra a un hijo en los botones: su primer nombre, o los dos
  // primeros si otro hermano del link se llama igual.
  var PARTICULAS = ['de', 'del', 'la', 'las', 'los', 'y'];
  function corto(k) {
    var w = k.nombre.split(' '), i = 0;
    var repetido = familia.some(function (x) { return x !== k && primera(x.nombre) === primera(k.nombre); });
    // «María de Jesús»: la partícula no cuenta como el segundo nombre.
    if (repetido) { i = 1; while (i < w.length - 1 && PARTICULAS.indexOf(normal(w[i])) >= 0) i++; }
    return w.slice(0, i + 1).join(' ');
  }
  // La clave de este envío: si la misma carta llega dos veces (se reintentó
  // sin saber si había llegado, o se recargó la página), el programa aparta
  // la repetida. Una nueva para cada carta.
  var envio = R.claveAlAzar();
  // De qué alumno es la clave: si después de un envío sin confirmar se
  // cambia el alumno, la carta nueva no debe tomarse por repetida.
  var envioDe = '';

  var PARENTESCOS = ['Madre', 'Padre', 'Abuela', 'Abuelo', 'Tía', 'Tío', 'Hermana', 'Hermano', 'Tutor legal', 'Otro'];
  form.querySelectorAll('[data-parentescos]').forEach(function (s) {
    s.appendChild(R.el('option', { value: '', texto: 'Elija' }));
    PARENTESCOS.forEach(function (p) { s.appendChild(R.el('option', { value: p, texto: p })); });
  });

  // ─── Para completar su expediente (21-oct-2026) ──────────────────────
  // Lo que la inscripción en línea pide y la carta no pedía: quién puede
  // recogerlo, custodia, segundo tutor, CURP, permisos de imagen y avisos,
  // con los mismos textos. Llega en el mismo sobre que la carta y el programa
  // lo pasa al expediente (sin el link de su expediente, quién lo recoge no
  // se guarda solo).
  var IMAGEN = [
    ['imagenRostro', 'Fotos y videos con rostro en redes y publicidad.', 'Que el alumno aparezca con el rostro reconocible en las redes sociales, la página y la publicidad de REIVAJ. Nunca se publica su nombre completo ni datos personales junto a su imagen, ni se cede a terceros o a otras marcas.'],
    ['imagenDifusion', 'Imagen sin rostro en redes y publicidad.', 'Manos, pies, silueta a contraluz o plano de detalle sin rostro reconocible, en materiales de REIVAJ.'],
    ['imagenFamilia', 'Envío a la familia.', 'Que las fotos y videos de clase se le envíen por el WhatsApp oficial del gimnasio.'],
    ['resultados', 'Resultados deportivos.', 'Publicación del nombre del alumno y su resultado en competencia.']
  ];
  IMAGEN.forEach(function (p) {
    $('permisosImagen').appendChild(R.el('div', { clase: 'permiso field' }, [
      R.el('p', {}, [R.el('b', { texto: p[1] + ' ' }), p[2]]),
      R.el('div', { clase: 'chips', role: 'radiogroup', 'aria-label': p[1] }, [
        R.el('label', { clase: 'chip' }, [R.el('input', { type: 'radio', name: p[0], value: 'si', required: true }), R.el('span', { texto: 'Autorizo' })]),
        R.el('label', { clase: 'chip' }, [R.el('input', { type: 'radio', name: p[0], value: 'no' }), R.el('span', { texto: 'No autorizo' })])
      ]),
      R.el('p', { clase: 'error', 'data-error-for': p[0] })
    ]));
  });

  // Quién lo puede recoger. La primera persona se llena sola con quien firma
  // mientras nadie la cambie (como el tutor 1 en la inscripción).
  var contAut = $('autorizados');
  function valoresFila(f) { return JSON.stringify([].map.call(f.querySelectorAll('[data-a]'), function (i) { return i.value; })); }
  function filaAutorizado(d, auto) {
    d = d || {};
    var quitar = R.el('button', { type: 'button', texto: 'Quitar' });
    var fila = R.el('div', { clase: 'grupo autorizado' }, [
      R.el('p', { clase: 'grupo__titulo' }, [R.el('span', { texto: 'Persona' }), quitar]),
      R.el('div', { clase: 'field-row--3' }, [
        R.el('div', { clase: 'field' }, [R.el('label', { texto: 'Nombre completo' }), R.el('input', { 'data-a': 'nombre', value: d.nombre || '', autocomplete: 'off' })]),
        R.el('div', { clase: 'field' }, [R.el('label', { texto: 'Parentesco' }), R.el('input', { 'data-a': 'parentesco', value: d.parentesco || '', autocomplete: 'off' })]),
        R.el('div', { clase: 'field' }, [R.el('label', { texto: 'Teléfono' }), R.el('input', { 'data-a': 'telefono', type: 'tel', inputmode: 'tel', value: d.telefono || '', placeholder: '10 dígitos', autocomplete: 'off' })])
      ])
    ]);
    quitar.addEventListener('click', function () { fila.remove(); numerar(); guardarBorrador(); });
    contAut.appendChild(fila);
    if (auto) { fila.dataset.auto = auto; fila.dataset.puesto = valoresFila(fila); }
    numerar();
  }
  // Las etiquetas de la fila no van ligadas a su campo: el lector de pantalla
  // los nombra por aria-label, con el número de la persona.
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
  function autorizadoMal() {
    for (var i = 0; i < contAut.children.length; i++) {
      var f = contAut.children[i];
      var n = f.querySelector('[data-a="nombre"]').value.trim(), t = f.querySelector('[data-a="telefono"]').value.trim();
      if (!n && !t) continue;
      if (n.length < 3 || !R.conLetras(n, 3)) return { n: i + 1, falta: 'nombre' };
      if (!R.telefonoValido(t)) return { n: i + 1, falta: 'telefono' };
    }
    return null;
  }
  function seguirAlFirmante() {
    var f = contAut.querySelector('[data-auto="firmante"]');
    if (!f) return;
    if (valoresFila(f) !== f.dataset.puesto) { delete f.dataset.auto; return; }
    var d = { nombre: form.elements.firmante.value.trim(), parentesco: form.elements.parentesco.value, telefono: R.telefono10(form.elements.telefono.value) || form.elements.telefono.value.trim() };
    ['nombre', 'parentesco', 'telefono'].forEach(function (k) { f.querySelector('[data-a="' + k + '"]').value = d[k]; });
    f.dataset.puesto = valoresFila(f);
  }
  filaAutorizado({}, 'firmante');
  $('masAutorizado').addEventListener('click', function () { filaAutorizado(); guardarBorrador(); });
  // Los datos del otro tutor solo se piden (y se ven) si dice que sí hay.
  function verOtroTutor() { $('tutor2Campos').hidden = v('otroTutor') !== 'si'; }

  var cfg = window.CONFIG || {};
  var conectado = Boolean(cfg.buzon && cfg.llavePublica && window.Buzon && window.Buzon.disponible());

  // La ficha médica va dentro del apartado 4, con los mismos títulos del papel.
  var C = window.CARTA_SEGURIDAD;
  var CAMPOS = C.secciones.filter(function (s) { return s.campos; })[0].campos;
  var NOMBRES = ['alergias', 'padecimientos', 'medicamentos', 'servicio', 'afiliacion'];
  var AYUDA = ['Si no tiene, déjelo en blanco', 'Si no tiene, déjelo en blanco', 'Si no toma, déjelo en blanco', 'Si no tiene, déjelo en blanco', 'Si aplica'];
  var seccion4 = R.el('div', { clase: 'grupo' }, CAMPOS.map(function (t, i) {
    return R.el('div', { clase: 'field' }, [
      R.el('label', { for: NOMBRES[i], texto: t }),
      R.el('input', { id: NOMBRES[i], name: NOMBRES[i], placeholder: AYUDA[i] }),
      R.el('p', { clase: 'error', 'data-error-for': NOMBRES[i] })
    ]);
  }));
  var seguro = CF.opcionesSeguro('seguro', 'aseguradora');

  function edadDe(f) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f || '')) return null;
    var hoy = R.ahoraGdl().fecha.split('-').map(Number), n = f.split('-').map(Number);
    var e = hoy[0] - n[0];
    if (hoy[1] < n[1] || (hoy[1] === n[1] && hoy[2] < n[2])) e--;
    return e;
  }
  function contacto(n) {
    var t = R.telefono10(v(n + 'Telefono'));
    return v(n + 'Nombre') ? v(n + 'Nombre') + (v(n + 'Parentesco') ? ' (' + v(n + 'Parentesco') + ')' : '') + (t ? ' · ' + t : '') : '';
  }
  function datosCarta() {
    var e = edadDe(v('nacimiento'));
    var f = R.ahoraGdl().fecha;
    return {
      alumno: v('alumno'), edad: e !== null ? e + ' años' : '', fecha: R.fechaLarga(f) + ' de ' + f.slice(0, 4),
      tutor: v('firmante'), emergencia1: contacto('e1'), emergencia2: contacto('e2'), sangre: v('sangre')
    };
  }
  function pintar() { CF.pintarCarta($('carta'), datosCarta(), { seguro: seguro, seccion4: seccion4 }); }
  pintar();
  // El encabezado de la carta se va llenando con lo que se escribe arriba.
  var temporizador = null;
  form.addEventListener('input', function (e) {
    guardarEnUnRato();
    if (e.target.name === 'firmante' || e.target.name === 'telefono') seguirAlFirmante();
    if (e.target.closest('#autorizados') && autorizados().length) R.mostrarError(form, 'autorizados', '');
    if (e.target.closest('#carta')) return;
    clearTimeout(temporizador);
    temporizador = setTimeout(pintar, 400);
  });
  $('textoEnLinea').textContent = C.enLinea;
  firma = CF.Firma($('firma'));
  firma.alCambiar = function () { if (firma.valida()) R.mostrarError(form, 'firma', ''); };

  // ─── De quién es la carta (link con los datos del gimnasio) ─────────
  function ponerAlumno(k) {
    actual = k;
    codigo = k.codigo;
    form.elements.alumno.value = k.nombre;
    form.elements.nacimiento.value = '';
    $('ayudaAlumno').hidden = false;
    pintarFamilia();
  }
  function pintarFamilia() {
    var caja = $('familiaHijos');
    $('familia').hidden = familia.length < 2;
    caja.innerHTML = '';
    if (familia.length < 2) return;
    familia.forEach(function (k) {
      var r = R.el('input', { type: 'radio', name: 'deQuien', value: k.codigo });
      r.checked = k === actual;
      r.disabled = k.firmada;
      caja.appendChild(R.el('label', { clase: 'chip' }, [r, R.el('span', { texto: k.nombre + (k.firmada ? ' · firmada ✓' : '') })]));
    });
  }
  // ¿De cuál hijo del link es el nombre escrito? El mismo nombre exacto, o
  // si no el único que cuadre (el que se está llenando gana si cuadra).
  function hijoDelNombre(nom) {
    var pend = familia.filter(function (k) { return !k.firmada; });
    var exacto = pend.filter(function (k) { return normal(k.nombre) === normal(nom); });
    if (exacto.length === 1) return exacto[0];
    var cuadran = pend.filter(function (k) { return mismaPersona(k.nombre, nom); });
    if (actual && cuadran.indexOf(actual) >= 0) return actual;
    return cuadran.length === 1 ? cuadran[0] : null;
  }
  // Escribieron encima el nombre de otro hijo del link: la carta pasa a ser
  // de ese, con su código (la fecha es la que escribieron ellos).
  function alCambiarNombre() {
    if (!familia.length) return;
    var k = hijoDelNombre(v('alumno'));
    if (!k || k === actual) return;
    actual = k; codigo = k.codigo;
    $('ayudaAlumno').hidden = false;
    pintarFamilia();
    pintar();
  }
  // Lo del alumno (sus datos, su salud, el seguro y la firma) se llena de
  // nuevo; quien firma, su WhatsApp y las emergencias se quedan.
  function limpiarAlumno() {
    ['alumno', 'nacimiento', 'curp', 'escuela', 'mas', 'sangre', 'alergias', 'padecimientos', 'medicamentos', 'servicio', 'afiliacion', 'aseguradora'].forEach(function (n) { form.elements[n].value = ''; });
    ['consentimientoSalud', 'leida', 'firmaElectronica'].forEach(function (n) { form.elements[n].checked = false; });
    [].forEach.call(form.querySelectorAll('input[name="seguro"], input[name="custodia"], #permisosImagen input[type="radio"]'), function (r) { r.checked = false; });
    $('custodiaNota').hidden = true;
    seguro.actualizar();
    form.querySelectorAll('.has-error').forEach(function (f) { f.classList.remove('has-error'); });
    form.querySelectorAll('.error').forEach(function (f) { f.textContent = ''; f.classList.remove('is-visible'); });
    $('nota').textContent = '';
    $('nota').classList.remove('form__note--mal');
    firma.borrar();
    actual = null; codigo = '';
    $('ayudaAlumno').hidden = true;
  }
  $('familiaHijos').addEventListener('change', function (e) {
    var k = familia.filter(function (x) { return x.codigo === e.target.value; })[0];
    if (!k || k === actual || enviando) return;
    var lleno = (firma.datos().trazos || 0) > 0 || ['sangre', 'alergias', 'padecimientos', 'medicamentos', 'servicio', 'curp', 'escuela', 'mas'].some(function (n) { return R.valor(form, n); });
    if (lleno && actual && !window.confirm('Se borra lo que llenó de ' + corto(actual) + ' (CURP, escuela, ficha médica, permisos y firma) para llenar la carta de ' + corto(k) + '. ¿Continuar?')) { pintarFamilia(); return; }
    limpiarAlumno();
    ponerAlumno(k);
    pintar();
    var marcado = $('familiaHijos').querySelector('input:checked');
    if (marcado) marcado.focus();
    guardarBorrador();
  });
  if (familia.length) { ponerAlumno(familia.filter(function (k) { return k.codigo === codigo; })[0] || familia[0]); pintar(); }

  if (conectado && location.hash) { try { history.replaceState(history.state, '', location.pathname + location.search); } catch (e) { /* sin historial: no pasa nada */ } }
  if (!conectado) {
    $('sinConexion').hidden = false;
    form.querySelectorAll('input, select, textarea, button').forEach(function (x) { x.disabled = true; });
  }

  // Texto con letras de verdad (no «...» ni «123»), como en la inscripción.
  var texto = function (min, msg) { return function (x) { return (String(x).length >= min && R.conLetras(x, Math.min(min, 3))) || msg; }; };
  // Un teléfono de verdad (no 1234567890 ni 0000000000), como en la inscripción.
  var TEL_MAL = 'Revise el número: 10 dígitos, con lada (ej. 33 1234 5678).';
  var tel = function (msg) { return function (x) { return R.telefonoValido(x) ? true : (R.telefono10(x) ? TEL_MAL : msg); }; };
  // Dos palabras de dos letras o más, como lo pide el programa: con una sola
  // («Sofía») la carta no entra a su expediente (se queda en Descartadas).
  var nombreYApellido = function (msg) { return function (x) { return String(x).trim().split(/\s+/).filter(function (w) { return R.conLetras(w, 2); }).length >= 2 || msg; }; };
  var elegido = function (x) { return Boolean(x) || 'Elija «Autorizo» o «No autorizo».'; };
  // En el orden de la página: el primer error que se señala es el de más arriba.
  var REGLAS = {
    alumno: nombreYApellido('Escriba nombre y apellido del alumno.'),
    nacimiento: function (x) { var e = edadDe(x); return (e !== null && e >= 3 && e <= 25) || 'Revise la fecha de nacimiento.'; },
    // Obligatoria desde el 23-oct-2026, con su dígito verificador y la misma fecha de nacimiento.
    curp: function (x) { return R.curpRevisar(x, v('nacimiento')); },
    firmante: nombreYApellido('Escriba su nombre y apellido.'),
    parentesco: function (x) { return Boolean(x) || 'Elija el parentesco.'; },
    telefono: tel('Escriba un WhatsApp de 10 dígitos.'),
    correo: function (x) { return !x || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(x) || 'Revise el correo.'; },
    domicilio: texto(5, 'Escriba calle y número.'),
    colonia: texto(3, 'Escriba la colonia.'),
    cp: function (x) { return !x || /^\d{5}$/.test(String(x).trim()) || 'El código postal lleva 5 dígitos.'; },
    e1Nombre: texto(3, 'Escriba el nombre.'),
    e1Parentesco: texto(3, 'Escriba el parentesco.'),
    e1Telefono: tel('Escriba un teléfono de 10 dígitos.'),
    // Sin nombre, la emergencia 2 no llega al programa: con teléfono, se pide.
    e2Telefono: function (x) { return !x || (!v('e2Nombre') ? 'Escriba también el nombre de esta persona.' : Boolean(R.telefonoValido(x)) || TEL_MAL); },
    sangre: function (x) { return Boolean(x) || 'Elija una opción (puede ser «No lo sé»).'; },
    autorizados: function () {
      if (!autorizados().length) return 'Agregue al menos a una persona.';
      var m = autorizadoMal();
      if (m) return 'Revise a la persona ' + m.n + (m.falta === 'nombre' ? ': escriba su nombre completo.' : ': el teléfono lleva 10 dígitos, con lada.');
      return true;
    },
    custodia: function (x) { return Boolean(x) || 'Elija una opción.'; },
    // Desde el 23-oct-2026 la carta sustituye los datos de su ficha: se pide
    // si hay o no otro tutor (un «no» lo quita de la ficha) y, si hay, completo.
    otroTutor: function (x) { return Boolean(x) || 'Elija «Sí» o «No».'; },
    t2Nombre: function (x) { return v('otroTutor') !== 'si' || nombreYApellido('Escriba nombre y apellido.')(x); },
    t2Parentesco: function (x) { return v('otroTutor') !== 'si' || Boolean(x) || 'Elija el parentesco.'; },
    t2Telefono: function (x) {
      if (v('otroTutor') !== 'si') return true;
      if (!R.telefonoValido(x)) return R.telefono10(x) ? TEL_MAL : 'Escriba un teléfono de 10 dígitos.';
      // El suyo ya está arriba: aquí va el del otro padre, madre o tutor.
      return R.telefono10(x) !== R.telefono10(v('telefono')) || 'Es el mismo WhatsApp que el suyo: escriba el del otro padre, madre o tutor.';
    },
    imagenRostro: elegido, imagenDifusion: elegido, imagenFamilia: elegido, resultados: elegido,
    seguro: function (x) { return Boolean(x) || 'Indique si contrata el seguro.'; },
    aseguradora: function (x) { return v('seguro') !== 'propio' || (String(x).length >= 2 && R.conLetras(x, 2)) || 'Escriba con qué aseguradora cuenta.'; },
    consentimientoSalud: function (x) { return x === true || 'Sin este consentimiento no podemos guardar sus datos de salud.'; },
    // Con trazo pero muy chico (dos rayitas): que no crea que ya firmó.
    firma: function () { return firma.valida() || (firma.datos().trazos ? 'Su firma quedó muy corta o es solo una raya: fírmela completa, como en papel.' : 'Firme en el recuadro con el dedo.'); },
    leida: function (x) { return x === true || 'Confirme que leyó la carta.'; },
    firmaElectronica: function (x) { return x === true || 'Confirme su firma electrónica.'; }
  };
  form.addEventListener('change', function (e) {
    // El nombre de la emergencia 2 también quita el aviso de su teléfono.
    var n = e.target.name === 'e2Nombre' ? 'e2Telefono' : e.target.name;
    if (n === 'custodia') $('custodiaNota').hidden = v('custodia') !== 'si';
    // Con «No» se esconden los datos del otro tutor (y sus avisos).
    if (n === 'otroTutor') {
      verOtroTutor();
      ['t2Nombre', 't2Parentesco', 't2Telefono'].forEach(function (k) { if (REGLAS[k](v(k)) === true) R.mostrarError(form, k, ''); });
    }
    // La CURP se revisa contra la fecha: al corregir la fecha se quita su aviso.
    if (n === 'nacimiento' && v('curp') && REGLAS.curp(v('curp')) === true) R.mostrarError(form, 'curp', '');
    if (n === 'parentesco') seguirAlFirmante();
    if (n === 'alumno') alCambiarNombre();
    var r = REGLAS[n];
    if (r && r(v(n)) === true) R.mostrarError(form, n, '');
    guardarEnUnRato();
  });

  // Mientras se envía, el formulario no se puede tocar (ver inscripcion.js).
  var enviando = false;
  function bloquear(si) {
    enviando = si;
    form.setAttribute('aria-busy', si ? 'true' : 'false');
    if ('inert' in form) form.inert = si;
  }
  ['click', 'pointerdown', 'keydown', 'input', 'change'].forEach(function (tipo) {
    form.addEventListener(tipo, function (e) {
      if (!enviando) return;
      e.preventDefault();
      e.stopPropagation();
    }, true);
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!conectado || enviando) return;
    pintar();
    var primero = null;
    Object.keys(REGLAS).forEach(function (k) {
      var r = REGLAS[k](v(k));
      R.mostrarError(form, k, r === true ? '' : r);
      if (r !== true && !primero) primero = k;
    });
    if (primero) {
      if (primero === 'firma') $('firmaCampo').scrollIntoView({ behavior: 'smooth', block: 'center' });
      else if (primero === 'autorizados') contAut.scrollIntoView({ behavior: 'smooth', block: 'center' });
      else R.llevarA(form, primero);
      return;
    }
    var boton = $('enviar');
    var cuando = new Date();
    var ficha = CAMPOS.map(function (t, i) { return [t, v(NOMBRES[i])]; });
    // ¿Escribieron el nombre de otro de los hijos del link? Pasa a ser de ese.
    alCambiarNombre();
    // El código va solo si el nombre es el de ese hijo (o corrigieron una
    // letra de su apellido: el programa lo revisa con su fecha). Con un link
    // viejo (sin los hijos) va como antes.
    var deEste = actual && (mismaPersona(actual.nombre, v('alumno')) || primera(actual.nombre) === primera(v('alumno'))) ? actual : null;
    var codigoEnvio = familia.length ? (deEste ? deEste.codigo : '') : codigo;
    // Lo que se manda y la copia se arman aquí, antes de esperar nada.
    var copia = datosCarta(), hp = v('sitio');
    var deQuien = v('alumno').replace(/\s+/g, ' ').toLowerCase();
    if (envioDe && envioDe !== deQuien) envio = R.claveAlAzar();
    envioDe = deQuien;
    var r;
    var datos = {
      // Formato 2 (23-oct-2026): la carta pide todo lo de la ficha y el
      // programa lo toma como lo vigente (sustituye lo que tenía).
      formato: 2,
      alumno: {
        nombre: v('alumno').replace(/\s+/g, ' '), nacimiento: v('nacimiento'), curp: R.curpLimpia(v('curp'), v('nacimiento')), escuela: v('escuela'),
        domicilio: v('domicilio'), colonia: v('colonia'), cp: v('cp')
      },
      tutor: { nombre: v('firmante'), parentesco: v('parentesco'), telefono: R.telefono10(v('telefono')), correo: v('correo') },
      emergencias: ['e1', 'e2'].filter(function (n) { return v(n + 'Nombre'); }).map(function (n) {
        return { nombre: v(n + 'Nombre'), parentesco: v(n + 'Parentesco'), telefono: R.telefono10(v(n + 'Telefono')) };
      }),
      salud: { sangre: v('sangre'), alergias: v('alergias'), padecimientos: v('padecimientos'), medicamentos: v('medicamentos'), servicio: v('servicio'), afiliacion: v('afiliacion'), mas: v('mas') },
      consentimientoSalud: true,
      otroTutor: v('otroTutor'),
      tutor2: v('otroTutor') === 'si' ? { nombre: v('t2Nombre'), parentesco: v('t2Parentesco'), telefono: R.telefono10(v('t2Telefono')) } : null,
      custodia: v('custodia'),
      autorizados: autorizados().map(function (a) { return { nombre: a.nombre, parentesco: a.parentesco, telefono: R.telefono10(a.telefono) }; }),
      // Lo de «Así trabajamos» (uso interno, contacto técnico) se informa, como en la inscripción.
      permisos: (function () {
        var p = { imagenInterna: true, imagenExpediente: true, contactoFisico: true, promociones: v('promociones') === true, encuestas: v('encuestas') === true, testimonios: v('testimonios') === true };
        IMAGEN.forEach(function (x) { p[x[0]] = v(x[0]) === 'si'; });
        return p;
      })(),
      carta: {
        documento: C.documento, version: C.version, huella: null, seguro: v('seguro'),
        aseguradora: v('seguro') === 'propio' ? v('aseguradora').replace(/\s+/g, ' ') : '',
        firmante: v('firmante'), parentesco: v('parentesco'), firma: firma.datos(), firmadaEn: cuando.toISOString(),
        leida: true, firmaElectronica: true, dispositivo: String(navigator.userAgent || '').slice(0, 180)
      },
      envio: envio
    };
    // El código del link del expediente (si se entró con él). Un programa
    // anterior lo ignora.
    if (codigoEnvio) datos.codigo = codigoEnvio;
    bloquear(true);
    boton.disabled = true;
    boton.textContent = 'Enviando…';
    try {
      datos.carta.huella = await CF.huellaCarta();
      // El buzón descarta sin aviso lo que llega antes de 2.5 s de abierta la
      // página (la trampa para robots). Si la pestaña se recargó y el borrador
      // la devolvió llena, se espera ese rato en vez de perder la carta.
      var falta = 2600 - (Date.now() - cargada);
      if (falta > 0) await new Promise(function (listo) { setTimeout(listo, falta); });
      r = await window.Buzon.enviar('carta', { enviado: cuando.toISOString(), datos: datos }, { hp: hp, t: Date.now() - cargada });
      r.datos = datos;
    } catch (err) {
      r = { ok: false, error: 'No se pudo preparar el envío. Intente de nuevo.' };
    }
    bloquear(false);
    boton.disabled = false;
    boton.textContent = 'Firmar y enviar';
    if (!r.ok) {
      // Lo de la red lo escribe buzon.js (de usted); lo que conteste el buzón
      // no es para las familias (viene de tú y a veces ya pide WhatsApp).
      // El WhatsApp va con link, sin datos del alumno en el mensaje.
      $('nota').textContent = (r.red ? (r.error || 'Sin conexión. Revise su internet e intente de nuevo.') : 'No se pudo enviar. Intente de nuevo en un momento.') + ' Si el problema continúa, escríbanos por ';
      $('nota').appendChild(R.el('a', { href: R.enlaceWhatsApp('Hola, intenté enviar la Carta de seguridad en línea y no se pudo.'), target: '_blank', rel: 'noopener', texto: 'WhatsApp' }));
      $('nota').appendChild(document.createTextNode('.'));
      $('nota').classList.add('form__note--mal');
      return;
    }
    // Llegó: la que sigue (la de un hermano) lleva su propia clave.
    envio = R.claveAlAzar(); envioDe = '';
    // El código del link es del alumno de esta carta: la de un hermano va con
    // el suyo (si venía en el link) o sin código. Del link, esta ya quedó
    // (si el nombre sigue siendo el suyo: con otro, el programa decide).
    if (deEste) deEste.firmada = true;
    codigo = ''; actual = null;
    copias.push({ datos: copia, nombre: copia.alumno, extra: {
      seguro: r.datos.carta.seguro, aseguradora: r.datos.carta.aseguradora, ficha: ficha, firma: r.datos.carta.firma, firmante: r.datos.carta.firmante,
      parentesco: r.datos.carta.parentesco, huella: r.datos.carta.huella, folio: r.id || '',
      cuando: cuando.toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'long', timeStyle: 'short' })
    } });
    pintarListo();
    form.hidden = true;
    $('listo').hidden = false;
    // Si falta otro hijo del link, se guarda lo de la familia: si el celular
    // recarga la pestaña, sigue con él (sin los datos del que ya se mandó).
    if (familia.some(function (k) { return !k.firmada; })) guardarBorrador(true); else borrarBorrador();
    // El foco estaba en el botón que se acaba de ocultar: pasa al aviso.
    $('listo').setAttribute('tabindex', '-1');
    $('listo').focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  // Las cartas firmadas en esta visita (hermanos: una por alumno). Cada una
  // con su PDF; imprimir saca todas, cada una en su hoja.
  var copias = [];
  function pintarListo() {
    var varios = copias.length > 1;
    var cont = $('copia');
    cont.innerHTML = '';
    copias.forEach(function (c) {
      var una = R.el('div', { clase: 'copia__una' });
      cont.appendChild(una);
      CF.armarCopia(una, c.datos, c.extra);
    });
    var desc = $('descargas');
    desc.innerHTML = '';
    copias.forEach(function (c) {
      var b = R.el('button', { type: 'button', clase: 'btn btn--primary', texto: varios ? 'Descargar la carta de ' + c.nombre + ' (PDF)' : 'Descargar mi carta en PDF' });
      b.addEventListener('click', function () {
        // Con mala señal jsPDF tarda en bajar: el botón dice que está en eso.
        var txt = b.textContent;
        if (b.disabled) return;
        b.disabled = true;
        b.textContent = 'Preparando su PDF…';
        window.CartaPDF.descargar(c.datos, c.extra).then(function () { b.disabled = false; b.textContent = txt; });
      });
      desc.appendChild(R.el('p', {}, [b]));
    });
    var nombres = copias.map(function (c) { return c.nombre; });
    $('listoTitulo').textContent = varios ? 'Cartas firmadas' : 'Carta firmada';
    $('listoTexto').textContent = varios
      ? 'Recibimos las cartas de ' + nombres.slice(0, -1).join(', ') + ' y ' + nombres[nombres.length - 1] + '. Quedan en su expediente.'
      : 'Recibimos la carta de ' + copias[0].datos.alumno + '. Queda en su expediente.';
    $('guardarCopia').textContent = varios ? 'Imprimir las ' + copias.length + ' cartas' : 'Imprimirla';
    // Si el link traía a otro hijo que falta, el botón ya dice de quién.
    var sigue = familia.filter(function (k) { return !k.firmada; })[0];
    var otraB = $('otraCarta');
    otraB.textContent = sigue ? 'Firmar ahora la de ' + corto(sigue) : 'Firmar la carta de otro hijo o hija';
    otraB.className = sigue ? 'btn btn--primary' : 'btn btn--outline-dark';
    otraB.parentNode.hidden = !sigue && copias.length >= 4;
  }
  $('guardarCopia').addEventListener('click', function () { window.print(); });
  // La del hermano: quien firma, su WhatsApp y las emergencias se quedan; lo
  // del alumno, su salud, el seguro y la firma se llenan de nuevo.
  // Con el link de la familia, sigue el hijo que falta, con su nombre.
  $('otraCarta').addEventListener('click', function () {
    $('listo').hidden = true;
    form.hidden = false;
    firma.medir();
    limpiarAlumno();
    var sigue = familia.filter(function (k) { return !k.firmada; })[0];
    if (sigue) ponerAlumno(sigue); else pintarFamilia();
    pintar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    form.elements[sigue ? 'nacimiento' : 'alumno'].focus({ preventScroll: true });
    guardarBorrador();
  });

  // ─── Borrador en esta pestaña (sin firma) ───────────────────────────
  // Como en la inscripción: si se recarga o el celular cierra la pestaña
  // (por ir a WhatsApp a preguntar algo), lo llenado vuelve. Se borra al
  // cerrar la pestaña, al enviar la carta (si del link falta otro hijo, se
  // quedan solo los datos de la familia) o al día sin tocarlo.
  var CLAVE = 'reivaj_carta_borrador';
  var DIA = 24 * 60 * 60 * 1000;
  var espera = null;
  function guardarEnUnRato() { clearTimeout(espera); espera = setTimeout(guardarBorrador, 400); }
  // Si la pestaña se va (recargar, cerrar) con algo recién escrito, se guarda ya.
  window.addEventListener('pagehide', function () { if (espera) guardarBorrador(); });
  var DEL_ALUMNO = ['alumno', 'nacimiento', 'curp', 'escuela', 'mas', 'sangre', 'alergias', 'padecimientos', 'medicamentos', 'servicio', 'afiliacion', 'aseguradora', 'seguro', 'custodia', 'consentimientoSalud', 'leida', 'firmaElectronica', 'imagenRostro', 'imagenDifusion', 'imagenFamilia', 'resultados'];
  function guardarBorrador(soloFamilia) {
    clearTimeout(espera); espera = null;
    try {
      var auto = contAut.querySelector('[data-auto="firmante"]');
      var filas = [].map.call(contAut.children, function (f) {
        var o = {};
        f.querySelectorAll('[data-a]').forEach(function (i) { o[i.getAttribute('data-a')] = i.value; });
        return o;
      });
      var o = { t: Date.now(), campos: {}, envio: envio, envioDe: soloFamilia === true ? '' : envioDe, codigo: soloFamilia === true ? '' : codigo, familia: familia, filas: filas, autoFirmante: Boolean(auto && contAut.firstChild === auto && valoresFila(auto) === auto.dataset.puesto) };
      [].forEach.call(form.elements, function (x) {
        if (!x.name || x.name === 'sitio' || x.name === 'deQuien') return;
        if (soloFamilia === true && DEL_ALUMNO.indexOf(x.name) >= 0) return;
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
    if (!o) return;
    // Se abrió otro link en esta pestaña: lo que había era de otra carta.
    var suyo = CODIGO.test(String(o.codigo || '')) ? o.codigo : '';
    if (delLink && suyo !== codigo && !familia.some(function (k) { return k.codigo === suyo; })) { borrarBorrador(); return; }
    if (!familia.length) familia = deLaFamilia(o.familia);
    else deLaFamilia(o.familia).forEach(function (x) { familia.forEach(function (k) { if (k.codigo === x.codigo && x.firmada) k.firmada = true; }); });
    if (/^[0-9a-f]{32}$/.test(String(o.envio || ''))) { envio = o.envio; envioDe = String(o.envioDe || ''); }
    if (suyo) codigo = suyo;
    actual = familia.filter(function (k) { return k.codigo === codigo; })[0] || null;
    $('ayudaAlumno').hidden = !actual;
    pintarFamilia();
    Object.keys(o.campos || {}).forEach(function (k) {
      var c = form.elements[k];
      if (!c) return;
      if (c.length !== undefined && !c.tagName) { [].forEach.call(c, function (r) { r.checked = r.value === o.campos[k]; }); }
      else if (c.type === 'checkbox') c.checked = Boolean(o.campos[k]);
      else c.value = o.campos[k];
    });
    var filas = Array.isArray(o.filas) ? o.filas : Array.isArray(o.autorizados) ? o.autorizados : [];
    if (filas.length) {
      contAut.innerHTML = '';
      filas.slice(0, 5).forEach(function (a, i) { filaAutorizado(a, i === 0 && o.autoFirmante ? 'firmante' : null); });
    }
    // Después de mandar una carta del link: sigue el hijo que falta, ya lleno.
    var sigue = familia.filter(function (k) { return !k.firmada; })[0];
    if (!actual && sigue && !o.campos.alumno) ponerAlumno(sigue);
    $('custodiaNota').hidden = v('custodia') !== 'si';
    verOtroTutor();
    pintar();
    seguro.actualizar();
  }
  // Abierta con el link: se guarda de una vez, para que una recarga no pierda
  // el código ni a los hermanos (el «#» ya no está en la barra).
  if (conectado) { recuperar(); if (delLink) guardarBorrador(); }

  // El botón viene apagado en el HTML: así, si alguien da Enter antes de que
  // cargue este script, el navegador no manda el formulario por su cuenta.
  if (conectado) $('enviar').disabled = false;
})();
