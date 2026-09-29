/* =========================================================
   REIVAJ · La carta de seguridad en pantalla y la firma con el dedo

   La carta se pinta desde carta-texto.js, que genera el programa del
   gimnasio a partir de la versión impresa. La firma se guarda como el
   trazo (no como foto): pesa poco y se ve nítida al imprimir.
   ========================================================= */
(function (global) {
  'use strict';
  var R = global.Reivaj;
  var ANCHO = 1000, ALTO = 320;   // medidas lógicas del trazo

  // ─── Lienzo de firma ────────────────────────────────────────────────
  function Firma(contenedor) {
    var caja = R.el('div', { clase: 'firma__lienzo' });
    var lienzo = R.el('canvas', { 'aria-label': 'Espacio para firmar con el dedo o el mouse', role: 'img' });
    caja.appendChild(lienzo);
    caja.appendChild(R.el('div', { clase: 'firma__linea' }));
    caja.appendChild(R.el('div', { clase: 'firma__guia', texto: 'Firma aquí con el dedo' }));
    var borrar = R.el('button', { type: 'button', texto: 'Borrar y volver a firmar' });
    var estado = R.el('span', { texto: '' });
    contenedor.appendChild(caja);
    contenedor.appendChild(R.el('div', { clase: 'firma__acciones' }, [estado, borrar]));

    var trazos = [], actual = null, inicio = null, fin = null;
    var ctx = lienzo.getContext('2d');

    function medir() {
      var r = lienzo.getBoundingClientRect();
      if (!r.width) return;   // oculto: se mide cuando se vuelva a ver
      var dpr = Math.max(1, global.devicePixelRatio || 1);
      lienzo.width = Math.round(r.width * dpr);
      lienzo.height = Math.round(r.height * dpr);
      pintar();
    }
    function aPantalla(p) { return [p[0] / ANCHO * lienzo.width, p[1] / ALTO * lienzo.height]; }
    function pintar() {
      ctx.clearRect(0, 0, lienzo.width, lienzo.height);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = '#0B1B3C';
      ctx.lineWidth = Math.max(2, lienzo.width / 380);
      trazos.forEach(function (t) {
        ctx.beginPath();
        var a = aPantalla(t[0]);
        ctx.moveTo(a[0], a[1]);
        if (t.length === 1) ctx.lineTo(a[0] + 0.5, a[1]);
        for (var i = 1; i < t.length; i++) { var b = aPantalla(t[i]); ctx.lineTo(b[0], b[1]); }
        ctx.stroke();
      });
    }
    function punto(ev) {
      var r = lienzo.getBoundingClientRect();
      return [
        Math.round(Math.min(ANCHO, Math.max(0, (ev.clientX - r.left) / r.width * ANCHO))),
        Math.round(Math.min(ALTO, Math.max(0, (ev.clientY - r.top) / r.height * ALTO)))
      ];
    }
    lienzo.addEventListener('pointerdown', function (ev) {
      ev.preventDefault();
      lienzo.setPointerCapture(ev.pointerId);
      actual = [punto(ev)];
      trazos.push(actual);
      if (!inicio) inicio = Date.now();
      caja.classList.add('firmado');
      pintar();
    });
    lienzo.addEventListener('pointermove', function (ev) {
      if (!actual) return;
      ev.preventDefault();
      var p = punto(ev), u = actual[actual.length - 1];
      if (Math.abs(p[0] - u[0]) + Math.abs(p[1] - u[1]) >= 3) { actual.push(p); pintar(); }
    });
    var soltar = function () {
      if (!actual) return;
      actual = null; fin = Date.now();
      estado.textContent = valida() ? 'Firma lista.' : '';
      if (typeof api.alCambiar === 'function') api.alCambiar();
    };
    lienzo.addEventListener('pointerup', soltar);
    lienzo.addEventListener('pointercancel', soltar);
    borrar.addEventListener('click', function () {
      trazos = []; inicio = fin = null; caja.classList.remove('firmado'); estado.textContent = '';
      pintar();
      if (typeof api.alCambiar === 'function') api.alCambiar();
    });
    global.addEventListener('resize', medir);
    setTimeout(medir, 0);

    function puntos() { return trazos.reduce(function (n, t) { return n + t.length; }, 0); }
    // Que sea un trazo de verdad y no un toque accidental.
    function valida() {
      if (puntos() < 12) return false;
      var xs = [], ys = [];
      trazos.forEach(function (t) { t.forEach(function (p) { xs.push(p[0]); ys.push(p[1]); }); });
      return Math.max.apply(null, xs) - Math.min.apply(null, xs) > 90 || Math.max.apply(null, ys) - Math.min.apply(null, ys) > 60;
    }
    function svgPath() {
      return trazos.map(function (t) {
        return 'M' + t[0][0] + ' ' + t[0][1] + (t.length === 1 ? 'l1 0' : t.slice(1).map(function (p) { return 'L' + p[0] + ' ' + p[1]; }).join(''));
      }).join('');
    }
    var api = {
      valida: valida,
      medir: medir,
      datos: function () {
        return { path: svgPath(), ancho: ANCHO, alto: ALTO, trazos: trazos.length, puntos: puntos(), ms: inicio && fin ? fin - inicio : 0 };
      },
      caja: caja,
      alCambiar: null
    };
    return api;
  }

  function imagenDeFirma(f) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + f.ancho + ' ' + f.alto);
    svg.setAttribute('class', 'firma-img');
    var p = document.createElementNS(ns, 'path');
    p.setAttribute('d', f.path);
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', '#0B1B3C');
    p.setAttribute('stroke-width', '4');
    p.setAttribute('stroke-linecap', 'round');
    p.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(p);
    return svg;
  }

  // ─── La carta en pantalla ──────────────────────────────────────────
  // datos: { alumno, edad, tutor, emergencia1, emergencia2, sangre, fecha }
  // opciones.seccion4: nodo que va debajo del texto del apartado 4 (la ficha médica)
  // opciones.seguro: nodo con la decisión del seguro (debajo del cuadro)
  function pintarCarta(cont, datos, opciones) {
    var C = global.CARTA_SEGURIDAD;
    opciones = opciones || {};
    cont.innerHTML = '';
    cont.classList.add('carta');
    cont.appendChild(R.el('p', { clase: 'carta__aviso', texto: C.aviso }));
    cont.appendChild(R.el('h2', { texto: C.titulo }));
    if (datos) {
      var rej = R.el('div', { clase: 'carta__datos' });
      var par = [
        [C.encabezado[0], datos.alumno], [C.encabezado[1], datos.edad], [C.encabezado[2], datos.grupo || 'Lo llena REIVAJ'],
        [C.encabezado[3], datos.fecha], [C.encabezado[4], datos.tutor], [C.encabezado[5], datos.emergencia1],
        [C.encabezado[6], datos.emergencia2], [C.encabezado[7], datos.sangre]
      ];
      par.forEach(function (x) { rej.appendChild(R.el('div', {}, [R.el('span', { texto: x[0] }), R.el('b', { texto: x[1] || '—' })])); });
      cont.appendChild(rej);
    }
    C.secciones.forEach(function (s) {
      cont.appendChild(R.el('h3', {}, [R.el('span', { clase: 'n', texto: String(s.n) }), s.titulo]));
      if (s.recuadro) {
        var rc = R.el('div', { clase: 'carta__recuadro' }, [R.el('strong', { texto: s.recuadro.titulo })]);
        var pr = R.el('p', { style: 'margin:0' });
        R.conNegritas(s.recuadro.texto).forEach(function (n) { pr.appendChild(n); });
        rc.appendChild(pr);
        cont.appendChild(rc);
      }
      if (s.lista) {
        var ul = R.el('ul');
        s.lista.forEach(function (li) { ul.appendChild(R.el('li', { texto: li })); });
        cont.appendChild(ul);
      }
      if (s.cuadro) {
        var tabla = R.el('table', { clase: 'carta__cuadro' });
        s.cuadro.forEach(function (f) {
          var td = R.el('td', { clase: f[1] ? '' : 'vacio' });
          if (f[1]) R.conNegritas(f[1]).forEach(function (n) { td.appendChild(n); });
          else td.textContent = '________________';
          tabla.appendChild(R.el('tr', {}, [R.el('th', { texto: f[0] }), td]));
        });
        cont.appendChild(tabla);
      }
      if (s.opciones && opciones.seguro) cont.appendChild(opciones.seguro);
      (s.parrafos || []).forEach(function (t) {
        var p = R.el('p');
        R.conNegritas(t).forEach(function (n) { p.appendChild(n); });
        cont.appendChild(p);
      });
      if (s.campos && opciones.seccion4) cont.appendChild(opciones.seccion4);
    });
    cont.appendChild(R.el('p', { clase: 'carta__lo-llena', texto: C.cierre + ' La copia te la llevas al enviar.' }));
  }

  // Las dos opciones del seguro, con el texto exacto de la carta.
  function opcionesSeguro(nombre) {
    var C = global.CARTA_SEGURIDAD;
    var s = C.secciones.filter(function (x) { return x.opciones; })[0].opciones;
    var hacer = function (valor, texto, nota) {
      var input = R.el('input', { type: 'radio', name: nombre, value: valor, required: true });
      var span = R.el('span');
      R.conNegritas(texto).forEach(function (n) { span.appendChild(n); });
      if (nota) span.appendChild(R.el('span', { clase: 'carta__lo-llena', texto: ' ' + nota }));
      return R.el('label', { clase: 'opcion' }, [input, span]);
    };
    return R.el('div', { clase: 'field' }, [
      R.el('div', { clase: 'opciones', role: 'radiogroup', 'aria-label': 'Seguro de accidentes' }, [
        hacer('si', s.si, '(El importe lo calcula REIVAJ al dar el alta.)'),
        hacer('no', s.no)
      ]),
      R.el('p', { clase: 'error', 'data-error-for': nombre })
    ]);
  }

  // La huella del texto que se firmó: el programa la compara con la suya.
  function huellaCarta() {
    return global.Buzon.huella(JSON.stringify(global.CARTA_SEGURIDAD));
  }

  // Copia para la familia: la carta con sus datos y su firma, lista para
  // imprimir o guardar como PDF desde el navegador.
  function armarCopia(cont, datos, extra) {
    cont.innerHTML = '';
    var cuerpo = R.el('div');
    pintarCarta(cuerpo, datos, {
      seguro: R.el('p', {}, [R.el('b', { texto: 'Decisión sobre el seguro: ' }), extra.seguro === 'si' ? 'Sí contrato el seguro de accidentes que ofrece REIVAJ.' : 'No lo contrato.']),
      seccion4: extra.ficha ? R.el('div', { clase: 'carta__datos' }, extra.ficha.map(function (x) {
        return R.el('div', {}, [R.el('span', { texto: x[0] }), R.el('b', { texto: x[1] || 'Ninguno' })]);
      })) : null
    });
    cont.appendChild(cuerpo);
    cont.appendChild(R.el('p', { style: 'margin-top:6mm' }, [R.el('b', { texto: global.CARTA_SEGURIDAD.enLinea })]));
    cont.appendChild(imagenDeFirma(extra.firma));
    cont.appendChild(R.el('p', { texto: extra.firmante + ' · ' + (extra.parentesco || 'tutor') }));
    cont.appendChild(R.el('p', { clase: 'copia__pie', texto: global.CARTA_SEGURIDAD.pie + ' · firmada en línea el ' + extra.cuando + (extra.folio ? ' · folio de envío ' + extra.folio : '') + ' · huella ' + String(extra.huella || '').slice(0, 16) }));
  }

  global.CartaFirma = { Firma: Firma, pintarCarta: pintarCarta, opcionesSeguro: opcionesSeguro, huellaCarta: huellaCarta, armarCopia: armarCopia, imagenDeFirma: imagenDeFirma };
})(window);
