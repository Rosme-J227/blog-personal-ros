/**
 * Visitor ID — unique per browser, stored in localStorage.
 * Used to track likes/reactions without requiring accounts.
 */
export function getVisitorId() {
  let id = localStorage.getItem('mrd_visitor_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('mrd_visitor_id', id);
  }
  return id;
}

/**
 * Sanitize text to prevent XSS — never use innerHTML with user content.
 */
export function sanitizeText(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Format date in Spanish
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format relative time
 */
export function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Ahora mismo';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays}d`;
  return formatDate(dateStr);
}

/**
 * Create a URL-safe slug from a title
 */
export function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 80);
}

/**
 * Generate today's date formatted in Spanish
 */
export function getTodayFormatted() {
  const now = new Date();
  const options = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };
  let str = now.toLocaleDateString('es-ES', options);
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Debounce utility
 */
export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Validate image file
 */
export function validateImage(file) {
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Tipo de archivo no permitido. Usa JPG, PNG, WebP o GIF.' };
  }
  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'La imagen es demasiado grande. Máximo 5MB.' };
  }
  return { valid: true };
}
