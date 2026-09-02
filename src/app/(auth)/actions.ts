'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getSupabaseServer } from '@/lib/supabase/server';
import type { Role } from '@/lib/supabase/types';

export interface AuthResult {
  error: string | null;
}

function readCredentials(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  return { email, password };
}

/** Shared validation so signup and login reject the same bad input. */
function validate(email: string, password: string): string | null {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Enter a valid email address.';
  }
  if (password.length < 8) {
    return 'Your password must be at least 8 characters.';
  }
  if (password.length > 200) {
    return 'That password is too long.';
  }
  return null;
}

export async function signUp(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: 'Accounts are not enabled on this deployment.' };

  const { email, password } = readCredentials(formData);
  const displayName = String(formData.get('displayName') ?? '').trim();
  const role = String(formData.get('role') ?? '') as Role;

  const invalid = validate(email, password);
  if (invalid) return { error: invalid };
  if (displayName.length < 1 || displayName.length > 60) {
    return { error: 'Enter a name between 1 and 60 characters.' };
  }
  if (role !== 'student' && role !== 'teacher') {
    return { error: 'Choose whether this is a student or a teacher account.' };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName, role } },
  });

  if (error) return { error: error.message };

  // Email confirmation is on: there is no session yet, so stop here rather
  // than trying to write a profile the new user cannot yet authenticate for.
  if (!data.session) {
    return { error: null };
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .insert({ id: data.user!.id, role, display_name: displayName });

  if (profileError && profileError.code !== '23505') {
    return { error: `Account created, but the profile failed to save: ${profileError.message}` };
  }

  revalidatePath('/', 'layout');
  redirect(role === 'teacher' ? '/teach' : '/classroom');
}

export async function signIn(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: 'Accounts are not enabled on this deployment.' };

  const { email, password } = readCredentials(formData);
  const next = String(formData.get('next') ?? '');

  const invalid = validate(email, password);
  if (invalid) return { error: invalid };

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Deliberately vague: distinguishing "no such account" from "wrong
    // password" tells an attacker which emails are registered.
    return { error: 'That email and password do not match an account.' };
  }

  // A profile row can be missing if signup was interrupted between creating
  // the auth user and writing the profile. Backfill it from user metadata.
  const { data: userData } = await supabase.auth.getUser();
  if (userData.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (!profile) {
      const meta = userData.user.user_metadata ?? {};
      const role: Role = meta.role === 'teacher' ? 'teacher' : 'student';
      await supabase.from('profiles').insert({
        id: userData.user.id,
        role,
        display_name: String(meta.display_name ?? email.split('@')[0]).slice(0, 60),
      });
    }
  }

  revalidatePath('/', 'layout');
  redirect(next && next.startsWith('/') ? next : '/');
}

export async function signOut() {
  const supabase = await getSupabaseServer();
  if (supabase) await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}
