export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type TaskStatus = 'pending' | 'completed' | 'rescheduled' | 'cancelled'

export type EnergyPeaks = {
  morning: 'high' | 'low' | 'medium'
  afternoon: 'high' | 'low' | 'medium'
  evening: 'high' | 'low' | 'medium'
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          wake_up_time: string
          bed_time: string
          energy_peaks: Json | null
          onboarding_completed: boolean
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          wake_up_time?: string
          bed_time?: string
          energy_peaks?: Json | null
          onboarding_completed?: boolean
          updated_at?: string
        }
        Update: {
          full_name?: string | null
          wake_up_time?: string
          bed_time?: string
          energy_peaks?: Json | null
          onboarding_completed?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      skeleton_blocks: {
        Row: {
          id: string
          user_id: string
          day_of_week: number
          start_time: string
          end_time: string
          title: string
          is_hard_constraint: boolean
          energy_cost: number
          flexibility_score: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          day_of_week: number
          start_time: string
          end_time: string
          title: string
          is_hard_constraint?: boolean
          energy_cost?: number
          flexibility_score?: number
          created_at?: string
        }
        Update: {
          day_of_week?: number
          start_time?: string
          end_time?: string
          title?: string
          is_hard_constraint?: boolean
          energy_cost?: number
          flexibility_score?: number
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          skeleton_block_id: string | null
          title: string
          description: string | null
          task_date: string
          start_time: string | null
          end_time: string | null
          energy_cost: number | null
          flexibility_score: number
          status: TaskStatus
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          skeleton_block_id?: string | null
          title: string
          description?: string | null
          task_date?: string
          start_time?: string | null
          end_time?: string | null
          energy_cost?: number | null
          flexibility_score?: number
          status?: TaskStatus
          created_at?: string
        }
        Update: {
          skeleton_block_id?: string | null
          title?: string
          description?: string | null
          task_date?: string
          start_time?: string | null
          end_time?: string | null
          energy_cost?: number | null
          flexibility_score?: number
          status?: TaskStatus
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_or_create_daily_tasks: {
        Args: { p_user_id: string; p_date: string; p_day_of_week: number }
        Returns: {
          id: string
          user_id: string
          skeleton_block_id: string | null
          title: string
          description: string | null
          task_date: string
          start_time: string | null
          end_time: string | null
          energy_cost: number | null
          flexibility_score: number
          status: TaskStatus
          created_at: string
        }[]
      }
      complete_onboarding: {
        Args: {
          p_user_id: string
          p_blocks: Json
          p_wake_up: string
          p_bed_time: string
          p_peaks: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      task_status: TaskStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience helpers
type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Row']

export type InsertTables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert']

export type UpdateTables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update']

export type Profile = Tables<'profiles'>
export type SkeletonBlock = Tables<'skeleton_blocks'>
export type Task = Tables<'tasks'>
