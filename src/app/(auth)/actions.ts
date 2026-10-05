'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { rateLimit } from '@/lib/ai/guard';
import { safeNext, SITE_URL } from '@/lib/safePath';
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
  redirect(safeNext(next) ?? '/');
}

export interface ResetRequestResult {
  sent: boolean;
  error: string | null;
}

/** A few reset emails an hour from one address is plenty for a person. */
const RESET_RULE = { limit: 5, windowMs: 60 * 60_000 };

/**
 * "Forgot password?": emails a link that lands on /auth/confirm, which signs
 * the person in for this one purpose and sends them on to /reset-password.
 *
 * Answers the same whether or not the address has an account (Supabase does
 * too), so the form can't be used to find out who has one.
 */
export async function requestPasswordReset(_prev: ResetRequestResult, formData: FormData): Promise<ResetRequestResult> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { sent: false, error: 'Accounts are not enabled on this deployment.' };

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { sent: false, error: 'Enter a valid email address.' };
  }

  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || 'local';
  if (!rateLimit(`reset:${ip}`, RESET_RULE).ok) {
    return { sent: false, error: 'Too many reset requests from here. Please try again in an hour.' };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE_URL}/auth/confirm?next=/reset-password`,
  });
  // Supabase answers an unknown address exactly like a known one, so an
  // error here is about sending, never about whether the account exists.
  if (error?.status === 429 || error?.code === 'over_email_send_rate_limit') {
    return { sent: false, error: 'Too many emails have gone out in the last hour. Please try again later.' };
  }
  if (error) {
    return { sent: false, error: 'The email couldn’t be sent just now. Please try again in a few minutes.' };
  }

  return { sent: true, error: null };
}

export interface NewPasswordResult {
  done: boolean;
  error: string | null;
}

/**
 * Sets a new password for whoever is signed in: on /reset-password that is
 * the session the reset link just opened.
 */
export async function setNewPassword(_prev: NewPasswordResult, formData: FormData): Promise<NewPasswordResult> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { done: false, error: 'Accounts are not enabled on this deployment.' };

  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  if (password.length < 8) return { done: false, error: 'Your password must be at least 8 characters.' };
  if (password.length > 200) return { done: false, error: 'That password is too long.' };
  if (password !== confirm) return { done: false, error: 'The two passwords don’t match.' };

  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return { done: false, error: 'This reset link has expired. Request a new one from the Forgot password page.' };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === 'same_password') {
      return { done: false, error: 'That’s your current password. Choose a different one.' };
    }
    if (error.code === 'weak_password') {
      return { done: false, error: error.message || 'That password is too easy to guess. Choose a stronger one.' };
    }
    return { done: false, error: 'The password couldn’t be changed just now. Please try again.' };
  }

  revalidatePath('/', 'layout');
  return { done: true, error: null };
}

export async function signOut() {
  const supabase = await getSupabaseServer();
  if (supabase) await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}

/**
 * Permanently deletes the signed-in user's account: the `delete_own_account`
 * RPC removes their row in auth.users, which cascades through profiles,
 * any classrooms they teach, their classroom memberships, and their study
 * history — every one of those foreign keys was already declared `on delete
 * cascade` for the same reason a teacher deleting a classroom already
 * cascades to its assignments. See supabase/migrations/0004_delete_account.sql.
 *
 * Does not touch this browser's local progress (Dashboard, Reading Room
 * notes, vocab schedule, and so on) — that lives outside Supabase entirely
 * and Settings' own "Reset all progress" is the control for it.
 */
export async function deleteAccount() {
  const supabase = await getSupabaseServer();
  if (supabase) {
    await supabase.rpc('delete_own_account');
    await supabase.auth.signOut();
  }
  revalidatePath('/', 'layout');
  redirect('/');
}
