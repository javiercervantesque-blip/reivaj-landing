# REIVAJ · Enjoy Gymnastics — Landing page

Sitio estático de una sola página. No requiere instalación ni build: abre `index.html` en el navegador.

```
index.html    estructura y contenido (incluye el símbolo del logo en SVG)
styles.css    diseño y paleta
script.js     validación del formulario, animaciones, configuración
```

## Identidad

La paleta viene directo del logo:

| Variable | Color | Uso |
|---|---|---|
| `--navy` | `#0B1B3C` | fondo del logo → nav, títulos, CTA final, tarjeta destacada |
| `--navy-deep` | `#06112A` | footer |
| `--blue` | `#0B5FFF` | arco del logo → botones, acentos, links |
| `--blue-light` | `#6EA0FF` | azul legible sobre fondo marino |
| `--blue-soft` | `#E8F0FF` | fondos de etiquetas y destacados |

Están todas en el bloque `:root` de `styles.css`. Cambia una línea y se actualiza todo el sitio.

Tipografía: **Archivo** en itálica bold para títulos, números y etiquetas (imita el wordmark
inclinado del logo) e **Inter** para el texto corrido. El tagline *ENJOY GYMNASTICS* define el
estilo de todas las etiquetas: mayúsculas con interletrado amplio.

## Qué debes editar antes de publicar

### 1. El logo real
El símbolo que se ve ahora es una reconstrucción en SVG (aro + arco azul + wordmark). Funciona
sin archivos externos, pero **no es el logo original**. Para usar el tuyo:

1. Guarda el PNG del logo como `assets/logo.png` (recomendado 512×512, fondo transparente).
2. Ya está enlazado como favicon y como imagen de Open Graph.
3. Para reemplazarlo también en el hero, cambia este bloque de `index.html`:

```html
<!-- de esto -->
<svg class="brand__badge" viewBox="0 0 100 100"><use href="#reivaj-badge"/></svg>
<!-- a esto -->
<img class="brand__badge" src="assets/logo.png" alt="REIVAJ Enjoy Gymnastics">
```

Lo mismo aplica en el nav, el footer y el CTA final, donde se usa `<use href="#reivaj-mark"/>`.

### 2. WhatsApp (obligatorio)
En `script.js`, arriba del todo:

```js
const CONFIG = {
  whatsapp: '5210000000000',  // ← tu número, solo dígitos, con lada de país
  endpoint: ''
};
```

Formato México: `52` + `1` + LADA + número. Ejemplo: `5215512345678`.

Mientras `endpoint` esté vacío, el formulario abre WhatsApp con la solicitud ya redactada.
Si prefieres recibirla por correo, crea un formulario en [Formspree](https://formspree.io) o
[Getform](https://getform.io) y pega la URL en `endpoint`.

### 3. Datos de contacto
En `index.html`, al final (`<footer>`): teléfono, correo, dirección, link de Google Maps y horarios.
Están marcados con ceros y "Ejemplo".

### 4. Cifras reales
En la sección `<!-- STATS -->` hay cuatro números de ejemplo (12 años, 400 alumnos,
8 entrenadores, 5 aparatos). Cámbialos por los reales — o borra la sección si aún no aplican.

### 5. Testimonios
Los tres testimonios son de ejemplo. Sustitúyelos por reseñas reales con autorización de las familias.

### 6. Fotos
Los bloques en degradado marino son marcadores de posición. Reemplaza cada
`<div class="photo" ...>` por una imagen:

```html
<img class="photo photo--hero" src="assets/hero.jpg" alt="Gimnasta en la viga de equilibrio">
```

Recomendado: hero vertical (~900×1200), instalaciones (~1200×900). Comprime en
[squoosh.app](https://squoosh.app) para que carguen rápido.

## Nota técnica

**No borres las declaraciones de `color-scheme`.** Están en dos lugares: la etiqueta
`<meta name="color-scheme" content="only light">` del `<head>` y `color-scheme: only light`
en el `:root` de `styles.css`. Sin ellas, Chrome y Edge invierten automáticamente la página
para quien tenga Windows en modo oscuro: los fondos blancos se vuelven negros y el texto
queda ilegible. El fondo también se declara en `html`, no solo en `body`, por la misma razón.


Las animaciones de entrada usan la clase `.reveal`. El contenido es **visible por defecto**:
solo se oculta para animarse si el script del `<head>` alcanzó a añadir la clase `js` al `<html>`,
y hay un temporizador de respaldo de 2 segundos. No borres ese script del `<head>` — sin él,
un fallo de JavaScript dejaría la página en blanco.

## Publicar

Arrastra la carpeta completa a [netlify.com/drop](https://app.netlify.com/drop) — queda en línea
en segundos y con HTTPS. También funciona en Vercel, GitHub Pages o cualquier hosting normal.
