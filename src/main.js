import './styles/index.css';
import { registerRoute, startRouter } from './router.js';
import { renderHomePage } from './pages/home.js';
import { renderPostPage } from './pages/post.js';
import { renderLoginPage } from './pages/login.js';
import { renderAdminPage } from './pages/admin.js';
import { onAuthStateChange } from './lib/auth.js';

// ─── Register Routes ───
registerRoute('/', renderHomePage);
registerRoute('/post/:slug', renderPostPage);
registerRoute('/login', renderLoginPage);
registerRoute('/admin', renderAdminPage);

// ─── Auth State Listener ───
onAuthStateChange((event, session) => {
  // If signed out while on admin, redirect to login
  if (event === 'SIGNED_OUT' && window.location.hash.startsWith('#/admin')) {
    window.location.hash = '#/login';
  }
});

// ─── Start Router ───
startRouter();
