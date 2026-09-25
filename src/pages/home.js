import { getPublishedPosts, getPostLikesCount, hasVisitorLikedPost, togglePostLike } from '../lib/posts.js';
import { getSettings, toggleDailyImageLike, hasLikedDailyImage } from '../lib/settings.js';
import { getTodayFormatted, formatDate, sanitizeText, getVisitorId } from '../lib/utils.js';
import { isSupabaseConfigured } from '../lib/supabase.js';
import { showToast } from '../components/toast.js';
import { navigate } from '../router.js';
import { createOwnerBar, isOwnerCreatorMode, openDailyPhotoModal } from '../components/ownerBar.js';

/**
 * Home Page — MeroRosDay's
 * Personal, fresh, youthful & interactive wall
 */
export async function renderHomePage(app) {
  app.innerHTML = '';
  const visitorId = getVisitorId();
  const isCreator = await isOwnerCreatorMode();

  // ─── 0. Barra de Dueña / Creadora (si ha iniciado sesión) ───
  const ownerBar = await createOwnerBar(() => renderHomePage(app));
  if (ownerBar) {
    app.appendChild(ownerBar);
  }

  // ─── 1. Navbar ───
  app.appendChild(createNavbar(isCreator));

  // ─── 2. Hero Section ───
  const hero = document.createElement('section');
  hero.id = 'inicio';
  hero.className = 'hero';
  hero.innerHTML = `
    <div class="hero-bg"></div>
    <div class="container">
      <div class="hero-grid">
        <div class="hero-content">
          <div style="display:inline-flex;gap:0.5rem;align-items:center;flex-wrap:wrap;margin-bottom:1rem;">
            <span class="hero-badge">🌸 DIARIO ABIERTO & MURO DE IDEAS</span>
            ${isCreator ? '<span class="owner-pill-badge pill-creator" style="font-size:0.75rem;">👑 Vista de Creadora</span>' : ''}
          </div>
          <h1 class="hero-title">Un rincón para soltar pensamientos y conectar</h1>
          <p class="hero-description">
            Bienvenida/o a mi espacio. Aquí guardo fragmentos de días comunes, reflexiones espontáneas y fotos que me inspiran. Eres libre de leer, dar amor y dejar tu huella.
          </p>
          <div style="display:flex;gap:0.75rem;align-items:center;flex-wrap:wrap;margin-top:1.5rem;">
            <a href="#foto-del-dia" class="btn btn-primary btn-pill">Ver Foto de Hoy 📸</a>
            <a href="#ideas" class="btn btn-secondary btn-pill">Explorar Ideas ✨</a>
          </div>
        </div>
        <div class="hero-illustration" aria-label="Composición gráfica creativa con notas y colores cálidos">
          <div class="hero-blob"></div>
          <div class="hero-orbit"></div>
          <div class="hero-orbit-alt"></div>
          <div class="hero-card">
            <div class="hero-card-inner">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;">
                <span style="font-size:0.8rem;font-weight:700;color:var(--coral);">✦ MEROROS</span>
                <span style="font-size:0.75rem;background:var(--lavender-soft);color:var(--violet);padding:0.15rem 0.5rem;border-radius:12px;">Hoy</span>
              </div>
              <div class="hero-card-line w1"></div>
              <div class="hero-card-line w2"></div>
              <div class="hero-card-line w3"></div>
              <div class="hero-card-dots" style="margin-top:1.2rem;">
                <span class="hero-dot-coral" title="Pensamientos"></span>
                <span class="hero-dot-violet" title="Creatividad"></span>
                <span style="width:9px;height:9px;border-radius:50%;background:var(--gold);display:inline-block;" title="Luz"></span>
              </div>
            </div>
          </div>
          <div class="hero-pen" title="Escribir libremente">✍️</div>
        </div>
      </div>
    </div>
  `;
  app.appendChild(hero);

  // ─── 3. Today Strip (Barra rápida de hoy) ───
  const settings = await getSettings();
  const today = document.createElement('section');
  today.id = 'hoy';
  today.className = 'today-strip';
  today.innerHTML = `
    <div class="today-inner">
      <div class="today-left">
        <span class="today-icon">☀️</span>
        <div>
          <p class="today-label">Hoy en MeroRosDay's</p>
          <p class="today-date">${getTodayFormatted()}</p>
        </div>
      </div>
      <p class="today-phrase">"${sanitizeText(settings.daily_phrase || 'Las ideas pequeñas también merecen una ventana con luz.')}"</p>
    </div>
  `;
  app.appendChild(today);

  // ─── 4. SECCIÓN DESTACADA: Foto del Día / Imagen del Día ───
  const dailySection = await createDailyPhotoSection(settings, isCreator, () => renderHomePage(app));
  app.appendChild(dailySection);

  // ─── 5. Posts Section (Muro de Ideas) ───
  const postsSection = document.createElement('section');
  postsSection.id = 'ideas';
  postsSection.className = 'posts-section';

  const postsContainer = document.createElement('div');
  postsContainer.className = 'container';

  postsContainer.innerHTML = `
    <div class="posts-header">
      <div>
        <p class="kicker kicker-coral">IDEAS & RELATOS</p>
        <h2>Palabras que se quedan un rato</h2>
      </div>
      <p class="posts-helper">
        Pensamientos cotidianos, notas sin apuro y pequeñas historias para disfrutar despacio.
      </p>
    </div>
  `;

  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'loading-page';
  loadingDiv.innerHTML = '<div class="loading-spinner"></div>';
  postsContainer.appendChild(loadingDiv);

  try {
    let posts = [];
    if (isSupabaseConfigured) {
      posts = await getPublishedPosts();
    }

    // Default friendly sample posts if database has no published posts yet
    if (posts.length === 0) {
      posts = getSamplePosts();
    }

    loadingDiv.remove();

    const grid = document.createElement('div');
    grid.className = 'posts-grid stagger';

    for (const post of posts) {
      const card = await createPostCard(post, visitorId, isCreator);
      grid.appendChild(card);
    }
    postsContainer.appendChild(grid);

  } catch (err) {
    loadingDiv.remove();
    const fallbackGrid = document.createElement('div');
    fallbackGrid.className = 'posts-grid stagger';
    for (const post of getSamplePosts()) {
      const card = await createPostCard(post, visitorId, isCreator);
      fallbackGrid.appendChild(card);
    }
    postsContainer.appendChild(fallbackGrid);
  }

  postsSection.appendChild(postsContainer);
  app.appendChild(postsSection);

  // ─── 6. Community Banner (Muro Abierto) ───
  const community = document.createElement('section');
  community.id = 'comunidad';
  community.className = 'community-banner';
  community.innerHTML = `
    <div class="community-inner">
      <div class="community-content">
        <p class="kicker kicker-gold">MURO INTERACTIVO</p>
        <h2 class="community-title">Tu voz también es bienvenida</h2>
        <p class="community-copy">
          No necesitas registrarte ni crear cuentas para conversar. Entra a cualquier idea y deja tu comentario, o déjame una nota aquí.
        </p>
      </div>
      <button class="btn btn-white btn-pill btn-lg community-btn" id="community-action">
        💬 Entrar a conversar
      </button>
    </div>
    <div class="community-circle"></div>
    <div class="community-square"></div>
  `;

  const communityWrap = document.createElement('div');
  communityWrap.style.cssText = 'max-width:calc(var(--max-width) + 2.5rem);margin:0 auto;padding:0 1.25rem;';
  communityWrap.appendChild(community);
  app.appendChild(communityWrap);

  // ─── 7. Footer ───
  app.appendChild(createFooter(isCreator));

  // ─── Event Listeners ───
  document.getElementById('community-action')?.addEventListener('click', () => {
    const firstPost = document.querySelector('.post-card');
    if (firstPost) firstPost.click();
    else document.getElementById('ideas')?.scrollIntoView({ behavior: 'smooth' });
  });

  const toggle = document.querySelector('.navbar-toggle');
  const links = document.querySelector('.navbar-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('open');
      links.classList.toggle('open');
    });
    links.addEventListener('click', () => {
      toggle.classList.remove('open');
      links.classList.remove('open');
    });
  }

  // Interceptar todos los enlaces ancla (#foto-del-dia, #ideas, #comunidad) para scroll suave directo
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      // Solo para anclas que no sean rutas (#/...)
      if (href && href.startsWith('#') && !href.startsWith('#/')) {
        const targetId = href.slice(1);
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          e.preventDefault();
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          history.pushState(null, '', href);
        }
      }
    });
  });

  // Acceso discreto para la dueña (triple clic en el logo o atajo Alt+L)
  const logo = document.querySelector('.navbar-logo');
  if (logo) {
    let logoClicks = 0;
    let logoTimer = null;
    logo.addEventListener('click', (e) => {
      logoClicks++;
      clearTimeout(logoTimer);
      if (logoClicks >= 3) {
        e.preventDefault();
        window.location.hash = '#/login';
        logoClicks = 0;
      } else {
        logoTimer = setTimeout(() => { logoClicks = 0; }, 600);
      }
    });
  }

  // Atajo de teclado discreto para la dueña (Alt + L)
  window.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'l' || e.key === 'L')) {
      window.location.hash = '#/login';
    }
  });
}

