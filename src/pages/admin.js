import { getSession, signOut } from '../lib/auth.js';
import { getAllPosts, createPost, updatePost, moveToTrash, restorePost, deletePostPermanently, uploadImage, deleteImage, getPostById } from '../lib/posts.js';
import { getAllComments, deleteComment, submitComment } from '../lib/comments.js';
import { isSupabaseConfigured } from '../lib/supabase.js';
import { formatDate, sanitizeText, validateImage } from '../lib/utils.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { navigate } from '../router.js';
import { getSettings, updateDailyImage, updateSettings } from '../lib/settings.js';

/**
 * Admin Page — Full admin panel for blog management
 */

let currentTab = 'published';
let editingPostId = null;

export async function renderAdminPage(app) {
  // Auth guard
  const session = await getSession();
  if (!session) {
    navigate('/login');
    return;
  }

  app.innerHTML = '';

  // Check if routed with a post to edit
  const pendingEditId = sessionStorage.getItem('edit_post_id');
  if (pendingEditId) {
    sessionStorage.removeItem('edit_post_id');
    editingPostId = pendingEditId;
    currentTab = 'edit';
  } else {
    editingPostId = null;
    if (currentTab === 'edit') currentTab = 'published';
  }

  // Admin Layout
  const layout = document.createElement('div');
  layout.className = 'admin-layout';

  // Header
  layout.innerHTML = `
    <div class="admin-header">
      <div class="admin-header-inner">
        <div>
          <div style="display:flex;align-items:center;gap:0.5rem;">
            <h1 class="admin-title">Mi espacio ✦</h1>
            <span class="owner-pill-badge pill-creator">Modo Creadora</span>
          </div>
          <p style="font-size:0.88rem;color:var(--text-muted);margin-top:0.2rem;">Escribe, organiza tu muro y cuida la foto del día</p>
        </div>
        <div style="display:flex;gap:var(--space-sm);align-items:center;flex-wrap:wrap;">
          <button class="btn btn-ghost" id="admin-preview-visitor-btn" style="font-size:0.85rem;" title="Ver la web exactamente como un visitante">👁️ Ver como visitante</button>
          <a href="#/" class="btn btn-ghost" style="font-size:0.85rem;">🏠 Ver blog</a>
          <button class="btn btn-secondary" id="logout-btn" style="font-size:0.85rem;">Cerrar sesión</button>
        </div>
      </div>
    </div>
    <div class="admin-tabs" id="admin-tabs">
      <button class="admin-tab ${currentTab === 'published' ? 'active' : ''}" data-tab="published">📝 Publicadas</button>
      <button class="admin-tab ${currentTab === 'daily' ? 'active' : ''}" data-tab="daily">📸 Foto del Día</button>
      <button class="admin-tab ${currentTab === 'drafts' ? 'active' : ''}" data-tab="drafts">📋 Borradores</button>
      <button class="admin-tab ${currentTab === 'trash' ? 'active' : ''}" data-tab="trash">🗑️ Papelera</button>
      <button class="admin-tab ${currentTab === 'comments' ? 'active' : ''}" data-tab="comments">💬 Comentarios</button>
      <button class="admin-tab ${currentTab === 'new' ? 'active' : ''}" data-tab="new">✨ Nueva entrada</button>
    </div>
    <div class="admin-content" id="admin-content"></div>
  `;

  app.appendChild(layout);

  // Visitor Preview Button
  document.getElementById('admin-preview-visitor-btn')?.addEventListener('click', () => {
    sessionStorage.setItem('meroros_preview_as_visitor', 'true');
    showToast('Modo visitante activado 👁️', 'info');
    navigate('/');
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await signOut();
    showToast('Sesión cerrada', 'info');
    navigate('/');
  });

  // Tab navigation
  const tabs = document.querySelectorAll('.admin-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.dataset.tab;
      renderTabContent(currentTab);
    });
  });

  // Initial tab
  renderTabContent(currentTab);
}

