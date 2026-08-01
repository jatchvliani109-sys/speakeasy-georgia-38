export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      business_documents: {
        Row: {
          content: string
          created_at: string
          doc_type: string
          highlights: Json
          id: string
          inputs: Json
          meta: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          doc_type: string
          highlights?: Json
          id?: string
          inputs?: Json
          meta?: Json
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          doc_type?: string
          highlights?: Json
          id?: string
          inputs?: Json
          meta?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      business_email_sessions: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          email_type: string
          feedback: Json | null
          id: string
          scenario_key: string
          session_data: Json
          updated_at: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          email_type: string
          feedback?: Json | null
          id?: string
          scenario_key: string
          session_data?: Json
          updated_at?: string
          user_email?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          email_type?: string
          feedback?: Json | null
          id?: string
          scenario_key?: string
          session_data?: Json
          updated_at?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      business_interview_sessions: {
        Row: {
          company_type: string
          completed: boolean
          completed_at: string | null
          created_at: string
          debrief: Json | null
          id: string
          result: string | null
          role_title: string
          scenario_key: string
          session_data: Json
          transcript: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          company_type: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          debrief?: Json | null
          id?: string
          result?: string | null
          role_title: string
          scenario_key: string
          session_data?: Json
          transcript?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          company_type?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          debrief?: Json | null
          id?: string
          result?: string | null
          role_title?: string
          scenario_key?: string
          session_data?: Json
          transcript?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      business_meeting_sessions: {
        Row: {
          company_type: string
          completed: boolean
          completed_at: string | null
          created_at: string
          debrief: Json | null
          id: string
          meeting_type: string
          result: string | null
          scenario_key: string
          session_data: Json
          transcript: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          company_type: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          debrief?: Json | null
          id?: string
          meeting_type: string
          result?: string | null
          scenario_key: string
          session_data?: Json
          transcript?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          company_type?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          debrief?: Json | null
          id?: string
          meeting_type?: string
          result?: string | null
          scenario_key?: string
          session_data?: Json
          transcript?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      business_presentation_sessions: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          debrief: Json | null
          id: string
          presentation_topic: string
          result: string | null
          scenario_key: string
          session_data: Json
          transcript: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          debrief?: Json | null
          id?: string
          presentation_topic: string
          result?: string | null
          scenario_key: string
          session_data?: Json
          transcript?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          debrief?: Json | null
          id?: string
          presentation_topic?: string
          result?: string | null
          scenario_key?: string
          session_data?: Json
          transcript?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      business_reassessments: {
        Row: {
          answers: Json | null
          created_at: string
          id: string
          level_after: string | null
          level_before: string | null
          open_text: string | null
          score_pct: number
          test_version: number
          user_id: string
        }
        Insert: {
          answers?: Json | null
          created_at?: string
          id?: string
          level_after?: string | null
          level_before?: string | null
          open_text?: string | null
          score_pct: number
          test_version: number
          user_id: string
        }
        Update: {
          answers?: Json | null
          created_at?: string
          id?: string
          level_after?: string | null
          level_before?: string | null
          open_text?: string | null
          score_pct?: number
          test_version?: number
          user_id?: string
        }
        Relationships: []
      }
      business_resumes: {
        Row: {
          achievements: Json
          created_at: string
          education: string | null
          file_name: string | null
          full_name: string | null
          graduation_year: string | null
          id: string
          industry: string | null
          job_title: string | null
          languages: Json
          mime_type: string | null
          raw_text: string | null
          skills: Json
          soft_skills: Json
          storage_path: string | null
          technical_skills: Json
          updated_at: string
          user_id: string
          years_of_experience: string | null
        }
        Insert: {
          achievements?: Json
          created_at?: string
          education?: string | null
          file_name?: string | null
          full_name?: string | null
          graduation_year?: string | null
          id?: string
          industry?: string | null
          job_title?: string | null
          languages?: Json
          mime_type?: string | null
          raw_text?: string | null
          skills?: Json
          soft_skills?: Json
          storage_path?: string | null
          technical_skills?: Json
          updated_at?: string
          user_id: string
          years_of_experience?: string | null
        }
        Update: {
          achievements?: Json
          created_at?: string
          education?: string | null
          file_name?: string | null
          full_name?: string | null
          graduation_year?: string | null
          id?: string
          industry?: string | null
          job_title?: string | null
          languages?: Json
          mime_type?: string | null
          raw_text?: string | null
          skills?: Json
          soft_skills?: Json
          storage_path?: string | null
          technical_skills?: Json
          updated_at?: string
          user_id?: string
          years_of_experience?: string | null
        }
        Relationships: []
      }
      business_state: {
        Row: {
          created_at: string
          self_intros: Json
          state: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          self_intros?: Json
          state?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          self_intros?: Json
          state?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      business_vocab_progress: {
        Row: {
          confidence: number
          correct_count: number
          created_at: string
          due_at: string
          field: string | null
          id: string
          last_seen_at: string | null
          manual_label: string | null
          meta: Json
          source: string
          updated_at: string
          user_id: string
          word_key: string
          wrong_count: number
        }
        Insert: {
          confidence?: number
          correct_count?: number
          created_at?: string
          due_at?: string
          field?: string | null
          id?: string
          last_seen_at?: string | null
          manual_label?: string | null
          meta?: Json
          source?: string
          updated_at?: string
          user_id: string
          word_key: string
          wrong_count?: number
        }
        Update: {
          confidence?: number
          correct_count?: number
          created_at?: string
          due_at?: string
          field?: string | null
          id?: string
          last_seen_at?: string | null
          manual_label?: string | null
          meta?: Json
          source?: string
          updated_at?: string
          user_id?: string
          word_key?: string
          wrong_count?: number
        }
        Relationships: []
      }
      business_vocab_sessions: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          new_words: number
          review_words: number
          score: number
          session_data: Json
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          new_words?: number
          review_words?: number
          score?: number
          session_data?: Json
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          new_words?: number
          review_words?: number
          score?: number
          session_data?: Json
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      lessons: {
        Row: {
          completed: boolean
          created_at: string
          ended_at: string | null
          id: string
          level: string | null
          messages: Json
          summary: Json | null
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          ended_at?: string | null
          id?: string
          level?: string | null
          messages?: Json
          summary?: Json | null
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          ended_at?: string | null
          id?: string
          level?: string | null
          messages?: Json
          summary?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      level_test_results: {
        Row: {
          answers: Json | null
          created_at: string
          id: string
          level: string
          score: number
          total: number
          user_id: string
        }
        Insert: {
          answers?: Json | null
          created_at?: string
          id?: string
          level: string
          score: number
          total: number
          user_id: string
        }
        Update: {
          answers?: Json | null
          created_at?: string
          id?: string
          level?: string
          score?: number
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      mistakes: {
        Row: {
          corrected_sentence: string
          created_at: string
          explanation_ka: string | null
          id: string
          lesson_id: string | null
          original_sentence: string
          tag: string
          user_id: string
        }
        Insert: {
          corrected_sentence: string
          created_at?: string
          explanation_ka?: string | null
          id?: string
          lesson_id?: string | null
          original_sentence: string
          tag?: string
          user_id: string
        }
        Update: {
          corrected_sentence?: string
          created_at?: string
          explanation_ka?: string | null
          id?: string
          lesson_id?: string | null
          original_sentence?: string
          tag?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mistakes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_answers: {
        Row: {
          age_group: string | null
          confidence: string | null
          created_at: string
          georgian_preference: string | null
          id: string
          learning_goal: string | null
          speaking_comfort: string | null
          user_id: string
        }
        Insert: {
          age_group?: string | null
          confidence?: string | null
          created_at?: string
          georgian_preference?: string | null
          id?: string
          learning_goal?: string | null
          speaking_comfort?: string | null
          user_id: string
        }
        Update: {
          age_group?: string | null
          confidence?: string | null
          created_at?: string
          georgian_preference?: string | null
          id?: string
          learning_goal?: string | null
          speaking_comfort?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          english_level: string | null
          first_name: string | null
          id: string
          last_activity: string | null
          level_test_completed: boolean
          longest_streak: number
          onboarding_completed: boolean
          selected_learning_path: string | null
          speaking_current_streak: number
          speaking_last_practice_date: string | null
          speaking_longest_streak: number
          streak: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          english_level?: string | null
          first_name?: string | null
          id: string
          last_activity?: string | null
          level_test_completed?: boolean
          longest_streak?: number
          onboarding_completed?: boolean
          selected_learning_path?: string | null
          speaking_current_streak?: number
          speaking_last_practice_date?: string | null
          speaking_longest_streak?: number
          streak?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          english_level?: string | null
          first_name?: string | null
          id?: string
          last_activity?: string | null
          level_test_completed?: boolean
          longest_streak?: number
          onboarding_completed?: boolean
          selected_learning_path?: string | null
          speaking_current_streak?: number
          speaking_last_practice_date?: string | null
          speaking_longest_streak?: number
          streak?: number
          updated_at?: string
        }
        Relationships: []
      }
      pronunciation_attempts: {
        Row: {
          created_at: string
          feedback_ka: string | null
          id: string
          missing_words: string[] | null
          score: number
          source: string | null
          target_phrase: string
          topic: string | null
          transcript: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback_ka?: string | null
          id?: string
          missing_words?: string[] | null
          score?: number
          source?: string | null
          target_phrase: string
          topic?: string | null
          transcript?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          feedback_ka?: string | null
          id?: string
          missing_words?: string[] | null
          score?: number
          source?: string | null
          target_phrase?: string
          topic?: string | null
          transcript?: string | null
          user_id?: string
        }
        Relationships: []
      }
      resume_parse_events: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      speaking_scenario_progress: {
        Row: {
          completed_at: string
          id: string
          scenario_id: string
          score: number
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          scenario_id: string
          score?: number
          tier: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          scenario_id?: string
          score?: number
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      vocabulary: {
        Row: {
          created_at: string
          difficulty: string | null
          english_word: string
          example_sentence: string | null
          georgian_meaning: string
          id: string
          lesson_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulty?: string | null
          english_word: string
          example_sentence?: string | null
          georgian_meaning: string
          id?: string
          lesson_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          difficulty?: string | null
          english_word?: string
          example_sentence?: string | null
          georgian_meaning?: string
          id?: string
          lesson_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocabulary_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_ai_session: {
        Args: { p_limit: number; p_user_id: string; p_week: string }
        Returns: Json
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      refund_ai_session: {
        Args: { p_user_id: string; p_week: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
