# 💜 MeroRosDay's

> *Un lugar para entrar, respirar, leer lo que pensé hoy y, si algo te mueve, dejarme una respuesta.*

Blog / muro interactivo personal. No es una red social. Es un espacio editorial donde la propietaria publica ideas, pensamientos y reflexiones, y los visitantes pueden leer y responder sin registrarse.

---

## ✨ Funcionalidades

### Zona pública (visitantes)
- Hero de bienvenida con animaciones suaves
- Sección "Hoy" con fecha dinámica
- Muro de publicaciones con tarjetas visuales
- Cada publicación muestra: título, contenido, fecha, etiquetas e imagen
- ❤️ Botón de "me gusta" con conteo persistente
- 💬 Respuestas sin necesidad de crear cuenta (nombre opcional)
- 👍👎 Likes y dislikes en comentarios
- Diseño responsive (móvil, tablet, desktop)
- SEO básico (title, meta, Open Graph)
- Accesibilidad (semántico, labels, focus-visible, aria)

### Zona administrativa (propietaria)
- 🔒 Login seguro con Supabase Auth
- ✨ Crear publicaciones con título, contenido, etiquetas e imagen
- 📋 Guardar como borrador
- 🚀 Publicar directamente
- ✏️ Editar publicaciones existentes
- 🗑️ Papelera con restauración y eliminación definitiva (con confirmación)
- 💬 Gestión de comentarios (ver, eliminar)
- 💬 Responder a los comentarios de visitantes
- 📷 Subida de imágenes con validación de tipo y tamaño

---

## 🛠️ Tecnologías

| Componente | Tecnología |
|---|---|
| Frontend | Vite + Vanilla JavaScript |
| Estilos | CSS puro (design system personalizado) |
| Backend/BD | Supabase (PostgreSQL + Auth + Storage + RLS) |
| Hosting | GitHub Pages (archivos estáticos) |
| Tipografía | Outfit + DM Sans (Google Fonts) |

---

## 🚀 Setup rápido

### 1. Clonar e instalar

```bash
git clone https://github.com/TU_USUARIO/merorosdays-blog.git
cd merorosdays-blog
npm install
```

### 2. Configurar Supabase

1. Crea una cuenta gratuita en [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. Ve a **SQL Editor** y ejecuta todo el contenido de `supabase/schema.sql`
4. Ve a **Authentication > Users** y crea un usuario con tu email y contraseña
5. Ve a **Storage** y crea un bucket llamado `media` (configúralo como público)
6. Ve a **Settings > API** y copia:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

### 3. Variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...tu-clave-anon
```

> ⚠️ Estas claves son **públicas por diseño** de Supabase. La seguridad está en las políticas RLS, no en ocultar estas claves.

### 4. Ejecutar localmente

```bash
npm run dev
```

Abre `http://localhost:3000` en tu navegador.

---

## 📦 Build para producción

```bash
npm run build
```

Los archivos estáticos se generan en la carpeta `dist/`.

---

## 🌐 Publicar en GitHub Pages

### Opción A: Deploy automático con script

```bash
npm run deploy
```

Esto hace build y publica en la rama `gh-pages` automáticamente.

### Opción B: Deploy manual

1. Haz build: `npm run build`
2. Sube la carpeta `dist/` a la rama `gh-pages` de tu repositorio
3. En GitHub, ve a **Settings > Pages** y selecciona la rama `gh-pages`

### Opción C: GitHub Actions

Crea `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

> Agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en **Settings > Secrets and variables > Actions** de tu repositorio.

---

## 📁 Estructura del proyecto

```
├── index.html              # HTML principal
├── vite.config.js           # Configuración de Vite
├── package.json
├── .env.example             # Template de variables
├── .gitignore
├── public/
│   ├── favicon.svg          # Favicon con gradiente
│   └── robots.txt
├── src/
│   ├── main.js              # Entry point + rutas
│   ├── router.js            # Router SPA basado en hash
│   ├── styles/
│   │   └── index.css        # Design system completo
│   ├── lib/
│   │   ├── supabase.js      # Cliente Supabase
│   │   ├── auth.js          # Autenticación
│   │   ├── posts.js         # CRUD de publicaciones + likes
│   │   ├── comments.js      # CRUD de comentarios + reacciones
│   │   └── utils.js         # Utilidades compartidas
│   ├── components/
│   │   ├── toast.js         # Notificaciones toast
│   │   └── modal.js         # Modal de confirmación
│   └── pages/
│       ├── home.js          # Hero + Hoy + Muro público
│       ├── post.js          # Detalle de publicación
│       ├── login.js         # Login administrativo
│       └── admin.js         # Panel administrativo completo
└── supabase/
    └── schema.sql           # Schema BD + políticas RLS
```

---

## 🔒 Seguridad

- Autenticación real con Supabase Auth (no hay contraseñas en el frontend)
- RLS (Row Level Security) en todas las tablas
- Solo las claves públicas (`anon key`) están en el frontend
- Sanitización de texto (nunca se usa `innerHTML` con contenido de usuarios)
- Validación de imágenes por tipo y tamaño (máx 5MB)
- Confirmación modal antes de eliminar definitivamente

---

## ⚡ Qué necesita Supabase (backend)

| Funcionalidad | Requiere Supabase |
|---|---|
| Publicar/editar posts | ✅ Sí |
| Subir imágenes | ✅ Sí |
| Comentarios | ✅ Sí |
| Likes | ✅ Sí |
| Login admin | ✅ Sí |
| Hero, diseño, animaciones | ❌ No |
| Navegación, responsive | ❌ No |

> Sin Supabase configurado, la web se ve con el diseño completo pero muestra un mensaje de "Configuración pendiente" donde irían las publicaciones.

---

## 💰 Costo

| Servicio | Plan | Costo |
|---|---|---|
| GitHub Pages | Gratuito | $0 |
| Supabase | Free tier | $0 |
| Google Fonts | Gratuito | $0 |
| **Total** | | **$0/mes** |

> ⚠️ Supabase Free tiene límites: 500MB BD, 1GB storage, y los proyectos inactivos 1 semana pueden pausarse.

---

## 📝 Licencia

Proyecto personal. Hecho con 💜 por MeroRosDay's.
