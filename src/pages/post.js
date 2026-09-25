import { getPostBySlug, togglePostLike, hasVisitorLikedPost, getPostLikesCount } from '../lib/posts.js';
import { getCommentsByPostId, submitComment, toggleCommentReaction, getCommentReactionCounts, getCommentReaction, deleteComment } from '../lib/comments.js';
import { formatDate, formatRelativeTime, sanitizeText, getVisitorId } from '../lib/utils.js';
import { getSession } from '../lib/auth.js';
import { isSupabaseConfigured } from '../lib/supabase.js';
import { showToast } from '../components/toast.js';
import { navigate } from '../router.js';
import { createFooter } from './home.js';
import { createOwnerBar, isOwnerCreatorMode } from '../components/ownerBar.js';

/**
 * Post Detail Page — Full post view with likes and comments
 */
export async function renderPostPage(app, { slug }) {
  app.innerHTML = '';
  const isCreator = await isOwnerCreatorMode();

  // ─── 0. Barra de Dueña si ha iniciado sesión ───
  const ownerBar = await createOwnerBar(() => renderPostPage(app, { slug }));
  if (ownerBar) {
    app.appendChild(ownerBar);
  }

  // Navbar (simplified for post page)
  const nav = document.createElement('nav');
  nav.className = 'navbar scrolled';
  nav.innerHTML = `
    <div class="navbar-inner">
      <a href="#/" class="navbar-logo">
        <span style="font-family:var(--font-heading);">MeroRosDay's</span>
      </a>
      <ul class="navbar-links" style="display:flex;">
        <li><a href="#/">← Volver al inicio</a></li>
        ${isCreator ? `<li><a href="#/admin" class="btn btn-sm btn-primary btn-pill">👑 Panel Dueña</a></li>` : ''}
      </ul>
    </div>
  `;
  app.appendChild(nav);

  // Loading
  const main = document.createElement('main');
  main.className = 'post-detail';
  main.innerHTML = `<div class="loading-page"><div class="loading-spinner"></div></div>`;
  app.appendChild(main);

  try {
    let post = null;
    if (isSupabaseConfigured) {
      post = await getPostBySlug(slug);
    }

    if (!post) {
      // Fallback for demo posts
      post = getDemoPost(slug);
    }

    if (!post) {
      main.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <p class="empty-state-text">Publicación no encontrada</p>
          <p class="empty-state-sub">Puede que haya sido eliminada o movida.</p>
          <br/>
          <a href="#/" class="btn btn-secondary btn-pill">Volver al inicio</a>
        </div>
      `;
      return;
    }


    // Update page title
    document.title = `${post.title} — MeroRosDay's`;

    const visitorId = getVisitorId();
    const session = await getSession();
    const isOwner = !!session;

    // Render post
    await renderPostContent(main, post, visitorId, isOwner);

  } catch (err) {
    main.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">😔</div>
        <p class="empty-state-text">Error al cargar</p>
        <p class="empty-state-sub">${sanitizeText(err.message)}</p>
      </div>
    `;
  }

  app.appendChild(createFooter());
}

async function renderPostContent(container, post, visitorId, isOwner) {
  const likesCount = await getPostLikesCount(post.id);
  const isLiked = await hasVisitorLikedPost(post.id, visitorId);

  // Cover image
  const coverHtml = post.cover_image_url
    ? `<div class="post-detail-cover">
        <img src="${sanitizeText(post.cover_image_url)}" alt="${sanitizeText(post.title)}" />
       </div>`
    : '';

  // Tags
  const tagsHtml = (post.tags || []).map(t => `<span class="tag">${sanitizeText(t)}</span>`).join(' ');

  // Build content - convert newlines to paragraphs
  const contentHtml = (post.content || '').split('\n').filter(p => p.trim()).map(p => {
    const div = document.createElement('p');
    div.textContent = p;
    return div.outerHTML;
  }).join('');

  container.innerHTML = `
    <button class="post-detail-back" id="back-btn">← Volver al inicio</button>
    ${coverHtml}
    <div class="post-detail-meta">
      <span class="post-detail-date">${formatDate(post.published_at || post.created_at)}</span>
      ${tagsHtml}
    </div>
    <h1 class="post-detail-title">${sanitizeText(post.title)}</h1>
    <div class="post-detail-content">${contentHtml}</div>
    
    <div class="post-detail-like-section">
      <button class="like-button ${isLiked ? 'liked' : ''}" id="like-btn" aria-label="Me gusta">
        <span class="heart">${isLiked ? '❤️' : '🤍'}</span>
        <span class="like-count">${likesCount} ${likesCount === 1 ? 'me gusta' : 'me gusta'}</span>
      </button>
    </div>

    <div class="comments-section" id="comments-section">
      <div class="loading-page"><div class="loading-spinner"></div></div>
    </div>
  `;

  // Back button
  container.querySelector('#back-btn').addEventListener('click', () => navigate('/'));

  // Like button
  const likeBtn = container.querySelector('#like-btn');
  likeBtn.addEventListener('click', async () => {
    try {
      const nowLiked = await togglePostLike(post.id, visitorId);
      likeBtn.classList.toggle('liked', nowLiked);
      likeBtn.querySelector('.heart').textContent = nowLiked ? '❤️' : '🤍';
      const newCount = await getPostLikesCount(post.id);
      likeBtn.querySelector('.like-count').textContent = `${newCount} me gusta`;
    } catch (err) {
      showToast('No se pudo registrar tu like', 'error');
    }
  });

  // Load comments
  await loadComments(container.querySelector('#comments-section'), post.id, visitorId, isOwner);
}

async function loadComments(section, postId, visitorId, isOwner) {
  try {
    const comments = await getCommentsByPostId(postId);

    let html = `
      <h2 class="comments-title">
        Respuestas <span class="comments-count">${comments.length}</span>
      </h2>
      <div class="comment-form" id="comment-form">
        <p class="comment-form-title">💬 ¿Algo que decir? Déjame tu respuesta</p>
        <div class="comment-form-fields">
          <div class="form-group">
            <label for="comment-name" class="form-label">Tu nombre (opcional)</label>
            <input type="text" id="comment-name" class="form-input" placeholder="Anónimo" maxlength="80" />
          </div>
          <div class="form-group">
            <label for="comment-body" class="form-label">Tu mensaje *</label>
            <textarea id="comment-body" class="form-input form-textarea" placeholder="Escribe lo que piensas..." maxlength="2000" required></textarea>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span id="char-count" style="font-size:0.8rem;color:var(--text-muted);">0/2000</span>
            <button class="btn btn-primary" id="submit-comment-btn">Enviar respuesta</button>
          </div>
        </div>
      </div>
      <div class="comments-list" id="comments-list"></div>
    `;

    section.innerHTML = html;

    // Render comments
    const commentsList = section.querySelector('#comments-list');
    for (const comment of comments) {
      const el = await createCommentElement(comment, visitorId, isOwner, postId, commentsList);
      commentsList.appendChild(el);
    }

    if (comments.length === 0) {
      commentsList.innerHTML = `
        <div class="empty-state" style="padding:var(--space-xl) 0;">
          <p class="empty-state-text" style="font-size:1rem;">Aún no hay respuestas</p>
          <p class="empty-state-sub">¡Sé la primera persona en responder! 💜</p>
        </div>
      `;
    }

    // Character counter
    const bodyField = section.querySelector('#comment-body');
    const charCount = section.querySelector('#char-count');
    bodyField.addEventListener('input', () => {
      charCount.textContent = `${bodyField.value.length}/2000`;
    });

    // Submit comment
    const submitBtn = section.querySelector('#submit-comment-btn');
    submitBtn.addEventListener('click', async () => {
      const name = section.querySelector('#comment-name').value;
      const body = bodyField.value;

      if (!body.trim()) {
        showToast('Escribe un mensaje antes de enviar', 'warning');
        bodyField.focus();
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Enviando...';

      try {
        const newComment = await submitComment({
          postId,
          displayName: name,
          body,
          isOwnerReply: isOwner,
        });

        showToast('¡Respuesta enviada! 💜', 'success');

        // Clear form
        section.querySelector('#comment-name').value = '';
        bodyField.value = '';
        charCount.textContent = '0/2000';

        // Add new comment to list
        const emptyState = commentsList.querySelector('.empty-state');
        if (emptyState) emptyState.remove();

        const el = await createCommentElement(newComment, visitorId, isOwner, postId, commentsList);
        commentsList.appendChild(el);

        // Update count
        const countBadge = section.querySelector('.comments-count');
        countBadge.textContent = parseInt(countBadge.textContent) + 1;

      } catch (err) {
        showToast(err.message || 'Error al enviar', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar respuesta';
      }
    });

  } catch (err) {
    section.innerHTML = `
      <div class="empty-state">
        <p class="empty-state-text">Error al cargar respuestas</p>
      </div>
    `;
  }
}

async function createCommentElement(comment, visitorId, isOwner, postId, commentsList) {
  const el = document.createElement('div');
  el.className = `comment-item ${comment.is_owner_reply ? 'owner-reply' : ''}`;
  el.id = `comment-${comment.id}`;

  const reactions = await getCommentReactionCounts(comment.id);
  const myReaction = await getCommentReaction(comment.id, visitorId);

  const authorClass = comment.is_owner_reply ? 'comment-author owner' : 'comment-author';
  const authorName = comment.is_owner_reply ? 'MeroRosDay\'s' : sanitizeText(comment.display_name || 'Anónimo');

  // Admin actions
  const adminHtml = isOwner ? `
    <div class="comment-admin-actions">
      <button class="comment-admin-btn reply-btn" data-id="${comment.id}" title="Responder">💬</button>
      <button class="comment-admin-btn delete comment-delete-btn" data-id="${comment.id}" title="Eliminar">🗑️</button>
    </div>
  ` : '';

  const bodyDiv = document.createElement('div');
  bodyDiv.className = 'comment-body';
  bodyDiv.textContent = comment.body;

  el.innerHTML = `
    <div class="comment-header">
      <span class="${authorClass}">${authorName}</span>
      <span class="comment-date">${formatRelativeTime(comment.created_at)}</span>
    </div>
  `;
  el.appendChild(bodyDiv);

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'comment-actions';
  actionsDiv.innerHTML = `
    <button class="comment-reaction-btn like-reaction ${myReaction === 'like' ? 'active-like' : ''}" data-id="${comment.id}" data-type="like">
      👍 <span class="reaction-count">${reactions.likes || ''}</span>
    </button>
    <button class="comment-reaction-btn dislike-reaction ${myReaction === 'dislike' ? 'active-dislike' : ''}" data-id="${comment.id}" data-type="dislike">
      👎 <span class="reaction-count">${reactions.dislikes || ''}</span>
    </button>
    ${adminHtml}
  `;
  el.appendChild(actionsDiv);

  // Reaction handlers
  actionsDiv.querySelectorAll('.comment-reaction-btn[data-type]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        const type = btn.dataset.type;
        const result = await toggleCommentReaction(comment.id, visitorId, type);

        // Update UI
        const allBtns = el.querySelectorAll('.comment-reaction-btn[data-type]');
        allBtns.forEach(b => {
          b.classList.remove('active-like', 'active-dislike');
        });
        if (result) {
          btn.classList.add(result === 'like' ? 'active-like' : 'active-dislike');
        }

        // Update counts
        const newCounts = await getCommentReactionCounts(comment.id);
        el.querySelector('.like-reaction .reaction-count').textContent = newCounts.likes || '';
        el.querySelector('.dislike-reaction .reaction-count').textContent = newCounts.dislikes || '';
      } catch (err) {
        showToast('Error al reaccionar', 'error');
      }
    });
  });

  // Admin: delete comment
  const deleteBtn = el.querySelector('.comment-delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (confirm('¿Eliminar este comentario?')) {
        try {
          await deleteComment(comment.id);
          el.remove();
          showToast('Comentario eliminado', 'success');
        } catch (err) {
          showToast('Error al eliminar', 'error');
        }
      }
    });
  }

  // Admin: reply
  const replyBtn = el.querySelector('.reply-btn');
  if (replyBtn) {
    replyBtn.addEventListener('click', () => {
      // Check if reply form already exists
      if (el.querySelector('.reply-form')) return;

      const form = document.createElement('div');
      form.className = 'reply-form';
      form.innerHTML = `
        <input type="text" placeholder="Tu respuesta..." maxlength="2000" class="reply-input" />
        <button class="btn btn-primary" style="font-size:0.85rem;padding:0.5rem 1rem;">Responder</button>
      `;
      el.appendChild(form);

      const input = form.querySelector('.reply-input');
      input.focus();

      form.querySelector('.btn').addEventListener('click', async () => {
        const body = input.value.trim();
        if (!body) return;

        try {
          const reply = await submitComment({
            postId,
            displayName: "MeroRosDay's",
            body,
            isOwnerReply: true,
            parentCommentId: comment.id,
          });

          showToast('Respuesta enviada 💜', 'success');
          form.remove();

          const replyEl = await createCommentElement(reply, visitorId, isOwner, postId, commentsList);
          // Insert after current comment
          if (el.nextSibling) {
            commentsList.insertBefore(replyEl, el.nextSibling);
          } else {
            commentsList.appendChild(replyEl);
          }
        } catch (err) {
          showToast('Error al responder', 'error');
        }
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') form.querySelector('.btn').click();
        if (e.key === 'Escape') form.remove();
      });
    });
  }

  return el;
}

function getDemoPost(slug) {
  const demos = {
    'el-arte-de-escribir-sin-prisas': {
      id: 'demo-1',
      title: 'El arte de escribir sin prisas: por qué decidí abrir este muro',
      slug: 'el-arte-de-escribir-sin-prisas',
      excerpt: 'Vivimos corriendo de una notificación a otra. Este blog nació de la necesidad de tener un lugar tranquilo para pensar en voz alta y conectar de verdad.',
      content: `Vivimos corriendo de una notificación a otra, de una pantalla a la siguiente, sintiendo casi siempre que llegamos tarde a algún sitio invisible.\n\nEste blog nació de una necesidad muy simple: tener un rincón tranquilo para pensar en voz alta, sin la prisa de los algoritmos ni la obligación de gustarle a todo el mundo.\n\nAquí las palabras pueden respirar. No hay métricas de vanidad que importen, solo pensamientos sinceros, capturas de momentos que valieron la pena y un buzón abierto para quien quiera dejar una nota en la mesa.\n\nGracias por tomarte el tiempo de leer esto. Si algo de lo que leíste resonó contigo, me encantaría leerte abajo en los comentarios.`,
      cover_image_url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=700&q=80',
      tags: ['reflexion', 'comienzos', 'escritura'],
      published_at: new Date(Date.now() - 86400000).toISOString(),
    },
    'cosas-diminutas-que-hoy-me-parecieron-magicas': {
      id: 'demo-2',
      title: 'Cosas diminutas que hoy me parecieron mágicas',
      slug: 'cosas-diminutas-que-hoy-me-parecieron-magicas',
      excerpt: 'El olor a café recién colado, la sombra de una planta bailando en la pared y una canción vieja que saltó de sorpresa en la radio.',
      content: `Hoy me propuse prestarle atención a lo que solemos pasar por alto.\n\n1. El primer sorbo de café cuando la casa todavía está en silencio.\n2. La forma en que la luz de las cuatro de la tarde entra por la ventana y dibuja sombras geométricas en el suelo.\n3. Una canción que no escuchaba hace tres años y que me transportó a una tarde de risas con amigos.\n\nA veces la felicidad no es un gran evento anunciado, sino una suma discreta de detalles amables. ¿Qué detalle pequeño te alegró hoy el día?`,
      cover_image_url: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=700&q=80',
      tags: ['vida cotidiana', 'gratitud', 'momentos'],
      published_at: new Date(Date.now() - 172800000).toISOString(),
    },
    'crear-aunque-de-miedo': {
      id: 'demo-3',
      title: 'Crear aunque dé miedo: abrazar lo imperfecto',
      slug: 'crear-aunque-de-miedo',
      excerpt: 'A veces esperamos el momento ideal o la idea perfecta. Pero las mejores cosas suelen nacer de bocetos desordenados y ganas de intentarlo.',
      content: `El perfeccionismo es un disfraz muy elegante que se pone el miedo.\n\nPasé semanas pensando en cómo debía ser este blog: qué tipografía, qué colores, qué temas exactos. Hasta que me di cuenta de que lo más valioso no es la perfección, sino el latido.\n\nEs preferible un texto imperfecto pero honesto, a una obra maestra que nunca vio la luz porque siempre le faltaba un retoque.\n\nSi hoy estás dudando de si empezar ese dibujo, ese texto o ese proyecto que te ronda la cabeza: hazlo hoy, imperfecto y con cariño.`,
      cover_image_url: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=700&q=80',
      tags: ['creatividad', 'inspiracion'],
      published_at: new Date(Date.now() - 259200000).toISOString(),
    },
  };
  return demos[slug] || null;
}
