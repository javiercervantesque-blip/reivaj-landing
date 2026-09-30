/* =========================================================
   REIVAJ · El panel del dueño en el celular

   Lo que ve el dueño con su link: cómo va cada hora (quién pasó lista
   de cada grupo y a qué hora), la semana, cada alumna y cada maestra.
   Todo sale de la lista que sube el programa (cerrada con la llave del
   link del dueño); aquí no se guarda nada aparte. Solo asistencia: la
   lista no trae teléfonos, salud ni pagos.

   Desde la ficha de una alumna el dueño también la pone en el grupo de
   una maestra (día y hora) o le quita una hora. El cambio lo aplica el
   programa, con las mismas reglas que la ficha de la computadora; aquí
   se ve como «enviado» hasta que llega la lista nueva.
   ========================================================= */
(function (global) {
  'use strict';
  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var MESES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var DIAS_L = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
  var DIAS_C = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
  var MARCAS = ['p', 'f', 'x', 'sin'];
  var TITULOS = { p: 'Vinieron', x: 'Fuera de su horario', f: 'Faltaron', sin: 'Sin marcar todavía' };
  var PRUEBA = { agendada: 'agendada', asistio: 'vino', inscrito: 'se inscribió', perdido: 'no siguió' };
  var GRIS = '#9AA0AC';
  // Si una maestra no tiene color en el programa, uno de estos (en orden).
  var COLORES = ['#C9A227', '#2E7D6B', '#7A4FB0', '#C0562D', '#2F6DB5', '#B03A6F', '#5F7A1F', '#8A6E12'];

  var u = null, d = null, H = null;
  var ix = { maestras: {}, orden: [], porId: {}, porAlumna: [] };
  // `aviso`: lo que se acaba de mandar desde la ficha abierta; `hoja`: la
  // ventana de «Poner en el grupo de…», si está abierta (por id de alumna).
  var vista = { dia: null, semana: null, alumna: null, abiertos: {}, aviso: null, hoja: null };
  var $ = function (id) { return document.getElementById(id); };

  // ─── Piezas ─────────────────────────────────────────────────────────
  function el(tag, clase, texto) {
    var e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto !== undefined && texto !== null) e.textContent = texto;
    return e;
  }
  function boton(clase, texto, alTocar) {
    var b = el('button', clase, texto);
    b.type = 'button';
    b.onclick = alTocar;
    return b;
  }
  function punto(gid) { var i = el('i', 'punto'); i.style.background = colorGrupo(gid); return i; }
  function pct(p, f) { return p + f ? Math.round((100 * p) / (p + f)) : null; }
  function textoPct(n) { return n === null ? '—' : n + '%'; }
  function fechaLarga(f) { var p = f.split('-'); return DIAS_L[u.diaSemana(f) - 1] + ' ' + (+p[2]) + ' de ' + MESES_L[+p[1] - 1]; }
  function fechaCorta(f) { var p = f.split('-'); return DIAS_C[u.diaSemana(f) - 1] + ' ' + (+p[2]) + ' ' + MESES[+p[1] - 1]; }
  function lunesDe(f) { return u.sumarDias(f, 1 - u.diaSemana(f)); }
  function colorSeguro(c, i) { return /^#[0-9a-fA-F]{3,8}$/.test(String(c || '')) ? c : COLORES[i % COLORES.length]; }
  // «16:52», o «28/09 16:52» si llegó otro día.
  function textoLlego(t) {
    t = String(t || '');
    var m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2})/.exec(t);
    return m ? m[3] + '/' + m[2] + ' ' + m[4] : t;
  }
  // ¿Se espera la lista de este grupo? Solo si tiene alumnas programadas a esa
  // hora (con marca o sin ella), como en el programa. Un grupo que solo trae
  // marcas de fuera de su horario (lo manda así un programa anterior) se ve,
  // pero no cuenta para «2 de 3 grupos».
  function esperado(g) { return ((g.p || []).length + (g.f || []).length + (g.sin || []).length) > 0; }
  // Un grupo está pasado si llegó su lista (o una que lo cubre). En una hora
  // sin ninguna lista (lo que viene del A1), si ya no le queda nadie sin
  // marca. Si la hora ya tiene listas, al grupo sin la suya le falta aunque
  // otra maestra haya palomeado a sus alumnas: así lo cuenta el programa.
  // `x` es la hora (sus grupos).
  function conListas(x) {
    return Boolean(x && x.grupos) && Object.keys(x.grupos).some(function (id) { var g = x.grupos[id]; return esperado(g) && Boolean(g.llego); });
  }
  function pasado(g, x) {
    if (g.llego) return true;
    if (conListas(x)) return false;
    return !(g.sin || []).length && ((g.p || []).length + (g.f || []).length) > 0;
  }
  // ¿La lista que llegó es la de su maestra, o la del dueño o la computadora
  // que cubrió la hora? (El programa lo dice con `cubierta`; si no, por el nombre.)
  function listaPropia(g, gid) {
    if (!g.llego || gid === '_sin') return false;
    if (g.cubierta !== undefined && g.cubierta !== null) return !g.cubierta;
    return g.por === nombreGrupo(gid);
  }
  function lineaPasado(g, gid) {
    if (g.llego) return (gid !== '_sin' && !listaPropia(g, gid) ? 'La cubrió ' : 'La pasó ') + (g.por || 'alguien') + ' ' + (String(g.llego).length > 5 ? 'el ' + textoLlego(g.llego) : 'a las ' + g.llego);
    return g.por ? 'Marcada por ' + g.por : 'Con marcas';
  }
  function minDe(hm) { var p = String(hm).split(':'); return (+p[0]) * 60 + (+p[1] || 0); }

  function nombreGrupo(gid) {
    if (gid === '_sin') return 'Sin maestra';
    var m = ix.maestras[gid];
    return m ? m.nombre : String(gid || '').replace(/^en_/, '');
  }
  function colorGrupo(gid) { var m = ix.maestras[gid]; return m ? m.color : GRIS; }
  function ordenar(ids) {
    return ids.slice().sort(function (a, b) {
      var ia = a === '_sin' ? 999 : ix.orden.indexOf(a), ib = b === '_sin' ? 999 : ix.orden.indexOf(b);
      if (ia < 0) ia = 500; if (ib < 0) ib = 500;
      return ia - ib || nombreGrupo(a).localeCompare(nombreGrupo(b), 'es');
    });
  }
  function alumna(k) { return d.alumnos[k] || { n: '(sin nombre)', s: [] }; }
  function activasIdx() { var r = []; d.alumnos.forEach(function (a, k) { if (!a.b) r.push(k); }); return r; }

  // ─── Preparar lo que llegó ──────────────────────────────────────────
  function preparar(datos, util) {
    u = util;
    d = datos;
    H = datos.historial || {};
    H.horas = H.horas || {};
    H.notas = H.notas || [];
    H.pruebas = H.pruebas || [];
    ix.maestras = {};
    ix.orden = [];
    (d.maestras || []).forEach(function (m) {
      if (!m || !m.id) return;
      ix.maestras[m.id] = { id: m.id, nombre: m.nombre || m.id, color: colorSeguro(m.color, ix.orden.length), activa: m.activa !== false };
      ix.orden.push(m.id);
    });
    ix.porId = {};
    d.alumnos.forEach(function (a, k) { ix.porId[a.i] = k; });
    // Por alumna: cada hora en que estuvo programada o vino.
    ix.porAlumna = d.alumnos.map(function () { return []; });
    Object.keys(H.horas).forEach(function (clave) {
      var f = clave.slice(0, 10), h = clave.slice(11);
      var g = H.horas[clave].grupos || {};
      Object.keys(g).forEach(function (gid) {
        MARCAS.forEach(function (e) {
          (g[gid][e] || []).forEach(function (k) { if (ix.porAlumna[k]) ix.porAlumna[k].push({ f: f, h: h, g: gid, e: e }); });
        });
      });
      // Las marcas sueltas de la hora (no les tocaba y no las puso una maestra con grupo ahí).
      var fu = H.horas[clave].fuera || {};
      ['x', 'f'].forEach(function (e) {
        (fu[e] || []).forEach(function (k) { if (ix.porAlumna[k]) ix.porAlumna[k].push({ f: f, h: h, g: null, e: e }); });
      });
    });
    ix.porAlumna.forEach(function (l) { l.sort(function (a, b) { return a.f === b.f ? (a.h < b.h ? -1 : 1) : (a.f < b.f ? -1 : 1); }); });
    var h = u.hoy();
    if (!vista.dia) vista.dia = h;
    if (!vista.semana) vista.semana = lunesDe(h);
    // La ficha abierta se recuerda por el id de la alumna: si la lista nueva
    // llega en otro orden, sigue siendo ella; si ya no está, vuelve a la lista.
    if (vista.alumna !== null && ix.porId[vista.alumna] === undefined) vista.alumna = null;
    // La ventana abierta sigue con los datos nuevos; si la alumna ya no está, se cierra.
    if (vista.hoja) { if (ix.porId[vista.hoja.id] === undefined || d.alumnos[ix.porId[vista.hoja.id]].b) cerrarHoja(); else pintarHoja(); }
    montar();
  }

  var montado = false;
  function montar() {
    if (montado) return;
    montado = true;
    $('buscar-alumna').addEventListener('input', function () { vista.alumna = null; pintarAlumnas(); });
    $('hoja-fondo').addEventListener('click', cerrarHoja);
  }

  // Los grupos de una hora: los del historial; para días que todavía no
  // entran al historial, los que dice el horario (sin marcas). `fuera`: las
  // que vinieron sin que les tocara y no van en ningún grupo.
  function gruposDe(f, h) {
    var e = H.horas[f + '|' + h];
    if (e) {
      var hayGrupos = e.grupos && Object.keys(e.grupos).length;
      var hayFuera = e.fuera && (e.fuera.x || []).length;
      return hayGrupos || hayFuera ? { grupos: e.grupos || {}, lista: e.lista || null, fuera: e.fuera || null } : null;
    }
    if (H.hasta && f < H.hasta) return null;
    if (H.desde && f < H.desde) return null;
    var c = u.diaSemana(f) + '-' + h, g = {};
    d.alumnos.forEach(function (a, k) {
      if (a.b || !a.s || a.s.indexOf(c) < 0) return;
      var gid = (a.m && a.m[c]) || '_sin';
      (g[gid] = g[gid] || { p: [], f: [], x: [], sin: [], por: null, llego: null }).sin.push(k);
    });
    return Object.keys(g).length ? { grupos: g, lista: null } : null;
  }
  function momento(f, h) {
    var hoy = u.hoy(), ahora = minDe(u.horaAhora()), ini = minDe(h);
    if (f > hoy || (f === hoy && ahora < ini)) return 'tarde';
    if (f === hoy && ahora < ini + 60) return 'curso';
    return 'paso';
  }
  function estadoHora(f, h) {
    var x = gruposDe(f, h);
    if (!x) return null;
    // Los grupos que se esperan (`ids`) y los que solo traen marcas sueltas
    // (`sueltos`): estos se ven, pero no cuentan como grupo sin lista.
    var claves = Object.keys(x.grupos);
    var ids = ordenar(claves.filter(function (id) { return esperado(x.grupos[id]); }));
    var sueltos = ordenar(claves.filter(function (id) { return !esperado(x.grupos[id]); }));
    var fuera = (x.fuera && x.fuera.x) || [];
    var hechos = ids.filter(function (id) { return pasado(x.grupos[id], x); });
    // Una hora pasada por el dueño o a mano (cualquier lista que no sea de
    // una maestra) cubre todos los grupos.
    var cubre = Boolean(x.lista && x.lista.origen && x.lista.origen !== 'maestra');
    var cuenta = { p: 0, f: 0, x: 0, sin: 0 };
    ids.forEach(function (id) { MARCAS.forEach(function (e) { cuenta[e] += (x.grupos[id][e] || []).length; }); });
    // Quien vino sin que le tocara suma a «vinieron»; sus faltas no cuentan
    // (tampoco en el programa).
    sueltos.forEach(function (id) { cuenta.x += (x.grupos[id].x || []).length + (x.grupos[id].p || []).length; });
    cuenta.x += fuera.length;
    // Sin grupos y sin nadie que viniera: como en el programa, no hay clase.
    if (!ids.length && !cuenta.x) return null;
    var cuando = momento(f, h);
    // Como en el programa: con listas, «2 de 3 grupos» cuenta los grupos cuya
    // lista llegó; sin ninguna lista pero con marcas (lo del A1, o marcadas a
    // mano una por una), la hora que ya terminó cuenta como pasada.
    // Si llegó la lista de una maestra, la hora ya no se da por pasada solo por
    // tener marcas (eso es para lo del A1): los demás grupos esperan la suya.
    var deMaestra = Boolean(x.lista && x.lista.origen === 'maestra');
    var conLista = cubre || conListas(x) || deMaestra;
    var tipo;
    if (cubre || (conLista && hechos.length === ids.length)) tipo = 'completa';
    else if (u.enviadaLocal(f, h)) tipo = 'esperando';
    else if (conLista) tipo = 'parcial';
    else if (cuenta.p + cuenta.f + cuenta.x > 0 && cuando === 'paso') tipo = 'completa';
    else tipo = cuando === 'tarde' ? 'tarde' : cuando === 'curso' ? 'curso' : 'sin';
    return { tipo: tipo, ids: ids, sueltos: sueltos, fuera: fuera, hechos: cubre ? ids.length : hechos.length, total: ids.length, grupos: x.grupos, lista: x.lista, cuenta: cuenta, cuando: cuando, pct: pct(cuenta.p, cuenta.f) };
  }
  function textoEstado(e) {
    if (e.tipo === 'completa') return '✓ completa';
    if (e.tipo === 'parcial') return e.hechos + ' de ' + e.total + ' grupos';
    if (e.tipo === 'esperando') return 'enviada, esperando';
    if (e.tipo === 'tarde') return 'más tarde';
    if (e.tipo === 'curso') return 'en clase';
    return 'sin pasar';
  }
  function marcaDe(f, h, id) {
    var k = ix.porId[id];
    if (k === undefined) return null;
    var e = H.horas[f + '|' + h];
    var r = (ix.porAlumna[k] || []).filter(function (x) { return x.f === f && x.h === h; })[0];
    if (!r) return null;
    var g = e && e.grupos && e.grupos[r.g];
    return { e: r.e, g: r.g, por: g ? g.por : null };
  }

  // ─── Hoy (o el día que se elija) ────────────────────────────────────
  function limitesDia() { return { min: H.desde || u.sumarDias(u.hoy(), -56), max: u.sumarDias(u.hoy(), 14) }; }
  function moverDia(n) {
    var f = vista.dia, l = limitesDia();
    // Se salta lo que no es día de clase (domingo y, si no hay, sábado).
    var dias = d.dias && d.dias.length ? d.dias : [1, 2, 3, 4, 5];
    var vueltas = 0;
    do { f = u.sumarDias(f, n); vueltas++; } while ((u.diaSemana(f) === 7 || dias.indexOf(u.diaSemana(f)) < 0) && vueltas < 7);
    if (f < l.min || f > l.max) return;
    vista.dia = f;
    pintarHoy();
    window.scrollTo(0, 0);
  }
  function pintarHoy() {
    var cont = $('panel-hoy');
    cont.innerHTML = '';
    var f = vista.dia, hoy = u.hoy(), l = limitesDia();
    var nav = el('div', 'navega');
    var ant = boton('flecha', '‹', function () { moverDia(-1); });
    ant.setAttribute('aria-label', 'Día anterior');
    ant.disabled = u.sumarDias(f, -1) < l.min;
    var sig = boton('flecha', '›', function () { moverDia(1); });
    sig.setAttribute('aria-label', 'Día siguiente');
    sig.disabled = u.sumarDias(f, 1) > l.max;
    var tit = el('div', 'navega-titulo');
    tit.appendChild(el('b', null, f === hoy ? 'Hoy' : (f === u.sumarDias(hoy, -1) ? 'Ayer' : (f === u.sumarDias(hoy, 1) ? 'Mañana' : fechaCorta(f)))));
    tit.appendChild(el('small', null, fechaLarga(f)));
    if (f !== hoy) tit.appendChild(boton('', 'Volver a hoy', function () { vista.dia = hoy; pintarHoy(); }));
    nav.appendChild(ant); nav.appendChild(tit); nav.appendChild(sig);
    cont.appendChild(nav);

    var horas = (d.horas || []).map(function (h) { return { h: h, e: estadoHora(f, h) }; }).filter(function (x) { return x.e; });
    if (!horas.length) {
      cont.appendChild(el('div', 'tarjeta vacio', u.diaSemana(f) === 7 ? 'Los domingos no hay clase.' : 'Este día no hay clase con alumnas.'));
    } else {
      var tot = { p: 0, f: 0, x: 0 }, completas = 0, empezadas = 0;
      horas.forEach(function (x) {
        tot.p += x.e.cuenta.p; tot.f += x.e.cuenta.f; tot.x += x.e.cuenta.x;
        if (x.e.cuando === 'tarde') return;
        empezadas++;
        if (x.e.tipo === 'completa') completas++;
      });
      var res = el('div', 'resumen');
      var primera = empezadas ? [completas + ' de ' + empezadas, 'horas completas'] : [String(horas.length), horas.length === 1 ? 'clase más tarde' : 'clases más tarde'];
      [primera, [String(tot.p + tot.x), 'vinieron'], [textoPct(pct(tot.p, tot.f)), 'asistencia']].forEach(function (r) {
        var c = el('div'); c.appendChild(el('b', null, r[0])); c.appendChild(el('small', null, r[1])); res.appendChild(c);
      });
      cont.appendChild(res);
      horas.forEach(function (x) { cont.appendChild(tarjetaHora(f, x.h, x.e)); });
    }
    pintarPruebasDia(cont, f);
    pintarAvisosDia(cont, f);
  }

  function tarjetaHora(f, h, e) {
    var t = el('article', 'tarjeta hora-t est-' + e.tipo);
    var cab = el('div', 'hora-cab');
    cab.appendChild(el('span', 'hora-num', h));
    cab.appendChild(el('span', 'chip', textoEstado(e)));
    if (e.pct !== null) cab.appendChild(el('span', 'hora-pct', e.pct + '% asistencia'));
    t.appendChild(cab);
    e.ids.forEach(function (gid) {
      var g = e.grupos[gid];
      var quien;
      if (pasado(g, e)) quien = el('span', 'g-quien', lineaPasado(g, gid));
      else if (e.tipo === 'completa' && e.lista && e.lista.origen !== 'maestra') quien = el('span', 'g-quien', 'Cubierta con la lista de ' + (e.lista.quien || 'otra persona'));
      else if (e.tipo === 'completa') quien = el('span', 'g-quien', g.por ? 'Marcada por ' + g.por : 'Sin marcas');
      else if (g.por) quien = el('span', 'g-quien falta', 'Sin su lista · marcas de ' + g.por);
      else if (e.cuando === 'tarde') quien = el('span', 'g-quien', 'Más tarde');
      else if (e.cuando === 'curso') quien = el('span', 'g-quien', 'En clase');
      else quien = el('span', 'g-quien falta', 'Nadie ha pasado lista');
      filaGrupo(t, f + '|' + h + '|' + gid, gid, nombreGrupo(gid), g, quien);
    });
    // Marcas sueltas: no son un grupo que deba pasar lista.
    e.sueltos.forEach(function (gid) {
      var g = e.grupos[gid];
      filaGrupo(t, f + '|' + h + '|' + gid, gid, nombreGrupo(gid), g, el('span', 'g-quien', 'Vinieron fuera de su horario' + (g.por ? ' · las marcó ' + g.por : '')));
    });
    if (e.fuera.length) filaGrupo(t, f + '|' + h + '|_fuera', '_fuera', 'Fuera de su horario', { x: e.fuera }, el('span', 'g-quien', 'No les tocaba esta hora'));
    if (e.cuando !== 'tarde' && e.tipo !== 'completa') {
      t.appendChild(boton('sec', e.tipo === 'parcial' ? 'Pasar lo que falta de esta hora' : 'Pasar lista de esta hora', function () { u.pasarHora(f, h); }));
    }
    return t;
  }
  // Un renglón de grupo que se abre para ver los nombres.
  function filaGrupo(t, clave, gid, nombre, g, quien) {
    var b = el('button', 'grupo' + (vista.abiertos[clave] ? ' abierto' : ''));
    b.type = 'button';
    b.setAttribute('aria-expanded', vista.abiertos[clave] ? 'true' : 'false');
    b.appendChild(punto(gid));
    var txt = el('span', 'g-txt');
    txt.appendChild(el('span', 'g-nombre', nombre));
    txt.appendChild(quien);
    b.appendChild(txt);
    var n = MARCAS.reduce(function (s, m) { return s + (g[m] || []).length; }, 0);
    var cuenta = el('span', 'g-cuenta');
    if ((g.p || []).length + (g.f || []).length + (g.x || []).length) {
      cuenta.appendChild(el('span', 'v', ((g.p || []).length + (g.x || []).length) + ' ✓'));
      cuenta.appendChild(document.createTextNode(' '));
      cuenta.appendChild(el('span', 'f', (g.f || []).length + ' ✗'));
    } else {
      cuenta.textContent = n + (n === 1 ? ' alumna' : ' alumnas');
    }
    b.appendChild(cuenta);
    b.appendChild(el('span', 'flechita', '›'));
    t.appendChild(b);
    var det = detalleGrupo(g);
    if (!vista.abiertos[clave]) det.classList.add('oculto');
    t.appendChild(det);
    b.onclick = function () {
      vista.abiertos[clave] = !vista.abiertos[clave];
      b.classList.toggle('abierto', vista.abiertos[clave]);
      b.setAttribute('aria-expanded', vista.abiertos[clave] ? 'true' : 'false');
      det.classList.toggle('oculto', !vista.abiertos[clave]);
    };
  }
  function detalleGrupo(g) {
    var det = el('div', 'detalle');
    var hay = false;
    ['p', 'x', 'f', 'sin'].forEach(function (m) {
      var l = (g[m] || []).slice().sort(function (a, b) { return alumna(a).n.localeCompare(alumna(b).n, 'es'); });
      if (!l.length) return;
      hay = true;
      det.appendChild(el('h4', m === 'p' ? 'v' : m, TITULOS[m] + ' · ' + l.length));
      var ul = el('ul', 'nombres');
      l.forEach(function (k) {
        var li = el('li', 'boton-nombre');
        li.appendChild(boton('', alumna(k).n, function () { abrirAlumna(k); }));
        ul.appendChild(li);
      });
      det.appendChild(ul);
    });
    if (!hay) det.appendChild(el('div', 'vacio', 'Nadie programado.'));
    return det;
  }

  function pintarPruebasDia(cont, f) {
    var norm = function (t) { return u.sinAcentos(t); };
    var vistas = H.pruebas.filter(function (p) { return p.f === f; });
    var ya = {};
    vistas.forEach(function (p) { ya[norm(p.n)] = true; });
    var agendadas = (d.pruebas || []).filter(function (p) { return p.f === f && !ya[norm(p.n)]; });
    if (!vistas.length && !agendadas.length) return;
    var t = el('section', 'tarjeta');
    t.appendChild(el('h2', null, 'Clases de prueba'));
    var ul = el('ul', 'lista-simple');
    vistas.forEach(function (p) {
      var li = el('li', null, p.n);
      li.appendChild(el('small', null, [p.h, p.q ? 'la anotó ' + p.q : '', PRUEBA[p.e] || p.e || ''].filter(Boolean).join(' · ')));
      ul.appendChild(li);
    });
    agendadas.forEach(function (p) {
      var li = el('li', null, p.n);
      li.appendChild(el('small', null, [p.h, 'agendada, nadie la ha anotado'].filter(Boolean).join(' · ')));
      ul.appendChild(li);
    });
    t.appendChild(ul);
    cont.appendChild(t);
  }
  function pintarAvisosDia(cont, f) {
    var notas = H.notas.filter(function (n) { return n.f === f; });
    if (!notas.length) return;
    var t = el('section', 'tarjeta');
    t.appendChild(el('h2', null, 'Avisos del día'));
    var ul = el('ul', 'lista-simple');
    notas.forEach(function (n) {
      var quien = (n.a !== null && n.a !== undefined && d.alumnos[n.a]) ? alumna(n.a).n + ': ' : '';
      var li = el('li', null, quien + (n.t || ''));
      if (n.q) li.appendChild(el('small', null, 'Lo dejó ' + n.q));
      ul.appendChild(li);
    });
    t.appendChild(ul);
    cont.appendChild(t);
  }

  // ─── Semana ─────────────────────────────────────────────────────────
  function limitesSemana() { return { min: lunesDe(H.desde || u.sumarDias(u.hoy(), -56)), max: lunesDe(u.hoy()) }; }
  function diasDeSemana() {
    var dias = (d.dias && d.dias.length ? d.dias : [1, 2, 3, 4, 5]).filter(function (x) { return x >= 1 && x <= 6; });
    return dias.map(function (x) { return u.sumarDias(vista.semana, x - 1); });
  }
  function navSemana(cont, alMover) {
    var l = limitesSemana();
    var fechas = diasDeSemana();
    var nav = el('div', 'navega');
    var ant = boton('flecha', '‹', function () { vista.semana = u.sumarDias(vista.semana, -7); alMover(); });
    ant.setAttribute('aria-label', 'Semana anterior');
    ant.disabled = u.sumarDias(vista.semana, -7) < l.min;
    var sig = boton('flecha', '›', function () { vista.semana = u.sumarDias(vista.semana, 7); alMover(); });
    sig.setAttribute('aria-label', 'Semana siguiente');
    sig.disabled = u.sumarDias(vista.semana, 7) > l.max;
    var tit = el('div', 'navega-titulo');
    var a = fechas[0].split('-'), b = fechas[fechas.length - 1].split('-');
    tit.appendChild(el('b', null, vista.semana === l.max ? 'Esta semana' : (vista.semana === u.sumarDias(l.max, -7) ? 'La semana pasada' : 'Semana del ' + (+a[2]))));
    tit.appendChild(el('small', null, 'Del ' + (+a[2]) + (a[1] !== b[1] ? ' de ' + MESES_L[+a[1] - 1] : '') + ' al ' + (+b[2]) + ' de ' + MESES_L[+b[1] - 1]));
    if (vista.semana !== l.max) tit.appendChild(boton('', 'Ir a esta semana', function () { vista.semana = l.max; alMover(); }));
    nav.appendChild(ant); nav.appendChild(tit); nav.appendChild(sig);
    cont.appendChild(nav);
  }
  function pintarSemana() {
    var cont = $('panel-semana');
    cont.innerHTML = '';
    navSemana(cont, pintarSemana);
    var fechas = diasDeSemana(), hoy = u.hoy();
    var horas = (d.horas || []).filter(function (h) { return fechas.some(function (f) { return estadoHora(f, h); }); });
    var t = el('section', 'tarjeta');
    if (!horas.length) {
      t.appendChild(el('div', 'vacio', 'Esta semana no hay clases registradas.'));
      cont.appendChild(t);
      return;
    }
    var tabla = el('table', 'tablero');
    var cab = el('tr');
    cab.appendChild(el('th', 'hr', ''));
    fechas.forEach(function (f) {
      var th = el('th', f === hoy ? 'hoy' : '', u.DIAS[u.diaSemana(f) - 1]);
      th.appendChild(el('small', null, String(+f.slice(8, 10))));
      cab.appendChild(th);
    });
    var thead = el('thead'); thead.appendChild(cab); tabla.appendChild(thead);
    var tbody = el('tbody');
    var tot = { p: 0, f: 0 }, completas = 0, conClase = 0, faltas = {};
    horas.forEach(function (h) {
      var tr = el('tr');
      tr.appendChild(el('th', 'hr', h));
      fechas.forEach(function (f) {
        var td = el('td');
        var e = estadoHora(f, h);
        if (!e) { td.appendChild(el('div', 'celda nada', '')); tr.appendChild(td); return; }
        if (e.cuando === 'paso') { conClase++; if (e.tipo === 'completa') completas++; }
        tot.p += e.cuenta.p; tot.f += e.cuenta.f;
        e.ids.forEach(function (gid) { (e.grupos[gid].f || []).forEach(function (k) { faltas[k] = (faltas[k] || 0) + 1; }); });
        var simbolo = { completa: '✓', parcial: e.hechos + '/' + e.total, esperando: '…', tarde: '', curso: '•', sin: '✗' }[e.tipo];
        var c = boton('celda est-' + e.tipo, simbolo, function () { vista.dia = f; u.irA('hoy'); });
        c.setAttribute('aria-label', fechaLarga(f) + ', ' + h + ': ' + textoEstado(e) + (e.pct !== null ? ', ' + e.pct + '% asistencia' : ''));
        if (e.pct !== null && e.tipo !== 'tarde') c.appendChild(el('small', null, e.pct + '%'));
        td.appendChild(c);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    tabla.appendChild(tbody);
    t.appendChild(tabla);
    var ley = el('div', 'leyenda');
    [['est-completa', 'completa'], ['est-parcial', 'faltan grupos'], ['est-sin', 'sin pasar']].forEach(function (x) {
      var s = el('span'); s.appendChild(el('i', x[0])); s.appendChild(document.createTextNode(x[1])); ley.appendChild(s);
    });
    t.appendChild(ley);
    cont.appendChild(t);

    var res = el('div', 'resumen');
    [[completas + ' de ' + conClase, 'horas completas'], [textoPct(pct(tot.p, tot.f)), 'asistencia'], [String(tot.f), 'faltas']].forEach(function (r) {
      var c = el('div'); c.appendChild(el('b', null, r[0])); c.appendChild(el('small', null, r[1])); res.appendChild(c);
    });
    cont.appendChild(res);

    var muchas = Object.keys(faltas).filter(function (k) { return faltas[k] >= 2; }).sort(function (a, b) { return faltas[b] - faltas[a]; });
    if (muchas.length) {
      var s = el('section', 'tarjeta');
      s.appendChild(el('h2', null, 'Faltaron dos veces o más'));
      var ul = el('ul', 'nombres');
      muchas.slice(0, 20).forEach(function (k) {
        var li = el('li', 'boton-nombre');
        li.appendChild(boton('', alumna(k).n + ' · ' + faltas[k], function () { abrirAlumna(+k); }));
        ul.appendChild(li);
      });
      s.appendChild(ul);
      cont.appendChild(s);
    }
  }

  // ─── Alumnas ────────────────────────────────────────────────────────
  function resumenAlumna(k) {
    var r = { p: 0, f: 0, x: 0, ultima: null };
    (ix.porAlumna[k] || []).forEach(function (m) {
      if (m.e === 'p' || m.e === 'f' || m.e === 'x') r[m.e]++;
      if (m.e === 'p' || m.e === 'x') r.ultima = m;
    });
    r.pct = pct(r.p, r.f);
    return r;
  }
  function maestrasDe(a) {
    var ids = {};
    (a.s || []).forEach(function (c) { ids[(a.m && a.m[c]) || '_sin'] = true; });
    return ordenar(Object.keys(ids)).map(nombreGrupo).join(', ');
  }
  // `vista.alumna` guarda su id (no su lugar en la lista, que cambia al actualizar).
  function elegirAlumna(k) { vista.alumna = d.alumnos[k] ? d.alumnos[k].i : null; }
  function abrirAlumna(k) {
    elegirAlumna(k);
    u.irA('alumnas');
  }
  function pintarAlumnas() {
    var lista = $('alumnas-lista'), ficha = $('alumna-ficha');
    lista.innerHTML = '';
    ficha.innerHTML = '';
    var abierta = vista.alumna !== null ? ix.porId[vista.alumna] : undefined;
    if (abierta !== undefined && d.alumnos[abierta]) {
      mostrar($('buscar-alumna').parentNode, false);
      pintarFicha(ficha, abierta);
      return;
    }
    vista.alumna = null;
    vista.aviso = null;
    mostrar($('buscar-alumna').parentNode, true);
    var filtro = u.sinAcentos($('buscar-alumna').value);
    var todas = d.alumnos.map(function (a, k) { return k; }).filter(function (k) {
      var a = d.alumnos[k];
      if (a.b && filtro.length < 2) return false;
      return u.coincide(a.n, filtro);
    }).sort(function (a, b) { return alumna(a).n.localeCompare(alumna(b).n, 'es'); });
    var t = el('section', 'tarjeta');
    if (!todas.length) {
      t.appendChild(el('div', 'vacio', 'Nadie se llama así.'));
      lista.appendChild(t);
      return;
    }
    if (!filtro) t.appendChild(el('h2', null, activasIdx().length + ' alumnas activas'));
    todas.slice(0, 80).forEach(function (k) {
      var a = alumna(k), r = resumenAlumna(k);
      var b = boton('resultado', null, function () { elegirAlumna(k); pintarAlumnas(); window.scrollTo(0, 0); });
      var txt = el('span', 'r-txt');
      var nom = el('span', 'r-nombre', a.n);
      if (a.b) nom.appendChild(el('span', 'baja', 'baja'));
      txt.appendChild(nom);
      txt.appendChild(el('span', 'r-det', a.b ? 'Ya no está activa' : [maestrasDe(a), u.suHorario(a)].filter(Boolean).join(' · ')));
      b.appendChild(txt);
      b.appendChild(el('span', 'r-pct' + (r.pct === null ? '' : r.pct >= 80 ? ' bien' : r.pct < 60 ? ' mal' : ''), textoPct(r.pct)));
      t.appendChild(b);
    });
    if (todas.length > 80) t.appendChild(el('div', 'nadie', 'Hay ' + (todas.length - 80) + ' más: escribe parte del nombre.'));
    lista.appendChild(t);
  }
  function mostrar(e, si) { e.classList[si ? 'remove' : 'add']('oculto'); }

  function pintarFicha(cont, k) {
    var a = alumna(k), r = resumenAlumna(k);
    cont.appendChild(boton('volver', '‹ Todas las alumnas', function () { vista.alumna = null; pintarAlumnas(); }));
    var t = el('section', 'tarjeta');
    var h = el('h2', 'ficha-nombre', a.n);
    h.className = 'ficha-nombre';
    if (a.b) h.appendChild(el('span', 'baja', 'baja'));
    t.appendChild(h);
    var res = el('div', 'resumen');
    [[textoPct(r.pct), 'asistencia'], [String(r.p + r.x), 'vino'], [String(r.f), 'faltó']].forEach(function (x) {
      var c = el('div'); c.appendChild(el('b', null, x[0])); c.appendChild(el('small', null, x[1])); res.appendChild(c);
    });
    t.appendChild(res);
    if (r.x) t.appendChild(el('p', 'dato', 'Vino ' + r.x + (r.x === 1 ? ' vez' : ' veces') + ' fuera de su horario.'));
    var ult = el('p', 'dato');
    ult.appendChild(el('span', null, 'Última vez que vino: '));
    ult.appendChild(document.createTextNode(r.ultima ? fechaLarga(r.ultima.f) + ', ' + r.ultima.h : 'no hay registro en estas semanas'));
    t.appendChild(ult);
    cont.appendChild(t);

    if (!a.b) cont.appendChild(tarjetaHorario(k));

    var cal = el('section', 'tarjeta');
    cal.appendChild(el('h2', null, 'Las últimas semanas'));
    cal.appendChild(calendario(k));
    var ley = el('div', 'leyenda');
    [['vino', 'vino'], ['fuera', 'fuera de su horario'], ['falto', 'faltó'], ['pendiente', 'sin marcar']].forEach(function (x) {
      var s = el('span'); s.appendChild(el('i', x[0])); s.appendChild(document.createTextNode(x[1])); ley.appendChild(s);
    });
    cal.appendChild(ley);
    cont.appendChild(cal);

    var notas = H.notas.filter(function (n) { return n.a === k; });
    if (notas.length) {
      var av = el('section', 'tarjeta');
      av.appendChild(el('h2', null, 'Avisos'));
      var ul = el('ul', 'lista-simple');
      notas.forEach(function (n) {
        var li = el('li', null, n.t || '');
        li.appendChild(el('small', null, fechaCorta(n.f) + (n.q ? ' · lo dejó ' + n.q : '')));
        ul.appendChild(li);
      });
      av.appendChild(ul);
      cont.appendChild(av);
    }
  }
  function calendario(k) {
    var porDia = {};
    (ix.porAlumna[k] || []).forEach(function (m) { (porDia[m.f] = porDia[m.f] || []).push(m); });
    var dias = (d.dias && d.dias.length ? d.dias : [1, 2, 3, 4, 5]).filter(function (x) { return x >= 1 && x <= 6; });
    var hoy = u.hoy();
    var desde = lunesDe(H.desde || u.sumarDias(hoy, -49));
    var hasta = lunesDe(H.hasta && H.hasta > hoy ? H.hasta : hoy);
    var tabla = el('table', 'cal');
    var cab = el('tr');
    dias.forEach(function (x) { cab.appendChild(el('th', null, u.DIAS[x - 1])); });
    var thead = el('thead'); thead.appendChild(cab); tabla.appendChild(thead);
    var tbody = el('tbody');
    var primera = true;
    for (var l = desde; l <= hasta; l = u.sumarDias(l, 7)) {
      var tr = el('tr');
      dias.forEach(function (x) {
        var f = u.sumarDias(l, x - 1);
        // El mes, en el primer día que se ve y en cada día primero.
        var dia = String(+f.slice(8, 10)) + (primera || f.slice(8, 10) === '01' ? ' ' + MESES[+f.slice(5, 7) - 1] : '');
        primera = false;
        var m = porDia[f] || [];
        var tiene = function (e) { return m.some(function (y) { return y.e === e; }); };
        var clase = tiene('p') ? 'vino' : tiene('x') ? 'fuera' : tiene('f') ? 'falto' : tiene('sin') ? 'pendiente' : 'nada';
        var td = el('td', clase + (f === hoy ? ' hoy' : ''), f > hoy ? '' : dia);
        if (m.length) td.title = fechaLarga(f) + ': ' + m.map(function (y) { return y.h + ' ' + ({ p: 'vino', x: 'vino fuera de su horario', f: 'faltó', sin: 'sin marcar' })[y.e]; }).join(', ');
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
    tabla.appendChild(tbody);
    return tabla;
  }

  // ─── Su horario: ponerla en un grupo o quitarle una hora ────────────
  function mayus(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function cuandoTxt(dia, h) { return DIAS_L[dia - 1] + ' ' + h; }
  function conQuien(gid) { return gid && gid !== '_sin' ? 'con ' + nombreGrupo(gid) : 'sin maestra'; }
  function porDiaHora(x, y) { return (x.dia - y.dia) || (x.h < y.h ? -1 : x.h > y.h ? 1 : 0); }

  // Los días que se ofrecen: los de clase y los que ya usa alguna alumna (sin domingo).
  function diasDeClase() {
    var s = {};
    (d.dias && d.dias.length ? d.dias : [1, 2, 3, 4, 5]).forEach(function (x) { s[x] = true; });
    d.alumnos.forEach(function (a) { if (!a.b) (a.s || []).forEach(function (c) { s[+c.split('-')[0]] = true; }); });
    return Object.keys(s).map(Number).filter(function (x) { return x >= 1 && x <= 6; }).sort(function (x, y) { return x - y; });
  }
  function maestrasActivas() {
    return ix.orden.map(function (id) { return ix.maestras[id]; }).filter(function (m) { return m && m.activa; });
  }

  // Cómo va un cambio: ya salió, está saliendo o sigue en el celular (manda el más atrasado).
  var PESO = { enviado: 0, enviando: 1, cola: 2 };
  var ESTADO_TXT = { enviado: 'Enviado: se verá en unos minutos', enviando: 'Enviando…', cola: 'Se mandará cuando haya señal' };

  // Su horario como quedará: el que trae la lista con los cambios que mandó
  // este celular encima, en orden. Casilla («3-16:00») → maestra ('_sin' si no tiene).
  function horarioConCambios(a) {
    var base = {}, ahora = {}, estadoDe = {};
    (a.s || []).forEach(function (c) { base[c] = (a.m && a.m[c]) || '_sin'; ahora[c] = base[c]; });
    u.horarioPendiente().forEach(function (env) {
      env.cambios.forEach(function (x) {
        if (x.alumnoId !== a.i) return;
        var c = x.dia + '-' + x.hora;
        if (x.quitar) delete ahora[c]; else ahora[c] = x.entrenadoraId || '_sin';
        // Si algo de esa casilla sigue en este celular, sale «cuando haya señal»;
        // si está saliendo, «enviando».
        var antes = estadoDe[c] || 'enviado';
        estadoDe[c] = PESO[env.estado] > PESO[antes] ? env.estado : antes;
      });
    });
    var filas = [];
    var claves = {};
    Object.keys(base).concat(Object.keys(ahora)).forEach(function (c) { claves[c] = true; });
    Object.keys(claves).forEach(function (c) {
      var p = c.split('-'), f = { c: c, dia: +p[0], h: p[1], gid: ahora[c] || base[c], antes: null, pend: null };
      if (!(c in ahora)) f.pend = 'quita';
      else if (!(c in base)) f.pend = 'nueva';
      else if (ahora[c] !== base[c]) { f.pend = 'cambia'; f.antes = base[c]; }
      if (f.pend) f.estado = estadoDe[c] || 'enviado';
      filas.push(f);
    });
    return { filas: filas.sort(porDiaHora), ahora: ahora };
  }

  function tarjetaHorario(k) {
    var a = alumna(k);
    var puede = u.puedeHorario();
    var hs = el('section', 'tarjeta');
    hs.appendChild(el('h2', null, 'Su horario'));
    var v = horarioConCambios(a);
    // Lo que el programa no pudo aplicar, hasta que el dueño dice «Entendido».
    u.horarioRechazos().filter(function (x) { return x.cambios.some(function (c) { return c.alumnoId === a.i; }); }).forEach(function (x) {
      var av = el('div', 'aviso error');
      av.appendChild(el('div', null, 'No se pudo: ' + x.no.join(' · ')));
      av.appendChild(boton('sec', 'Entendido', function () { u.olvidarRechazo(x.h); pintarAlumnas(); }));
      hs.appendChild(av);
    });
    // Lo que se acaba de mandar, mientras siga pendiente. Si ya salió del
    // celular (volvió la señal), dice «enviado» aunque al mandarlo no hubiera.
    if (vista.aviso && vista.aviso.id === a.i && v.filas.some(function (f) { return f.pend; })) {
      var est = 'enviado';
      v.filas.forEach(function (f) { if (f.pend && PESO[f.estado] > PESO[est]) est = f.estado; });
      var como = est === 'cola' ? vista.aviso.como || 'Se mandará cuando haya señal.' : ESTADO_TXT[est] + (est === 'enviado' ? '.' : '');
      hs.appendChild(el('div', 'aviso' + (est === 'enviado' ? ' ok' : ''), vista.aviso.que + ' ' + como));
    }
    if (!v.filas.length) hs.appendChild(el('div', 'vacio', 'No tiene horario capturado.'));
    v.filas.forEach(function (f) {
      var fila = el('div', 'horario-fila' + (f.pend ? ' pendiente' : '') + (f.pend === 'quita' ? ' se-va' : ''));
      fila.appendChild(el('b', null, mayus(cuandoTxt(f.dia, f.h))));
      fila.appendChild(punto(f.gid));
      fila.appendChild(el('span', 'hf-quien', nombreGrupo(f.gid)));
      if (!f.pend && puede) {
        var q = boton('quitar-hora', 'Quitar', function () { quitarHora(k, f, q); });
        q.setAttribute('aria-label', 'Quitar el ' + cuandoTxt(f.dia, f.h));
        fila.appendChild(q);
      }
      if (f.pend) {
        var que = f.pend === 'quita' ? 'Se quita' : f.pend === 'nueva' ? 'Nueva' : 'Antes ' + conQuien(f.antes);
        fila.appendChild(el('small', 'hf-estado' + (f.estado === 'cola' ? ' sin-senal' : ''), que + ' · ' + ESTADO_TXT[f.estado]));
      }
      hs.appendChild(fila);
    });
    if (puede) hs.appendChild(boton('principal poner', 'Poner en el grupo de…', function () { abrirHoja(a.i); }));
    return hs;
  }

  function quitarHora(k, f, b) {
    var a = alumna(k);
    if (!confirm('¿Quitar a ' + a.n + ' del ' + cuandoTxt(f.dia, f.h) + ' (' + conQuien(f.gid) + ')? Deja de salir en esa lista.')) return;
    // Mientras se guarda, el botón no se vuelve a tocar.
    if (b) { b.disabled = true; b.textContent = 'Quitando…'; }
    enviarCambios(a, [{ alumnoId: a.i, dia: f.dia, hora: f.h, entrenadoraId: f.gid === '_sin' ? null : f.gid, quitar: true }],
      mayus(cuandoTxt(f.dia, f.h)) + ': se quita (' + conQuien(f.gid) + ').')
      .catch(function () { if (vista.alumna === a.i) pintarAlumnas(); });
  }

  // Manda los cambios. En cuanto quedan guardados en el celular, la ficha ya
  // los enseña («Enviando…», sin esperar a la red) y `alGuardar` avisa; al
  // terminar, dice qué pasó con el envío.
  function enviarCambios(a, cambios, que, alGuardar) {
    var aviso = { id: a.i, que: que, como: null };
    return u.mandarHorario(cambios, function () {
      vista.aviso = aviso;
      if (alGuardar) alGuardar();
      if (vista.alumna === a.i) pintarAlumnas();
    }).then(function (r) {
      aviso.como = r.ok ? 'Enviado: se verá en unos minutos.'
        : r.detras ? 'Se manda en cuanto salgan los cambios que ya esperaban en este celular.'
          : r.red || !r.error ? 'Sin señal: se mandará cuando haya señal.'
            : 'Quedó guardado en este celular (el gimnasio contestó «' + String(r.error).replace(/[.\s]+$/, '') + '»). Se vuelve a intentar solo.';
      if (vista.alumna === a.i) pintarAlumnas();
      return r;
    });
  }

  // La ventana: maestra, día(s) y hora; abajo, qué va a pasar con cada día.
  function abrirHoja(id) {
    vista.hoja = { id: id, m: null, dias: {}, h: null, mandando: false };
    // Si solo tiene una maestra, ya viene elegida.
    var a = d.alumnos[ix.porId[id]];
    var suyas = {};
    (a.s || []).forEach(function (c) { var g = a.m && a.m[c]; if (g && ix.maestras[g] && ix.maestras[g].activa) suyas[g] = true; });
    if (Object.keys(suyas).length === 1) vista.hoja.m = Object.keys(suyas)[0];
    mostrar($('hoja-fondo'), true);
    mostrar($('hoja'), true);
    document.body.classList.add('con-hoja');
    pintarHoja();
  }
  function cerrarHoja() {
    vista.hoja = null;
    mostrar($('hoja-fondo'), false);
    mostrar($('hoja'), false);
    $('hoja').innerHTML = '';
    document.body.classList.remove('con-hoja');
  }
  // Qué cambios salen de lo elegido, con lo que ya tenía (y lo ya mandado).
  function planDe(a, s) {
    var r = { cambios: [], lineas: [] };
    if (!s.m || !s.h) return r;
    var ahora = horarioConCambios(a).ahora;
    Object.keys(s.dias).filter(function (x) { return s.dias[x]; }).map(Number).sort(function (x, y) { return x - y; }).forEach(function (dia) {
      var c = dia + '-' + s.h, antes = ahora[c], cuando = cuandoTxt(dia, s.h), con = nombreGrupo(s.m);
      if (antes === s.m) { r.lineas.push({ t: 'Ya está el ' + cuando + ' con ' + con + '.', c: 'igual' }); return; }
      r.cambios.push({ alumnoId: a.i, dia: dia, hora: s.h, entrenadoraId: s.m, quitar: false });
      if (antes === undefined) r.lineas.push({ t: mayus(cuando) + ' con ' + con + '.', c: 'nueva' });
      else r.lineas.push({ t: 'Ya tenía ' + cuando + ' ' + conQuien(antes) + ': pasa con ' + con + '.', c: 'cambia' });
    });
    return r;
  }
  function opcion(texto, elegida, alTocar, gid, etiqueta) {
    var b = boton('opcion' + (elegida ? ' elegida' : ''), null, alTocar);
    b.setAttribute('aria-pressed', elegida ? 'true' : 'false');
    b.setAttribute('aria-label', etiqueta || texto);
    if (gid) b.appendChild(punto(gid));
    b.appendChild(el('span', null, texto));
    return b;
  }
  function pintarHoja() {
    var s = vista.hoja, caja = $('hoja');
    if (!s || !caja) return;
    var a = d.alumnos[ix.porId[s.id]];
    caja.innerHTML = '';
    var cab = el('div', 'hoja-cab');
    var tit = el('div', 'hoja-tit');
    var h = el('h2', null, 'Poner en el grupo de…');
    h.setAttribute('id', 'hoja-titulo');
    tit.appendChild(h);
    tit.appendChild(el('small', null, a.n));
    cab.appendChild(tit);
    var x = boton('cerrar', '✕', cerrarHoja);
    x.setAttribute('aria-label', 'Cerrar');
    cab.appendChild(x);
    caja.appendChild(cab);

    var maestras = maestrasActivas();
    if (!maestras.length) {
      caja.appendChild(el('p', 'vacio', 'Todavía no hay maestras activas en el programa.'));
      caja.appendChild(boton('sec ancho', 'Cerrar', cerrarHoja));
      return;
    }
    caja.appendChild(el('h3', 'sep', '¿Con qué maestra?'));
    var om = el('div', 'opciones');
    maestras.forEach(function (m) { om.appendChild(opcion(m.nombre, s.m === m.id, function () { s.m = m.id; pintarHoja(); }, m.id)); });
    caja.appendChild(om);
    caja.appendChild(el('h3', 'sep', '¿Qué días?'));
    var od = el('div', 'opciones dias');
    diasDeClase().forEach(function (dia) { od.appendChild(opcion(mayus(DIAS_C[dia - 1]), Boolean(s.dias[dia]), function () { s.dias[dia] = !s.dias[dia]; pintarHoja(); }, null, mayus(DIAS_L[dia - 1]))); });
    caja.appendChild(od);
    caja.appendChild(el('h3', 'sep', '¿A qué hora?'));
    var oh = el('div', 'opciones horas');
    (d.horas || []).forEach(function (hr) { oh.appendChild(opcion(hr, s.h === hr, function () { s.h = hr; pintarHoja(); })); });
    caja.appendChild(oh);

    var plan = planDe(a, s);
    if (plan.lineas.length) {
      var ul = el('ul', 'hoja-resumen');
      plan.lineas.forEach(function (l) { ul.appendChild(el('li', l.c, l.t)); });
      caja.appendChild(ul);
    } else {
      caja.appendChild(el('p', 'hoja-falta', !s.m ? 'Elige la maestra.' : !Object.keys(s.dias).some(function (k2) { return s.dias[k2]; }) ? 'Elige uno o más días.' : 'Elige la hora.'));
    }
    var pie = el('div', 'hoja-botones');
    pie.appendChild(boton('sec', 'Cancelar', cerrarHoja));
    var poner = boton('principal', s.mandando ? 'Enviando…' : 'Poner en el grupo', function () {
      if (s.mandando || !plan.cambios.length) return;
      s.mandando = true;
      pintarHoja();
      var que = plan.lineas.filter(function (l) { return l.c !== 'igual'; }).map(function (l) { return l.t; }).join(' ');
      // En cuanto queda guardado en el celular, la ventana se cierra y la ficha lo enseña.
      enviarCambios(a, plan.cambios, que, function () { if (vista.hoja === s) cerrarHoja(); })
        .catch(function () { if (vista.hoja === s) { s.mandando = false; pintarHoja(); } });
    });
    poner.disabled = s.mandando || !plan.cambios.length;
    pie.appendChild(poner);
    caja.appendChild(pie);
  }

  // ─── Maestras ───────────────────────────────────────────────────────
  function pintarMaestras() {
    var cont = $('panel-maestras');
    cont.innerHTML = '';
    navSemana(cont, pintarMaestras);
    var fechas = diasDeSemana();
    var ids = ix.orden.slice();
    var activas = activasIdx();
    var haySin = activas.some(function (k) { var a = d.alumnos[k]; return (a.s || []).some(function (c) { return !(a.m && a.m[c]); }); });
    if (haySin) ids.push('_sin');
    if (!ids.length) { cont.appendChild(el('div', 'tarjeta vacio', 'Todavía no hay maestras en el programa.')); return; }
    ids.forEach(function (gid) {
      var t = el('section', 'tarjeta');
      var cab = el('div', 'maestra-cab');
      cab.appendChild(punto(gid));
      cab.appendChild(el('b', null, nombreGrupo(gid)));
      // Sus casillas y sus alumnas (activas).
      var casillas = {}, suyas = 0;
      activas.forEach(function (k) {
        var a = d.alumnos[k], tiene = false;
        (a.s || []).forEach(function (c) { if (((a.m && a.m[c]) || '_sin') === gid) { casillas[c] = (casillas[c] || 0) + 1; tiene = true; } });
        if (tiene) suyas++;
      });
      if (!suyas && gid !== '_sin' && !enHistorial(gid)) return;
      cab.appendChild(el('small', null, suyas + (suyas === 1 ? ' alumna' : ' alumnas')));
      t.appendChild(cab);
      var porHora = {};
      Object.keys(casillas).forEach(function (c) { var p = c.split('-'); (porHora[p[1]] = porHora[p[1]] || []).push(+p[0]); });
      var horasTxt = Object.keys(porHora).sort().map(function (h) { return porHora[h].sort().map(function (x) { return u.DIAS[x - 1]; }).join('') + ' ' + h; }).join(' · ');
      var dh = el('p', 'dato'); dh.appendChild(el('span', null, 'Sus horas: ')); dh.appendChild(document.createTextNode(horasTxt || 'sin casillas')); t.appendChild(dh);
      if (gid === '_sin') t.appendChild(el('p', 'dato', 'Estas casillas no tienen maestra: esas alumnas solo salen en tu lista.'));

      // La semana: cada hora en que tuvo grupo. Cuenta como pasada por ella
      // solo la hora con su propia lista; la que cubrió el dueño o la
      // computadora se ve aparte y no cuenta como suya.
      var chips = el('div', 'chips'), pasadas = 0, cubiertas = 0, debia = 0, sem = { p: 0, f: 0 };
      fechas.forEach(function (f) {
        (d.horas || []).forEach(function (h) {
          var x = gruposDe(f, h);
          var g = x && x.grupos[gid];
          if (!g || !esperado(g)) return;
          var cuando = momento(f, h);
          var cubre = Boolean(x.lista && x.lista.origen && x.lista.origen !== 'maestra');
          var completa = pasado(g, x) || cubre;
          // Las casillas sin maestra solo las cubre la lista del dueño o la computadora.
          var suya = gid === '_sin' ? completa : listaPropia(g, gid);
          var otro = completa && !suya;
          var quien = g.por || (x.lista && x.lista.quien) || 'alguien más';
          sem.p += (g.p || []).length; sem.f += (g.f || []).length;
          var clase = suya ? 'est-completa' : otro ? 'est-cubierta' : cuando === 'tarde' ? 'est-tarde' : cuando === 'curso' ? 'est-curso' : 'est-sin';
          // Una hora en curso que ya tiene lista también cuenta (si no, sale «0 de 2» con la hora en verde).
          if (cuando === 'paso' || suya || otro) { debia++; if (suya) pasadas++; else if (otro) cubiertas++; }
          var dia = u.DIAS[u.diaSemana(f) - 1] + ' ' + h;
          var txt = suya ? dia + ' ✓' + (g.llego && String(g.llego).length <= 5 ? ' ' + g.llego : '')
            : otro ? dia + ' · la cubrió ' + quien
            : dia + (cuando === 'paso' ? ' ✗' : '');
          var b = boton(clase, txt, function () { vista.dia = f; vista.abiertos[f + '|' + h + '|' + gid] = true; u.irA('hoy'); });
          if (otro) b.title = 'Ella no mandó su lista: la hora la cubrió ' + quien;
          chips.appendChild(b);
        });
      });
      var ds = el('p', 'dato');
      ds.appendChild(el('span', null, 'Listas de la semana: '));
      ds.appendChild(document.createTextNode(!debia ? 'todavía ninguna por pasar'
        : 'pasó ' + pasadas + ' de ' + debia + (cubiertas ? ' · ' + cubiertas + (cubiertas === 1 ? ' la cubrió alguien más' : ' las cubrió alguien más') : '')));
      t.appendChild(ds);
      if (chips.children.length) t.appendChild(chips);
      // Asistencia de su grupo: la semana y las 8 semanas.
      var todo = { p: 0, f: 0 };
      Object.keys(H.horas).forEach(function (clave) {
        var g = (H.horas[clave].grupos || {})[gid];
        if (g) { todo.p += (g.p || []).length; todo.f += (g.f || []).length; }
      });
      var da = el('p', 'dato');
      da.appendChild(el('span', null, 'Asistencia de su grupo: '));
      da.appendChild(document.createTextNode(textoPct(pct(sem.p, sem.f)) + ' esta semana · ' + textoPct(pct(todo.p, todo.f)) + ' en las ' + semanasHistorial() + ' semanas'));
      t.appendChild(da);
      cont.appendChild(t);
    });
  }
  function enHistorial(gid) {
    return Object.keys(H.horas).some(function (k) { var g = (H.horas[k].grupos || {})[gid]; return Boolean(g) && esperado(g); });
  }
  function semanasHistorial() {
    if (!H.desde) return 8;
    var a = Date.parse(lunesDe(H.desde) + 'T12:00:00Z'), b = Date.parse(lunesDe(H.hasta || u.hoy()) + 'T12:00:00Z');
    return Math.max(1, Math.round((b - a) / (7 * 864e5)) + 1);
  }

  function pintar(panel) {
    if (!d) return;
    if (panel === 'hoy') pintarHoy();
    else if (panel === 'semana') pintarSemana();
    else if (panel === 'alumnas') pintarAlumnas();
    else if (panel === 'maestras') pintarMaestras();
  }

  global.PanelDueno = {
    preparar: preparar,
    pintar: pintar,
    estadoHora: function (f, h) { return d ? estadoHora(f, h) : null; },
    marcaDe: function (f, h, id) { return d ? marcaDe(f, h, id) : null; },
    nombreGrupo: nombreGrupo,
    colorGrupo: colorGrupo
  };
})(window);
