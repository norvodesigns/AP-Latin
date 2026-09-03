'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getSupabaseServer } from '@/lib/supabase/server';

export interface JoinResult {
  error: string | null;
}

/** A student redeems a join code. The heavy lifting — validating the code,
 *  checking the caller is a student, inserting the membership — all happens
 *  inside the join_classroom RPC (see supabase/migrations/0002_rpc.sql),
 *  which is SECURITY DEFINER specifically so a student can resolve a code
 *  for a classroom they are not a member of yet (RLS would otherwise hide
 *  it from them). */
export async function joinClassroom(_prev: JoinResult, formData: FormData): Promise<JoinResult> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: 'Accounts are not enabled on this deployment.' };

  const code = String(formData.get('code') ?? '').trim();
  if (!code) return { error: 'Enter the join code your teacher gave you.' };

  const { data, error } = await supabase.rpc('join_classroom', { code });
  if (error) return { error: error.message };

  const joined = data?.[0];
  if (!joined) return { error: 'That join code did not match a classroom.' };

  revalidatePath('/classroom');
  redirect(`/classroom/${joined.classroom_id}`);
}

/** A student leaves a classroom they belong to. RLS permits a student to
 *  delete their own membership row directly, so no RPC is needed here. */
export async function leaveClassroom(classroomId: string) {
  const supabase = await getSupabaseServer();
  if (!supabase) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('classroom_members')
    .delete()
    .eq('classroom_id', classroomId)
    .eq('student_id', user.id);

  revalidatePath('/classroom');
  redirect('/classroom');
}
