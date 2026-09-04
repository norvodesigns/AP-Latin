'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServer } from '@/lib/supabase/server';
import { ASSIGNABLE_SECTIONS, type AssignableSection } from '@/lib/supabase/types';

export interface AssignmentResult {
  error: string | null;
}

/** RLS ("assignments: teacher manages") already confirms the caller teaches
 *  this classroom before permitting the insert, so there is no separate
 *  ownership check here — a mismatched classroomId simply fails at the
 *  database rather than needing to be caught in application code. */
export async function createAssignment(
  classroomId: string,
  _prev: AssignmentResult,
  formData: FormData,
): Promise<AssignmentResult> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: 'Accounts are not enabled on this deployment.' };

  const section = String(formData.get('section') ?? '');
  if (!ASSIGNABLE_SECTIONS.includes(section as AssignableSection)) {
    return { error: 'Choose a section.' };
  }

  const targetMinutes = Number(formData.get('targetMinutes'));
  if (!Number.isFinite(targetMinutes) || targetMinutes < 1 || targetMinutes > 10000) {
    return { error: 'Target minutes must be between 1 and 10,000.' };
  }

  const dueDate = String(formData.get('dueDate') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim();
  if (note.length > 500) return { error: 'Keep the note under 500 characters.' };

  const { error } = await supabase.from('assignments').insert({
    classroom_id: classroomId,
    section: section as AssignableSection,
    target_minutes: Math.round(targetMinutes),
    due_date: dueDate || null,
    note: note || null,
  });
  if (error) return { error: error.message };

  revalidatePath(`/teach/${classroomId}`);
  revalidatePath(`/classroom/${classroomId}`);
  return { error: null };
}

export async function deleteAssignment(assignmentId: string, classroomId: string) {
  const supabase = await getSupabaseServer();
  if (!supabase) return;

  await supabase.from('assignments').delete().eq('id', assignmentId);

  revalidatePath(`/teach/${classroomId}`);
  revalidatePath(`/classroom/${classroomId}`);
}

export async function toggleArchived(classroomId: string, archived: boolean) {
  const supabase = await getSupabaseServer();
  if (!supabase) return;

  await supabase.from('classrooms').update({ archived }).eq('id', classroomId);

  revalidatePath(`/teach/${classroomId}`);
  revalidatePath('/teach');
}
