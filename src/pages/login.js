import { signIn, signInDemo, getSession } from '../lib/auth.js';
import { isSupabaseConfigured } from '../lib/supabase.js';
import { showToast } from '../components/toast.js';
import { navigate } from '../router.js';

/**
 * Login Page — Admin & Creator authentication
 */
export async function renderLoginPage(app) {
  // If already logged in, redirect to admin
  const session = await getSession();
  if (session) {
    navigate('/admin');
    return;
  }

  app.innerHTML = '';

  const page = document.createElement('div');
  page.className = 'login-page';

  if (!isSupabaseConfigured) {
    page.innerHTML = `
      <div class="login-card">
        <span class="owner-pill-badge pill-creator" style="margin-bottom:1rem;display:inline-block;">👑 Espacio de la Dueña</span>
        <h1>Acceso Creadora ✦</h1>
        <p>Entra para gestionar tus publicaciones, actualizar la foto del día y alternar entre la vista de creadora y la de visitante.</p>
        
        <div style="background:var(--mist);border:1px solid var(--line);border-radius:18px;padding:1.25rem;margin:1.5rem 0;text-align:left;">
          <p style="font-size:0.88rem;color:var(--text-secondary);line-height:1.6;">
            💡 <strong>Modo Rápido / Demostración:</strong> Puedes entrar inmediatamente como dueña para probar el panel, cambiar la foto del día y usar el switch de <em>"Ver como visitante"</em>.
          </p>
          <button id="btn-quick-creator-login" class="btn btn-primary btn-pill" style="width:100%;margin-top:1rem;">
            👑 Entrar como Dueña (Modo Creadora)
          </button>
        </div>

        <div style="margin-top:1rem;font-size:0.82rem;color:var(--text-muted);text-align:left;">
          <details>
            <summary style="cursor:pointer;font-weight:600;">ℹ️ ¿Cómo conectar tu base de datos Supabase definitiva?</summary>
            <p style="margin-top:0.5rem;line-height:1.6;">
              1. En <a href="https://supabase.com" target="_blank">supabase.com</a> crea un proyecto gratuito.<br/>
              2. Pega el SQL de <code>supabase/schema.sql</code> en el SQL Editor.<br/>
              3. Pon tus claves en el archivo <code>.env</code>.
            </p>
          </details>
        </div>

        <a href="#/" class="btn btn-ghost" style="margin-top:1.5rem;display:inline-flex;">← Volver al inicio</a>
      </div>
    `;
  } else {
    page.innerHTML = `
      <div class="login-card">
        <span class="owner-pill-badge pill-creator" style="margin-bottom:1rem;display:inline-block;">👑 Espacio de la Dueña</span>
        <h1>Mi espacio ✦</h1>
        <p>Inicia sesión para escribir, editar y organizar tus ideas.</p>
        <form id="login-form" novalidate>
          <div class="form-group">
            <label for="login-email" class="form-label">Correo electrónico</label>
            <input type="email" id="login-email" class="form-input" placeholder="tu@correo.com" required autocomplete="email" />
          </div>
          <div class="form-group">
            <label for="login-password" class="form-label">Contraseña</label>
            <input type="password" id="login-password" class="form-input" placeholder="••••••••" required autocomplete="current-password" />
          </div>
          <div id="login-error" class="form-error" style="display:none;margin-top:var(--space-sm);"></div>
          <button type="submit" class="btn btn-primary btn-pill" id="login-btn" style="width:100%;margin-top:0.5rem;">Entrar al espacio</button>
        </form>
        <a href="#/" style="display:inline-block;margin-top:var(--space-lg);font-size:0.88rem;color:var(--text-muted);">← Volver al inicio</a>
      </div>
    `;
  }

  app.appendChild(page);

  // Quick Demo Login Button
  const demoBtn = page.querySelector('#btn-quick-creator-login');
  if (demoBtn) {
    demoBtn.addEventListener('click', () => {
      signInDemo();
      showToast('¡Bienvenida, Dueña! Modo Creadora activo 👑', 'success');
      navigate('/admin');
    });
  }

  // Form handling
  const form = document.getElementById('login-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const errorDiv = document.getElementById('login-error');
      const btn = document.getElementById('login-btn');

      if (!email || !password) {
        errorDiv.textContent = 'Completa todos los campos.';
        errorDiv.style.display = 'flex';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Entrando...';
      errorDiv.style.display = 'none';

      try {
        await signIn(email, password);
        showToast('¡Bienvenida! 💜', 'success');
        navigate('/admin');
      } catch (err) {
        const msg = err.message?.includes('Invalid login')
          ? 'Correo o contraseña incorrectos.'
          : err.message || 'Error al iniciar sesión.';
        errorDiv.textContent = msg;
        errorDiv.style.display = 'flex';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Entrar al espacio';
      }
    });
  }
}