async function renderTabContent(tab) {
  const content = document.getElementById('admin-content');
  if (!content) return;

  content.innerHTML = `<div class="loading-page"><div class="loading-spinner"></div></div>`;

  try {
    switch (tab) {
      case 'published':
        await renderPostsList(content, 'published');
        break;
      case 'daily':
        await renderDailyPhotoAdmin(content);
        break;
      case 'drafts':
        await renderPostsList(content, 'draft');
        break;
      case 'trash':
        await renderPostsList(content, 'trash');
        break;
      case 'comments':
        await renderCommentsList(content);
        break;
      case 'new':
        renderEditor(content, null);
        break;
      case 'edit':
        const post = await getPostById(editingPostId);
        renderEditor(content, post);
        break;
    }
  } catch (err) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">😔</div>
        <p class="empty-state-text">Error al cargar</p>
        <p class="empty-state-sub">${sanitizeText(err.message)}</p>
      </div>
    `;
  }
}

// ─── Posts List ───

async function renderPostsList(container, status) {
  const allPosts = await getAllPosts();
  const posts = allPosts.filter(p => p.status === status);

  const labels = {
    published: { empty: 'No hay publicaciones', icon: '📝', sub: 'Crea tu primera entrada desde "Nueva entrada"' },
    draft: { empty: 'No hay borradores', icon: '📋', sub: 'Los borradores aparecerán aquí' },
    trash: { empty: 'La papelera está vacía', icon: '🗑️', sub: 'Las publicaciones eliminadas aparecerán aquí' },
  };
  const label = labels[status];

  if (posts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${label.icon}</div>
        <p class="empty-state-text">${label.empty}</p>
        <p class="empty-state-sub">${label.sub}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'admin-post-list stagger-children';

  posts.forEach(post => {
    const item = document.createElement('div');
    item.className = 'admin-post-item';

    const thumbHtml = post.cover_image_url
      ? `<img src="${sanitizeText(post.cover_image_url)}" alt="" />`
      : `<span style="font-size:1.5rem;">💜</span>`;

    const statusBadge = `<span class="status-badge ${post.status}">${post.status === 'published' ? 'Publicada' : post.status === 'draft' ? 'Borrador' : 'Papelera'}</span>`;

    item.innerHTML = `
      <div class="admin-post-thumb">${thumbHtml}</div>
      <div class="admin-post-info">
        <p class="admin-post-title">${sanitizeText(post.title || 'Sin título')}</p>
        <p class="admin-post-meta">${formatDate(post.created_at)} · ${statusBadge}</p>
      </div>
      <div class="admin-post-actions"></div>
    `;

    const actions = item.querySelector('.admin-post-actions');

    if (status === 'published' || status === 'draft') {
      // Edit button
      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-ghost';
      editBtn.textContent = '✏️ Editar';
      editBtn.addEventListener('click', () => {
        editingPostId = post.id;
        // Switch to edit tab
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        renderTabContent('edit');
      });
      actions.appendChild(editBtn);

      if (status === 'draft') {
        const publishBtn = document.createElement('button');
        publishBtn.className = 'btn btn-primary';
        publishBtn.style.fontSize = '0.85rem';
        publishBtn.textContent = '🚀 Publicar';
        publishBtn.addEventListener('click', async () => {
          try {
            await updatePost(post.id, { status: 'published' });
            showToast('¡Publicación publicada! 🎉', 'success');
            renderTabContent(currentTab);
          } catch (err) {
            showToast('Error al publicar', 'error');
          }
        });
        actions.appendChild(publishBtn);
      }

      // Trash button
      const trashBtn = document.createElement('button');
      trashBtn.className = 'btn btn-ghost';
      trashBtn.style.color = 'var(--danger)';
      trashBtn.textContent = '🗑️';
      trashBtn.title = 'Mover a papelera';
      trashBtn.addEventListener('click', async () => {
        try {
          await moveToTrash(post.id);
          showToast('Movida a papelera', 'info');
          renderTabContent(currentTab);
        } catch (err) {
          showToast('Error', 'error');
        }
      });
      actions.appendChild(trashBtn);
    }

    if (status === 'trash') {
      // Restore
      const restoreBtn = document.createElement('button');
      restoreBtn.className = 'btn btn-secondary';
      restoreBtn.style.fontSize = '0.85rem';
      restoreBtn.textContent = '♻️ Restaurar';
      restoreBtn.addEventListener('click', async () => {
        try {
          await restorePost(post.id);
          showToast('Publicación restaurada como borrador', 'success');
          renderTabContent(currentTab);
        } catch (err) {
          showToast('Error al restaurar', 'error');
        }
      });
      actions.appendChild(restoreBtn);

      // Delete permanently
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-danger';
      deleteBtn.style.fontSize = '0.85rem';
      deleteBtn.textContent = '💀 Eliminar';
      deleteBtn.addEventListener('click', () => {
        showModal({
          icon: '⚠️',
          title: '¿Eliminar para siempre?',
          description: `"${sanitizeText(post.title)}" se eliminará permanentemente. Esta acción no se puede deshacer.`,
          confirmText: 'Eliminar para siempre',
          cancelText: 'Cancelar',
          confirmClass: 'btn-danger',
          onConfirm: async () => {
            try {
              if (post.cover_image_url) await deleteImage(post.cover_image_url);
              await deletePostPermanently(post.id);
              showToast('Eliminada permanentemente', 'success');
              renderTabContent(currentTab);
            } catch (err) {
              showToast('Error al eliminar', 'error');
            }
          },
        });
      });
      actions.appendChild(deleteBtn);
    }

    list.appendChild(item);
  });

  container.appendChild(list);
}

// ─── Editor ───

function renderEditor(container, post) {
  const isEdit = !!post;

  container.innerHTML = `
    <div class="editor-container">
      <div class="editor-header">
        <h2 style="font-size:1.3rem;">${isEdit ? '✏️ Editar entrada' : '✨ Nueva entrada'}</h2>
        <button class="btn btn-ghost" id="editor-cancel">Cancelar</button>
      </div>
      <div class="editor-fields">
        <div class="form-group">
          <input type="text" class="editor-title-input" id="editor-title" placeholder="Título de tu idea..." value="${isEdit ? sanitizeText(post.title) : ''}" maxlength="200" />
        </div>
        
        <div class="form-group">
          <label class="form-label">Contenido</label>
          <textarea class="form-input editor-content-input" id="editor-content" placeholder="Escribe tu idea aquí...">${isEdit ? sanitizeText(post.content || '') : ''}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Etiquetas (separadas por coma)</label>
          <input type="text" class="form-input editor-tags-input" id="editor-tags" placeholder="reflexión, ideas, personal" value="${isEdit && post.tags ? post.tags.join(', ') : ''}" />
        </div>

        <div class="form-group">
          <label class="form-label">Imagen representativa</label>
          <div id="editor-image-area">
            ${isEdit && post.cover_image_url
              ? `<div class="editor-image-preview" id="editor-preview">
                  <img src="${sanitizeText(post.cover_image_url)}" alt="Vista previa" />
                  <button class="btn btn-icon btn-danger editor-image-remove" id="remove-image" title="Quitar imagen">✕</button>
                </div>`
              : `<div class="editor-image-upload" id="editor-upload">
                  <p style="font-size:2rem;margin-bottom:var(--space-sm);">📷</p>
                  <p style="color:var(--text-secondary);">Haz clic o arrastra una imagen aquí</p>
                  <p style="font-size:0.82rem;color:var(--text-muted);margin-top:var(--space-xs);">JPG, PNG, WebP o GIF · Máximo 5MB</p>
                </div>`
            }
            <input type="file" id="editor-file-input" accept="image/jpeg,image/png,image/webp,image/gif" style="display:none;" />
          </div>
        </div>
      </div>

      <div class="editor-actions">
        <button class="btn btn-secondary" id="save-draft-btn">📋 Guardar borrador</button>
        <button class="btn btn-primary" id="publish-btn">🚀 ${isEdit && post.status === 'published' ? 'Guardar cambios' : 'Publicar'}</button>
      </div>
    </div>
  `;

  let imageUrl = isEdit ? post?.cover_image_url || null : null;
  let newImageFile = null;

  // Cancel
  container.querySelector('#editor-cancel').addEventListener('click', () => {
    currentTab = 'published';
    document.querySelectorAll('.admin-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === 'published');
    });
    renderTabContent('published');
  });

  // Image upload handling
  const fileInput = container.querySelector('#editor-file-input');
  const imageArea = container.querySelector('#editor-image-area');

  function setupUploadArea() {
    const upload = container.querySelector('#editor-upload');
    if (upload) {
      upload.addEventListener('click', () => fileInput.click());
      upload.addEventListener('dragover', (e) => { e.preventDefault(); upload.style.borderColor = 'var(--violet)'; });
      upload.addEventListener('dragleave', () => { upload.style.borderColor = 'var(--line)'; });
      upload.addEventListener('drop', (e) => {
        e.preventDefault();
        upload.style.borderColor = 'var(--line)';
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
      });
    }
  }

  setupUploadArea();

  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleFile(fileInput.files[0]);
  });

  function handleFile(file) {
    const validation = validateImage(file);
    if (!validation.valid) {
      showToast(validation.error, 'error');
      return;
    }

    newImageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      imageArea.innerHTML = `
        <div class="editor-image-preview" id="editor-preview">
          <img src="${e.target.result}" alt="Vista previa" />
          <button class="btn btn-icon btn-danger editor-image-remove" id="remove-image" title="Quitar imagen">✕</button>
        </div>
      `;
      container.querySelector('#remove-image').addEventListener('click', () => {
        newImageFile = null;
        imageUrl = null;
        imageArea.innerHTML = `
          <div class="editor-image-upload" id="editor-upload">
            <p style="font-size:2rem;margin-bottom:var(--space-sm);">📷</p>
            <p style="color:var(--text-secondary);">Haz clic o arrastra una imagen aquí</p>
            <p style="font-size:0.82rem;color:var(--text-muted);margin-top:var(--space-xs);">JPG, PNG, WebP o GIF · Máximo 5MB</p>
          </div>
        `;
        setupUploadArea();
      });
    };
    reader.readAsDataURL(file);
  }

  // Remove existing image
  const removeBtn = container.querySelector('#remove-image');
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      imageUrl = null;
      newImageFile = null;
      imageArea.innerHTML = `
        <div class="editor-image-upload" id="editor-upload">
          <p style="font-size:2rem;margin-bottom:var(--space-sm);">📷</p>
          <p style="color:var(--text-secondary);">Haz clic o arrastra una imagen aquí</p>
          <p style="font-size:0.82rem;color:var(--text-muted);margin-top:var(--space-xs);">JPG, PNG, WebP o GIF · Máximo 5MB</p>
        </div>
      `;
      setupUploadArea();
    });
  }

  // Save/Publish
  async function savePost(status) {
    const title = container.querySelector('#editor-title').value.trim();
    const content = container.querySelector('#editor-content').value.trim();
    const tagsStr = container.querySelector('#editor-tags').value.trim();
    const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(t => t) : [];

    if (!title) {
      showToast('El título no puede estar vacío', 'warning');
      container.querySelector('#editor-title').focus();
      return;
    }

    const btn = status === 'published' ? container.querySelector('#publish-btn') : container.querySelector('#save-draft-btn');
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = '⏳ Guardando...';

    try {
      // Upload new image if selected
      let finalImageUrl = imageUrl;
      if (newImageFile) {
        finalImageUrl = await uploadImage(newImageFile);
        // Delete old image if replacing
        if (isEdit && post.cover_image_url && post.cover_image_url !== finalImageUrl) {
          await deleteImage(post.cover_image_url);
        }
      }

      const data = {
        title,
        content,
        excerpt: content.substring(0, 160),
        tags,
        cover_image_url: finalImageUrl,
        status,
      };

      if (isEdit) {
        await updatePost(post.id, data);
        showToast(status === 'published' ? '¡Cambios guardados! 🎉' : 'Borrador guardado 📋', 'success');
      } else {
        await createPost(data);
        showToast(status === 'published' ? '¡Publicación creada! 🎉' : 'Borrador guardado 📋', 'success');
      }

      // Navigate back to list
      currentTab = status === 'published' ? 'published' : 'drafts';
      document.querySelectorAll('.admin-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === currentTab);
      });
      renderTabContent(currentTab);
    } catch (err) {
      showToast(err.message || 'Error al guardar', 'error');
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  container.querySelector('#save-draft-btn').addEventListener('click', () => savePost('draft'));
  container.querySelector('#publish-btn').addEventListener('click', () => {
    if (isEdit && post.status === 'published') {
      savePost('published');
    } else {
      savePost('published');
    }
  });
}

// ─── Comments Management ───

async function renderCommentsList(container) {
  const comments = await getAllComments();

  if (comments.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">💬</div>
        <p class="empty-state-text">No hay comentarios</p>
        <p class="empty-state-sub">Los comentarios de los visitantes aparecerán aquí.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `<h2 style="margin-bottom:var(--space-lg);font-size:1.3rem;">💬 Todos los comentarios (${comments.length})</h2>`;

  const list = document.createElement('div');
  list.className = 'admin-post-list stagger-children';

  comments.forEach(comment => {
    const item = document.createElement('div');
    item.className = 'comment-item';
    item.style.marginBottom = 'var(--space-md)';

    const authorClass = comment.is_owner_reply ? 'comment-author owner' : 'comment-author';
    const authorName = comment.is_owner_reply ? "MeroRosDay's" : sanitizeText(comment.display_name || 'Anónimo');
    const postTitle = comment.posts ? sanitizeText(comment.posts.title) : 'Post eliminado';

    const bodyDiv = document.createElement('div');
    bodyDiv.className = 'comment-body';
    bodyDiv.textContent = comment.body;

    item.innerHTML = `
      <div class="comment-header">
        <span class="${authorClass}">${authorName}</span>
        <span class="comment-date">${formatDate(comment.created_at)}</span>
      </div>
    `;
    item.appendChild(bodyDiv);

    const metaDiv = document.createElement('div');
    metaDiv.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-top:var(--space-sm);';

    const postLink = document.createElement('span');
    postLink.style.cssText = 'font-size:0.82rem;color:var(--text-muted);';
    postLink.textContent = `En: ${postTitle}`;
    metaDiv.appendChild(postLink);

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-ghost';
    delBtn.style.cssText = 'font-size:0.82rem;color:var(--danger);';
    delBtn.textContent = '🗑️ Eliminar';
    delBtn.addEventListener('click', async () => {
      if (confirm('¿Eliminar este comentario?')) {
        try {
          await deleteComment(comment.id);
          item.remove();
          showToast('Comentario eliminado', 'success');
        } catch (err) {
          showToast('Error', 'error');
        }
      }
    });
    metaDiv.appendChild(delBtn);

    item.appendChild(metaDiv);
    list.appendChild(item);
  });

  container.appendChild(list);
}

// ─── Daily Photo Admin Tab ───
async function renderDailyPhotoAdmin(container) {
  const settings = await getSettings();
  container.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.className = 'editor-wrap';
  wrap.innerHTML = `
    <div style="margin-bottom:1.5rem;">
      <h2 style="font-family:var(--font-heading);font-size:1.5rem;">📸 Gestión de la Foto del Día</h2>
      <p style="font-size:0.88rem;color:var(--text-muted);margin-top:0.25rem;">
        Esta foto es la protagonista de la portada. Tus lectores la verán con su pie y podrán dejarte corazones de me gusta.
      </p>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;align-items:start;">
      <div>
        <div class="form-group">
          <label class="form-label">Subir nueva imagen</label>
          <input type="file" id="admin-daily-file" accept="image/*" class="form-input" style="padding:0.4rem;" />
        </div>

        <div class="form-group">
          <label class="form-label" for="admin-daily-url">O ingresar URL de imagen</label>
          <input type="url" id="admin-daily-url" class="form-input" placeholder="https://..." value="${settings.daily_image_url || ''}" />
        </div>

        <div class="form-group">
          <label class="form-label" for="admin-daily-mood">Estado de ánimo / Sticker</label>
          <input type="text" id="admin-daily-mood" class="form-input" placeholder="Ej: ✨ Inspirada · ☕ Café de tarde" value="${settings.daily_image_mood || '✨ Inspirada y en calma'}" />
        </div>

        <div class="form-group">
          <label class="form-label" for="admin-daily-caption">Pie de foto / Pensamiento de hoy</label>
          <textarea id="admin-daily-caption" class="form-textarea" rows="4" placeholder="¿Qué quieres transmitir hoy con esta imagen?">${settings.daily_image_caption || ''}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label" for="admin-daily-phrase">Frase del día (Barra 'Hoy')</label>
          <input type="text" id="admin-daily-phrase" class="form-input" placeholder="Frase corta que aparece en la franja superior" value="${settings.daily_phrase || ''}" />
        </div>

        <div style="display:flex;gap:1rem;margin-top:1.5rem;">
          <button class="btn btn-primary btn-pill" id="btn-save-daily-admin">💾 Guardar cambios</button>
          <a href="#/" class="btn btn-secondary btn-pill">Ver cómo quedó</a>
        </div>
      </div>

      <!-- Preview Polaroid -->
      <div>
        <p style="font-size:0.85rem;font-weight:700;color:var(--text-muted);margin-bottom:0.75rem;text-transform:uppercase;">Vista previa en portada</p>
        <div class="polaroid-frame" style="max-width:340px;margin:0 auto;">
          <div class="washi-tape"></div>
          <div class="polaroid-img-wrap" style="height:260px;">
            <img src="${settings.daily_image_url || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1000&q=80'}" id="admin-daily-preview-img" style="width:100%;height:100%;object-fit:cover;" alt="Vista previa" />
          </div>
          <p class="polaroid-caption-small" id="admin-daily-preview-mood">${settings.daily_image_mood || '✨ Inspirada y en calma'}</p>
        </div>
        <p style="text-align:center;font-size:0.82rem;color:var(--text-muted);margin-top:1rem;font-style:italic;" id="admin-daily-preview-caption">
          "${settings.daily_image_caption || 'La luz de hoy se cuela entre las ramas.'}"
        </p>
      </div>
    </div>
  `;

  container.appendChild(wrap);

  const fileInput = wrap.querySelector('#admin-daily-file');
  const urlInput = wrap.querySelector('#admin-daily-url');
  const moodInput = wrap.querySelector('#admin-daily-mood');
  const captionInput = wrap.querySelector('#admin-daily-caption');
  const phraseInput = wrap.querySelector('#admin-daily-phrase');
  const previewImg = wrap.querySelector('#admin-daily-preview-img');
  const previewMood = wrap.querySelector('#admin-daily-preview-mood');
  const previewCaption = wrap.querySelector('#admin-daily-preview-caption');

  urlInput.addEventListener('input', () => {
    if (urlInput.value.trim()) previewImg.src = urlInput.value.trim();
  });
  fileInput.addEventListener('change', () => {
    const f = fileInput.files[0];
    if (f) previewImg.src = URL.createObjectURL(f);
  });
  moodInput.addEventListener('input', () => {
    previewMood.textContent = moodInput.value.trim() || '✨ Momento del día';
  });
  captionInput.addEventListener('input', () => {
    previewCaption.textContent = `"${captionInput.value.trim()}"`;
  });

  wrap.querySelector('#btn-save-daily-admin').addEventListener('click', async () => {
    const btn = wrap.querySelector('#btn-save-daily-admin');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
      let finalUrl = urlInput.value.trim();
      const f = fileInput.files[0];
      if (f) {
        try {
          showToast('Subiendo foto...', 'info');
          finalUrl = await uploadImage(f);
        } catch (e) {
          finalUrl = URL.createObjectURL(f);
        }
      }

      await updateDailyImage(finalUrl, captionInput.value.trim(), moodInput.value.trim());
      if (phraseInput.value.trim()) {
        await updateSettings({ daily_phrase: phraseInput.value.trim() });
      }

      showToast('¡Foto del día y ajustes guardados con éxito! ☀️', 'success');
    } catch (err) {
      showToast('Error al guardar', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '💾 Guardar cambios';
    }
  });
}

