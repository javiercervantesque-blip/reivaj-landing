/* =========================================================
   REIVAJ · La lista del celular (solo para quien tiene el link)

   La lista de alumnos llega cerrada; se abre con la llave que viene en
   el link que da el programa (después del #, que nunca sale de este
   celular). Con la misma llave se firma cada hora que se manda, para
   que el programa sepa que viene de aquí. Si no hay señal, la hora se
   guarda en el celular y se manda sola en cuanto vuelva el internet.

   En la lista salen solo los que tienen esa hora ese día. A quien vino
   sin que le tocara se le busca por nombre y se agrega: llega al
   programa marcado como «fuera de su horario».
   ========================================================= */
(function () {
  'use strict';
  var DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  var $ = function (id) { return document.getElementById(id); };
  var K = { llave: 'reivaj_lista_llave', cerrada: 'reivaj_lista_cerrada', pasadas: 'reivaj_lista_pasadas', cola: 'reivaj_lista_cola' };
  var estado = { llave: '', datos: null, hora: null, marcados: {}, extras: {}, notas: {}, agendadas: {} };

  function guardado(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
    } catch (e) { return null; }
    return null;
  }
  function leerJson(k, def) { try { return JSON.parse(guardado(k) || '') || def; } catch (e) { return def; } }
  function mostrar(el, si) { el.classList[si ? 'remove' : 'add']('oculto'); }
  function mensaje(txt, tipo) { var m = $('mensaje'); m.textContent = txt || ''; m.className = 'aviso ' + (tipo || ''); mostrar(m, Boolean(txt)); }
  function hoy() {
    var p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    var o = {}; p.forEach(function (x) { o[x.type] = x.value; });
    return o.year + '-' + o.month + '-' + o.day;
  }
  function horaAhora() {
    return new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  }
  function diaSemana(f) { var p = f.split('-'); var j = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2], 12)).getUTCDay(); return j === 0 ? 7 : j; }

  // ─── La llave del link ──────────────────────────────────────────────
  var h = location.hash.replace(/^#/, '');
  var m = /(?:^|&)k=([A-Za-z0-9_-]{43})(?:&|$)/.exec(h) || /^([A-Za-z0-9_-]{43})$/.exec(h);
  // La llave se queda en el link (así el acceso directo de la pantalla de
  // inicio la lleva consigo) y también se guarda en este celular.
  if (m) guardado(K.llave, m[1]);
  estado.llave = guardado(K.llave) || '';
  if (!estado.llave) { mostrar($('vista-sin-llave'), true); return; }
  if (!window.CONFIG || !window.CONFIG.buzon || !window.Buzon || !window.Buzon.disponible()) {
    mensaje('La página todavía no está conectada con el programa del gimnasio.', 'error');
    return;
  }

  // ─── Cargar la lista ────────────────────────────────────────────────
  async function abrir(cerrada, deGuardada) {
    try {
      estado.datos = await window.Buzon.abrirLista(estado.llave, cerrada);
    } catch (e) {
      if (!deGuardada) mensaje('Este link ya no abre la lista: en el programa se cambió el link. Ábrelo de nuevo desde el programa.', 'error');
      return false;
    }
    $('titulo').textContent = (estado.datos.negocio || 'Gimnasio') + ' · Lista';
    $('subtitulo').textContent = 'Lista del ' + String(estado.datos.generada || '').slice(0, 16).replace('T', ' ');
    mostrar($('vista-lista'), true);
    mostrar($('actualizar'), true);
    if (!$('fecha').value) $('fecha').value = hoy();
    pintarHoras();
    if (estado.hora) pintarAlumnos();
    return true;
  }
  async function cargar() {
    var guardada = guardado(K.cerrada);
    if (guardada && !estado.datos) await abrir(guardada, true);
    $('actualizar').disabled = true;
    var r = await window.Buzon.lista();
    $('actualizar').disabled = false;
    if (r && r.ok && r.lista) {
      if (await abrir(r.lista, false)) guardado(K.cerrada, r.lista);
    } else if (!estado.datos) {
      mensaje((r && r.error) || 'No hay conexión y este celular todavía no tiene la lista guardada.', 'error');
    }
    mandarPendientes();
  }
  $('actualizar').addEventListener('click', function () { mensaje(''); cargar(); });

  // ─── Pintar ─────────────────────────────────────────────────────────
  function pasadas() {
    var o = {};
    Object.keys((estado.datos && estado.datos.pasadas) || {}).forEach(function (k) { o[k] = true; });
    Object.keys(leerJson(K.pasadas, {})).forEach(function (k) { o[k] = true; });
    return o;
  }
  function delDia() {
    var d = diaSemana($('fecha').value || hoy());
    var por = {};
    (estado.datos.alumnos || []).forEach(function (a) {
      a.s.forEach(function (s) { var p = s.split('-'); if (+p[0] === d) (por[p[1]] = por[p[1]] || []).push(a); });
    });
    return por;
  }
  function pintarHoras() {
    var por = delDia(), cont = $('horas'), f = $('fecha').value, ya = pasadas();
    cont.innerHTML = '';
    if (diaSemana(f) === 7) {
      cont.innerHTML = '<div class="aviso">Los domingos no hay clase.</div>';
      ['bloque-alumnos', 'bloque-extra', 'barra'].forEach(function (id) { mostrar($(id), false); });
      return;
    }
    (estado.datos.horas || []).forEach(function (hr) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'hora' + (estado.hora === hr ? ' activa' : '') + (ya[f + '|' + hr] ? ' hecha' : '');
      b.innerHTML = hr + '<small>' + ((por[hr] || []).length) + ' alumnos</small>';
      b.onclick = function () { estado.hora = hr; limpiarHora(); pintarHoras(); pintarAlumnos(); };
      cont.appendChild(b);
    });
  }
  function limpiarHora() { estado.marcados = {}; estado.extras = {}; estado.notas = {}; estado.agendadas = {}; $('pruebas').innerHTML = ''; $('nota-dia').value = ''; $('buscar').value = ''; }

  function porNombre(a, b) { return a.n.localeCompare(b.n, 'es'); }
  function sinAcentos(t) { return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
  // «sofi men» encuentra a «Sofía Méndez»: cada palabra tiene que estar.
  function coincide(nombre, filtro) {
    if (!filtro) return true;
    var n = sinAcentos(nombre);
    return filtro.split(/\s+/).every(function (p) { return n.indexOf(p) >= 0; });
  }
  // El horario que tiene capturado, para ver de un vistazo que no es de esta hora: «LX 16:00 · J 17:00».
  function suHorario(a) {
    var por = {};
    a.s.forEach(function (s) { var p = s.split('-'); (por[p[1]] = por[p[1]] || []).push(+p[0]); });
    var horas = Object.keys(por).sort();
    if (!horas.length) return 'sin horario capturado';
    return horas.map(function (hr) { return por[hr].sort().map(function (d) { return DIAS[d - 1]; }).join('') + ' ' + hr; }).join(' · ');
  }
  function alumnoPorId(id) { return (estado.datos.alumnos || []).filter(function (a) { return a.i === id; })[0]; }
  function idsDe(o) { return Object.keys(o).filter(function (k) { return o[k]; }); }
  function editarNota(a) {
    var t = prompt('Nota para ' + a.n + ':', estado.notas[a.i] || '');
    if (t !== null) { estado.notas[a.i] = t.trim(); pintarAlumnos(); }
  }
  function ponerNota(cont, a) {
    if (!estado.notas[a.i]) return;
    var n = document.createElement('div'); n.className = 'nota-alumno aviso'; n.textContent = estado.notas[a.i]; cont.appendChild(n);
  }
  function separador(cont, texto) { var h = document.createElement('h3'); h.className = 'sep'; h.textContent = texto; cont.appendChild(h); }

  function pintarAlumnos() {
    var lista = (delDia()[estado.hora] || []).slice().sort(porNombre);
    var enHora = {};
    lista.forEach(function (a) { enHora[a.i] = true; });
    var filtro = sinAcentos($('buscar').value);
    var cont = $('alumnos');
    cont.innerHTML = '';
    $('titulo-hora').textContent = 'Los de las ' + estado.hora + ' · palomea a quien esté';
    if (!lista.length) cont.innerHTML = '<div class="aviso">A esta hora no hay alumnos con clase este día. Si vino alguien, búscalo arriba.</div>';
    else if (filtro && !lista.some(function (a) { return coincide(a.n, filtro); })) cont.innerHTML = '<div class="nadie">Nadie de esta hora se llama así.</div>';
    lista.forEach(function (a) {
      if (!coincide(a.n, filtro)) return;
      var dias = a.s.filter(function (s) { return s.split('-')[1] === estado.hora; }).map(function (s) { return DIAS[+s.split('-')[0] - 1]; }).join('');
      var fila = document.createElement('div');
      fila.className = 'alumno' + (estado.marcados[a.i] ? ' vino' : '');
      fila.innerHTML = '<div class="casilla">' + (estado.marcados[a.i] ? '✓' : '') + '</div><div class="nombre"></div><span class="dias"></span><button class="nota-btn" type="button" title="Nota">✎</button>';
      fila.querySelector('.nombre').textContent = a.n;
      fila.querySelector('.dias').textContent = dias;
      fila.onclick = function (ev) { if (ev.target.classList.contains('nota-btn')) return; estado.marcados[a.i] = !estado.marcados[a.i]; pintarAlumnos(); };
      fila.querySelector('.nota-btn').onclick = function () { editarNota(a); };
      cont.appendChild(fila);
      ponerNota(cont, a);
    });
    pintarOtros(enHora, filtro);
    pintarFuera();
    pintarAgendadas();
    var n = idsDe(estado.marcados).length + idsDe(estado.extras).length;
    $('cuenta').textContent = n + ' aquí';
    ['bloque-alumnos', 'bloque-extra', 'barra'].forEach(function (id) { mostrar($(id), true); });
    var f = $('fecha').value;
    if (pasadas()[f + '|' + estado.hora]) mensaje('Esta hora ya se pasó. Si la vuelves a enviar, se corrige con lo nuevo.', '');
    else if (!$('mensaje').classList.contains('ok')) mensaje('');
  }

  // Al buscar, también salen los que no son de esta hora, con su horario
  // al lado; «+ Vino» los pasa a «Fuera de su horario».
  function pintarOtros(enHora, filtro) {
    var cont = $('otros');
    cont.innerHTML = '';
    if (filtro.length < 2) return;
    var hallados = (estado.datos.alumnos || []).filter(function (a) {
      return !enHora[a.i] && !estado.extras[a.i] && coincide(a.n, filtro);
    }).sort(porNombre);
    separador(cont, 'De otro horario');
    if (!hallados.length) {
      cont.insertAdjacentHTML('beforeend', '<div class="nadie">No hay nadie más con ese nombre. Si vino a probar, anótalo abajo en «¿Vino alguien a probar?».</div>');
      return;
    }
    hallados.slice(0, 8).forEach(function (a) {
      var fila = document.createElement('div');
      fila.className = 'otro';
      fila.innerHTML = '<div class="nombre"><span></span><small></small></div><button type="button" class="agregar">+ Vino</button>';
      fila.querySelector('span').textContent = a.n;
      fila.querySelector('small').textContent = 'Su horario: ' + suHorario(a);
      fila.querySelector('.agregar').onclick = function () {
        estado.extras[a.i] = true;
        $('buscar').value = '';
        pintarAlumnos();
      };
      cont.appendChild(fila);
    });
    if (hallados.length > 8) cont.insertAdjacentHTML('beforeend', '<div class="nadie">Hay ' + (hallados.length - 8) + ' más: escribe más del nombre.</div>');
  }

  // Los que vinieron sin que les tocara esta hora.
  function pintarFuera() {
    var cont = $('fuera');
    cont.innerHTML = '';
    var fuera = idsDe(estado.extras).map(alumnoPorId).filter(Boolean).sort(porNombre);
    if (!fuera.length) return;
    separador(cont, 'Fuera de su horario · ' + fuera.length);
    fuera.forEach(function (a) {
      var fila = document.createElement('div');
      fila.className = 'alumno vino fuera';
      fila.innerHTML = '<div class="casilla">✓</div><div class="nombre"><span></span><small></small></div><button class="nota-btn" type="button" title="Nota">✎</button><button class="quitar" type="button" title="Quitar">✕</button>';
      fila.querySelector('span').textContent = a.n;
      fila.querySelector('small').textContent = 'Vino fuera de su horario · el suyo: ' + suHorario(a);
      fila.querySelector('.nota-btn').onclick = function () { editarNota(a); };
      fila.querySelector('.quitar').onclick = function () { delete estado.extras[a.i]; delete estado.notas[a.i]; pintarAlumnos(); };
      cont.appendChild(fila);
      ponerNota(cont, a);
    });
  }

  // Clases de prueba agendadas para ese día: un toque y quedan anotadas.
  function pintarAgendadas() {
    var cont = $('agendadas');
    cont.innerHTML = '';
    var f = $('fecha').value;
    (estado.datos.pruebas || []).filter(function (p) { return p.f === f; }).forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = estado.agendadas[p.n] ? 'puesta' : '';
      b.textContent = (estado.agendadas[p.n] ? '✓ ' : '+ ') + p.n + (p.h ? ' · ' + p.h : '');
      b.onclick = function () { estado.agendadas[p.n] = !estado.agendadas[p.n]; pintarAgendadas(); };
      cont.appendChild(b);
    });
  }
  function agregarPrueba() {
    var div = document.createElement('div');
    div.className = 'prueba';
    div.innerHTML = '<input type="text" placeholder="¿Cómo se llama?"><input type="text" placeholder="¿Qué días y hora le recomiendas?">';
    $('pruebas').appendChild(div);
  }

  // ─── Mandar ─────────────────────────────────────────────────────────
  function marcarPasada(f, hr) {
    var o = leerJson(K.pasadas, {});
    o[f + '|' + hr] = true;
    // Solo las de las últimas dos semanas.
    var limite = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
    Object.keys(o).forEach(function (k) { if (k.slice(0, 10) < limite) delete o[k]; });
    guardado(K.pasadas, JSON.stringify(o));
  }
  async function mandarUna(env) {
    var r = await window.Buzon.enviar('lista', { enviado: env.enviado, texto: env.texto, firma: env.firma }, { t: 999999 })
      .catch(function () { return { ok: false, red: true }; });
    return r;
  }
  var mandando = false;
  async function mandarPendientes() {
    if (mandando) return;
    var cola = leerJson(K.cola, []);
    if (!cola.length) { mostrar($('pendientes'), false); return; }
    mandando = true;
    var quedan = [];
    for (var i = 0; i < cola.length; i++) {
      var r = await mandarUna(cola[i]);
      if (!r.ok && (r.red || !r.error)) quedan.push(cola[i]);
    }
    guardado(K.cola, JSON.stringify(quedan));
    mandando = false;
    var p = $('pendientes');
    p.textContent = quedan.length ? quedan.length + ' hora(s) guardadas en este celular, esperando internet para mandarse.' : '';
    mostrar(p, quedan.length > 0);
  }
  window.addEventListener('online', mandarPendientes);
  setInterval(mandarPendientes, 60000);

  async function enviar() {
    var f = $('fecha').value;
    if (!f || !estado.hora) return;
    var extras = idsDe(estado.extras);
    // Los de fuera de su horario también van en «presentes»: así los cuenta
    // igual un programa que todavía no conozca «extras».
    var presentes = idsDe(estado.marcados).filter(function (k) { return !estado.extras[k]; }).concat(extras);
    var notas = Object.keys(estado.notas).filter(function (k) { return estado.notas[k]; }).map(function (k) { return { alumnoId: k, texto: estado.notas[k] }; });
    var pruebas = Object.keys(estado.agendadas).filter(function (n) { return estado.agendadas[n]; }).map(function (n) { return { nombre: n, reco: '' }; })
      .concat([].slice.call($('pruebas').children).map(function (d) { var i = d.querySelectorAll('input'); return { nombre: i[0].value.trim(), reco: i[1].value.trim() }; }).filter(function (p) { return p.nombre; }));
    if (!presentes.length && !confirm('No palomeaste a nadie. ¿Mandar la hora sin nadie presente?')) return;
    var boton = $('enviar');
    boton.disabled = true;
    boton.textContent = 'Enviando…';
    var datos = { fecha: f, hora: estado.hora, presentes: presentes, extras: extras, notas: notas, pruebas: pruebas, notaDia: $('nota-dia').value.trim(), quien: 'Celular', enviado: new Date().toISOString() };
    var texto = JSON.stringify(datos);
    var env = { texto: texto, firma: await window.Buzon.firmarLista(estado.llave, texto), enviado: datos.enviado };
    var r = await mandarUna(env);
    boton.disabled = false;
    boton.textContent = 'Enviar esta hora';
    var hr = estado.hora;
    var cuantos = presentes.length + ' presentes' + (extras.length ? ', ' + extras.length + ' fuera de su horario' : '');
    if (r.ok) {
      marcarPasada(f, hr);
      mensaje('Listo: quedó la hora de las ' + hr + ' (' + cuantos + ').', 'ok');
    } else if (r.red || !r.error) {
      var cola = leerJson(K.cola, []);
      cola.push(env);
      guardado(K.cola, JSON.stringify(cola));
      marcarPasada(f, hr);
      mensaje('Sin señal: la hora de las ' + hr + ' quedó guardada en este celular y se manda sola cuando haya internet.', 'ok');
      mandarPendientes();
    } else {
      mensaje(r.error || 'No se guardó. Intenta otra vez.', 'error');
      return;
    }
    estado.hora = null;
    limpiarHora();
    ['bloque-alumnos', 'bloque-extra', 'barra'].forEach(function (id) { mostrar($(id), false); });
    pintarHoras();
    window.scrollTo(0, 0);
  }

  $('fecha').addEventListener('change', function () {
    estado.hora = null;
    ['bloque-alumnos', 'bloque-extra', 'barra'].forEach(function (id) { mostrar($(id), false); });
    mensaje('');
    pintarHoras();
  });
  $('buscar').addEventListener('input', pintarAlumnos);
  $('mas-prueba').onclick = agregarPrueba;
  $('enviar').onclick = enviar;

  // Si se abre a la hora de una clase, ya queda elegida esa hora.
  cargar().then(function () {
    if (!estado.datos || estado.hora) return;
    var ahora = horaAhora();
    var horas = estado.datos.horas || [];
    var tocaria = horas.filter(function (hr) { return hr <= ahora; }).pop();
    if (tocaria && $('fecha').value === hoy() && diaSemana(hoy()) !== 7) {
      var fin = tocaria.split(':'); var finMin = (+fin[0] + 1) * 60 + (+fin[1]);
      var a = ahora.split(':'); var ahoraMin = (+a[0]) * 60 + (+a[1]);
      if (ahoraMin < finMin + 30) { estado.hora = tocaria; pintarHoras(); pintarAlumnos(); }
    }
  });
})();
