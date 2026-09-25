import { supabase, isSupabaseConfigured } from './supabase.js';
import { slugify } from './utils.js';

/**
 * Posts data module — CRUD operations for blog posts
 */

// ─── Public Queries ───

export async function getPublishedPosts() {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPostBySlug(slug) {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// ─── Admin Queries ───

export async function getAllPosts() {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPostById(id) {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createPost({ title, content, excerpt, tags, cover_image_url, status }) {
  if (!isSupabaseConfigured) throw new Error('Supabase no está configurado.');

  const slug = slugify(title) + '-' + Date.now().toString(36);
  const now = new Date().toISOString();

  const postData = {
    title,
    slug,
    content,
    excerpt: excerpt || (content ? content.substring(0, 160) : ''),
    tags: tags || [],
    cover_image_url: cover_image_url || null,
    status: status || 'draft',
    published_at: status === 'published' ? now : null,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('posts')
    .insert(postData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePost(id, updates) {
  if (!isSupabaseConfigured) throw new Error('Supabase no está configurado.');

  const updateData = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  // If publishing for first time
  if (updates.status === 'published' && !updates.published_at) {
    updateData.published_at = new Date().toISOString();
  }

  // Regenerate slug if title changed
  if (updates.title) {
    updateData.slug = slugify(updates.title) + '-' + Date.now().toString(36);
  }

  const { data, error } = await supabase
    .from('posts')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function moveToTrash(id) {
  return updatePost(id, { status: 'trash' });
}

export async function restorePost(id) {
  return updatePost(id, { status: 'draft' });
}

export async function deletePostPermanently(id) {
  if (!isSupabaseConfigured) throw new Error('Supabase no está configurado.');

  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ─── Likes ───

export async function getPostLikesCount(postId) {
  if (!isSupabaseConfigured) return 0;

  const { count, error } = await supabase
    .from('post_likes')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId);

  if (error) return 0;
  return count || 0;
}

export async function hasVisitorLikedPost(postId, visitorId) {
  if (!isSupabaseConfigured) return false;

  const { data, error } = await supabase
    .from('post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('visitor_id', visitorId)
    .maybeSingle();

  if (error) return false;
  return !!data;
}

export async function togglePostLike(postId, visitorId) {
  if (!isSupabaseConfigured) throw new Error('Supabase no está configurado.');

  const liked = await hasVisitorLikedPost(postId, visitorId);

  if (liked) {
    await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('visitor_id', visitorId);
    return false;
  } else {
    await supabase
      .from('post_likes')
      .insert({ post_id: postId, visitor_id: visitorId });
    return true;
  }
}

// ─── Image Upload ───

export async function uploadImage(file) {
  if (!isSupabaseConfigured) throw new Error('Supabase no está configurado.');

  const ext = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const filePath = `posts/${fileName}`;

  const { data, error } = await supabase.storage
    .from('media')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('media')
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

export async function deleteImage(url) {
  if (!isSupabaseConfigured || !url) return;

  try {
    const path = url.split('/media/')[1];
    if (path) {
      await supabase.storage.from('media').remove([path]);
    }
  } catch (e) {
    console.warn('Could not delete image:', e);
  }
}
