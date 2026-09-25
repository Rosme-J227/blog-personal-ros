import { supabase, isSupabaseConfigured } from './supabase.js';

/**
 * Comments data module — CRUD + reactions for visitor responses
 */

// ─── Public Queries ───

export async function getCommentsByPostId(postId) {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .eq('status', 'visible')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

// ─── Submit Comment ───

export async function submitComment({ postId, displayName, body, isOwnerReply = false, parentCommentId = null }) {
  if (!isSupabaseConfigured) throw new Error('Supabase no está configurado.');

  // Validation
  const trimmedBody = (body || '').trim();
  if (!trimmedBody) throw new Error('El mensaje no puede estar vacío.');
  if (trimmedBody.length > 2000) throw new Error('El mensaje es demasiado largo (máximo 2000 caracteres).');
  
  const name = (displayName || '').trim() || 'Anónimo';
  if (name.length > 80) throw new Error('El nombre es demasiado largo.');

  const commentData = {
    post_id: postId,
    display_name: name,
    body: trimmedBody,
    is_owner_reply: isOwnerReply,
    parent_comment_id: parentCommentId,
    status: 'visible',
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('comments')
    .insert(commentData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Admin Actions ───

export async function getAllComments() {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('comments')
    .select('*, posts(title, slug)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function deleteComment(id) {
  if (!isSupabaseConfigured) throw new Error('Supabase no está configurado.');

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function hideComment(id) {
  if (!isSupabaseConfigured) throw new Error('Supabase no está configurado.');

  const { error } = await supabase
    .from('comments')
    .update({ status: 'hidden' })
    .eq('id', id);

  if (error) throw error;
}

// ─── Reactions ───

export async function getCommentReaction(commentId, visitorId) {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('comment_reactions')
    .select('reaction_type')
    .eq('comment_id', commentId)
    .eq('visitor_id', visitorId)
    .maybeSingle();

  if (error) return null;
  return data?.reaction_type || null;
}

export async function getCommentReactionCounts(commentId) {
  if (!isSupabaseConfigured) return { likes: 0, dislikes: 0 };

  const [likesRes, dislikesRes] = await Promise.all([
    supabase.from('comment_reactions').select('*', { count: 'exact', head: true }).eq('comment_id', commentId).eq('reaction_type', 'like'),
    supabase.from('comment_reactions').select('*', { count: 'exact', head: true }).eq('comment_id', commentId).eq('reaction_type', 'dislike'),
  ]);

  return {
    likes: likesRes.count || 0,
    dislikes: dislikesRes.count || 0,
  };
}

export async function toggleCommentReaction(commentId, visitorId, reactionType) {
  if (!isSupabaseConfigured) throw new Error('Supabase no está configurado.');

  const existing = await getCommentReaction(commentId, visitorId);

  if (existing === reactionType) {
    // Remove reaction
    await supabase
      .from('comment_reactions')
      .delete()
      .eq('comment_id', commentId)
      .eq('visitor_id', visitorId);
    return null;
  } else if (existing) {
    // Update reaction
    await supabase
      .from('comment_reactions')
      .update({ reaction_type: reactionType })
      .eq('comment_id', commentId)
      .eq('visitor_id', visitorId);
    return reactionType;
  } else {
    // Insert new
    await supabase
      .from('comment_reactions')
      .insert({ comment_id: commentId, visitor_id: visitorId, reaction_type: reactionType });
    return reactionType;
  }
}
