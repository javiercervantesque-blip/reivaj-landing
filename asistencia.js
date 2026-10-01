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
  // `borrador`: la hora abierta a medias, sin mandar (ver guardarBorrador).
  // `quitados`: links (por su seña) que ya se supo aquí que se quitaron; no se
  // borra, para que volver a abrir uno siga diciendo «ya no funciona».
  var K = { llave: 'reivaj_lista_llave', cerrada: 'reivaj_lista_cerrada', pasadas: 'reivaj_lista_pasadas', cola: 'reivaj_lista_cola', instalar: 'reivaj_lista_instalar', vistas: 'reivaj_lista_vistas', horarios: 'reivaj_lista_horarios', borrador: 'reivaj_lista_borrador', quitados: 'reivaj_lista_quitados' };
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
  // A la maestra de varonil se le habla de alumnos. Manda la rama que sube el
  // programa; sin ella (programa viejo o rama vacía), lo que diga el nombre.
  function varonil() {
    var m = (estado.datos && estado.datos.maestra) || {};
    return esMaestra() && (m.rama ? m.rama === 'varonil' : /varonil/i.test(String(m.nombre || '')));
  }
  function alumnasTxt(n) { var v = varonil(); return n + (n === 1 ? (v ? ' alumno' : ' alumna') : (v ? ' alumnos' : ' alumnas')); }
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
      else { estado.avisoCarga = true; mensaje('La lista llegó incompleta. Toca «Actualizar» en un momento.', 'error'); }
      return false;
    }
    if (d && d.quitado) {
      if (!deGuardada) sinSuLista();
      return false;
    }
    if (!d || !Array.isArray(d.alumnos)) {
      if (!deGuardada) { estado.avisoCarga = true; mensaje('La lista llegó incompleta. Toca «Actualizar» en un momento.', 'error'); }
      return false;
    }
    // El aviso de mientras no abría se quita aquí (y no en cargar): al pintar
    // ya puede salir otro (el del borrador, el de quedarse) que no se borra.
    if (estado.esperando || estado.avisoCarga) { estado.esperando = false; estado.avisoCarga = false; mensaje(''); }
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
    // Si su lista vuelve a abrir, ya no cuenta como quitado.
    var q = leerJson(K.quitados, {});
    if (q[estado.canal]) { delete q[estado.canal]; guardarJson(K.quitados, q); }
  }
  // ¿Este link ya había abierto su lista aquí? También cuenta lo que se mandó
  // con él (y, de antes de que se anotara, lo mandado con el link guardado),
  // y que ya se haya sabido aquí que se quitó: linkQuitado borra lo demás.
  function yaAbrio(canal) {
    if (!canal) return false;
    if (leerJson(K.vistas, {})[canal]) return true;
    if (leerJson(K.quitados, {})[canal]) return true;
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
    if (!antes || !Array.isArray(antes.alumnos)) {
      ahora();
      // Lo que quedó sin mandar con el link de antes ya no entra solo: se dice
      // qué horas eran, para pasarlas otra vez (lo anotado sin seña era suyo).
      var vieja = '';
      try { vieja = await window.Buzon.canalDe(otra); } catch (e) { vieja = ''; }
      var aviso = sinMandarTexto(leerJson(K.cola, []).filter(function (env) { return !env.canal || env.canal === vieja; }));
      if (aviso) mensaje(aviso, 'error');
      return;
    }
    var misma = antes.rol === d.rol && (d.rol !== 'maestra' || (antes.maestra && d.maestra && antes.maestra.id === d.maestra.id));
    if (misma) return ahora();
    if (antes.rol !== 'maestra' && d.rol === 'maestra') return soloParaVer(antes);
    if (confirm('Este celular tiene ' + deQuien(antes) + '. ¿Cambiarla por ' + deQuien(d) + '?')) return ahora();
    soloParaVer(antes);
  }
  function soloParaVer(antes) {
    mensaje(antes.rol !== 'maestra'
      ? 'Estás viendo ' + deQuien(estado.datos) + '. Lo que envíes desde aquí cuenta como ' + deQuien(estado.datos) + '. Tu panel sigue guardado en este celular: el ícono de la pantalla de inicio lo abre.'
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
      // La primera vez, sin lista guardada, que se vea que está bajando.
      if (!estado.datos) { estado.avisoCarga = true; mensaje('Abriendo tu lista…'); }
      $('actualizar').disabled = true;
      $('actualizar').textContent = 'Actualizando…';
      var r = await Promise.race([
        window.Buzon.lista(),
        new Promise(function (listo) { setTimeout(function () { listo(null); }, 20000); })
      ]).catch(function () { return null; });
      $('actualizar').disabled = false;
      $('actualizar').textContent = 'Actualizar';
      estado.sinRed = !r;
      if (r && r.ok && r.lista) {
        if (await abrir(r.lista, false)) { guardado(K.cerrada, r.lista); estado.cargada = Date.now(); }
      } else if (!estado.datos) {
        // Se reintenta sola cada minuto; «Actualizar» para no esperar.
        mostrar($('actualizar'), true);
        estado.avisoCarga = true;
        mensaje((r && r.error) || 'Sin internet: tu lista todavía no está en este celular. Se abre sola en cuanto haya señal, o toca «Actualizar».', 'error');
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
    // Las horas que no se alcanzaron a mandar: el programa ya no las aplica.
    var aviso = sinMandarTexto(cola.filter(function (env) { return suyo(env.canal); }));
    cola.filter(function (env) { return suyo(env.canal); }).forEach(function (env) { mandarUna(env); });
    guardarJson(K.cola, cola.filter(function (env) { return !suyo(env.canal); }));
    var pasadas = leerJson(K.pasadas, {});
    Object.keys(pasadas).forEach(function (k) { var o = pasadas[k]; if (suyo(o && o.c)) delete pasadas[k]; });
    guardarJson(K.pasadas, pasadas);
    var vistas = leerJson(K.vistas, {});
    delete vistas[canal];
    guardarJson(K.vistas, vistas);
    // Lo que sí se queda: que este link se quitó (ver yaAbrio).
    var q = leerJson(K.quitados, {});
    q[canal] = hoy();
    guardarJson(K.quitados, q);
    guardarJson(K.horarios, leerJson(K.horarios, []).filter(function (p) { return p && !suyo(p.c); }));
    var borrador = leerJson(K.borrador, null);
    if (borrador && suyo(borrador.c)) guardado(K.borrador, null);
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
    if (aviso) {
      var p = document.createElement('p');
      p.className = 'sin-mandar';
      p.textContent = aviso;
      $('vista-quitado').appendChild(p);
    }
    mostrar($('vista-quitado'), true);
  }
  // «No se alcanzó a mandar: lunes 28 a las 16:00. Pásala otra vez con tu
  // link nuevo.» Solo listas (no cambios de horario), una vez cada hora.
  function sinMandarTexto(envs) {
    var ya = {}, horas = [];
    envs.forEach(function (env) {
      if (!env || env.horario || !/^\d{4}-\d{2}-\d{2}$/.test(String(env.fecha)) || !/^\d{2}:\d{2}$/.test(String(env.hora))) return;
      var k = env.fecha + '|' + env.hora;
      if (ya[k]) return;
      ya[k] = true;
      horas.push(DIAS_L[diaSemana(env.fecha) - 1] + ' ' + (+env.fecha.slice(8, 10)) + ' a las ' + env.hora);
    });
    if (!horas.length) return '';
    return 'No se alcanzó a mandar: ' + (horas.length === 1 ? horas[0] : horas.slice(0, -1).join(', ') + ' y ' + horas[horas.length - 1]) + '. ' +
      (horas.length === 1 ? 'Pásala' : 'Pásalas') + ' otra vez con tu link nuevo.';
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
    $('fecha').max = hoy();
    // El panel solo con la lista del dueño que trae el historial (programa nuevo).
    estado.conPanel = !maestra && Boolean(d.historial) && Boolean(window.PanelDueno);
    if (estado.conPanel) window.PanelDueno.preparar(d, util);
    mostrar($('pestanas'), estado.conPanel);
    document.body.classList.toggle('con-pestanas', estado.conPanel);
    if (!estado.conPanel) estado.panel = 'lista';
    else if (!estado.yaAbrio) estado.panel = 'hoy';
    estado.yaAbrio = true;
    irA(estado.panel, true, true);
    pintarHoras();
    if (estado.hora) pintarAlumnos();
    // Si se abrió sin señal, la hora que toca se escoge cuando por fin llega la lista.
    else if (!estado.yaEligio) elegirHora();
    pintarInstalar();
  }

  // `quieto`: repintar sin cambiar la hora que se ve (al llegar la lista nueva).
  function irA(panel, sinSubir, quieto) {
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
    } else if (estado.datos) {
      // La hora que la app escogió sola se vuelve a escoger (ya pudo cambiar la
      // que toca); la que eligió la persona, o una con marcas, se queda.
      if (!quieto) reelegirHora();
      pintarHoras();
      if (estado.hora && diaSemana($('fecha').value || hoy()) !== 7) pintarAlumnos();
      else BLOQUES.forEach(function (id) { mostrar($(id), false); });
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
      // Si es otra hora y la que estaba abierta tiene cambios sin mandar, se pregunta.
      var otra = f !== $('fecha').value || hr !== estado.hora;
      if (otra && !dejarHora()) { irA('lista'); return; }
      if (!otra) { estado.horaSola = false; irA('lista'); return; }
      $('fecha').value = f;
      estado.hora = hr;
      estado.horaSola = false;
      limpiarHora();
      prellenar(f, hr);
      limpiarAviso();
      irA('lista');
      pintarHoras();
      pintarAlumnos();
    }
  };

  // ─── Horas ──────────────────────────────────────────────────────────
  // Lo mandado se guarda por link (`fecha|hora|seña`): dos links en el mismo
  // celular no se pisan. Lo guardado antes sin la seña en la clave cuenta si
  // es de este link (o no dice de cuál).
  function marcaLocal(f, hr) {
    var p = leerJson(K.pasadas, {});
    var o = p[f + '|' + hr + '|' + estado.canal] || p[f + '|' + hr];
    if (!o) return null;
    if (o === true) return { t: null };
    if (o.c && estado.canal && o.c !== estado.canal) return null;
    return o;
  }
  // 'llego' si el programa ya la tiene (y es de después de lo que se mandó
  // de aquí), 'esperando' si se mandó o está en la cola y aún no aparece.
  // Con el «enviado» de la última lista de este link que aplicó el programa
  // (`enviados`) se comparan dos horas de este mismo celular: así un reloj
  // adelantado no la deja esperando para siempre. Sin él (programa viejo o
  // pasada de antes), la hora en que llegó contra la de aquí.
  function estadoLocal(f, hr) {
    var local = marcaLocal(f, hr);
    var llego = ((estado.datos && estado.datos.pasadas) || {})[f + '|' + hr];
    var suyo = ((estado.datos && estado.datos.enviados) || {})[f + '|' + hr];
    var a = suyo && local && local.e ? Date.parse(suyo) : NaN, b = local && local.e ? Date.parse(local.e) : NaN;
    var nuevo = llego && (isFinite(a) && isFinite(b) ? a >= b
      : (llego === true || !local || !local.t || minutos(llego) === null || minutos(llego) >= minutos(local.t) - 3));
    // Si el programa ya dice qué le llegó de este link y no está la suya, lo
    // que llegó es de otra persona (al dueño, `pasadas` junta las de todos).
    // Lo que sigue en la cola tampoco ha llegado.
    var conEnviados = estado.datos && estado.datos.enviados && typeof estado.datos.enviados === 'object';
    if (local && local.e && conEnviados && !suyo) nuevo = false;
    if (local && enCola(f, hr)) nuevo = false;
    if (nuevo) return 'llego';
    if (local) return 'esperando';
    return '';
  }
  function enCola(f, hr) {
    return leerJson(K.cola, []).some(function (e) { return e.fecha === f && e.hora === hr && (!e.canal || e.canal === estado.canal); });
  }
  function etiquetaHora(f, hr) {
    var loc = estadoLocal(f, hr);
    if (loc === 'esperando' && enCola(f, hr)) return { clase: 'esperando', texto: 'guardada, sin mandar' };
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
  // Lo que dirá la hora cuando llegue (el dueño ve el estado de sus grupos, no «✓ llegó»).
  function cuandoLlegue() {
    return estado.conPanel
      ? 'Cuando llegue al programa, la hora dirá «✓ completa» (o cuántos grupos van, si falta alguno).'
      : 'Cuando llegue al programa verás «✓ llegó».';
  }

  function delDia() {
    var fecha = $('fecha').value || hoy();
    var d = diaSemana(fecha);
    var por = {};
    activas().forEach(function (a) {
      // La que todavía no entraba ese día (`e`, su fecha de ingreso) no tenía clase.
      if (a.e && a.e > fecha) return;
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
  // ─── El día: ‹ Hoy › ────────────────────────────────────────────────
  // Las flechas brincan el domingo, no pasan de hoy (una lista no se manda
  // por adelantado) ni van más atrás de dos semanas (lo de antes ya no se
  // corrige aquí). Si no es hoy, se nota (en color) para no pasarla en otro
  // día sin querer.
  var DIAS_L = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
  var MESES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var ATRAS = 14;
  function fechaLarga(f) { var p = f.split('-'); return DIAS_L[diaSemana(f) - 1] + ' ' + (+p[2]) + ' de ' + MESES_L[+p[1] - 1]; }
  function nombreDia(f) {
    var h = hoy();
    if (f === h) return 'Hoy';
    if (f === sumarDias(h, -1)) return 'Ayer';
    if (f > h) return 'Día que no ha llegado';
    var t = fechaLarga(f);
    return t.charAt(0).toUpperCase() + t.slice(1, t.indexOf(' de '));
  }
  function primerDia() { return sumarDias(hoy(), -ATRAS); }
  // El día de clase de al lado (sin domingo), o null si se sale del rango. A
  // la maestra, solo los días en que tiene alumnas (como en delDia).
  function hayClase(f) {
    var dias = estado.datos && estado.datos.dias && estado.datos.dias.length ? estado.datos.dias : [1, 2, 3, 4, 5, 6];
    if (diaSemana(f) === 7 || dias.indexOf(diaSemana(f)) < 0) return false;
    if (esMaestra()) return activas().some(function (a) { return !(a.e && a.e > f) && (a.s || []).some(function (s) { return +s.split('-')[0] === diaSemana(f); }); });
    return true;
  }
  function diaVecino(f, n) {
    var vueltas = 0;
    do { f = sumarDias(f, n); vueltas++; } while (!hayClase(f) && vueltas < 7);
    return f > hoy() || f < primerDia() ? null : f;
  }
  function pintarDia() {
    var f = $('fecha').value || hoy(), h = hoy();
    estado.fechaVista = f;
    if (f === h) estado.diaAbierto = h;
    $('dia-titulo').textContent = nombreDia(f);
    $('dia-fecha').textContent = fechaLarga(f);
    $('dia').classList.toggle('otro', f !== h);
    mostrar($('volver-hoy'), f !== h);
    $('dia-antes').disabled = !diaVecino(f, -1);
    $('dia-despues').disabled = !diaVecino(f, 1);
    $('fecha').max = h;
    $('fecha').min = primerDia();
  }
  function moverDia(n) {
    var f = diaVecino($('fecha').value || hoy(), n);
    if (f) cambiarFecha(f);
  }
  function cambiarFecha(f) {
    // El campo de fecha ya trae la nueva: la de antes es la que se estaba viendo.
    var antes = estado.fechaVista || $('fecha').value;
    // La misma fecha (p. ej. «Borrar» en el selector): nada cambia.
    if (f === antes) { $('fecha').value = f; return; }
    if (!dejarHora()) { $('fecha').value = antes; return; }
    $('fecha').value = f;
    estado.hora = null;
    limpiarHora();
    BLOQUES.forEach(function (id) { mostrar($(id), false); });
    limpiarAviso();
    pintarHoras();
    elegirHora();
  }

  // ¿Hay algo en la hora abierta que todavía no se manda? Lo que vino de un
  // envío anterior (prellenar) no cuenta: eso ya está en el programa.
  function huellaHora() {
    return JSON.stringify([idsDe(estado.marcados).sort(), idsDe(estado.extras).sort(), estado.noEnc.slice().sort()]);
  }
  function hayCambios() {
    if (!estado.hora) return false;
    if (huellaHora() !== estado.huellaBase) return true;
    if (idsDe(estado.agendadas).length || $('nota-dia').value.trim()) return true;
    if (Object.keys(estado.notas).some(function (k) { return estado.notas[k]; })) return true;
    return [].some.call($('pruebas').querySelectorAll('input'), function (i) { return i.value.trim(); });
  }
  // Antes de dejar una hora con cambios sin mandar, se pregunta.
  function dejarHora() {
    if (estado.enviando) return false;
    if (!hayCambios()) return true;
    if (!confirm('Tienes cambios en la lista de las ' + estado.hora + ' que no has enviado.\n\nAceptar: te cambias y esos cambios se borran.\nCancelar: te quedas para enviarla.')) return false;
    guardado(K.borrador, null);
    return true;
  }
  // El aviso de arriba se quita, menos el de un cambio de horario que no se
  // pudo (ese se queda hasta «Entendido»).
  function limpiarAviso() { if (!$('mensaje').classList.contains('rechazo')) mensaje(''); }

  // Lo que dice cada hora debajo de su número.
  function letreroHora(f, hr) {
    var et = etiquetaHora(f, hr);
    if (et) return et;
    // Una hora sin alumnas ese día (solo le sale al dueño): como en el
    // programa y el panel, no hay clase; se puede abrir, pero no se pide.
    if (!(delDia()[hr] || []).length) return { clase: 'vacia', texto: 'sin clase' };
    var h = hoy(), ahora = horaAhora();
    if (f > h || (f === h && ahora < hr)) return { clase: 'tarde', texto: 'más tarde' };
    if (f === h && minDe(ahora) < minDe(hr) + 60) return { clase: 'ahora', texto: 'en clase ahora' };
    if (f !== h) return { clase: 'falta', texto: 'no la enviaste', vieja: true };
    return { clase: 'falta', texto: 'falta enviarla' };
  }
  function minDe(hm) { var p = String(hm).split(':'); return (+p[0]) * 60 + (+p[1] || 0); }

  function pintarHoras() {
    var por = delDia(), cont = $('horas'), f = $('fecha').value;
    pintarDia();
    cont.innerHTML = '';
    if (diaSemana(f) === 7) {
      cont.innerHTML = '<div class="aviso">Los domingos no hay clase.</div>';
      BLOQUES.forEach(function (id) { mostrar($(id), false); });
      return;
    }
    var horas = horasDelDia();
    if (!horas.length) {
      cont.innerHTML = '<div class="aviso">' + (esMaestra() ? (f === hoy() ? 'Hoy no tienes clase.' : 'Este día no tienes clase.') + ' Si quieres pasar la lista de otro día, usa ‹.' : 'Este día no hay horas con alumnas.') + '</div>';
      BLOQUES.forEach(function (id) { mostrar($(id), false); });
      return;
    }
    var atras = [];
    horas.forEach(function (hr) {
      var b = document.createElement('button');
      var et = letreroHora(f, hr);
      var n = (por[hr] || []).length;
      b.type = 'button';
      b.className = 'hora' + (estado.hora === hr ? ' activa' : '');
      b.setAttribute('aria-pressed', estado.hora === hr ? 'true' : 'false');
      b.innerHTML = '<span></span><small></small><small class="est"></small>';
      b.querySelector('span').textContent = hr;
      b.querySelector('small').textContent = alumnasTxt(n);
      b.querySelector('.est').textContent = et.texto;
      b.querySelector('.est').classList.add(et.clase);
      if (et.vieja) b.querySelector('.est').classList.add('vieja');
      if (et.clase === 'falta' && !et.vieja && hr !== estado.hora) atras.push(hr);
      b.onclick = function () {
        // La misma hora: no se borra nada, solo se baja a la lista.
        if (hr === estado.hora) {
          estado.horaSola = false;
          var l = $('bloque-alumnos');
          if (l.scrollIntoView) l.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
        if (!dejarHora()) return;
        limpiarAviso();
        estado.horaSola = false;
        abrirHora(f, hr);
      };
      cont.appendChild(b);
    });
    if (atras.length && estado.hora) {
      var av = document.createElement('div');
      av.className = 'atras';
      av.textContent = atras.length === 1
        ? 'Te falta enviar la de las ' + atras[0] + '. Tócala para pasarla.'
        : 'Te falta enviar las de las ' + atras.slice(0, -1).join(', ') + ' y ' + atras[atras.length - 1] + '. Toca cada una para pasarla.';
      cont.appendChild(av);
    }
  }
  // Abre una hora. Al elegirla sola, el aviso que haya arriba se queda.
  function abrirHora(f, hr) {
    estado.hora = hr;
    limpiarHora();
    prellenar(f, hr);
    pintarHoras();
    pintarAlumnos();
  }
  // La hora que toca, con el reloj: la que está en clase (si no está ya
  // enviada); en sus primeros 15 minutos, si la anterior falta, esa; si no
  // hay clase en curso, la última de hoy que falta y si no, la que sigue. En
  // otro día, la primera que falta. Una hora enviada (o sin alumnas) no se
  // abre sola.
  function horaQueToca(f) {
    if (!f || diaSemana(f) === 7) return null;
    var horas = horasDelDia();
    if (!horas.length) return null;
    var con = horas.map(function (hr) { return { hr: hr, l: letreroHora(f, hr) }; });
    var falta = con.filter(function (x) { return x.l.clase === 'falta'; });
    var elegida;
    if (f !== hoy()) {
      elegida = falta[0];
    } else {
      var ahora = minDe(horaAhora());
      var enCurso = con.filter(function (x) { return minDe(x.hr) <= ahora && ahora < minDe(x.hr) + 60; })[0];
      var anterior = falta.filter(function (x) { return minDe(x.hr) + 60 <= ahora; }).pop();
      var siguiente = con.filter(function (x) { return x.l.clase === 'tarde'; })[0];
      var pendiente = enCurso && enCurso.l.clase !== 'hecha' && enCurso.l.clase !== 'esperando' && enCurso.l.clase !== 'vacia';
      if (enCurso && anterior && ahora < minDe(enCurso.hr) + 15) elegida = anterior;
      else if (pendiente) elegida = enCurso;
      else elegida = anterior || siguiente;
    }
    return elegida ? elegida.hr : null;
  }
  function elegirHora() {
    if (!estado.datos || estado.hora) return;
    var primera = !estado.yaEligio;
    estado.yaEligio = true;
    var f = $('fecha').value;
    // Al abrir, si quedó un borrador (de otra hora o de otro día de las dos
    // semanas), se abre ese: palomear en la hora que toca lo reemplazaría
    // sin preguntar. Si es de otro día se dice arriba, para no pasar la de
    // hoy encima de esa (el aviso 'ok' no se borra al palomear).
    var b = primera ? leerJson(K.borrador, null) : null;
    if (b && b.c === estado.canal && b.f >= primerDia() && b.f <= hoy() && diaSemana(b.f) !== 7) {
      $('fecha').value = b.f;
      if (horasDelDia().indexOf(b.hr) >= 0) {
        abrirHora(b.f, b.hr);
        if (b.f !== hoy()) mensaje('Quedó sin enviar la lista del ' + fechaLarga(b.f) + ' a las ' + b.hr + ': aquí está como la dejaste. Envíala, o toca «Volver a hoy» si vas a pasar la de hoy.', 'ok espera');
        return;
      }
      $('fecha').value = f;
    }
    var hr = horaQueToca(f);
    if (!hr) return;
    abrirHora(f, hr);
    estado.horaSola = true;
  }
  // ¿Está escribiendo o buscando algo en la lista? (eso no se le mueve) Un
  // renglón de clase de prueba vacío no cuenta: no se manda y se va al
  // cambiar de hora.
  function ocupada() {
    if ($('buscar').value.trim() || [].some.call($('pruebas').querySelectorAll('input'), function (i) { return i.value.trim(); })) return true;
    var a = document.activeElement;
    return Boolean(a && /^(INPUT|TEXTAREA)$/.test(a.tagName || '') && $('vista-lista').contains && $('vista-lista').contains(a));
  }
  // Al volver a la lista (de otra pestaña o de otra app): si la hora la
  // escogió la app y no se ha tocado nada, se cambia a la que toca ahora. Si
  // no hay otra, se queda la que estaba. Mientras se ve la lista, nunca se mueve.
  function reelegirHora() {
    if (!estado.hora && estado.datos && !estado.enviando && $('fecha').value === hoy() && !ocupada()) { elegirHora(); return; }
    if (!estado.horaSola || estado.enviando || hayCambios() || ocupada() || $('fecha').value !== hoy()) return;
    var nueva = horaQueToca(hoy());
    if (!nueva || nueva === estado.hora) return;
    abrirHora(hoy(), nueva);
    estado.horaSola = true;
  }
  // Si la app se quedó abierta de un día para otro: la lista que mostraba
  // «hoy» pasa a hoy (si no hay nada sin mandar).
  function nuevoDia() {
    var h = hoy();
    if (!estado.datos || !estado.diaAbierto || estado.diaAbierto === h || estado.fechaVista !== estado.diaAbierto) return;
    if (estado.enviando || hayCambios() || ocupada()) return;
    estado.horaSola = false;
    cambiarFecha(h);
  }
  function limpiarHora() {
    estado.marcados = {}; estado.extras = {}; estado.notas = {}; estado.agendadas = {}; estado.noEnc = [];
    $('pruebas').innerHTML = ''; $('nota-dia').value = ''; $('buscar').value = '';
    estado.extrasBase = [];
    estado.noEncBase = [];
    estado.huellaBase = huellaHora();
  }
  // Si esta hora ya se mandó desde este celular, se abre como se mandó:
  // así corregirla es tocar solo lo que cambió. `extrasBase`: los fuera de
  // su horario (y nuevos) que se volvieron a poner; si se quitan, al enviar
  // van en `quitados` para que el programa también los quite. `noEncBase`:
  // lo mismo con los anotados por nombre (van en `quitadosNombres`).
  function prellenar(f, hr) {
    var o = marcaLocal(f, hr);
    if (o && o.p) {
      estado.noEnc = (o.n || []).slice();
      var hay = {}, enHora = {};
      activas().forEach(function (a) { hay[a.i] = true; });
      // Solo las que siguen en esta hora: a la que ya la cambiaron de hora no
      // se le ve ni se le puede quitar la ✓, y se volvería a mandar. Así no
      // se manda y en el programa se queda con la marca que tenía.
      deLaHora().forEach(function (a) { enHora[a.i] = true; });
      o.p.forEach(function (id) { if (hay[id] && enHora[id]) estado.marcados[id] = true; });
      (o.x || []).forEach(function (id) { if (hay[id]) estado.extras[id] = true; });
    }
    estado.extrasBase = idsDe(estado.extras);
    estado.noEncBase = estado.noEnc.slice();
    estado.huellaBase = huellaHora();
    // Lo que se quedó a medias antes de que la página se recargara: después
    // de la huella, así cuenta como cambio sin mandar.
    restaurarBorrador(f, hr);
  }

  // ─── Borrador ───────────────────────────────────────────────────────
  // Lo palomeado y escrito en la hora abierta se guarda en el celular hasta
  // que se manda: si la página se recarga a media lista (jalar hacia abajo,
  // o el iPhone que la recarga al volver de otra app), esa hora vuelve como
  // estaba. Uno solo, el de la hora con cambios; abrir otra hora sin tocar
  // nada no lo borra (la que se queda a medias sigue en «falta enviarla»).
  function guardarBorrador() {
    if (!estado.hora || estado.enviando) return;
    var f = $('fecha').value;
    if (!hayCambios()) {
      var b = leerJson(K.borrador, null);
      if (b && b.c === estado.canal && b.f === f && b.hr === estado.hora) guardado(K.borrador, null);
      return;
    }
    var notas = {};
    Object.keys(estado.notas).forEach(function (k) { if (estado.notas[k]) notas[k] = estado.notas[k]; });
    var pr = [].slice.call($('pruebas').children).map(function (d) { var i = d.querySelectorAll('input'); return [i[0].value, i[1].value]; })
      .filter(function (p) { return p[0].trim() || p[1].trim(); });
    guardado(K.borrador, JSON.stringify({ c: estado.canal, f: f, hr: estado.hora, m: idsDe(estado.marcados), x: idsDe(estado.extras), n: notas, ne: estado.noEnc.slice(), ag: idsDe(estado.agendadas), nd: $('nota-dia').value, pr: pr }));
  }
  function restaurarBorrador(f, hr) {
    var b = leerJson(K.borrador, null);
    if (!b || b.c !== estado.canal || b.f !== f || b.hr !== hr) return;
    var hay = {};
    activas().forEach(function (a) { hay[a.i] = true; });
    estado.marcados = {}; estado.extras = {}; estado.noEnc = [];
    (b.m || []).forEach(function (id) { if (hay[id]) estado.marcados[id] = true; });
    (b.x || []).forEach(function (id) { if (hay[id]) estado.extras[id] = true; });
    Object.keys(b.n || {}).forEach(function (id) { if (hay[id] && b.n[id]) estado.notas[id] = String(b.n[id]); });
    (b.ne || []).forEach(function (n) { anotarNoEncontrada(n); });
    (b.ag || []).forEach(function (n) { estado.agendadas[n] = true; });
    $('nota-dia').value = String(b.nd || '');
    (b.pr || []).forEach(function (p) { ponerPrueba(p[0], p[1]); });
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

  // Para el dueño: lo que ya marcó otra persona (su maestra u otra lista).
  // Un «vino» que mandó este mismo celular en esta hora y aquí se le quitó la
  // ✓ no cuenta: es lo que se está corrigiendo (si no, no habría forma de
  // volverlo falta).
  function marcaOtra(a, f) {
    if (!estado.conPanel) return null;
    var mc = window.PanelDueno.marcaDe(f, estado.hora, a.i);
    if (mc && mc.e === 'p' && !estado.marcados[a.i]) {
      var o = marcaLocal(f, estado.hora);
      if (o && o.p && o.p.indexOf(a.i) >= 0) return null;
    }
    return mc;
  }
  function infoDueno(a, f) {
    var mc = marcaOtra(a, f);
    if (!mc || !mc.por || (mc.e !== 'p' && mc.e !== 'f')) return '';
    return 'Ya la marcó ' + mc.por + ': ' + (mc.e === 'p' ? 'vino' : 'faltó');
  }
  // ¿Cuenta como que vino? Lo que palomeó aquí o (al dueño) lo que ya marcó otra persona.
  function yaVino(a, f) {
    if (estado.marcados[a.i]) return true;
    var mc = marcaOtra(a, f);
    return Boolean(mc && mc.e === 'p');
  }
  // Con quién está a esta hora ('_sin' si no tiene maestra).
  function grupoDe(a, f) { return (a.m && a.m[diaSemana(f) + '-' + estado.hora]) || '_sin'; }
  function porGrupo(lista, f) {
    var orden = window.PanelDueno.ordenar(Object.keys(lista.reduce(function (o, a) { o[grupoDe(a, f)] = true; return o; }, {})));
    return lista.slice().sort(function (x, y) { return (orden.indexOf(grupoDe(x, f)) - orden.indexOf(grupoDe(y, f))) || porNombre(x, y); });
  }
  // La lista de ese grupo ya llegó (la mandó su maestra u otra persona).
  function grupoPasado(gid, f) {
    var e = window.PanelDueno.estadoHora(f, estado.hora);
    var g = e && e.grupos && e.grupos[gid];
    return g && g.llego ? (g.por || 'alguien') : '';
  }
  // «● Arely · 3 de 5   [✓ Todos]». Si su lista ya llegó, lo dice y no hay
  // «Todos» (para no tapar sus faltas de un toque); se palomea una por una.
  function cabezaGrupo(gid, suyas, f) {
    var cab = document.createElement('div');
    cab.className = 'grupo-cab';
    var vinieron = suyas.filter(function (a) { return yaVino(a, f); }).length;
    var pasada = grupoPasado(gid, f);
    cab.innerHTML = '<i class="punto"></i><b></b><small></small>';
    cab.querySelector('.punto').style.background = window.PanelDueno.colorGrupo(gid);
    cab.querySelector('b').textContent = window.PanelDueno.nombreGrupo(gid);
    cab.querySelector('small').textContent = vinieron + ' de ' + suyas.length + (pasada ? ' · la pasó ' + pasada : '');
    if (pasada || suyas.length < 2) return cab;
    var todas = suyas.every(function (a) { return estado.marcados[a.i]; });
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'sec chico';
    b.textContent = todas ? 'Desmarcar' : '✓ Todos';
    b.setAttribute('aria-label', (todas ? 'Desmarcar a todos de ' : 'Vinieron todos de ') + window.PanelDueno.nombreGrupo(gid));
    b.onclick = function () { marcarTodos(suyas, !todas); };
    cab.appendChild(b);
    return cab;
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
    div.appendChild(document.createTextNode('Cómo va cada grupo de esta hora:'));
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

  // Un renglón que se palomea con el dedo (o con Espacio/Enter).
  function filaQueSeMarca(fila, marcado, alTocar) {
    var marca = fila.querySelector('.marca');
    marca.setAttribute('role', 'checkbox');
    marca.setAttribute('aria-checked', marcado ? 'true' : 'false');
    marca.setAttribute('tabindex', '0');
    // Mientras se envía, lo que se toque se perdería: no se palomea.
    fila.onclick = function (ev) { if (ev.target.classList.contains('nota-btn') || estado.enviando) return; alTocar(); };
    marca.addEventListener('keydown', function (ev) {
      if (ev.key !== ' ' && ev.key !== 'Enter') return;
      ev.preventDefault();
      if (!estado.enviando) alTocar();
    });
  }
  // Repinta y deja el foco donde estaba (para quien usa teclado o lector).
  function repintarEn(id) {
    var a = document.activeElement;
    var tenia = Boolean(a && a.parentNode && a.parentNode.getAttribute && a.parentNode.getAttribute('data-id') === id);
    pintarAlumnos();
    if (!tenia) return;
    [].some.call($('alumnos').children, function (f) { if (f.getAttribute('data-id') === id) { f.querySelector('.marca').focus(); return true; } return false; });
  }

  // Las de la hora, en orden.
  function deLaHora() { return (delDia()[estado.hora] || []).slice().sort(porNombre); }
  function pintarAlumnos() {
    var f = $('fecha').value;
    var lista = deLaHora();
    var cont = $('alumnos');
    cont.innerHTML = '';
    $('titulo-hora').textContent = estado.hora + ' · toca a quien vino';
    $('ayuda').textContent = estado.conPanel
      ? 'Toca a quien vino. Lo que ya marcó cada maestra se respeta; tus faltas solo cuentan en los grupos que nadie ha pasado.'
      : 'Toca el nombre de cada quien que vino. Quien se quede sin ✓ cuenta como falta.';
    pintarGruposHora(f);
    if (!lista.length) cont.innerHTML = '<div class="aviso">' + (varonil() ? 'A esta hora no hay alumnos con clase este día. Si vino alguien, búscalo abajo.' : 'A esta hora no hay alumnas con clase este día. Si vino alguien, búscala abajo.') + '</div>';
    // Al dueño, por maestra (como su programa): cada grupo con su «todos».
    var grupoActual = null;
    if (estado.conPanel) lista = porGrupo(lista, f);
    lista.forEach(function (a) {
      if (estado.conPanel && grupoDe(a, f) !== grupoActual) {
        grupoActual = grupoDe(a, f);
        cont.appendChild(cabezaGrupo(grupoActual, lista.filter(function (x) { return grupoDe(x, f) === grupoActual; }), f));
      }
      var dias = a.s.filter(function (s) { return s.split('-')[1] === estado.hora; }).map(function (s) { return DIAS[+s.split('-')[0] - 1]; }).join('');
      var info = infoDueno(a, f);
      // Al dueño: la que ya marcó «vino» otra persona sale con su ✓ (punteada), no vacía como una falta.
      var deOtra = !estado.marcados[a.i] && estado.conPanel && yaVino(a, f);
      var fila = document.createElement('div');
      fila.className = 'alumno' + (estado.marcados[a.i] ? ' vino' : deOtra ? ' de-otra' : '');
      fila.setAttribute('data-id', a.i);
      fila.innerHTML = '<div class="marca"><div class="casilla" aria-hidden="true">' + (estado.marcados[a.i] || deOtra ? '✓' : '') + '</div><div class="nombre"><span></span>' + (info ? '<small class="suya"></small>' : '') + '</div><span class="dias"></span></div><button class="nota-btn" type="button" title="Nota" aria-label="Nota">✎</button>';
      fila.querySelector('.nombre span').textContent = a.n;
      fila.querySelector('.nota-btn').setAttribute('aria-label', 'Nota para ' + a.n);
      if (info) fila.querySelector('.nombre small').textContent = info;
      fila.querySelector('.dias').textContent = dias;
      filaQueSeMarca(fila, estado.marcados[a.i], function () { estado.marcados[a.i] = !estado.marcados[a.i]; repintarEn(a.i); });
      fila.querySelector('.nota-btn').onclick = function () { editarNota(a); };
      cont.appendChild(fila);
      ponerNota(cont, a);
    });
    pintarNuevos(cont);
    pintarOtrosAhora();
    pintarFuera();
    pintarNoEncontrados();
    pintarAgendadas();
    pintarCuenta(lista, f);
    guardarBorrador();
    BLOQUES.forEach(function (id) { mostrar($(id), estado.panel === 'lista'); });
    // Los avisos de la hora solo con la lista a la vista; el de un cambio de
    // horario que no se pudo se queda hasta que se lea.
    if (estado.panel !== 'lista' || $('mensaje').classList.contains('rechazo')) return;
    var loc = estadoLocal(f, estado.hora);
    // Al dueño, que una maestra haya pasado su grupo ya se lo dice el aviso de grupos.
    var suya = esMaestra() || !estado.conPanel || marcaLocal(f, estado.hora);
    if (loc === 'esperando') mensaje('Esta hora ya se mandó desde este celular y todavía no aparece en el programa. Si la vuelves a enviar, se corrige con lo nuevo.', '');
    else if (loc === 'llego' && suya) mensaje('Esta hora ya llegó al programa. Si la vuelves a enviar, se corrige con lo nuevo.', '');
    else if (!$('mensaje').classList.contains('ok') && !$('mensaje').classList.contains('error')) mensaje('');
  }
  // Abajo: «7 de 9 vinieron» y el botón con la hora que se manda.
  function pintarCuenta(lista, f) {
    var vinieron = lista.filter(function (a) { return yaVino(a, f); }).length;
    var otros = idsDe(estado.extras).length + estado.noEnc.length;
    var c = $('cuenta');
    c.innerHTML = '';
    var b = document.createElement('b');
    b.textContent = String(vinieron);
    c.appendChild(b);
    c.appendChild(document.createTextNode(' de ' + lista.length + ' vinieron' + (otros ? ' + ' + otros + ' más' : '')));
    $('enviar').textContent = 'Enviar lista de las ' + estado.hora;
    // «Vinieron todos» palomea a todos los de la hora; si ya están todos, los desmarca.
    var todos = lista.length > 0 && lista.every(function (a) { return estado.marcados[a.i]; });
    $('todos').textContent = todos ? 'Desmarcar a todos' : '✓ Vinieron todos';
    // El dueño lo tiene por grupo.
    mostrar($('todos'), lista.length > 1 && !estado.conPanel);
  }
  // Marcar de un toque; quitar las palomitas de varios se pregunta (no hay deshacer).
  function marcarTodos(lista, si) {
    if (!si && !confirm('¿Quitar la ✓ a ' + lista.length + '? Quedarían con falta.')) return;
    lista.forEach(function (a) { estado.marcados[a.i] = si; });
    pintarAlumnos();
  }
  function todosVinieron() {
    var lista = deLaHora();
    marcarTodos(lista, !(lista.length > 0 && lista.every(function (a) { return estado.marcados[a.i]; })));
  }

  // Los nuevos que todavía no tienen grupo salen al final de cada hora, para
  // cualquier maestra de su rama: la que lo palomee es con quien tomó clase.
  function nuevos() { return activas().filter(function (a) { return a.nv; }).sort(porNombre); }
  function pintarNuevos(cont) {
    var lista = nuevos();
    if (!lista.length) return;
    // A la maestra de femenil, de ellas; al dueño (las dos ramas), «nuevos».
    var fem = esMaestra() && !varonil();
    separador(cont, fem ? 'Nuevas · todavía sin grupo' : 'Nuevos · todavía sin grupo');
    lista.forEach(function (a) {
      var fila = document.createElement('div');
      fila.className = 'alumno nuevo' + (estado.extras[a.i] ? ' vino' : '');
      fila.setAttribute('data-id', a.i);
      fila.innerHTML = '<div class="marca"><div class="casilla" aria-hidden="true">' + (estado.extras[a.i] ? '✓' : '') + '</div><div class="nombre"><span></span><small class="suya">' + (fem ? 'Nueva: si vino contigo, paloméala' : 'Nuevo: si vino contigo, palómealo') + '</small></div></div><button class="nota-btn" type="button" title="Nota" aria-label="Nota">✎</button>';
      fila.querySelector('.nombre span').textContent = a.n;
      fila.querySelector('.nota-btn').setAttribute('aria-label', 'Nota para ' + a.n);
      filaQueSeMarca(fila, estado.extras[a.i], function () { estado.extras[a.i] = !estado.extras[a.i]; repintarEn(a.i); });
      fila.querySelector('.nota-btn').onclick = function () { editarNota(a); };
      cont.appendChild(fila);
      ponerNota(cont, a);
    });
  }

  // «¿Vino alguien que no está en la lista?»: al escribir salen los de otro
  // horario, con su horario al lado; «+ Vino» los pasa a «Fuera de su horario».
  // Si escribe a alguien que ya está arriba, se le dice (y se palomea desde ahí).
  function pintarOtrosAhora() {
    var enHora = {};
    deLaHora().forEach(function (a) { enHora[a.i] = true; });
    pintarOtros(enHora, sinAcentos($('buscar').value));
  }
  function pintarOtros(enHora, filtro) {
    var cont = $('otros');
    cont.innerHTML = '';
    if (filtro.length < 2) return;
    // Los que ya se ven en la lista (de la hora, nuevos o ya agregados fuera de su horario).
    var arriba = activas().filter(function (a) { return (enHora[a.i] || a.nv || estado.extras[a.i]) && coincide(a.n, filtro); }).sort(porNombre);
    arriba.slice(0, 4).forEach(function (a) {
      var vino = a.nv || !enHora[a.i] ? estado.extras[a.i] : estado.marcados[a.i];
      var fila = document.createElement('div');
      fila.className = 'otro';
      fila.innerHTML = '<div class="nombre"><span></span><small></small></div><button type="button" class="agregar"></button>';
      fila.querySelector('span').textContent = a.n;
      fila.querySelector('small').textContent = !enHora[a.i] && !a.nv ? (varonil() ? 'Ya lo agregaste (fuera de su horario)' : 'Ya la agregaste (fuera de su horario)') : 'Ya está en la lista de arriba';
      var b = fila.querySelector('.agregar');
      b.textContent = vino ? '✓ Ya tiene' : '✓ Vino';
      b.disabled = Boolean(vino);
      b.onclick = function () {
        if (a.nv) estado.extras[a.i] = true; else estado.marcados[a.i] = true;
        $('buscar').value = '';
        pintarAlumnos();
      };
      cont.appendChild(fila);
    });
    var hallados = activas().filter(function (a) {
      return !enHora[a.i] && !a.nv && !estado.extras[a.i] && coincide(a.n, filtro);
    }).sort(porNombre);
    if (hallados.length) {
      separador(cont, esMaestra() ? (varonil() ? 'Tus alumnos de otro horario' : 'Tus alumnas de otro horario') : 'De otro horario');
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
    // La maestra siempre puede anotar a quien no está, aunque el nombre se parezca al de una suya.
    if (esMaestra()) { ponerAnotar(cont, Boolean(arriba.length || hallados.length)); return; }
    if (!hallados.length && !arriba.length) {
      var nadie = document.createElement('div');
      nadie.className = 'nadie';
      nadie.textContent = 'No hay nadie más con ese nombre. Si vino a probar, anótala abajo en clase de prueba.';
      cont.appendChild(nadie);
    }
  }
  function ponerAnotar(cont, hubo) {
    var escrito = $('buscar').value.trim();
    var nadie = document.createElement('div');
    nadie.className = 'nadie';
    var v = varonil();
    nadie.textContent = hubo
      ? (v ? '¿No es ninguno de estos? Si vino alguien que no está en tu lista, anótalo y el gimnasio lo busca.'
        : '¿No es ninguna de estas? Si vino alguien que no está en tu lista, anótala y el gimnasio la busca.')
      : (v ? 'No está entre tus alumnos. Si vino, anótalo y el gimnasio lo busca. Si vino a probar, anótalo abajo en clase de prueba.'
        : 'No está entre tus alumnas. Si vino, anótala y el gimnasio la busca. Si vino a probar, anótala abajo en clase de prueba.');
    var anotar = document.createElement('button');
    anotar.type = 'button';
    anotar.className = 'agregar';
    anotar.textContent = '+ Anotar a «' + escrito + '»';
    anotar.onclick = function () {
      // Con nombre y apellido el gimnasio la encuentra; con «sofi», no.
      var nombre = escrito;
      if (nombre.split(/\s+/).length < 2) {
        nombre = prompt('Nombre y apellido de quien vino (así el gimnasio ' + (v ? 'lo' : 'la') + ' encuentra):', escrito);
        if (nombre === null || !nombre.trim()) return;
      }
      anotarNoEncontrada(nombre);
      $('buscar').value = '';
      pintarAlumnos();
    };
    nadie.appendChild(document.createElement('br'));
    nadie.appendChild(anotar);
    cont.appendChild(nadie);
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
    if (!estado.noEnc.length) return;
    separador(cont, 'No están en tu lista · ' + estado.noEnc.length);
    estado.noEnc.forEach(function (nombre, i) {
      var fila = document.createElement('div');
      fila.className = 'alumno vino fuera';
      fila.innerHTML = '<div class="casilla">✓</div><div class="nombre"><span></span><small>El gimnasio ' + (varonil() ? 'lo' : 'la') + ' busca por su nombre</small></div><button class="quitar" type="button" title="Quitar" aria-label="Quitar">✕</button>';
      fila.querySelector('span').textContent = nombre;
      fila.querySelector('.quitar').onclick = function () { estado.noEnc.splice(i, 1); pintarAlumnos(); };
      cont.appendChild(fila);
    });
  }

  // Clases de prueba agendadas para ese día (a la maestra, las de su
  // hora): un toque y quedan anotadas.
  function pintarAgendadas() {
    var cont = $('agendadas');
    cont.innerHTML = '';
    var f = $('fecha').value;
    var lista = (estado.datos.pruebas || []).filter(function (p) {
      return p.f === f && (!esMaestra() || !p.h || p.h === estado.hora);
    });
    mostrar($('ayuda-agendadas'), lista.length > 0);
    lista.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = estado.agendadas[p.n] ? 'puesta' : '';
      b.textContent = (estado.agendadas[p.n] ? '✓ ' : '+ ') + p.n + (p.h ? ' · ' + p.h : '');
      b.onclick = function () { estado.agendadas[p.n] = !estado.agendadas[p.n]; pintarAgendadas(); guardarBorrador(); };
      cont.appendChild(b);
    });
  }
  // Un renglón de clase de prueba (vacío, o como estaba en el borrador).
  function ponerPrueba(nombre, reco) {
    var div = document.createElement('div');
    div.className = 'prueba';
    div.innerHTML = '<input type="text" placeholder="Nombre y apellido" aria-label="Nombre y apellido de quien vino a probar" autocomplete="off"><input type="text" placeholder="Horario que le recomiendas (opcional)" aria-label="Horario que le recomiendas" autocomplete="off">';
    var i = div.querySelectorAll('input');
    i[0].value = String(nombre || ''); i[1].value = String(reco || '');
    $('pruebas').appendChild(div);
    return div;
  }
  function agregarPrueba() { ponerPrueba().querySelector('input').focus(); }

  // ─── Mandar ─────────────────────────────────────────────────────────
  // `n`: los anotados por nombre; `e`: el «enviado» que se mandó (ver estadoLocal).
  function marcarPasada(f, hr, lo) {
    var o = leerJson(K.pasadas, {});
    o[f + '|' + hr + '|' + estado.canal] = { t: ahoraLocal(), c: estado.canal, p: lo.p, x: lo.x, n: lo.n, e: lo.e };
    // Solo las de las últimas dos semanas.
    var limite = sumarDias(hoy(), -14);
    Object.keys(o).forEach(function (k) { if (k.slice(0, 10) < limite) delete o[k]; });
    guardado(K.pasadas, JSON.stringify(o));
  }
  // Con señal muy mala no se espera para siempre: a los 25 s se da por no
  // enviada y se guarda en la cola. Si sí llegó, volver a mandarla no duplica
  // nada (el programa reconoce la misma lista).
  async function mandarUna(env) {
    var espera = new Promise(function (listo) { setTimeout(function () { listo({ ok: false, red: true }); }, 25000); });
    var r = await Promise.race([
      window.Buzon.enviar('lista', { texto: env.texto, firma: env.firma, canal: env.canal || undefined }, { t: 999999 }),
      espera
    ]).catch(function () { return { ok: false, red: true }; });
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
    // El aviso de «quedó guardada» (solo el que puso enviar, no el del
    // borrador de otro día) ya no es cierto si salió todo.
    if (salio && estado.avisoCola && !quedan.some(function (e) { return !e.horario; }) && $('mensaje').classList.contains('espera')) {
      estado.avisoCola = false;
      mensaje('Ya salió lo que estaba guardado. ' + cuandoLlegue(), 'ok');
    }
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
    // Lo que contestó el buzón solo al dueño: a la maestra le hablaría de
    // usted y le pediría escribir por WhatsApp (es el texto de los papás).
    var otraVez = ' a intentar sol' + o + s + ' cada minuto';
    txt.textContent = partes.join(' y ') + ' guardad' + o + s + ' en este celular, sin mandarse todavía. ' +
      (conError && estado.conPanel ? 'El gimnasio contestó: «' + conError.error + '». Se vuelve' + (s ? 'n' : '') + otraVez + '.'
        : conError ? 'El buzón del gimnasio no l' + o + s + ' recibió todavía. Se vuelve' + (s ? 'n' : '') + otraVez + '; si sigue igual mañana, avísale al gimnasio.'
          : 'Se manda' + (s ? 'n' : '') + ' sol' + o + s + ' en cuanto haya internet. Si cierras la lista, sale' + (s ? 'n' : '') + ' al volver a abrirla.');
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
    // Los letreros de las horas («en clase ahora», «falta enviarla») siguen al
    // reloj; la hora que se está viendo no se mueve.
    if (estado.datos && !estado.enviando) {
      nuevoDia();
      if (estado.panel === 'lista') pintarHoras();
    }
    // Con la app abierta, la lista se vuelve a bajar cada 10 minutos.
    // Si nunca se pudo bajar (se abrió sin señal), se reintenta cada minuto.
    if (document.visibilityState === 'visible' && (!estado.cargada || Date.now() - estado.cargada > 10 * 60000)) cargar();
  }, 60000);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    // Al volver a la app: el día y la hora que tocan ahora (si no se ha tocado nada).
    if (estado.datos && !estado.enviando) {
      nuevoDia();
      if (estado.panel === 'lista') { reelegirHora(); pintarHoras(); }
    }
    if (!estado.cargada || Date.now() - estado.cargada > 5 * 60000) cargar();
  });

  // Lo que se pregunta antes de mandar: cuántos vinieron y quiénes se quedan
  // sin ✓, con el día dicho (para no mandar en otra fecha sin querer).
  // `pruebas`: las clases de prueba que van (agendadas y anotadas a mano).
  function antesDeEnviar(f, cuantos, pruebas) {
    var cuando = 'las ' + estado.hora + (f === hoy() ? ' de hoy' : ' del ' + fechaLarga(f));
    // Quienes quedan sin ✓. Al dueño no se le cuentan las que ya marcó otra
    // persona (su maestra u otra lista): esas se quedan como están.
    var sin = deLaHora().filter(function (a) { var mc = marcaOtra(a, f); return !estado.marcados[a.i] && !(mc && (mc.e === 'p' || mc.e === 'f')); }).map(function (a) { return a.n; });
    var nombres = sin.slice(0, 10).join(', ') + (sin.length > 10 ? ' y ' + (sin.length - 10) + ' más' : '');
    var avisos = [];
    if (f === hoy() && horaAhora() < estado.hora) avisos.push('Ojo: la clase de las ' + estado.hora + ' todavía no empieza.');
    // Lo escrito en la búsqueda y no agregado, si ninguna que coincide ya cuenta.
    var escrito = $('buscar').value.trim();
    var filtro = sinAcentos(escrito);
    var yaCuenta = activas().some(function (a) { return coincide(a.n, filtro) && (estado.marcados[a.i] || estado.extras[a.i]); }) ||
      estado.noEnc.some(function (n) { return coincide(n, filtro); });
    if (filtro.length >= 2 && !yaCuenta) avisos.push('Escribiste «' + escrito + '» en «¿Vino alguien que no está en la lista?» y no ' + (varonil() ? 'lo' : 'la') + ' agregaste: no va en la lista.');
    // Al dueño, lo mismo que dice el contador de abajo: lo suyo más lo que ya
    // estaba marcado (por las maestras, por él en otro aparato o del A1).
    var deOtras = estado.conPanel ? deLaHora().filter(function (a) { return !estado.marcados[a.i] && yaVino(a, f); }).length : 0;
    var t;
    if (!cuantos) {
      t = 'No palomeaste a nadie.';
      if (estado.conPanel) {
        if (deOtras) t += deOtras === 1 ? ' Ya vino 1 que estaba marcada.' : ' Ya vinieron ' + deOtras + ' que estaban marcadas.';
        t += sin.length ? (sin.length === 1 ? ' Queda con falta 1 que nadie ha marcado: ' : ' Quedan con falta ' + sin.length + ' que nadie ha marcado: ') + nombres + '.' : ' Lo que ya estaba marcado se queda igual.';
      } else {
        t += sin.length ? ' Todos quedan con falta.' : '';
      }
    } else {
      t = estado.conPanel && deOtras
        ? 'Palomeaste ' + cuantos + ' (más ' + deOtras + (deOtras === 1 ? ' que ya estaba marcada).' : ' que ya estaban marcadas).')
        : (cuantos === 1 ? 'Vino 1.' : 'Vinieron ' + cuantos + '.');
      if (sin.length) t += '\n' + (estado.conPanel ? (sin.length === 1 ? 'Queda con falta' : 'Quedan con falta') : (sin.length === 1 ? 'Faltó' : 'Faltaron')) + ' ' + sin.length + ': ' + nombres + '.';
      else t += ' No faltó nadie.';
    }
    // Al dueño que cubre una hora con varias maestras: el grupo de una que no
    // ha mandado y en el que él no palomeó a nadie se dice por su nombre (como
    // en la computadora). Sin maestra ('_sin') no: ese solo lo cubre él.
    if (estado.conPanel && cuantos) {
      var porG = {};
      deLaHora().forEach(function (a) { var gid = grupoDe(a, f); (porG[gid] = porG[gid] || []).push(a); });
      var gids = Object.keys(porG);
      if (gids.length > 1) gids.forEach(function (gid) {
        if (gid === '_sin' || grupoPasado(gid, f) || porG[gid].some(function (a) { return yaVino(a, f); })) return;
        var quedan = porG[gid].filter(function (a) { var mc = marcaOtra(a, f); return !(mc && (mc.e === 'p' || mc.e === 'f')); }).length;
        if (!quedan) return;
        var nom = window.PanelDueno.nombreGrupo(gid);
        avisos.push('Del grupo de ' + nom + ' no palomeaste a nadie y su lista todavía no llega: ' + (quedan === 1 ? 'la 1 queda' : 'las ' + quedan + ' quedan') +
          ' con falta a tu nombre. Si ' + nom + ' manda la suya después, se corrige con la de ella.');
      });
    }
    // Las clases de prueba que van (las agendadas que se tocaron y las
    // anotadas a mano): una puesta por error llega al programa como «Asistió»
    // y ya no se quita desde aquí.
    if (pruebas && pruebas.length) t += '\nClase de prueba: ' + pruebas.map(function (p) { return p.nombre; }).join(', ') + '.';
    // Abierto «para verlo» (este celular guarda otro link): lo que se mande
    // cuenta como la lista de este link. El aviso verde se pudo haber borrado
    // al tocar una hora: se repite aquí.
    var otro = guardado(K.llave);
    var va = esMaestra() && otro && otro !== estado.llave ? 'Va como ' + deQuien(estado.datos) + '.\n\n' : '';
    return va + (avisos.length ? avisos.join('\n') + '\n\n' : '') + t + '\n\n¿Enviar la lista de ' + cuando + '?';
  }
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
    var noEncontrados = estado.noEnc.slice();
    if (estado.enviando || !confirm(antesDeEnviar(f, presentes.length + noEncontrados.length, pruebas))) return;
    // Mientras sale, no se cambia de hora ni de día (lo nuevo se borraría al terminar).
    estado.enviando = true;
    $('vista-lista').classList.add('enviando');
    var boton = $('enviar');
    boton.disabled = true;
    boton.textContent = 'Enviando…';
    var hr = estado.hora;
    // Al dueño: las que ya salen «vino» (las marcó él en otro aparato, o son
    // del A1 de todo el día) también van, o el programa les pondría falta. Solo
    // en los grupos que no pasó su maestra: ahí manda la lista de ella.
    var eH = estado.conPanel ? window.PanelDueno.estadoHora(f, hr) : null;
    var yaMarcadas = estado.conPanel ? deLaHora().filter(function (a) {
      var gid = grupoDe(a, f), g = eH && eH.grupos && eH.grupos[gid];
      var suLista = Boolean(g && g.llego && !g.cubierta && gid !== '_sin');
      return !estado.marcados[a.i] && !suLista && yaVino(a, f);
    }).map(function (a) { return a.i; }) : [];
    // Los fuera de su horario que ya se habían mandado y se quitaron (✕): el
    // programa también se los quita (solo los que puso este link).
    var quitados = (estado.extrasBase || []).filter(function (id) { return !estado.extras[id]; });
    // Lo mismo con los anotados por nombre que se quitaron.
    var quitadosNombres = (estado.noEncBase || []).filter(function (n) { return !estado.noEnc.some(function (x) { return sinAcentos(x) === sinAcentos(n); }); });
    // `vistas`: a quiénes enseñaba esta lista en la hora (sin los nuevos). A
    // quien pusieron en el grupo después de que bajó, el programa no le pone falta.
    var datos = {
      fecha: f, hora: hr, presentes: presentes.concat(yaMarcadas), extras: extras, quitados: quitados, quitadosNombres: quitadosNombres,
      vistas: deLaHora().map(function (a) { return a.i; }),
      notas: notas, notaDia: $('nota-dia').value.trim(), pruebas: pruebas, noEncontrados: noEncontrados, enviado: enviadoAhora(), v: 3
    };
    var texto = JSON.stringify(datos);
    var env, r;
    try {
      env = { texto: texto, firma: await window.Buzon.firmarLista(estado.llave, texto), canal: estado.canal, fecha: f, hora: hr };
      // Antes de salir, la hora ya queda en el celular (como mandada y en la
      // cola): si la página se cierra mientras dice «Enviando…», al volver a
      // abrirla sale sola. El borrador ya no hace falta.
      marcarPasada(f, hr, { p: propios, x: extras, n: noEncontrados, e: datos.enviado });
      encolar(env);
      guardado(K.borrador, null);
      r = await mandarUna(env);
      if (r.ok) sacarDeLaCola(env.firma);
    } catch (e) {
      // No se pudo ni preparar el envío: lo palomeado se queda para intentarlo otra vez.
      mensaje('No se pudo enviar desde este celular. Lo palomeado sigue aquí: toca «Enviar» otra vez.', 'error');
      return;
    } finally {
      estado.enviando = false;
      $('vista-lista').classList.remove('enviando');
      boton.disabled = false;
      boton.textContent = 'Enviar lista de las ' + hr;
    }
    var cuantos = presentes.length + noEncontrados.length;
    // Los nuevos sin grupo también viajan en «extras», pero no vinieron fuera de su horario.
    var nFuera = extras.filter(function (id) { var a = alumnoPorId(id); return a && !a.nv; }).length;
    var resumen = cuantos + (cuantos === 1 ? ' presente' : ' presentes') + (nFuera ? ', ' + nFuera + ' fuera de su horario' : '') +
      (pruebas.length ? ', ' + pruebas.length + ' de clase de prueba' : '');
    if (r.ok) {
      mensaje('Listo: se mandó la hora de las ' + hr + ' (' + resumen + '). ' + cuandoLlegue(), 'ok');
      // El programa la recoge en unos minutos y vuelve a subir la lista.
      setTimeout(cargar, 4 * 60000);
    } else {
      // Sin señal o con error del buzón: ya está en la cola y se manda sola después.
      // El texto del error es el de los papás (de usted, «escríbanos por
      // WhatsApp»): no se enseña aquí; se guarda en la cola (ver unaVuelta).
      // El resto (que sale sola, «Intentar ahora») lo dice la caja de pendientes;
      // cuando salga, unaVuelta cambia este aviso.
      estado.avisoCola = true;
      mensaje(r.red || !r.error
        ? 'Sin señal: la hora de las ' + hr + ' quedó guardada en este celular.'
        : 'La hora de las ' + hr + ' quedó guardada en este celular: el buzón del gimnasio no la recibió todavía. Se vuelve a intentar sola cada minuto.', 'ok espera');
      pintarPendientes(leerJson(K.cola, []));
      mandarPendientes();
    }
    estado.hora = null;
    estado.horaSola = false;
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
    var f = $('fecha').value;
    // Borrada o en el futuro: vuelve a hoy.
    cambiarFecha(!f || f > hoy() ? hoy() : f < primerDia() ? primerDia() : f);
  });
  $('dia-antes').onclick = function () { moverDia(-1); };
  $('dia-despues').onclick = function () { moverDia(1); };
  $('volver-hoy').onclick = function () { cambiarFecha(hoy()); };
  $('buscar').addEventListener('input', pintarOtrosAhora);
  $('todos').onclick = todosVinieron;
  $('mas-prueba').onclick = agregarPrueba;
  $('nota-dia').addEventListener('input', guardarBorrador);
  $('pruebas').addEventListener('input', guardarBorrador);
  $('enviar').onclick = enviar;

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

  // Al abrir, la hora que toca ya queda elegida.
  cargar().then(function () { if (!estado.yaEligio) elegirHora(); });
})();
