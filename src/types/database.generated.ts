export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      achievements: {
        Row: {
          created_at: string
          description: string
          enabled: boolean
          evaluator_key: string
          id: string
          insight_reward: number
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description: string
          enabled?: boolean
          evaluator_key: string
          id?: string
          insight_reward?: number
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string
          enabled?: boolean
          evaluator_key?: string
          id?: string
          insight_reward?: number
          name?: string
          slug?: string
        }
        Relationships: []
      }
      activity_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_day: string | null
          group_id: string
          id: string
          kind: Database["public"]["Enums"]["activity_kind"]
          payload: Json
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_day?: string | null
          group_id: string
          id?: string
          kind: Database["public"]["Enums"]["activity_kind"]
          payload?: Json
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_day?: string | null
          group_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["activity_kind"]
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          id: number
          target_id: string | null
          target_table: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          id?: never
          target_id?: string | null
          target_table: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          id?: never
          target_id?: string | null
          target_table?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      answer_aliases: {
        Row: {
          answer: string
          id: string
          normalized_answer: string
          question_version_id: string
        }
        Insert: {
          answer: string
          id?: string
          normalized_answer: string
          question_version_id: string
        }
        Update: {
          answer?: string
          id?: string
          normalized_answer?: string
          question_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_aliases_question_version_id_fkey"
            columns: ["question_version_id"]
            isOneToOne: false
            referencedRelation: "question_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_responses: {
        Row: {
          assessment_run_id: string
          attempt_id: string
          id: string
          ordinal: number
          topic_id: string
        }
        Insert: {
          assessment_run_id: string
          attempt_id: string
          id?: string
          ordinal: number
          topic_id: string
        }
        Update: {
          assessment_run_id?: string
          attempt_id?: string
          id?: string
          ordinal?: number
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_responses_assessment_run_id_fkey"
            columns: ["assessment_run_id"]
            isOneToOne: false
            referencedRelation: "assessment_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_responses_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: true
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_responses_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_runs: {
        Row: {
          completed_at: string | null
          id: string
          response_count: number
          session_id: string
          started_at: string
          status: string
          topic_difficulties: Json
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          response_count?: number
          session_id: string
          started_at?: string
          status?: string
          topic_difficulties?: Json
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          response_count?: number
          session_id?: string
          started_at?: string
          status?: string
          topic_difficulties?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_runs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "play_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_runs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assistance_events: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["assistance_kind"]
          point_factor: number
          presentation_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["assistance_kind"]
          point_factor: number
          presentation_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["assistance_kind"]
          point_factor?: number
          presentation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistance_events_presentation_id_fkey"
            columns: ["presentation_id"]
            isOneToOne: false
            referencedRelation: "question_presentations"
            referencedColumns: ["id"]
          },
        ]
      }
      attempts: {
        Row: {
          assisted: boolean
          correct: boolean
          created_at: string
          earned_points: number
          elapsed_ms: number
          id: string
          idempotency_key: string
          presentation_id: string
          question_version_id: string
          remaining_ratio: number
          score_snapshot: Json
          submitted_answer: string | null
          timed_out: boolean
          user_id: string
        }
        Insert: {
          assisted: boolean
          correct: boolean
          created_at?: string
          earned_points: number
          elapsed_ms: number
          id?: string
          idempotency_key: string
          presentation_id: string
          question_version_id: string
          remaining_ratio: number
          score_snapshot: Json
          submitted_answer?: string | null
          timed_out?: boolean
          user_id: string
        }
        Update: {
          assisted?: boolean
          correct?: boolean
          created_at?: string
          earned_points?: number
          elapsed_ms?: number
          id?: string
          idempotency_key?: string
          presentation_id?: string
          question_version_id?: string
          remaining_ratio?: number
          score_snapshot?: Json
          submitted_answer?: string | null
          timed_out?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempts_presentation_id_fkey"
            columns: ["presentation_id"]
            isOneToOne: true
            referencedRelation: "question_presentations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_question_version_id_fkey"
            columns: ["question_version_id"]
            isOneToOne: false
            referencedRelation: "question_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_invites: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          expires_at: string
          id: string
          max_uses: number
          revoked_at: string | null
          token_hash: string
          use_count: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at: string
          id?: string
          max_uses?: number
          revoked_at?: string | null
          token_hash: string
          use_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string
          id?: string
          max_uses?: number
          revoked_at?: string | null
          token_hash?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "beta_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      distractors: {
        Row: {
          answer: string
          id: string
          question_version_id: string
          sort_order: number
        }
        Insert: {
          answer: string
          id?: string
          question_version_id: string
          sort_order: number
        }
        Update: {
          answer?: string
          id?: string
          question_version_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "distractors_question_version_id_fkey"
            columns: ["question_version_id"]
            isOneToOne: false
            referencedRelation: "question_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_reports: {
        Row: {
          app_version: string | null
          category: string
          contact_allowed: boolean
          created_at: string
          description: string
          expected_behavior: string | null
          id: string
          impact: string
          page_path: string
          reporter_user_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          app_version?: string | null
          category: string
          contact_allowed?: boolean
          created_at?: string
          description: string
          expected_behavior?: string | null
          id?: string
          impact: string
          page_path: string
          reporter_user_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          app_version?: string | null
          category?: string
          contact_allowed?: boolean
          created_at?: string
          description?: string
          expected_behavior?: string | null
          id?: string
          impact?: string
          page_path?: string
          reporter_user_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_reports_reporter_user_id_fkey"
            columns: ["reporter_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_invites: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          group_id: string
          id: string
          max_uses: number
          revoked_at: string | null
          token_hash: string
          use_count: number
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at: string
          group_id: string
          id?: string
          max_uses?: number
          revoked_at?: string | null
          token_hash: string
          use_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          group_id?: string
          id?: string
          max_uses?: number
          revoked_at?: string | null
          token_hash?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "group_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_invites_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_memberships: {
        Row: {
          group_id: string
          joined_at: string
          role: Database["public"]["Enums"]["group_role"]
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          role?: Database["public"]["Enums"]["group_role"]
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["group_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          avatar_path: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          name: string
          timer_seconds_override: number | null
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          created_by: string
          description?: string
          id?: string
          name: string
          timer_seconds_override?: number | null
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          name?: string
          timer_seconds_override?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      insight_ledger: {
        Row: {
          amount: number
          created_at: string
          id: string
          idempotency_key: string
          reason: string
          source_id: string | null
          source_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          idempotency_key: string
          reason: string
          source_id?: string | null
          source_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          idempotency_key?: string
          reason?: string
          source_id?: string | null
          source_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insight_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          alt_text: string
          attribution: string
          created_at: string
          created_by: string | null
          duration_seconds: number | null
          id: string
          kind: Database["public"]["Enums"]["media_kind"]
          license: string
          mime_type: string
          size_bytes: number
          storage_path: string
          transcript: string | null
        }
        Insert: {
          alt_text: string
          attribution: string
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          id?: string
          kind: Database["public"]["Enums"]["media_kind"]
          license: string
          mime_type: string
          size_bytes: number
          storage_path: string
          transcript?: string | null
        }
        Update: {
          alt_text?: string
          attribution?: string
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["media_kind"]
          license?: string
          mime_type?: string
          size_bytes?: number
          storage_path?: string
          transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pack_questions: {
        Row: {
          pack_id: string
          question_id: string
          sort_order: number
        }
        Insert: {
          pack_id: string
          question_id: string
          sort_order?: number
        }
        Update: {
          pack_id?: string
          question_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "pack_questions_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pack_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      pack_unlocks: {
        Row: {
          cost_insight: number
          pack_id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          cost_insight: number
          pack_id: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          cost_insight?: number
          pack_id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pack_unlocks_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pack_unlocks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      packs: {
        Row: {
          created_at: string
          description: string
          enabled: boolean
          id: string
          is_starter: boolean
          name: string
          price_insight: number
          slug: string
          topic_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          enabled?: boolean
          id?: string
          is_starter?: boolean
          name: string
          price_insight?: number
          slug: string
          topic_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          enabled?: boolean
          id?: string
          is_starter?: boolean
          name?: string
          price_insight?: number
          slug?: string
          topic_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "packs_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      play_sessions: {
        Row: {
          ended_at: string | null
          group_id: string | null
          id: string
          mode: Database["public"]["Enums"]["play_mode"]
          pack_id: string | null
          question_count: number
          scoring_timer_seconds: number
          started_at: string
          timer_limit_seconds: number
          topic_id: string | null
          user_id: string
        }
        Insert: {
          ended_at?: string | null
          group_id?: string | null
          id?: string
          mode: Database["public"]["Enums"]["play_mode"]
          pack_id?: string | null
          question_count?: number
          scoring_timer_seconds?: number
          started_at?: string
          timer_limit_seconds?: number
          topic_id?: string | null
          user_id: string
        }
        Update: {
          ended_at?: string | null
          group_id?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["play_mode"]
          pack_id?: string | null
          question_count?: number
          scoring_timer_seconds?: number
          started_at?: string
          timer_limit_seconds?: number
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "play_sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "play_sessions_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "play_sessions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "play_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age_confirmed: boolean
          avatar_path: string | null
          beta_access_granted_at: string | null
          created_at: string
          disabled_at: string | null
          display_name: string
          id: string
          immediate_choice_submit: boolean
          last_app_version: string | null
          last_updates_read_version: string | null
          onboarding_completed: boolean
          role: Database["public"]["Enums"]["user_role"]
          show_play_intro: boolean
          updated_at: string
        }
        Insert: {
          age_confirmed?: boolean
          avatar_path?: string | null
          beta_access_granted_at?: string | null
          created_at?: string
          disabled_at?: string | null
          display_name?: string
          id: string
          immediate_choice_submit?: boolean
          last_app_version?: string | null
          last_updates_read_version?: string | null
          onboarding_completed?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          show_play_intro?: boolean
          updated_at?: string
        }
        Update: {
          age_confirmed?: boolean
          avatar_path?: string | null
          beta_access_granted_at?: string | null
          created_at?: string
          disabled_at?: string | null
          display_name?: string
          id?: string
          immediate_choice_submit?: boolean
          last_app_version?: string | null
          last_updates_read_version?: string | null
          onboarding_completed?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          show_play_intro?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      question_citations: {
        Row: {
          id: string
          label: string
          question_version_id: string
          sort_order: number
          url: string
        }
        Insert: {
          id?: string
          label: string
          question_version_id: string
          sort_order?: number
          url: string
        }
        Update: {
          id?: string
          label?: string
          question_version_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_citations_question_version_id_fkey"
            columns: ["question_version_id"]
            isOneToOne: false
            referencedRelation: "question_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      question_editorial_reviews: {
        Row: {
          created_at: string
          notes: string | null
          player_feedback_reviewed_at: string | null
          question_version_id: string
          reviewed_by: string
          updated_at: string
          verdict: string
        }
        Insert: {
          created_at?: string
          notes?: string | null
          player_feedback_reviewed_at?: string | null
          question_version_id: string
          reviewed_by: string
          updated_at?: string
          verdict: string
        }
        Update: {
          created_at?: string
          notes?: string | null
          player_feedback_reviewed_at?: string | null
          question_version_id?: string
          reviewed_by?: string
          updated_at?: string
          verdict?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_editorial_reviews_question_version_id_fkey"
            columns: ["question_version_id"]
            isOneToOne: true
            referencedRelation: "question_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_editorial_reviews_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      question_feedback: {
        Row: {
          answer_correct: boolean
          assisted: boolean
          attempt_id: string
          comment: string | null
          created_at: string
          id: string
          question_version_id: string
          reasons: string[]
          sentiment: string
          timed_out: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          answer_correct: boolean
          assisted: boolean
          attempt_id: string
          comment?: string | null
          created_at?: string
          id?: string
          question_version_id: string
          reasons?: string[]
          sentiment: string
          timed_out: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          answer_correct?: boolean
          assisted?: boolean
          attempt_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          question_version_id?: string
          reasons?: string[]
          sentiment?: string
          timed_out?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_feedback_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_feedback_question_version_id_fkey"
            columns: ["question_version_id"]
            isOneToOne: false
            referencedRelation: "question_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      question_media: {
        Row: {
          media_asset_id: string
          question_version_id: string
        }
        Insert: {
          media_asset_id: string
          question_version_id: string
        }
        Update: {
          media_asset_id?: string
          question_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_media_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_media_question_version_id_fkey"
            columns: ["question_version_id"]
            isOneToOne: true
            referencedRelation: "question_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      question_presentations: {
        Row: {
          algorithm_version: string
          choices_revealed: boolean
          expires_at: string
          finalized_at: string | null
          id: string
          loading_grace_expires_at: string | null
          media_ready_at: string | null
          prior_correct_count: number
          proficiency_snapshot: number
          question_version_id: string
          scoring_timer_seconds: number
          sequence_number: number
          session_id: string
          started_at: string
          starting_points: number
          timer_limit_seconds: number
          user_id: string
        }
        Insert: {
          algorithm_version: string
          choices_revealed?: boolean
          expires_at: string
          finalized_at?: string | null
          id?: string
          loading_grace_expires_at?: string | null
          media_ready_at?: string | null
          prior_correct_count: number
          proficiency_snapshot: number
          question_version_id: string
          scoring_timer_seconds?: number
          sequence_number: number
          session_id: string
          started_at?: string
          starting_points: number
          timer_limit_seconds?: number
          user_id: string
        }
        Update: {
          algorithm_version?: string
          choices_revealed?: boolean
          expires_at?: string
          finalized_at?: string | null
          id?: string
          loading_grace_expires_at?: string | null
          media_ready_at?: string | null
          prior_correct_count?: number
          proficiency_snapshot?: number
          question_version_id?: string
          scoring_timer_seconds?: number
          sequence_number?: number
          session_id?: string
          started_at?: string
          starting_points?: number
          timer_limit_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_presentations_question_version_id_fkey"
            columns: ["question_version_id"]
            isOneToOne: false
            referencedRelation: "question_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_presentations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "play_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_presentations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      question_reports: {
        Row: {
          category: string
          created_at: string
          details: string
          id: string
          question_version_id: string
          reporter_user_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          category: string
          created_at?: string
          details: string
          id?: string
          question_version_id: string
          reporter_user_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          category?: string
          created_at?: string
          details?: string
          id?: string
          question_version_id?: string
          reporter_user_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_reports_question_version_id_fkey"
            columns: ["question_version_id"]
            isOneToOne: false
            referencedRelation: "question_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_reports_reporter_user_id_fkey"
            columns: ["reporter_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      question_subtopics: {
        Row: {
          question_id: string
          subtopic_id: string
        }
        Insert: {
          question_id: string
          subtopic_id: string
        }
        Update: {
          question_id?: string
          subtopic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_subtopics_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_subtopics_subtopic_id_fkey"
            columns: ["subtopic_id"]
            isOneToOne: false
            referencedRelation: "subtopics"
            referencedColumns: ["id"]
          },
        ]
      }
      question_versions: {
        Row: {
          answer_mode: string
          canonical_answer: string
          created_at: string
          created_by: string | null
          details: string
          difficulty: number
          expires_at: string | null
          explanation: string
          id: string
          prompt: string
          published_at: string | null
          question_id: string
          remove_leading_articles: boolean
          status: Database["public"]["Enums"]["question_status"]
          time_limit_seconds: number
          topic_id: string
          verified_at: string | null
          version_number: number
        }
        Insert: {
          answer_mode?: string
          canonical_answer: string
          created_at?: string
          created_by?: string | null
          details: string
          difficulty: number
          expires_at?: string | null
          explanation: string
          id?: string
          prompt: string
          published_at?: string | null
          question_id: string
          remove_leading_articles?: boolean
          status?: Database["public"]["Enums"]["question_status"]
          time_limit_seconds?: number
          topic_id: string
          verified_at?: string | null
          version_number: number
        }
        Update: {
          answer_mode?: string
          canonical_answer?: string
          created_at?: string
          created_by?: string | null
          details?: string
          difficulty?: number
          expires_at?: string | null
          explanation?: string
          id?: string
          prompt?: string
          published_at?: string | null
          question_id?: string
          remove_leading_articles?: boolean
          status?: Database["public"]["Enums"]["question_status"]
          time_limit_seconds?: number
          topic_id?: string
          verified_at?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "question_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_versions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_versions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          catalog_hash: string | null
          catalog_key: string | null
          created_at: string
          id: string
          retired_at: string | null
        }
        Insert: {
          catalog_hash?: string | null
          catalog_key?: string | null
          created_at?: string
          id?: string
          retired_at?: string | null
        }
        Update: {
          catalog_hash?: string | null
          catalog_key?: string | null
          created_at?: string
          id?: string
          retired_at?: string | null
        }
        Relationships: []
      }
      subtopics: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          topic_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          topic_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtopics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          default_timer_seconds: number
          id: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          default_timer_seconds?: number
          id?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          default_timer_seconds?: number
          id?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          description: string
          enabled: boolean
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description: string
          enabled?: boolean
          id?: string
          name: string
          slug: string
          sort_order: number
        }
        Update: {
          created_at?: string
          description?: string
          enabled?: boolean
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          notified_at: string | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          notified_at?: string | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          notified_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_interests: {
        Row: {
          created_at: string
          topic_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          topic_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_interests_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_interests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_login_days: {
        Row: {
          login_date: string
          recorded_at: string
          user_id: string
        }
        Insert: {
          login_date: string
          recorded_at?: string
          user_id: string
        }
        Update: {
          login_date?: string
          recorded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_login_days_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_question_state: {
        Row: {
          attempt_count: number
          correct_count: number
          last_attempt_at: string | null
          last_correct: boolean | null
          last_session_sequence: number | null
          next_review_at: string | null
          question_id: string
          user_id: string
        }
        Insert: {
          attempt_count?: number
          correct_count?: number
          last_attempt_at?: string | null
          last_correct?: boolean | null
          last_session_sequence?: number | null
          next_review_at?: string | null
          question_id: string
          user_id: string
        }
        Update: {
          attempt_count?: number
          correct_count?: number
          last_attempt_at?: string | null
          last_correct?: boolean | null
          last_session_sequence?: number | null
          next_review_at?: string | null
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_question_state_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_question_state_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subtopic_mastery: {
        Row: {
          assisted_correct_attempts: number
          correct_attempts: number
          lifetime_points: number
          subtopic_id: string
          total_attempts: number
          unique_questions: number
          updated_at: string
          user_id: string
          weighted_evidence: number
          weighted_successes: number
        }
        Insert: {
          assisted_correct_attempts?: number
          correct_attempts?: number
          lifetime_points?: number
          subtopic_id: string
          total_attempts?: number
          unique_questions?: number
          updated_at?: string
          user_id: string
          weighted_evidence?: number
          weighted_successes?: number
        }
        Update: {
          assisted_correct_attempts?: number
          correct_attempts?: number
          lifetime_points?: number
          subtopic_id?: string
          total_attempts?: number
          unique_questions?: number
          updated_at?: string
          user_id?: string
          weighted_evidence?: number
          weighted_successes?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_subtopic_mastery_subtopic_id_fkey"
            columns: ["subtopic_id"]
            isOneToOne: false
            referencedRelation: "subtopics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subtopic_mastery_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subtopic_question_state: {
        Row: {
          first_attempt_at: string
          question_id: string
          subtopic_id: string
          user_id: string
        }
        Insert: {
          first_attempt_at?: string
          question_id: string
          subtopic_id: string
          user_id: string
        }
        Update: {
          first_attempt_at?: string
          question_id?: string
          subtopic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subtopic_question_state_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subtopic_question_state_subtopic_id_fkey"
            columns: ["subtopic_id"]
            isOneToOne: false
            referencedRelation: "subtopics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subtopic_question_state_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_topic_mastery: {
        Row: {
          assisted_correct_attempts: number
          correct_attempts: number
          lifetime_points: number
          tier: string
          topic_id: string
          total_attempts: number
          unique_questions: number
          updated_at: string
          user_id: string
          weighted_evidence: number
          weighted_successes: number
        }
        Insert: {
          assisted_correct_attempts?: number
          correct_attempts?: number
          lifetime_points?: number
          tier?: string
          topic_id: string
          total_attempts?: number
          unique_questions?: number
          updated_at?: string
          user_id: string
          weighted_evidence?: number
          weighted_successes?: number
        }
        Update: {
          assisted_correct_attempts?: number
          correct_attempts?: number
          lifetime_points?: number
          tier?: string
          topic_id?: string
          total_attempts?: number
          unique_questions?: number
          updated_at?: string
          user_id?: string
          weighted_evidence?: number
          weighted_successes?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_topic_mastery_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_topic_mastery_user_id_fkey"
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
      assign_question_subtopics_v1: {
        Args: {
          subtopic_names: string[]
          target_admin: string
          target_question: string
          target_topic: string
        }
        Returns: undefined
      }
      award_achievement_v1: {
        Args: { evaluator: string; target_user: string }
        Returns: {
          insight_awarded: number
          name: string
          slug: string
        }[]
      }
      create_group_with_admin: {
        Args: { group_description?: string; group_name: string }
        Returns: string
      }
      finalize_attempt_v1: {
        Args: {
          elapsed: number
          evidence_delta: number
          new_correct_count: number
          new_tier: string
          next_review: string
          points: number
          remaining: number
          request_key: string
          snapshot: Json
          submitted: string
          success_delta: number
          target_presentation: string
          target_question: string
          target_topic: string
          target_user: string
          unique_delta: number
          was_assisted: boolean
          was_correct: boolean
          was_timeout: boolean
        }
        Returns: string
      }
      import_question_batch_v1: {
        Args: { payload: Json; target_admin: string }
        Returns: {
          question_id: string
          version_id: string
        }[]
      }
      is_active_user: { Args: { check_user?: string }; Returns: boolean }
      is_group_admin: {
        Args: { check_group: string; check_user?: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { check_group: string; check_user?: string }
        Returns: boolean
      }
      is_sys_admin: { Args: { check_user?: string }; Returns: boolean }
      question_quality_pack_summary_v1: {
        Args: never
        Returns: {
          approved_questions: number
          flagged_questions: number
          needs_revision_questions: number
          pack_id: string
          pack_name: string
          pack_slug: string
          rejected_questions: number
          total_questions: number
          unreviewed_questions: number
        }[]
      }
      record_daily_login_v1: { Args: never; Returns: boolean }
      redeem_invite_for_user: {
        Args: { raw_token: string; target_user: string }
        Returns: {
          granted: boolean
          joined_group: string
        }[]
      }
      replace_question_subtopics_v1: {
        Args: {
          subtopic_names: string[]
          target_admin: string
          target_question: string
          target_topic: string
        }
        Returns: undefined
      }
      shares_group: {
        Args: { check_user?: string; other_user: string }
        Returns: boolean
      }
      sync_published_catalog_v1: {
        Args: { payload: Json }
        Returns: {
          result_action: string
          result_key: string
          result_question_id: string
          result_version_id: string
        }[]
      }
      sync_published_catalog_v2: {
        Args: { payload: Json }
        Returns: {
          result_action: string
          result_key: string
          result_question_id: string
          result_version_id: string
        }[]
      }
      unlock_pack: {
        Args: { request_key: string; target_pack: string }
        Returns: number
      }
    }
    Enums: {
      activity_kind:
        | "group_joined"
        | "played_today"
        | "achievement_earned"
        | "mastery_tier_up"
        | "pack_unlocked"
      assistance_kind: "show_choices"
      group_role: "member" | "admin"
      media_kind: "image" | "audio" | "video"
      play_mode: "mixed" | "topic" | "pack"
      question_status: "draft" | "review" | "published" | "retired"
      user_role: "user" | "sys_admin"
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
      activity_kind: [
        "group_joined",
        "played_today",
        "achievement_earned",
        "mastery_tier_up",
        "pack_unlocked",
      ],
      assistance_kind: ["show_choices"],
      group_role: ["member", "admin"],
      media_kind: ["image", "audio", "video"],
      play_mode: ["mixed", "topic", "pack"],
      question_status: ["draft", "review", "published", "retired"],
      user_role: ["user", "sys_admin"],
    },
  },
} as const
