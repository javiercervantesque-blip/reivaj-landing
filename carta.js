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

  var PARENTESCOS = ['Madre', 'Padre', 'Abuela', 'Abuelo', 'Tía', 'Tío', 'Hermana', 'Hermano', 'Tutor legal', 'Otro'];
  form.querySelectorAll('[data-parentescos]').forEach(function (s) {
    s.appendChild(R.el('option', { value: '', texto: 'Elija' }));
    PARENTESCOS.forEach(function (p) { s.appendChild(R.el('option', { value: p, texto: p })); });
  });

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
  var seguro = CF.opcionesSeguro('seguro');

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
    if (e.target.closest('#carta')) return;
    clearTimeout(temporizador);
    temporizador = setTimeout(pintar, 400);
  });
  $('textoEnLinea').textContent = C.enLinea;
  firma = CF.Firma($('firma'));
  firma.alCambiar = function () { if (firma.valida()) R.mostrarError(form, 'firma', ''); };

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
  var REGLAS = {
    alumno: nombreYApellido('Escriba nombre y apellido del alumno.'),
    nacimiento: function (x) { var e = edadDe(x); return (e !== null && e >= 3 && e <= 25) || 'Revise la fecha de nacimiento.'; },
    firmante: nombreYApellido('Escriba su nombre y apellido.'),
    parentesco: function (x) { return Boolean(x) || 'Elija el parentesco.'; },
    telefono: tel('Escriba un WhatsApp de 10 dígitos.'),
    e1Nombre: texto(3, 'Escriba el nombre.'),
    e1Parentesco: texto(3, 'Escriba el parentesco.'),
    e1Telefono: tel('Escriba un teléfono de 10 dígitos.'),
    // Sin nombre, la emergencia 2 no llega al programa: con teléfono, se pide.
    e2Telefono: function (x) { return !x || (!v('e2Nombre') ? 'Escriba también el nombre de esta persona.' : Boolean(R.telefonoValido(x)) || TEL_MAL); },
    sangre: function (x) { return Boolean(x) || 'Elija una opción (puede ser «No lo sé»).'; },
    seguro: function (x) { return Boolean(x) || 'Indique si contrata el seguro.'; },
    consentimientoSalud: function (x) { return x === true || 'Sin este consentimiento no podemos guardar sus datos de salud.'; },
    // Con trazo pero muy chico (dos rayitas): que no crea que ya firmó.
    firma: function () { return firma.valida() || (firma.datos().trazos ? 'Su firma quedó muy corta: fírmela completa, como en papel.' : 'Firme en el recuadro con el dedo.'); },
    leida: function (x) { return x === true || 'Confirme que leyó la carta.'; },
    firmaElectronica: function (x) { return x === true || 'Confirme su firma electrónica.'; }
  };
  form.addEventListener('change', function (e) {
    // El nombre de la emergencia 2 también quita el aviso de su teléfono.
    var n = e.target.name === 'e2Nombre' ? 'e2Telefono' : e.target.name;
    var r = REGLAS[n];
    if (r && r(v(n)) === true) R.mostrarError(form, n, '');
    guardarEnUnRato();
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!conectado) return;
    pintar();
    var primero = null;
    Object.keys(REGLAS).forEach(function (k) {
      var r = REGLAS[k](v(k));
      R.mostrarError(form, k, r === true ? '' : r);
      if (r !== true && !primero) primero = k;
    });
    if (primero) {
      if (primero === 'firma') $('firmaCampo').scrollIntoView({ behavior: 'smooth', block: 'center' });
      else R.llevarA(form, primero);
      return;
    }
    var boton = $('enviar');
    boton.disabled = true;
    boton.textContent = 'Enviando…';
    var cuando = new Date();
    var ficha = CAMPOS.map(function (t, i) { return [t, v(NOMBRES[i])]; });
    var r;
    try {
      var huella = await CF.huellaCarta();
      var datos = {
        alumno: { nombre: v('alumno').replace(/\s+/g, ' '), nacimiento: v('nacimiento') },
        tutor: { nombre: v('firmante'), parentesco: v('parentesco'), telefono: R.telefono10(v('telefono')) },
        emergencias: ['e1', 'e2'].filter(function (n) { return v(n + 'Nombre'); }).map(function (n) {
          return { nombre: v(n + 'Nombre'), parentesco: v(n + 'Parentesco'), telefono: R.telefono10(v(n + 'Telefono')) };
        }),
        salud: { sangre: v('sangre'), alergias: v('alergias'), padecimientos: v('padecimientos'), medicamentos: v('medicamentos'), servicio: v('servicio'), afiliacion: v('afiliacion') },
        consentimientoSalud: true,
        carta: {
          documento: C.documento, version: C.version, huella: huella, seguro: v('seguro'),
          firmante: v('firmante'), parentesco: v('parentesco'), firma: firma.datos(), firmadaEn: cuando.toISOString(),
          leida: true, firmaElectronica: true, dispositivo: String(navigator.userAgent || '').slice(0, 180)
        }
      };
      // El buzón descarta sin aviso lo que llega antes de 2.5 s de abierta la
      // página (la trampa para robots). Si la pestaña se recargó y el borrador
      // la devolvió llena, se espera ese rato en vez de perder la carta.
      var falta = 2600 - (Date.now() - cargada);
      if (falta > 0) await new Promise(function (listo) { setTimeout(listo, falta); });
      r = await window.Buzon.enviar('carta', { enviado: cuando.toISOString(), datos: datos }, { hp: v('sitio'), t: Date.now() - cargada });
      r.datos = datos;
    } catch (err) {
      r = { ok: false, error: 'No se pudo preparar el envío. Intente de nuevo.' };
    }
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
    copia = { datos: datosCarta(), extra: {
      seguro: r.datos.carta.seguro, ficha: ficha, firma: r.datos.carta.firma, firmante: r.datos.carta.firmante,
      parentesco: r.datos.carta.parentesco, huella: r.datos.carta.huella, folio: r.id || '',
      cuando: cuando.toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'long', timeStyle: 'short' })
    } };
    CF.armarCopia($('copia'), copia.datos, copia.extra);
    $('listoTexto').textContent = 'Recibimos la carta de ' + v('alumno') + '. Queda en su expediente.';
    form.hidden = true;
    $('listo').hidden = false;
    borrarBorrador();
    // El foco estaba en el botón que se acaba de ocultar: pasa al aviso.
    $('listo').setAttribute('tabindex', '-1');
    $('listo').focus({ preventScroll: true });
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
  // Como en la inscripción: si se recarga o el celular cierra la pestaña
  // (por ir a WhatsApp a preguntar algo), lo llenado vuelve. Se borra al
  // cerrar la pestaña, al enviar la carta o al día sin tocarlo.
  var CLAVE = 'reivaj_carta_borrador';
  var DIA = 24 * 60 * 60 * 1000;
  var espera = null;
  function guardarEnUnRato() { clearTimeout(espera); espera = setTimeout(guardarBorrador, 400); }
  // Si la pestaña se va (recargar, cerrar) con algo recién escrito, se guarda ya.
  window.addEventListener('pagehide', function () { if (espera) guardarBorrador(); });
  function guardarBorrador() {
    clearTimeout(espera); espera = null;
    try {
      var o = { t: Date.now(), campos: {} };
      [].forEach.call(form.elements, function (x) {
        if (!x.name || x.name === 'sitio') return;
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
    Object.keys(o.campos || {}).forEach(function (k) {
      var c = form.elements[k];
      if (!c) return;
      if (c.length !== undefined && !c.tagName) { [].forEach.call(c, function (r) { r.checked = r.value === o.campos[k]; }); }
      else if (c.type === 'checkbox') c.checked = Boolean(o.campos[k]);
      else c.value = o.campos[k];
    });
    pintar();
  }
  if (conectado) recuperar();

  // El botón viene apagado en el HTML: así, si alguien da Enter antes de que
  // cargue este script, el navegador no manda el formulario por su cuenta.
  if (conectado) $('enviar').disabled = false;
})();