// ─── Navbar ───
function createNavbar(isCreator) {
  const nav = document.createElement('nav');
  nav.className = 'navbar';
  nav.setAttribute('role', 'navigation');
  nav.setAttribute('aria-label', 'Navegación principal');

  nav.innerHTML = `
    <div class="navbar-inner">
      <a href="#/" class="navbar-logo">
        <span style="font-family:var(--font-heading);letter-spacing:-0.03em;">MeroRosDay's</span>
        <span style="font-size:0.65rem;background:var(--lavender-soft);color:var(--violet);padding:0.15rem 0.45rem;border-radius:10px;font-weight:700;margin-left:0.35rem;">BLOG</span>
      </a>
      <button class="navbar-toggle" aria-label="Abrir menú">
        <span></span><span></span><span></span>
      </button>
      <ul class="navbar-links">
        <li><a href="#foto-del-dia">Foto del Día</a></li>
        <li><a href="#ideas">Ideas</a></li>
        <li><a href="#comunidad">Comunidad</a></li>
        ${isCreator
          ? `<li><a href="#/admin" class="btn btn-primary btn-pill" style="font-size:0.84rem;padding:0.4rem 1rem;">👑 Panel Dueña</a></li>`
          : ``
        }
      </ul>
    </div>
  `;
  return nav;
}

