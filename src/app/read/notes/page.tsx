import type { Metadata } from 'next';
import StudyNotes from './StudyNotes';

export const metadata: Metadata = { title: 'My notes' };

export default function NotesPage() {
  return <StudyNotes />;
}
