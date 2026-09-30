# REIVAJ Gimnasia — la página web

Sitio estático (sin instalación ni build) publicado en Vercel desde este repo:
`gimnasiareivaj.com`. Está conectado al programa del gimnasio por un
buzón cifrado: lo que llenan los papás llega solo al programa, y nadie en el
camino lo puede leer.

## Páginas

| Archivo | Qué es |
|---|---|
| `index.html` | Inicio: datos del gimnasio (horario, seguridad, cómo se inscribe, preguntas) y el formulario de **clase de prueba** (lunes a viernes, 4:00 pm; el papá escoge el día). No enlaza a la inscripción ni a la carta |
| `inscripcion.html` | **Inscripción en línea** (no enlazada ni indexada: se entra solo con el link que manda el gimnasio) en seis pasos: alumno, tutores, emergencias y quién lo recoge, ficha médica, permisos y la **Carta de seguridad y cobertura firmada con el dedo**. La familia se lleva su copia |
| `carta.html` | La carta sola, para las familias que ya están inscritas (se firma cada ciclo y al subir de nivel). No enlazada ni indexada |
| `asistencia.html` | **La lista del celular.** Privada: solo abre con un link personal que da el programa (la llave va después del `#` y nunca sale del celular). Cada link abre lo suyo: el de cada **maestra**, solo sus alumnas para pasar lista de su grupo (y anotar clases de prueba); el del **dueño**, su panel (Hoy · Semana · Alumnas · Maestras) y su lista, que cubre lo que ninguna maestra pasó; desde la ficha de una alumna, el dueño la pone en el grupo de una maestra (día y hora) o le quita una hora, y el programa lo aplica. Un link quitado deja de abrir. Se puede poner en la pantalla de inicio como app. No está enlazada ni se indexa |
| `aviso-de-privacidad.html` | El Aviso de Privacidad 2027, tal cual el documento oficial |

## Links para compartir

Se comparten siempre por link (no QR). `vercel.json` tiene `cleanUrls`, así
que no llevan `.html`:

| Link | A dónde lleva |
|---|---|
| `gimnasiareivaj.com/clase` | El formulario de clase de prueba (`clase.html` redirige a `/#agendar`) |
| `gimnasiareivaj.com/inscripcion` | La inscripción en línea (solo por link personal) |
| `gimnasiareivaj.com/carta` | La carta de seguridad para familias inscritas (solo por link personal) |

El de la clase de prueba lo manda el bot de WhatsApp. **El de la inscripción
no está a la vista en la página y el bot no lo reparte:** lo manda el gimnasio,
desde el programa, a quien ya vino a su clase y decidió quedarse (Prospectos →
Ya vinieron → WhatsApp). El de la carta, desde la ficha del alumno
(Expediente → Mandar el link por WhatsApp).

## Piezas

| Archivo | Qué hace |
|---|---|
| `config.js` | **Lo único que se edita a mano:** WhatsApp, el link del buzón y la llave pública del programa (las dos últimas las da el programa en Configuración → Conexión con la página) |
| `buzon.js` | Cierra cada envío en el navegador (RSA-OAEP 3072 + AES-256-GCM) y lo deja en el buzón. También abre la lista del celular que le toca a cada link (formato v3; abre también el v2 del programa anterior) y firma lo que se manda |
| `carta-texto.js` | El texto de la carta v1.2. **No se edita a mano:** lo genera el programa (`herramientas/carta-a-landing.js`) y el programa compara la huella de lo firmado |
| `firma.js` | La carta en pantalla, el lienzo de firma y la copia para la familia |
| `comun.js` | Navegación, fechas de Guadalajara, validación |
| `script.js`, `inscripcion.js`, `carta.js`, `asistencia.js` | Cada página |
| `panel.js` | El panel del dueño en la lista del celular (solo con el link del dueño) |
| `styles.css`, `asistencia.css` | Diseño (paleta y tipografía de la marca); la lista del celular tiene el suyo, pensado para una mano |
| `asistencia.webmanifest`, `asistencia-app.webmanifest`, `asistencia-sw.js` | La lista como app en la pantalla de inicio: el primero (sin dirección de arranque) es para iPhone, así el acceso directo guarda el link con su llave; el segundo, para Android. `asistencia-sw.js` deja abrir la lista sin señal (nunca guarda la lista abierta ni toca lo que va a Google) |
| `pruebas-locales/` | Pruebas de la lista del celular contra un buzón de mentiras. No se publica (`.vercelignore`) |
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

`npm test` en el programa también prueba esta página: la regla de seguridad,
que la lista tenga todo lo que carga, y la lista del celular completa
(`asistencia.html` con sus scripts, en un celular simulado) con el link del
dueño y el de dos maestras, de punta a punta con el programa.

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
