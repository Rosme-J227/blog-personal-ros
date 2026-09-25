import { supabase, isSupabaseConfigured } from './supabase.js';

const STORAGE_KEY = 'meroros_site_settings';

function getDefaults() {
  return {
    id: null,
    site_name: "MeroRosDay's",
    tagline: 'Diario creativo & Muro de ideas',
    description: 'Un rincón abierto para soltar pensamientos, guardar momentos y conversar sin prisa.',
    daily_image_url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1000&q=80',
    daily_image_caption: 'La luz de hoy se cuela entre las ramas. Un recordatorio para respirar y mirar hacia arriba.',
    daily_image_mood: '✨ Inspirada y en calma',
    daily_phrase: 'Las ideas pequeñas también merecen una ventana con luz.',
    daily_likes: 12,
  };
}

export async function getSettings() {
  const localData = getLocalSettings();

  if (!isSupabaseConfigured) {
    return localData;
  }

  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return localData;
    }

    const merged = { ...localData, ...data };
    saveLocalSettings(merged);
    return merged;
  } catch (err) {
    console.warn('Usando configuración local:', err);
    return localData;
  }
}

export async function updateSettings(updates) {
  const current = await getSettings();
  const next = { ...current, ...updates };
  saveLocalSettings(next);

  if (isSupabaseConfigured) {
    try {
      if (current.id) {
        const { data, error } = await supabase
          .from('site_settings')
          .update(updates)
          .eq('id', current.id)
          .select()
          .single();
        if (!error && data) {
          saveLocalSettings(data);
          return data;
        }
      } else {
        const { data, error } = await supabase
          .from('site_settings')
          .insert({ ...next, ...updates })
          .select()
          .single();
        if (!error && data) {
          saveLocalSettings(data);
          return data;
        }
      }
    } catch (err) {
      console.warn('No se pudo guardar en Supabase, guardado localmente:', err);
    }
  }

  return next;
}

export async function updateDailyImage(url, caption, mood) {
  return updateSettings({
    daily_image_url: url || null,
    daily_image_caption: caption || '',
    daily_image_mood: mood || '✨ Momento del día',
    daily_image_updated_at: new Date().toISOString(),
  });
}

export async function toggleDailyImageLike() {
  const visitorKey = 'meroros_liked_daily_photo';
  const hasLiked = localStorage.getItem(visitorKey) === 'true';
  const settings = await getSettings();
  const currentLikes = Number(settings.daily_likes || 0);

  const newLikes = hasLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1;
  localStorage.setItem(visitorKey, String(!hasLiked));

  const updated = await updateSettings({ daily_likes: newLikes });
  return { liked: !hasLiked, count: newLikes };
}

export function hasLikedDailyImage() {
  return localStorage.getItem('meroros_liked_daily_photo') === 'true';
}

function getLocalSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaults();
    return { ...getDefaults(), ...JSON.parse(raw) };
  } catch (e) {
    return getDefaults();
  }
}

function saveLocalSettings(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // Ignore storage quota
  }
}
