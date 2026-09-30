/* =========================================================
   REIVAJ · La lista del celular (solo para quien tiene el link)

   La lista llega cerrada; se abre con la llave que viene en el link que
   da el programa (después del #, que nunca sale de este celular). Cada
   link es de una persona: el del dueño abre su panel y todas las listas;
   el de cada maestra abre solo sus alumnas. Con la misma llave se firma
   cada hora que se manda, para que el programa sepa de quién viene. Si
   no hay señal, o el buzón no la recibe, la hora se guarda en el celular
   y se manda sola en cuanto se pueda.

   En la lista salen solo los que tienen esa hora ese día. A quien vino
   sin que le tocara se le busca por nombre y se agrega: llega al
   programa marcado como «fuera de su horario».
   ========================================================= */
(function () {
  'use strict';
  var DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  var $ = function (id) { return document.getElementById(id); };
  // `vistas`: qué links (por su seña) ya abrieron su lista en este celular.
  // `horarios`: cambios de horario mandados que el programa todavía no aplica.
  var K = { llave: 'reivaj_lista_llave', cerrada: 'reivaj_lista_cerrada', pasadas: 'reivaj_lista_pasadas', cola: 'reivaj_lista_cola', instalar: 'reivaj_lista_instalar', vistas: 'reivaj_lista_vistas', horarios: 'reivaj_lista_horarios' };
  var BLOQUES = ['bloque-alumnos', 'bloque-extra', 'barra'];
  var PANELES = ['hoy', 'semana', 'alumnas', 'maestras'];
  var estado = { llave: '', canal: '', datos: null, conPanel: false, panel: 'lista', hora: null, marcados: {}, extras: {}, notas: {}, agendadas: {}, noEnc: [], cargada: 0, sinRed: false, quitado: false };

  function guardado(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
    } catch (e) { return null; }
    return null;
  }
  function leerJson(k, def) { try { return JSON.parse(guardado(k) || '') || def; } catch (e) { return def; } }
  // Guarda una lista o un mapa; si quedó vacío, lo borra.
  function guardarJson(k, v) {
    var vacio = Array.isArray(v) ? !v.length : !Object.keys(v || {}).length;
    guardado(k, vacio ? null : JSON.stringify(v));
  }
  function mostrar(el, si) { el.classList[si ? 'remove' : 'add']('oculto'); }
  function mensaje(txt, tipo) { var m = $('mensaje'); m.textContent = txt || ''; m.className = 'aviso ' + (tipo || ''); mostrar(m, Boolean(txt)); }

  // ─── Fechas de Guadalajara ──────────────────────────────────────────
  function partesAhora() {
    var p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    var o = {}; p.forEach(function (x) { o[x.type] = x.value; });
    o.hour = ('0' + (+o.hour % 24)).slice(-2);
    return o;
  }
  function hoy() { var o = partesAhora(); return o.year + '-' + o.month + '-' + o.day; }
  function horaAhora() { var o = partesAhora(); return o.hour + ':' + o.minute; }
  function ahoraLocal() { return hoy() + ' ' + horaAhora(); }
  function diaSemana(f) { var p = f.split('-'); var j = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2], 12)).getUTCDay(); return j === 0 ? 7 : j; }
  function sumarDias(f, n) { var p = f.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n, 12)).toISOString().slice(0, 10); }
  // «2026-09-29T16:51:10-06:00»: la hora de aquí con su diferencia, para que
  // el programa sepa cuál de dos envíos de la misma hora es el más nuevo.
  function enviadoAhora() {
    var ahora = new Date();
    var o = partesAhora();
    var local = Date.UTC(+o.year, +o.month - 1, +o.day, +o.hour, +o.minute, +o.second);
    var dif = Math.round((local - Math.floor(ahora.getTime() / 1000) * 1000) / 60000);
    var signo = dif < 0 ? '-' : '+';
    dif = Math.abs(dif);
    return o.year + '-' + o.month + '-' + o.day + 'T' + o.hour + ':' + o.minute + ':' + o.second + signo + ('0' + Math.floor(dif / 60)).slice(-2) + ':' + ('0' + (dif % 60)).slice(-2);
  }
  // Minutos de un texto «AAAA-MM-DD HH:MM», para comparar.
  function minutos(t) {
    var m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(String(t || ''));
    return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) / 60000 : null;
  }
  function horaDe(t) { var m = /[ T](\d{2}:\d{2})/.exec(String(t || '')); return m ? m[1] : ''; }

  // ─── La llave del link ──────────────────────────────────────────────
  function llaveDelLink() {
    var h = location.hash.replace(/^#/, '');
    var m = /(?:^|&)k=([A-Za-z0-9_-]{43})(?:&|$)/.exec(h) || /^([A-Za-z0-9_-]{43})$/.exec(h);
    return m ? m[1] : '';
  }
  // La llave se queda en el link (así el acceso directo de la pantalla de
  // inicio la lleva consigo: en iPhone ese acceso no ve lo guardado en
  // Safari) y también se guarda en este celular: es la que abre la app
  // cuando arranca sin link (en Android). Un link distinto del guardado se
  // abre, pero solo reemplaza al guardado si nada lo impide (ver quedarse):
  // el de una maestra no reemplaza el del dueño y, si es de otra persona,
  // se pregunta antes.
  var delLink = llaveDelLink();
  var delCelular = guardado(K.llave);
  if (delLink && !delCelular) guardado(K.llave, delLink);
  estado.llave = delLink || delCelular;
  estado.decidir = Boolean(delLink && delCelular && delCelular !== delLink);
  // Si con la página abierta se abre otro link (otra llave), se empieza de nuevo.
  window.addEventListener('hashchange', function () {
    var otra = llaveDelLink();
    if (otra && otra !== estado.llave) location.reload();
  });
  // En iPhone el acceso directo guarda el link completo (con su llave) solo si
  // el manifest no fija la dirección de arranque. En Android la app instalada
  // comparte lo guardado con Chrome, así que puede arrancar en /asistencia y
  // leer la llave de aquí; con esa dirección Chrome la deja instalar como app.
  var ios = /iPhone|iPad|iPod/.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var manifest = document.querySelector('link[rel=manifest]');
  if (manifest && !ios) manifest.setAttribute('href', 'asistencia-app.webmanifest');
  if (!estado.llave) { mostrar($('vista-sin-llave'), true); return; }
  if (!window.CONFIG || !window.CONFIG.buzon || !window.Buzon || !window.Buzon.disponible()) {
    mensaje('La página todavía no está conectada con el programa del gimnasio.', 'error');
    return;
  }

  function esMaestra() { return Boolean(estado.datos && estado.datos.rol === 'maestra'); }
  function activas() { return ((estado.datos && estado.datos.alumnos) || []).filter(function (a) { return !a.b; }); }

  // ─── Cargar la lista ────────────────────────────────────────────────
  async function abrir(cerrada, deGuardada) {
    var d;
    try {
      d = await window.Buzon.abrirLista(estado.llave, cerrada);
    } catch (e) {
      // La copia guardada puede ser vieja: solo la que acaba de llegar decide.
      if (deGuardada) return false;
      if (e && e.noAbre) sinSuLista();
      else mensaje('La lista llegó incompleta. Toca «Actualizar» en un momento.', 'error');
      return false;
    }
    if (d && d.quitado) {
      if (!deGuardada) sinSuLista();
      return false;
    }
    if (!d || !Array.isArray(d.alumnos)) {
      if (!deGuardada) mensaje('La lista llegó incompleta. Toca «Actualizar» en un momento.', 'error');
      return false;
    }
    if (estado.esperando) { estado.esperando = false; mensaje(''); }
    estado.datos = d;
    recordar(d);
    resolverHorarios(d);
    pintarTodo();
    avisarRechazos();
    if (!deGuardada && estado.decidir) { estado.decidir = false; await quedarse(d, cerrada); }
    return true;
  }

  // ─── De quién es el link ────────────────────────────────────────────
  function deQuien(d) { return d && d.rol === 'maestra' ? 'la lista de ' + ((d.maestra && d.maestra.nombre) || 'una maestra') : 'la lista del dueño'; }
  // Este link ya abrió su lista en este celular.
  function recordar(d) {
    if (!estado.canal) return;
    var v = leerJson(K.vistas, {});
    v[estado.canal] = { r: d.rol === 'maestra' ? 'maestra' : 'dueno', n: d.rol === 'maestra' ? String((d.maestra && d.maestra.nombre) || '') : '' };
    guardarJson(K.vistas, v);
  }
  // ¿Este link ya había abierto su lista aquí? También cuenta lo que se mandó
  // con él (y, de antes de que se anotara, lo mandado con el link guardado).
  function yaAbrio(canal) {
    if (!canal) return false;
    if (leerJson(K.vistas, {})[canal]) return true;
    var propio = estado.llave === guardado(K.llave);
    var p = leerJson(K.pasadas, {});
    if (Object.keys(p).some(function (k) { var o = p[k]; return o && (o.c ? o.c === canal : propio); })) return true;
    return leerJson(K.cola, []).some(function (e) { return e.canal ? e.canal === canal : propio; });
  }
  // Se abrió un link distinto del que este celular tenía guardado. Se queda
  // este si el guardado ya no abre nada (se quitó) o es de la misma persona.
  // El dueño que abre el link de una maestra (para verlo o probarlo) no pierde
  // el suyo; si es de otra persona, se pregunta.
  async function quedarse(d, texto) {
    var otra = guardado(K.llave);
    if (!otra || otra === estado.llave) { guardado(K.llave, estado.llave); return; }
    var antes = null;
    try { antes = await window.Buzon.abrirLista(otra, texto); } catch (e) { antes = null; }
    var ahora = function () { guardado(K.llave, estado.llave); };
    if (!antes || !Array.isArray(antes.alumnos)) return ahora();
    var misma = antes.rol === d.rol && (d.rol !== 'maestra' || (antes.maestra && d.maestra && antes.maestra.id === d.maestra.id));
    if (misma) return ahora();
    if (antes.rol !== 'maestra' && d.rol === 'maestra') return soloParaVer(antes);
    if (confirm('Este celular tiene ' + deQuien(antes) + '. ¿Cambiarla por ' + deQuien(d) + '?')) return ahora();
    soloParaVer(antes);
  }
  function soloParaVer(antes) {
    mensaje(antes.rol !== 'maestra'
      ? 'Estás viendo ' + deQuien(estado.datos) + '. Tu panel sigue guardado en este celular: el ícono de la pantalla de inicio lo abre.'
      : 'Estás viendo ' + deQuien(estado.datos) + '. Este celular sigue guardando ' + deQuien(antes) + ': es la que abre el ícono de la pantalla de inicio.', 'ok');
  }
  // La lista que bajó no trae la de este link. Si el link ya había abierto su
  // lista en este celular, se quitó o se cambió. Si nunca la abrió, lo más
  // seguro es que el programa todavía no la sube: se espera sin borrar nada
  // y se vuelve a intentar sola.
  function sinSuLista() {
    if (yaAbrio(estado.canal)) { linkQuitado(); return; }
    estado.esperando = true;
    mostrar($('actualizar'), true);
    if (!estado.datos) mensaje('Tu lista todavía no llega a este celular. Se abre sola en cuanto el gimnasio la suba. Si mañana sigue igual, pide que revisen tu link.', '');
  }
  var cargando = false;
  async function cargar() {
    if (cargando || estado.quitado) return;
    cargando = true;
    try {
      if (!estado.canal) estado.canal = await window.Buzon.canalDe(estado.llave);
      var guardada = guardado(K.cerrada);
      if (guardada && !estado.datos) await abrir(guardada, true);
      $('actualizar').disabled = true;
      $('actualizar').textContent = 'Actualizando…';
      var r = await window.Buzon.lista();
      $('actualizar').disabled = false;
      $('actualizar').textContent = 'Actualizar';
      estado.sinRed = !r;
      if (r && r.ok && r.lista) {
        if (await abrir(r.lista, false)) { guardado(K.cerrada, r.lista); estado.cargada = Date.now(); }
      } else if (!estado.datos) {
        mensaje((r && r.error) || 'No hay conexión y este celular todavía no tiene la lista guardada.', 'error');
      }
      if (estado.datos) ponerSubtitulo();
    } finally {
      cargando = false;
    }
    mandarPendientes();
  }
  $('actualizar').addEventListener('click', function () { mensaje(''); cargar(); });

  // El link se quitó o se cambió en el programa: se borra lo de ESTE link del
  // celular (lo de otro link guardado aquí, como el del dueño, se queda). Lo
  // que quedaba sin mandar se intenta una última vez, para que en el
  // programa quede de quién era.
  function linkQuitado() {
    var canal = estado.canal;
    var delCel = guardado(K.llave) === estado.llave;
    // Lo anotado sin seña es de antes: era del link guardado en el celular.
    var suyo = function (c) { return c ? c === canal : delCel; };
    var cola = leerJson(K.cola, []);
    cola.filter(function (env) { return suyo(env.canal); }).forEach(function (env) { mandarUna(env); });
    guardarJson(K.cola, cola.filter(function (env) { return !suyo(env.canal); }));
    var pasadas = leerJson(K.pasadas, {});
    Object.keys(pasadas).forEach(function (k) { var o = pasadas[k]; if (suyo(o && o.c)) delete pasadas[k]; });
    guardarJson(K.pasadas, pasadas);
    var vistas = leerJson(K.vistas, {});
    delete vistas[canal];
    guardarJson(K.vistas, vistas);
    guardarJson(K.horarios, leerJson(K.horarios, []).filter(function (p) { return p && !suyo(p.c); }));
    if (delCel) { guardado(K.llave, null); guardado(K.cerrada, null); }
    estado.quitado = true;
    estado.datos = null;
    estado.hora = null;
    document.body.classList.remove('con-pestanas');
    ['vista-lista', 'pestanas', 'actualizar', 'pendientes', 'instalar'].concat(BLOQUES).forEach(function (id) { mostrar($(id), false); });
    PANELES.forEach(function (p) { mostrar($('panel-' + p), false); });
    $('titulo').textContent = 'Lista de asistencia';
    $('subtitulo').textContent = '';
    mensaje('');
    mostrar($('vista-quitado'), true);
  }

  // ─── Pintar según de quién es el link ───────────────────────────────
  function ponerSubtitulo() {
    var g = String((estado.datos && estado.datos.generada) || '');
    var t = '';
    if (g) {
      var f = g.slice(0, 10), hm = horaDe(g);
      t = 'Actualizado ' + (f === hoy() ? 'a las ' + hm : (f === sumarDias(hoy(), -1) ? 'ayer a las ' + hm : 'el ' + f.slice(8, 10) + '/' + f.slice(5, 7) + ' a las ' + hm));
    }
    if (estado.sinRed) t += (t ? ' · ' : '') + 'sin internet';
    $('subtitulo').textContent = t;
  }
  function pintarTodo() {
    var d = estado.datos;
    var maestra = esMaestra();
    $('titulo').textContent = maestra ? 'Lista de ' + ((d.maestra && d.maestra.nombre) || 'la maestra') : (d.negocio || 'REIVAJ Gimnasia');
    document.title = (maestra ? 'Lista de ' + ((d.maestra && d.maestra.nombre) || '') : 'REIVAJ') + ' · Asistencia';
    ponerSubtitulo();
    mostrar($('actualizar'), true);
    mostrar($('vista-sin-llave'), false);
    if (!$('fecha').value) $('fecha').value = hoy();
    $('buscar').placeholder = maestra ? 'Buscar entre tus alumnas' : 'Buscar, también de otra hora';
    // El panel solo con la lista del dueño que trae el historial (programa nuevo).
    estado.conPanel = !maestra && Boolean(d.historial) && Boolean(window.PanelDueno);
    if (estado.conPanel) window.PanelDueno.preparar(d, util);
    mostrar($('pestanas'), estado.conPanel);
    document.body.classList.toggle('con-pestanas', estado.conPanel);
    if (!estado.conPanel) estado.panel = 'lista';
    else if (!estado.yaAbrio) estado.panel = 'hoy';
    estado.yaAbrio = true;
    irA(estado.panel, true);
    pintarHoras();
    if (estado.hora) pintarAlumnos();
    pintarInstalar();
  }

  function irA(panel, sinSubir) {
    estado.panel = panel;
    PANELES.forEach(function (p) { mostrar($('panel-' + p), p === panel); });
    mostrar($('vista-lista'), panel === 'lista');
    [].forEach.call($('pestanas').querySelectorAll('button'), function (b) {
      b.classList.toggle('activa', b.getAttribute('data-panel') === panel);
      if (b.getAttribute('data-panel') === panel) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    if (panel !== 'lista') {
      mostrar($('barra'), false);
      if (estado.conPanel) window.PanelDueno.pintar(panel);
    } else {
      mostrar($('barra'), Boolean(estado.hora) && diaSemana($('fecha').value || hoy()) !== 7);
    }
    if (!sinSubir) window.scrollTo(0, 0);
  }
  [].forEach.call($('pestanas').querySelectorAll('button'), function (b) {
    b.addEventListener('click', function () { if (estado.datos) irA(b.getAttribute('data-panel')); });
  });

  // Lo que el panel del dueño usa de aquí.
  var util = {
    DIAS: DIAS,
    hoy: hoy,
    horaAhora: horaAhora,
    diaSemana: diaSemana,
    sumarDias: sumarDias,
    sinAcentos: sinAcentos,
    coincide: coincide,
    suHorario: suHorario,
    enviadaLocal: function (f, hr) { return estadoLocal(f, hr) === 'esperando'; },
    // Cambiar horarios desde el celular: solo si el programa ya sabe recibirlos.
    puedeHorario: function () { return Boolean(estado.datos && estado.datos.horarios && !esMaestra()); },
    horarioPendiente: horarioPendiente,
    horarioRechazos: horarioRechazos,
    olvidarRechazo: olvidarRechazo,
    mandarHorario: mandarHorario,
    irA: irA,
    pasarHora: function (f, hr) {
      $('fecha').value = f;
      estado.hora = hr;
      limpiarHora();
      prellenar(f, hr);
      mensaje('');
      irA('lista');
      pintarHoras();
      pintarAlumnos();
    }
  };

  // ─── Horas ──────────────────────────────────────────────────────────
  function marcaLocal(f, hr) {
    var o = leerJson(K.pasadas, {})[f + '|' + hr];
    if (!o) return null;
    if (o === true) return { t: null };
    if (o.c && estado.canal && o.c !== estado.canal) return null;
    return o;
  }
  // 'llego' si el programa ya la tiene (y es de después de lo que se mandó
  // de aquí), 'esperando' si se mandó o está en la cola y aún no aparece.
  function estadoLocal(f, hr) {
    var local = marcaLocal(f, hr);
    var llego = ((estado.datos && estado.datos.pasadas) || {})[f + '|' + hr];
    var nuevo = llego && (llego === true || !local || !local.t || minutos(llego) === null || minutos(llego) >= minutos(local.t) - 3);
    if (nuevo) return 'llego';
    if (local) return 'esperando';
    return '';
  }
  function etiquetaHora(f, hr) {
    var loc = estadoLocal(f, hr);
    if (loc === 'esperando') return { clase: 'esperando', texto: 'enviada, esperando' };
    if (estado.conPanel) {
      var e = window.PanelDueno.estadoHora(f, hr);
      if (e && e.tipo === 'completa') return { clase: 'hecha', texto: '✓ completa' };
      if (e && e.tipo === 'parcial') return { clase: 'parcial', texto: e.hechos + ' de ' + e.total + ' grupos' };
    }
    if (loc === 'llego') {
      var cuando = horaDe(estado.datos.pasadas[f + '|' + hr]);
      return { clase: 'hecha', texto: '✓ llegó al programa' + (cuando ? ' · ' + cuando : '') };
    }
    return null;
  }

  function delDia() {
    var d = diaSemana($('fecha').value || hoy());
    var por = {};
    activas().forEach(function (a) {
      (a.s || []).forEach(function (s) { var p = s.split('-'); if (+p[0] === d) (por[p[1]] = por[p[1]] || []).push(a); });
    });
    return por;
  }
  function horasDelDia() {
    var por = delDia();
    var horas = estado.datos.horas || [];
    // La maestra solo ve las horas en que tiene alumnas ese día.
    if (esMaestra()) horas = horas.filter(function (hr) { return (por[hr] || []).length; });
    return horas;
  }
  function pintarHoras() {
    var por = delDia(), cont = $('horas'), f = $('fecha').value;
    cont.innerHTML = '';
    if (diaSemana(f) === 7) {
      cont.innerHTML = '<div class="aviso">Los domingos no hay clase.</div>';
      BLOQUES.forEach(function (id) { mostrar($(id), false); });
      return;
    }
    var horas = horasDelDia();
    if (!horas.length) {
      cont.innerHTML = '<div class="aviso">' + (esMaestra() ? 'Este día no tienes clase.' : 'Este día no hay horas con alumnas.') + '</div>';
      BLOQUES.forEach(function (id) { mostrar($(id), false); });
      return;
    }
    horas.forEach(function (hr) {
      var b = document.createElement('button');
      var et = etiquetaHora(f, hr);
      var n = (por[hr] || []).length;
      b.type = 'button';
      b.className = 'hora' + (estado.hora === hr ? ' activa' : '');
      b.innerHTML = '<span></span><small></small>' + (et ? '<small class="est"></small>' : '');
      b.querySelector('span').textContent = hr;
      b.querySelector('small').textContent = n + (n === 1 ? ' alumna' : ' alumnas');
      if (et) { b.querySelector('.est').textContent = et.texto; b.querySelector('.est').classList.add(et.clase); }
      b.onclick = function () { estado.hora = hr; limpiarHora(); prellenar(f, hr); mensaje(''); pintarHoras(); pintarAlumnos(); };
      cont.appendChild(b);
    });
  }
  function limpiarHora() {
    estado.marcados = {}; estado.extras = {}; estado.notas = {}; estado.agendadas = {}; estado.noEnc = [];
    $('pruebas').innerHTML = ''; $('nota-dia').value = ''; $('buscar').value = ''; $('noenc-nombre').value = '';
  }
  // Si esta hora ya se mandó desde este celular, se abre como se mandó:
  // así corregirla es tocar solo lo que cambió.
  function prellenar(f, hr) {
    var o = marcaLocal(f, hr);
    if (!o || !o.p) return;
    var hay = {};
    activas().forEach(function (a) { hay[a.i] = true; });
    o.p.forEach(function (id) { if (hay[id]) estado.marcados[id] = true; });
    (o.x || []).forEach(function (id) { if (hay[id]) estado.extras[id] = true; });
  }

  // ─── Alumnas de la hora ─────────────────────────────────────────────
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
    (a.s || []).forEach(function (s) { var p = s.split('-'); (por[p[1]] = por[p[1]] || []).push(+p[0]); });
    var horas = Object.keys(por).sort();
    if (!horas.length) return 'sin horario capturado';
    return horas.map(function (hr) { return por[hr].sort().map(function (d) { return DIAS[d - 1]; }).join('') + ' ' + hr; }).join(' · ');
  }
  function alumnoPorId(id) { return activas().filter(function (a) { return a.i === id; })[0]; }
  function idsDe(o) { return Object.keys(o).filter(function (k) { return o[k]; }); }
  function editarNota(a) {
    var t = prompt('Nota para ' + a.n + ':', estado.notas[a.i] || '');
    if (t !== null) { estado.notas[a.i] = t.trim(); pintarAlumnos(); }
  }
  function ponerNota(cont, a) {
    if (!estado.notas[a.i]) return;
    var n = document.createElement('div'); n.className = 'nota-alumno aviso'; n.textContent = estado.notas[a.i]; cont.appendChild(n);
  }
  function separador(cont, texto) { var h3 = document.createElement('h3'); h3.className = 'sep'; h3.textContent = texto; cont.appendChild(h3); }

  // Para el dueño: con quién está cada alumna a esta hora y lo que ya marcó su maestra.
  function infoDueno(a, f) {
    if (!estado.conPanel) return '';
    var c = diaSemana(f) + '-' + estado.hora;
    var gid = (a.m && a.m[c]) || '_sin';
    var partes = [window.PanelDueno.nombreGrupo(gid)];
    var mc = window.PanelDueno.marcaDe(f, estado.hora, a.i);
    if (mc && mc.por && (mc.e === 'p' || mc.e === 'f')) {
      partes.push((mc.por === partes[0] ? 'ya marcada: ' : 'marcada por ' + mc.por + ': ') + (mc.e === 'p' ? 'vino' : 'faltó'));
    }
    return partes.join(' · ');
  }
  function pintarGruposHora(f) {
    var cont = $('grupos-hora');
    cont.innerHTML = '';
    if (!estado.conPanel) return;
    var e = window.PanelDueno.estadoHora(f, estado.hora);
    // Solo si ya llegó la lista de algún grupo.
    if (!e || e.total < 1 || !e.ids.some(function (gid) { return Boolean(e.grupos[gid].llego); })) return;
    var div = document.createElement('div');
    div.className = 'aviso grupos-hora';
    div.appendChild(document.createTextNode('Lo que palomees suma. Tus faltas solo cuentan en los grupos que nadie ha pasado.'));
    var ul = document.createElement('ul');
    e.ids.forEach(function (gid) {
      var g = e.grupos[gid];
      var li = document.createElement('li');
      li.innerHTML = '<i class="punto"></i><span></span>';
      li.querySelector('i').style.background = window.PanelDueno.colorGrupo(gid);
      // Pasado = llegó su lista (como en el programa); marcas sueltas de otra maestra no cuentan.
      var cuando = !g.llego ? '' : String(g.llego).length > 5 ? ' el ' + g.llego.slice(8, 10) + '/' + g.llego.slice(5, 7) + ' a las ' + horaDe(g.llego) : ' a las ' + g.llego;
      li.querySelector('span').textContent = window.PanelDueno.nombreGrupo(gid) + ': ' + (g.llego ? 'la pasó ' + (g.por || 'alguien') + cuando : 'nadie la ha pasado');
      ul.appendChild(li);
    });
    div.appendChild(ul);
    cont.appendChild(div);
  }

  function pintarAlumnos() {
    var f = $('fecha').value;
    var lista = (delDia()[estado.hora] || []).slice().sort(porNombre);
    var enHora = {};
    lista.forEach(function (a) { enHora[a.i] = true; });
    var filtro = sinAcentos($('buscar').value);
    var cont = $('alumnos');
    cont.innerHTML = '';
    $('titulo-hora').textContent = (esMaestra() ? 'Tus alumnas de las ' : 'Los de las ') + estado.hora + ' · palomea a quien esté';
    pintarGruposHora(f);
    if (!lista.length) cont.innerHTML = '<div class="aviso">A esta hora no hay alumnas con clase este día. Si vino alguien, búscala arriba.</div>';
    else if (filtro && !lista.some(function (a) { return coincide(a.n, filtro); })) cont.innerHTML = '<div class="nadie">Nadie de esta hora se llama así.</div>';
    lista.forEach(function (a) {
      if (!coincide(a.n, filtro)) return;
      var dias = a.s.filter(function (s) { return s.split('-')[1] === estado.hora; }).map(function (s) { return DIAS[+s.split('-')[0] - 1]; }).join('');
      var info = infoDueno(a, f);
      var fila = document.createElement('div');
      fila.className = 'alumno' + (estado.marcados[a.i] ? ' vino' : '');
      fila.innerHTML = '<div class="casilla">' + (estado.marcados[a.i] ? '✓' : '') + '</div><div class="nombre"><span></span>' + (info ? '<small class="suya"></small>' : '') + '</div><span class="dias"></span><button class="nota-btn" type="button" title="Nota" aria-label="Nota">✎</button>';
      fila.querySelector('.nombre span').textContent = a.n;
      if (info) fila.querySelector('.nombre small').textContent = info;
      fila.querySelector('.dias').textContent = dias;
      fila.onclick = function (ev) { if (ev.target.classList.contains('nota-btn')) return; estado.marcados[a.i] = !estado.marcados[a.i]; pintarAlumnos(); };
      fila.querySelector('.nota-btn').onclick = function () { editarNota(a); };
      cont.appendChild(fila);
      ponerNota(cont, a);
    });
    pintarNuevos(cont, filtro);
    pintarOtros(enHora, filtro);
    pintarFuera();
    pintarNoEncontrados();
    pintarAgendadas();
    var n = idsDe(estado.marcados).length + idsDe(estado.extras).length + estado.noEnc.length;
    $('cuenta').textContent = n + ' aquí';
    BLOQUES.forEach(function (id) { mostrar($(id), estado.panel === 'lista'); });
    mostrar($('bloque-noenc'), esMaestra());
    // El aviso de un cambio de horario que no se pudo se queda hasta que se lea.
    if ($('mensaje').classList.contains('rechazo')) return;
    var loc = estadoLocal(f, estado.hora);
    // Al dueño, que una maestra haya pasado su grupo ya se lo dice el aviso de grupos.
    var suya = esMaestra() || !estado.conPanel || marcaLocal(f, estado.hora);
    if (loc === 'esperando') mensaje('Esta hora ya se mandó desde este celular y todavía no aparece en el programa. Si la vuelves a enviar, se corrige con lo nuevo.', '');
    else if (loc === 'llego' && suya) mensaje('Esta hora ya llegó al programa. Si la vuelves a enviar, se corrige con lo nuevo.', '');
    else if (!$('mensaje').classList.contains('ok')) mensaje('');
  }

  // Los nuevos que todavía no tienen grupo salen al final de cada hora, para
  // cualquier maestra de su rama: la que lo palomee es con quien tomó clase.
  function nuevos() { return activas().filter(function (a) { return a.nv; }).sort(porNombre); }
  function pintarNuevos(cont, filtro) {
    var lista = nuevos().filter(function (a) { return coincide(a.n, filtro); });
    if (!lista.length) return;
    separador(cont, 'Nuevos · todavía sin grupo');
    lista.forEach(function (a) {
      var fila = document.createElement('div');
      fila.className = 'alumno nuevo' + (estado.extras[a.i] ? ' vino' : '');
      fila.innerHTML = '<div class="casilla">' + (estado.extras[a.i] ? '✓' : '') + '</div><div class="nombre"><span></span><small class="suya">Nuevo: si vino contigo, palómealo</small></div><button class="nota-btn" type="button" title="Nota" aria-label="Nota">✎</button>';
      fila.querySelector('.nombre span').textContent = a.n;
      fila.onclick = function (ev) { if (ev.target.classList.contains('nota-btn')) return; estado.extras[a.i] = !estado.extras[a.i]; pintarAlumnos(); };
      fila.querySelector('.nota-btn').onclick = function () { editarNota(a); };
      cont.appendChild(fila);
      ponerNota(cont, a);
    });
  }

  // Al buscar, también salen los que no son de esta hora, con su horario
  // al lado; «+ Vino» los pasa a «Fuera de su horario».
  function pintarOtros(enHora, filtro) {
    var cont = $('otros');
    cont.innerHTML = '';
    if (filtro.length < 2) return;
    var hallados = activas().filter(function (a) {
      return !enHora[a.i] && !a.nv && !estado.extras[a.i] && coincide(a.n, filtro);
    }).sort(porNombre);
    separador(cont, esMaestra() ? 'Tus alumnas de otro horario' : 'De otro horario');
    if (!hallados.length) {
      var nadie = document.createElement('div');
      nadie.className = 'nadie';
      if (esMaestra()) {
        var escrito = $('buscar').value.trim();
        nadie.textContent = 'No está entre tus alumnas. Si vino, anótala: el gimnasio la busca. Si vino a probar, anótala abajo en clase de prueba.';
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'agregar';
        b.textContent = '+ Anotar a «' + escrito + '»';
        b.onclick = function () { anotarNoEncontrada(escrito); $('buscar').value = ''; pintarAlumnos(); };
        nadie.appendChild(document.createElement('br'));
        nadie.appendChild(b);
      } else {
        nadie.textContent = 'No hay nadie más con ese nombre. Si vino a probar, anótala abajo en clase de prueba.';
      }
      cont.appendChild(nadie);
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
    var fuera = idsDe(estado.extras).map(alumnoPorId).filter(function (a) { return a && !a.nv; }).sort(porNombre);
    if (!fuera.length) return;
    separador(cont, 'Fuera de su horario · ' + fuera.length);
    fuera.forEach(function (a) {
      var fila = document.createElement('div');
      fila.className = 'alumno vino fuera';
      fila.innerHTML = '<div class="casilla">✓</div><div class="nombre"><span></span><small></small></div><button class="nota-btn" type="button" title="Nota" aria-label="Nota">✎</button><button class="quitar" type="button" title="Quitar" aria-label="Quitar">✕</button>';
      fila.querySelector('span').textContent = a.n;
      fila.querySelector('small').textContent = 'Vino fuera de su horario · el suyo: ' + suHorario(a);
      fila.querySelector('.nota-btn').onclick = function () { editarNota(a); };
      fila.querySelector('.quitar').onclick = function () { delete estado.extras[a.i]; delete estado.notas[a.i]; pintarAlumnos(); };
      cont.appendChild(fila);
      ponerNota(cont, a);
    });
  }

  // Maestras: quien vino y no está en su lista se anota con su nombre; el
  // programa la busca entre todas las alumnas.
  function anotarNoEncontrada(nombre) {
    nombre = String(nombre || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    if (!nombre) return;
    if (nombre === nombre.toLowerCase()) nombre = nombre.replace(/(^|\s)(\S)/g, function (t, esp, letra) { return esp + letra.toUpperCase(); });
    if (estado.noEnc.some(function (x) { return sinAcentos(x) === sinAcentos(nombre); })) return;
    estado.noEnc.push(nombre);
  }
  function pintarNoEncontrados() {
    var cont = $('noenc-lista');
    cont.innerHTML = '';
    estado.noEnc.forEach(function (nombre, i) {
      var fila = document.createElement('div');
      fila.className = 'alumno vino fuera';
      fila.innerHTML = '<div class="casilla">✓</div><div class="nombre"><span></span><small>No está en tu lista: el gimnasio la busca</small></div><button class="quitar" type="button" title="Quitar" aria-label="Quitar">✕</button>';
      fila.querySelector('span').textContent = nombre;
      fila.querySelector('.quitar').onclick = function () { estado.noEnc.splice(i, 1); pintarAlumnos(); };
      cont.appendChild(fila);
    });
  }
  function agregarNoEncontrada() {
    var campo = $('noenc-nombre');
    if (!campo.value.trim()) { campo.focus(); return; }
    anotarNoEncontrada(campo.value);
    campo.value = '';
    pintarAlumnos();
  }

  // Clases de prueba agendadas para ese día (a la maestra, las de su
  // hora): un toque y quedan anotadas.
  function pintarAgendadas() {
    var cont = $('agendadas');
    cont.innerHTML = '';
    var f = $('fecha').value;
    (estado.datos.pruebas || []).filter(function (p) {
      return p.f === f && (!esMaestra() || !p.h || p.h === estado.hora);
    }).forEach(function (p) {
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
    div.innerHTML = '<input type="text" placeholder="¿Cómo se llama?" autocomplete="off"><input type="text" placeholder="¿Qué horario le recomiendas?" autocomplete="off">';
    $('pruebas').appendChild(div);
    div.querySelector('input').focus();
  }

  // ─── Mandar ─────────────────────────────────────────────────────────
  function marcarPasada(f, hr, lo) {
    var o = leerJson(K.pasadas, {});
    o[f + '|' + hr] = { t: ahoraLocal(), c: estado.canal, p: lo.p, x: lo.x };
    // Solo las de las últimas dos semanas.
    var limite = sumarDias(hoy(), -14);
    Object.keys(o).forEach(function (k) { if (k.slice(0, 10) < limite) delete o[k]; });
    guardado(K.pasadas, JSON.stringify(o));
  }
  async function mandarUna(env) {
    var r = await window.Buzon.enviar('lista', { texto: env.texto, firma: env.firma, canal: env.canal || undefined }, { t: 999999 })
      .catch(function () { return { ok: false, red: true }; });
    return r || { ok: false, red: true };
  }
  function encolar(env) {
    var cola = leerJson(K.cola, []);
    if (!cola.some(function (e) { return e.firma === env.firma; })) cola.push(env);
    guardado(K.cola, JSON.stringify(cola));
  }
  function sacarDeLaCola(firma) {
    guardarJson(K.cola, leerJson(K.cola, []).filter(function (e) { return e.firma !== firma; }));
  }
  // La ficha abierta del panel enseña cómo va cada cambio de horario.
  function repintarFicha() {
    if (estado.datos && estado.conPanel && estado.panel === 'alumnas') window.PanelDueno.pintar('alumnas');
  }
  // La cola sale de una vuelta a la vez. Si piden mandar mientras una vuelta
  // sigue en camino, al terminar da otra (con lo que entró): quien espera,
  // espera hasta que salga lo suyo. `intentando`: cambios de horario que
  // están saliendo o salen en esta vuelta; `resultado`: lo que contestó el
  // buzón a cada cambio de horario, para quien lo mandó.
  var vuelta = null, otraVuelta = false, intentando = {}, resultado = {};
  function mandarPendientes() {
    if (estado.quitado) return Promise.resolve();
    if (vuelta) { otraVuelta = true; return vuelta; }
    vuelta = (async function () {
      try {
        do { otraVuelta = false; await unaVuelta(); } while (otraVuelta && !estado.quitado);
      } catch (e) {
        // Lo que no salió sigue en la cola: se intenta en el siguiente minuto.
      } finally {
        vuelta = null;
      }
    })();
    return vuelta;
  }
  async function unaVuelta() {
    var cola = leerJson(K.cola, []);
    if (!cola.length) { pintarPendientes([]); return; }
    var errores = {}, detenido = false, salio = false, horario = false, salioHorario = false;
    cola.forEach(function (e) { if (e.horario) { intentando[e.firma] = true; horario = true; } });
    if (horario) repintarFicha();
    for (var i = 0; i < cola.length && !estado.quitado; i++) {
      var env = cola[i];
      // Los cambios de horario salen en orden, uno detrás de otro: si uno no
      // sale, los que siguen esperan (así no llega uno nuevo antes que uno viejo).
      if (env.horario && detenido) { resultado[env.firma] = { ok: false, detras: true }; delete intentando[env.firma]; continue; }
      var r = await mandarUna(env);
      if (env.horario) { resultado[env.firma] = r; delete intentando[env.firma]; }
      if (r.ok) {
        // Lo que ya salió deja la cola en seguida (si la página se cierra, no se repite).
        sacarDeLaCola(env.firma);
        salio = true;
        if (env.horario) salioHorario = true;
        continue;
      }
      if (env.horario) detenido = true;
      if (r.error && !r.red) errores[env.firma] = String(r.error).replace(/[.\s]+$/, '');
    }
    // Se vuelve a leer: mientras se mandaba pudo entrar otra hora a la cola.
    var quedan = leerJson(K.cola, []);
    quedan.forEach(function (e) { if (errores[e.firma]) e.error = errores[e.firma]; else delete e.error; });
    if (!estado.quitado) guardarJson(K.cola, quedan);
    pintarPendientes(quedan);
    if (estado.datos && salio) pintarHoras();
    if (horario) {
      // Lo que salía «cuando haya señal» ya salió (o sigue esperando): la ficha abierta lo dice.
      repintarFicha();
      // El programa los recoge en unos minutos y vuelve a subir la lista.
      if (salioHorario) setTimeout(cargar, 4 * 60000);
    }
  }
  function pintarPendientes(quedan) {
    var p = $('pendientes');
    p.innerHTML = '';
    if (!quedan.length || estado.quitado) { mostrar(p, false); return; }
    var conError = quedan.filter(function (e) { return e.error; })[0];
    var nC = quedan.filter(function (e) { return e.horario; }).length, nH = quedan.length - nC;
    var partes = [];
    if (nH) partes.push(nH + (nH === 1 ? ' hora' : ' horas'));
    if (nC) partes.push(nC + (nC === 1 ? ' cambio de horario' : ' cambios de horario'));
    // Concuerda con lo que hay: «2 horas guardadas… solas», «1 cambio de horario guardado… solo».
    var o = nC ? 'o' : 'a', s = quedan.length > 1 ? 's' : '';
    var txt = document.createElement('div');
    txt.textContent = partes.join(' y ') + ' guardad' + o + s + ' en este celular, sin mandarse todavía. ' +
      (conError ? 'El gimnasio contestó: «' + conError.error + '». Se vuelve' + (s ? 'n' : '') + ' a intentar sol' + o + s + ' cada minuto.' : 'Se manda' + (s ? 'n' : '') + ' sol' + o + s + ' en cuanto haya internet.');
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'sec';
    b.textContent = 'Intentar ahora';
    b.onclick = function () { b.disabled = true; b.textContent = 'Mandando…'; mandarPendientes(); };
    p.appendChild(txt);
    p.appendChild(b);
    mostrar(p, true);
  }
  window.addEventListener('online', function () { estado.sinRed = false; cargar(); });
  setInterval(function () {
    mandarPendientes();
    // Con la app abierta, la lista se vuelve a bajar cada 10 minutos.
    // Si nunca se pudo bajar (se abrió sin señal), se reintenta cada minuto.
    if (document.visibilityState === 'visible' && (!estado.cargada || Date.now() - estado.cargada > 10 * 60000)) cargar();
  }, 60000);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && (!estado.cargada || Date.now() - estado.cargada > 5 * 60000)) cargar();
  });

  async function enviar() {
    var f = $('fecha').value;
    if (!f || !estado.hora) return;
    var extras = idsDe(estado.extras);
    var propios = idsDe(estado.marcados).filter(function (k) { return !estado.extras[k]; });
    // Los de fuera de su horario también van en «presentes»: así los cuenta
    // igual un programa que todavía no conozca «extras».
    var presentes = propios.concat(extras);
    var notas = Object.keys(estado.notas).filter(function (k) { return estado.notas[k]; }).map(function (k) { return { alumnoId: k, texto: estado.notas[k] }; });
    var pruebas = Object.keys(estado.agendadas).filter(function (n) { return estado.agendadas[n]; }).map(function (n) { return { nombre: n, reco: '' }; })
      .concat([].slice.call($('pruebas').children).map(function (d) { var i = d.querySelectorAll('input'); return { nombre: i[0].value.trim(), reco: i[1].value.trim() }; }).filter(function (p) { return p.nombre; }));
    var pendiente = $('noenc-nombre').value.trim();
    if (pendiente) anotarNoEncontrada(pendiente);
    var noEncontrados = estado.noEnc.slice();
    if (!presentes.length && !noEncontrados.length && !confirm('No palomeaste a nadie. ¿Mandar la hora sin nadie presente?')) return;
    var boton = $('enviar');
    boton.disabled = true;
    boton.textContent = 'Enviando…';
    var hr = estado.hora;
    var datos = { fecha: f, hora: hr, presentes: presentes, extras: extras, notas: notas, notaDia: $('nota-dia').value.trim(), pruebas: pruebas, noEncontrados: noEncontrados, enviado: enviadoAhora(), v: 3 };
    var texto = JSON.stringify(datos);
    var env = { texto: texto, firma: await window.Buzon.firmarLista(estado.llave, texto), canal: estado.canal, fecha: f, hora: hr };
    var r = await mandarUna(env);
    boton.disabled = false;
    boton.textContent = 'Enviar esta hora';
    marcarPasada(f, hr, { p: propios, x: extras });
    var cuantos = presentes.length + noEncontrados.length;
    var resumen = cuantos + (cuantos === 1 ? ' presente' : ' presentes') + (extras.length ? ', ' + extras.length + ' fuera de su horario' : '');
    if (r.ok) {
      mensaje('Listo: se mandó la hora de las ' + hr + ' (' + resumen + '). Cuando llegue al programa verás «✓ llegó».', 'ok');
      // El programa la recoge en unos minutos y vuelve a subir la lista.
      setTimeout(cargar, 4 * 60000);
    } else {
      // Sin señal o con error del buzón: se guarda y se manda sola después.
      encolar(env);
      mensaje(r.red || !r.error
        ? 'Sin señal: la hora de las ' + hr + ' quedó guardada en este celular y se manda sola cuando haya internet.'
        : 'La hora de las ' + hr + ' quedó guardada en este celular: el gimnasio contestó «' + String(r.error).replace(/[.\s]+$/, '') + '». Se vuelve a intentar sola.', 'ok');
      mandarPendientes();
    }
    estado.hora = null;
    limpiarHora();
    BLOQUES.forEach(function (id) { mostrar($(id), false); });
    pintarHoras();
    window.scrollTo(0, 0);
  }

  // ─── Cambios de horario (solo el dueño) ─────────────────────────────
  // Poner a una alumna en el grupo de una maestra o quitarle una hora. Viajan
  // como una lista más, firmados con la llave del link, y salen por la misma
  // cola sin señal. Mientras el programa no los aplica se guardan aquí (con
  // su huella) para verlos como enviados; la lista que sube el programa trae
  // en `horarios` los que ya le llegaron y, si algo no se pudo, por qué. Lo
  // que no se pudo se queda guardado (`no`) hasta que el dueño lo lee.
  function deAqui() {
    var limite = sumarDias(hoy(), -14);
    return leerJson(K.horarios, []).filter(function (p) { return p && p.c === estado.canal && String(p.t || '').slice(0, 10) >= limite; });
  }
  // Los que faltan por aplicar, en el orden en que se mandaron. `estado`:
  // 'cola' si sigue en este celular, 'enviando' si está saliendo, 'enviado'
  // si ya salió y falta que el programa lo aplique.
  function horarioPendiente() {
    var cola = leerJson(K.cola, []);
    return deAqui().filter(function (p) { return !p.no; }).map(function (p) {
      var enCola = cola.some(function (e) { return e.firma === p.f; });
      return { cambios: p.cambios || [], t: p.t, estado: !enCola ? 'enviado' : intentando[p.f] ? 'enviando' : 'cola' };
    });
  }
  // Los que el programa no pudo aplicar, con su motivo.
  function horarioRechazos() {
    return deAqui().filter(function (p) { return p.no; }).map(function (p) { return { h: p.h, no: p.no, cambios: p.cambios || [] }; });
  }
  // «Entendido»: se olvida ese aviso (sin huella, todos los de este link).
  function olvidarRechazo(h) {
    guardarJson(K.horarios, leerJson(K.horarios, []).filter(function (p) { return p && !(p.no && p.c === estado.canal && (!h || p.h === h)); }));
    avisarRechazos();
  }
  // El aviso de arriba: se queda hasta que el dueño toca «Entendido» (aquí o
  // en la ficha de la alumna); si la pantalla se vuelve a pintar, no se borra.
  function avisarRechazos() {
    var m = $('mensaje');
    var r = horarioRechazos();
    if (!r.length) { if (m.classList.contains('rechazo')) mensaje(''); return; }
    var textos = [];
    r.forEach(function (x) { x.no.forEach(function (t) { textos.push(t); }); });
    m.textContent = '';
    m.className = 'aviso error rechazo';
    var t = document.createElement('div');
    t.textContent = 'El programa no pudo cambiar el horario: ' + textos.join(' · ');
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'sec';
    b.textContent = 'Entendido';
    b.onclick = function () { olvidarRechazo(''); repintarFicha(); };
    m.appendChild(t);
    m.appendChild(b);
    mostrar(m, true);
  }
  // Lo que ya le llegó al programa deja de estar pendiente: si todo se aplicó
  // se olvida; si algo no se pudo, se guarda con su motivo. Si su sobre
  // seguía en la cola (salió pero no llegó la respuesta), ya no se manda.
  function resolverHorarios(d) {
    if (!d || !d.horarios) return;
    var todos = leerJson(K.horarios, []);
    if (!todos.length) return;
    var limite = sumarDias(hoy(), -14), llegaron = {};
    var cola = leerJson(K.cola, []);
    var quedan = todos.filter(function (p) {
      if (!p) return false;
      var enCola = cola.some(function (e) { return e.firma === p.f; });
      if (String(p.t || '').slice(0, 10) < limite && !enCola) return false;
      if (p.c !== estado.canal || p.no) return true;
      var r = d.horarios[p.h];
      if (!r) return true;
      llegaron[p.f] = true;
      var no = (r.no || []).map(String).filter(Boolean);
      if (!no.length) return false;
      p.no = no;
      return true;
    });
    guardarJson(K.horarios, quedan);
    if (cola.some(function (e) { return llegaron[e.firma]; })) {
      var resto = cola.filter(function (e) { return !llegaron[e.firma]; });
      guardarJson(K.cola, resto);
      pintarPendientes(resto);
    }
  }
  // Manda los cambios. El cambio y su sobre se guardan juntos antes de mandar
  // nada: si la página se cierra mientras sale, al volver a abrirla sale solo.
  // Sale por la cola, detrás de los que ya esperaban (el orden importa).
  // `alGuardar` avisa en cuanto quedó guardado, sin esperar a la red.
  // Contesta { ok } o por qué se quedó en el celular.
  async function mandarHorario(cambios, alGuardar) {
    var texto = JSON.stringify({ v: 3, accion: 'horario', cambios: cambios, enviado: enviadoAhora() });
    var env = { texto: texto, firma: await window.Buzon.firmarLista(estado.llave, texto), canal: estado.canal, horario: true };
    var h = (await window.Buzon.huella(texto)).slice(0, 16);
    var p = leerJson(K.horarios, []);
    p.push({ h: h, f: env.firma, c: estado.canal, t: ahoraLocal(), cambios: cambios });
    guardarJson(K.horarios, p);
    encolar(env);
    intentando[env.firma] = true;
    if (alGuardar) { try { alGuardar(); } catch (e) { /* la ficha se pinta al terminar */ } }
    await mandarPendientes();
    delete intentando[env.firma];
    var r = resultado[env.firma] || { ok: false, detras: true };
    delete resultado[env.firma];
    return r;
  }

  $('fecha').addEventListener('change', function () {
    estado.hora = null;
    BLOQUES.forEach(function (id) { mostrar($(id), false); });
    mensaje('');
    pintarHoras();
  });
  $('buscar').addEventListener('input', pintarAlumnos);
  $('mas-prueba').onclick = agregarPrueba;
  $('enviar').onclick = enviar;
  $('noenc-agregar').onclick = agregarNoEncontrada;
  $('noenc-nombre').addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); agregarNoEncontrada(); } });

  // ─── En la pantalla de inicio ───────────────────────────────────────
  var pedirInstalar = null;
  window.addEventListener('beforeinstallprompt', function (ev) { ev.preventDefault(); pedirInstalar = ev; pintarInstalar(); });
  function enApp() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  }
  function pintarInstalar() {
    var el = $('instalar');
    if (!estado.datos || enApp() || guardado(K.instalar)) { mostrar(el, false); return; }
    var ua = navigator.userAgent || '';
    var texto;
    if (pedirInstalar) texto = 'Tenla como app en tu pantalla de inicio.';
    else if (ios) texto = 'Para tenerla como app: en Safari toca Compartir (el cuadro con la flecha) y luego «Agregar a inicio».';
    else if (/Android/.test(ua)) texto = 'Para tenerla como app: abre el menú ⋮ y toca «Agregar a la pantalla principal».';
    else { mostrar(el, false); return; }
    el.innerHTML = '<span></span>' + (pedirInstalar ? '<button type="button" class="sec">Agregar</button>' : '') + '<button type="button" class="cerrar" aria-label="Cerrar">✕</button>';
    el.querySelector('span').textContent = texto;
    if (pedirInstalar) el.querySelector('.sec').onclick = function () { pedirInstalar.prompt(); pedirInstalar = null; guardado(K.instalar, '1'); mostrar(el, false); };
    el.querySelector('.cerrar').onclick = function () { guardado(K.instalar, '1'); mostrar(el, false); };
    mostrar(el, true);
  }

  // Para que la app abra aunque no haya señal (solo esta página).
  if ('serviceWorker' in navigator) {
    try { navigator.serviceWorker.register('asistencia-sw.js', { scope: './asistencia' }).catch(function () {}); } catch (e) { /* sin trabajador: igual funciona con señal */ }
  }

  // Si se abre a la hora de una clase, ya queda elegida esa hora.
  cargar().then(function () {
    if (!estado.datos || estado.hora) return;
    var ahora = horaAhora();
    var horas = horasDelDia();
    var tocaria = horas.filter(function (hr) { return hr <= ahora; }).pop();
    if (tocaria && $('fecha').value === hoy() && diaSemana(hoy()) !== 7) {
      var fin = tocaria.split(':'); var finMin = (+fin[0] + 1) * 60 + (+fin[1]);
      var a = ahora.split(':'); var ahoraMin = (+a[0]) * 60 + (+a[1]);
      if (ahoraMin < finMin + 30) { estado.hora = tocaria; prellenar(hoy(), tocaria); pintarHoras(); pintarAlumnos(); }
    }
  });
})();
