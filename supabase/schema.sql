-- ============================================
-- MeroRosDay's — Schema para Supabase
-- ============================================
-- Ejecuta este SQL en el editor SQL de tu proyecto Supabase.

-- 1. Tabla de publicaciones
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT,
  excerpt TEXT,
  cover_image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'trash')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabla de comentarios
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  display_name TEXT DEFAULT 'Anónimo',
  body TEXT NOT NULL,
  is_owner_reply BOOLEAN DEFAULT false,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'visible' CHECK (status IN ('visible', 'hidden', 'spam')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Likes en publicaciones
CREATE TABLE post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, visitor_id)
);

-- 4. Reacciones en comentarios (like/dislike)
CREATE TABLE comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(comment_id, visitor_id)
);

-- ============================================
-- RLS (Row Level Security) — IMPORTANTE
-- ============================================

-- Activar RLS en todas las tablas
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;

-- ─── Posts ───

-- Público: solo puede leer publicaciones con status 'published'
CREATE POLICY "posts_public_read" ON posts
  FOR SELECT USING (status = 'published');

-- Admin: acceso completo (usuario autenticado)
CREATE POLICY "posts_admin_all" ON posts
  FOR ALL USING (auth.role() = 'authenticated');

-- ─── Comments ───

-- Público: puede leer comentarios visibles
CREATE POLICY "comments_public_read" ON comments
  FOR SELECT USING (status = 'visible');

-- Público: puede insertar comentarios (respuestas de visitantes)
CREATE POLICY "comments_public_insert" ON comments
  FOR INSERT WITH CHECK (true);

-- Admin: acceso completo
CREATE POLICY "comments_admin_all" ON comments
  FOR ALL USING (auth.role() = 'authenticated');

-- ─── Post Likes ───

-- Público: puede ver likes
CREATE POLICY "post_likes_public_read" ON post_likes
  FOR SELECT USING (true);

-- Público: puede insertar likes
CREATE POLICY "post_likes_public_insert" ON post_likes
  FOR INSERT WITH CHECK (true);

-- Público: puede quitar su propio like
CREATE POLICY "post_likes_public_delete" ON post_likes
  FOR DELETE USING (true);

-- ─── Comment Reactions ───

-- Público: puede ver reacciones
CREATE POLICY "comment_reactions_public_read" ON comment_reactions
  FOR SELECT USING (true);

-- Público: puede insertar reacciones
CREATE POLICY "comment_reactions_public_insert" ON comment_reactions
  FOR INSERT WITH CHECK (true);

-- Público: puede cambiar/quitar su reacción
CREATE POLICY "comment_reactions_public_update" ON comment_reactions
  FOR UPDATE USING (true);

CREATE POLICY "comment_reactions_public_delete" ON comment_reactions
  FOR DELETE USING (true);

-- ─── 5. Tabla de configuración del sitio & Foto del día ───
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name TEXT DEFAULT 'MeroRosDay''s',
  tagline TEXT DEFAULT 'Diario creativo & Muro de ideas',
  description TEXT DEFAULT 'Un rincón abierto para soltar pensamientos, guardar momentos y conversar sin prisa.',
  daily_image_url TEXT,
  daily_image_caption TEXT,
  daily_image_mood TEXT DEFAULT '✨ Inspirada y en calma',
  daily_phrase TEXT DEFAULT 'Las ideas pequeñas también merecen una ventana con luz.',
  daily_likes INT DEFAULT 0,
  daily_image_updated_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Público: puede leer la configuración del sitio y foto del día
CREATE POLICY "site_settings_public_read" ON site_settings
  FOR SELECT USING (true);

-- Admin: puede actualizar la configuración y foto del día
CREATE POLICY "site_settings_admin_all" ON site_settings
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- Storage: Bucket para imágenes
-- ============================================
-- Crea un bucket llamado 'media' desde el dashboard de Supabase Storage.
-- Configúralo como PÚBLICO para lectura.
-- Las políticas de escritura deben requerir autenticación.

-- ============================================
-- Crear usuario administrador
-- ============================================
-- Ve a Authentication > Users en el dashboard de Supabase
-- y crea un usuario con tu email y una contraseña fuerte.
-- Este será el único usuario que podrá acceder al panel admin.