// ─── Sección Foto del Día ───
async function createDailyPhotoSection(settings, isCreator, onUpdate) {
  const section = document.createElement('section');
  section.id = 'foto-del-dia';
  section.className = 'daily-photo-section';

  const defaultImg = 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1000&q=80';
  const imgUrl = settings.daily_image_url || defaultImg;
  const caption = settings.daily_image_caption || 'La luz de hoy se cuela entre las ramas. Un recordatorio para respirar y mirar hacia arriba.';
  const mood = settings.daily_image_mood || '✨ Inspirada y en calma';
  const likesCount = Number(settings.daily_likes || 0);
  const isLiked = hasLikedDailyImage();

  section.innerHTML = `
    <div class="container">
      <div class="daily-photo-card">
        
        <!-- Polaroid Visual -->
        <div class="polaroid-frame">
          <div class="washi-tape"></div>
          <div class="polaroid-img-wrap">
            <img src="${sanitizeText(imgUrl)}" alt="Foto del Día" loading="lazy" id="daily-photo-element" />
          </div>
          <p class="polaroid-caption-small">📷 Captura del día · MeroRosDay's</p>
        </div>

        <!-- Info & Interactions -->
        <div class="daily-photo-info">
          <div class="daily-badge-row">
            <span class="daily-sticker">${sanitizeText(mood)}</span>
            <span class="daily-date-pill">📅 ${getTodayFormatted()}</span>
          </div>

          <h2 class="daily-photo-title">La Foto del Día</h2>

          <div class="daily-photo-text">
            "${sanitizeText(caption)}"
          </div>

          <div class="daily-photo-actions">
            <button class="daily-like-btn ${isLiked ? 'liked' : ''}" id="daily-photo-like-btn" aria-label="Dar me gusta a la foto">
              <span class="heart-icon">${isLiked ? '❤️' : '🤍'}</span>
              <span id="daily-photo-likes-num">${likesCount}</span> me gusta
            </button>

            ${isCreator ? `
              <button class="owner-edit-daily-btn" id="btn-owner-edit-photo">
                ✏️ Cambiar foto de hoy
              </button>
            ` : ''}
          </div>

          ${isCreator ? `
            <p style="font-size:0.75rem;color:var(--text-muted);margin-top:0.25rem;">
              👑 <strong>Modo Dueña:</strong> Puedes actualizar la foto, pie y estado de ánimo cuando quieras. Los visitantes solo verán la foto y el botón de me gusta.
            </p>
          ` : `
            <p style="font-size:0.8rem;color:var(--text-muted);">
              Cada día una nueva captura para compartir un instante contigo. ✨
            </p>
          `}
        </div>

      </div>
    </div>
  `;

  // Heart like button event
  const likeBtn = section.querySelector('#daily-photo-like-btn');
  const countSpan = section.querySelector('#daily-photo-likes-num');
  const heartSpan = likeBtn?.querySelector('.heart-icon');

  likeBtn?.addEventListener('click', async () => {
    try {
      const result = await toggleDailyImageLike();
      likeBtn.classList.toggle('liked', result.liked);
      if (heartSpan) heartSpan.textContent = result.liked ? '❤️' : '🤍';
      if (countSpan) countSpan.textContent = result.count;
    } catch (e) {
      showToast('No se pudo registrar la reacción', 'error');
    }
  });

  // Owner edit photo button
  if (isCreator) {
    section.querySelector('#btn-owner-edit-photo')?.addEventListener('click', () => {
      openDailyPhotoModal(onUpdate);
    });
  }

  return section;
}

