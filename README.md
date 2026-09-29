# REIVAJ · Enjoy Gymnastics — la página web

Sitio estático (sin instalación ni build) publicado en Vercel desde este repo:
`reivaj-landing.vercel.app`. Está conectado al programa del gimnasio por un
buzón cifrado: lo que llenan los papás llega solo al programa, y nadie en el
camino lo puede leer.

## Páginas

| Archivo | Qué es |
|---|---|
| `index.html` | Inicio: datos del gimnasio (horario, seguridad, cómo se inscribe, preguntas) y el formulario de **clase de prueba** (lunes a viernes, 4:00 pm; el papá escoge el día). No enlaza a la inscripción ni a la carta |
| `inscripcion.html` | **Inscripción en línea** (no enlazada ni indexada: se entra solo con el link que manda el gimnasio) en seis pasos: alumno, tutores, emergencias y quién lo recoge, ficha médica, permisos y la **Carta de seguridad y cobertura firmada con el dedo**. La familia se lleva su copia |
| `carta.html` | La carta sola, para las familias que ya están inscritas (se firma cada ciclo y al subir de nivel). No enlazada ni indexada |
| `asistencia.html` | **La lista del celular del dueño.** Privada: solo abre con el link que da el programa (la llave va después del `#` y nunca sale del celular). No está enlazada ni se indexa |
| `aviso-de-privacidad.html` | El Aviso de Privacidad 2027, tal cual el documento oficial |

## Links para compartir

Se comparten siempre por link (no QR). `vercel.json` tiene `cleanUrls`, así
que no llevan `.html`:

| Link | A dónde lleva |
|---|---|
| `reivaj-landing.vercel.app/clase` | El formulario de clase de prueba (`clase.html` redirige a `/#agendar`) |
| `reivaj-landing.vercel.app/inscripcion` | La inscripción en línea (solo por link personal) |
| `reivaj-landing.vercel.app/carta` | La carta de seguridad para familias inscritas (solo por link personal) |

El de la clase de prueba lo manda el bot de WhatsApp. **El de la inscripción
no está a la vista en la página y el bot no lo reparte:** lo manda el gimnasio,
desde el programa, a quien ya vino a su clase y decidió quedarse (Prospectos →
Ya vinieron → WhatsApp). El de la carta, desde la ficha del alumno
(Expediente → Mandar el link por WhatsApp).

## Piezas

| Archivo | Qué hace |
|---|---|
| `config.js` | **Lo único que se edita a mano:** WhatsApp, el link del buzón y la llave pública del programa (las dos últimas las da el programa en Configuración → Conexión con la página) |
| `buzon.js` | Cierra cada envío en el navegador (RSA-OAEP 3072 + AES-256-GCM) y lo deja en el buzón. También abre y firma la lista del celular |
| `carta-texto.js` | El texto de la carta v1.2. **No se edita a mano:** lo genera el programa (`herramientas/carta-a-landing.js`) y el programa compara la huella de lo firmado |
| `firma.js` | La carta en pantalla, el lienzo de firma y la copia para la familia |
| `comun.js` | Navegación, fechas de Guadalajara, validación |
| `script.js`, `inscripcion.js`, `carta.js`, `asistencia.js` | Cada página |
| `styles.css` | Diseño (paleta y tipografía de la marca) |
| `vercel.json`, `robots.txt` | Cabeceras de seguridad: la página solo corre su propio código (los scripts escritos dentro del HTML van por su huella; si se cambian, hay que actualizarla — la prueba de la página en el programa lo avisa) y solo puede mandar datos al buzón. Que la lista, la inscripción y la carta no se indexen |

## El buzón

Conectado desde el 28-sep-2026: una hoja de Google con su Apps Script; su
link va en `buzon` de `config.js`. Solo guarda sobres cerrados.
Si algún día se deja vacío, la clase de prueba sale por WhatsApp ya escrita, y
la inscripción y la carta muestran un aviso para escribir por WhatsApp (no
dejan llenar diez minutos para luego no poder enviar).

## Revisar antes de publicar

Desde la carpeta del programa: `npm run pagina`. Sirve esta carpeta tal cual
en `http://localhost:5181` (`/clase`, `/inscripcion`, `/carta`), conectada al
buzón de verdad: lo que se mande llega al programa real (se descarta ahí).

## Probar sin internet

Desde la carpeta del programa: `node herramientas/banco.js --con-pagina`.
Levanta esta página en `http://localhost:5180` con una `config.js` de prueba,
el buzón simulado (el mismo código de Google) y el programa en
`http://localhost:5178`, todo conectado. El `config.js` real no se toca.

## Nota técnica

**No borres las declaraciones de `color-scheme`** (`<meta name="color-scheme"
content="only light">` en cada página y `color-scheme: only light` en
`styles.css`): sin ellas, Chrome y Edge invierten la página en modo oscuro.
Las animaciones `.reveal` son visibles por defecto; solo se animan si el script
del `<head>` alcanzó a poner la clase `js`.
