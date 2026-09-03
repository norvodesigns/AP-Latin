/**
 * Hand-written types for the Lectio schema.
 *
 * These mirror supabase/migrations/*.sql. If you change the schema, change
 * these too — they are what gives the app compile-time safety over queries.
 * (You can regenerate them instead with
 *  `supabase gen types typescript --project-id <id>`.)
 */

export type Role = 'student' | 'teacher';
export type GradingSource = 'auto' | 'self';

/** Sections a teacher can assign time on. Mirrors the CHECK constraint. */
export const ASSIGNABLE_SECTIONS = [
  'read', 'translate', 'sight', 'quiz', 'vocab', 'grammar',
  'scansion', 'devices', 'context', 'frq', 'exam', 'plan',
] as const;

export type AssignableSection = (typeof ASSIGNABLE_SECTIONS)[number];

export type Profile = {
  id: string;
  role: Role;
  display_name: string;
  created_at: string;
};

export type Classroom = {
  id: string;
  teacher_id: string;
  name: string;
  join_code: string;
  exam_date: string | null;
  archived: boolean;
  created_at: string;
};

export type ClassroomMember = {
  classroom_id: string;
  student_id: string;
  joined_at: string;
};

export type Assignment = {
  id: string;
  classroom_id: string;
  section: AssignableSection;
  target_minutes: number;
  due_date: string | null;
  note: string | null;
  created_at: string;
};

export type StudySession = {
  student_id: string;
  section: string;
  day: string;
  seconds: number;
  updated_at: string;
};

export type ActivityStat = {
  student_id: string;
  day: string;
  source: GradingSource;
  correct: number;
  total: number;
  updated_at: string;
};

/** Row shape returned by the classroom_leaderboard RPC. */
export type LeaderboardRow = {
  student_id: string;
  display_name: string;
  total_seconds: number;
  auto_correct: number;
  auto_total: number;
  self_correct: number;
  self_total: number;
  overall_correct: number;
  overall_total: number;
};

/** Row shape returned by the classroom_section_time RPC. */
export type SectionTimeRow = {
  student_id: string;
  section: string;
  seconds: number;
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at'> & { created_at?: string };
        Update: Partial<Omit<Profile, 'id'>>;
        Relationships: [];
      };
      classrooms: {
        Row: Classroom;
        Insert: Omit<Classroom, 'id' | 'created_at' | 'archived' | 'join_code'> & {
          id?: string;
          created_at?: string;
          archived?: boolean;
          join_code?: string;
        };
        Update: Partial<Omit<Classroom, 'id' | 'teacher_id'>>;
        Relationships: [];
      };
      classroom_members: {
        Row: ClassroomMember;
        Insert: Omit<ClassroomMember, 'joined_at'> & { joined_at?: string };
        Update: Partial<ClassroomMember>;
        Relationships: [];
      };
      assignments: {
        Row: Assignment;
        Insert: Omit<Assignment, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Assignment, 'id' | 'classroom_id'>>;
        Relationships: [];
      };
      study_sessions: {
        Row: StudySession;
        Insert: Omit<StudySession, 'updated_at'> & { updated_at?: string };
        Update: Partial<Pick<StudySession, 'seconds' | 'updated_at'>>;
        Relationships: [];
      };
      activity_stats: {
        Row: ActivityStat;
        Insert: Omit<ActivityStat, 'updated_at'> & { updated_at?: string };
        Update: Partial<Pick<ActivityStat, 'correct' | 'total' | 'updated_at'>>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      join_classroom: {
        Args: { code: string };
        Returns: { classroom_id: string; classroom_name: string }[];
      };
      create_classroom: {
        Args: { name: string; exam_date?: string | null };
        Returns: Classroom;
      };
      classroom_leaderboard: {
        Args: { cid: string; since?: string | null };
        Returns: LeaderboardRow[];
      };
      classroom_section_time: {
        Args: { cid: string; since?: string | null };
        Returns: SectionTimeRow[];
      };
      bump_study_seconds: {
        Args: { p_section: string; p_day: string; p_delta: number };
        Returns: undefined;
      };
      bump_activity_stats: {
        Args: { p_day: string; p_source: GradingSource; p_correct: number; p_total: number };
        Returns: undefined;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
