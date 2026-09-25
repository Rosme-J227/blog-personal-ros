/**
 * Modal component — accessible confirmation dialog
 */
export function showModal({ icon = '⚠️', title, description, confirmText = 'Confirmar', cancelText = 'Cancelar', confirmClass = 'btn-danger', onConfirm }) {
  // Remove existing modal
  const existing = document.querySelector('.modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', title);

  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-icon">${icon}</div>
      <h2 class="modal-title">${title}</h2>
      <p class="modal-description">${description}</p>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="modal-cancel">${cancelText}</button>
        <button class="btn ${confirmClass}" id="modal-confirm">${confirmText}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Focus trap
  const confirmBtn = overlay.querySelector('#modal-confirm');
  const cancelBtn = overlay.querySelector('#modal-cancel');
  confirmBtn.focus();

  function close() {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 200);
  }

  cancelBtn.addEventListener('click', close);
  confirmBtn.addEventListener('click', () => {
    close();
    if (onConfirm) onConfirm();
  });

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // Close on Escape
  function handleEscape(e) {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', handleEscape);
    }
  }
  document.addEventListener('keydown', handleEscape);
}
