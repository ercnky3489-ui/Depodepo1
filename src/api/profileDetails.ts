// Profil ayrıntıları: özel doğum tarihi, yıllık okuma hedefi ve kaydetme.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface PrivateDetails { birth_date: string | null; show_birthdate: boolean }

export function usePrivateDetails(userId: string | null) {
  return useQuery({
    queryKey: ['privateDetails', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('profile_private').select('birth_date, show_birthdate').eq('user_id', userId!).maybeSingle();
      if (error) throw error;
      return data as PrivateDetails | null;
    },
  });
}

export function useReadingGoal(userId: string | null, year: number) {
  return useQuery({
    queryKey: ['readingGoal', userId, year],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('reading_goals').select('target').eq('user_id', userId!).eq('year', year).maybeSingle();
      if (error) throw error;
      return (data?.target as number | undefined) ?? null;
    },
  });
}

export interface ProfileDetailsForm {
  school: string;
  occupation: string;
  city: string;
  district: string;
  instagram: string;
  facebook: string;
  twitter: string;
  birth_date: string; // YYYY-MM-DD ya da boş
  show_birthdate: boolean;
  cover_path: string | null;
  goal_year: number;
  goal_target: number | null; // boşsa hedef silinir
}

const clean = (s: string, max: number) => (s.trim().slice(0, max) || null);
const handle = (s: string) => s.trim().replace(/^@/, '').replace(/^https?:\/\/[^/]+\//, '').replace(/\/$/, '').slice(0, 40) || null;

export function validBirthDate(s: string): boolean {
  if (!s) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s && s >= '1900-01-01' && s <= new Date().toISOString().slice(0, 10);
}

export async function saveProfileDetails(uid: string, f: ProfileDetailsForm): Promise<void> {
  const { error: pErr } = await supabase.from('profiles').update({
    school: clean(f.school, 80), occupation: clean(f.occupation, 80), city: clean(f.city, 40), district: clean(f.district, 40),
    instagram: handle(f.instagram), facebook: handle(f.facebook), twitter: handle(f.twitter), cover_path: f.cover_path,
  }).eq('id', uid);
  if (pErr) throw pErr;

  const { error: privErr } = await supabase.from('profile_private').upsert(
    { user_id: uid, birth_date: f.birth_date || null, show_birthdate: f.show_birthdate }, { onConflict: 'user_id' });
  if (privErr) throw privErr;

  if (f.goal_target) {
    const { error: gErr } = await supabase.from('reading_goals').upsert(
      { user_id: uid, year: f.goal_year, target: f.goal_target }, { onConflict: 'user_id,year' });
    if (gErr) throw gErr;
  } else {
    const { error: gErr } = await supabase.from('reading_goals').delete().eq('user_id', uid).eq('year', f.goal_year);
    if (gErr) throw gErr;
  }
}

export function useInvalidateProfile() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['profileSummary'] });
    qc.invalidateQueries({ queryKey: ['privateDetails'] });
    qc.invalidateQueries({ queryKey: ['readingGoal'] });
  };
}

// Profil rozeti için rol: 'admin', 'moderator' ya da null (security definer fonksiyon, yalnızca rol adı döner).
export function useProfileRole(userId: string | null) {
  return useQuery({
    queryKey: ['profileRole', userId],
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('profile_role', { p_user: userId! });
      if (error) throw error;
      return (data as 'admin' | 'moderator' | null) ?? null;
    },
  });
}
