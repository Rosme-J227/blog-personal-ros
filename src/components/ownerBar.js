import { getSession, signOut } from '../lib/auth.js';
import { getSettings, updateDailyImage } from '../lib/settings.js';
import { uploadImage } from '../lib/posts.js';
import { showToast } from './toast.js';
import { showModal } from './modal.js';
import { navigate } from '../router.js';

const PREVIEW_KEY = 'meroros_preview_as_visitor';

/**
 * Returns true if the user is the authenticated owner and NOT in visitor preview mode
 */
export async function isOwnerCreatorMode() {
  const session = await getSession();
  if (!session) return false;
  const isPreview = sessionStorage.getItem(PREVIEW_KEY) === 'true';
  return !isPreview;
}

/**
 * Returns true if the owner is logged in at all (even in visitor preview)
 */
export async function isOwnerLoggedIn() {
  const session = await getSession();
  return Boolean(session);
}

/**
 * Renders the floating toolbar for the site owner
 */
export async function createOwnerBar(onStateChange) {
  const session = await getSession();
  if (!session) return null;

  const isPreview = sessionStorage.getItem(PREVIEW_KEY) === 'true';

  const bar = document.createElement('div');
  bar.className = 'owner-bar';
  bar.id = 'owner-control-bar';

  if (isPreview) {
    bar.classList.add('owner-bar-preview');
    bar.innerHTML = `
      <div class="owner-bar-inner">
        <div class="owner-bar-status">
          <span class="owner-pill-badge pill-visitor">👁️ Vista de Visitante</span>
          <span class="owner-bar-hint">Estás previsualizando la web tal como la ven tus lectores.</span>
        </div>
        <div class="owner-bar-actions">
          <button class="btn btn-sm btn-white" id="owner-toggle-view">↩️ Volver a Modo Creadora</button>
          <a href="#/admin" class="btn btn-sm btn-ghost-white">⚙️ Panel</a>
        </div>
      </div>
    `;

    setTimeout(() => {
      bar.querySelector('#owner-toggle-view')?.addEventListener('click', () => {
        sessionStorage.removeItem(PREVIEW_KEY);
        showToast('Modo Creadora activado ✨', 'success');
        if (onStateChange) onStateChange();
        else window.location.reload();
      });
    }, 0);
  } else {
    bar.innerHTML = `
      <div class="owner-bar-inner">
        <div class="owner-bar-status">
          <span class="owner-pill-badge pill-creator">👑 Modo Creadora (Dueña)</span>
          <span class="owner-bar-hint">Tienes acceso total para publicar y editar.</span>
        </div>
        <div class="owner-bar-actions">
          <button class="btn btn-sm btn-white" id="owner-toggle-view">👁️ Ver como Visitante</button>
          <button class="btn btn-sm btn-accent" id="owner-change-photo">📸 Foto del Día</button>
          <a href="#/admin" class="btn btn-sm btn-ghost-white">➕ Publicar</a>
          <a href="#/admin" class="btn btn-sm btn-ghost-white">⚙️ Panel</a>
          <button class="btn btn-sm btn-ghost-white" id="owner-quick-logout" title="Cerrar sesión">🚪</button>
        </div>
      </div>
    `;

    setTimeout(() => {
      bar.querySelector('#owner-toggle-view')?.addEventListener('click', () => {
        sessionStorage.setItem(PREVIEW_KEY, 'true');
        showToast('Viendo como visitante 👁️', 'info');
        if (onStateChange) onStateChange();
        else window.location.reload();
      });

      bar.querySelector('#owner-change-photo')?.addEventListener('click', () => {
        openDailyPhotoModal(() => {
          if (onStateChange) onStateChange();
          else window.location.reload();
        });
      });

      bar.querySelector('#owner-quick-logout')?.addEventListener('click', async () => {
        await signOut();
        sessionStorage.removeItem(PREVIEW_KEY);
        showToast('Sesión cerrada correctamente', 'info');
        window.location.reload();
      });
    }, 0);
  }

  return bar;
}

