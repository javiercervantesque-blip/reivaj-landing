/* =========================================================
   REIVAJ · Gimnasia Artística — interacciones
   ========================================================= */

/* ---------------------------------------------------------
   CONFIGURACIÓN — edita estos valores
   --------------------------------------------------------- */
const CONFIG = {
  // Número de WhatsApp del gimnasio en formato internacional, solo dígitos.
  // México: 52 + 1 + LADA + número  →  ej. "5215512345678"
  whatsapp: '523334566544',

  // Endpoint opcional para recibir los datos por correo (Formspree, Getform, etc.).
  // Si lo dejas vacío, el formulario abre WhatsApp con el mensaje ya redactado.
  endpoint: ''
};

/* ---------------------------------------------------------
   Navegación
   --------------------------------------------------------- */
const nav = document.getElementById('nav');
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('is-open');
  navToggle.setAttribute('aria-expanded', String(open));
  navToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
});

navLinks.addEventListener('click', (e) => {
  if (e.target.tagName === 'A') {
    navLinks.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  }
});

/* Sombra del nav + CTA flotante */
const fab = document.getElementById('fab');
const onScroll = () => {
  const y = window.scrollY;
  nav.classList.toggle('is-scrolled', y > 8);

  const booking = document.getElementById('agendar');
  const bookingTop = booking.getBoundingClientRect().top;
  // El FAB aparece tras el hero y se esconde al llegar al formulario
  fab.classList.toggle('is-visible', y > 520 && bookingTop > window.innerHeight * 0.6);
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------------------------------------------------------
   Animaciones de entrada
   --------------------------------------------------------- */
const revealAll = () =>
  document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-in'));

if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (!entry.isIntersecting) return;
      entry.target.style.transitionDelay = `${Math.min(i * 70, 280)}ms`;
      entry.target.classList.add('is-in');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px' });

  document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

  // Red de seguridad: si algo impide que el observer dispare, muestra todo.
  setTimeout(revealAll, 1500);
} else {
  revealAll();
}

/* Contadores */
const countObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const target = Number(el.dataset.count);
    const duration = 1100;
    const start = performance.now();

    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString('es-MX');
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    countObserver.unobserve(el);
  });
}, { threshold: 0.6 });

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('[data-count]').forEach((el) => countObserver.observe(el));
}

/* ---------------------------------------------------------
   Formulario de clase de prueba
   --------------------------------------------------------- */
const form = document.getElementById('trialForm');
const successBox = document.getElementById('formSuccess');
const successMsg = document.getElementById('successMsg');
const submitBtn = document.getElementById('submitBtn');

const RULES = {
  nombre:   (v) => v.trim().length >= 3 || 'Escribe el nombre completo.',
  telefono: (v) => (v.replace(/\D/g, '').length >= 10) || 'Escribe un número de 10 dígitos.',
  email:    (v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || 'Revisa el formato del correo.',
  alumno:   (v) => v.trim().length >= 2 || 'Escribe el nombre del alumno.',
  edad:     (v) => (Number(v) >= 3 && Number(v) <= 80) || 'Ingresa una edad entre 3 y 80.',
  horario:  (v) => v !== '' || 'Selecciona un horario.',
  aviso:    (v) => v === true || 'Necesitamos tu autorización para contactarte.'
};

const getValue = (name) => {
  const el = form.elements[name];
  if (!el) return '';
  if (el instanceof RadioNodeList) return el.value;
  if (el.type === 'checkbox') return el.checked;
  return el.value;
};

const showError = (name, message) => {
  const msgEl = form.querySelector(`[data-error-for="${name}"]`);
  const input = form.elements[name];
  const field = input instanceof RadioNodeList
    ? form.querySelector('.chips').closest('.field')
    : input.closest('.field');

  if (msgEl) {
    msgEl.textContent = message || '';
    msgEl.classList.toggle('is-visible', Boolean(message));
  }
  if (field) field.classList.toggle('has-error', Boolean(message));
};

const validate = () => {
  let firstInvalid = null;
  Object.entries(RULES).forEach(([name, rule]) => {
    const result = rule(getValue(name));
    const message = result === true ? '' : result;
    showError(name, message);
    if (message && !firstInvalid) firstInvalid = name;
  });
  return firstInvalid;
};

/* Limpia el error al corregir */
form.addEventListener('input', (e) => {
  const name = e.target.name;
  if (RULES[name]) {
    const result = RULES[name](getValue(name));
    if (result === true) showError(name, '');
  }
});
form.addEventListener('change', (e) => {
  const name = e.target.name;
  if (RULES[name]) {
    const result = RULES[name](getValue(name));
    if (result === true) showError(name, '');
  }
});

const buildMessage = (data) => (
  `Hola REIVAJ, quiero agendar una clase de prueba.\n\n` +
  `Contacto: ${data.nombre}\n` +
  `WhatsApp: ${data.telefono}\n` +
  (data.email ? `Correo: ${data.email}\n` : '') +
  `Alumno: ${data.alumno} (${data.edad} años)\n` +
  `Programa: ${data.programa}\n` +
  `Horario preferido: ${data.horario}\n` +
  (data.comentarios ? `Notas: ${data.comentarios}\n` : '')
);

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const invalid = validate();
  if (invalid) {
    const el = form.elements[invalid];
    const node = el instanceof RadioNodeList ? el[0] : el;
    node.focus({ preventScroll: true });
    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const data = Object.fromEntries(new FormData(form).entries());
  submitBtn.disabled = true;
  submitBtn.textContent = 'Enviando...';

  try {
    if (CONFIG.endpoint) {
      const res = await fetch(CONFIG.endpoint, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form)
      });
      if (!res.ok) throw new Error('Respuesta no válida del servidor');
      successMsg.textContent = 'Gracias. Te contactamos por WhatsApp para confirmar el día y la hora de tu clase de prueba.';
    } else {
      const url = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(buildMessage(data))}`;
      window.open(url, '_blank', 'noopener');
      successMsg.textContent = 'Abrimos WhatsApp con tu solicitud lista. Envía el mensaje para confirmar tu lugar.';
    }

    form.hidden = true;
    successBox.hidden = false;
    successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (err) {
    submitBtn.textContent = 'Reintentar envío';
    submitBtn.disabled = false;
    const note = form.querySelector('.form__note');
    note.textContent = 'No pudimos enviar la solicitud. Inténtalo de nuevo o escríbenos por WhatsApp.';
    note.style.color = 'var(--accent-dark)';
  }
});

document.getElementById('resetForm').addEventListener('click', () => {
  form.reset();
  form.querySelectorAll('.has-error').forEach((f) => f.classList.remove('has-error'));
  form.querySelectorAll('.error').forEach((f) => f.classList.remove('is-visible'));
  submitBtn.disabled = false;
  submitBtn.textContent = 'Agendar clase de prueba';
  const note = form.querySelector('.form__note');
  note.textContent = 'Te confirmamos día y hora el mismo día hábil.';
  note.style.color = '';
  successBox.hidden = true;
  form.hidden = false;
  form.elements.nombre.focus();
});

/* ---------------------------------------------------------
   Detalles
   --------------------------------------------------------- */
document.getElementById('whatsappLink').href =
  `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent('Hola, quiero información sobre la clase de prueba en REIVAJ.')}`;

document.getElementById('year').textContent = new Date().getFullYear();

/* Cierra un FAQ abierto al abrir otro */
document.querySelectorAll('.faq details').forEach((d) => {
  d.addEventListener('toggle', () => {
    if (!d.open) return;
    document.querySelectorAll('.faq details').forEach((other) => {
      if (other !== d) other.open = false;
    });
  });
});
