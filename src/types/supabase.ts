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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_chat_usage: {
        Row: {
          cache_read_tokens: number | null
          cache_write_tokens: number | null
          created_at: string | null
          id: string
          input_tokens: number
          output_tokens: number
          session_id: string
          total_tokens: number
          turn_type: string
          user_id: string
        }
        Insert: {
          cache_read_tokens?: number | null
          cache_write_tokens?: number | null
          created_at?: string | null
          id?: string
          input_tokens: number
          output_tokens: number
          session_id: string
          total_tokens: number
          turn_type: string
          user_id: string
        }
        Update: {
          cache_read_tokens?: number | null
          cache_write_tokens?: number | null
          created_at?: string | null
          id?: string
          input_tokens?: number
          output_tokens?: number
          session_id?: string
          total_tokens?: number
          turn_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_config: {
        Row: {
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      daily_reflections: {
        Row: {
          ai_message: string
          created_at: string
          id: string
          reflection_date: string
          user_id: string
        }
        Insert: {
          ai_message: string
          created_at?: string
          id?: string
          reflection_date: string
          user_id: string
        }
        Update: {
          ai_message?: string
          created_at?: string
          id?: string
          reflection_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_reflections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bed_time: string | null
          energy_peaks: Json | null
          full_name: string | null
          id: string
          is_admin: boolean
          onboarding_completed: boolean | null
          updated_at: string | null
          wake_up_time: string | null
        }
        Insert: {
          bed_time?: string | null
          energy_peaks?: Json | null
          full_name?: string | null
          id: string
          is_admin?: boolean
          onboarding_completed?: boolean | null
          updated_at?: string | null
          wake_up_time?: string | null
        }
        Update: {
          bed_time?: string | null
          energy_peaks?: Json | null
          full_name?: string | null
          id?: string
          is_admin?: boolean
          onboarding_completed?: boolean | null
          updated_at?: string | null
          wake_up_time?: string | null
        }
        Relationships: []
      }
      skeleton_blocks: {
        Row: {
          created_at: string | null
          day_of_week: number
          end_time: string
          energy_cost: number
          flexibility_score: number
          id: string
          is_hard_constraint: boolean
          start_time: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          end_time: string
          energy_cost?: number
          flexibility_score?: number
          id?: string
          is_hard_constraint?: boolean
          start_time: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          energy_cost?: number
          flexibility_score?: number
          id?: string
          is_hard_constraint?: boolean
          start_time?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skeleton_blocks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      skeleton_suggestions: {
        Row: {
          created_at: string | null
          current_value: string
          field: string
          id: string
          rationale: string
          skeleton_block_id: string
          status: string
          suggested_value: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_value: string
          field: string
          id?: string
          rationale: string
          skeleton_block_id: string
          status?: string
          suggested_value: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_value?: string
          field?: string
          id?: string
          rationale?: string
          skeleton_block_id?: string
          status?: string
          suggested_value?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skeleton_suggestions_skeleton_block_id_fkey"
            columns: ["skeleton_block_id"]
            isOneToOne: false
            referencedRelation: "skeleton_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skeleton_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_notifications: {
        Row: {
          created_at: string
          id: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          responded_at: string | null
          response: Database["public"]["Enums"]["notification_response"] | null
          scheduled_for: string
          sent_at: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          responded_at?: string | null
          response?: Database["public"]["Enums"]["notification_response"] | null
          scheduled_for: string
          sent_at?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notification_type?: Database["public"]["Enums"]["notification_type"]
          responded_at?: string | null
          response?: Database["public"]["Enums"]["notification_response"] | null
          scheduled_for?: string
          sent_at?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string | null
          description: string | null
          end_time: string | null
          energy_cost: number | null
          flexibility_score: number
          id: string
          linked_task_id: string | null
          original_date: string
          skeleton_block_id: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["task_status"]
          task_date: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          energy_cost?: number | null
          flexibility_score?: number
          id?: string
          linked_task_id?: string | null
          original_date: string
          skeleton_block_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_date?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          energy_cost?: number | null
          flexibility_score?: number
          id?: string
          linked_task_id?: string | null
          original_date?: string
          skeleton_block_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_date?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_linked_task_id_fkey"
            columns: ["linked_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_skeleton_block_id_fkey"
            columns: ["skeleton_block_id"]
            isOneToOne: false
            referencedRelation: "skeleton_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_ai_chat_usage_summary: {
        Args: never
        Returns: {
          distinct_sessions: number
          distinct_users: number
          total_cache_read_tokens: number
          total_input_tokens: number
          total_output_tokens: number
          total_tokens: number
          total_turns: number
        }[]
      }
      admin_get_user_tasks: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string | null
          description: string | null
          end_time: string | null
          energy_cost: number | null
          flexibility_score: number
          id: string
          linked_task_id: string | null
          original_date: string
          skeleton_block_id: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["task_status"]
          task_date: string
          title: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_list_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          onboarding_completed: boolean
        }[]
      }
      admin_set_config: {
        Args: { p_key: string; p_value: Json }
        Returns: undefined
      }
      complete_onboarding: {
        Args: {
          p_bed_time: string
          p_blocks: Json
          p_peaks: Json
          p_user_id: string
          p_wake_up: string
        }
        Returns: undefined
      }
      get_or_create_daily_tasks: {
        Args: { p_date: string; p_day_of_week: number; p_user_id: string }
        Returns: {
          created_at: string | null
          description: string | null
          end_time: string | null
          energy_cost: number | null
          flexibility_score: number
          id: string
          linked_task_id: string | null
          original_date: string
          skeleton_block_id: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["task_status"]
          task_date: string
          title: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      notification_response: "done" | "rescheduled" | "not_done"
      notification_type: "reminder" | "confirmation"
      task_status: "pending" | "completed" | "rescheduled" | "cancelled"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      notification_response: ["done", "rescheduled", "not_done"],
      notification_type: ["reminder", "confirmation"],
      task_status: ["pending", "completed", "rescheduled", "cancelled"],
    },
  },
} as const

// Elle eklenmis kisaltmalar (db:types calistiginda supabase CLI tarafindan siliniyor,
// tekrar uretilirse bu blogu dosyanin sonuna geri eklemek gerekir)
export type Profile = Tables<'profiles'>
export type SkeletonBlock = Tables<'skeleton_blocks'>
export type Task = Tables<'tasks'>
export type DailyReflection = Tables<'daily_reflections'>
export type TaskNotification = Tables<'task_notifications'>
export type TaskStatus = Enums<'task_status'>
export type NotificationType = Enums<'notification_type'>
export type NotificationResponse = Enums<'notification_response'>