/**
 * Modal to edit the Photo of the Day
 */
export async function openDailyPhotoModal(onSuccess) {
  const settings = await getSettings();

  const content = document.createElement('div');
  content.className = 'daily-photo-modal-content';
  content.innerHTML = `
    <p style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:1.25rem;">
      Esta foto aparecerá destacada en la portada para todos tus visitantes con su pie y estado de ánimo.
    </p>

    <div class="form-group">
      <label class="form-label">Subir nueva imagen desde tu equipo</label>
      <input type="file" id="modal-photo-file" accept="image/*" class="form-input" style="padding:0.4rem;" />
      <span class="form-hint">Formatos JPG, PNG, WebP (máx. 5MB)</span>
    </div>

    <div class="form-group" style="text-align:center;margin:0.5rem 0;">
      <span style="font-size:0.8rem;color:var(--text-muted);font-weight:600;">— O PEGA UN ENLACE DE IMAGEN —</span>
    </div>

    <div class="form-group">
      <label class="form-label" for="modal-photo-url">URL de la imagen</label>
      <input type="url" id="modal-photo-url" class="form-input" placeholder="https://ejemplo.com/foto.jpg" value="${settings.daily_image_url || ''}" />
    </div>

    <div class="form-group">
      <label class="form-label" for="modal-photo-mood">Estado de ánimo / Sticker</label>
      <input type="text" id="modal-photo-mood" class="form-input" placeholder="Ej: ✨ Inspirada · ☕ Café de tarde" value="${settings.daily_image_mood || '✨ Inspirada y en calma'}" />
    </div>

    <div class="form-group">
      <label class="form-label" for="modal-photo-caption">Pie de foto / Pensamiento de hoy</label>
      <textarea id="modal-photo-caption" class="form-textarea" rows="3" placeholder="¿Qué significa este momento para ti hoy?">${settings.daily_image_caption || ''}</textarea>
    </div>

    <div id="modal-photo-preview" style="margin-top:1rem;border-radius:16px;overflow:hidden;max-height:200px;display:${settings.daily_image_url ? 'block' : 'none'};background:var(--mist);text-align:center;">
      <img src="${settings.daily_image_url || ''}" id="modal-preview-img" style="max-height:200px;width:100%;object-fit:cover;" alt="Vista previa" />
    </div>
  `;

  // Live preview logic
  const urlInput = content.querySelector('#modal-photo-url');
  const fileInput = content.querySelector('#modal-photo-file');
  const previewDiv = content.querySelector('#modal-photo-preview');
  const previewImg = content.querySelector('#modal-preview-img');

  urlInput.addEventListener('input', () => {
    if (urlInput.value.trim()) {
      previewImg.src = urlInput.value.trim();
      previewDiv.style.display = 'block';
    }
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) {
      previewImg.src = URL.createObjectURL(file);
      previewDiv.style.display = 'block';
    }
  });

  showModal({
    title: '📸 Actualizar Foto del Día',
    content,
    confirmText: 'Guardar y Publicar',
    cancelText: 'Cancelar',
    onConfirm: async () => {
      let finalUrl = urlInput.value.trim();
      const caption = content.querySelector('#modal-photo-caption').value.trim();
      const mood = content.querySelector('#modal-photo-mood').value.trim();

      const file = fileInput.files[0];
      if (file) {
        try {
          showToast('Subiendo imagen...', 'info');
          finalUrl = await uploadImage(file);
        } catch (err) {
          // If storage not configured or failed, use local blob URL or keep current
          console.warn('Storage upload error, using local object url:', err);
          finalUrl = URL.createObjectURL(file);
        }
      }

      await updateDailyImage(finalUrl, caption, mood);
      showToast('¡Foto del día actualizada con éxito! ☀️', 'success');
      if (onSuccess) onSuccess();
    }
  });
}
