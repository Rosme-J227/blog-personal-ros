/**
 * Toast notification system
 */
const TOAST_DURATION = 4000;

let container = null;

function ensureContainer() {
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('role', 'status');
    document.body.appendChild(container);
  }
  return container;
}

export function showToast(message, type = 'info') {
  const c = ensureContainer();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = { success: '✓', error: '✕', warning: '⚠', info: '💬' };

  const msgSpan = document.createElement('span');
  msgSpan.className = 'toast-message';
  msgSpan.textContent = `${icons[type] || ''} ${message}`;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-close';
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', 'Cerrar notificación');
  closeBtn.addEventListener('click', () => removeToast(toast));

  toast.appendChild(msgSpan);
  toast.appendChild(closeBtn);
  c.appendChild(toast);

  setTimeout(() => removeToast(toast), TOAST_DURATION);
}

function removeToast(toast) {
  if (!toast.parentNode) return;
  toast.style.opacity = '0';
  toast.style.transform = 'translateX(50px)';
  toast.style.transition = 'all 0.3s ease';
  setTimeout(() => toast.remove(), 300);
}