// ─── Post Card ───
async function createPostCard(post, visitorId, isCreator) {
  const card = document.createElement('article');
  card.className = 'post-card';
  card.setAttribute('role', 'article');
  card.setAttribute('tabindex', '0');

  const tagsHtml = (post.tags || []).slice(0, 3).map(t =>
    `<span class="tag"># ${sanitizeText(t)}</span>`
  ).join('');

  const imageHtml = post.cover_image_url
    ? `<div class="image-frame">
        <img src="${sanitizeText(post.cover_image_url)}" alt="Imagen de ${sanitizeText(post.title)}" loading="lazy" />
       </div>`
    : '';

  const contentDiv = document.createElement('div');

  const metaHtml = `
    <div class="post-card-meta">
      <p class="post-card-date">${formatDate(post.published_at || post.created_at)}</p>
      <div class="post-card-tags">${tagsHtml}</div>
    </div>
  `;

  const titleEl = document.createElement('h3');
  titleEl.className = 'post-card-title';
  titleEl.textContent = post.title;

  const excerptEl = document.createElement('p');
  excerptEl.className = 'post-card-excerpt';
  excerptEl.textContent = post.excerpt || (post.content ? post.content.substring(0, 180) + '...' : '');

  contentDiv.innerHTML = metaHtml;
  contentDiv.appendChild(titleEl);
  contentDiv.appendChild(excerptEl);

  // Like button
  let likesCount = 0;
  let isLiked = false;
  if (isSupabaseConfigured && post.id) {
    try {
      [likesCount, isLiked] = await Promise.all([
        getPostLikesCount(post.id),
        hasVisitorLikedPost(post.id, visitorId),
      ]);
    } catch (e) { /* ignore */ }
  } else {
    likesCount = post.initialLikes || 5;
  }

  const likeRow = document.createElement('div');
  likeRow.className = 'post-card-like-row';

  const likeBtn = document.createElement('button');
  likeBtn.className = `post-like-mini ${isLiked ? 'liked' : ''}`;
  likeBtn.innerHTML = `${isLiked ? '❤️' : '🤍'} <span>${likesCount || ''}</span>`;
  likeBtn.setAttribute('aria-label', 'Me gusta esta idea');

  likeBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!isSupabaseConfigured) {
      isLiked = !isLiked;
      likeBtn.classList.toggle('liked', isLiked);
      likesCount += isLiked ? 1 : -1;
      likeBtn.innerHTML = `${isLiked ? '❤️' : '🤍'} <span>${likesCount}</span>`;
      return;
    }
    try {
      const nowLiked = await togglePostLike(post.id, visitorId);
      likeBtn.classList.toggle('liked', nowLiked);
      const newCount = await getPostLikesCount(post.id);
      likeBtn.innerHTML = `${nowLiked ? '❤️' : '🤍'} <span>${newCount || ''}</span>`;
    } catch (err) {
      showToast('Error al dar like', 'error');
    }
  });

  likeRow.appendChild(likeBtn);

  // If owner is in creator mode, show quick edit button!
  if (isCreator) {
    const editBtn = document.createElement('button');
    editBtn.className = 'btn-card-edit';
    editBtn.innerHTML = '✏️ Editar idea';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sessionStorage.setItem('edit_post_id', post.id);
      navigate('/admin');
    });
    likeRow.appendChild(editBtn);
  }

  contentDiv.appendChild(likeRow);

  const grid = document.createElement('div');
  grid.className = 'post-card-grid';
  grid.appendChild(contentDiv);

  if (imageHtml) {
    const imgDiv = document.createElement('div');
    imgDiv.innerHTML = imageHtml;
    grid.appendChild(imgDiv.firstElementChild);
  }

  card.appendChild(grid);

  card.addEventListener('click', () => navigate(`/post/${post.slug}`));
  card.addEventListener('keydown', (e) => { if (e.key === 'Enter') navigate(`/post/${post.slug}`); });

  return card;
}

