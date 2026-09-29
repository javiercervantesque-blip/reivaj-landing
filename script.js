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

  function pintarDias() {
    var cont = document.getElementById('dias');
    var elegido = R.valor(form, 'dia');
    cont.innerHTML = '';
    R.diasDePrueba(pruebas).forEach(function (f) {
      var c = R.fechaChip(f);
      var input = R.el('input', { type: 'radio', name: 'dia', value: f, required: true });
      if (f === elegido) input.checked = true;
      cont.appendChild(R.el('label', { clase: 'chip chip--dia' }, [input,
        R.el('span', {}, [R.el('small', { texto: c.dia }), R.el('b', { texto: String(c.num) }), R.el('small', { texto: c.mes })])]));
    });
    document.getElementById('dia-ayuda').textContent = 'La clase es de ' + R.horaBonita(pruebas.hora || '16:00') + ' a ' + R.horaBonita(pruebas.horaFin || '17:00') + '.';
  }
  pintarDias();
  // Si el programa del gimnasio está conectado, manda la agenda real
  // (días sin clase, hora de la prueba).
  if (window.Buzon && window.CONFIG && window.CONFIG.buzon) {
    window.Buzon.agenda().then(function (r) {
      if (r && r.ok && r.agenda && r.agenda.pruebas) { pruebas = r.agenda.pruebas; pintarDias(); }
    });
  }

  var REGLAS = {
    tutor: function (v) { return v.length >= 3 || 'Escribe tu nombre.'; },
    telefono: function (v) { return Boolean(R.telefono10(v)) || 'Escribe un WhatsApp de 10 dígitos.'; },
    alumno: function (v) { return v.length >= 3 || 'Escribe su nombre y apellido.'; },
    edad: function (v) { var n = Number(v); return (n >= 4 && n <= 18) || (n > 0 && n < 4 ? 'Recibimos niñas y niños desde los 4 años.' : 'Escribe su edad (de 4 a 18 años).'); },
    dia: function (v) { return Boolean(v) || 'Escoge el día.'; },
    aviso: function (v) { return v === true || 'Necesitamos tu permiso para escribirte.'; }
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
    return 'Hola REIVAJ, quiero agendar una clase de prueba.\n\n' +
      'Alumno: ' + d.alumno + ' (' + d.edad + ' años)\n' +
      'Día: ' + R.fechaLarga(d.dia) + '\n' +
      'Me llamo ' + d.tutor + (d.comentarios ? '\nNota: ' + d.comentarios : '');
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
      fuente: R.valor(form, 'fuente'), comentarios: R.valor(form, 'comentarios'), origen: 'landing'
    };
    var cfg = window.CONFIG || {};
    if (!cfg.buzon || !cfg.llavePublica || !window.Buzon || !window.Buzon.disponible()) {
      // La página todavía no está conectada al programa del gimnasio: la
      // solicitud sale por WhatsApp, ya escrita (en el mismo clic, para que
      // el navegador no bloquee la ventana).
      window.open(R.enlaceWhatsApp(textoWhatsApp(d)), '_blank', 'noopener');
      terminar('Abrimos WhatsApp con tu solicitud escrita. Envía el mensaje y te confirmamos.');
      return;
    }
    boton.disabled = true;
    boton.textContent = 'Enviando…';
    var r = await window.Buzon.enviar('prueba', { enviado: new Date().toISOString(), datos: d }, { hp: R.valor(form, 'sitio'), t: Date.now() - cargada })
      .catch(function () { return { ok: false }; });
    boton.disabled = false;
    boton.textContent = 'Agendar clase de prueba';
    if (r.ok) {
      terminar('Listo. Te escribimos por WhatsApp para confirmar la clase del ' + R.fechaLarga(d.dia) + ' a las ' + R.horaBonita(pruebas.hora || '16:00') + '.');
      return;
    }
    if (r.red || !r.error) {
      terminar('No pudimos enviarla por aquí. Mándala por WhatsApp: ya va escrita.', R.enlaceWhatsApp(textoWhatsApp(d)));
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
    nota.textContent = 'Te confirmamos por WhatsApp el mismo día hábil.';
    nota.classList.remove('form__note--mal');
    pintarDias();
    exito.hidden = true;
    form.hidden = false;
    form.elements.tutor.focus();
  });
})();
