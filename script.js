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
  // El día que había escogido se quitó al volver a pintar (llegó la agenda
  // real, o la pestaña se quedó abierta): al enviar se dice eso, no «elija».
  var diaQuitado = false;
  function pintarDias() {
    var cont = document.getElementById('dias');
    var elegido = R.valor(form, 'dia');
    cont.innerHTML = '';
    var dias = R.diasDePrueba(pruebas);
    sinFechas = !dias.length;
    if (sinFechas) {
      cont.appendChild(R.el('p', { clase: 'field__ayuda sin-fechas', texto: 'Por el momento no hay fechas disponibles para clase de prueba. Al enviar su solicitud se abrirá WhatsApp con el mensaje ya escrito y le informaremos la próxima fecha.' }));
      R.mostrarError(form, 'dia', '');
    }
    // Una semana por renglón: cada día en la columna de su día de la semana
    // (tantas como días de clase de prueba tenga el programa) y en el renglón
    // de su semana. Un día sin clase deja su hueco.
    var semana = (pruebas.dias || [1, 2, 3, 4, 5]).slice().sort();
    cont.style.gridTemplateColumns = 'repeat(' + semana.length + ',minmax(0,1fr))';
    dias.forEach(function (f) {
      var c = R.fechaChip(f);
      var input = R.el('input', { type: 'radio', name: 'dia', value: f, required: true, 'aria-label': R.fechaLarga(f) });
      if (f === elegido) input.checked = true;
      var fila = Math.floor((Math.round((Date.parse(f) - Date.parse(dias[0])) / 864e5) + R.diaSemana(dias[0]) - 1) / 7) + 1;
      cont.appendChild(R.el('label', { clase: 'chip chip--dia', style: 'grid-column:' + (semana.indexOf(R.diaSemana(f)) + 1) + ';grid-row:' + fila }, [input,
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
  // La hora de cada alumno: los niños, la que se escogió; las niñas, la del programa.
  function horaDe(sexo) {
    return sexo === 'm' ? R.valor(form, 'hora') : (pruebas.hora || '16:00');
  }
  // Con hermanos, basta un niño para que se pregunte la hora (la de las
  // niñas es una sola); con niñas y niños juntos la ayuda dice las dos.
  function pintarHoras() {
    var ramas = alumnos().map(function (a) { return a.sexo; });
    var hayNino = ramas.indexOf('m') >= 0, hayNina = ramas.indexOf('f') >= 0;
    var rama = hayNino ? 'm' : hayNina ? 'f' : '';
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
      var hf = pruebas.hora || '16:00';
      var deNinas = hayNina ? 'Las niñas toman la clase de ' + R.horaBonita(hf) + ' a ' + R.horaBonita(pruebas.horaFin || horaFinDe(hf)) + '. ' : '';
      ayuda.textContent = deNinas + (opciones.length < 2
        ? (hayNina ? 'Los niños, de ' : 'La clase es de ') + R.horaBonita(opciones[0]) + ' a ' + R.horaBonita(horaFinDe(opciones[0])) + '.'
        : hayNina ? 'Para los niños, elija el horario que mejor le acomode.' : 'Elija el horario que mejor le acomode.');
    } else {
      campo.hidden = true;
      var h = pruebas.hora || '16:00';
      ayuda.textContent = rama === 'f' ? 'La clase es de ' + R.horaBonita(h) + ' a ' + R.horaBonita(pruebas.horaFin || horaFinDe(h)) + '.' : 'La clase de prueba dura una hora.';
    }
  }
  form.addEventListener('change', function (e) {
    if (/^rama(_\d+)?$/.test(e.target.name)) pintarHoras();
    if (e.target.name === 'dia') diaQuitado = false;
  });
  /* Hermanos o primos: vienen el mismo día y los trae la misma persona.
     Cada uno llega al programa como su propia solicitud (el programa los
     distingue por nombre); en sus comentarios va con quién viene. */
  var MAX_ALUMNOS = 4;
  var contMas = document.getElementById('masAlumnos');
  var botonMas = document.getElementById('agregarAlumno');
  var siguienteClave = 2;
  // Las claves de los alumnos agregados (no su posición: al quitar uno, los
  // demás conservan sus campos).
  function clavesExtra() { return [].map.call(contMas.children, function (f) { return f.dataset.clave; }); }
  function sufijo(k) { return k ? '_' + k : ''; }
  function alumnos() {
    return [''].concat(clavesExtra()).map(function (k) {
      var sexo = R.valor(form, 'rama' + sufijo(k));
      return { clave: k, alumno: R.valor(form, 'alumno' + sufijo(k)).replace(/\s+/g, ' '), edad: R.valor(form, 'edad' + sufijo(k)), sexo: sexo, hora: horaDe(sexo) };
    });
  }
  function filaAlumno() {
    var k = String(siguienteClave++), s = sufijo(k);
    var quitar = R.el('button', { type: 'button', texto: 'Quitar' });
    var etiqueta = R.el('span', { clase: 'label', id: 'rama-etiqueta' + s }, ['¿Es niña o niño? ', R.el('span', { 'aria-hidden': 'true', texto: '*' })]);
    var fila = R.el('div', { clase: 'grupo alumno-extra', 'data-clave': k }, [
      R.el('p', { clase: 'grupo__titulo' }, [R.el('span'), quitar]),
      R.el('div', { clase: 'field-row' }, [
        R.el('div', { clase: 'field' }, [
          R.el('label', { for: 'alumno' + s, texto: 'Nombre del alumno o alumna' }),
          R.el('input', { type: 'text', id: 'alumno' + s, name: 'alumno' + s, enterkeyhint: 'next', required: true, placeholder: 'Nombre y apellido' }),
          R.el('p', { clase: 'error', 'data-error-for': 'alumno' + s })
        ]),
        R.el('div', { clase: 'field' }, [
          R.el('label', { for: 'edad' + s, texto: 'Edad' }),
          R.el('input', { type: 'number', id: 'edad' + s, name: 'edad' + s, min: '4', max: '18', inputmode: 'numeric', enterkeyhint: 'done', required: true, placeholder: 'Años' }),
          R.el('p', { clase: 'error', 'data-error-for': 'edad' + s })
        ])
      ]),
      R.el('div', { clase: 'field' }, [
        etiqueta,
        R.el('div', { clase: 'chips', role: 'radiogroup', 'aria-labelledby': 'rama-etiqueta' + s }, [
          R.el('label', { clase: 'chip' }, [R.el('input', { type: 'radio', name: 'rama' + s, value: 'f', required: true }), R.el('span', { texto: 'Niña' })]),
          R.el('label', { clase: 'chip' }, [R.el('input', { type: 'radio', name: 'rama' + s, value: 'm' }), R.el('span', { texto: 'Niño' })])
        ]),
        R.el('p', { clase: 'error', 'data-error-for': 'rama' + s })
      ])
    ]);
    quitar.addEventListener('click', function () {
      fila.remove();
      numerarAlumnos();
      pintarHoras();
      botonMas.focus();
    });
    contMas.appendChild(fila);
    numerarAlumnos();
    return fila;
  }
  var ORDINAL = ['Segundo', 'Tercer', 'Cuarto'];
  function numerarAlumnos() {
    [].forEach.call(contMas.children, function (f, i) {
      f.querySelector('.grupo__titulo span').textContent = ORDINAL[i] + ' alumno o alumna';
      f.querySelector('.grupo__titulo button').setAttribute('aria-label', 'Quitar al ' + ORDINAL[i].toLowerCase() + ' alumno');
    });
    botonMas.hidden = contMas.children.length >= MAX_ALUMNOS - 1;
    boton.textContent = textoBoton();
  }
  function textoBoton() { return contMas.children.length ? 'Agendar las clases de prueba' : 'Agendar clase de prueba'; }
  botonMas.addEventListener('click', function () { filaAlumno().querySelector('input').focus(); });

  pintarDias();
  // Si el programa del gimnasio está conectado, manda la agenda real
  // (días sin clase, hora de la prueba). Si llega tarde y el día que ya
  // habían escogido es sin clase, se dice junto al campo (refrescarDias).
  if (window.Buzon && window.CONFIG && window.CONFIG.buzon) {
    window.Buzon.agenda().then(function (r) {
      if (r && r.ok && r.agenda && r.agenda.pruebas) { pruebas = r.agenda.pruebas; refrescarDias(); }
    });
  }
  // Con la pestaña abierta desde ayer (o desde antes de la hora de la clase de
  // hoy), los días pintados ya no son los que se pueden pedir: se vuelven a
  // pintar. Si el día elegido ya no está, se dice junto al campo.
  function refrescarDias() {
    var antes = R.valor(form, 'dia');
    pintarDias();
    var perdido = Boolean(antes && !sinFechas && !R.valor(form, 'dia'));
    if (perdido) { diaQuitado = true; R.mostrarError(form, 'dia', 'Ese día ya no está disponible. Elija otro.'); }
    return perdido;
  }
  window.addEventListener('pageshow', function (e) { if (e.persisted) refrescarDias(); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') refrescarDias(); });

  var REGLAS = {
    tutor: function (v) { return (v.length >= 3 && R.conLetras(v, 3)) || 'Escriba su nombre.'; },
    telefono: function (v) { return R.telefonoValido(v) ? true : R.telefono10(v) ? 'Revise el número: 10 dígitos, con lada (ej. 33 1234 5678).' : 'Escriba un WhatsApp de 10 dígitos.'; },
    // Dos palabras de tres letras o más, igual que palabras() del programa:
    // con una sola (o con «Ma», «Uc») la confunde con otra alumna.
    alumno: function (v) { return (v.split(/\s+/).filter(function (p) { return R.conLetras(p, 3); }).length >= 2) || 'Escriba nombre y apellido del alumno.'; },
    edad: function (v) { var n = Number(v); return (n >= 4 && n <= 18) || (n > 0 && n < 4 ? 'Recibimos a niñas y niños a partir de los 4 años.' : 'Escriba la edad (de 4 a 18 años).'); },
    rama: function (v) { return Boolean(v) || 'Indique si es niña o niño.'; },
    dia: function (v) { return Boolean(v) || sinFechas || (diaQuitado ? 'Ese día ya no está disponible. Elija otro.' : 'Elija el día de la clase.'); },
    hora: function () { return alumnos().every(function (a) { return a.sexo !== 'm' || a.hora; }) || 'Elija el horario.'; },
    aviso: function (v) { return v === true || 'Necesitamos su autorización para contactarle.'; }
  };

  // Las reglas del alumno sirven también para los agregados (alumno_3…),
  // y que no se escriba dos veces al mismo niño.
  function reglaDe(n) {
    var m = /^(alumno|edad|rama)_\d+$/.exec(n || '');
    if (!m) return REGLAS[n];
    if (m[1] !== 'alumno') return REGLAS[m[1]];
    return function (v) {
      var r = REGLAS.alumno(v), mismo = String(v).replace(/\s+/g, ' ').toLowerCase();
      if (r !== true) return r;
      return alumnos().filter(function (a) { return a.alumno.toLowerCase() === mismo; }).length < 2 || 'Este nombre ya está arriba.';
    };
  }
  function nombresDeReglas() {
    var orden = ['tutor', 'telefono', 'alumno', 'edad', 'rama'];
    clavesExtra().forEach(function (k) { orden.push('alumno_' + k, 'edad_' + k, 'rama_' + k); });
    return orden.concat(['dia', 'hora', 'aviso']);
  }
  function revisar() {
    var primero = null;
    nombresDeReglas().forEach(function (k) {
      var r = reglaDe(k)(R.valor(form, k));
      R.mostrarError(form, k, r === true ? '' : r);
      if (r !== true && !primero) primero = k;
    });
    return primero;
  }
  ['input', 'change'].forEach(function (ev) {
    form.addEventListener(ev, function (e) {
      var k = e.target.name, regla = reglaDe(k);
      if (regla && regla(R.valor(form, k)) === true) R.mostrarError(form, k, '');
    });
  });
  // «Ir»/Enter en los recuadros de texto pasa al siguiente en vez de mandar
  // el formulario a medias (y pintar en rojo lo que todavía no llena).
  form.addEventListener('keydown', function (e) {
    var orden = ['tutor', 'telefono', 'alumno', 'edad'], i = orden.indexOf(e.target.name);
    var extra = /^(alumno|edad)_(\d+)$/.exec(e.target.name || '');
    if (e.key !== 'Enter' || e.isComposing || (i < 0 && !extra)) return;
    e.preventDefault();
    if (extra && extra[1] === 'alumno') form.elements['edad_' + extra[2]].focus();
    else if (!extra && orden[i + 1]) form.elements[orden[i + 1]].focus(); else e.target.blur();
  });

  // Uno o varios alumnos (hermanos o primos): el día es el mismo; con
  // varios, la hora va junto a cada uno (niñas y niños pueden ir a distinta).
  function textoWhatsApp(lista, nota) {
    var d = lista[0], varios = lista.length > 1;
    return 'Hola, me gustaría agendar ' + (varios ? 'clases de prueba' : 'una clase de prueba') + ' en REIVAJ Gimnasia.\n\n' +
      lista.map(function (x) {
        return (x.sexo === 'm' ? 'Alumno: ' : 'Alumna: ') + x.alumno + ' (' + x.edad + ' años)' + (varios ? ', ' + R.horaBonita(x.hora) : '');
      }).join('\n') + '\n' +
      (d.dia ? 'Día: ' + R.fechaLarga(d.dia) : 'Día: el próximo que tengan disponible') + (varios ? '' : ', ' + R.horaBonita(d.hora)) + '\n' +
      'Mi nombre es ' + d.tutor + (nota ? '\nNota: ' + nota : '');
  }
  // «Ana», «Ana y Luis», «Ana, Luis y Sofía»: con el primer nombre basta.
  function nombres(lista) {
    var n = lista.map(function (x) { return x.alumno.split(' ')[0]; });
    return n.length < 2 ? n.join('') : n.slice(0, -1).join(', ') + ' y ' + n[n.length - 1];
  }

  var botonWa = document.getElementById('successWa');
  var tituloExito = exito.querySelector('h3');
  var iconoExito = exito.querySelector('.success__icon');
  // Con el botón de WhatsApp todavía falta mandar el mensaje: no se dice «recibida».
  function terminar(texto, enlaceWa, varias) {
    tituloExito.textContent = enlaceWa ? 'Falta un paso' : varias ? 'Solicitudes recibidas' : 'Solicitud recibida';
    iconoExito.hidden = Boolean(enlaceWa);
    mensajeExito.textContent = texto;
    botonWa.hidden = !enlaceWa;
    if (enlaceWa) botonWa.href = enlaceWa;
    form.hidden = true;
    exito.hidden = false;
    // El foco estaba en el botón que se acaba de ocultar: pasa al aviso, y el
    // lector de pantalla lo lee.
    exito.setAttribute('tabindex', '-1');
    exito.focus({ preventScroll: true });
    exito.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    // Lo pintado pudo quedarse viejo (ver refrescarDias). Si ya no queda
    // ningún día, sigue: sale por WhatsApp sin fecha.
    if (refrescarDias()) { R.llevarA(form, 'dia'); return; }
    var malo = revisar();
    if (malo) { R.llevarA(form, malo); return; }
    var comun = {
      tutor: R.valor(form, 'tutor'), telefono: R.telefono10(R.valor(form, 'telefono')), dia: R.valor(form, 'dia'),
      fuente: R.valor(form, 'fuente'), origen: 'landing'
    };
    var nota = R.valor(form, 'comentarios');
    // Un registro por alumno, como si cada uno se hubiera mandado solo. Con
    // hermanos, sus comentarios empiezan con quién viene (el programa los
    // recorta a 600: lo de la familia va primero para que no se pierda).
    var lista = alumnos().map(function (a, i, todos) {
      var otros = todos.filter(function (o) { return o !== a; }).map(function (o) { return o.alumno + ' (' + o.edad + ' años)'; });
      return Object.assign({}, comun, {
        alumno: a.alumno, edad: a.edad, sexo: a.sexo, hora: a.hora,
        comentarios: [otros.length ? 'Viene junto con ' + otros.join(' y ') + '.' : '', nota].filter(Boolean).join('\n')
      });
    });
    var cfg = window.CONFIG || {};
    if (sinFechas || !cfg.buzon || !cfg.llavePublica || !window.Buzon || !window.Buzon.disponible()) {
      // La página todavía no está conectada al programa del gimnasio, o no
      // hay fechas que pedir: la solicitud sale por WhatsApp, ya escrita (en
      // el mismo clic, para que el navegador no bloquee la ventana). Con
      // 'noopener' no se sabe si se abrió: el botón queda por si no.
      var wa = R.enlaceWhatsApp(textoWhatsApp(lista, nota));
      window.open(wa, '_blank', 'noopener');
      terminar('Abrimos WhatsApp con su solicitud ya escrita. Envíe el mensaje y le confirmaremos a la brevedad. Si no se abrió, use este botón.', wa);
      return;
    }
    boton.disabled = true;
    boton.textContent = 'Enviando…';
    // El buzón descarta sin aviso lo que llega antes de 2.5 s de abierta la
    // página (la trampa para robots). Si la pestaña se recargó al volver (de
    // WhatsApp, en el navegador de Instagram) y el formulario volvió lleno,
    // se espera ese rato en vez de perder la solicitud.
    var falta = 2600 - (Date.now() - cargada);
    if (falta > 0) await new Promise(function (listo) { setTimeout(listo, falta); });
    // Uno tras otro. Si uno no sale, los que faltan ya no se intentan (sin
    // señal fallarían igual) y van por WhatsApp junto con ese.
    var enviado = new Date().toISOString(), llegaron = [], faltan = [];
    for (var i = 0; i < lista.length; i++) {
      var r = faltan.length ? { ok: false } : await window.Buzon.enviar('prueba', { enviado: enviado, datos: lista[i] }, { hp: R.valor(form, 'sitio'), t: Date.now() - cargada })
        .catch(function () { return { ok: false }; });
      (r.ok ? llegaron : faltan).push(lista[i]);
    }
    boton.disabled = false;
    boton.textContent = textoBoton();
    var d = lista[0];
    if (!faltan.length) {
      // Con niñas y niños a distinta hora, se dice la de cada uno.
      var mismaHora = lista.every(function (x) { return x.hora === d.hora; });
      terminar('Gracias. Le escribiremos por WhatsApp para confirmar ' + (lista.length > 1 ? 'las clases de ' + nombres(lista) : 'la clase') + ' del ' + R.fechaLarga(d.dia) +
        (mismaHora ? ' a las ' + R.horaBonita(d.hora) : ': ' + lista.map(function (x) { return nombres([x]) + ' a las ' + R.horaBonita(x.hora); }).join(' y ')) + '.', null, lista.length > 1);
      return;
    }
    // Sin señal, sin respuesta o con un error del buzón (tope de envíos, envío
    // incompleto…): nada de eso lo corrige el papá en el formulario. Sale por
    // WhatsApp, ya escrita, solo con los que no llegaron.
    terminar(llegaron.length
      ? 'Recibimos la solicitud de ' + nombres(llegaron) + ', pero la de ' + nombres(faltan) + ' no se pudo enviar desde aquí. Envíela por WhatsApp; el mensaje ya está escrito.'
      : 'No pudimos enviar la solicitud desde aquí. Envíela por WhatsApp; el mensaje ya está escrito.', R.enlaceWhatsApp(textoWhatsApp(faltan, nota)));
  });

  document.getElementById('resetForm').addEventListener('click', function () {
    // Para otro alumno: el papá y su WhatsApp se quedan; la autorización se
    // vuelve a dar.
    var queda = { tutor: form.elements.tutor.value, telefono: form.elements.telefono.value, fuente: form.elements.fuente.value };
    form.reset();
    contMas.innerHTML = '';
    numerarAlumnos();
    Object.keys(queda).forEach(function (k) { form.elements[k].value = queda[k]; });
    form.querySelectorAll('.has-error').forEach(function (f) { f.classList.remove('has-error'); });
    form.querySelectorAll('.error').forEach(function (f) { f.classList.remove('is-visible'); });
    var nota = form.querySelector('.form__note');
    nota.textContent = 'Le confirmamos por WhatsApp el mismo día hábil.';
    nota.classList.remove('form__note--mal');
    diaQuitado = false;
    pintarDias();
    exito.hidden = true;
    form.hidden = false;
    form.elements.alumno.focus();
  });

  // El botón viene apagado en el HTML: así, si alguien da Enter antes de que
  // cargue este script, el navegador no manda el formulario por su cuenta.
  boton.disabled = false;
})();
