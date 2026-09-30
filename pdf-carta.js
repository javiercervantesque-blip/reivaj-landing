/* La copia de la carta firmada, como PDF que se descarga.
   Mismo contenido que la copia para imprimir (firma.js · armarCopia):
   el texto de la carta, los datos, la ficha, la decisión del seguro y la
   firma. jsPDF (assets/jspdf.umd.min.js) se carga solo al pedir el PDF. */
(function (global) {
  'use strict';

  var LIB = 'assets/jspdf.umd.min.js';
  var cargando = null;
  function cargarLib() {
    if (global.jspdf) return Promise.resolve(global.jspdf);
    if (cargando) return cargando;
    cargando = new Promise(function (ok, mal) {
      var s = document.createElement('script');
      s.src = LIB;
      s.onload = function () { global.jspdf ? ok(global.jspdf) : mal(new Error('sin jsPDF')); };
      s.onerror = function () { cargando = null; mal(new Error('No se pudo cargar')); };
      document.head.appendChild(s);
    });
    return cargando;
  }

  // La firma (trazo SVG) a PNG para meterla al PDF.
  function firmaPNG(f) {
    if (!f || !f.path || typeof Path2D === 'undefined') return null;
    var w = f.ancho || 1000, h = f.alto || 320, k = Math.min(1, 700 / w);
    var c = document.createElement('canvas');
    c.width = Math.round(w * k); c.height = Math.round(h * k);
    var x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    x.scale(k, k);
    x.strokeStyle = '#0B1B3C'; x.lineWidth = 5; x.lineCap = 'round'; x.lineJoin = 'round';
    x.stroke(new Path2D(f.path));
    return { url: c.toDataURL('image/jpeg', 0.85), w: w, h: h };
  }

  // «texto con **negritas**» → [{t:'palabra', b:true}, ...]
  function palabras(texto) {
    var out = [];
    String(texto || '').split('**').forEach(function (trozo, i, todos) {
      // «**riesgo**: se…»: los dos puntos van pegados a la negrita, sin espacio.
      var pegado = i > 0 && !/^\s/.test(trozo) && !/\s$/.test(todos[i - 1]);
      trozo.split(/\s+/).forEach(function (p) {
        if (p) { out.push({ t: p, b: i % 2 === 1, pegado: pegado }); pegado = false; }
      });
    });
    return out;
  }

  function generar(jspdf, datos, extra) {
    var C = global.CARTA_SEGURIDAD;
    var doc = new jspdf.jsPDF({ unit: 'mm', format: 'letter' });
    var M = 18, ANCHO = 215.9 - 2 * M, ALTO = 279.4, y = M;
    var TINTA = [11, 27, 60], GRIS = [90, 90, 90];

    function saltoSi(h) { if (y + h > ALTO - 16) { doc.addPage(); y = M; } }
    function fuente(b, tam, color) {
      doc.setFont('helvetica', b ? 'bold' : 'normal');
      doc.setFontSize(tam);
      doc.setTextColor.apply(doc, color || [0, 0, 0]);
    }
    // Párrafo con negritas, ajustado al ancho.
    function parrafo(texto, o) {
      o = o || {};
      var tam = o.tam || 9.5, sangria = o.sangria || 0, lh = tam * 0.45;
      var ancho = ANCHO - sangria, lineas = [], linea = [], w = 0;
      palabras(texto).forEach(function (p) {
        fuente(p.b || o.b, tam);
        var pw = doc.getTextWidth(p.t), esp = p.pegado ? 0 : doc.getTextWidth(' ');
        if (linea.length && w + esp + pw > ancho) { lineas.push(linea); linea = []; w = 0; }
        p.w = pw; p.esp = esp;
        w += (linea.length ? esp : 0) + pw;
        linea.push(p);
      });
      if (linea.length) lineas.push(linea);
      lineas.forEach(function (l, i) {
        saltoSi(lh);
        var x = M + sangria;
        if (o.vineta && i === 0) { fuente(false, tam); doc.text('•', M + sangria - 4, y + tam * 0.35); }
        l.forEach(function (p, j) {
          fuente(p.b || o.b, tam, o.color);
          doc.text(p.t, x, y + tam * 0.35);
          x += p.w + (j < l.length - 1 ? l[j + 1].esp : 0);
        });
        y += lh;
      });
      y += o.despues === undefined ? 2 : o.despues;
    }
    // Renglón «etiqueta: valor» a dos columnas.
    function pares(lista) {
      var col = ANCHO / 2;
      for (var i = 0; i < lista.length; i += 2) {
        var alto = 0;
        [lista[i], lista[i + 1]].forEach(function (par, k) {
          if (!par) return;
          fuente(false, 7.5, GRIS);
          var v = doc.splitTextToSize(String(par[1] || '—'), col - 4);
          alto = Math.max(alto, 4 + v.length * 4.2);
        });
        saltoSi(alto);
        [lista[i], lista[i + 1]].forEach(function (par, k) {
          if (!par) return;
          var x = M + k * col;
          fuente(false, 7.5, GRIS); doc.text(String(par[0]).toUpperCase(), x, y + 2.6);
          fuente(true, 9.5, TINTA); doc.text(doc.splitTextToSize(String(par[1] || '—'), col - 4), x, y + 7);
        });
        y += alto + 2;
      }
      y += 2;
    }

    fuente(false, 8, GRIS); doc.text(C.aviso.toUpperCase(), M, y); y += 7;
    fuente(true, 17, TINTA); doc.text(C.titulo, M, y); y += 4;
    doc.setDrawColor(200, 160, 40); doc.setLineWidth(0.6); doc.line(M, y, M + ANCHO, y); y += 6;

    pares([
      [C.encabezado[0], datos.alumno], [C.encabezado[1], datos.edad], [C.encabezado[2], datos.grupo || 'Lo llena REIVAJ'],
      [C.encabezado[3], datos.fecha], [C.encabezado[4], datos.tutor], [C.encabezado[5], datos.emergencia1],
      [C.encabezado[6], datos.emergencia2], [C.encabezado[7], datos.sangre]
    ]);

    C.secciones.forEach(function (s) {
      saltoSi(14);
      y += 2;
      fuente(true, 11.5, TINTA); doc.text(s.n + '.  ' + s.titulo, M, y + 3); y += 8;
      if (s.recuadro) {
        parrafo('**' + s.recuadro.titulo + '**', { despues: 1 });
        parrafo(s.recuadro.texto);
      }
      (s.lista || []).forEach(function (li) { parrafo(li, { sangria: 5, vineta: true, despues: 1 }); });
      if (s.lista) y += 1;
      if (s.cuadro) {
        s.cuadro.forEach(function (f) {
          var v = f[1] || '________________';
          saltoSi(6);
          fuente(true, 9, GRIS); doc.text(f[0], M, y + 3);
          var yAntes = y;
          parrafo(v, { sangria: 38, despues: 0 });
          if (y - yAntes < 5) y = yAntes + 5;
          y += 0.8;
        });
        y += 2;
      }
      if (s.opciones) parrafo('**Decisión sobre el seguro:** ' + (extra.seguro === 'si' ? 'Sí contrato el seguro de accidentes que ofrece REIVAJ.' : 'No lo contrato.'));
      (s.parrafos || []).forEach(function (t) { parrafo(t); });
      if (s.campos && extra.ficha) pares(extra.ficha.map(function (x) { return [x[0], x[1] || '—']; }));
    });

    parrafo(C.cierre, { color: GRIS, tam: 8.5 });
    y += 2;
    parrafo('**' + C.enLinea + '**', { tam: 9 });

    var img = firmaPNG(extra.firma);
    if (img) {
      var fw = 70, fh = fw * img.h / img.w;
      saltoSi(fh + 12);
      doc.addImage(img.url, 'JPEG', M, y, fw, fh);
      y += fh + 1;
    }
    doc.setDrawColor(120, 120, 120); doc.setLineWidth(0.3); doc.line(M, y, M + 80, y); y += 4.5;
    fuente(false, 9.5); doc.text((extra.firmante || '') + ' · ' + (extra.parentesco || 'tutor'), M, y); y += 8;

    fuente(false, 7.5, GRIS);
    var pie = C.pie + ' · firmada en línea el ' + extra.cuando + (extra.folio ? ' · folio de envío ' + extra.folio : '') + ' · huella ' + String(extra.huella || '').slice(0, 16);
    saltoSi(8);
    doc.text(doc.splitTextToSize(pie, ANCHO), M, y);

    var n = doc.getNumberOfPages();
    for (var i = 1; i <= n; i++) {
      doc.setPage(i);
      fuente(false, 7.5, GRIS);
      doc.text('Página ' + i + ' de ' + n, M + ANCHO, ALTO - 8, { align: 'right' });
    }
    return doc;
  }

  function nombreArchivo(alumno) {
    var base = String(alumno || 'alumno').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
    return 'Carta_de_seguridad_REIVAJ_' + (base || 'alumno') + '.pdf';
  }

  // Descarga el PDF. Si algo falla, abre la copia para imprimir.
  function descargar(datos, extra) {
    return cargarLib().then(function (jspdf) {
      generar(jspdf, datos, extra).save(nombreArchivo(datos.alumno));
      return true;
    }).catch(function () { global.print(); return false; });
  }

  global.CartaPDF = { descargar: descargar, cargarLib: cargarLib, generar: generar };
})(window);
