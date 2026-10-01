/* =========================================================
   REIVAJ · Gimnasia Artística — página principal
   ========================================================= */
(function () {
  'use strict';
  var R = window.Reivaj;
  R.iniciarPagina();
  var cargada = Date.now();

  /* CTA flotante: aparece después del inicio y se esconde en el formulario */
  var fab = document.getElementById('fab');
  var agendar = document.getElementById('agendar');
  var alMover = function () {
    var y = window.scrollY;
    fab.classList.toggle('is-visible', y > 520 && agendar.getBoundingClientRect().top > window.innerHeight * 0.6);
  };
  window.addEventListener('scroll', alMover, { passive: true });
  alMover();

  /* Video del inicio: quieto si la persona pidió menos movimiento */
  var heroVideo = document.getElementById('heroVideo');
  if (heroVideo && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    heroVideo.removeAttribute('autoplay');
    heroVideo.pause();
  }

  /* Contadores */
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var contar = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        var n = Number(e.target.dataset.count), t0 = performance.now();
        var paso = function (t) {
          var p = Math.min((t - t0) / 900, 1);
          e.target.textContent = Math.round(n * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(paso);
        };
        requestAnimationFrame(paso);
        contar.unobserve(e.target);
      });
    }, { threshold: 0.6 });
    document.querySelectorAll('[data-count]').forEach(function (x) { contar.observe(x); });
  }

  /* Un FAQ abierto a la vez */
  document.querySelectorAll('.faq details').forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (!d.open) return;
      document.querySelectorAll('.faq details').forEach(function (o) { if (o !== d) o.open = false; });
    });
  });

  /* ---------------------------------------------------------
     Clase de prueba
     --------------------------------------------------------- */
  var form = document.getElementById('trialForm');
  var exito = document.getElementById('formSuccess');
  var mensajeExito = document.getElementById('successMsg');
  var boton = document.getElementById('submitBtn');
  var pruebas = (window.CONFIG && window.CONFIG.pruebas) || {};

  var selectFuente = form.elements.fuente;
  R.FUENTES.forEach(function (f) { selectFuente.appendChild(R.el('option', { value: f[0], texto: f[1] })); });

  // Sin ningún día que se pueda pedir (vacaciones en el programa, por
  // ejemplo), la solicitud sale por WhatsApp sin fecha y no se exige el día.
  var sinFechas = false;
  function pintarDias() {
    var cont = document.getElementById('dias');
    var elegido = R.valor(form, 'dia');
    cont.innerHTML = '';
    var dias = R.diasDePrueba(pruebas);
    sinFechas = !dias.length;
    if (sinFechas) {
      cont.appendChild(R.el('p', { clase: 'field__ayuda sin-fechas', texto: 'Por ahora no hay fechas de clase de prueba. Al enviar su solicitud se abre WhatsApp con el mensaje ya escrito y le avisamos la próxima fecha.' }));
      R.mostrarError(form, 'dia', '');
    }
    dias.forEach(function (f) {
      var c = R.fechaChip(f);
      var input = R.el('input', { type: 'radio', name: 'dia', value: f, required: true });
      if (f === elegido) input.checked = true;
      cont.appendChild(R.el('label', { clase: 'chip chip--dia' }, [input,
        R.el('span', {}, [R.el('small', { texto: c.dia }), R.el('b', { texto: String(c.num) }), R.el('small', { texto: c.mes })])]));
    });
    pintarHoras();
  }

  // Niñas: una sola hora (la del programa). Niños: escogen entre las de horasNinos.
  function horasNinos() {
    var h = pruebas.horasNinos || (window.CONFIG && window.CONFIG.pruebas && window.CONFIG.pruebas.horasNinos);
    return Array.isArray(h) && h.length ? h : [pruebas.hora || '16:00'];
  }
  function horaFinDe(h) {
    var p = String(h).split(':');
    return ('0' + ((+p[0] + 1) % 24)).slice(-2) + ':' + (p[1] || '00');
  }
  function horaElegida() {
    return R.valor(form, 'rama') === 'm' ? R.valor(form, 'hora') : (pruebas.hora || '16:00');
  }
  function pintarHoras() {
    var rama = R.valor(form, 'rama');
    var campo = document.getElementById('campoHora');
    var cont = document.getElementById('horas');
    var ayuda = document.getElementById('dia-ayuda');
    var elegida = R.valor(form, 'hora');
    cont.innerHTML = '';
    if (rama === 'm') {
      var opciones = horasNinos();
      opciones.forEach(function (h) {
        var input = R.el('input', { type: 'radio', name: 'hora', value: h, required: true });
        if (h === elegida || opciones.length === 1) input.checked = true;
        cont.appendChild(R.el('label', { clase: 'chip' }, [input, R.el('span', { texto: R.horaBonita(h) + ' a ' + R.horaBonita(horaFinDe(h)) })]));
      });
      campo.hidden = opciones.length < 2;
      ayuda.textContent = opciones.length < 2 ? 'La clase es de ' + R.horaBonita(opciones[0]) + ' a ' + R.horaBonita(horaFinDe(opciones[0])) + '.' : 'Elija el horario que mejor le acomode.';
    } else {
      campo.hidden = true;
      var h = pruebas.hora || '16:00';
      ayuda.textContent = rama === 'f' ? 'La clase es de ' + R.horaBonita(h) + ' a ' + R.horaBonita(pruebas.horaFin || horaFinDe(h)) + '.' : 'La clase de prueba dura una hora.';
    }
  }
  form.addEventListener('change', function (e) { if (e.target.name === 'rama') pintarHoras(); });
  pintarDias();
  // Si el programa del gimnasio está conectado, manda la agenda real
  // (días sin clase, hora de la prueba).
  if (window.Buzon && window.CONFIG && window.CONFIG.buzon) {
    window.Buzon.agenda().then(function (r) {
      if (r && r.ok && r.agenda && r.agenda.pruebas) { pruebas = r.agenda.pruebas; pintarDias(); }
    });
  }

  var REGLAS = {
    tutor: function (v) { return (v.length >= 3 && R.conLetras(v, 3)) || 'Escriba su nombre.'; },
    telefono: function (v) { return R.telefonoValido(v) ? true : R.telefono10(v) ? 'Revise el número: 10 dígitos, con lada (ej. 33 1234 5678).' : 'Escriba un WhatsApp de 10 dígitos.'; },
    alumno: function (v) { return (v.length >= 3 && R.conLetras(v, 3)) || 'Escriba el nombre y apellido del alumno.'; },
    edad: function (v) { var n = Number(v); return (n >= 4 && n <= 18) || (n > 0 && n < 4 ? 'Recibimos a niñas y niños a partir de los 4 años.' : 'Escriba la edad (de 4 a 18 años).'); },
    rama: function (v) { return Boolean(v) || 'Indique si es niña o niño.'; },
    dia: function (v) { return Boolean(v) || sinFechas || 'Elija el día de la clase.'; },
    hora: function () { return Boolean(horaElegida()) || 'Elija el horario.'; },
    aviso: function (v) { return v === true || 'Necesitamos su autorización para contactarle.'; }
  };

  function revisar() {
    var primero = null;
    Object.keys(REGLAS).forEach(function (k) {
      var r = REGLAS[k](R.valor(form, k));
      R.mostrarError(form, k, r === true ? '' : r);
      if (r !== true && !primero) primero = k;
    });
    return primero;
  }
  ['input', 'change'].forEach(function (ev) {
    form.addEventListener(ev, function (e) {
      var k = e.target.name;
      if (REGLAS[k] && REGLAS[k](R.valor(form, k)) === true) R.mostrarError(form, k, '');
    });
  });

  function textoWhatsApp(d) {
    return 'Hola, me gustaría agendar una clase de prueba en REIVAJ Gimnasia.\n\n' +
      (d.sexo === 'm' ? 'Alumno: ' : 'Alumna: ') + d.alumno + ' (' + d.edad + ' años)\n' +
      (d.dia ? 'Día: ' + R.fechaLarga(d.dia) + ', ' : 'Día: el próximo que tengan disponible, ') + R.horaBonita(d.hora) + '\n' +
      'Mi nombre es ' + d.tutor + (d.comentarios ? '\nNota: ' + d.comentarios : '');
  }

  var botonWa = document.getElementById('successWa');
  function terminar(texto, enlaceWa) {
    mensajeExito.textContent = texto;
    botonWa.hidden = !enlaceWa;
    if (enlaceWa) botonWa.href = enlaceWa;
    form.hidden = true;
    exito.hidden = false;
    exito.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var malo = revisar();
    if (malo) { R.llevarA(form, malo); return; }
    var d = {
      alumno: R.valor(form, 'alumno'), edad: R.valor(form, 'edad'), tutor: R.valor(form, 'tutor'),
      telefono: R.telefono10(R.valor(form, 'telefono')), dia: R.valor(form, 'dia'),
      sexo: R.valor(form, 'rama'), hora: horaElegida(),
      fuente: R.valor(form, 'fuente'), comentarios: R.valor(form, 'comentarios'), origen: 'landing'
    };
    var cfg = window.CONFIG || {};
    if (sinFechas || !cfg.buzon || !cfg.llavePublica || !window.Buzon || !window.Buzon.disponible()) {
      // La página todavía no está conectada al programa del gimnasio, o no
      // hay fechas que pedir: la solicitud sale por WhatsApp, ya escrita (en
      // el mismo clic, para que el navegador no bloquee la ventana).
      window.open(R.enlaceWhatsApp(textoWhatsApp(d)), '_blank', 'noopener');
      terminar('Abrimos WhatsApp con su solicitud ya escrita. Envíe el mensaje y le confirmamos a la brevedad.');
      return;
    }
    boton.disabled = true;
    boton.textContent = 'Enviando…';
    var r = await window.Buzon.enviar('prueba', { enviado: new Date().toISOString(), datos: d }, { hp: R.valor(form, 'sitio'), t: Date.now() - cargada })
      .catch(function () { return { ok: false }; });
    boton.disabled = false;
    boton.textContent = 'Agendar clase de prueba';
    if (r.ok) {
      terminar('Gracias. Le escribiremos por WhatsApp para confirmar la clase del ' + R.fechaLarga(d.dia) + ' a las ' + R.horaBonita(d.hora) + '.');
      return;
    }
    if (r.red || !r.error) {
      terminar('No pudimos enviar la solicitud desde aquí. Envíela por WhatsApp: ya va escrita.', R.enlaceWhatsApp(textoWhatsApp(d)));
      return;
    }
    var nota = form.querySelector('.form__note');
    nota.textContent = r.error;
    nota.classList.add('form__note--mal');
  });

  document.getElementById('resetForm').addEventListener('click', function () {
    form.reset();
    form.querySelectorAll('.has-error').forEach(function (f) { f.classList.remove('has-error'); });
    form.querySelectorAll('.error').forEach(function (f) { f.classList.remove('is-visible'); });
    var nota = form.querySelector('.form__note');
    nota.textContent = 'Le confirmamos por WhatsApp el mismo día hábil.';
    nota.classList.remove('form__note--mal');
    pintarDias();
    exito.hidden = true;
    form.hidden = false;
    form.elements.tutor.focus();
  });

  // El botón viene apagado en el HTML: así, si alguien da Enter antes de que
  // cargue este script, el navegador no manda el formulario por su cuenta.
  boton.disabled = false;
})();