// ─── Footer ───
export function createFooter(isCreator) {
  const footer = document.createElement('footer');
  footer.className = 'footer';
  footer.setAttribute('role', 'contentinfo');

  footer.innerHTML = `
    <div class="footer-inner">
      <div>
        <p class="footer-message">🌸 MeroRosDay's — Mi muro de ideas</p>
        <p class="footer-note">Un espacio hecho para pensar, sentir y conversar libremente sin algoritmos.</p>
      </div>
      <ul class="footer-links">
        <li><a href="#/">Inicio</a></li>
        <li><a href="#foto-del-dia">Foto del Día</a></li>
        <li><a href="#ideas">Ideas</a></li>
        ${isCreator
          ? `<li><a href="#/admin" style="color:var(--gold);font-weight:600;">👑 Panel de Creadora</a></li>`
          : ``
        }
      </ul>
    </div>
  `;
  return footer;
}

// ─── Default Sample Posts (Warm, lively initial content) ───
function getSamplePosts() {
  return [
    {
      id: 'demo-1',
      title: 'El arte de escribir sin prisas: por qué decidí abrir este muro',
      slug: 'el-arte-de-escribir-sin-prisas',
      excerpt: 'Vivimos corriendo de una notificación a otra. Este blog nació de la necesidad de tener un lugar tranquilo para pensar en voz alta y conectar de verdad.',
      cover_image_url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=700&q=80',
      tags: ['reflexion', 'comienzos', 'escritura'],
      published_at: new Date(Date.now() - 86400000).toISOString(),
      initialLikes: 14,
    },
    {
      id: 'demo-2',
      title: 'Cosas diminutas que hoy me parecieron mágicas',
      slug: 'cosas-diminutas-que-hoy-me-parecieron-magicas',
      excerpt: 'El olor a café recién colado, la sombra de una planta bailando en la pared y una canción vieja que saltó de sorpresa en la radio.',
      cover_image_url: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=700&q=80',
      tags: ['vida cotidiana', 'gratitud', 'momentos'],
      published_at: new Date(Date.now() - 172800000).toISOString(),
      initialLikes: 21,
    },
    {
      id: 'demo-3',
      title: 'Crear aunque dé miedo: abrazar lo imperfecto',
      slug: 'crear-aunque-de-miedo',
      excerpt: 'A veces esperamos el momento ideal o la idea perfecta. Pero las mejores cosas suelen nacer de bocetos desordenados y ganas de intentarlo.',
      cover_image_url: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=700&q=80',
      tags: ['creatividad', 'inspiracion'],
      published_at: new Date(Date.now() - 259200000).toISOString(),
      initialLikes: 9,
    },
  ];
}
