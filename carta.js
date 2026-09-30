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
  var AYUDA = ['Si no tiene, déjelo en blanco', 'Si no tiene, déjelo en blanco', 'Si no toma, déjelo en blanco', 'IMSS, ISSSTE, seguro, hospital… Si no tiene, déjelo en blanco', 'Si aplica'];
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

  var texto = function (min, msg) { return function (x) { return String(x).length >= min || msg; }; };
  var REGLAS = {
    alumno: texto(5, 'Escriba el nombre completo del alumno.'),
    nacimiento: function (x) { var e = edadDe(x); return (e !== null && e >= 3 && e <= 25) || 'Revise la fecha de nacimiento.'; },
    firmante: texto(5, 'Escriba su nombre completo.'),
    parentesco: function (x) { return Boolean(x) || 'Elija el parentesco.'; },
    telefono: function (x) { return Boolean(R.telefono10(x)) || 'Escriba un WhatsApp de 10 dígitos.'; },
    e1Nombre: texto(3, 'Escriba el nombre.'),
    e1Parentesco: texto(3, 'Escriba el parentesco.'),
    e1Telefono: function (x) { return Boolean(R.telefono10(x)) || 'Escriba un teléfono de 10 dígitos.'; },
    e2Telefono: function (x) { return !x || Boolean(R.telefono10(x)) || 'El teléfono debe tener 10 dígitos.'; },
    sangre: function (x) { return Boolean(x) || 'Elija una opción (puede ser «No lo sé»).'; },
    seguro: function (x) { return Boolean(x) || 'Indique si contrata el seguro.'; },
    consentimientoSalud: function (x) { return x === true || 'Sin este consentimiento no podemos guardar sus datos de salud.'; },
    firma: function () { return firma.valida() || 'Firme en el recuadro con el dedo.'; },
    leida: function (x) { return x === true || 'Confirme que leyó la carta.'; },
    firmaElectronica: function (x) { return x === true || 'Confirme su firma electrónica.'; }
  };
  form.addEventListener('change', function (e) {
    var r = REGLAS[e.target.name];
    if (r && r(v(e.target.name)) === true) R.mostrarError(form, e.target.name, '');
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
      r = await window.Buzon.enviar('carta', { enviado: cuando.toISOString(), datos: datos }, { hp: v('sitio'), t: Date.now() - cargada });
      r.datos = datos;
    } catch (err) {
      r = { ok: false, error: 'No se pudo preparar el envío. Intente de nuevo.' };
    }
    boton.disabled = false;
    boton.textContent = 'Firmar y enviar';
    if (!r.ok) {
      $('nota').textContent = (r.error || 'No se pudo enviar.') + ' Si el problema continúa, escríbanos por WhatsApp.';
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  var copia = null;
  $('descargarPdf').addEventListener('click', function () {
    var b = this;
    if (!copia || b.disabled) return;
    b.disabled = true;
    window.CartaPDF.descargar(copia.datos, copia.extra).then(function () { b.disabled = false; });
  });
  $('guardarCopia').addEventListener('click', function () { window.print(); });
  // El botón viene apagado en el HTML: así, si alguien da Enter antes de que
  // cargue este script, el navegador no manda el formulario por su cuenta.
  if (conectado) $('enviar').disabled = false;
})();
