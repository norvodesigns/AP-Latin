'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getSupabaseServer } from '@/lib/supabase/server';

export interface CreateClassroomResult {
  error: string | null;
}

export async function createClassroom(
  _prev: CreateClassroomResult,
  formData: FormData,
): Promise<CreateClassroomResult> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: 'Accounts are not enabled on this deployment.' };

  const name = String(formData.get('name') ?? '').trim();
  const examDate = String(formData.get('examDate') ?? '').trim();
  if (name.length < 1 || name.length > 80) {
    return { error: 'Enter a classroom name between 1 and 80 characters.' };
  }

  const { data, error } = await supabase.rpc('create_classroom', {
    name,
    exam_date: examDate || null,
  });
  if (error) return { error: error.message };
  if (!data) return { error: 'The classroom was not created.' };

  revalidatePath('/teach');
  redirect(`/teach/${data.id}`);
}
