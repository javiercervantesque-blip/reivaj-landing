/* =========================================================
   REIVAJ · Inscripción en línea (seis pasos)
   Lo que se escribe aquí se cierra en este navegador y viaja
   cifrado al programa del gimnasio. El borrador vive solo en esta
   pestaña (se borra al cerrarla o al día sin tocarlo) y nunca guarda
   la firma.

   Hermanos: en el paso 1 se agregan todos los hijos. Domicilio,
   tutores, emergencias y quién los recoge se piden una sola vez; la
   ficha médica, los permisos de imagen y la carta van por alumno. Al
   gimnasio llega una inscripción por alumno, con su propia carta
   firmada, como si cada uno se hubiera mandado solo.
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
  // En el paso 6, cuál carta se está viendo (una por alumno).
  var cartaVista = 0;
  var MAX_HIJOS = 4;
  var $ = function (id) { return document.getElementById(id); };
  // Alergias, padecimientos, medicamentos y servicio médico no son obligatorios: vacío = ninguno.
  var NINGUNO = { alergias: 'Ninguna', padecimientos: 'Ninguno', medicamentos: 'Ninguno', servicio: 'Ninguno' };
  var base = function (n) { return String(n).replace(/_\d+$/, ''); };
  var v = function (n) { var x = R.valor(form, n); return x === '' && NINGUNO[base(n)] ? NINGUNO[base(n)] : x; };

  // ─── Catálogos ──────────────────────────────────────────────────────
  var PARENTESCOS = ['Madre', 'Padre', 'Abuela', 'Abuelo', 'Tía', 'Tío', 'Hermana', 'Hermano', 'Tutor legal', 'Otro'];
  function llenarParentescos(raiz) {
    raiz.querySelectorAll('[data-parentescos]').forEach(function (s) {
      if (s.options.length) return;
      s.appendChild(R.el('option', { value: '', texto: 'Elija' }));
      PARENTESCOS.forEach(function (p) { s.appendChild(R.el('option', { value: p, texto: p })); });
    });
  }
  llenarParentescos(form);
  R.FUENTES.forEach(function (f) { form.elements.fuente.appendChild(R.el('option', { value: f[0], texto: f[1] })); });

  // La grabación técnica en clase, la foto de credencial y el contacto físico
  // técnico son parte del servicio: se informan en el paso 5, no se preguntan.
  var IMAGEN = [
    ['imagenRostro', 'Fotos y videos con rostro en redes y publicidad.', 'Que el alumno aparezca con el rostro reconocible en las redes sociales, la página y la publicidad de REIVAJ. Nunca se publica su nombre completo ni datos personales junto a su imagen, ni se cede a terceros o a otras marcas.'],
    ['imagenDifusion', 'Imagen sin rostro en redes y publicidad.', 'Manos, pies, silueta a contraluz o plano de detalle sin rostro reconocible, en materiales de REIVAJ.'],
    ['imagenFamilia', 'Envío a la familia.', 'Que las fotos y videos de clase se le envíen por el WhatsApp oficial del gimnasio.'],
    ['resultados', 'Resultados deportivos.', 'Publicación del nombre del alumno y su resultado en competencia.']
  ];

  // ─── ¿Está conectada la página con el gimnasio? ─────────────────────
  var cfg = window.CONFIG || {};
  var conectado = Boolean(cfg.buzon && cfg.llavePublica && window.Buzon && window.Buzon.disponible());

  // ─── Los alumnos ────────────────────────────────────────────────────
  // Cada hijo tiene una clave (1, 2, 3…) que no cambia aunque se quite
  // otro; sus campos llevan esa clave al final: nombres_1, sangre_2…
  // Por cada uno hay un bloque en el paso 1 (datos), el 4 (ficha médica),
  // el 5 (permisos) y el 6 (su carta).
  var hijos = [];   // { k, alumno, salud, permisos, carta, firma, seguro }
  var siguienteClave = 1;
  var contAlumnos = $('alumnos'), contFichas = $('fichas'), contPermisos = $('permisosImagen'), contCartas = $('cartas');

  // Copia una plantilla y le pone la clave a nombres, ids y etiquetas.
  function deLaPlantilla(id, k) {
    var nodo = $(id).content.firstElementChild.cloneNode(true);
    var s = '_' + k;
    nodo.querySelectorAll('[name]').forEach(function (x) { x.name = x.name + s; });
    nodo.querySelectorAll('[id]').forEach(function (x) { x.id = x.id + s; });
    nodo.querySelectorAll('label[for]').forEach(function (x) { x.htmlFor = x.htmlFor + s; });
    nodo.querySelectorAll('[data-error-for]').forEach(function (x) { x.setAttribute('data-error-for', x.getAttribute('data-error-for') + s); });
    return nodo;
  }
  function bloquePermisos(k) {
    var caja = R.el('div', { clase: 'grupo' }, [R.el('p', { clase: 'grupo__titulo', hidden: true }, [R.el('span')])]);
    IMAGEN.forEach(function (p) {
      var n = p[0] + '_' + k;
      caja.appendChild(R.el('div', { clase: 'permiso field' }, [
        R.el('p', {}, [R.el('b', { texto: p[1] + ' ' }), p[2]]),
        R.el('div', { clase: 'chips', role: 'radiogroup', 'aria-label': p[1] }, [
          R.el('label', { clase: 'chip' }, [R.el('input', { type: 'radio', name: n, value: 'si', required: true }), R.el('span', { texto: 'Autorizo' })]),
          R.el('label', { clase: 'chip' }, [R.el('input', { type: 'radio', name: n, value: 'no' }), R.el('span', { texto: 'No autorizo' })])
        ]),
        R.el('p', { clase: 'error', 'data-error-for': n })
      ]));
    });
    return caja;
  }
  function agregarHijo(k) {
    k = k || siguienteClave;
    siguienteClave = Math.max(siguienteClave, Number(k) + 1);
    var h = { k: String(k) };
    h.alumno = deLaPlantilla('tplAlumno', k);
    h.salud = deLaPlantilla('tplSalud', k);
    h.permisos = bloquePermisos(k);
    h.carta = deLaPlantilla('tplCarta', k);
    llenarParentescos(h.carta);
    h.carta.querySelector('[data-enlinea]').textContent = window.CARTA_SEGURIDAD.enLinea;
    h.alumno.querySelector('[data-quitar]').addEventListener('click', function () { quitarHijo(h); });
    // Los permisos del hermano: los mismos que ya escogió para el primero, de un clic.
    if (hijos.length) {
      var copiar = R.el('button', { type: 'button', clase: 'btn-copiar' });
      copiar.addEventListener('click', function () {
        IMAGEN.forEach(function (p) {
          var de = v(p[0] + '_' + hijos[0].k);
          h.permisos.querySelectorAll('input[name="' + p[0] + '_' + h.k + '"]').forEach(function (r) { r.checked = r.value === de; });
          if (de) R.mostrarError(form, p[0] + '_' + h.k, '');
        });
        guardarBorrador();
      });
      h.permisos.querySelector('.grupo__titulo').appendChild(copiar);
    }
    contAlumnos.appendChild(h.alumno);
    contFichas.appendChild(h.salud);
    contPermisos.appendChild(h.permisos);
    contCartas.appendChild(h.carta);
    hijos.push(h);
    titulos();
    return h;
  }
  function quitarHijo(h) {
    if (hijos.length < 2) return;
    [h.alumno, h.salud, h.permisos, h.carta].forEach(function (n) { n.remove(); });
    hijos.splice(hijos.indexOf(h), 1);
    titulos();
    guardarBorrador();
    $('masAlumno').focus();
  }
  function nombreDe(h) { return v('nombres_' + h.k).split(/\s+/)[0] || ''; }
  // Títulos, «Quitar» y los textos que dicen «el alumno» o «los alumnos».
  function titulos() {
    var varios = hijos.length > 1;
    hijos.forEach(function (h, i) {
      var nom = nombreDe(h), n = 'Alumno ' + (i + 1);
      var t = h.alumno.querySelector('[data-titulo]');
      t.textContent = varios ? n + (nom ? ' · ' + nom : '') : '';
      t.parentNode.hidden = !varios;
      var q = h.alumno.querySelector('[data-quitar]');
      q.hidden = !varios;
      q.setAttribute('aria-label', 'Quitar al alumno ' + (i + 1));
      var ts = h.salud.querySelector('[data-titulo]');
      ts.textContent = 'Ficha médica de ' + (nom || 'alumno ' + (i + 1));
      ts.hidden = !varios;
      var tp = h.permisos.querySelector('.grupo__titulo');
      tp.querySelector('span').textContent = 'Permisos de ' + (nom || 'alumno ' + (i + 1));
      tp.hidden = !varios;
      var c = tp.querySelector('.btn-copiar');
      if (c) c.textContent = 'Los mismos que ' + (nombreDe(hijos[0]) || 'el alumno 1');
    });
    $('masAlumno').hidden = hijos.length >= MAX_HIJOS;
    document.querySelectorAll('[data-uno]').forEach(function (x) { x.textContent = x.getAttribute(varios ? 'data-varios' : 'data-uno'); });
  }
  $('masAlumno').addEventListener('click', function () {
    var h = agregarHijo();
    // Los hermanos casi siempre comparten apellidos: se proponen, se pueden cambiar.
    ['apellidoPaterno', 'apellidoMaterno'].forEach(function (a) { form.elements[a + '_' + h.k].value = v(a + '_' + hijos[0].k); });
    form.elements['nombres_' + h.k].focus();
    h.alumno.scrollIntoView({ behavior: 'smooth', block: 'start' });
    guardarBorrador();
  });

  // ─── Detalles que aparecen según lo que se contesta ─────────────────
  function hijoDe(nombre) {
    var m = /_(\d+)$/.exec(nombre || '');
    return m ? hijos.filter(function (h) { return h.k === m[1]; })[0] || null : null;
  }
  function mostrarDetalles(h) {
    h.alumno.querySelector('[data-experiencia]').hidden = v('experiencia_' + h.k) !== 'si';
    var e = edadDe(v('nacimiento_' + h.k));
    h.alumno.querySelector('[data-edad]').textContent = e !== null && e >= 0 && e < 100 ? 'Tiene ' + e + ' años.' : '';
  }
  form.addEventListener('change', function (e) {
    var n = e.target.name, h = hijoDe(n);
    if (h) mostrarDetalles(h);
    if (n === 'custodia') $('custodiaNota').hidden = v('custodia') !== 'si';
    guardarBorrador();
  });
  form.addEventListener('input', function (e) {
    // El nombre del tutor 2 o de la emergencia 2 también quita el aviso de su teléfono.
    var n = { t2Nombre: 't2Telefono', e2Nombre: 'e2Telefono' }[e.target.name] || e.target.name;
    var regla = reglaDe(n);
    if (regla && regla(v(n)) === true) R.mostrarError(form, n, '');
    if (/^nombres_/.test(n)) titulos();
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
    if (FAMILIA[3].autorizados() === true) R.mostrarError(form, 'autorizados', '');
    guardarBorrador();
  });

  // ─── Reglas por paso ────────────────────────────────────────────────
  var eligio = function (x) { return Boolean(x) || 'Elija una opción.'; };
  // Texto con letras de verdad (no «..» ni «123»).
  var texto = function (min, msg) { return function (x) { return (String(x).length >= min && R.conLetras(x, Math.min(min, 3))) || msg; }; };
  var TEL_MAL = 'Revise el número: 10 dígitos, con lada (ej. 33 1234 5678).';
  var tel = function (msg) { return function (x) { return R.telefonoValido(x) ? true : (R.telefono10(x) ? TEL_MAL : msg); }; };
  var telOpcional = function (x) { return !x || Boolean(R.telefonoValido(x)) || TEL_MAL; };
  // Tutor 2 y emergencia 2: sin nombre, el contacto no llega al programa.
  var telConNombre = function (p) { return function (x) { return x && !v(p + 'Nombre') ? 'Escriba también el nombre de esta persona.' : telOpcional(x); }; };
  // Dos palabras de dos letras o más, como en la carta suelta: que la carta
  // no quede firmada por «Laura», sin apellido.
  var nombreYApellido = function (msg) { return function (x) { return String(x).trim().split(/\s+/).filter(function (w) { return R.conLetras(w, 2); }).length >= 2 || msg; }; };
  // Lo que se pide una sola vez por familia.
  var FAMILIA = {
    1: {
      domicilio: texto(5, 'Escriba calle y número.'),
      colonia: texto(3, 'Escriba la colonia.')
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
      consentimientoSalud: function (x) { return x === true || 'Sin este consentimiento no podemos inscribirlo: la ley lo pide para los datos de salud.'; }
    },
    5: {},
    6: {}
  };
  // Lo de cada alumno (el nombre del campo sin su clave). `k`: de quién es.
  var POR_ALUMNO = {
    1: {
      nombres: function (x, k) {
        var r = texto(2, 'Escriba el nombre del alumno.')(x);
        if (r !== true) return r;
        // El mismo niño escrito dos veces (dos cartas para el mismo alumno).
        var completo = function (j) { return [v('nombres_' + j), v('apellidoPaterno_' + j)].join(' ').toLowerCase().replace(/\s+/g, ' '); };
        var antes = hijos.slice(0, hijos.map(function (h) { return h.k; }).indexOf(k));
        return !antes.some(function (h) { return completo(h.k) === completo(k); }) || 'Este alumno ya está arriba.';
      },
      apellidoPaterno: texto(2, 'Escriba el apellido paterno del alumno.'),
      nacimiento: function (x) { var e = edadDe(x); return (e !== null && e >= 4 && e <= 18) || (e !== null && e >= 0 && e < 4 ? 'Recibimos a niñas y niños a partir de los 4 años.' : 'Revise la fecha de nacimiento.'); },
      rama: eligio,
      curp: function (x) { return !x || /^[A-Z]{4}\d{6}[HMX][A-Z]{5}[A-Z0-9]\d$/.test(String(x).toUpperCase()) || 'La CURP tiene 18 letras y números. Revísela o déjela vacía.'; },
      horas: eligio,
      experiencia: eligio
    },
    4: {
      sangre: function (x) { return Boolean(x) || 'Elija una opción (puede ser «No lo sé»).'; }
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
      firma: function (x, k) {
        var f = (hijoDe('_' + k) || {}).firma;
        return (f && f.valida()) || (f && f.datos().trazos ? 'Su firma quedó muy corta: fírmela completa, como en papel.' : 'Firme en el recuadro con el dedo.');
      },
      leida: function (x) { return x === true || 'Confirme que leyó la carta.'; },
      firmaElectronica: function (x) { return x === true || 'Confirme su firma electrónica.'; }
    }
  };
  function reglaDe(n) {
    for (var p in FAMILIA) if (FAMILIA[p][n]) return FAMILIA[p][n];
    var m = /^(.+)_(\d+)$/.exec(n || '');
    if (!m) return null;
    for (var q in POR_ALUMNO) if (POR_ALUMNO[q][m[1]]) return (function (r, k) { return function (x) { return r(x, k); }; })(POR_ALUMNO[q][m[1]], m[2]);
    return null;
  }
  // Los campos que se revisan en un paso, en el orden de la página. En el
  // paso 6, solo los de la carta que se está viendo.
  function camposDelPaso(n) {
    var lista = [];
    var deAlumno = function (h) { Object.keys(POR_ALUMNO[n] || {}).forEach(function (c) { lista.push(c + '_' + h.k); }); };
    if (n === 6) deAlumno(hijos[cartaVista]);
    else hijos.forEach(deAlumno);
    return n === 1 ? lista.concat(Object.keys(FAMILIA[1])) : Object.keys(FAMILIA[n]).concat(lista);
  }
  function revisarPaso(n) {
    var primero = null;
    if (n === 3) limpiarAutorizados();
    camposDelPaso(n).forEach(function (k) {
      var r = reglaDe(k)(v(k));
      R.mostrarError(form, k, r === true ? '' : r);
      if (r !== true && !primero) primero = k;
    });
    if (primero) {
      if (/^firma_/.test(primero)) hijoDe(primero).carta.querySelector('.firma').scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    if (n !== TOTAL) cartaVista = 0;
    cartaVista = Math.min(cartaVista, hijos.length - 1);
    pasos.forEach(function (p) { p.hidden = Number(p.dataset.paso) !== n; });
    [].forEach.call($('barra').children, function (li, i) {
      li.className = i + 1 < n ? 'hecho' : i + 1 === n ? 'actual' : '';
    });
    var ultimaCarta = n === TOTAL && cartaVista === hijos.length - 1;
    // Ya salió alguna inscripción (ver enviar): no se regresa a cambiar lo que ya llegó.
    $('atras').hidden = (n === 1) || enviados.some(Boolean);
    $('siguiente').hidden = ultimaCarta;
    var otra = n === TOTAL && hijos[cartaVista + 1];
    $('siguiente').textContent = otra ? 'Siguiente: carta de ' + (nombreDe(otra) || 'alumno ' + (cartaVista + 2)) : 'Siguiente';
    $('enviar').hidden = !ultimaCarta;
    $('enviar').textContent = textoEnviar();
    titulos();
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
    if (n === TOTAL) prepararCarta(hijos[cartaVista]);
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
  function textoEnviar() {
    var faltan = hijos.filter(function (h, i) { return !enviados[i]; }).length;
    if (faltan < hijos.length) return faltan > 1 ? 'Enviar las ' + faltan + ' que faltan' : 'Enviar la que falta';
    return hijos.length > 1 ? 'Enviar las ' + hijos.length + ' inscripciones' : 'Enviar inscripción';
  }
  function avanzar() {
    if (!revisarPaso(actual)) return;
    if (actual === TOTAL) { cartaVista++; mostrar(TOTAL); return; }
    mostrar(actual + 1);
  }
  function regresar() {
    if (actual === TOTAL && cartaVista > 0) { cartaVista--; mostrar(TOTAL); return; }
    mostrar(actual - 1);
  }
  $('siguiente').addEventListener('click', avanzar);
  $('atras').addEventListener('click', regresar);

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
    if (trampa || form.hidden || actual <= 1 || enviados.some(Boolean)) return;
    regresar();
  });

  // ─── La carta (una por alumno) ──────────────────────────────────────
  function nombreCompleto(k) {
    return [v('nombres_' + k), v('apellidoPaterno_' + k), v('apellidoMaterno_' + k)].filter(Boolean).join(' ').replace(/\s+/g, ' ');
  }
  function contacto(n) {
    var t = R.telefono10(v(n + 'Telefono'));
    return v(n + 'Nombre') ? v(n + 'Nombre') + (v(n + 'Parentesco') ? ' (' + v(n + 'Parentesco') + ')' : '') + (t ? ' · ' + t : '') : '';
  }
  function hoyLargo() { var f = R.ahoraGdl().fecha; return R.fechaLarga(f) + ' de ' + f.slice(0, 4); }
  function datosCarta(k) {
    var e = edadDe(v('nacimiento_' + k));
    return {
      alumno: nombreCompleto(k), edad: e !== null ? e + ' años' : '', fecha: hoyLargo(),
      tutor: v('firmante_' + k) || v('t1Nombre'), emergencia1: contacto('e1'), emergencia2: contacto('e2'), sangre: v('sangre_' + k)
    };
  }
  function fichaCarta(k) {
    var C = window.CARTA_SEGURIDAD.secciones.filter(function (s) { return s.campos; })[0].campos;
    return [[C[0], v('alergias_' + k)], [C[1], v('padecimientos_' + k)], [C[2], v('medicamentos_' + k)], [C[3], v('servicio_' + k)], [C[4], v('afiliacion_' + k)]];
  }
  function prepararCarta(h) {
    var k = h.k;
    hijos.forEach(function (o) { o.carta.hidden = o !== h; });
    $('cartaDe').textContent = hijos.length > 1 ? ' · Carta ' + (cartaVista + 1) + ' de ' + hijos.length + ': ' + (nombreDe(h) || 'alumno ' + (cartaVista + 1)) : '';
    if (!h.seguro) h.seguro = CF.opcionesSeguro('seguro_' + k);
    var ficha = R.el('div', {}, [
      R.el('div', { clase: 'carta__datos' }, fichaCarta(k).map(function (x) { return R.el('div', {}, [R.el('span', { texto: x[0] }), R.el('b', { texto: x[1] || '—' })]); })),
      R.el('p', { clase: 'field__ayuda' }, ['Si algo no está bien, ', R.el('a', { href: '#', texto: 'corríjalo en la ficha médica', onclick: function (e) { e.preventDefault(); mostrar(4); } }), '.'])
    ]);
    // Quien firma sigue al tutor 1 mientras nadie lo toque: si corrigió el
    // nombre en el paso 2, la carta y este campo salen ya corregidos. Si aquí
    // escribió otro nombre, se respeta (y se propone en la carta del
    // siguiente hermano). Antes de pintar: la carta lo usa.
    var previo = hijos[cartaVista - 1];
    var propuesto = previo ? v('firmante_' + previo.k) : v('t1Nombre');
    var propuestoP = previo ? v('firmanteParentesco_' + previo.k) : v('t1Parentesco');
    var fi = form.elements['firmante_' + k], fp = form.elements['firmanteParentesco_' + k];
    if (!fi.value.trim() || fi.value === fi.dataset.puesto) { fi.value = propuesto; fi.dataset.puesto = fi.value; }
    if (!fp.value || fp.value === fp.dataset.puesto) { fp.value = propuestoP; fp.dataset.puesto = fp.value; }
    CF.pintarCarta(h.carta.querySelector('[data-carta]'), datosCarta(k), { seguro: h.seguro, seccion4: ficha });
    if (!h.firma) {
      h.firma = CF.Firma(h.carta.querySelector('[data-firma]'));
      h.firma.alCambiar = function () { if (h.firma.valida()) R.mostrarError(form, 'firma_' + k, ''); };
    } else h.firma.medir();
  }

  // ─── Enviar ─────────────────────────────────────────────────────────
  function armarDatos(h, huella, cuando) {
    var k = h.k;
    var sn = function (n) { return v(n + '_' + k) === 'si'; };
    var permisos = { imagenInterna: true, imagenExpediente: true, contactoFisico: true, promociones: v('promociones') === true, encuestas: v('encuestas') === true, testimonios: v('testimonios') === true };
    IMAGEN.forEach(function (p) { permisos[p[0]] = sn(p[0]); });
    return {
      alumno: {
        nombre: nombreCompleto(k), nombres: v('nombres_' + k), apellidoPaterno: v('apellidoPaterno_' + k), apellidoMaterno: v('apellidoMaterno_' + k),
        nacimiento: v('nacimiento_' + k), rama: v('rama_' + k), curp: v('curp_' + k).toUpperCase(), escuela: v('escuela_' + k),
        domicilio: v('domicilio'), colonia: v('colonia'), cp: v('cp'),
        experiencia: v('experiencia_' + k) === 'si' ? (v('experienciaDetalle_' + k) || 'sí') : 'no'
      },
      tutor1: { nombre: v('t1Nombre'), parentesco: v('t1Parentesco'), telefono: R.telefono10(v('t1Telefono')), correo: v('t1Correo') },
      tutor2: v('t2Nombre') ? { nombre: v('t2Nombre'), parentesco: v('t2Parentesco'), telefono: R.telefono10(v('t2Telefono')) } : null,
      custodia: v('custodia'),
      emergencias: ['e1', 'e2'].filter(function (n) { return v(n + 'Nombre'); }).map(function (n) {
        return { nombre: v(n + 'Nombre'), parentesco: v(n + 'Parentesco'), telefono: R.telefono10(v(n + 'Telefono')) };
      }),
      autorizados: autorizados().map(function (a) { return { nombre: a.nombre, parentesco: a.parentesco, telefono: R.telefono10(a.telefono) }; }),
      salud: { sangre: v('sangre_' + k), servicio: v('servicio_' + k), afiliacion: v('afiliacion_' + k), alergias: v('alergias_' + k), padecimientos: v('padecimientos_' + k), medicamentos: v('medicamentos_' + k), mas: v('mas_' + k) },
      consentimientoSalud: v('consentimientoSalud') === true,
      permisos: permisos,
      fuente: v('fuente'),
      plan: { horas: Number(v('horas_' + k)) || null },
      // Hermanos inscritos en el mismo envío (el programa todavía no lo usa;
      // queda para ligarlos como familia).
      familia: hijos.length > 1 ? { total: hijos.length, hermanos: hijos.filter(function (o) { return o !== h; }).map(function (o) { return nombreCompleto(o.k); }) } : null,
      carta: {
        documento: window.CARTA_SEGURIDAD.documento, version: window.CARTA_SEGURIDAD.version, huella: huella,
        seguro: v('seguro_' + k), firmante: v('firmante_' + k), parentesco: v('firmanteParentesco_' + k),
        firma: h.firma.datos(), firmadaEn: cuando.toISOString(), leida: true, firmaElectronica: true,
        dispositivo: String(navigator.userAgent || '').slice(0, 180)
      }
    };
  }

  // Lo que ya llegó, por posición del alumno: si la red falla a la mitad,
  // «Enviar» de nuevo solo manda los que faltan. Volver a mandar uno que sí
  // llegó no duplica nada: el programa reconoce la misma firma.
  var enviados = [];
  var copias = [];
  function nombresDe(lista) {
    var n = lista.map(function (h) { return nombreDe(h) || nombreCompleto(h.k); });
    return n.length < 2 ? n.join('') : n.slice(0, -1).join(', ') + ' y ' + n[n.length - 1];
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!conectado) return;
    // Enter o «Ir» del teclado antes de la última carta: funciona como «Siguiente».
    if (actual !== TOTAL || cartaVista < hijos.length - 1) { avanzar(); return; }
    if (!revisarPaso(TOTAL)) return;
    // Todas las cartas firmadas (por si se quitó o agregó un alumno después).
    for (var j = 0; j < hijos.length; j++) {
      cartaVista = j;
      if (!enviados[j] && !(hijos[j].firma && hijos[j].firma.valida())) { mostrar(TOTAL); revisarPaso(TOTAL); return; }
    }
    var boton = $('enviar');
    boton.disabled = true;
    boton.textContent = 'Enviando…';
    $('nota').textContent = '';
    $('nota').classList.remove('form__note--mal');
    var falla = null;
    try {
      var huella = await CF.huellaCarta();
      // El buzón descarta sin aviso lo que llega antes de 2.5 s de abierta la
      // página (la trampa para robots): tras una recarga, se espera ese rato.
      var falta = 2600 - (Date.now() - cargada);
      if (falta > 0) await new Promise(function (listo) { setTimeout(listo, falta); });
      for (var i = 0; i < hijos.length && !falla; i++) {
        if (enviados[i]) continue;
        var h = hijos[i], cuando = new Date(), datos = armarDatos(h, huella, cuando);
        var r = await window.Buzon.enviar('inscripcion', { enviado: cuando.toISOString(), datos: datos }, { hp: v('sitio'), t: Date.now() - cargada });
        if (!r.ok) { falla = r; break; }
        enviados[i] = true;
        copias[i] = { datos: datosCarta(h.k), nombre: nombreDe(h) || nombreCompleto(h.k), extra: {
          seguro: datos.carta.seguro, ficha: fichaCarta(h.k), firma: datos.carta.firma, firmante: datos.carta.firmante,
          parentesco: datos.carta.parentesco, huella: datos.carta.huella, folio: r.id || '',
          cuando: cuando.toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'long', timeStyle: 'short' })
        } };
      }
    } catch (err) {
      falla = { ok: false, error: 'No se pudo preparar el envío. Intente de nuevo.' };
    }
    boton.disabled = false;
    if (falla) {
      boton.textContent = textoEnviar();
      $('atras').hidden = enviados.some(Boolean);
      // Lo de la red lo escribe buzon.js (de usted); lo que conteste el buzón
      // no es para las familias (viene de tú y a veces ya pide WhatsApp).
      // El WhatsApp va con link, sin datos del alumno en el mensaje.
      var listos = hijos.filter(function (h, i) { return enviados[i]; });
      var pendientes = hijos.filter(function (h, i) { return !enviados[i]; });
      $('nota').textContent = (listos.length ? 'Ya recibimos la inscripción de ' + nombresDe(listos) + '. Falta la de ' + nombresDe(pendientes) + ': presione «' + textoEnviar() + '». ' : '') +
        (falla.red ? (falla.error || 'Sin conexión. Revise su internet e intente de nuevo.') : 'No se pudo enviar. Intente de nuevo en un momento.') + ' Si el problema continúa, escríbanos por ';
      $('nota').appendChild(R.el('a', { href: R.enlaceWhatsApp('Hola, intenté enviar la inscripción en línea y no se pudo.'), target: '_blank', rel: 'noopener', texto: 'WhatsApp' }));
      $('nota').appendChild(document.createTextNode('.'));
      $('nota').classList.add('form__note--mal');
      return;
    }
    terminar();
  });

  // La pantalla final: un PDF por alumno y una sola impresión con todas las cartas.
  function terminar() {
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
    $('guardarCopia').textContent = varios ? 'Imprimir las ' + copias.length + ' cartas' : 'Imprimirla';
    $('listoTitulo').textContent = varios ? 'Inscripciones recibidas' : 'Inscripción recibida';
    $('listoTexto').textContent = (varios ? 'Recibimos las inscripciones de ' : 'Recibimos la inscripción de ') + nombresDe(hijos) + '. En recepción confirmamos grupo, horario y forma de pago.';
    form.hidden = true;
    $('listo').hidden = false;
    // El foco estaba en el botón que se acaba de ocultar: pasa al aviso.
    $('listo').setAttribute('tabindex', '-1');
    $('listo').focus({ preventScroll: true });
    borrarBorrador();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
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
    // Con alguna inscripción ya enviada, el borrador la volvería a ofrecer.
    if (enviados.some(Boolean)) return;
    try {
      var o = { paso: actual, carta: cartaVista, t: Date.now(), hijos: hijos.map(function (h) { return h.k; }), campos: {}, autorizados: autorizados() };
      [].forEach.call(form.elements, function (x) {
        if (!x.name || x.name === 'sitio' || /^seguro_/.test(x.name)) return;
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
    // Uno de antes de los hermanos (sin «hijos») no cabe en estos campos.
    if (o && (!(Math.abs(Date.now() - (Number(o.t) || 0)) < DIA) || !Array.isArray(o.hijos))) { borrarBorrador(); o = null; }
    if (!o) { agregarHijo(); return 1; }
    o.hijos.slice(0, MAX_HIJOS).forEach(function (k) { if (/^\d+$/.test(String(k))) agregarHijo(k); });
    if (!hijos.length) agregarHijo();
    Object.keys(o.campos || {}).forEach(function (k) {
      var c = form.elements[k];
      if (!c) return;
      if (c.length !== undefined && !c.tagName) { [].forEach.call(c, function (r) { r.checked = r.value === o.campos[k]; }); }
      else if (c.type === 'checkbox') c.checked = Boolean(o.campos[k]);
      else c.value = o.campos[k];
    });
    // Sin marca de tutor: lo del borrador ya no se llena solo.
    (o.autorizados || []).forEach(function (a) { filaAutorizado(a); });
    hijos.forEach(mostrarDetalles);
    $('custodiaNota').hidden = v('custodia') !== 'si';
    cartaVista = Math.max(0, Math.min(Number(o.carta) || 0, hijos.length - 1));
    return Math.min(Math.max(1, o.paso || 1), TOTAL);
  }

  if (!conectado) {
    agregarHijo();
    $('sinConexion').hidden = false;
    form.querySelectorAll('input, select, textarea, button').forEach(function (x) { x.disabled = true; });
    mostrar(1, false);
    return;
  }
  mostrar(recuperar(), false);
  // El botón de enviar viene apagado en el HTML: así, si alguien da Enter
  // antes de que cargue este script, el navegador no manda el formulario
  // por su cuenta. Encendido, Enter pasa por el manejador de arriba.
  $('enviar').disabled = false;
})();
