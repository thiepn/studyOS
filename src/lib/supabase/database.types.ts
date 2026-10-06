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
      account_app_connections: {
        Row: {
          app_slug: string
          connected_at: string
          disconnected_at: string | null
          last_used_at: string | null
          source: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_slug: string
          connected_at?: string
          disconnected_at?: string | null
          last_used_at?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_slug?: string
          connected_at?: string
          disconnected_at?: string | null
          last_used_at?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_app_connections_app_slug_fkey"
            columns: ["app_slug"]
            isOneToOne: false
            referencedRelation: "account_apps"
            referencedColumns: ["slug"]
          },
        ]
      }
      account_app_deletion_operations: {
        Row: {
          app_slug: string
          completed_at: string
          error_code: string | null
          id: string
          result: Json | null
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          app_slug: string
          completed_at?: string
          error_code?: string | null
          id?: string
          result?: Json | null
          started_at?: string
          status: string
          user_id: string
        }
        Update: {
          app_slug?: string
          completed_at?: string
          error_code?: string | null
          id?: string
          result?: Json | null
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      account_app_deletion_plans: {
        Row: {
          app_slug: string
          backup_impact: string
          blockers: Json
          created_at: string
          expected_revision: number | null
          expires_at: string
          id: string
          storage_bytes: number
          user_id: string
          warnings: Json
        }
        Insert: {
          app_slug: string
          backup_impact: string
          blockers?: Json
          created_at?: string
          expected_revision?: number | null
          expires_at: string
          id?: string
          storage_bytes?: number
          user_id: string
          warnings?: Json
        }
        Update: {
          app_slug?: string
          backup_impact?: string
          blockers?: Json
          created_at?: string
          expected_revision?: number | null
          expires_at?: string
          id?: string
          storage_bytes?: number
          user_id?: string
          warnings?: Json
        }
        Relationships: []
      }
      account_app_grants: {
        Row: {
          app_slug: string
          granted_at: string | null
          permission_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_slug: string
          granted_at?: string | null
          permission_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_slug?: string
          granted_at?: string | null
          permission_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_app_grants_app_slug_permission_id_fkey"
            columns: ["app_slug", "permission_id"]
            isOneToOne: false
            referencedRelation: "account_app_permissions"
            referencedColumns: ["app_slug", "permission_id"]
          },
          {
            foreignKeyName: "account_app_grants_user_id_app_slug_fkey"
            columns: ["user_id", "app_slug"]
            isOneToOne: false
            referencedRelation: "account_app_connections"
            referencedColumns: ["user_id", "app_slug"]
          },
        ]
      }
      account_app_manifests: {
        Row: {
          app_slug: string
          capabilities: Json
          core_app_id: string | null
          created_at: string
          data_scope: string
          export_scope: string
          identity_scope: string
          manifest_version: number
          updated_at: string
        }
        Insert: {
          app_slug: string
          capabilities?: Json
          core_app_id?: string | null
          created_at?: string
          data_scope?: string
          export_scope?: string
          identity_scope?: string
          manifest_version?: number
          updated_at?: string
        }
        Update: {
          app_slug?: string
          capabilities?: Json
          core_app_id?: string | null
          created_at?: string
          data_scope?: string
          export_scope?: string
          identity_scope?: string
          manifest_version?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_app_manifests_app_slug_fkey"
            columns: ["app_slug"]
            isOneToOne: true
            referencedRelation: "account_apps"
            referencedColumns: ["slug"]
          },
        ]
      }
      account_app_permissions: {
        Row: {
          active: boolean
          app_slug: string
          created_at: string
          description: string
          mutable_by_user: boolean
          name: string
          permission_id: string
          required: boolean
          sensitivity: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          app_slug: string
          created_at?: string
          description: string
          mutable_by_user?: boolean
          name: string
          permission_id: string
          required?: boolean
          sensitivity?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          app_slug?: string
          created_at?: string
          description?: string
          mutable_by_user?: boolean
          name?: string
          permission_id?: string
          required?: boolean
          sensitivity?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_app_permissions_app_slug_fkey"
            columns: ["app_slug"]
            isOneToOne: false
            referencedRelation: "account_apps"
            referencedColumns: ["slug"]
          },
        ]
      }
      account_apps: {
        Row: {
          active: boolean
          created_at: string
          description: string
          name: string
          path: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description: string
          name: string
          path: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          name?: string
          path?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      account_deletion_plans: {
        Row: {
          app_count: number
          backup_count: number
          blockers: Json
          created_at: string
          expires_at: string
          id: string
          namespace_count: number
          user_id: string
          warnings: Json
        }
        Insert: {
          app_count?: number
          backup_count?: number
          blockers?: Json
          created_at?: string
          expires_at: string
          id?: string
          namespace_count?: number
          user_id: string
          warnings?: Json
        }
        Update: {
          app_count?: number
          backup_count?: number
          blockers?: Json
          created_at?: string
          expires_at?: string
          id?: string
          namespace_count?: number
          user_id?: string
          warnings?: Json
        }
        Relationships: []
      }
      account_deletion_requests: {
        Row: {
          cancellable_until: string | null
          completed_at: string | null
          error_code: string | null
          id: string
          requested_at: string
          scheduled_deletion_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          cancellable_until?: string | null
          completed_at?: string | null
          error_code?: string | null
          id?: string
          requested_at?: string
          scheduled_deletion_at?: string | null
          status: string
          user_id: string
        }
        Update: {
          cancellable_until?: string | null
          completed_at?: string | null
          error_code?: string | null
          id?: string
          requested_at?: string
          scheduled_deletion_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      account_export_requests: {
        Row: {
          app_slugs: string[] | null
          completed_at: string
          expires_at: string
          id: string
          requested_at: string
          scope: string
          size_bytes: number
          status: string
          user_id: string
        }
        Insert: {
          app_slugs?: string[] | null
          completed_at?: string
          expires_at: string
          id?: string
          requested_at?: string
          scope: string
          size_bytes?: number
          status?: string
          user_id: string
        }
        Update: {
          app_slugs?: string[] | null
          completed_at?: string
          expires_at?: string
          id?: string
          requested_at?: string
          scope?: string
          size_bytes?: number
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      account_profiles: {
        Row: {
          created_at: string
          display_name: string | null
          preferred_language: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          preferred_language?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          preferred_language?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      account_restore_operations: {
        Row: {
          app_slug: string
          backup_ref: string
          completed_at: string | null
          error_code: string | null
          id: string
          result: Json | null
          safety_backup_ref: string | null
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          app_slug: string
          backup_ref: string
          completed_at?: string | null
          error_code?: string | null
          id?: string
          result?: Json | null
          safety_backup_ref?: string | null
          started_at?: string
          status: string
          user_id: string
        }
        Update: {
          app_slug?: string
          backup_ref?: string
          completed_at?: string | null
          error_code?: string | null
          id?: string
          result?: Json | null
          safety_backup_ref?: string | null
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_restore_operations_app_slug_fkey"
            columns: ["app_slug"]
            isOneToOne: false
            referencedRelation: "account_apps"
            referencedColumns: ["slug"]
          },
        ]
      }
      account_user_apps: {
        Row: {
          app_slug: string
          first_used_at: string
          last_used_at: string
          source: string
          user_id: string
        }
        Insert: {
          app_slug: string
          first_used_at?: string
          last_used_at?: string
          source?: string
          user_id: string
        }
        Update: {
          app_slug?: string
          first_used_at?: string
          last_used_at?: string
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_user_apps_app_slug_fkey"
            columns: ["app_slug"]
            isOneToOne: false
            referencedRelation: "account_apps"
            referencedColumns: ["slug"]
          },
        ]
      }
      activity_daily: {
        Row: {
          active_calories: number | null
          activity_date: string
          created_at: string
          distance_km: number | null
          exercise_minutes: number | null
          provider_payload: Json | null
          resting_heart_rate: number | null
          source: string
          steps: number | null
          synced_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_calories?: number | null
          activity_date: string
          created_at?: string
          distance_km?: number | null
          exercise_minutes?: number | null
          provider_payload?: Json | null
          resting_heart_rate?: number | null
          source?: string
          steps?: number | null
          synced_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active_calories?: number | null
          activity_date?: string
          created_at?: string
          distance_km?: number | null
          exercise_minutes?: number | null
          provider_payload?: Json | null
          resting_heart_rate?: number | null
          source?: string
          steps?: number | null
          synced_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_actions: {
        Row: {
          action_type: string
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          request_id: string
          undone_at: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          request_id: string
          undone_at?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          request_id?: string
          undone_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      canvas_ci_elements: {
        Row: {
          element: Json
          id: string
          is_deleted: boolean
          revision: number
          updated_at: string
          updated_by: string
          version: number
          version_nonce: number
        }
        Insert: {
          element: Json
          id: string
          is_deleted?: boolean
          revision: number
          updated_at?: string
          updated_by?: string
          version: number
          version_nonce?: number
        }
        Update: {
          element?: Json
          id?: string
          is_deleted?: boolean
          revision?: number
          updated_at?: string
          updated_by?: string
          version?: number
          version_nonce?: number
        }
        Relationships: []
      }
      canvas_elements: {
        Row: {
          element: Json
          id: string
          is_deleted: boolean
          revision: number
          updated_at: string
          updated_by: string
          version: number
          version_nonce: number
        }
        Insert: {
          element: Json
          id: string
          is_deleted?: boolean
          revision: number
          updated_at?: string
          updated_by?: string
          version: number
          version_nonce?: number
        }
        Update: {
          element?: Json
          id?: string
          is_deleted?: boolean
          revision?: number
          updated_at?: string
          updated_by?: string
          version?: number
          version_nonce?: number
        }
        Relationships: []
      }
      change_log: {
        Row: {
          action: string
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_logs: {
        Row: {
          calorie_target: number
          created_at: string
          id: string
          log_date: string
          notes: string | null
          protein_target: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          calorie_target?: number
          created_at?: string
          id?: string
          log_date: string
          notes?: string | null
          protein_target?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          calorie_target?: number
          created_at?: string
          id?: string
          log_date?: string
          notes?: string | null
          protein_target?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      diet_native_devices: {
        Row: {
          app_version: string | null
          created_at: string
          credential_digest: string | null
          device_id: string
          label: string | null
          last_seen_at: string | null
          last_sync_at: string | null
          platform: string
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          credential_digest?: string | null
          device_id: string
          label?: string | null
          last_seen_at?: string | null
          last_sync_at?: string | null
          platform?: string
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string
          credential_digest?: string | null
          device_id?: string
          label?: string | null
          last_seen_at?: string | null
          last_sync_at?: string | null
          platform?: string
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      french_sync_state: {
        Row: {
          app_version: string
          client_updated_at: string | null
          created_at: string
          device_id: string | null
          revision: number
          state: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          app_version?: string
          client_updated_at?: string | null
          created_at?: string
          device_id?: string | null
          revision?: number
          state: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          app_version?: string
          client_updated_at?: string | null
          created_at?: string
          device_id?: string | null
          revision?: number
          state?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      go_user_state: {
        Row: {
          client_updated_at: number
          payload: Json
          revision: number
          schema_version: number
          updated_at: string
          user_id: string
        }
        Insert: {
          client_updated_at?: number
          payload?: Json
          revision?: number
          schema_version?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          client_updated_at?: number
          payload?: Json
          revision?: number
          schema_version?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goal_phases: {
        Row: {
          active: boolean
          calorie_target: number
          created_at: string
          desired_weekly_weight_change: number | null
          end_date: string | null
          fiber_target: number
          goal_weight: number | null
          id: string
          name: string
          notes: string | null
          phase_type: string
          protein_target: number
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          calorie_target: number
          created_at?: string
          desired_weekly_weight_change?: number | null
          end_date?: string | null
          fiber_target?: number
          goal_weight?: number | null
          id?: string
          name: string
          notes?: string | null
          phase_type?: string
          protein_target: number
          start_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          calorie_target?: number
          created_at?: string
          desired_weekly_weight_change?: number | null
          end_date?: string | null
          fiber_target?: number
          goal_weight?: number | null
          id?: string
          name?: string
          notes?: string | null
          phase_type?: string
          protein_target?: number
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gomoku_admin_audit_log: {
        Row: {
          action: string
          actor_role: string
          actor_user_id: string | null
          after_state: Json | null
          before_state: Json | null
          created_at: string
          id: number
          reason: string | null
          request_id: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_role: string
          actor_user_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: never
          reason?: string | null
          request_id?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_role?: string
          actor_user_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: never
          reason?: string | null
          request_id?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      gomoku_admin_operators: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          note: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          note?: string | null
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          note?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gomoku_automation_oidc_jti: {
        Row: {
          consumed_at: string
          expires_at: string
          jti: string
          repository: string
          run_id: string
          workflow_ref: string
        }
        Insert: {
          consumed_at?: string
          expires_at: string
          jti: string
          repository: string
          run_id: string
          workflow_ref: string
        }
        Update: {
          consumed_at?: string
          expires_at?: string
          jti?: string
          repository?: string
          run_id?: string
          workflow_ref?: string
        }
        Relationships: []
      }
      gomoku_competitive_careers: {
        Row: {
          best_ranked_win_streak: number
          best_season_rank: number | null
          created_at: string
          current_ranked_win_streak: number
          current_rating: number
          last_competitive_at: string | null
          peak_rating: number
          ranked_draws: number
          ranked_games: number
          ranked_losses: number
          ranked_wins: number
          season_podiums: number
          season_titles: number
          seasons_played: number
          tournament_entries: number
          tournament_finals: number
          tournament_match_wins: number
          tournament_matches: number
          tournament_titles: number
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          best_ranked_win_streak?: number
          best_season_rank?: number | null
          created_at?: string
          current_ranked_win_streak?: number
          current_rating?: number
          last_competitive_at?: string | null
          peak_rating?: number
          ranked_draws?: number
          ranked_games?: number
          ranked_losses?: number
          ranked_wins?: number
          season_podiums?: number
          season_titles?: number
          seasons_played?: number
          tournament_entries?: number
          tournament_finals?: number
          tournament_match_wins?: number
          tournament_matches?: number
          tournament_titles?: number
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          best_ranked_win_streak?: number
          best_season_rank?: number | null
          created_at?: string
          current_ranked_win_streak?: number
          current_rating?: number
          last_competitive_at?: string | null
          peak_rating?: number
          ranked_draws?: number
          ranked_games?: number
          ranked_losses?: number
          ranked_wins?: number
          season_podiums?: number
          season_titles?: number
          seasons_played?: number
          tournament_entries?: number
          tournament_finals?: number
          tournament_match_wins?: number
          tournament_matches?: number
          tournament_titles?: number
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      gomoku_competitive_control: {
        Row: {
          active_incident_id: string | null
          challenges_enabled: boolean
          id: number
          public_banner: string | null
          ranked_enabled: boolean
          room_creation_enabled: boolean
          service_mode: string
          tournaments_enabled: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active_incident_id?: string | null
          challenges_enabled?: boolean
          id?: number
          public_banner?: string | null
          ranked_enabled?: boolean
          room_creation_enabled?: boolean
          service_mode?: string
          tournaments_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active_incident_id?: string | null
          challenges_enabled?: boolean
          id?: number
          public_banner?: string | null
          ranked_enabled?: boolean
          room_creation_enabled?: boolean
          service_mode?: string
          tournaments_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gomoku_competitive_control_active_incident_id_fkey"
            columns: ["active_incident_id"]
            isOneToOne: false
            referencedRelation: "gomoku_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      gomoku_competitive_showcase: {
        Row: {
          achievement_codes: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          achievement_codes?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          achievement_codes?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gomoku_deployment_observations: {
        Row: {
          edge_bundle_sha256: string | null
          edge_function_version: number | null
          environment: string
          frontend_sha: string | null
          git_sha: string
          id: number
          notes: string | null
          observed_at: string
          observed_by: string | null
          release_id: string | null
          source: string
        }
        Insert: {
          edge_bundle_sha256?: string | null
          edge_function_version?: number | null
          environment?: string
          frontend_sha?: string | null
          git_sha: string
          id?: never
          notes?: string | null
          observed_at?: string
          observed_by?: string | null
          release_id?: string | null
          source?: string
        }
        Update: {
          edge_bundle_sha256?: string | null
          edge_function_version?: number | null
          environment?: string
          frontend_sha?: string | null
          git_sha?: string
          id?: never
          notes?: string | null
          observed_at?: string
          observed_by?: string | null
          release_id?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "gomoku_deployment_observations_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "gomoku_release_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      gomoku_direct_challenges: {
        Row: {
          challenged_user_id: string
          challenged_username: string
          challenger_user_id: string
          challenger_username: string
          created_at: string
          expires_at: string
          id: string
          responded_at: string | null
          room_id: string | null
          status: string
        }
        Insert: {
          challenged_user_id: string
          challenged_username: string
          challenger_user_id: string
          challenger_username: string
          created_at?: string
          expires_at?: string
          id?: string
          responded_at?: string | null
          room_id?: string | null
          status?: string
        }
        Update: {
          challenged_user_id?: string
          challenged_username?: string
          challenger_user_id?: string
          challenger_username?: string
          created_at?: string
          expires_at?: string
          id?: string
          responded_at?: string | null
          room_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "gomoku_direct_challenges_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "gomoku_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      gomoku_fair_play_audit_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_type: string
          game_version: number | null
          id: number
          metadata: Json
          room_id: string | null
          subject_user_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          game_version?: number | null
          id?: number
          metadata?: Json
          room_id?: string | null
          subject_user_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          game_version?: number | null
          id?: number
          metadata?: Json
          room_id?: string | null
          subject_user_id?: string | null
        }
        Relationships: []
      }
      gomoku_fair_play_reports: {
        Row: {
          category: string
          created_at: string
          details: string
          game_version: number | null
          id: string
          reporter_user_id: string
          resolution: string | null
          reviewed_at: string | null
          room_id: string | null
          status: string
          target_user_id: string
          target_username: string
        }
        Insert: {
          category: string
          created_at?: string
          details?: string
          game_version?: number | null
          id?: string
          reporter_user_id: string
          resolution?: string | null
          reviewed_at?: string | null
          room_id?: string | null
          status?: string
          target_user_id: string
          target_username: string
        }
        Update: {
          category?: string
          created_at?: string
          details?: string
          game_version?: number | null
          id?: string
          reporter_user_id?: string
          resolution?: string | null
          reviewed_at?: string | null
          room_id?: string | null
          status?: string
          target_user_id?: string
          target_username?: string
        }
        Relationships: []
      }
      gomoku_incident_drill_runs: {
        Row: {
          actor_role: string
          actor_user_id: string | null
          checks: Json
          created_at: string
          health_status: string | null
          id: string
          mode: string
          operational_snapshot: Json
          request_id: string | null
          scenario: string
          status: string
          summary: string
        }
        Insert: {
          actor_role: string
          actor_user_id?: string | null
          checks?: Json
          created_at?: string
          health_status?: string | null
          id?: string
          mode: string
          operational_snapshot?: Json
          request_id?: string | null
          scenario: string
          status: string
          summary: string
        }
        Update: {
          actor_role?: string
          actor_user_id?: string | null
          checks?: Json
          created_at?: string
          health_status?: string | null
          id?: string
          mode?: string
          operational_snapshot?: Json
          request_id?: string | null
          scenario?: string
          status?: string
          summary?: string
        }
        Relationships: []
      }
      gomoku_incidents: {
        Row: {
          acknowledged_at: string | null
          commander_user_id: string | null
          created_at: string
          created_by: string
          id: string
          resolved_at: string | null
          severity: string
          started_at: string
          status: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          commander_user_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          resolved_at?: string | null
          severity: string
          started_at?: string
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          commander_user_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          resolved_at?: string | null
          severity?: string
          started_at?: string
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      gomoku_match_integrity_flags: {
        Row: {
          created_at: string
          flag_code: string
          game_version: number
          id: number
          metadata: Json
          reviewed_at: string | null
          room_id: string
          severity: number
          status: string
        }
        Insert: {
          created_at?: string
          flag_code: string
          game_version: number
          id?: number
          metadata?: Json
          reviewed_at?: string | null
          room_id: string
          severity?: number
          status?: string
        }
        Update: {
          created_at?: string
          flag_code?: string
          game_version?: number
          id?: number
          metadata?: Json
          reviewed_at?: string | null
          room_id?: string
          severity?: number
          status?: string
        }
        Relationships: []
      }
      gomoku_match_persistence_outbox: {
        Row: {
          attempts: number
          captured_at: string
          game_version: number
          last_error: string | null
          next_attempt_at: string
          payload: Json
          persisted_at: string | null
          room_id: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          captured_at?: string
          game_version: number
          last_error?: string | null
          next_attempt_at?: string
          payload: Json
          persisted_at?: string | null
          room_id: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          captured_at?: string
          game_version?: number
          last_error?: string | null
          next_attempt_at?: string
          payload?: Json
          persisted_at?: string | null
          room_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      gomoku_matches: {
        Row: {
          black_rating_after: number | null
          black_rating_before: number | null
          black_user_id: string | null
          completed_at: string
          created_at: string
          game_version: number
          history_hashes: string[]
          match_mode: string
          move_count: number
          moves: Json
          players: Json
          rated: boolean
          result_reason: string
          room_id: string
          round: number
          rule: string
          started_at: string | null
          white_rating_after: number | null
          white_rating_before: number | null
          white_user_id: string | null
          winner_color: number
        }
        Insert: {
          black_rating_after?: number | null
          black_rating_before?: number | null
          black_user_id?: string | null
          completed_at?: string
          created_at?: string
          game_version: number
          history_hashes?: string[]
          match_mode?: string
          move_count: number
          moves?: Json
          players?: Json
          rated?: boolean
          result_reason: string
          room_id: string
          round: number
          rule?: string
          started_at?: string | null
          white_rating_after?: number | null
          white_rating_before?: number | null
          white_user_id?: string | null
          winner_color: number
        }
        Update: {
          black_rating_after?: number | null
          black_rating_before?: number | null
          black_user_id?: string | null
          completed_at?: string
          created_at?: string
          game_version?: number
          history_hashes?: string[]
          match_mode?: string
          move_count?: number
          moves?: Json
          players?: Json
          rated?: boolean
          result_reason?: string
          room_id?: string
          round?: number
          rule?: string
          started_at?: string | null
          white_rating_after?: number | null
          white_rating_before?: number | null
          white_user_id?: string | null
          winner_color?: number
        }
        Relationships: []
      }
      gomoku_matchmaking_queue: {
        Row: {
          history_hash: string | null
          last_seen: string
          queued_at: string
          rating_snapshot: number
          user_id: string
          username: string
        }
        Insert: {
          history_hash?: string | null
          last_seen?: string
          queued_at?: string
          rating_snapshot: number
          user_id: string
          username: string
        }
        Update: {
          history_hash?: string | null
          last_seen?: string
          queued_at?: string
          rating_snapshot?: number
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      gomoku_moderation_actions: {
        Row: {
          action_type: string
          actor_user_id: string | null
          created_at: string
          duration_minutes: number | null
          expires_at: string | null
          id: string
          reason: string
          subject_user_id: string
        }
        Insert: {
          action_type: string
          actor_user_id?: string | null
          created_at?: string
          duration_minutes?: number | null
          expires_at?: string | null
          id?: string
          reason: string
          subject_user_id: string
        }
        Update: {
          action_type?: string
          actor_user_id?: string | null
          created_at?: string
          duration_minutes?: number | null
          expires_at?: string | null
          id?: string
          reason?: string
          subject_user_id?: string
        }
        Relationships: []
      }
      gomoku_orchestration_events: {
        Row: {
          created_at: string
          details: Json
          git_sha: string
          id: string
          source_run_id: string
          stage: string
          status: string
          workflow_sha: string | null
        }
        Insert: {
          created_at?: string
          details?: Json
          git_sha: string
          id?: string
          source_run_id: string
          stage: string
          status: string
          workflow_sha?: string | null
        }
        Update: {
          created_at?: string
          details?: Json
          git_sha?: string
          id?: string
          source_run_id?: string
          stage?: string
          status?: string
          workflow_sha?: string | null
        }
        Relationships: []
      }
      gomoku_player_achievements: {
        Row: {
          achievement_code: string
          context: Json
          earned_at: string
          source_kind: string | null
          source_ref: string | null
          user_id: string
        }
        Insert: {
          achievement_code: string
          context?: Json
          earned_at?: string
          source_kind?: string | null
          source_ref?: string | null
          user_id: string
        }
        Update: {
          achievement_code?: string
          context?: Json
          earned_at?: string
          source_kind?: string | null
          source_ref?: string | null
          user_id?: string
        }
        Relationships: []
      }
      gomoku_player_blocks: {
        Row: {
          blocked_user_id: string
          blocker_user_id: string
          created_at: string
        }
        Insert: {
          blocked_user_id: string
          blocker_user_id: string
          created_at?: string
        }
        Update: {
          blocked_user_id?: string
          blocker_user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      gomoku_player_favorites: {
        Row: {
          created_at: string
          owner_user_id: string
          target_user_id: string
        }
        Insert: {
          created_at?: string
          owner_user_id: string
          target_user_id: string
        }
        Update: {
          created_at?: string
          owner_user_id?: string
          target_user_id?: string
        }
        Relationships: []
      }
      gomoku_player_trust_state: {
        Row: {
          challenges_suspended_until: string | null
          notice: string | null
          ranked_cooldown_until: string | null
          ranked_suspended_until: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          challenges_suspended_until?: string | null
          notice?: string | null
          ranked_cooldown_until?: string | null
          ranked_suspended_until?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          challenges_suspended_until?: string | null
          notice?: string | null
          ranked_cooldown_until?: string | null
          ranked_suspended_until?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gomoku_preview_certifications: {
        Row: {
          branch_id: string | null
          branch_status: string
          checks: Json
          created_at: string
          edge_build_sha: string
          edge_manifest_sha256: string
          environment: string
          environment_id: string | null
          id: string
          migration_count: number
          migration_head: string | null
          project_ref: string
          release_manifest_sha256: string
          schema_manifest_sha256: string
          source_git_sha: string
          source_ref: string | null
          source_run_id: string
          status: string
          workflow_sha: string | null
        }
        Insert: {
          branch_id?: string | null
          branch_status: string
          checks: Json
          created_at?: string
          edge_build_sha: string
          edge_manifest_sha256: string
          environment: string
          environment_id?: string | null
          id?: string
          migration_count: number
          migration_head?: string | null
          project_ref: string
          release_manifest_sha256: string
          schema_manifest_sha256: string
          source_git_sha: string
          source_ref?: string | null
          source_run_id: string
          status: string
          workflow_sha?: string | null
        }
        Update: {
          branch_id?: string | null
          branch_status?: string
          checks?: Json
          created_at?: string
          edge_build_sha?: string
          edge_manifest_sha256?: string
          environment?: string
          environment_id?: string | null
          id?: string
          migration_count?: number
          migration_head?: string | null
          project_ref?: string
          release_manifest_sha256?: string
          schema_manifest_sha256?: string
          source_git_sha?: string
          source_ref?: string | null
          source_run_id?: string
          status?: string
          workflow_sha?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gomoku_preview_certifications_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "gomoku_release_environments"
            referencedColumns: ["id"]
          },
        ]
      }
      gomoku_production_certifications: {
        Row: {
          admission_id: string | null
          checks: Json
          created_at: string
          deployment_observation_id: number | null
          git_sha: string
          health_status: string
          id: string
          operational_snapshot: Json
          policy_version: string
          reliability_snapshot: Json
          source_run_id: string
          status: string
          workflow_sha: string | null
        }
        Insert: {
          admission_id?: string | null
          checks: Json
          created_at?: string
          deployment_observation_id?: number | null
          git_sha: string
          health_status: string
          id?: string
          operational_snapshot: Json
          policy_version?: string
          reliability_snapshot: Json
          source_run_id: string
          status: string
          workflow_sha?: string | null
        }
        Update: {
          admission_id?: string | null
          checks?: Json
          created_at?: string
          deployment_observation_id?: number | null
          git_sha?: string
          health_status?: string
          id?: string
          operational_snapshot?: Json
          policy_version?: string
          reliability_snapshot?: Json
          source_run_id?: string
          status?: string
          workflow_sha?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gomoku_production_certifications_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "gomoku_release_admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gomoku_production_certifications_deployment_observation_id_fkey"
            columns: ["deployment_observation_id"]
            isOneToOne: false
            referencedRelation: "gomoku_deployment_observations"
            referencedColumns: ["id"]
          },
        ]
      }
      gomoku_ranked_active: {
        Row: {
          created_at: string
          opponent_user_id: string
          room_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          opponent_user_id: string
          room_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          opponent_user_id?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gomoku_ranked_active_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "gomoku_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      gomoku_rating_events: {
        Row: {
          black_after: number
          black_before: number
          black_delta: number
          black_user_id: string
          created_at: string
          game_version: number
          k_factor: number
          room_id: string
          white_after: number
          white_before: number
          white_delta: number
          white_user_id: string
          winner_color: number
        }
        Insert: {
          black_after: number
          black_before: number
          black_delta: number
          black_user_id: string
          created_at?: string
          game_version: number
          k_factor: number
          room_id: string
          white_after: number
          white_before: number
          white_delta: number
          white_user_id: string
          winner_color: number
        }
        Update: {
          black_after?: number
          black_before?: number
          black_delta?: number
          black_user_id?: string
          created_at?: string
          game_version?: number
          k_factor?: number
          room_id?: string
          white_after?: number
          white_before?: number
          white_delta?: number
          white_user_id?: string
          winner_color?: number
        }
        Relationships: []
      }
      gomoku_rating_protections: {
        Row: {
          base_k_factor: number
          created_at: string
          effective_k_factor: number
          game_version: number
          pair_games_6h: number
          protection_level: string
          room_id: string
        }
        Insert: {
          base_k_factor: number
          created_at?: string
          effective_k_factor: number
          game_version: number
          pair_games_6h: number
          protection_level: string
          room_id: string
        }
        Update: {
          base_k_factor?: number
          created_at?: string
          effective_k_factor?: number
          game_version?: number
          pair_games_6h?: number
          protection_level?: string
          room_id?: string
        }
        Relationships: []
      }
      gomoku_ratings: {
        Row: {
          created_at: string
          draws: number
          games: number
          last_played_at: string | null
          losses: number
          peak_rating: number
          rating: number
          updated_at: string
          user_id: string
          wins: number
        }
        Insert: {
          created_at?: string
          draws?: number
          games?: number
          last_played_at?: string | null
          losses?: number
          peak_rating?: number
          rating?: number
          updated_at?: string
          user_id: string
          wins?: number
        }
        Update: {
          created_at?: string
          draws?: number
          games?: number
          last_played_at?: string | null
          losses?: number
          peak_rating?: number
          rating?: number
          updated_at?: string
          user_id?: string
          wins?: number
        }
        Relationships: []
      }
      gomoku_release_admissions: {
        Row: {
          created_at: string
          decision: string
          evidence_snapshot: Json
          git_sha: string
          id: string
          policy_version: string
          required_checks: Json
          workflow_attempt: number
          workflow_ref: string | null
          workflow_run_id: string
          workflow_sha: string | null
        }
        Insert: {
          created_at?: string
          decision: string
          evidence_snapshot: Json
          git_sha: string
          id?: string
          policy_version?: string
          required_checks: Json
          workflow_attempt?: number
          workflow_ref?: string | null
          workflow_run_id: string
          workflow_sha?: string | null
        }
        Update: {
          created_at?: string
          decision?: string
          evidence_snapshot?: Json
          git_sha?: string
          id?: string
          policy_version?: string
          required_checks?: Json
          workflow_attempt?: number
          workflow_ref?: string | null
          workflow_run_id?: string
          workflow_sha?: string | null
        }
        Relationships: []
      }
      gomoku_release_environments: {
        Row: {
          branch_id: string | null
          branch_name: string | null
          branch_status: string
          configured_at: string
          configured_by_run_id: string | null
          environment: string
          id: string
          last_certified_at: string | null
          last_rebased_at: string | null
          production_project_ref: string
          project_ref: string
          required_for_promotion: boolean
          source: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          branch_name?: string | null
          branch_status: string
          configured_at?: string
          configured_by_run_id?: string | null
          environment: string
          id?: string
          last_certified_at?: string | null
          last_rebased_at?: string | null
          production_project_ref?: string
          project_ref: string
          required_for_promotion?: boolean
          source?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          branch_name?: string | null
          branch_status?: string
          configured_at?: string
          configured_by_run_id?: string | null
          environment?: string
          id?: string
          last_certified_at?: string | null
          last_rebased_at?: string | null
          production_project_ref?: string
          project_ref?: string
          required_for_promotion?: boolean
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      gomoku_release_evidence: {
        Row: {
          check_name: string
          details: Json
          git_sha: string
          id: number
          recorded_at: string
          source: string
          status: string
          workflow_attempt: number
          workflow_ref: string | null
          workflow_run_id: string
          workflow_sha: string | null
        }
        Insert: {
          check_name: string
          details?: Json
          git_sha: string
          id?: never
          recorded_at?: string
          source?: string
          status: string
          workflow_attempt?: number
          workflow_ref?: string | null
          workflow_run_id: string
          workflow_sha?: string | null
        }
        Update: {
          check_name?: string
          details?: Json
          git_sha?: string
          id?: never
          recorded_at?: string
          source?: string
          status?: string
          workflow_attempt?: number
          workflow_ref?: string | null
          workflow_run_id?: string
          workflow_sha?: string | null
        }
        Relationships: []
      }
      gomoku_release_registry: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string
          git_sha: string
          id: string
          notes: string | null
          previous_release_id: string | null
          rolled_back_at: string | null
          rolled_back_by: string | null
          source_ref: string | null
          status: string
          updated_at: string
          version: string
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by: string
          git_sha: string
          id?: string
          notes?: string | null
          previous_release_id?: string | null
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          source_ref?: string | null
          status?: string
          updated_at?: string
          version: string
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          git_sha?: string
          id?: string
          notes?: string | null
          previous_release_id?: string | null
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          source_ref?: string | null
          status?: string
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "gomoku_release_registry_previous_release_id_fkey"
            columns: ["previous_release_id"]
            isOneToOne: false
            referencedRelation: "gomoku_release_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      gomoku_reliability_heartbeat: {
        Row: {
          id: number
          last_tick_at: string
          last_tick_status: string
          last_tick_summary: Json
          updated_at: string
        }
        Insert: {
          id?: number
          last_tick_at?: string
          last_tick_status?: string
          last_tick_summary?: Json
          updated_at?: string
        }
        Update: {
          id?: number
          last_tick_at?: string
          last_tick_status?: string
          last_tick_summary?: Json
          updated_at?: string
        }
        Relationships: []
      }
      gomoku_repo_migration_events: {
        Row: {
          created_at: string
          details: Json
          environment_label: string
          id: number
          migration_name: string
          migration_sha256: string
          release_manifest_sha256: string
          result: string
          source_git_sha: string
          source_run_id: string
        }
        Insert: {
          created_at?: string
          details?: Json
          environment_label: string
          id?: never
          migration_name: string
          migration_sha256: string
          release_manifest_sha256: string
          result: string
          source_git_sha: string
          source_run_id: string
        }
        Update: {
          created_at?: string
          details?: Json
          environment_label?: string
          id?: never
          migration_name?: string
          migration_sha256?: string
          release_manifest_sha256?: string
          result?: string
          source_git_sha?: string
          source_run_id?: string
        }
        Relationships: []
      }
      gomoku_repo_schema_state: {
        Row: {
          edge_manifest_sha256: string | null
          environment_label: string
          id: number
          migration_count: number
          migration_head: string | null
          recorded_at: string
          recorded_by_run_id: string | null
          release_manifest_sha256: string | null
          schema_manifest_sha256: string | null
          source_git_sha: string | null
        }
        Insert: {
          edge_manifest_sha256?: string | null
          environment_label: string
          id: number
          migration_count?: number
          migration_head?: string | null
          recorded_at?: string
          recorded_by_run_id?: string | null
          release_manifest_sha256?: string | null
          schema_manifest_sha256?: string | null
          source_git_sha?: string | null
        }
        Update: {
          edge_manifest_sha256?: string | null
          environment_label?: string
          id?: number
          migration_count?: number
          migration_head?: string | null
          recorded_at?: string
          recorded_by_run_id?: string | null
          release_manifest_sha256?: string | null
          schema_manifest_sha256?: string | null
          source_git_sha?: string | null
        }
        Relationships: []
      }
      gomoku_rollouts: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          environment: string
          id: string
          last_actor_user_id: string
          last_deployment_observation_id: number | null
          paused_at: string | null
          reason: string
          release_id: string
          rolled_back_at: string | null
          stage: string
          stage_started_at: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          environment?: string
          id?: string
          last_actor_user_id: string
          last_deployment_observation_id?: number | null
          paused_at?: string | null
          reason: string
          release_id: string
          rolled_back_at?: string | null
          stage?: string
          stage_started_at?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          environment?: string
          id?: string
          last_actor_user_id?: string
          last_deployment_observation_id?: number | null
          paused_at?: string | null
          reason?: string
          release_id?: string
          rolled_back_at?: string | null
          stage?: string
          stage_started_at?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gomoku_rollouts_last_deployment_observation_id_fkey"
            columns: ["last_deployment_observation_id"]
            isOneToOne: false
            referencedRelation: "gomoku_deployment_observations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gomoku_rollouts_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "gomoku_release_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      gomoku_room_player_presence: {
        Row: {
          last_seen: string
          room_id: string
          seat: number
        }
        Insert: {
          last_seen?: string
          room_id: string
          seat: number
        }
        Update: {
          last_seen?: string
          room_id?: string
          seat?: number
        }
        Relationships: [
          {
            foreignKeyName: "gomoku_room_player_presence_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "gomoku_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      gomoku_room_rate_limits: {
        Row: {
          key_hash: string
          request_count: number
          updated_at: string
          window_started: string
        }
        Insert: {
          key_hash: string
          request_count?: number
          updated_at?: string
          window_started?: string
        }
        Update: {
          key_hash?: string
          request_count?: number
          updated_at?: string
          window_started?: string
        }
        Relationships: []
      }
      gomoku_room_spectators: {
        Row: {
          created_at: string
          last_seen: string
          room_id: string
          viewer_id: string
        }
        Insert: {
          created_at?: string
          last_seen?: string
          room_id: string
          viewer_id: string
        }
        Update: {
          created_at?: string
          last_seen?: string
          room_id?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gomoku_room_spectators_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "gomoku_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      gomoku_rooms: {
        Row: {
          created_at: string
          expires_at: string
          guest_token_hash: string | null
          host_token_hash: string | null
          id: string
          password_hash: string | null
          password_salt: string | null
          revision: number
          state: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          guest_token_hash?: string | null
          host_token_hash?: string | null
          id: string
          password_hash?: string | null
          password_salt?: string | null
          revision?: number
          state?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          guest_token_hash?: string | null
          host_token_hash?: string | null
          id?: string
          password_hash?: string | null
          password_salt?: string | null
          revision?: number
          state?: Json
          updated_at?: string
        }
        Relationships: []
      }
      gomoku_runtime_events: {
        Row: {
          component: string
          created_at: string
          details: Json
          event_type: string
          game_version: number | null
          id: number
          request_id: string | null
          room_id: string | null
          severity: string
        }
        Insert: {
          component: string
          created_at?: string
          details?: Json
          event_type: string
          game_version?: number | null
          id?: number
          request_id?: string | null
          room_id?: string | null
          severity: string
        }
        Update: {
          component?: string
          created_at?: string
          details?: Json
          event_type?: string
          game_version?: number | null
          id?: number
          request_id?: string | null
          room_id?: string | null
          severity?: string
        }
        Relationships: []
      }
      gomoku_schema_promotion_authorizations: {
        Row: {
          created_at: string
          decision: string
          edge_manifest_sha256: string
          expires_at: string
          id: string
          preview_certification_id: string | null
          production_git_sha: string
          reason: string | null
          release_manifest_sha256: string
          schema_manifest_sha256: string
          source_run_id: string
          workflow_sha: string | null
        }
        Insert: {
          created_at?: string
          decision: string
          edge_manifest_sha256: string
          expires_at: string
          id?: string
          preview_certification_id?: string | null
          production_git_sha: string
          reason?: string | null
          release_manifest_sha256: string
          schema_manifest_sha256: string
          source_run_id: string
          workflow_sha?: string | null
        }
        Update: {
          created_at?: string
          decision?: string
          edge_manifest_sha256?: string
          expires_at?: string
          id?: string
          preview_certification_id?: string | null
          production_git_sha?: string
          reason?: string | null
          release_manifest_sha256?: string
          schema_manifest_sha256?: string
          source_run_id?: string
          workflow_sha?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gomoku_schema_promotion_authoriza_preview_certification_id_fkey"
            columns: ["preview_certification_id"]
            isOneToOne: false
            referencedRelation: "gomoku_preview_certifications"
            referencedColumns: ["id"]
          },
        ]
      }
      gomoku_schema_promotion_events: {
        Row: {
          authorization_id: string | null
          created_at: string
          details: Json
          event_type: string
          id: number
          production_git_sha: string
          production_migration_head: string | null
          source_run_id: string
          workflow_sha: string | null
        }
        Insert: {
          authorization_id?: string | null
          created_at?: string
          details?: Json
          event_type: string
          id?: never
          production_git_sha: string
          production_migration_head?: string | null
          source_run_id: string
          workflow_sha?: string | null
        }
        Update: {
          authorization_id?: string | null
          created_at?: string
          details?: Json
          event_type?: string
          id?: never
          production_git_sha?: string
          production_migration_head?: string | null
          source_run_id?: string
          workflow_sha?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gomoku_schema_promotion_events_authorization_id_fkey"
            columns: ["authorization_id"]
            isOneToOne: false
            referencedRelation: "gomoku_schema_promotion_authorizations"
            referencedColumns: ["id"]
          },
        ]
      }
      gomoku_season_standings: {
        Row: {
          draws: number
          games: number
          last_played_at: string | null
          losses: number
          points: number
          rating_current: number
          rating_delta: number
          rating_start: number
          season_id: string
          updated_at: string
          user_id: string
          username: string
          wins: number
        }
        Insert: {
          draws?: number
          games?: number
          last_played_at?: string | null
          losses?: number
          points?: number
          rating_current?: number
          rating_delta?: number
          rating_start?: number
          season_id: string
          updated_at?: string
          user_id: string
          username: string
          wins?: number
        }
        Update: {
          draws?: number
          games?: number
          last_played_at?: string | null
          losses?: number
          points?: number
          rating_current?: number
          rating_delta?: number
          rating_start?: number
          season_id?: string
          updated_at?: string
          user_id?: string
          username?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "gomoku_season_standings_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "gomoku_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      gomoku_seasons: {
        Row: {
          champion_user_id: string | null
          champion_username: string | null
          code: string
          completed_at: string | null
          created_at: string
          ends_at: string
          id: string
          name: string
          participant_count: number
          starts_at: string
          status: string
        }
        Insert: {
          champion_user_id?: string | null
          champion_username?: string | null
          code: string
          completed_at?: string | null
          created_at?: string
          ends_at: string
          id?: string
          name: string
          participant_count?: number
          starts_at: string
          status?: string
        }
        Update: {
          champion_user_id?: string | null
          champion_username?: string | null
          code?: string
          completed_at?: string | null
          created_at?: string
          ends_at?: string
          id?: string
          name?: string
          participant_count?: number
          starts_at?: string
          status?: string
        }
        Relationships: []
      }
      gomoku_slo_alert_state: {
        Row: {
          consecutive_bad: number
          details: Json
          indicator: string
          last_breach_at: string | null
          last_emitted_at: string | null
          last_recovered_at: string | null
          opened_at: string | null
          state: string
          updated_at: string
        }
        Insert: {
          consecutive_bad?: number
          details?: Json
          indicator: string
          last_breach_at?: string | null
          last_emitted_at?: string | null
          last_recovered_at?: string | null
          opened_at?: string | null
          state?: string
          updated_at?: string
        }
        Update: {
          consecutive_bad?: number
          details?: Json
          indicator?: string
          last_breach_at?: string | null
          last_emitted_at?: string | null
          last_recovered_at?: string | null
          opened_at?: string | null
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      gomoku_slo_samples: {
        Row: {
          captured_at: string
          oldest_pending_seconds: number
          pending_persistence: number
          persistence_good: boolean
          recovery_age_seconds: number
          recovery_good: boolean
          reliability_status: string
          runtime_errors_minute: number
          runtime_good: boolean
          runtime_warnings_minute: number
          sample_minute: string
          service_good: boolean
        }
        Insert: {
          captured_at?: string
          oldest_pending_seconds?: number
          pending_persistence?: number
          persistence_good: boolean
          recovery_age_seconds?: number
          recovery_good: boolean
          reliability_status: string
          runtime_errors_minute?: number
          runtime_good: boolean
          runtime_warnings_minute?: number
          sample_minute: string
          service_good: boolean
        }
        Update: {
          captured_at?: string
          oldest_pending_seconds?: number
          pending_persistence?: number
          persistence_good?: boolean
          recovery_age_seconds?: number
          recovery_good?: boolean
          reliability_status?: string
          runtime_errors_minute?: number
          runtime_good?: boolean
          runtime_warnings_minute?: number
          sample_minute?: string
          service_good?: boolean
        }
        Relationships: []
      }
      gomoku_social_preferences: {
        Row: {
          allow_challenges: boolean
          show_presence: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_challenges?: boolean
          show_presence?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_challenges?: boolean
          show_presence?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gomoku_social_presence: {
        Row: {
          activity: string
          last_seen_at: string
          room_id: string | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          activity?: string
          last_seen_at?: string
          room_id?: string | null
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          activity?: string
          last_seen_at?: string
          room_id?: string | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "gomoku_social_presence_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "gomoku_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      gomoku_tournament_entries: {
        Row: {
          eliminated_at: string | null
          joined_at: string
          seed: number | null
          tournament_id: string
          user_id: string
          username: string
        }
        Insert: {
          eliminated_at?: string | null
          joined_at?: string
          seed?: number | null
          tournament_id: string
          user_id: string
          username: string
        }
        Update: {
          eliminated_at?: string | null
          joined_at?: string
          seed?: number | null
          tournament_id?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "gomoku_tournament_entries_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "gomoku_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      gomoku_tournament_events: {
        Row: {
          actor_user_id: string | null
          actor_username: string | null
          created_at: string
          event_type: string
          id: string
          match_id: string | null
          message: string | null
          round: number | null
          slot: number | null
          subject_user_id: string | null
          subject_username: string | null
          tournament_id: string
        }
        Insert: {
          actor_user_id?: string | null
          actor_username?: string | null
          created_at?: string
          event_type: string
          id?: string
          match_id?: string | null
          message?: string | null
          round?: number | null
          slot?: number | null
          subject_user_id?: string | null
          subject_username?: string | null
          tournament_id: string
        }
        Update: {
          actor_user_id?: string | null
          actor_username?: string | null
          created_at?: string
          event_type?: string
          id?: string
          match_id?: string | null
          message?: string | null
          round?: number | null
          slot?: number | null
          subject_user_id?: string | null
          subject_username?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gomoku_tournament_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "gomoku_tournament_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gomoku_tournament_events_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "gomoku_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      gomoku_tournament_matches: {
        Row: {
          completed_at: string | null
          created_at: string
          forfeit_loser_user_id: string | null
          id: string
          last_activity_at: string | null
          player1_checked_in_at: string | null
          player1_user_id: string | null
          player1_username: string | null
          player2_checked_in_at: string | null
          player2_user_id: string | null
          player2_username: string | null
          ready_deadline: string | null
          replay_count: number
          result_reason: string | null
          room_id: string | null
          round: number
          slot: number
          started_at: string | null
          status: string
          tournament_id: string
          winner_user_id: string | null
          winner_username: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          forfeit_loser_user_id?: string | null
          id?: string
          last_activity_at?: string | null
          player1_checked_in_at?: string | null
          player1_user_id?: string | null
          player1_username?: string | null
          player2_checked_in_at?: string | null
          player2_user_id?: string | null
          player2_username?: string | null
          ready_deadline?: string | null
          replay_count?: number
          result_reason?: string | null
          room_id?: string | null
          round: number
          slot: number
          started_at?: string | null
          status?: string
          tournament_id: string
          winner_user_id?: string | null
          winner_username?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          forfeit_loser_user_id?: string | null
          id?: string
          last_activity_at?: string | null
          player1_checked_in_at?: string | null
          player1_user_id?: string | null
          player1_username?: string | null
          player2_checked_in_at?: string | null
          player2_user_id?: string | null
          player2_username?: string | null
          ready_deadline?: string | null
          replay_count?: number
          result_reason?: string | null
          room_id?: string | null
          round?: number
          slot?: number
          started_at?: string | null
          status?: string
          tournament_id?: string
          winner_user_id?: string | null
          winner_username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gomoku_tournament_matches_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: true
            referencedRelation: "gomoku_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gomoku_tournament_matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "gomoku_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      gomoku_tournaments: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          champion_user_id: string | null
          champion_username: string | null
          completed_at: string | null
          created_at: string
          id: string
          name: string
          organizer_user_id: string
          organizer_username: string
          size: number
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          champion_user_id?: string | null
          champion_username?: string | null
          completed_at?: string | null
          created_at?: string
          id: string
          name: string
          organizer_user_id: string
          organizer_username: string
          size: number
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          champion_user_id?: string | null
          champion_username?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          name?: string
          organizer_user_id?: string
          organizer_username?: string
          size?: number
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      leaderboard_boards: {
        Row: {
          board_key: string
          created_at: string
          display_name: string
          is_active: boolean
          is_visible: boolean
          mode: string
          ranking_strategy: string
          rules_version: number
        }
        Insert: {
          board_key: string
          created_at?: string
          display_name: string
          is_active?: boolean
          is_visible?: boolean
          mode: string
          ranking_strategy: string
          rules_version: number
        }
        Update: {
          board_key?: string
          created_at?: string
          display_name?: string
          is_active?: boolean
          is_visible?: boolean
          mode?: string
          ranking_strategy?: string
          rules_version?: number
        }
        Relationships: []
      }
      leaderboard_profiles: {
        Row: {
          created_at: string
          updated_at: string
          user_id: string
          username: string
          username_changed_at: string | null
          username_normalized: string | null
        }
        Insert: {
          created_at?: string
          updated_at?: string
          user_id: string
          username: string
          username_changed_at?: string | null
          username_normalized?: string | null
        }
        Update: {
          created_at?: string
          updated_at?: string
          user_id?: string
          username?: string
          username_changed_at?: string | null
          username_normalized?: string | null
        }
        Relationships: []
      }
      leaderboard_submissions: {
        Row: {
          accuracy: number | null
          board_key: string
          challenge_date: string | null
          challenge_version: number | null
          client_version: string
          completed: boolean | null
          duration_ms: number | null
          grade: string | null
          id: string
          integrity_remaining: number | null
          level: number | null
          metrics: Json
          moderation_status: string
          raw_wpm: number | null
          rules_version: number
          score: number | null
          session_id: string
          stage: number | null
          submitted_at: string
          user_id: string
          words_completed: number | null
          wpm: number | null
        }
        Insert: {
          accuracy?: number | null
          board_key: string
          challenge_date?: string | null
          challenge_version?: number | null
          client_version: string
          completed?: boolean | null
          duration_ms?: number | null
          grade?: string | null
          id?: string
          integrity_remaining?: number | null
          level?: number | null
          metrics?: Json
          moderation_status?: string
          raw_wpm?: number | null
          rules_version: number
          score?: number | null
          session_id: string
          stage?: number | null
          submitted_at?: string
          user_id: string
          words_completed?: number | null
          wpm?: number | null
        }
        Update: {
          accuracy?: number | null
          board_key?: string
          challenge_date?: string | null
          challenge_version?: number | null
          client_version?: string
          completed?: boolean | null
          duration_ms?: number | null
          grade?: string | null
          id?: string
          integrity_remaining?: number | null
          level?: number | null
          metrics?: Json
          moderation_status?: string
          raw_wpm?: number | null
          rules_version?: number
          score?: number | null
          session_id?: string
          stage?: number | null
          submitted_at?: string
          user_id?: string
          words_completed?: number | null
          wpm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_submissions_board_key_fkey"
            columns: ["board_key"]
            isOneToOne: false
            referencedRelation: "leaderboard_boards"
            referencedColumns: ["board_key"]
          },
        ]
      }
      library_file_deletion_authorizations: {
        Row: {
          created_at: string
          expected_revision: number
          expires_at: string
          plan_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expected_revision: number
          expires_at: string
          plan_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          expected_revision?: number
          expires_at?: string
          plan_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_file_deletion_authorizations_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "account_app_deletion_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      library_sync_state: {
        Row: {
          app_version: string
          client_updated_at: string | null
          created_at: string
          device_id: string | null
          revision: number
          state: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          app_version?: string
          client_updated_at?: string | null
          created_at?: string
          device_id?: string | null
          revision?: number
          state: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          app_version?: string
          client_updated_at?: string | null
          created_at?: string
          device_id?: string | null
          revision?: number
          state?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_items: {
        Row: {
          calories: number
          calories_high: number | null
          calories_low: number | null
          carbs: number | null
          confidence: string
          created_at: string
          fat: number | null
          fiber: number | null
          id: string
          meal_id: string
          name: string
          protein: number
          quantity_text: string | null
          saved_food_id: string | null
          sort_order: number
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          calories?: number
          calories_high?: number | null
          calories_low?: number | null
          carbs?: number | null
          confidence?: string
          created_at?: string
          fat?: number | null
          fiber?: number | null
          id?: string
          meal_id: string
          name: string
          protein?: number
          quantity_text?: string | null
          saved_food_id?: string | null
          sort_order?: number
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          calories?: number
          calories_high?: number | null
          calories_low?: number | null
          carbs?: number | null
          confidence?: string
          created_at?: string
          fat?: number | null
          fiber?: number | null
          id?: string
          meal_id?: string
          name?: string
          protein?: number
          quantity_text?: string | null
          saved_food_id?: string | null
          sort_order?: number
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_items_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_items_meal_owner_fkey_p14"
            columns: ["meal_id", "user_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "meal_items_saved_food_id_fkey"
            columns: ["saved_food_id"]
            isOneToOne: false
            referencedRelation: "saved_foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_items_saved_food_owner_fkey_p14"
            columns: ["saved_food_id", "user_id"]
            isOneToOne: false
            referencedRelation: "saved_foods"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      meals: {
        Row: {
          calories: number
          calories_high: number | null
          calories_low: number | null
          carbs: number | null
          confidence: string
          created_at: string
          daily_log_id: string
          eaten_at: string
          fat: number | null
          fiber: number | null
          id: string
          meal_type: string
          notes: string | null
          original_input: string | null
          photo_alt: string | null
          photo_url: string | null
          protein: number
          source: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          calories?: number
          calories_high?: number | null
          calories_low?: number | null
          carbs?: number | null
          confidence?: string
          created_at?: string
          daily_log_id: string
          eaten_at?: string
          fat?: number | null
          fiber?: number | null
          id?: string
          meal_type?: string
          notes?: string | null
          original_input?: string | null
          photo_alt?: string | null
          photo_url?: string | null
          protein?: number
          source?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          calories?: number
          calories_high?: number | null
          calories_low?: number | null
          carbs?: number | null
          confidence?: string
          created_at?: string
          daily_log_id?: string
          eaten_at?: string
          fat?: number | null
          fiber?: number | null
          id?: string
          meal_type?: string
          notes?: string | null
          original_input?: string | null
          photo_alt?: string | null
          photo_url?: string | null
          protein?: number
          source?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meals_daily_log_id_fkey"
            columns: ["daily_log_id"]
            isOneToOne: false
            referencedRelation: "daily_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meals_daily_log_owner_fkey_p14"
            columns: ["daily_log_id", "user_id"]
            isOneToOne: false
            referencedRelation: "daily_logs"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      micro_arcade_best_scores: {
        Row: {
          achieved_at: number
          game_id: string
          mode_id: string
          player_id: string
          raw_score: number
          score: number
          source_version: number
          submissions: number
        }
        Insert: {
          achieved_at: number
          game_id: string
          mode_id?: string
          player_id: string
          raw_score: number
          score: number
          source_version?: number
          submissions?: number
        }
        Update: {
          achieved_at?: number
          game_id?: string
          mode_id?: string
          player_id?: string
          raw_score?: number
          score?: number
          source_version?: number
          submissions?: number
        }
        Relationships: [
          {
            foreignKeyName: "micro_arcade_best_scores_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "micro_arcade_players"
            referencedColumns: ["id"]
          },
        ]
      }
      micro_arcade_lb_policy: {
        Row: {
          payload: Json
          version: number
        }
        Insert: {
          payload: Json
          version: number
        }
        Update: {
          payload?: Json
          version?: number
        }
        Relationships: []
      }
      micro_arcade_lb_reviews: {
        Row: {
          id: number
          new_status: string
          previous_status: string
          reason: string
          reviewed_at: number
          run_id: string
        }
        Insert: {
          id?: never
          new_status: string
          previous_status: string
          reason: string
          reviewed_at?: number
          run_id: string
        }
        Update: {
          id?: never
          new_status?: string
          previous_status?: string
          reason?: string
          reviewed_at?: number
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "micro_arcade_lb_reviews_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "micro_arcade_lb_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      micro_arcade_lb_runs: {
        Row: {
          active_ms: number
          ap_micros: number
          code: string
          completed_at: number
          contribution_micros: number
          created_at: number
          duration_ms: number
          game_id: string
          id: string
          mode_id: string
          player_id: string
          policy_id: string
          provenance: string
          raw_score: number
          session_id: string
          source_version: number
          status: string
        }
        Insert: {
          active_ms: number
          ap_micros: number
          code: string
          completed_at: number
          contribution_micros: number
          created_at: number
          duration_ms: number
          game_id: string
          id?: string
          mode_id: string
          player_id: string
          policy_id: string
          provenance: string
          raw_score: number
          session_id: string
          source_version: number
          status: string
        }
        Update: {
          active_ms?: number
          ap_micros?: number
          code?: string
          completed_at?: number
          contribution_micros?: number
          created_at?: number
          duration_ms?: number
          game_id?: string
          id?: string
          mode_id?: string
          player_id?: string
          policy_id?: string
          provenance?: string
          raw_score?: number
          session_id?: string
          source_version?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "micro_arcade_lb_runs_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "micro_arcade_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "micro_arcade_lb_runs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "micro_arcade_lb_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      micro_arcade_lb_sessions: {
        Row: {
          expires_at: number
          game_id: string
          id: string
          issued_at: number
          mode_id: string
          player_id: string
          policy_id: string
          request_id: string
          used_at: number | null
        }
        Insert: {
          expires_at: number
          game_id: string
          id?: string
          issued_at: number
          mode_id: string
          player_id: string
          policy_id: string
          request_id: string
          used_at?: number | null
        }
        Update: {
          expires_at?: number
          game_id?: string
          id?: string
          issued_at?: number
          mode_id?: string
          player_id?: string
          policy_id?: string
          request_id?: string
          used_at?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "micro_arcade_lb_sessions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "micro_arcade_players"
            referencedColumns: ["id"]
          },
        ]
      }
      micro_arcade_play_sessions: {
        Row: {
          expires_at: number
          game_id: string
          id: string
          issued_at: number
          mode_id: string
          player_id: string
          score_version: number
          used_at: number | null
        }
        Insert: {
          expires_at: number
          game_id: string
          id: string
          issued_at: number
          mode_id?: string
          player_id: string
          score_version?: number
          used_at?: number | null
        }
        Update: {
          expires_at?: number
          game_id?: string
          id?: string
          issued_at?: number
          mode_id?: string
          player_id?: string
          score_version?: number
          used_at?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "micro_arcade_play_sessions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "micro_arcade_players"
            referencedColumns: ["id"]
          },
        ]
      }
      micro_arcade_players: {
        Row: {
          country_code: string
          created_at: number
          credential_hash: string
          credential_version: number
          display_name: string
          id: string
          last_seen_at: number
        }
        Insert: {
          country_code?: string
          created_at: number
          credential_hash: string
          credential_version?: number
          display_name: string
          id: string
          last_seen_at: number
        }
        Update: {
          country_code?: string
          created_at?: number
          credential_hash?: string
          credential_version?: number
          display_name?: string
          id?: string
          last_seen_at?: number
        }
        Relationships: []
      }
      micro_arcade_rate_limits: {
        Row: {
          bucket_key: string
          bucket_start: number
          request_count: number
          scope: string
        }
        Insert: {
          bucket_key: string
          bucket_start: number
          request_count?: number
          scope: string
        }
        Update: {
          bucket_key?: string
          bucket_start?: number
          request_count?: number
          scope?: string
        }
        Relationships: []
      }
      micro_arcade_score_submissions: {
        Row: {
          created_at: number
          duration_ms: number
          game_id: string
          id: string
          mode_id: string
          player_id: string
          raw_score: number
          score: number
          session_id: string
          source_version: number
        }
        Insert: {
          created_at: number
          duration_ms: number
          game_id: string
          id: string
          mode_id?: string
          player_id: string
          raw_score: number
          score: number
          session_id: string
          source_version?: number
        }
        Update: {
          created_at?: number
          duration_ms?: number
          game_id?: string
          id?: string
          mode_id?: string
          player_id?: string
          raw_score?: number
          score?: number
          session_id?: string
          source_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "micro_arcade_score_submissions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "micro_arcade_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "micro_arcade_score_submissions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "micro_arcade_play_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      micro_arcade_scoring_profiles: {
        Row: {
          game_id: string
          profile: Json
        }
        Insert: {
          game_id: string
          profile: Json
        }
        Update: {
          game_id?: string
          profile?: Json
        }
        Relationships: []
      }
      notes_sync_records: {
        Row: {
          client_updated_at: number
          deleted_at: number | null
          entity_id: string
          entity_type: string
          payload: Json | null
          payload_hash: string | null
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          client_updated_at: number
          deleted_at?: number | null
          entity_id: string
          entity_type: string
          payload?: Json | null
          payload_hash?: string | null
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          client_updated_at?: number
          deleted_at?: number | null
          entity_id?: string
          entity_type?: string
          payload?: Json | null
          payload_hash?: string | null
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          adaptive_min_complete_days: number
          adaptive_target_enabled: boolean
          calorie_target: number
          created_at: string
          day_close_reminder_enabled: boolean
          day_close_reminder_time: string | null
          desired_weekly_weight_change: number | null
          fiber_target: number
          goal_weight: number | null
          protein_target: number
          reminder_timezone: string | null
          show_meal_photos: boolean
          show_optional_macros: boolean
          updated_at: string
          user_id: string
          weekly_review_day: number | null
          weekly_review_reminder_enabled: boolean
          weekly_review_time: string | null
          weigh_in_reminder_enabled: boolean
          weigh_in_reminder_time: string | null
        }
        Insert: {
          adaptive_min_complete_days?: number
          adaptive_target_enabled?: boolean
          calorie_target?: number
          created_at?: string
          day_close_reminder_enabled?: boolean
          day_close_reminder_time?: string | null
          desired_weekly_weight_change?: number | null
          fiber_target?: number
          goal_weight?: number | null
          protein_target?: number
          reminder_timezone?: string | null
          show_meal_photos?: boolean
          show_optional_macros?: boolean
          updated_at?: string
          user_id: string
          weekly_review_day?: number | null
          weekly_review_reminder_enabled?: boolean
          weekly_review_time?: string | null
          weigh_in_reminder_enabled?: boolean
          weigh_in_reminder_time?: string | null
        }
        Update: {
          adaptive_min_complete_days?: number
          adaptive_target_enabled?: boolean
          calorie_target?: number
          created_at?: string
          day_close_reminder_enabled?: boolean
          day_close_reminder_time?: string | null
          desired_weekly_weight_change?: number | null
          fiber_target?: number
          goal_weight?: number | null
          protein_target?: number
          reminder_timezone?: string | null
          show_meal_photos?: boolean
          show_optional_macros?: boolean
          updated_at?: string
          user_id?: string
          weekly_review_day?: number | null
          weekly_review_reminder_enabled?: boolean
          weekly_review_time?: string | null
          weigh_in_reminder_enabled?: boolean
          weigh_in_reminder_time?: string | null
        }
        Relationships: []
      }
      saved_food_portions: {
        Row: {
          created_at: string
          id: string
          last_used_at: string | null
          multiplier: number
          quantity_text: string | null
          saved_food_id: string
          updated_at: string
          use_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_used_at?: string | null
          multiplier: number
          quantity_text?: string | null
          saved_food_id: string
          updated_at?: string
          use_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_used_at?: string | null
          multiplier?: number
          quantity_text?: string | null
          saved_food_id?: string
          updated_at?: string
          use_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_food_portions_food_owner_fkey_p14"
            columns: ["saved_food_id", "user_id"]
            isOneToOne: false
            referencedRelation: "saved_foods"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "saved_food_portions_saved_food_id_fkey"
            columns: ["saved_food_id"]
            isOneToOne: false
            referencedRelation: "saved_foods"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_foods: {
        Row: {
          aliases: string[]
          barcode: string | null
          brand: string | null
          calories: number
          carbs: number | null
          confidence: string
          created_at: string
          fat: number | null
          favorite: boolean
          fiber: number | null
          id: string
          last_used_at: string | null
          name: string
          normalized_name: string
          photo_url: string | null
          protein: number
          quantity_text: string | null
          source: string
          updated_at: string
          use_count: number
          user_id: string
          verified_at: string | null
        }
        Insert: {
          aliases?: string[]
          barcode?: string | null
          brand?: string | null
          calories?: number
          carbs?: number | null
          confidence?: string
          created_at?: string
          fat?: number | null
          favorite?: boolean
          fiber?: number | null
          id?: string
          last_used_at?: string | null
          name: string
          normalized_name: string
          photo_url?: string | null
          protein?: number
          quantity_text?: string | null
          source?: string
          updated_at?: string
          use_count?: number
          user_id: string
          verified_at?: string | null
        }
        Update: {
          aliases?: string[]
          barcode?: string | null
          brand?: string | null
          calories?: number
          carbs?: number | null
          confidence?: string
          created_at?: string
          fat?: number | null
          favorite?: boolean
          fiber?: number | null
          id?: string
          last_used_at?: string | null
          name?: string
          normalized_name?: string
          photo_url?: string | null
          protein?: number
          quantity_text?: string | null
          source?: string
          updated_at?: string
          use_count?: number
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      saved_meal_items: {
        Row: {
          calories: number
          calories_high: number | null
          calories_low: number | null
          carbs: number | null
          confidence: string
          created_at: string
          fat: number | null
          fiber: number | null
          id: string
          name: string
          protein: number
          quantity_text: string | null
          saved_food_id: string | null
          saved_meal_id: string
          sort_order: number
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          calories?: number
          calories_high?: number | null
          calories_low?: number | null
          carbs?: number | null
          confidence?: string
          created_at?: string
          fat?: number | null
          fiber?: number | null
          id?: string
          name: string
          protein?: number
          quantity_text?: string | null
          saved_food_id?: string | null
          saved_meal_id: string
          sort_order?: number
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          calories?: number
          calories_high?: number | null
          calories_low?: number | null
          carbs?: number | null
          confidence?: string
          created_at?: string
          fat?: number | null
          fiber?: number | null
          id?: string
          name?: string
          protein?: number
          quantity_text?: string | null
          saved_food_id?: string | null
          saved_meal_id?: string
          sort_order?: number
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_meal_items_meal_owner_fkey_p14"
            columns: ["saved_meal_id", "user_id"]
            isOneToOne: false
            referencedRelation: "saved_meals"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "saved_meal_items_saved_food_id_fkey"
            columns: ["saved_food_id"]
            isOneToOne: false
            referencedRelation: "saved_foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_meal_items_saved_food_owner_fkey_p14"
            columns: ["saved_food_id", "user_id"]
            isOneToOne: false
            referencedRelation: "saved_foods"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "saved_meal_items_saved_meal_id_fkey"
            columns: ["saved_meal_id"]
            isOneToOne: false
            referencedRelation: "saved_meals"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_meals: {
        Row: {
          aliases: string[]
          calories: number | null
          carbs: number | null
          created_at: string
          fat: number | null
          favorite: boolean
          fiber: number | null
          id: string
          is_recipe: boolean
          last_used_at: string | null
          meal_type: string
          name: string
          normalized_name: string
          photo_url: string | null
          protein: number | null
          recipe_notes: string | null
          serving_text: string | null
          servings: number | null
          updated_at: string
          use_count: number
          user_id: string
        }
        Insert: {
          aliases?: string[]
          calories?: number | null
          carbs?: number | null
          created_at?: string
          fat?: number | null
          favorite?: boolean
          fiber?: number | null
          id?: string
          is_recipe?: boolean
          last_used_at?: string | null
          meal_type?: string
          name: string
          normalized_name: string
          photo_url?: string | null
          protein?: number | null
          recipe_notes?: string | null
          serving_text?: string | null
          servings?: number | null
          updated_at?: string
          use_count?: number
          user_id: string
        }
        Update: {
          aliases?: string[]
          calories?: number | null
          carbs?: number | null
          created_at?: string
          fat?: number | null
          favorite?: boolean
          fiber?: number | null
          id?: string
          is_recipe?: boolean
          last_used_at?: string | null
          meal_type?: string
          name?: string
          normalized_name?: string
          photo_url?: string | null
          protein?: number | null
          recipe_notes?: string | null
          serving_text?: string | null
          servings?: number | null
          updated_at?: string
          use_count?: number
          user_id?: string
        }
        Relationships: []
      }
      study_attempt_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          question_id: string
          request_id: string
          response: Json | null
          session_id: string | null
          started_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          question_id: string
          request_id: string
          response?: Json | null
          session_id?: string | null
          started_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          question_id?: string
          request_id?: string
          response?: Json | null
          session_id?: string | null
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_attempt_requests_question_owner_fk"
            columns: ["question_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_questions"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_attempt_requests_session_owner_fk"
            columns: ["session_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      study_attempts: {
        Row: {
          completed_at: string
          course_id: string
          created_at: string
          duration_seconds: number | null
          error_types: Database["public"]["Enums"]["study_error_type"][]
          evidence_dimension: Database["public"]["Enums"]["study_evidence_dimension"]
          id: string
          independence: Database["public"]["Enums"]["study_independence"]
          question_id: string
          response_text: string | null
          result: Database["public"]["Enums"]["study_attempt_result"]
          score: number
          self_confidence: number | null
          session_id: string | null
          skill_id: string
          started_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string
          course_id: string
          created_at?: string
          duration_seconds?: number | null
          error_types?: Database["public"]["Enums"]["study_error_type"][]
          evidence_dimension: Database["public"]["Enums"]["study_evidence_dimension"]
          id?: string
          independence: Database["public"]["Enums"]["study_independence"]
          question_id: string
          response_text?: string | null
          result: Database["public"]["Enums"]["study_attempt_result"]
          score: number
          self_confidence?: number | null
          session_id?: string | null
          skill_id: string
          started_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string
          course_id?: string
          created_at?: string
          duration_seconds?: number | null
          error_types?: Database["public"]["Enums"]["study_error_type"][]
          evidence_dimension?: Database["public"]["Enums"]["study_evidence_dimension"]
          id?: string
          independence?: Database["public"]["Enums"]["study_independence"]
          question_id?: string
          response_text?: string | null
          result?: Database["public"]["Enums"]["study_attempt_result"]
          score?: number
          self_confidence?: number | null
          session_id?: string | null
          skill_id?: string
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_attempts_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_activation_course_status"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_attempts_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_baseline_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_attempts_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_configuration"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_attempts_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_operating_mode"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_attempts_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_progress"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_attempts_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_risk"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_attempts_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_courses"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_attempts_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_intelligence_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_attempts_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_strategy"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_attempts_question_owner_fk"
            columns: ["question_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_questions"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_attempts_session_owner_fk"
            columns: ["session_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_attempts_skill_owner_fk"
            columns: ["skill_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_skill_retention_diagnostics"
            referencedColumns: ["skill_id", "user_id"]
          },
          {
            foreignKeyName: "study_attempts_skill_owner_fk"
            columns: ["skill_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_skills"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      study_baseline_diagnostics: {
        Row: {
          completed_at: string | null
          course_id: string
          created_at: string
          id: string
          note: string | null
          semester_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["study_baseline_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          created_at?: string
          id?: string
          note?: string | null
          semester_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["study_baseline_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          created_at?: string
          id?: string
          note?: string | null
          semester_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["study_baseline_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_baseline_diagnostics_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_activation_course_status"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_baseline_diagnostics_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_baseline_summary"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_baseline_diagnostics_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_course_configuration"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_baseline_diagnostics_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_course_operating_mode"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_baseline_diagnostics_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_course_progress"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_baseline_diagnostics_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_course_risk"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_baseline_diagnostics_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_baseline_diagnostics_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_exam_intelligence_summary"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_baseline_diagnostics_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_exam_strategy"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_baseline_diagnostics_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_semester_checkpoint_rotation"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_baseline_diagnostics_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "study_activation_snapshot"
            referencedColumns: ["semester_id"]
          },
          {
            foreignKeyName: "study_baseline_diagnostics_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "study_current_capacity"
            referencedColumns: ["semester_id"]
          },
          {
            foreignKeyName: "study_baseline_diagnostics_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "study_semester_checkpoint_rotation"
            referencedColumns: ["semester_id"]
          },
          {
            foreignKeyName: "study_baseline_diagnostics_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "study_semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      study_baseline_results: {
        Row: {
          classification: Database["public"]["Enums"]["study_baseline_classification"]
          classified_at: string
          confidence: number | null
          course_id: string
          diagnostic_id: string
          note: string | null
          skill_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          classification: Database["public"]["Enums"]["study_baseline_classification"]
          classified_at?: string
          confidence?: number | null
          course_id: string
          diagnostic_id: string
          note?: string | null
          skill_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          classification?: Database["public"]["Enums"]["study_baseline_classification"]
          classified_at?: string
          confidence?: number | null
          course_id?: string
          diagnostic_id?: string
          note?: string | null
          skill_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_baseline_results_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_activation_course_status"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_baseline_results_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_baseline_summary"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_baseline_results_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_course_configuration"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_baseline_results_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_course_operating_mode"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_baseline_results_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_course_progress"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_baseline_results_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_course_risk"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_baseline_results_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_baseline_results_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_exam_intelligence_summary"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_baseline_results_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_exam_strategy"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_baseline_results_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_semester_checkpoint_rotation"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_baseline_results_diagnostic_id_fkey"
            columns: ["diagnostic_id"]
            isOneToOne: false
            referencedRelation: "study_baseline_diagnostics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_baseline_results_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "study_skill_retention_diagnostics"
            referencedColumns: ["skill_id"]
          },
          {
            foreignKeyName: "study_baseline_results_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "study_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      study_calendar_connections: {
        Row: {
          connected_at: string | null
          created_at: string
          google_account_email: string | null
          google_account_sub: string | null
          last_error: string | null
          last_sync_at: string | null
          last_sync_status: string | null
          scopes: string[]
          status: string
          timezone: string | null
          updated_at: string
          user_id: string
          write_calendar_id: string | null
        }
        Insert: {
          connected_at?: string | null
          created_at?: string
          google_account_email?: string | null
          google_account_sub?: string | null
          last_error?: string | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          scopes?: string[]
          status?: string
          timezone?: string | null
          updated_at?: string
          user_id: string
          write_calendar_id?: string | null
        }
        Update: {
          connected_at?: string | null
          created_at?: string
          google_account_email?: string | null
          google_account_sub?: string | null
          last_error?: string | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          scopes?: string[]
          status?: string
          timezone?: string | null
          updated_at?: string
          user_id?: string
          write_calendar_id?: string | null
        }
        Relationships: []
      }
      study_calendar_credentials: {
        Row: {
          created_at: string
          encrypted_refresh_token: string
          encryption_version: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_refresh_token: string
          encryption_version?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_refresh_token?: string
          encryption_version?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_calendar_events: {
        Row: {
          all_day: boolean
          calendar_id: string
          course_id: string | null
          created_at: string
          end_at: string
          event_id: string
          event_role: Database["public"]["Enums"]["study_calendar_event_role"]
          event_type: string | null
          event_url: string | null
          location: string | null
          recurring_event_id: string | null
          source_updated_at: string | null
          start_at: string
          status: string | null
          study_owned: boolean
          summary: string | null
          synced_at: string
          transparency: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          all_day?: boolean
          calendar_id: string
          course_id?: string | null
          created_at?: string
          end_at: string
          event_id: string
          event_role?: Database["public"]["Enums"]["study_calendar_event_role"]
          event_type?: string | null
          event_url?: string | null
          location?: string | null
          recurring_event_id?: string | null
          source_updated_at?: string | null
          start_at: string
          status?: string | null
          study_owned?: boolean
          summary?: string | null
          synced_at?: string
          transparency?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          all_day?: boolean
          calendar_id?: string
          course_id?: string | null
          created_at?: string
          end_at?: string
          event_id?: string
          event_role?: Database["public"]["Enums"]["study_calendar_event_role"]
          event_type?: string | null
          event_url?: string | null
          location?: string | null
          recurring_event_id?: string | null
          source_updated_at?: string | null
          start_at?: string
          status?: string | null
          study_owned?: boolean
          summary?: string | null
          synced_at?: string
          transparency?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_calendar_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_activation_course_status"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_calendar_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_baseline_summary"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_calendar_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_course_configuration"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_calendar_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_course_operating_mode"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_calendar_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_course_progress"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_calendar_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_course_risk"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_calendar_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_calendar_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_exam_intelligence_summary"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_calendar_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_exam_strategy"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_calendar_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_semester_checkpoint_rotation"
            referencedColumns: ["course_id"]
          },
        ]
      }
      study_calendar_planning_settings: {
        Row: {
          calendar_buffer_minutes: number
          created_at: string
          day_end: string
          day_start: string
          include_weekends: boolean
          max_block_minutes: number
          minimum_block_minutes: number
          semester_id: string
          study_reminder_minutes: number
          sync_future_days: number
          sync_past_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          calendar_buffer_minutes?: number
          created_at?: string
          day_end?: string
          day_start?: string
          include_weekends?: boolean
          max_block_minutes?: number
          minimum_block_minutes?: number
          semester_id: string
          study_reminder_minutes?: number
          sync_future_days?: number
          sync_past_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          calendar_buffer_minutes?: number
          created_at?: string
          day_end?: string
          day_start?: string
          include_weekends?: boolean
          max_block_minutes?: number
          minimum_block_minutes?: number
          semester_id?: string
          study_reminder_minutes?: number
          sync_future_days?: number
          sync_past_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_calendar_planning_settings_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "study_activation_snapshot"
            referencedColumns: ["semester_id"]
          },
          {
            foreignKeyName: "study_calendar_planning_settings_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "study_current_capacity"
            referencedColumns: ["semester_id"]
          },
          {
            foreignKeyName: "study_calendar_planning_settings_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "study_semester_checkpoint_rotation"
            referencedColumns: ["semester_id"]
          },
          {
            foreignKeyName: "study_calendar_planning_settings_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "study_semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      study_calendar_sources: {
        Row: {
          access_role: string | null
          background_color: string | null
          calendar_id: string
          created_at: string
          is_primary: boolean
          last_seen_at: string
          selected: boolean
          summary: string
          timezone: string | null
          updated_at: string
          user_id: string
          writable: boolean
        }
        Insert: {
          access_role?: string | null
          background_color?: string | null
          calendar_id: string
          created_at?: string
          is_primary?: boolean
          last_seen_at?: string
          selected?: boolean
          summary: string
          timezone?: string | null
          updated_at?: string
          user_id: string
          writable?: boolean
        }
        Update: {
          access_role?: string | null
          background_color?: string | null
          calendar_id?: string
          created_at?: string
          is_primary?: boolean
          last_seen_at?: string
          selected?: boolean
          summary?: string
          timezone?: string | null
          updated_at?: string
          user_id?: string
          writable?: boolean
        }
        Relationships: []
      }
      study_commitments: {
        Row: {
          calendar_event_id: string | null
          calendar_id: string | null
          calendar_synced: boolean
          completed_at: string | null
          course_id: string | null
          created_at: string
          due_at: string
          estimated_minutes: number
          id: string
          kind: Database["public"]["Enums"]["study_commitment_kind"]
          note: string | null
          priority: number
          resource_id: string | null
          semester_id: string
          source_updated_at: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["study_commitment_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          calendar_event_id?: string | null
          calendar_id?: string | null
          calendar_synced?: boolean
          completed_at?: string | null
          course_id?: string | null
          created_at?: string
          due_at: string
          estimated_minutes?: number
          id?: string
          kind?: Database["public"]["Enums"]["study_commitment_kind"]
          note?: string | null
          priority?: number
          resource_id?: string | null
          semester_id: string
          source_updated_at?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["study_commitment_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          calendar_event_id?: string | null
          calendar_id?: string | null
          calendar_synced?: boolean
          completed_at?: string | null
          course_id?: string | null
          created_at?: string
          due_at?: string
          estimated_minutes?: number
          id?: string
          kind?: Database["public"]["Enums"]["study_commitment_kind"]
          note?: string | null
          priority?: number
          resource_id?: string | null
          semester_id?: string
          source_updated_at?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["study_commitment_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_commitments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_activation_course_status"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_commitments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_baseline_summary"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_commitments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_course_configuration"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_commitments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_course_operating_mode"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_commitments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_course_progress"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_commitments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_course_risk"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_commitments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_commitments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_exam_intelligence_summary"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_commitments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_exam_strategy"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_commitments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_semester_checkpoint_rotation"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_commitments_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "study_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_commitments_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "study_activation_snapshot"
            referencedColumns: ["semester_id"]
          },
          {
            foreignKeyName: "study_commitments_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "study_current_capacity"
            referencedColumns: ["semester_id"]
          },
          {
            foreignKeyName: "study_commitments_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "study_semester_checkpoint_rotation"
            referencedColumns: ["semester_id"]
          },
          {
            foreignKeyName: "study_commitments_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "study_semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      study_course_workflow_settings: {
        Row: {
          checkpoint_budget_minutes: number
          checkpoint_weight: number
          course_id: string
          created_at: string
          exam_mode_lead_days: number
          expected_lectures_per_week: number | null
          expects_exercise: boolean
          expects_solution: boolean
          lecture_retrieval_target_hours: number
          solution_reconcile_target_hours: number
          transition_lead_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          checkpoint_budget_minutes?: number
          checkpoint_weight?: number
          course_id: string
          created_at?: string
          exam_mode_lead_days?: number
          expected_lectures_per_week?: number | null
          expects_exercise?: boolean
          expects_solution?: boolean
          lecture_retrieval_target_hours?: number
          solution_reconcile_target_hours?: number
          transition_lead_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          checkpoint_budget_minutes?: number
          checkpoint_weight?: number
          course_id?: string
          created_at?: string
          exam_mode_lead_days?: number
          expected_lectures_per_week?: number | null
          expects_exercise?: boolean
          expects_solution?: boolean
          lecture_retrieval_target_hours?: number
          solution_reconcile_target_hours?: number
          transition_lead_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_course_workflow_settings_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: true
            referencedRelation: "study_activation_course_status"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_course_workflow_settings_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: true
            referencedRelation: "study_baseline_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_course_workflow_settings_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: true
            referencedRelation: "study_course_configuration"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_course_workflow_settings_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: true
            referencedRelation: "study_course_operating_mode"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_course_workflow_settings_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: true
            referencedRelation: "study_course_progress"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_course_workflow_settings_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: true
            referencedRelation: "study_course_risk"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_course_workflow_settings_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: true
            referencedRelation: "study_courses"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_course_workflow_settings_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: true
            referencedRelation: "study_exam_intelligence_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_course_workflow_settings_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: true
            referencedRelation: "study_exam_strategy"
            referencedColumns: ["course_id", "user_id"]
          },
        ]
      }
      study_courses: {
        Row: {
          active: boolean
          chatgpt_project_ref: string | null
          course_kind: Database["public"]["Enums"]["study_course_kind"]
          created_at: string
          credits: number | null
          display_name: string
          drive_folder_id: string | null
          drive_folder_map: Json
          drive_folder_url: string | null
          exam_at: string | null
          exam_duration_minutes: number | null
          exam_format: string | null
          id: string
          professor: string | null
          semester_id: string
          short_name: string | null
          sort_order: number
          stable_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          chatgpt_project_ref?: string | null
          course_kind: Database["public"]["Enums"]["study_course_kind"]
          created_at?: string
          credits?: number | null
          display_name: string
          drive_folder_id?: string | null
          drive_folder_map?: Json
          drive_folder_url?: string | null
          exam_at?: string | null
          exam_duration_minutes?: number | null
          exam_format?: string | null
          id?: string
          professor?: string | null
          semester_id: string
          short_name?: string | null
          sort_order?: number
          stable_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          chatgpt_project_ref?: string | null
          course_kind?: Database["public"]["Enums"]["study_course_kind"]
          created_at?: string
          credits?: number | null
          display_name?: string
          drive_folder_id?: string | null
          drive_folder_map?: Json
          drive_folder_url?: string | null
          exam_at?: string | null
          exam_duration_minutes?: number | null
          exam_format?: string | null
          id?: string
          professor?: string | null
          semester_id?: string
          short_name?: string | null
          sort_order?: number
          stable_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_courses_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_activation_snapshot"
            referencedColumns: ["semester_id", "user_id"]
          },
          {
            foreignKeyName: "study_courses_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_current_capacity"
            referencedColumns: ["semester_id", "user_id"]
          },
          {
            foreignKeyName: "study_courses_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_semester_checkpoint_rotation"
            referencedColumns: ["semester_id", "user_id"]
          },
          {
            foreignKeyName: "study_courses_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_semesters"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      study_daily_capacity: {
        Row: {
          created_at: string
          custom_budget_minutes: number | null
          mode: Database["public"]["Enums"]["study_capacity_mode"]
          note: string | null
          plan_date: string
          semester_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_budget_minutes?: number | null
          mode: Database["public"]["Enums"]["study_capacity_mode"]
          note?: string | null
          plan_date: string
          semester_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_budget_minutes?: number | null
          mode?: Database["public"]["Enums"]["study_capacity_mode"]
          note?: string | null
          plan_date?: string
          semester_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_daily_capacity_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "study_activation_snapshot"
            referencedColumns: ["semester_id"]
          },
          {
            foreignKeyName: "study_daily_capacity_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "study_current_capacity"
            referencedColumns: ["semester_id"]
          },
          {
            foreignKeyName: "study_daily_capacity_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "study_semester_checkpoint_rotation"
            referencedColumns: ["semester_id"]
          },
          {
            foreignKeyName: "study_daily_capacity_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "study_semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      study_drive_connections: {
        Row: {
          connected_at: string | null
          created_at: string
          google_account_email: string | null
          google_account_sub: string | null
          inbox_folder_id: string | null
          inbox_folder_url: string | null
          last_error: string | null
          last_scan_at: string | null
          last_scan_status: string | null
          root_folder_id: string | null
          root_folder_url: string | null
          scopes: string[]
          semester_folder_id: string | null
          semester_folder_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connected_at?: string | null
          created_at?: string
          google_account_email?: string | null
          google_account_sub?: string | null
          inbox_folder_id?: string | null
          inbox_folder_url?: string | null
          last_error?: string | null
          last_scan_at?: string | null
          last_scan_status?: string | null
          root_folder_id?: string | null
          root_folder_url?: string | null
          scopes?: string[]
          semester_folder_id?: string | null
          semester_folder_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connected_at?: string | null
          created_at?: string
          google_account_email?: string | null
          google_account_sub?: string | null
          inbox_folder_id?: string | null
          inbox_folder_url?: string | null
          last_error?: string | null
          last_scan_at?: string | null
          last_scan_status?: string | null
          root_folder_id?: string | null
          root_folder_url?: string | null
          scopes?: string[]
          semester_folder_id?: string | null
          semester_folder_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_drive_credentials: {
        Row: {
          created_at: string
          encrypted_refresh_token: string
          encryption_version: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_refresh_token: string
          encryption_version?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_refresh_token?: string
          encryption_version?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_errors: {
        Row: {
          attempt_id: string
          course_id: string
          created_at: string
          detail: string | null
          error_type: Database["public"]["Enums"]["study_error_type"]
          id: string
          question_id: string
          resolution_attempt_id: string | null
          resolved_at: string | null
          skill_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_id: string
          course_id: string
          created_at?: string
          detail?: string | null
          error_type: Database["public"]["Enums"]["study_error_type"]
          id?: string
          question_id: string
          resolution_attempt_id?: string | null
          resolved_at?: string | null
          skill_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_id?: string
          course_id?: string
          created_at?: string
          detail?: string | null
          error_type?: Database["public"]["Enums"]["study_error_type"]
          id?: string
          question_id?: string
          resolution_attempt_id?: string | null
          resolved_at?: string | null
          skill_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_errors_attempt_owner_fk"
            columns: ["attempt_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_attempts"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_errors_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_activation_course_status"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_errors_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_baseline_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_errors_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_configuration"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_errors_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_operating_mode"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_errors_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_progress"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_errors_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_risk"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_errors_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_courses"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_errors_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_intelligence_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_errors_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_strategy"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_errors_question_owner_fk"
            columns: ["question_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_questions"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_errors_resolution_attempt_owner_fk"
            columns: ["resolution_attempt_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_attempts"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_errors_skill_owner_fk"
            columns: ["skill_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_skill_retention_diagnostics"
            referencedColumns: ["skill_id", "user_id"]
          },
          {
            foreignKeyName: "study_errors_skill_owner_fk"
            columns: ["skill_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_skills"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      study_exam_question_skills: {
        Row: {
          created_at: string
          exam_question_id: string
          role: string
          skill_id: string
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          exam_question_id: string
          role?: string
          skill_id: string
          user_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          exam_question_id?: string
          role?: string
          skill_id?: string
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "study_exam_question_skills_exam_question_id_fkey"
            columns: ["exam_question_id"]
            isOneToOne: false
            referencedRelation: "study_exam_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_exam_question_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "study_skill_retention_diagnostics"
            referencedColumns: ["skill_id"]
          },
          {
            foreignKeyName: "study_exam_question_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "study_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      study_exam_questions: {
        Row: {
          active: boolean
          answer_key_or_rubric: string | null
          answer_status: Database["public"]["Enums"]["study_exam_answer_status"]
          created_at: string
          difficulty: number | null
          exam_id: string
          id: string
          points: number | null
          primary_skill_id: string | null
          prompt_summary: string | null
          prompt_text: string | null
          question_no: string
          solution_page: number | null
          solution_resource_id: string | null
          solution_section: string | null
          sort_order: number
          source_confidence: number | null
          source_page: number | null
          source_page_end: number | null
          source_section: string | null
          study_question_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          answer_key_or_rubric?: string | null
          answer_status?: Database["public"]["Enums"]["study_exam_answer_status"]
          created_at?: string
          difficulty?: number | null
          exam_id: string
          id?: string
          points?: number | null
          primary_skill_id?: string | null
          prompt_summary?: string | null
          prompt_text?: string | null
          question_no: string
          solution_page?: number | null
          solution_resource_id?: string | null
          solution_section?: string | null
          sort_order?: number
          source_confidence?: number | null
          source_page?: number | null
          source_page_end?: number | null
          source_section?: string | null
          study_question_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          answer_key_or_rubric?: string | null
          answer_status?: Database["public"]["Enums"]["study_exam_answer_status"]
          created_at?: string
          difficulty?: number | null
          exam_id?: string
          id?: string
          points?: number | null
          primary_skill_id?: string | null
          prompt_summary?: string | null
          prompt_text?: string | null
          question_no?: string
          solution_page?: number | null
          solution_resource_id?: string | null
          solution_section?: string | null
          sort_order?: number
          source_confidence?: number | null
          source_page?: number | null
          source_page_end?: number | null
          source_section?: string | null
          study_question_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_exam_questions_exam_owner_fk"
            columns: ["exam_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_paper_catalog"
            referencedColumns: ["exam_id", "user_id"]
          },
          {
            foreignKeyName: "study_exam_questions_exam_owner_fk"
            columns: ["exam_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exams"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_exam_questions_skill_owner_fk"
            columns: ["primary_skill_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_skill_retention_diagnostics"
            referencedColumns: ["skill_id", "user_id"]
          },
          {
            foreignKeyName: "study_exam_questions_skill_owner_fk"
            columns: ["primary_skill_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_skills"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_exam_questions_solution_resource_fk"
            columns: ["solution_resource_id"]
            isOneToOne: false
            referencedRelation: "study_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_exam_questions_study_question_fk"
            columns: ["study_question_id"]
            isOneToOne: false
            referencedRelation: "study_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      study_exam_results: {
        Row: {
          attempt_no: number
          course_id: string
          decision_priority_snapshot: number | null
          exam_at: string
          grade_text: string | null
          id: string
          next_exam_at: string | null
          outcome: string
          published_at: string | null
          readiness_band_snapshot: string | null
          readiness_index_snapshot: number | null
          recorded_at: string
          result_status: string
          retake_decision: string
          score_percent: number | null
          semester_id: string
          source_note: string | null
          source_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_no: number
          course_id: string
          decision_priority_snapshot?: number | null
          exam_at: string
          grade_text?: string | null
          id?: string
          next_exam_at?: string | null
          outcome: string
          published_at?: string | null
          readiness_band_snapshot?: string | null
          readiness_index_snapshot?: number | null
          recorded_at?: string
          result_status: string
          retake_decision?: string
          score_percent?: number | null
          semester_id: string
          source_note?: string | null
          source_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_no?: number
          course_id?: string
          decision_priority_snapshot?: number | null
          exam_at?: string
          grade_text?: string | null
          id?: string
          next_exam_at?: string | null
          outcome?: string
          published_at?: string | null
          readiness_band_snapshot?: string | null
          readiness_index_snapshot?: number | null
          recorded_at?: string
          result_status?: string
          retake_decision?: string
          score_percent?: number | null
          semester_id?: string
          source_note?: string | null
          source_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_exam_results_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_activation_course_status"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_exam_results_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_baseline_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_exam_results_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_configuration"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_exam_results_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_operating_mode"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_exam_results_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_progress"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_exam_results_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_risk"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_exam_results_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_courses"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_exam_results_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_intelligence_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_exam_results_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_strategy"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_exam_results_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_activation_snapshot"
            referencedColumns: ["semester_id", "user_id"]
          },
          {
            foreignKeyName: "study_exam_results_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_current_capacity"
            referencedColumns: ["semester_id", "user_id"]
          },
          {
            foreignKeyName: "study_exam_results_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_semester_checkpoint_rotation"
            referencedColumns: ["semester_id", "user_id"]
          },
          {
            foreignKeyName: "study_exam_results_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_semesters"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      study_exam_simulation_items: {
        Row: {
          attempt_id: string | null
          awarded_points: number | null
          course_id: string
          created_at: string
          duration_seconds: number
          error_types: Database["public"]["Enums"]["study_error_type"][]
          exam_question_id: string
          graded_at: string | null
          grading_status: Database["public"]["Enums"]["study_exam_grading_status"]
          max_points: number
          question_no: string
          response_text: string | null
          self_confidence: number | null
          simulation_id: string
          sort_order: number
          study_question_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_id?: string | null
          awarded_points?: number | null
          course_id: string
          created_at?: string
          duration_seconds?: number
          error_types?: Database["public"]["Enums"]["study_error_type"][]
          exam_question_id: string
          graded_at?: string | null
          grading_status?: Database["public"]["Enums"]["study_exam_grading_status"]
          max_points: number
          question_no: string
          response_text?: string | null
          self_confidence?: number | null
          simulation_id: string
          sort_order?: number
          study_question_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_id?: string | null
          awarded_points?: number | null
          course_id?: string
          created_at?: string
          duration_seconds?: number
          error_types?: Database["public"]["Enums"]["study_error_type"][]
          exam_question_id?: string
          graded_at?: string | null
          grading_status?: Database["public"]["Enums"]["study_exam_grading_status"]
          max_points?: number
          question_no?: string
          response_text?: string | null
          self_confidence?: number | null
          simulation_id?: string
          sort_order?: number
          study_question_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_exam_simulation_items_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "study_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_exam_simulation_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_activation_course_status"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_exam_simulation_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_baseline_summary"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_exam_simulation_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_course_configuration"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_exam_simulation_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_course_operating_mode"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_exam_simulation_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_course_progress"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_exam_simulation_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_course_risk"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_exam_simulation_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_exam_simulation_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_exam_intelligence_summary"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_exam_simulation_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_exam_strategy"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_exam_simulation_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_semester_checkpoint_rotation"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_exam_simulation_items_exam_question_id_fkey"
            columns: ["exam_question_id"]
            isOneToOne: false
            referencedRelation: "study_exam_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_exam_simulation_items_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "study_exam_intelligence_summary"
            referencedColumns: ["last_simulation_id"]
          },
          {
            foreignKeyName: "study_exam_simulation_items_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "study_exam_simulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_exam_simulation_items_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "study_exam_strategy"
            referencedColumns: ["last_simulation_id"]
          },
          {
            foreignKeyName: "study_exam_simulation_items_study_question_id_fkey"
            columns: ["study_question_id"]
            isOneToOne: false
            referencedRelation: "study_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      study_exam_simulations: {
        Row: {
          awarded_points: number | null
          completed_at: string | null
          course_id: string
          created_at: string
          duration_minutes: number
          exam_id: string
          id: string
          note: string | null
          score_percent: number | null
          started_at: string
          status: Database["public"]["Enums"]["study_exam_simulation_status"]
          submitted_at: string | null
          time_used_seconds: number | null
          total_points: number
          updated_at: string
          user_id: string
          verified_awarded_points: number | null
          verified_coverage_percent: number | null
          verified_max_points: number | null
          verified_score_percent: number | null
        }
        Insert: {
          awarded_points?: number | null
          completed_at?: string | null
          course_id: string
          created_at?: string
          duration_minutes: number
          exam_id: string
          id: string
          note?: string | null
          score_percent?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["study_exam_simulation_status"]
          submitted_at?: string | null
          time_used_seconds?: number | null
          total_points: number
          updated_at?: string
          user_id: string
          verified_awarded_points?: number | null
          verified_coverage_percent?: number | null
          verified_max_points?: number | null
          verified_score_percent?: number | null
        }
        Update: {
          awarded_points?: number | null
          completed_at?: string | null
          course_id?: string
          created_at?: string
          duration_minutes?: number
          exam_id?: string
          id?: string
          note?: string | null
          score_percent?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["study_exam_simulation_status"]
          submitted_at?: string | null
          time_used_seconds?: number | null
          total_points?: number
          updated_at?: string
          user_id?: string
          verified_awarded_points?: number | null
          verified_coverage_percent?: number | null
          verified_max_points?: number | null
          verified_score_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "study_exam_simulations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_activation_course_status"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_exam_simulations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_baseline_summary"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_exam_simulations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_course_configuration"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_exam_simulations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_course_operating_mode"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_exam_simulations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_course_progress"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_exam_simulations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_course_risk"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_exam_simulations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_exam_simulations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_exam_intelligence_summary"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_exam_simulations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_exam_strategy"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_exam_simulations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_semester_checkpoint_rotation"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_exam_simulations_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "study_exam_paper_catalog"
            referencedColumns: ["exam_id"]
          },
          {
            foreignKeyName: "study_exam_simulations_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "study_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      study_exams: {
        Row: {
          active: boolean
          course_id: string
          created_at: string
          duration_minutes: number | null
          exam_at: string | null
          id: string
          notes: string | null
          official: boolean
          solution_resource_id: string | null
          source_resource_id: string | null
          stable_key: string | null
          syllabus_relevance: number
          title: string
          total_points: number | null
          updated_at: string
          user_id: string
          year_label: string | null
        }
        Insert: {
          active?: boolean
          course_id: string
          created_at?: string
          duration_minutes?: number | null
          exam_at?: string | null
          id?: string
          notes?: string | null
          official?: boolean
          solution_resource_id?: string | null
          source_resource_id?: string | null
          stable_key?: string | null
          syllabus_relevance?: number
          title: string
          total_points?: number | null
          updated_at?: string
          user_id: string
          year_label?: string | null
        }
        Update: {
          active?: boolean
          course_id?: string
          created_at?: string
          duration_minutes?: number | null
          exam_at?: string | null
          id?: string
          notes?: string | null
          official?: boolean
          solution_resource_id?: string | null
          source_resource_id?: string | null
          stable_key?: string | null
          syllabus_relevance?: number
          title?: string
          total_points?: number | null
          updated_at?: string
          user_id?: string
          year_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_exams_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_activation_course_status"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_exams_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_baseline_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_exams_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_configuration"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_exams_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_operating_mode"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_exams_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_progress"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_exams_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_risk"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_exams_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_courses"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_exams_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_intelligence_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_exams_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_strategy"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_exams_resource_owner_fk"
            columns: ["source_resource_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_resources"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_exams_solution_resource_fk"
            columns: ["solution_resource_id"]
            isOneToOne: false
            referencedRelation: "study_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      study_ingestion_runs: {
        Row: {
          candidate_at: string | null
          candidate_payload: Json | null
          course_id: string
          created_at: string
          decided_at: string | null
          failure_detail: string | null
          id: string
          processor: string | null
          processor_version: string | null
          resource_id: string
          status: string
          updated_at: string
          user_id: string
          validation_issues: Json
        }
        Insert: {
          candidate_at?: string | null
          candidate_payload?: Json | null
          course_id: string
          created_at?: string
          decided_at?: string | null
          failure_detail?: string | null
          id?: string
          processor?: string | null
          processor_version?: string | null
          resource_id: string
          status?: string
          updated_at?: string
          user_id: string
          validation_issues?: Json
        }
        Update: {
          candidate_at?: string | null
          candidate_payload?: Json | null
          course_id?: string
          created_at?: string
          decided_at?: string | null
          failure_detail?: string | null
          id?: string
          processor?: string | null
          processor_version?: string | null
          resource_id?: string
          status?: string
          updated_at?: string
          user_id?: string
          validation_issues?: Json
        }
        Relationships: [
          {
            foreignKeyName: "study_ingestion_runs_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_activation_course_status"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_ingestion_runs_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_baseline_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_ingestion_runs_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_configuration"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_ingestion_runs_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_operating_mode"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_ingestion_runs_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_progress"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_ingestion_runs_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_risk"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_ingestion_runs_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_courses"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_ingestion_runs_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_intelligence_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_ingestion_runs_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_strategy"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_ingestion_runs_resource_owner_fk"
            columns: ["resource_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_resources"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      study_intake_items: {
        Row: {
          classification_confidence: number | null
          course_id: string | null
          created_at: string
          detected_resource_type:
            | Database["public"]["Enums"]["study_resource_type"]
            | null
          detected_week_no: number | null
          drive_created_at: string | null
          drive_file_id: string
          drive_modified_at: string | null
          drive_url: string | null
          first_seen_at: string
          id: string
          ingestion_run_id: string | null
          last_seen_at: string
          mime_type: string | null
          note: string | null
          parent_folder_id: string | null
          processed_at: string | null
          resource_id: string | null
          semester_id: string
          size_bytes: number | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          classification_confidence?: number | null
          course_id?: string | null
          created_at?: string
          detected_resource_type?:
            | Database["public"]["Enums"]["study_resource_type"]
            | null
          detected_week_no?: number | null
          drive_created_at?: string | null
          drive_file_id: string
          drive_modified_at?: string | null
          drive_url?: string | null
          first_seen_at?: string
          id?: string
          ingestion_run_id?: string | null
          last_seen_at?: string
          mime_type?: string | null
          note?: string | null
          parent_folder_id?: string | null
          processed_at?: string | null
          resource_id?: string | null
          semester_id: string
          size_bytes?: number | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          classification_confidence?: number | null
          course_id?: string | null
          created_at?: string
          detected_resource_type?:
            | Database["public"]["Enums"]["study_resource_type"]
            | null
          detected_week_no?: number | null
          drive_created_at?: string | null
          drive_file_id?: string
          drive_modified_at?: string | null
          drive_url?: string | null
          first_seen_at?: string
          id?: string
          ingestion_run_id?: string | null
          last_seen_at?: string
          mime_type?: string | null
          note?: string | null
          parent_folder_id?: string | null
          processed_at?: string | null
          resource_id?: string | null
          semester_id?: string
          size_bytes?: number | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_intake_items_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_activation_course_status"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_intake_items_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_baseline_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_intake_items_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_configuration"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_intake_items_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_operating_mode"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_intake_items_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_progress"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_intake_items_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_risk"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_intake_items_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_courses"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_intake_items_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_intelligence_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_intake_items_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_strategy"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_intake_items_resource_owner_fk"
            columns: ["resource_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_resources"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_intake_items_run_owner_fk"
            columns: ["ingestion_run_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_ingestion_runs"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_intake_items_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_activation_snapshot"
            referencedColumns: ["semester_id", "user_id"]
          },
          {
            foreignKeyName: "study_intake_items_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_current_capacity"
            referencedColumns: ["semester_id", "user_id"]
          },
          {
            foreignKeyName: "study_intake_items_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_semester_checkpoint_rotation"
            referencedColumns: ["semester_id", "user_id"]
          },
          {
            foreignKeyName: "study_intake_items_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_semesters"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      study_planning_settings: {
        Row: {
          created_at: string
          default_mode: Database["public"]["Enums"]["study_capacity_mode"]
          intensive_budget_minutes: number
          light_budget_minutes: number
          light_review_budget_minutes: number
          max_focus_items: number
          normal_budget_minutes: number
          recovery_budget_minutes: number
          recovery_max_focus_items: number
          recovery_review_budget_minutes: number
          semester_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_mode?: Database["public"]["Enums"]["study_capacity_mode"]
          intensive_budget_minutes?: number
          light_budget_minutes?: number
          light_review_budget_minutes?: number
          max_focus_items?: number
          normal_budget_minutes?: number
          recovery_budget_minutes?: number
          recovery_max_focus_items?: number
          recovery_review_budget_minutes?: number
          semester_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_mode?: Database["public"]["Enums"]["study_capacity_mode"]
          intensive_budget_minutes?: number
          light_budget_minutes?: number
          light_review_budget_minutes?: number
          max_focus_items?: number
          normal_budget_minutes?: number
          recovery_budget_minutes?: number
          recovery_max_focus_items?: number
          recovery_review_budget_minutes?: number
          semester_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_planning_settings_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "study_activation_snapshot"
            referencedColumns: ["semester_id"]
          },
          {
            foreignKeyName: "study_planning_settings_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "study_current_capacity"
            referencedColumns: ["semester_id"]
          },
          {
            foreignKeyName: "study_planning_settings_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "study_semester_checkpoint_rotation"
            referencedColumns: ["semester_id"]
          },
          {
            foreignKeyName: "study_planning_settings_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "study_semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      study_question_sources: {
        Row: {
          created_at: string
          id: string
          page_end: number | null
          page_start: number | null
          question_id: string
          resource_id: string
          section_label: string | null
          source_role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          page_end?: number | null
          page_start?: number | null
          question_id: string
          resource_id: string
          section_label?: string | null
          source_role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          page_end?: number | null
          page_start?: number | null
          question_id?: string
          resource_id?: string
          section_label?: string | null
          source_role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_question_sources_question_owner_fk"
            columns: ["question_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_questions"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_question_sources_resource_owner_fk"
            columns: ["resource_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_resources"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      study_questions: {
        Row: {
          active: boolean
          answer_key_or_rubric: string | null
          course_id: string
          created_at: string
          difficulty: number
          evidence_dimension: Database["public"]["Enums"]["study_evidence_dimension"]
          expected_minutes: number
          hint_1: string | null
          hint_2: string | null
          id: string
          ingestion_run_id: string | null
          origin: Database["public"]["Enums"]["study_question_origin"]
          primary_skill_id: string
          prompt: string
          question_type: Database["public"]["Enums"]["study_question_type"]
          source_confidence: number | null
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          active?: boolean
          answer_key_or_rubric?: string | null
          course_id: string
          created_at?: string
          difficulty?: number
          evidence_dimension: Database["public"]["Enums"]["study_evidence_dimension"]
          expected_minutes?: number
          hint_1?: string | null
          hint_2?: string | null
          id?: string
          ingestion_run_id?: string | null
          origin?: Database["public"]["Enums"]["study_question_origin"]
          primary_skill_id: string
          prompt: string
          question_type: Database["public"]["Enums"]["study_question_type"]
          source_confidence?: number | null
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          active?: boolean
          answer_key_or_rubric?: string | null
          course_id?: string
          created_at?: string
          difficulty?: number
          evidence_dimension?: Database["public"]["Enums"]["study_evidence_dimension"]
          expected_minutes?: number
          hint_1?: string | null
          hint_2?: string | null
          id?: string
          ingestion_run_id?: string | null
          origin?: Database["public"]["Enums"]["study_question_origin"]
          primary_skill_id?: string
          prompt?: string
          question_type?: Database["public"]["Enums"]["study_question_type"]
          source_confidence?: number | null
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "study_questions_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_activation_course_status"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_questions_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_baseline_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_questions_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_configuration"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_questions_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_operating_mode"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_questions_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_progress"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_questions_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_risk"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_questions_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_courses"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_questions_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_intelligence_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_questions_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_strategy"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_questions_ingestion_run_owner_fk"
            columns: ["ingestion_run_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_ingestion_runs"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_questions_skill_owner_fk"
            columns: ["primary_skill_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_skill_retention_diagnostics"
            referencedColumns: ["skill_id", "user_id"]
          },
          {
            foreignKeyName: "study_questions_skill_owner_fk"
            columns: ["primary_skill_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_skills"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      study_reconciliation_findings: {
        Row: {
          course_id: string
          created_at: string
          detail: string | null
          error_type: Database["public"]["Enums"]["study_error_type"] | null
          exercise_resource_id: string | null
          id: string
          repair_scheduled_at: string | null
          resolution_note: string | null
          resolved_at: string | null
          severity: number
          skill_id: string | null
          solution_resource_id: string | null
          status: string
          teaching_week_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          detail?: string | null
          error_type?: Database["public"]["Enums"]["study_error_type"] | null
          exercise_resource_id?: string | null
          id?: string
          repair_scheduled_at?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          severity?: number
          skill_id?: string | null
          solution_resource_id?: string | null
          status?: string
          teaching_week_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          detail?: string | null
          error_type?: Database["public"]["Enums"]["study_error_type"] | null
          exercise_resource_id?: string | null
          id?: string
          repair_scheduled_at?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          severity?: number
          skill_id?: string | null
          solution_resource_id?: string | null
          status?: string
          teaching_week_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_reconciliation_findings_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_activation_course_status"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_reconciliation_findings_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_baseline_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_reconciliation_findings_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_configuration"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_reconciliation_findings_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_operating_mode"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_reconciliation_findings_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_progress"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_reconciliation_findings_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_risk"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_reconciliation_findings_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_courses"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_reconciliation_findings_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_intelligence_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_reconciliation_findings_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_strategy"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_reconciliation_findings_exercise_owner_fk"
            columns: ["exercise_resource_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_resources"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_reconciliation_findings_skill_owner_fk"
            columns: ["skill_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_skill_retention_diagnostics"
            referencedColumns: ["skill_id", "user_id"]
          },
          {
            foreignKeyName: "study_reconciliation_findings_skill_owner_fk"
            columns: ["skill_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_skills"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_reconciliation_findings_solution_owner_fk"
            columns: ["solution_resource_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_resources"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_reconciliation_findings_week_owner_fk"
            columns: ["teaching_week_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_teaching_weeks"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_reconciliation_findings_week_owner_fk"
            columns: ["teaching_week_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_week_actions"
            referencedColumns: ["teaching_week_id", "user_id"]
          },
          {
            foreignKeyName: "study_reconciliation_findings_week_owner_fk"
            columns: ["teaching_week_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_weekly_health"
            referencedColumns: ["teaching_week_id", "user_id"]
          },
        ]
      }
      study_resource_skills: {
        Row: {
          confidence: number | null
          created_at: string
          id: string
          page_end: number | null
          page_start: number | null
          relation_type: string
          resource_id: string
          section_label: string | null
          skill_id: string
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          id?: string
          page_end?: number | null
          page_start?: number | null
          relation_type?: string
          resource_id: string
          section_label?: string | null
          skill_id: string
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          id?: string
          page_end?: number | null
          page_start?: number | null
          relation_type?: string
          resource_id?: string
          section_label?: string | null
          skill_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_resource_skills_resource_owner_fk"
            columns: ["resource_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_resources"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_resource_skills_skill_owner_fk"
            columns: ["skill_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_skill_retention_diagnostics"
            referencedColumns: ["skill_id", "user_id"]
          },
          {
            foreignKeyName: "study_resource_skills_skill_owner_fk"
            columns: ["skill_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_skills"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      study_resource_versions: {
        Row: {
          content_sha256: string | null
          created_at: string
          drive_file_id: string | null
          drive_url: string | null
          filename: string | null
          id: string
          is_canonical: boolean
          published_at: string | null
          resource_id: string
          user_id: string
          version_no: number
        }
        Insert: {
          content_sha256?: string | null
          created_at?: string
          drive_file_id?: string | null
          drive_url?: string | null
          filename?: string | null
          id?: string
          is_canonical?: boolean
          published_at?: string | null
          resource_id: string
          user_id: string
          version_no: number
        }
        Update: {
          content_sha256?: string | null
          created_at?: string
          drive_file_id?: string | null
          drive_url?: string | null
          filename?: string | null
          id?: string
          is_canonical?: boolean
          published_at?: string | null
          resource_id?: string
          user_id?: string
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "study_resource_versions_resource_owner_fk"
            columns: ["resource_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_resources"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      study_resources: {
        Row: {
          active: boolean
          canonical_filename: string | null
          content_sha256: string | null
          course_id: string
          created_at: string
          drive_file_id: string | null
          drive_url: string | null
          extraction_confidence: number | null
          id: string
          logical_key: string | null
          mime_type: string | null
          official_number: string | null
          original_filename: string | null
          processed_at: string | null
          processing_status: Database["public"]["Enums"]["study_processing_status"]
          published_at: string | null
          resource_type: Database["public"]["Enums"]["study_resource_type"]
          source_authority: Database["public"]["Enums"]["study_source_authority"]
          teaching_week_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          canonical_filename?: string | null
          content_sha256?: string | null
          course_id: string
          created_at?: string
          drive_file_id?: string | null
          drive_url?: string | null
          extraction_confidence?: number | null
          id?: string
          logical_key?: string | null
          mime_type?: string | null
          official_number?: string | null
          original_filename?: string | null
          processed_at?: string | null
          processing_status?: Database["public"]["Enums"]["study_processing_status"]
          published_at?: string | null
          resource_type: Database["public"]["Enums"]["study_resource_type"]
          source_authority?: Database["public"]["Enums"]["study_source_authority"]
          teaching_week_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          canonical_filename?: string | null
          content_sha256?: string | null
          course_id?: string
          created_at?: string
          drive_file_id?: string | null
          drive_url?: string | null
          extraction_confidence?: number | null
          id?: string
          logical_key?: string | null
          mime_type?: string | null
          official_number?: string | null
          original_filename?: string | null
          processed_at?: string | null
          processing_status?: Database["public"]["Enums"]["study_processing_status"]
          published_at?: string | null
          resource_type?: Database["public"]["Enums"]["study_resource_type"]
          source_authority?: Database["public"]["Enums"]["study_source_authority"]
          teaching_week_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_resources_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_activation_course_status"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_resources_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_baseline_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_resources_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_configuration"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_resources_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_operating_mode"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_resources_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_progress"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_resources_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_risk"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_resources_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_courses"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_resources_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_intelligence_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_resources_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_strategy"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_resources_week_owner_fk"
            columns: ["teaching_week_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_teaching_weeks"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_resources_week_owner_fk"
            columns: ["teaching_week_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_week_actions"
            referencedColumns: ["teaching_week_id", "user_id"]
          },
          {
            foreignKeyName: "study_resources_week_owner_fk"
            columns: ["teaching_week_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_weekly_health"
            referencedColumns: ["teaching_week_id", "user_id"]
          },
        ]
      }
      study_review_state: {
        Row: {
          consecutive_failures: number
          consecutive_successes: number
          course_id: string
          created_at: string
          delayed_successes: number
          due_reason: string
          exam_evidence: number
          execution_evidence: number
          independent_successes: number
          lapse_count: number
          last_attempt_at: string | null
          last_independent_success_at: string | null
          mastery_state: Database["public"]["Enums"]["study_mastery_state"]
          next_review_at: string
          recall_evidence: number
          recognition_evidence: number
          relearning_until: string | null
          skill_id: string
          solution_exposed_at: string | null
          stability_days: number
          total_attempts: number
          transfer_evidence: number
          updated_at: string
          user_id: string
        }
        Insert: {
          consecutive_failures?: number
          consecutive_successes?: number
          course_id: string
          created_at?: string
          delayed_successes?: number
          due_reason?: string
          exam_evidence?: number
          execution_evidence?: number
          independent_successes?: number
          lapse_count?: number
          last_attempt_at?: string | null
          last_independent_success_at?: string | null
          mastery_state?: Database["public"]["Enums"]["study_mastery_state"]
          next_review_at?: string
          recall_evidence?: number
          recognition_evidence?: number
          relearning_until?: string | null
          skill_id: string
          solution_exposed_at?: string | null
          stability_days?: number
          total_attempts?: number
          transfer_evidence?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          consecutive_failures?: number
          consecutive_successes?: number
          course_id?: string
          created_at?: string
          delayed_successes?: number
          due_reason?: string
          exam_evidence?: number
          execution_evidence?: number
          independent_successes?: number
          lapse_count?: number
          last_attempt_at?: string | null
          last_independent_success_at?: string | null
          mastery_state?: Database["public"]["Enums"]["study_mastery_state"]
          next_review_at?: string
          recall_evidence?: number
          recognition_evidence?: number
          relearning_until?: string | null
          skill_id?: string
          solution_exposed_at?: string | null
          stability_days?: number
          total_attempts?: number
          transfer_evidence?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_review_state_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_activation_course_status"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_review_state_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_baseline_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_review_state_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_configuration"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_review_state_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_operating_mode"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_review_state_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_progress"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_review_state_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_risk"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_review_state_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_courses"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_review_state_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_intelligence_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_review_state_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_strategy"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_review_state_skill_owner_fk"
            columns: ["skill_id", "user_id"]
            isOneToOne: true
            referencedRelation: "study_skill_retention_diagnostics"
            referencedColumns: ["skill_id", "user_id"]
          },
          {
            foreignKeyName: "study_review_state_skill_owner_fk"
            columns: ["skill_id", "user_id"]
            isOneToOne: true
            referencedRelation: "study_skills"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      study_scheduled_blocks: {
        Row: {
          calendar_id: string
          cancelled_at: string | null
          candidate_id: string
          candidate_kind: string
          completed_at: string | null
          course_id: string | null
          created_at: string
          end_at: string
          event_id: string
          event_url: string | null
          id: string
          plan_date: string
          reminder_minutes: number
          scheduled_minutes: number
          semester_id: string
          start_at: string
          status: Database["public"]["Enums"]["study_scheduled_block_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          calendar_id: string
          cancelled_at?: string | null
          candidate_id: string
          candidate_kind: string
          completed_at?: string | null
          course_id?: string | null
          created_at?: string
          end_at: string
          event_id: string
          event_url?: string | null
          id?: string
          plan_date: string
          reminder_minutes?: number
          scheduled_minutes: number
          semester_id: string
          start_at: string
          status?: Database["public"]["Enums"]["study_scheduled_block_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          calendar_id?: string
          cancelled_at?: string | null
          candidate_id?: string
          candidate_kind?: string
          completed_at?: string | null
          course_id?: string | null
          created_at?: string
          end_at?: string
          event_id?: string
          event_url?: string | null
          id?: string
          plan_date?: string
          reminder_minutes?: number
          scheduled_minutes?: number
          semester_id?: string
          start_at?: string
          status?: Database["public"]["Enums"]["study_scheduled_block_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_scheduled_blocks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_activation_course_status"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_scheduled_blocks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_baseline_summary"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_scheduled_blocks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_course_configuration"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_scheduled_blocks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_course_operating_mode"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_scheduled_blocks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_course_progress"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_scheduled_blocks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_course_risk"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_scheduled_blocks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_scheduled_blocks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_exam_intelligence_summary"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_scheduled_blocks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_exam_strategy"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_scheduled_blocks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_semester_checkpoint_rotation"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_scheduled_blocks_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "study_activation_snapshot"
            referencedColumns: ["semester_id"]
          },
          {
            foreignKeyName: "study_scheduled_blocks_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "study_current_capacity"
            referencedColumns: ["semester_id"]
          },
          {
            foreignKeyName: "study_scheduled_blocks_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "study_semester_checkpoint_rotation"
            referencedColumns: ["semester_id"]
          },
          {
            foreignKeyName: "study_scheduled_blocks_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "study_semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      study_semesters: {
        Row: {
          active: boolean
          created_at: string
          display_name: string
          drive_inbox_folder_id: string | null
          drive_inbox_folder_url: string | null
          drive_last_scan_at: string | null
          drive_last_scan_note: string | null
          drive_last_scan_status: string | null
          drive_root_folder_id: string | null
          drive_root_folder_url: string | null
          ends_on: string | null
          id: string
          review_daily_budget_minutes: number
          stable_key: string
          starts_on: string | null
          timezone: string
          updated_at: string
          user_id: string
          weekly_checkpoint_minutes: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_name: string
          drive_inbox_folder_id?: string | null
          drive_inbox_folder_url?: string | null
          drive_last_scan_at?: string | null
          drive_last_scan_note?: string | null
          drive_last_scan_status?: string | null
          drive_root_folder_id?: string | null
          drive_root_folder_url?: string | null
          ends_on?: string | null
          id?: string
          review_daily_budget_minutes?: number
          stable_key: string
          starts_on?: string | null
          timezone?: string
          updated_at?: string
          user_id: string
          weekly_checkpoint_minutes?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          display_name?: string
          drive_inbox_folder_id?: string | null
          drive_inbox_folder_url?: string | null
          drive_last_scan_at?: string | null
          drive_last_scan_note?: string | null
          drive_last_scan_status?: string | null
          drive_root_folder_id?: string | null
          drive_root_folder_url?: string | null
          ends_on?: string | null
          id?: string
          review_daily_budget_minutes?: number
          stable_key?: string
          starts_on?: string | null
          timezone?: string
          updated_at?: string
          user_id?: string
          weekly_checkpoint_minutes?: number
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          actual_minutes: number | null
          course_id: string | null
          created_at: string
          ended_at: string | null
          id: string
          note: string | null
          planned_minutes: number | null
          session_type: Database["public"]["Enums"]["study_session_type"]
          started_at: string
          user_id: string
        }
        Insert: {
          actual_minutes?: number | null
          course_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          note?: string | null
          planned_minutes?: number | null
          session_type: Database["public"]["Enums"]["study_session_type"]
          started_at?: string
          user_id: string
        }
        Update: {
          actual_minutes?: number | null
          course_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          note?: string | null
          planned_minutes?: number | null
          session_type?: Database["public"]["Enums"]["study_session_type"]
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_activation_course_status"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_sessions_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_baseline_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_sessions_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_configuration"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_sessions_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_operating_mode"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_sessions_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_progress"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_sessions_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_risk"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_sessions_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_courses"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_sessions_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_intelligence_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_sessions_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_strategy"
            referencedColumns: ["course_id", "user_id"]
          },
        ]
      }
      study_skills: {
        Row: {
          active: boolean
          course_id: string
          created_at: string
          description: string | null
          exam_importance: number
          id: string
          prerequisite_importance: number
          required_dimensions: Database["public"]["Enums"]["study_evidence_dimension"][]
          skill_kind: Database["public"]["Enums"]["study_skill_kind"]
          stable_key: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          course_id: string
          created_at?: string
          description?: string | null
          exam_importance?: number
          id?: string
          prerequisite_importance?: number
          required_dimensions?: Database["public"]["Enums"]["study_evidence_dimension"][]
          skill_kind?: Database["public"]["Enums"]["study_skill_kind"]
          stable_key?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          course_id?: string
          created_at?: string
          description?: string | null
          exam_importance?: number
          id?: string
          prerequisite_importance?: number
          required_dimensions?: Database["public"]["Enums"]["study_evidence_dimension"][]
          skill_kind?: Database["public"]["Enums"]["study_skill_kind"]
          stable_key?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_skills_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_activation_course_status"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_skills_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_baseline_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_skills_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_configuration"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_skills_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_operating_mode"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_skills_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_progress"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_skills_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_risk"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_skills_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_courses"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_skills_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_intelligence_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_skills_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_strategy"
            referencedColumns: ["course_id", "user_id"]
          },
        ]
      }
      study_teaching_weeks: {
        Row: {
          course_id: string
          created_at: string
          ends_on: string | null
          id: string
          note: string | null
          starts_on: string | null
          status: Database["public"]["Enums"]["study_week_status"]
          updated_at: string
          user_id: string
          week_no: number
        }
        Insert: {
          course_id: string
          created_at?: string
          ends_on?: string | null
          id?: string
          note?: string | null
          starts_on?: string | null
          status?: Database["public"]["Enums"]["study_week_status"]
          updated_at?: string
          user_id: string
          week_no: number
        }
        Update: {
          course_id?: string
          created_at?: string
          ends_on?: string | null
          id?: string
          note?: string | null
          starts_on?: string | null
          status?: Database["public"]["Enums"]["study_week_status"]
          updated_at?: string
          user_id?: string
          week_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "study_weeks_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_activation_course_status"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_weeks_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_baseline_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_weeks_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_configuration"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_weeks_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_operating_mode"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_weeks_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_progress"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_weeks_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_risk"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_weeks_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_courses"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_weeks_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_intelligence_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_weeks_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_strategy"
            referencedColumns: ["course_id", "user_id"]
          },
        ]
      }
      study_topic_skills: {
        Row: {
          created_at: string
          is_primary: boolean
          skill_id: string
          topic_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          is_primary?: boolean
          skill_id: string
          topic_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          is_primary?: boolean
          skill_id?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_topic_skills_skill_owner_fk"
            columns: ["skill_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_skill_retention_diagnostics"
            referencedColumns: ["skill_id", "user_id"]
          },
          {
            foreignKeyName: "study_topic_skills_skill_owner_fk"
            columns: ["skill_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_skills"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_topic_skills_topic_owner_fk"
            columns: ["topic_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_topics"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      study_topics: {
        Row: {
          active: boolean
          course_id: string
          created_at: string
          description: string | null
          first_week_no: number | null
          id: string
          stable_key: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          course_id: string
          created_at?: string
          description?: string | null
          first_week_no?: number | null
          id?: string
          stable_key?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          course_id?: string
          created_at?: string
          description?: string | null
          first_week_no?: number | null
          id?: string
          stable_key?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_topics_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_activation_course_status"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_topics_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_baseline_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_topics_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_configuration"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_topics_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_operating_mode"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_topics_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_progress"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_topics_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_risk"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_topics_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_courses"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_topics_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_intelligence_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_topics_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_strategy"
            referencedColumns: ["course_id", "user_id"]
          },
        ]
      }
      study_week_allocations: {
        Row: {
          action_authority: string
          action_href: string
          action_title: string
          course_id: string
          created_at: string
          original_minutes: number
          plan_id: string
          protection_floor_minutes: number
          snapshot_decision_priority: number | null
          snapshot_readiness_index: number | null
          target_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          action_authority: string
          action_href: string
          action_title: string
          course_id: string
          created_at?: string
          original_minutes: number
          plan_id: string
          protection_floor_minutes?: number
          snapshot_decision_priority?: number | null
          snapshot_readiness_index?: number | null
          target_minutes: number
          updated_at?: string
          user_id: string
        }
        Update: {
          action_authority?: string
          action_href?: string
          action_title?: string
          course_id?: string
          created_at?: string
          original_minutes?: number
          plan_id?: string
          protection_floor_minutes?: number
          snapshot_decision_priority?: number | null
          snapshot_readiness_index?: number | null
          target_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_week_allocations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_activation_course_status"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_week_allocations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_baseline_summary"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_week_allocations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_course_configuration"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_week_allocations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_course_operating_mode"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_week_allocations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_course_progress"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_week_allocations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_course_risk"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_week_allocations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_week_allocations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_exam_intelligence_summary"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_week_allocations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_exam_strategy"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_week_allocations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "study_semester_checkpoint_rotation"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_week_allocations_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "study_week_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      study_week_plans: {
        Row: {
          capacity_source: string
          committed_at: string
          course_budget_minutes: number
          created_at: string
          id: string
          last_rebalance_reason: string | null
          last_rebalanced_at: string | null
          mandatory_reserve_minutes: number
          objective: string
          period_ends_on: string
          period_starts_on: string
          retention_reserve_minutes: number
          revision: number
          scenario_snapshot: Json
          semester_id: string
          status: string
          updated_at: string
          user_id: string
          weekly_capacity_minutes: number
        }
        Insert: {
          capacity_source: string
          committed_at?: string
          course_budget_minutes?: number
          created_at?: string
          id?: string
          last_rebalance_reason?: string | null
          last_rebalanced_at?: string | null
          mandatory_reserve_minutes?: number
          objective: string
          period_ends_on: string
          period_starts_on: string
          retention_reserve_minutes?: number
          revision?: number
          scenario_snapshot?: Json
          semester_id: string
          status?: string
          updated_at?: string
          user_id: string
          weekly_capacity_minutes: number
        }
        Update: {
          capacity_source?: string
          committed_at?: string
          course_budget_minutes?: number
          created_at?: string
          id?: string
          last_rebalance_reason?: string | null
          last_rebalanced_at?: string | null
          mandatory_reserve_minutes?: number
          objective?: string
          period_ends_on?: string
          period_starts_on?: string
          retention_reserve_minutes?: number
          revision?: number
          scenario_snapshot?: Json
          semester_id?: string
          status?: string
          updated_at?: string
          user_id?: string
          weekly_capacity_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "study_week_plans_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "study_activation_snapshot"
            referencedColumns: ["semester_id"]
          },
          {
            foreignKeyName: "study_week_plans_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "study_current_capacity"
            referencedColumns: ["semester_id"]
          },
          {
            foreignKeyName: "study_week_plans_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "study_semester_checkpoint_rotation"
            referencedColumns: ["semester_id"]
          },
          {
            foreignKeyName: "study_week_plans_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "study_semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      study_week_workflow: {
        Row: {
          checkpoint_completed_at: string | null
          checkpoint_note: string | null
          checkpoint_skill_count_at_completion: number
          course_id: string
          created_at: string
          exercise_attempt_completed_at: string | null
          exercise_attempt_note: string | null
          exercise_resource_count_at_attempt: number
          lecture_resource_count_at_retrieval: number
          lecture_retrieval_completed_at: string | null
          lecture_retrieval_note: string | null
          solution_reconcile_note: string | null
          solution_reconciled_at: string | null
          solution_resource_count_at_reconcile: number
          teaching_week_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          checkpoint_completed_at?: string | null
          checkpoint_note?: string | null
          checkpoint_skill_count_at_completion?: number
          course_id: string
          created_at?: string
          exercise_attempt_completed_at?: string | null
          exercise_attempt_note?: string | null
          exercise_resource_count_at_attempt?: number
          lecture_resource_count_at_retrieval?: number
          lecture_retrieval_completed_at?: string | null
          lecture_retrieval_note?: string | null
          solution_reconcile_note?: string | null
          solution_reconciled_at?: string | null
          solution_resource_count_at_reconcile?: number
          teaching_week_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          checkpoint_completed_at?: string | null
          checkpoint_note?: string | null
          checkpoint_skill_count_at_completion?: number
          course_id?: string
          created_at?: string
          exercise_attempt_completed_at?: string | null
          exercise_attempt_note?: string | null
          exercise_resource_count_at_attempt?: number
          lecture_resource_count_at_retrieval?: number
          lecture_retrieval_completed_at?: string | null
          lecture_retrieval_note?: string | null
          solution_reconcile_note?: string | null
          solution_reconciled_at?: string | null
          solution_resource_count_at_reconcile?: number
          teaching_week_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_week_workflow_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_activation_course_status"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_week_workflow_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_baseline_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_week_workflow_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_configuration"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_week_workflow_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_operating_mode"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_week_workflow_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_progress"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_week_workflow_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_risk"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_week_workflow_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_courses"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_week_workflow_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_intelligence_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_week_workflow_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_strategy"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_week_workflow_week_owner_fk"
            columns: ["teaching_week_id", "user_id"]
            isOneToOne: true
            referencedRelation: "study_teaching_weeks"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_week_workflow_week_owner_fk"
            columns: ["teaching_week_id", "user_id"]
            isOneToOne: true
            referencedRelation: "study_week_actions"
            referencedColumns: ["teaching_week_id", "user_id"]
          },
          {
            foreignKeyName: "study_week_workflow_week_owner_fk"
            columns: ["teaching_week_id", "user_id"]
            isOneToOne: true
            referencedRelation: "study_weekly_health"
            referencedColumns: ["teaching_week_id", "user_id"]
          },
        ]
      }
      target_recommendations: {
        Row: {
          applied_phase_id: string | null
          avg_calories: number | null
          complete_days: number
          confidence_level: string | null
          confidence_score: number | null
          created_at: string
          current_target: number
          decision_payload: Json
          desired_weekly_weight_change: number | null
          effective_date: string | null
          engine_version: string | null
          estimated_maintenance: number | null
          generated_on: string
          id: string
          logged_days: number
          lookback_days: number
          rationale: string
          raw_recommended_target: number | null
          recommended_carbs: number | null
          recommended_fat: number | null
          recommended_protein: number | null
          recommended_target: number | null
          resolution: string | null
          resolved_at: string | null
          resolved_target: number | null
          status: string
          user_id: string
          weekly_weight_change: number | null
          weigh_in_count: number
        }
        Insert: {
          applied_phase_id?: string | null
          avg_calories?: number | null
          complete_days: number
          confidence_level?: string | null
          confidence_score?: number | null
          created_at?: string
          current_target: number
          decision_payload?: Json
          desired_weekly_weight_change?: number | null
          effective_date?: string | null
          engine_version?: string | null
          estimated_maintenance?: number | null
          generated_on?: string
          id?: string
          logged_days?: number
          lookback_days: number
          rationale: string
          raw_recommended_target?: number | null
          recommended_carbs?: number | null
          recommended_fat?: number | null
          recommended_protein?: number | null
          recommended_target?: number | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_target?: number | null
          status?: string
          user_id: string
          weekly_weight_change?: number | null
          weigh_in_count: number
        }
        Update: {
          applied_phase_id?: string | null
          avg_calories?: number | null
          complete_days?: number
          confidence_level?: string | null
          confidence_score?: number | null
          created_at?: string
          current_target?: number
          decision_payload?: Json
          desired_weekly_weight_change?: number | null
          effective_date?: string | null
          engine_version?: string | null
          estimated_maintenance?: number | null
          generated_on?: string
          id?: string
          logged_days?: number
          lookback_days?: number
          rationale?: string
          raw_recommended_target?: number | null
          recommended_carbs?: number | null
          recommended_fat?: number | null
          recommended_protein?: number | null
          recommended_target?: number | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_target?: number | null
          status?: string
          user_id?: string
          weekly_weight_change?: number | null
          weigh_in_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "target_recommendations_applied_phase_id_fkey"
            columns: ["applied_phase_id"]
            isOneToOne: false
            referencedRelation: "goal_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "target_recommendations_phase_owner_fkey_p14"
            columns: ["applied_phase_id", "user_id"]
            isOneToOne: false
            referencedRelation: "goal_phases"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      tms60_backups: {
        Row: {
          created_at: string
          device_id: string | null
          id: string
          source_revision: number
          state: Json
          state_hash: string | null
          state_schema: number
          translation_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          id?: string
          source_revision?: number
          state: Json
          state_hash?: string | null
          state_schema: number
          translation_id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          id?: string
          source_revision?: number
          state?: Json
          state_hash?: string | null
          state_schema?: number
          translation_id?: string
          user_id?: string
        }
        Relationships: []
      }
      tms60_sync_state: {
        Row: {
          client_updated_at: number
          created_at: string
          device_id: string | null
          revision: number
          state: Json
          state_hash: string | null
          state_schema: number
          translation_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_updated_at: number
          created_at?: string
          device_id?: string | null
          revision?: number
          state: Json
          state_hash?: string | null
          state_schema: number
          translation_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_updated_at?: number
          created_at?: string
          device_id?: string | null
          revision?: number
          state?: Json
          state_hash?: string | null
          state_schema?: number
          translation_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      training_days: {
        Row: {
          created_at: string
          day_type: string
          duration_minutes: number | null
          id: string
          notes: string | null
          source: string
          status: string
          title: string | null
          training_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_type: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          source?: string
          status?: string
          title?: string | null
          training_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_type?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          source?: string
          status?: string
          title?: string | null
          training_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      training_distribution_settings: {
        Row: {
          created_at: string
          enabled: boolean
          hard_extra_kcal: number
          light_extra_kcal: number
          moderate_extra_kcal: number
          updated_at: string
          user_id: string
          weekly_template: Json
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          hard_extra_kcal?: number
          light_extra_kcal?: number
          moderate_extra_kcal?: number
          updated_at?: string
          user_id: string
          weekly_template?: Json
        }
        Update: {
          created_at?: string
          enabled?: boolean
          hard_extra_kcal?: number
          light_extra_kcal?: number
          moderate_extra_kcal?: number
          updated_at?: string
          user_id?: string
          weekly_template?: Json
        }
        Relationships: []
      }
      weekly_reviews: {
        Row: {
          created_at: string
          id: string
          payload: Json
          user_id: string
          week_end: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload: Json
          user_id: string
          week_end: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          user_id?: string
          week_end?: string
        }
        Relationships: []
      }
      weight_entries: {
        Row: {
          created_at: string
          entry_date: string
          id: string
          notes: string | null
          updated_at: string
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          entry_date: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id: string
          weight: number
        }
        Update: {
          created_at?: string
          entry_date?: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      wordstrike_player_profiles: {
        Row: {
          data: Json
          revision: number
          updated_at: string
          user_id: string
        }
        Insert: {
          data: Json
          revision?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          data?: Json
          revision?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      study_activation_course_status: {
        Row: {
          attempt_count: number | null
          baseline_classified_count: number | null
          baseline_skill_count: number | null
          baseline_status:
            | Database["public"]["Enums"]["study_baseline_status"]
            | null
          course_id: string | null
          course_kind: Database["public"]["Enums"]["study_course_kind"] | null
          display_name: string | null
          drive_folder_ready: boolean | null
          exam_date_configured: boolean | null
          question_count: number | null
          resource_count: number | null
          semester_id: string | null
          short_name: string | null
          skill_count: number | null
          sort_order: number | null
          stable_key: string | null
          timetable_event_count: number | null
          topic_count: number | null
          user_id: string | null
          week1_resource_count: number | null
          week1_verified_resource_count: number | null
        }
        Insert: {
          attempt_count?: never
          baseline_classified_count?: never
          baseline_skill_count?: never
          baseline_status?: never
          course_id?: string | null
          course_kind?: Database["public"]["Enums"]["study_course_kind"] | null
          display_name?: string | null
          drive_folder_ready?: never
          exam_date_configured?: never
          question_count?: never
          resource_count?: never
          semester_id?: string | null
          short_name?: string | null
          skill_count?: never
          sort_order?: number | null
          stable_key?: string | null
          timetable_event_count?: never
          topic_count?: never
          user_id?: string | null
          week1_resource_count?: never
          week1_verified_resource_count?: never
        }
        Update: {
          attempt_count?: never
          baseline_classified_count?: never
          baseline_skill_count?: never
          baseline_status?: never
          course_id?: string | null
          course_kind?: Database["public"]["Enums"]["study_course_kind"] | null
          display_name?: string | null
          drive_folder_ready?: never
          exam_date_configured?: never
          question_count?: never
          resource_count?: never
          semester_id?: string | null
          short_name?: string | null
          skill_count?: never
          sort_order?: number | null
          stable_key?: string | null
          timetable_event_count?: never
          topic_count?: never
          user_id?: string | null
          week1_resource_count?: never
          week1_verified_resource_count?: never
        }
        Relationships: [
          {
            foreignKeyName: "study_courses_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_activation_snapshot"
            referencedColumns: ["semester_id", "user_id"]
          },
          {
            foreignKeyName: "study_courses_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_current_capacity"
            referencedColumns: ["semester_id", "user_id"]
          },
          {
            foreignKeyName: "study_courses_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_semester_checkpoint_rotation"
            referencedColumns: ["semester_id", "user_id"]
          },
          {
            foreignKeyName: "study_courses_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_semesters"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      study_activation_snapshot: {
        Row: {
          calendar_connected: boolean | null
          calendar_synced: boolean | null
          course_count: number | null
          drive_connected: boolean | null
          drive_tree_ready: boolean | null
          ends_on: string | null
          major_course_count: number | null
          majors_with_attempts: number | null
          majors_with_study_map: number | null
          majors_with_timetable: number | null
          majors_with_week1_material: number | null
          retake_baselines_completed: number | null
          retake_course_count: number | null
          semester_id: string | null
          stable_key: string | null
          starts_on: string | null
          timezone: string | null
          user_id: string | null
        }
        Insert: {
          calendar_connected?: never
          calendar_synced?: never
          course_count?: never
          drive_connected?: never
          drive_tree_ready?: never
          ends_on?: string | null
          major_course_count?: never
          majors_with_attempts?: never
          majors_with_study_map?: never
          majors_with_timetable?: never
          majors_with_week1_material?: never
          retake_baselines_completed?: never
          retake_course_count?: never
          semester_id?: string | null
          stable_key?: string | null
          starts_on?: string | null
          timezone?: string | null
          user_id?: string | null
        }
        Update: {
          calendar_connected?: never
          calendar_synced?: never
          course_count?: never
          drive_connected?: never
          drive_tree_ready?: never
          ends_on?: string | null
          major_course_count?: never
          majors_with_attempts?: never
          majors_with_study_map?: never
          majors_with_timetable?: never
          majors_with_week1_material?: never
          retake_baselines_completed?: never
          retake_course_count?: never
          semester_id?: string | null
          stable_key?: string | null
          starts_on?: string | null
          timezone?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      study_baseline_summary: {
        Row: {
          classified_count: number | null
          completed_at: string | null
          course_id: string | null
          display_name: string | null
          never_mastered_count: number | null
          retained_count: number | null
          rusty_count: number | null
          semester_id: string | null
          short_name: string | null
          skill_count: number | null
          stable_key: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["study_baseline_status"] | null
          user_id: string | null
          weak_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "study_courses_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_activation_snapshot"
            referencedColumns: ["semester_id", "user_id"]
          },
          {
            foreignKeyName: "study_courses_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_current_capacity"
            referencedColumns: ["semester_id", "user_id"]
          },
          {
            foreignKeyName: "study_courses_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_semester_checkpoint_rotation"
            referencedColumns: ["semester_id", "user_id"]
          },
          {
            foreignKeyName: "study_courses_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_semesters"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      study_course_configuration: {
        Row: {
          active: boolean | null
          checkpoint_budget_minutes: number | null
          checkpoint_weight: number | null
          course_id: string | null
          course_kind: Database["public"]["Enums"]["study_course_kind"] | null
          credits: number | null
          display_name: string | null
          drive_folder_url: string | null
          exam_at: string | null
          exam_duration_minutes: number | null
          exam_format: string | null
          exam_mode_lead_days: number | null
          expected_lectures_per_week: number | null
          expects_exercise: boolean | null
          expects_solution: boolean | null
          lecture_retrieval_target_hours: number | null
          professor: string | null
          semester_id: string | null
          short_name: string | null
          solution_reconcile_target_hours: number | null
          sort_order: number | null
          stable_key: string | null
          transition_lead_days: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_courses_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_activation_snapshot"
            referencedColumns: ["semester_id", "user_id"]
          },
          {
            foreignKeyName: "study_courses_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_current_capacity"
            referencedColumns: ["semester_id", "user_id"]
          },
          {
            foreignKeyName: "study_courses_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_semester_checkpoint_rotation"
            referencedColumns: ["semester_id", "user_id"]
          },
          {
            foreignKeyName: "study_courses_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_semesters"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      study_course_master_map: {
        Row: {
          course_id: string | null
          durable_percent: number | null
          exam_ready_skills: number | null
          first_week_no: number | null
          fragile_skills: number | null
          latest_source_week: number | null
          learning_skills: number | null
          new_skills: number | null
          semester_id: string | null
          skill_count: number | null
          skills: Json | null
          source_resource_count: number | null
          source_titles: string[] | null
          stable_skills: number | null
          topic_description: string | null
          topic_id: string | null
          topic_key: string | null
          topic_title: string | null
          unresolved_errors: number | null
          user_id: string | null
        }
        Relationships: []
      }
      study_course_operating_mode: {
        Row: {
          checkpoint_budget_minutes: number | null
          course_id: string | null
          course_kind: Database["public"]["Enums"]["study_course_kind"] | null
          days_to_exam: number | null
          display_name: string | null
          exam_at: string | null
          exam_mode_lead_days: number | null
          operating_mode: string | null
          recommended_mix: Json | null
          semester_id: string | null
          short_name: string | null
          stable_key: string | null
          transition_lead_days: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_courses_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_activation_snapshot"
            referencedColumns: ["semester_id", "user_id"]
          },
          {
            foreignKeyName: "study_courses_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_current_capacity"
            referencedColumns: ["semester_id", "user_id"]
          },
          {
            foreignKeyName: "study_courses_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_semester_checkpoint_rotation"
            referencedColumns: ["semester_id", "user_id"]
          },
          {
            foreignKeyName: "study_courses_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_semesters"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      study_course_progress: {
        Row: {
          course_id: string | null
          course_kind: Database["public"]["Enums"]["study_course_kind"] | null
          coverage_percent: number | null
          display_name: string | null
          durable_mastery_percent: number | null
          exam_at: string | null
          exam_ready_skills: number | null
          fragile_skills: number | null
          latest_week_no: number | null
          learning_skills: number | null
          new_skills: number | null
          semester_id: string | null
          short_name: string | null
          sort_order: number | null
          stable_key: string | null
          stable_skills: number | null
          total_skills: number | null
          unresolved_errors: number | null
          unverified_resources: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_courses_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_activation_snapshot"
            referencedColumns: ["semester_id", "user_id"]
          },
          {
            foreignKeyName: "study_courses_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_current_capacity"
            referencedColumns: ["semester_id", "user_id"]
          },
          {
            foreignKeyName: "study_courses_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_semester_checkpoint_rotation"
            referencedColumns: ["semester_id", "user_id"]
          },
          {
            foreignKeyName: "study_courses_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_semesters"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      study_course_retention_diagnostics: {
        Row: {
          attempts_28d: number | null
          avg_retention_pressure: number | null
          course_id: string | null
          due_or_at_risk_skills: number | null
          incorrect_28d: number | null
          independent_correct_28d: number | null
          independent_success_percent_28d: number | null
          overdue_7d_skills: number | null
          recent_lapse_skills: number | null
          relearning_skills: number | null
          semester_id: string | null
          tested_skills: number | null
          total_skills: number | null
          untested_skills: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_skills_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_activation_course_status"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_skills_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_baseline_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_skills_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_configuration"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_skills_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_operating_mode"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_skills_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_progress"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_skills_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_risk"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_skills_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_courses"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_skills_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_intelligence_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_skills_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_strategy"
            referencedColumns: ["course_id", "user_id"]
          },
        ]
      }
      study_course_risk: {
        Row: {
          actionable_backlog: number | null
          avg_retention_pressure: number | null
          course_id: string | null
          course_kind: Database["public"]["Enums"]["study_course_kind"] | null
          coverage_percent: number | null
          days_to_exam: number | null
          display_name: string | null
          due_or_at_risk_skills: number | null
          durable_mastery_percent: number | null
          error_component: number | null
          exam_component: number | null
          exam_ready_percent: number | null
          exam_ready_skills: number | null
          independent_success_percent_28d: number | null
          lapse_component: number | null
          operating_mode: string | null
          overdue_7d_skills: number | null
          overdue_component: number | null
          recent_lapse_skills: number | null
          recommended_mix: Json | null
          relearning_skills: number | null
          retention_component: number | null
          risk_band: string | null
          risk_components: Json | null
          risk_score: number | null
          semester_id: string | null
          short_name: string | null
          stable_key: string | null
          tested_skills: number | null
          total_skills: number | null
          unresolved_errors: number | null
          unverified_resources: number | null
          user_id: string | null
          workflow_component: number | null
        }
        Relationships: [
          {
            foreignKeyName: "study_courses_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_activation_snapshot"
            referencedColumns: ["semester_id", "user_id"]
          },
          {
            foreignKeyName: "study_courses_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_current_capacity"
            referencedColumns: ["semester_id", "user_id"]
          },
          {
            foreignKeyName: "study_courses_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_semester_checkpoint_rotation"
            referencedColumns: ["semester_id", "user_id"]
          },
          {
            foreignKeyName: "study_courses_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_semesters"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      study_current_capacity: {
        Row: {
          custom_budget_minutes: number | null
          daily_note: string | null
          effective_max_focus_items: number | null
          effective_review_budget_minutes: number | null
          intensive_budget_minutes: number | null
          light_budget_minutes: number | null
          light_review_budget_minutes: number | null
          local_today: string | null
          max_focus_items: number | null
          mode: Database["public"]["Enums"]["study_capacity_mode"] | null
          normal_budget_minutes: number | null
          recovery_budget_minutes: number | null
          recovery_max_focus_items: number | null
          recovery_review_budget_minutes: number | null
          review_daily_budget_minutes: number | null
          semester_id: string | null
          timezone: string | null
          total_budget_minutes: number | null
          user_id: string | null
        }
        Relationships: []
      }
      study_due_skills: {
        Row: {
          consecutive_failures: number | null
          course_id: string | null
          due_reason: string | null
          evidence_floor: number | null
          exam_evidence: number | null
          exam_factor: number | null
          exam_importance: number | null
          execution_evidence: number | null
          is_due: boolean | null
          lapse_count: number | null
          mastery_state:
            | Database["public"]["Enums"]["study_mastery_state"]
            | null
          min_question_minutes: number | null
          next_review_at: string | null
          overdue_days: number | null
          prerequisite_importance: number | null
          priority_score: number | null
          recall_evidence: number | null
          recognition_evidence: number | null
          relearning_until: string | null
          required_dimensions:
            | Database["public"]["Enums"]["study_evidence_dimension"][]
            | null
          semester_id: string | null
          skill_id: string | null
          skill_kind: Database["public"]["Enums"]["study_skill_kind"] | null
          skill_title: string | null
          transfer_evidence: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_review_state_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_activation_course_status"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_review_state_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_baseline_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_review_state_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_configuration"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_review_state_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_operating_mode"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_review_state_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_progress"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_review_state_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_risk"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_review_state_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_courses"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_review_state_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_intelligence_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_review_state_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_strategy"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_review_state_skill_owner_fk"
            columns: ["skill_id", "user_id"]
            isOneToOne: true
            referencedRelation: "study_skill_retention_diagnostics"
            referencedColumns: ["skill_id", "user_id"]
          },
          {
            foreignKeyName: "study_review_state_skill_owner_fk"
            columns: ["skill_id", "user_id"]
            isOneToOne: true
            referencedRelation: "study_skills"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      study_exam_blueprint: {
        Row: {
          active_exam_count: number | null
          avg_exam_importance: number | null
          certified_simulation_items: number | null
          certified_simulation_score_percent: number | null
          course_id: string | null
          durable_percent: number | null
          exam_ready_percent: number | null
          exam_ready_skills: number | null
          historical_confidence: string | null
          history_component: number | null
          observed_exam_count: number | null
          observed_question_count: number | null
          priority_score: number | null
          readiness_gap_component: number | null
          semester_id: string | null
          simulation_gap_component: number | null
          skill_count: number | null
          syllabus_importance_component: number | null
          topic_id: string | null
          topic_key: string | null
          topic_title: string | null
          unseen_in_past_exams: boolean | null
          user_id: string | null
          weighted_occurrence_percent: number | null
          weighted_points_share_percent: number | null
        }
        Relationships: []
      }
      study_exam_intelligence_summary: {
        Row: {
          blueprint_confidence: string | null
          course_id: string | null
          display_name: string | null
          effective_exam_weight: number | null
          exam_questions: number | null
          last_score_percent: number | null
          last_simulation_at: string | null
          last_simulation_exam_id: string | null
          last_simulation_id: string | null
          last_time_used_seconds: number | null
          last_verified_coverage_percent: number | null
          last_verified_score_percent: number | null
          processed_exams: number | null
          semester_id: string | null
          short_name: string | null
          simulatable_exams: number | null
          typical_duration_minutes: number | null
          typical_total_points: number | null
          user_id: string | null
          verified_solution_coverage_percent: number | null
        }
        Relationships: [
          {
            foreignKeyName: "study_courses_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_activation_snapshot"
            referencedColumns: ["semester_id", "user_id"]
          },
          {
            foreignKeyName: "study_courses_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_current_capacity"
            referencedColumns: ["semester_id", "user_id"]
          },
          {
            foreignKeyName: "study_courses_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_semester_checkpoint_rotation"
            referencedColumns: ["semester_id", "user_id"]
          },
          {
            foreignKeyName: "study_courses_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_semesters"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_exam_simulations_exam_id_fkey"
            columns: ["last_simulation_exam_id"]
            isOneToOne: false
            referencedRelation: "study_exam_paper_catalog"
            referencedColumns: ["exam_id"]
          },
          {
            foreignKeyName: "study_exam_simulations_exam_id_fkey"
            columns: ["last_simulation_exam_id"]
            isOneToOne: false
            referencedRelation: "study_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      study_exam_paper_catalog: {
        Row: {
          active: boolean | null
          course_id: string | null
          duration_minutes: number | null
          effective_weight: number | null
          exam_at: string | null
          exam_id: string | null
          incomplete_question_count: number | null
          mapped_question_count: number | null
          missing_answer_count: number | null
          notes: string | null
          official: boolean | null
          official_answer_count: number | null
          question_count: number | null
          question_points: number | null
          recency_weight: number | null
          simulatable: boolean | null
          solution_resource_id: string | null
          source_resource_id: string | null
          stable_key: string | null
          syllabus_relevance: number | null
          title: string | null
          total_points: number | null
          unverified_answer_count: number | null
          user_id: string | null
          verified_answer_count: number | null
          verified_solution_coverage_percent: number | null
          year_label: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_exams_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_activation_course_status"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_exams_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_baseline_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_exams_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_configuration"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_exams_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_operating_mode"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_exams_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_progress"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_exams_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_risk"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_exams_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_courses"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_exams_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_intelligence_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_exams_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_strategy"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_exams_resource_owner_fk"
            columns: ["source_resource_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_resources"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_exams_solution_resource_fk"
            columns: ["solution_resource_id"]
            isOneToOne: false
            referencedRelation: "study_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      study_exam_strategy: {
        Row: {
          blueprint_confidence: string | null
          course_id: string | null
          days_to_exam: number | null
          display_name: string | null
          effective_exam_weight: number | null
          exam_questions: number | null
          final_check_minutes: number | null
          first_pass_minutes: number | null
          last_score_percent: number | null
          last_simulation_at: string | null
          last_simulation_exam_id: string | null
          last_simulation_id: string | null
          last_time_used_seconds: number | null
          last_verified_coverage_percent: number | null
          last_verified_score_percent: number | null
          next_action: string | null
          next_action_reason: string | null
          operating_mode: string | null
          processed_exams: number | null
          recommended_mix: Json | null
          return_pass_minutes: number | null
          semester_id: string | null
          short_name: string | null
          simulatable_exams: number | null
          strategy_duration_minutes: number | null
          strategy_total_points: number | null
          topic_priorities: Json | null
          typical_duration_minutes: number | null
          typical_total_points: number | null
          user_id: string | null
          verified_solution_coverage_percent: number | null
          working_minutes_per_point: number | null
        }
        Relationships: [
          {
            foreignKeyName: "study_courses_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_activation_snapshot"
            referencedColumns: ["semester_id", "user_id"]
          },
          {
            foreignKeyName: "study_courses_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_current_capacity"
            referencedColumns: ["semester_id", "user_id"]
          },
          {
            foreignKeyName: "study_courses_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_semester_checkpoint_rotation"
            referencedColumns: ["semester_id", "user_id"]
          },
          {
            foreignKeyName: "study_courses_semester_owner_fk"
            columns: ["semester_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_semesters"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_exam_simulations_exam_id_fkey"
            columns: ["last_simulation_exam_id"]
            isOneToOne: false
            referencedRelation: "study_exam_paper_catalog"
            referencedColumns: ["exam_id"]
          },
          {
            foreignKeyName: "study_exam_simulations_exam_id_fkey"
            columns: ["last_simulation_exam_id"]
            isOneToOne: false
            referencedRelation: "study_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      study_semester_checkpoint_rotation: {
        Row: {
          budget_minutes: number | null
          completed: boolean | null
          course_id: string | null
          current_week_no: number | null
          display_name: string | null
          due: boolean | null
          eligible_skills: number | null
          semester_id: string | null
          short_name: string | null
          target_week_no: number | null
          user_id: string | null
          week_ends_on: string | null
          week_starts_on: string | null
        }
        Relationships: []
      }
      study_skill_retention_diagnostics: {
        Row: {
          attempts_28d: number | null
          consecutive_failures: number | null
          course_id: string | null
          days_since_last_attempt: number | null
          delayed_successes: number | null
          due_reason: string | null
          evidence_floor: number | null
          exam_evidence: number | null
          exam_importance: number | null
          execution_evidence: number | null
          first_week_no: number | null
          incorrect_28d: number | null
          independent_correct_28d: number | null
          independent_successes: number | null
          lapse_count: number | null
          last_attempt_at: string | null
          last_incorrect_at: string | null
          last_independent_success_at: string | null
          mastery_state:
            | Database["public"]["Enums"]["study_mastery_state"]
            | null
          next_review_at: string | null
          overdue_days: number | null
          prerequisite_importance: number | null
          recall_evidence: number | null
          recent_lapse: boolean | null
          recognition_evidence: number | null
          relearning: boolean | null
          relearning_until: string | null
          required_dimensions:
            | Database["public"]["Enums"]["study_evidence_dimension"][]
            | null
          retention_pressure: number | null
          retention_state: string | null
          semester_id: string | null
          skill_id: string | null
          skill_kind: Database["public"]["Enums"]["study_skill_kind"] | null
          skill_title: string | null
          stability_days: number | null
          stable_key: string | null
          total_attempts: number | null
          transfer_evidence: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_skills_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_activation_course_status"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_skills_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_baseline_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_skills_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_configuration"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_skills_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_operating_mode"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_skills_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_progress"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_skills_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_risk"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_skills_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_courses"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_skills_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_intelligence_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_skills_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_strategy"
            referencedColumns: ["course_id", "user_id"]
          },
        ]
      }
      study_week_actions: {
        Row: {
          candidate_runs: number | null
          checkpoint_completed_at: string | null
          checkpoint_due: boolean | null
          checkpoint_skill_count_at_completion: number | null
          course_display_name: string | null
          course_id: string | null
          course_stable_key: string | null
          due_minutes: number | null
          due_skills: number | null
          exam_ready_skills: number | null
          exercise_attempt_completed_at: string | null
          exercise_attempt_due: boolean | null
          exercise_count: number | null
          exercise_expectation_met: boolean | null
          exercise_resource_count_at_attempt: number | null
          expected_lectures_per_week: number | null
          expects_exercise: boolean | null
          expects_solution: boolean | null
          fragile_skills: number | null
          health_status: string | null
          learning_skills: number | null
          lecture_count: number | null
          lecture_expectation_met: boolean | null
          lecture_resource_count_at_retrieval: number | null
          lecture_retrieval_completed_at: string | null
          lecture_retrieval_due: boolean | null
          new_skills: number | null
          next_action: string | null
          open_findings: number | null
          pending_resources: number | null
          resource_count: number | null
          scheduled_repairs: number | null
          semester_id: string | null
          skill_count: number | null
          solution_count: number | null
          solution_expectation_met: boolean | null
          solution_reconcile_due: boolean | null
          solution_reconciled_at: string | null
          solution_resource_count_at_reconcile: number | null
          stable_skills: number | null
          teaching_week_id: string | null
          unresolved_errors: number | null
          user_id: string | null
          verified_resources: number | null
          week_no: number | null
        }
        Relationships: [
          {
            foreignKeyName: "study_weeks_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_activation_course_status"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_weeks_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_baseline_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_weeks_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_configuration"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_weeks_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_operating_mode"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_weeks_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_progress"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_weeks_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_risk"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_weeks_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_courses"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_weeks_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_intelligence_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_weeks_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_strategy"
            referencedColumns: ["course_id", "user_id"]
          },
        ]
      }
      study_weekly_health: {
        Row: {
          candidate_runs: number | null
          course_display_name: string | null
          course_id: string | null
          course_stable_key: string | null
          due_minutes: number | null
          due_skills: number | null
          exam_ready_skills: number | null
          exercise_count: number | null
          exercise_expectation_met: boolean | null
          expected_lectures_per_week: number | null
          expects_exercise: boolean | null
          expects_solution: boolean | null
          fragile_skills: number | null
          health_status: string | null
          learning_skills: number | null
          lecture_count: number | null
          lecture_expectation_met: boolean | null
          new_skills: number | null
          pending_resources: number | null
          resource_count: number | null
          semester_id: string | null
          skill_count: number | null
          solution_count: number | null
          solution_expectation_met: boolean | null
          stable_skills: number | null
          teaching_week_id: string | null
          unresolved_errors: number | null
          user_id: string | null
          verified_resources: number | null
          week_no: number | null
        }
        Relationships: [
          {
            foreignKeyName: "study_weeks_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_activation_course_status"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_weeks_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_baseline_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_weeks_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_configuration"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_weeks_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_operating_mode"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_weeks_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_progress"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_weeks_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_course_risk"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_weeks_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_courses"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_weeks_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_intelligence_summary"
            referencedColumns: ["course_id", "user_id"]
          },
          {
            foreignKeyName: "study_weeks_course_owner_fk"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_exam_strategy"
            referencedColumns: ["course_id", "user_id"]
          },
        ]
      }
    }
    Functions: {
      authorize_thiepn_hub_notes: {
        Args: { p_operation: string; p_revision: string }
        Returns: Json
      }
      authorize_thiepn_hub_tms60: {
        Args: { p_operation: string; p_revision: string; p_translation: string }
        Returns: Json
      }
      authorize_thiepn_library_file_deletion: {
        Args: { p_plan_id: string }
        Returns: Json
      }
      cancel_thiepn_account_deletion: { Args: never; Returns: Json }
      canvas_apply_own_undo: {
        Args: { p_changes: Json; p_updated_by: string }
        Returns: {
          element: Json
          id: string
          is_deleted: boolean
          revision: number
          updated_at: string
          updated_by: string
          version: number
          version_nonce: number
        }[]
        SetofOptions: {
          from: "*"
          to: "canvas_elements"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      canvas_ci_apply_own_undo: {
        Args: { p_changes: Json; p_updated_by: string }
        Returns: {
          element: Json
          id: string
          is_deleted: boolean
          revision: number
          updated_at: string
          updated_by: string
          version: number
          version_nonce: number
        }[]
        SetofOptions: {
          from: "*"
          to: "canvas_ci_elements"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      change_leaderboard_username: {
        Args: { p_user_id: string; p_username: string }
        Returns: Json
      }
      claim_leaderboard_profile: {
        Args: { p_user_id: string; p_username: string }
        Returns: Json
      }
      claim_notes_sync_access: { Args: { p_code: string }; Returns: boolean }
      connect_thiepn_app: { Args: { p_app_slug: string }; Returns: Json }
      create_thiepn_account_backup: { Args: never; Returns: Json }
      delete_meal_from_ai: {
        Args: {
          p_expected_updated_at: string
          p_meal_id: string
          p_request_id: string
        }
        Returns: Json
      }
      delete_notes_auth_identity: { Args: never; Returns: Json }
      delete_thiepn_account: { Args: { p_confirmation: string }; Returns: Json }
      delete_thiepn_library_state: { Args: never; Returns: boolean }
      delete_tms60_cloud_data: {
        Args: { p_expected_user_id: string }
        Returns: Json
      }
      diet_app_complete_onboarding: {
        Args: {
          p_calorie_target: number
          p_current_weight: number
          p_desired_weekly_weight_change: number
          p_fiber_target: number
          p_goal_mode: string
          p_goal_weight: number
          p_protein_target: number
          p_request_id: string
          p_start_date: string
        }
        Returns: Json
      }
      diet_app_delete_meal: {
        Args: {
          p_expected_updated_at: string
          p_meal_id: string
          p_request_id: string
        }
        Returns: Json
      }
      diet_app_delete_saved_food: {
        Args: {
          p_expected_updated_at: string
          p_request_id: string
          p_saved_food_id: string
        }
        Returns: Json
      }
      diet_app_delete_saved_meal: {
        Args: {
          p_expected_updated_at: string
          p_request_id: string
          p_saved_meal_id: string
        }
        Returns: Json
      }
      diet_app_delete_training_day: {
        Args: {
          p_expected_updated_at: string
          p_request_id: string
          p_training_day_id: string
        }
        Returns: Json
      }
      diet_app_export_owner_data: { Args: never; Returns: Json }
      diet_app_log_meal: {
        Args: {
          p_items: Json
          p_log_date: string
          p_meal_type: string
          p_request_id: string
          p_title: string
        }
        Returns: Json
      }
      diet_app_log_saved_food: {
        Args: {
          p_log_date: string
          p_meal_type: string
          p_multiplier: number
          p_quantity_text: string
          p_request_id: string
          p_saved_food_id: string
        }
        Returns: Json
      }
      diet_app_log_saved_meal: {
        Args: {
          p_log_date: string
          p_meal_type: string
          p_multiplier: number
          p_quantity_text: string
          p_request_id: string
          p_saved_meal_id: string
        }
        Returns: Json
      }
      diet_app_read_snapshot: { Args: never; Returns: Json }
      diet_app_repeat_meal: {
        Args: {
          p_log_date: string
          p_meal_id: string
          p_meal_type: string
          p_request_id: string
        }
        Returns: Json
      }
      diet_app_resolve_strategy_review: {
        Args: {
          p_effective_date: string
          p_recommendation_id: string
          p_request_id: string
          p_resolution: string
        }
        Returns: Json
      }
      diet_app_revert_strategy_review: {
        Args: { p_recommendation_id: string; p_request_id: string }
        Returns: Json
      }
      diet_app_save_food: {
        Args: {
          p_barcode: string
          p_brand: string
          p_calories: number
          p_carbs: number
          p_expected_updated_at: string
          p_fat: number
          p_fiber: number
          p_name: string
          p_photo_url: string
          p_protein: number
          p_quantity_text: string
          p_request_id: string
          p_saved_food_id: string
          p_source: string
        }
        Returns: Json
      }
      diet_app_save_meal_from_history: {
        Args: { p_meal_id: string; p_name: string; p_request_id: string }
        Returns: Json
      }
      diet_app_save_training_distribution: {
        Args: {
          p_enabled: boolean
          p_expected_updated_at: string
          p_hard_extra_kcal: number
          p_light_extra_kcal: number
          p_moderate_extra_kcal: number
          p_request_id: string
          p_weekly_template: Json
        }
        Returns: Json
      }
      diet_app_set_saved_food_favorite: {
        Args: {
          p_favorite: boolean
          p_request_id: string
          p_saved_food_id: string
        }
        Returns: Json
      }
      diet_app_set_saved_meal_favorite: {
        Args: {
          p_favorite: boolean
          p_request_id: string
          p_saved_meal_id: string
        }
        Returns: Json
      }
      diet_app_stage_strategy_review: {
        Args: {
          p_confidence_level: string
          p_confidence_score: number
          p_current_target: number
          p_decision: string
          p_engine_version: string
          p_estimated_expenditure: number
          p_generated_on: string
          p_lookback_days: number
          p_payload: Json
          p_raw_target: number
          p_reason: string
          p_recommended_carbs: number
          p_recommended_fat: number
          p_recommended_protein: number
          p_recommended_target: number
          p_request_id: string
        }
        Returns: Json
      }
      diet_app_update_meal: {
        Args: {
          p_expected_updated_at: string
          p_items: Json
          p_log_date: string
          p_meal_id: string
          p_meal_type: string
          p_request_id: string
          p_title: string
        }
        Returns: Json
      }
      diet_app_upsert_training_day: {
        Args: {
          p_day_type: string
          p_duration_minutes: number
          p_expected_updated_at: string
          p_notes: string
          p_request_id: string
          p_status: string
          p_title: string
          p_training_date: string
          p_training_day_id: string
        }
        Returns: Json
      }
      diet_copilot_healthcheck: { Args: never; Returns: Json }
      diet_p15_offsite_export: { Args: never; Returns: Json }
      diet_p18_integrity_report: { Args: never; Returns: Json }
      diet_p19_concurrency_status: { Args: never; Returns: Json }
      diet_p20_release_status: { Args: never; Returns: Json }
      diet_p21_incident_status: { Args: never; Returns: Json }
      diet_p22_maintenance_status: { Args: never; Returns: Json }
      disable_notes_sync_access: { Args: never; Returns: boolean }
      disconnect_thiepn_app: { Args: { p_app_slug: string }; Returns: Json }
      execute_thiepn_app_data_deletion: {
        Args: { p_plan_id: string }
        Returns: Json
      }
      export_thiepn_platform_snapshot: { Args: never; Returns: Json }
      get_diet_context: {
        Args: { p_days?: number; p_end_date?: string }
        Returns: Json
      }
      get_public_leaderboard: {
        Args: {
          p_board_key: string
          p_challenge_date?: string
          p_viewer_user_id?: string
        }
        Returns: Json
      }
      get_thiepn_account_auth_assurance: { Args: never; Returns: Json }
      get_thiepn_account_backup_inventory: {
        Args: never
        Returns: {
          app_name: string
          app_slug: string
          backup_ref: string
          backup_status: string
          backup_type: string
          created_at: string
          metadata: Json
          schema_version: number
          size_bytes: number
          source_revision: number
        }[]
      }
      get_thiepn_account_data_inventory: {
        Args: never
        Returns: {
          app_name: string
          app_slug: string
          last_successful_sync_at: string
          namespace_id: string
          namespace_status: string
          record_count: number
          revision: number
          schema_version: number
          storage_bytes: number
          sync_status: string
          sync_supported: boolean
          updated_at: string
        }[]
      }
      get_thiepn_account_export_payload: {
        Args: { p_export_id: string }
        Returns: Json
      }
      get_thiepn_ecosystem: {
        Args: never
        Returns: {
          app_slug: string
          capabilities: Json
          connected: boolean
          data_scope: string
          description: string
          export_scope: string
          first_used_at: string
          identity_scope: string
          last_used_at: string
          manifest_version: number
          name: string
          path: string
          sort_order: number
        }[]
      }
      get_thiepn_hub_notes_consent: { Args: never; Returns: Json }
      get_thiepn_hub_tms60_consent: {
        Args: { p_translation: string }
        Returns: Json
      }
      get_thiepn_library_file_inventory: { Args: never; Returns: Json }
      go_sync_write: {
        Args: {
          p_client_updated_at: number
          p_expected_revision: number
          p_payload: Json
        }
        Returns: number
      }
      gomoku_admin_assert_operator: {
        Args: { p_roles?: string[]; p_user_id: string }
        Returns: string
      }
      gomoku_admin_audit: {
        Args: {
          p_action: string
          p_actor_role: string
          p_actor_user_id: string
          p_after_state?: Json
          p_before_state?: Json
          p_reason?: string
          p_request_id?: string
          p_target_id?: string
          p_target_type?: string
        }
        Returns: number
      }
      gomoku_admin_create_incident: {
        Args: {
          p_actor_user_id: string
          p_reason?: string
          p_request_id?: string
          p_severity: string
          p_summary?: string
          p_title: string
        }
        Returns: Json
      }
      gomoku_admin_create_rollout: {
        Args: {
          p_actor_user_id: string
          p_reason: string
          p_release_id: string
          p_request_id?: string
        }
        Returns: Json
      }
      gomoku_admin_operator: { Args: { p_user_id: string }; Returns: Json }
      gomoku_admin_overview: {
        Args: { p_actor_user_id: string }
        Returns: Json
      }
      gomoku_admin_record_deployment: {
        Args: {
          p_actor_user_id: string
          p_edge_bundle_sha256?: string
          p_edge_function_version?: number
          p_frontend_sha?: string
          p_git_sha: string
          p_notes?: string
          p_reason?: string
          p_request_id?: string
        }
        Returns: Json
      }
      gomoku_admin_register_release: {
        Args: {
          p_actor_user_id: string
          p_git_sha: string
          p_notes?: string
          p_reason?: string
          p_request_id?: string
          p_source_ref?: string
          p_version: string
        }
        Returns: Json
      }
      gomoku_admin_run_incident_drill: {
        Args: {
          p_actor_user_id: string
          p_health_status: string
          p_operational_snapshot: Json
          p_request_id?: string
          p_scenario: string
        }
        Returns: Json
      }
      gomoku_admin_set_controls: {
        Args: {
          p_actor_user_id: string
          p_banner?: string
          p_banner_provided?: boolean
          p_challenges_enabled?: boolean
          p_ranked_enabled?: boolean
          p_reason?: string
          p_request_id?: string
          p_room_creation_enabled?: boolean
          p_service_mode?: string
          p_tournaments_enabled?: boolean
        }
        Returns: Json
      }
      gomoku_admin_transition_release: {
        Args: {
          p_action: string
          p_actor_user_id: string
          p_reason?: string
          p_release_id: string
          p_request_id?: string
          p_target_release_id?: string
        }
        Returns: Json
      }
      gomoku_admin_transition_rollout: {
        Args: {
          p_action: string
          p_actor_user_id: string
          p_health_status: string
          p_reason?: string
          p_request_id?: string
          p_rollout_id: string
          p_target_release_id?: string
        }
        Returns: Json
      }
      gomoku_admin_update_incident: {
        Args: {
          p_actor_user_id: string
          p_incident_id: string
          p_reason?: string
          p_request_id?: string
          p_status?: string
          p_summary?: string
          p_summary_provided?: boolean
        }
        Returns: Json
      }
      gomoku_advance_tournament_match: {
        Args: { p_reason: string; p_room_id: string; p_winner_user_id: string }
        Returns: Json
      }
      gomoku_apply_moderation_action: {
        Args: {
          p_action_type: string
          p_actor_user_id?: string
          p_duration_minutes?: number
          p_reason: string
          p_subject_user_id: string
        }
        Returns: Json
      }
      gomoku_award_achievement: {
        Args: {
          p_code: string
          p_context?: Json
          p_earned_at?: string
          p_source_kind?: string
          p_source_ref?: string
          p_user_id: string
        }
        Returns: boolean
      }
      gomoku_cancel_matchmaking: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      gomoku_checkin_tournament_match: {
        Args: { p_match_id: string; p_user_id: string }
        Returns: Json
      }
      gomoku_competition_tick: { Args: never; Returns: Json }
      gomoku_create_direct_challenge: {
        Args: {
          p_challenged_user_id: string
          p_challenged_username: string
          p_challenger_user_id: string
          p_challenger_username: string
        }
        Returns: Json
      }
      gomoku_create_tournament: {
        Args: {
          p_name: string
          p_size?: number
          p_user_id: string
          p_username: string
        }
        Returns: Json
      }
      gomoku_ensure_current_season: { Args: { p_at?: string }; Returns: Json }
      gomoku_expire_direct_challenges: { Args: never; Returns: number }
      gomoku_head_to_head: {
        Args: { p_other_user_id: string; p_user_id: string }
        Returns: Json
      }
      gomoku_join_tournament: {
        Args: { p_tournament_id: string; p_user_id: string; p_username: string }
        Returns: Json
      }
      gomoku_leave_tournament: {
        Args: { p_tournament_id: string; p_user_id: string }
        Returns: Json
      }
      gomoku_mark_tournament_match_started: {
        Args: { p_room_id: string }
        Returns: Json
      }
      gomoku_moderation_queue: { Args: { p_limit?: number }; Returns: Json }
      gomoku_organizer_tournament_action: {
        Args: {
          p_action: string
          p_match_id?: string
          p_target_user_id?: string
          p_text?: string
          p_tournament_id: string
          p_user_id: string
        }
        Returns: Json
      }
      gomoku_p15_drill_checks: { Args: { p_scenario: string }; Returns: Json }
      gomoku_p15_reconciliation: { Args: never; Returns: Json }
      gomoku_p15_structural_certification: {
        Args: { p_scenario?: string }
        Returns: Json
      }
      gomoku_p15_system_record_deployment: {
        Args: {
          p_edge_bundle_sha256?: string
          p_edge_function_version?: number
          p_frontend_sha?: string
          p_git_sha: string
          p_notes?: string
        }
        Returns: Json
      }
      gomoku_p15_write_drill: {
        Args: {
          p_actor_role: string
          p_actor_user_id: string
          p_checks: Json
          p_health_status: string
          p_mode: string
          p_operational_snapshot: Json
          p_request_id?: string
          p_scenario: string
        }
        Returns: Json
      }
      gomoku_p16_admin_summary: {
        Args: { p_actor_user_id: string }
        Returns: Json
      }
      gomoku_p16_certify_production: {
        Args: {
          p_build_git_sha: string
          p_source_run_id: string
          p_workflow_sha?: string
        }
        Returns: Json
      }
      gomoku_p16_consume_oidc_jti: {
        Args: {
          p_expires_at: string
          p_jti: string
          p_repository: string
          p_run_id: string
          p_workflow_ref: string
        }
        Returns: boolean
      }
      gomoku_p16_latest_admission: {
        Args: { p_git_sha: string }
        Returns: Json
      }
      gomoku_p16_public_status: { Args: never; Returns: Json }
      gomoku_p16_record_deployment: {
        Args: {
          p_edge_bundle_sha256: string
          p_edge_function_version: number
          p_frontend_sha: string
          p_git_sha: string
          p_notes?: string
          p_source_run_id: string
          p_workflow_sha?: string
        }
        Returns: Json
      }
      gomoku_p16_record_orchestration: {
        Args: {
          p_details?: Json
          p_git_sha: string
          p_source_run_id: string
          p_stage: string
          p_status: string
          p_workflow_sha?: string
        }
        Returns: Json
      }
      gomoku_p16_record_qualification: {
        Args: {
          p_checks: Json
          p_git_sha: string
          p_workflow_attempt: number
          p_workflow_ref: string
          p_workflow_run_id: string
          p_workflow_sha: string
        }
        Returns: Json
      }
      gomoku_p16_required_checks: { Args: never; Returns: string[] }
      gomoku_p17_admin_summary: {
        Args: { p_actor_user_id: string }
        Returns: Json
      }
      gomoku_p17_authorize_schema_promotion: {
        Args: {
          p_edge_manifest_sha256: string
          p_production_git_sha: string
          p_release_manifest_sha256: string
          p_schema_manifest_sha256: string
          p_source_run_id: string
          p_workflow_sha: string
        }
        Returns: Json
      }
      gomoku_p17_environment_probe: { Args: never; Returns: Json }
      gomoku_p17_public_status: { Args: never; Returns: Json }
      gomoku_p17_record_environment: {
        Args: {
          p_branch_id: string
          p_branch_name: string
          p_branch_status: string
          p_environment: string
          p_project_ref: string
          p_required_for_promotion: boolean
          p_source: string
          p_source_run_id: string
        }
        Returns: Json
      }
      gomoku_p17_record_migration_event: {
        Args: {
          p_details?: Json
          p_environment_label: string
          p_migration_name: string
          p_migration_sha256: string
          p_release_manifest_sha256: string
          p_result: string
          p_source_git_sha: string
          p_source_run_id: string
        }
        Returns: Json
      }
      gomoku_p17_record_preview_certification: {
        Args: {
          p_branch_id: string
          p_branch_status: string
          p_checks: Json
          p_edge_build_sha: string
          p_edge_manifest_sha256: string
          p_environment: string
          p_migration_count: number
          p_migration_head: string
          p_project_ref: string
          p_release_manifest_sha256: string
          p_schema_manifest_sha256: string
          p_source_git_sha: string
          p_source_ref: string
          p_source_run_id: string
          p_workflow_sha: string
        }
        Returns: Json
      }
      gomoku_p17_record_promotion_event: {
        Args: {
          p_authorization_id: string
          p_details: Json
          p_event_type: string
          p_production_migration_head: string
          p_source_run_id: string
          p_workflow_sha: string
        }
        Returns: Json
      }
      gomoku_p17_required_preview_checks: { Args: never; Returns: string[] }
      gomoku_p17_set_local_schema_state: {
        Args: {
          p_edge_manifest_sha256: string
          p_environment_label: string
          p_migration_count: number
          p_migration_head: string
          p_release_manifest_sha256: string
          p_schema_manifest_sha256: string
          p_source_git_sha: string
          p_source_run_id: string
        }
        Returns: Json
      }
      gomoku_p20_admin_summary: {
        Args: { p_actor_user_id: string }
        Returns: Json
      }
      gomoku_p20_capture_slo_sample: { Args: never; Returns: Json }
      gomoku_p20_public_status: { Args: never; Returns: Json }
      gomoku_p20_release_guard: { Args: never; Returns: Json }
      gomoku_p20_slo_definitions: { Args: never; Returns: Json }
      gomoku_p20_slo_snapshot: { Args: never; Returns: Json }
      gomoku_p20_update_alert: {
        Args: { p_details?: Json; p_good: boolean; p_indicator: string }
        Returns: Json
      }
      gomoku_p21_lobby_snapshot: { Args: never; Returns: Json }
      gomoku_player_stats: { Args: { p_user_id: string }; Returns: Json }
      gomoku_players_blocked: {
        Args: { p_a: string; p_b: string }
        Returns: boolean
      }
      gomoku_process_match_outbox: { Args: { p_limit?: number }; Returns: Json }
      gomoku_public_operational_status: { Args: never; Returns: Json }
      gomoku_ranked_leaderboard: { Args: { p_limit?: number }; Returns: Json }
      gomoku_ranked_summary: { Args: { p_user_id: string }; Returns: Json }
      gomoku_record_runtime_event: {
        Args: {
          p_component: string
          p_details?: Json
          p_event_type: string
          p_game_version?: number
          p_request_id?: string
          p_room_id?: string
          p_severity: string
        }
        Returns: undefined
      }
      gomoku_refresh_competitive_career: {
        Args: { p_user_id: string }
        Returns: Json
      }
      gomoku_reliability_snapshot: { Args: never; Returns: Json }
      gomoku_reliability_tick: { Args: never; Returns: Json }
      gomoku_respond_direct_challenge: {
        Args: {
          p_action: string
          p_challenge_id: string
          p_room_expires_at?: string
          p_room_id?: string
          p_room_state?: Json
          p_user_id: string
        }
        Returns: Json
      }
      gomoku_review_fair_play_report: {
        Args: {
          p_actor_user_id?: string
          p_report_id: string
          p_resolution: string
          p_status: string
        }
        Returns: Json
      }
      gomoku_review_integrity_flag: {
        Args: { p_actor_user_id?: string; p_flag_id: number; p_status: string }
        Returns: Json
      }
      gomoku_set_competitive_showcase: {
        Args: { p_codes: string[]; p_user_id: string }
        Returns: Json
      }
      gomoku_set_player_block: {
        Args: {
          p_blocked: boolean
          p_blocked_user_id: string
          p_blocker_user_id: string
        }
        Returns: boolean
      }
      gomoku_set_player_favorite: {
        Args: {
          p_favorite: boolean
          p_owner_user_id: string
          p_target_user_id: string
        }
        Returns: boolean
      }
      gomoku_set_social_preferences: {
        Args: {
          p_allow_challenges: boolean
          p_show_presence: boolean
          p_user_id: string
        }
        Returns: Json
      }
      gomoku_submit_fair_play_report: {
        Args: {
          p_category: string
          p_details?: string
          p_game_version?: number
          p_reporter_user_id: string
          p_room_id?: string
          p_target_user_id: string
          p_target_username: string
        }
        Returns: Json
      }
      gomoku_sweep_tournament_deadlines: {
        Args: { p_tournament_id?: string }
        Returns: Json
      }
      gomoku_take_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number }
        Returns: boolean
      }
      gomoku_touch_social_presence: {
        Args: {
          p_activity?: string
          p_room_id?: string
          p_user_id: string
          p_username: string
        }
        Returns: undefined
      }
      gomoku_tournament_event: {
        Args: {
          p_actor_user_id?: string
          p_actor_username?: string
          p_event_type: string
          p_match_id?: string
          p_message?: string
          p_round?: number
          p_slot?: number
          p_subject_user_id?: string
          p_subject_username?: string
          p_tournament_id: string
        }
        Returns: string
      }
      gomoku_try_matchmaking: {
        Args: { p_history_hash?: string; p_user_id: string; p_username: string }
        Returns: Json
      }
      has_library_file_deletion_authorization: {
        Args: { p_object_name: string }
        Returns: boolean
      }
      has_library_personal_file_sync_access: { Args: never; Returns: boolean }
      has_notes_sync_access: { Args: never; Returns: boolean }
      list_notes_auth_sessions: {
        Args: never
        Returns: {
          created_at: string
          id: string
          is_current: boolean
          not_after: string
          refreshed_at: string
          updated_at: string
          user_agent: string
        }[]
      }
      list_thiepn_account_sessions: {
        Args: never
        Returns: {
          aal: string
          created_at: string
          is_current: boolean
          not_after: string
          refreshed_at: string
          session_id: string
          updated_at: string
          user_agent: string
        }[]
      }
      log_meal_from_ai: {
        Args: {
          p_confidence: string
          p_items: Json
          p_log_date: string
          p_meal_type: string
          p_notes: string
          p_original_input: string
          p_request_id: string
          p_source: string
          p_title: string
        }
        Returns: Json
      }
      log_weight_from_ai: {
        Args: {
          p_entry_date: string
          p_notes: string
          p_request_id: string
          p_weight: number
        }
        Returns: Json
      }
      micro_arcade_consume_score: {
        Args: {
          p_duration_ms: number
          p_now: number
          p_player_id: string
          p_score: number
          p_session_id: string
        }
        Returns: Json
      }
      micro_arcade_consume_score_v2: {
        Args: {
          p_duration_ms: number
          p_mode_id: string
          p_now: number
          p_player_id: string
          p_score: number
          p_session_id: string
          p_source_version: number
        }
        Returns: Json
      }
      micro_arcade_game_leaderboard: {
        Args: { p_game_id: string; p_limit?: number; p_player_id: string }
        Returns: Json
      }
      micro_arcade_lb_activity: { Args: { p_player: string }; Returns: Json }
      micro_arcade_lb_auth: {
        Args: { p_hash: string; p_id: string; p_legacy_hash: string }
        Returns: Json
      }
      micro_arcade_lb_bests: {
        Args: { p_asof: number; p_end: number; p_start: number }
        Returns: {
          active_ms: number
          ap_micros: number
          code: string
          completed_at: number
          contribution_micros: number
          created_at: number
          duration_ms: number
          game_id: string
          id: string
          mode_id: string
          player_id: string
          policy_id: string
          provenance: string
          raw_score: number
          session_id: string
          source_version: number
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "micro_arcade_lb_runs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      micro_arcade_lb_board: {
        Args: {
          p_asof?: number
          p_game: string
          p_limit?: number
          p_mode: string
          p_offset?: number
          p_player: string
          p_scope: string
        }
        Returns: Json
      }
      micro_arcade_lb_cleanup: { Args: never; Returns: number }
      micro_arcade_lb_finish: {
        Args: {
          p_active: number
          p_duration: number
          p_mode: string
          p_player: string
          p_policy: string
          p_raw: number
          p_session: string
          p_source: number
        }
        Returns: Json
      }
      micro_arcade_lb_guest: {
        Args: { p_country: string; p_hash: string; p_id: string }
        Returns: Json
      }
      micro_arcade_lb_history: {
        Args: { p_limit?: number; p_offset?: number; p_player: string }
        Returns: Json
      }
      micro_arcade_lb_receipt: {
        Args: { r: Database["public"]["Tables"]["micro_arcade_lb_runs"]["Row"] }
        Returns: Json
      }
      micro_arcade_lb_rename: {
        Args: { p_name: string; p_player: string }
        Returns: Json
      }
      micro_arcade_lb_result: {
        Args: { p_player: string; p_session: string }
        Returns: Json
      }
      micro_arcade_lb_review: {
        Args: { p_reason: string; p_run: string; p_status: string }
        Returns: boolean
      }
      micro_arcade_lb_screen: {
        Args: {
          p_active: number
          p_game: string
          p_mode: string
          p_raw: number
        }
        Returns: Json
      }
      micro_arcade_lb_start: {
        Args: {
          p_game: string
          p_mode: string
          p_player: string
          p_policy: string
          p_request: string
        }
        Returns: Json
      }
      micro_arcade_lb_values: {
        Args: { p_game: string; p_mode: string; p_raw: number }
        Returns: Json
      }
      micro_arcade_overall_leaderboard: {
        Args: { p_limit?: number; p_player_id: string }
        Returns: Json
      }
      micro_arcade_p31_capture_snapshot: {
        Args: { p_source?: string }
        Returns: Json
      }
      micro_arcade_p31_offsite_export: { Args: never; Returns: Json }
      micro_arcade_p31_restore_drill: {
        Args: { p_snapshot_id: string }
        Returns: Json
      }
      micro_arcade_p31_verify_snapshot: {
        Args: { p_snapshot_id: string }
        Returns: Json
      }
      micro_arcade_points: {
        Args: {
          p_game_id: string
          p_mode_id?: string
          p_raw: number
          p_source_version?: number
        }
        Returns: number
      }
      micro_arcade_profile_activity: {
        Args: { p_player_id: string }
        Returns: Json
      }
      micro_arcade_rate_limit: {
        Args: { p_key: string; p_limit: number; p_now: number; p_scope: string }
        Returns: boolean
      }
      micro_arcade_weekly_leaderboard: {
        Args: {
          p_limit: number
          p_player_id: string
          p_week_end: number
          p_week_start: number
        }
        Returns: Json
      }
      notes_auth_identity_delete_status: { Args: never; Returns: string }
      plan_thiepn_account_deletion: { Args: never; Returns: Json }
      plan_thiepn_app_data_deletion: {
        Args: { p_app_slug: string }
        Returns: Json
      }
      platform_p23_upgrade_status: { Args: never; Returns: Json }
      platform_p24_execution_status: { Args: never; Returns: Json }
      platform_p24_post_upgrade_status: { Args: never; Returns: Json }
      read_thiepn_hub_notes: {
        Args: { p_operation: string; p_query?: string; p_revision: string }
        Returns: Json
      }
      read_thiepn_hub_tms60: {
        Args: {
          p_operation: string
          p_query?: string
          p_request_id: string
          p_revision: string
          p_translation: string
        }
        Returns: Json
      }
      request_thiepn_account_deletion: {
        Args: { p_confirmation: string; p_plan_id: string }
        Returns: Json
      }
      request_thiepn_account_export: {
        Args: { p_app_slugs?: string[] }
        Returns: string
      }
      restore_thiepn_tms60_backup: {
        Args: { p_backup_id: string }
        Returns: Json
      }
      search_diet_history: {
        Args: { p_days?: number; p_limit?: number; p_query: string }
        Returns: Json
      }
      set_thiepn_app_permission: {
        Args: {
          p_app_slug: string
          p_granted: boolean
          p_permission_id: string
        }
        Returns: Json
      }
      set_thiepn_hub_notes_consent: {
        Args: { p_expected_revision: string; p_permissions: string[] }
        Returns: Json
      }
      set_thiepn_hub_tms60_consent: {
        Args: {
          p_expected_revision: string
          p_permissions: string[]
          p_translation: string
        }
        Returns: Json
      }
      study_abandon_exam_simulation: {
        Args: { p_ended_at?: string; p_simulation_id: string }
        Returns: Json
      }
      study_accept_ingestion_run: { Args: { p_run_id: string }; Returns: Json }
      study_add_reconciliation_finding: {
        Args: {
          p_course_id: string
          p_detail?: string
          p_error_type?: Database["public"]["Enums"]["study_error_type"]
          p_exercise_resource_id?: string
          p_severity?: number
          p_skill_id?: string
          p_solution_resource_id?: string
          p_title: string
          p_week_no: number
        }
        Returns: Json
      }
      study_candidate_has_anchor: { Args: { p_source: Json }; Returns: boolean }
      study_classify_baseline_skill: {
        Args: {
          p_classification: Database["public"]["Enums"]["study_baseline_classification"]
          p_confidence?: number
          p_course_id: string
          p_note?: string
          p_skill_id: string
        }
        Returns: Json
      }
      study_complete_baseline: { Args: { p_course_id: string }; Returns: Json }
      study_create_commitment: {
        Args: {
          p_course_id?: string
          p_due_at: string
          p_estimated_minutes: number
          p_kind?: Database["public"]["Enums"]["study_commitment_kind"]
          p_note?: string
          p_priority?: number
          p_resource_id?: string
          p_source_url?: string
          p_title: string
        }
        Returns: string
      }
      study_finish_exam_simulation: {
        Args: {
          p_completed_at?: string
          p_note?: string
          p_simulation_id: string
        }
        Returns: Json
      }
      study_finish_review_session: {
        Args: { p_ended_at?: string; p_note?: string; p_session_id: string }
        Returns: Json
      }
      study_get_processing_packet: { Args: { p_run_id: string }; Returns: Json }
      study_grade_exam_simulation_item: {
        Args: {
          p_awarded_points: number
          p_error_types?: Database["public"]["Enums"]["study_error_type"][]
          p_exam_question_id: string
          p_graded_at?: string
          p_self_confidence?: number
          p_simulation_id: string
        }
        Returns: Json
      }
      study_initialize_ws2627: { Args: never; Returns: Json }
      study_mark_week_milestone: {
        Args: {
          p_completed_at?: string
          p_course_id: string
          p_milestone: string
          p_note?: string
          p_week_no: number
        }
        Returns: Json
      }
      study_readiness_snapshot: { Args: never; Returns: Json }
      study_record_attempt: {
        Args: {
          p_completed_at?: string
          p_duration_seconds?: number
          p_error_types?: Database["public"]["Enums"]["study_error_type"][]
          p_independence: Database["public"]["Enums"]["study_independence"]
          p_question_id: string
          p_response_text?: string
          p_result: Database["public"]["Enums"]["study_attempt_result"]
          p_self_confidence?: number
        }
        Returns: Json
      }
      study_record_attempt_v2: {
        Args: {
          p_completed_at?: string
          p_duration_seconds?: number
          p_error_types?: Database["public"]["Enums"]["study_error_type"][]
          p_independence: Database["public"]["Enums"]["study_independence"]
          p_question_id: string
          p_request_id: string
          p_response_text?: string
          p_result: Database["public"]["Enums"]["study_attempt_result"]
          p_self_confidence?: number
        }
        Returns: Json
      }
      study_record_attempt_v3: {
        Args: {
          p_completed_at?: string
          p_duration_seconds?: number
          p_error_types?: Database["public"]["Enums"]["study_error_type"][]
          p_independence: Database["public"]["Enums"]["study_independence"]
          p_question_id: string
          p_request_id: string
          p_response_text?: string
          p_result: Database["public"]["Enums"]["study_attempt_result"]
          p_self_confidence?: number
          p_session_id?: string
          p_started_at?: string
        }
        Returns: Json
      }
      study_register_resource: {
        Args: {
          p_content_sha256?: string
          p_course_id: string
          p_drive_file_id?: string
          p_drive_url?: string
          p_logical_key?: string
          p_mime_type?: string
          p_original_filename?: string
          p_published_at?: string
          p_resource_type: Database["public"]["Enums"]["study_resource_type"]
          p_source_authority?: Database["public"]["Enums"]["study_source_authority"]
          p_title: string
          p_week_no?: number
        }
        Returns: Json
      }
      study_reject_ingestion_run: {
        Args: { p_reason?: string; p_run_id: string }
        Returns: Json
      }
      study_required_evidence_floor: {
        Args: {
          p_exam: number
          p_execution: number
          p_recall: number
          p_recognition: number
          p_required: Database["public"]["Enums"]["study_evidence_dimension"][]
          p_transfer: number
        }
        Returns: number
      }
      study_resolve_reconciliation_finding: {
        Args: {
          p_dismiss?: boolean
          p_finding_id: string
          p_resolution_note?: string
        }
        Returns: Json
      }
      study_save_exam_simulation_response: {
        Args: {
          p_duration_seconds?: number
          p_exam_question_id: string
          p_response_text?: string
          p_simulation_id: string
        }
        Returns: Json
      }
      study_service_mark_drive_scan: {
        Args: {
          p_note?: string
          p_semester_inbox_folder_id: string
          p_status: string
        }
        Returns: Json
      }
      study_service_submit_drive_candidate: {
        Args: {
          p_candidate_payload: Json
          p_content_sha256?: string
          p_course_stable_key: string
          p_drive_file_id: string
          p_drive_url: string
          p_extraction_confidence: number
          p_logical_key: string
          p_mime_type: string
          p_original_filename: string
          p_parent_folder_id: string
          p_processor?: string
          p_processor_version?: string
          p_published_at?: string
          p_resource_type: Database["public"]["Enums"]["study_resource_type"]
          p_semester_inbox_folder_id: string
          p_source_authority: Database["public"]["Enums"]["study_source_authority"]
          p_title: string
          p_validation_issues?: Json
          p_week_no: number
        }
        Returns: Json
      }
      study_service_upsert_drive_intake: {
        Args: {
          p_confidence?: number
          p_course_stable_key?: string
          p_drive_created_at?: string
          p_drive_file_id: string
          p_drive_modified_at?: string
          p_drive_url: string
          p_mime_type?: string
          p_note?: string
          p_parent_folder_id?: string
          p_resource_type?: Database["public"]["Enums"]["study_resource_type"]
          p_semester_inbox_folder_id: string
          p_size_bytes?: number
          p_status?: string
          p_title: string
          p_week_no?: number
        }
        Returns: Json
      }
      study_set_commitment_status: {
        Args: {
          p_id: string
          p_status: Database["public"]["Enums"]["study_commitment_status"]
        }
        Returns: Json
      }
      study_set_daily_capacity: {
        Args: {
          p_custom_budget_minutes?: number
          p_mode: Database["public"]["Enums"]["study_capacity_mode"]
          p_note?: string
          p_plan_date?: string
        }
        Returns: Json
      }
      study_start_baseline: { Args: { p_course_id: string }; Returns: string }
      study_start_exam_simulation: {
        Args: { p_exam_id: string; p_session_id: string; p_started_at?: string }
        Returns: Json
      }
      study_start_review_session: {
        Args: {
          p_planned_minutes?: number
          p_session_id: string
          p_started_at?: string
        }
        Returns: Json
      }
      study_start_study_session: {
        Args: {
          p_course_id?: string
          p_planned_minutes?: number
          p_session_id: string
          p_session_type: Database["public"]["Enums"]["study_session_type"]
          p_started_at?: string
        }
        Returns: Json
      }
      study_submit_exam_simulation: {
        Args: {
          p_responses?: Json
          p_simulation_id: string
          p_submitted_at?: string
        }
        Returns: Json
      }
      study_submit_ingestion_candidate: {
        Args: {
          p_extraction_confidence?: number
          p_payload: Json
          p_processor?: string
          p_processor_version?: string
          p_run_id: string
          p_validation_issues?: Json
        }
        Returns: Json
      }
      study_update_course_configuration: {
        Args: {
          p_checkpoint_weight?: number
          p_course_id: string
          p_credits?: number
          p_display_name: string
          p_exam_at?: string
          p_exam_duration_minutes?: number
          p_exam_format?: string
          p_expected_lectures_per_week?: number
          p_expects_exercise?: boolean
          p_expects_solution?: boolean
          p_lecture_retrieval_target_hours?: number
          p_professor?: string
          p_short_name?: string
          p_solution_reconcile_target_hours?: number
        }
        Returns: Json
      }
      study_update_exam_metadata: {
        Args: {
          p_active: boolean
          p_exam_id: string
          p_notes?: string
          p_syllabus_relevance: number
        }
        Returns: Json
      }
      study_update_planning_settings: {
        Args: {
          p_default_mode?: Database["public"]["Enums"]["study_capacity_mode"]
          p_intensive_budget_minutes: number
          p_light_budget_minutes: number
          p_light_review_budget_minutes: number
          p_max_focus_items: number
          p_normal_budget_minutes: number
          p_recovery_budget_minutes: number
          p_recovery_max_focus_items: number
          p_recovery_review_budget_minutes: number
        }
        Returns: Json
      }
      submit_leaderboard_result: {
        Args: {
          p_accuracy: number
          p_board_key: string
          p_challenge_date: string
          p_challenge_version: number
          p_client_version: string
          p_completed: boolean
          p_duration_ms: number
          p_grade: string
          p_integrity_remaining: number
          p_level: number
          p_metrics: Json
          p_raw_wpm: number
          p_score: number
          p_session_id: string
          p_stage: number
          p_user_id: string
          p_words_completed: number
          p_wpm: number
        }
        Returns: Json
      }
      sync_thiepn_french_state: {
        Args: {
          p_app_version?: string
          p_client_updated_at?: string
          p_device_id?: string
          p_expected_revision: number
          p_state: Json
        }
        Returns: Json
      }
      sync_thiepn_library_state: {
        Args: {
          p_app_version?: string
          p_client_updated_at?: string
          p_device_id?: string
          p_expected_revision: number
          p_state: Json
        }
        Returns: Json
      }
      thiepn_hub_notes_capture: {
        Args: {
          p_content: string
          p_destination: string
          p_request_id: string
          p_revision: string
          p_title: string
        }
        Returns: Json
      }
      thiepn_hub_notes_inbox: {
        Args: {
          p_action?: string
          p_expected_updated_at?: string
          p_issue_id?: string
          p_request_id: string
          p_revision: string
        }
        Returns: Json
      }
      undo_ai_action: { Args: { p_action_id: string }; Returns: Json }
      update_meal_from_ai: {
        Args: {
          p_expected_updated_at: string
          p_items: Json
          p_meal_id: string
          p_patch: Json
          p_request_id: string
        }
        Returns: Json
      }
      wttn_delete_save: {
        Args: { p_request_id: string; p_revision: number }
        Returns: Json
      }
      wttn_read_save: { Args: never; Returns: Json }
      wttn_save_history: { Args: never; Returns: Json }
      wttn_write_save: {
        Args: {
          p_checkpoint?: boolean
          p_request_id: string
          p_restore?: boolean
          p_revision: number
          p_snapshot: string
        }
        Returns: Json
      }
    }
    Enums: {
      study_attempt_result: "incorrect" | "partial" | "correct"
      study_baseline_classification:
        | "retained"
        | "rusty"
        | "weak"
        | "never_mastered"
      study_baseline_status:
        | "not_started"
        | "in_progress"
        | "completed"
        | "skipped"
      study_calendar_event_role:
        | "busy"
        | "lecture"
        | "exercise"
        | "exam"
        | "deadline"
        | "study_block"
        | "other"
      study_capacity_mode:
        | "normal"
        | "light"
        | "recovery"
        | "intensive"
        | "custom"
      study_commitment_kind:
        | "assignment"
        | "deadline"
        | "exam"
        | "administrative"
        | "other"
      study_commitment_status: "open" | "completed" | "cancelled"
      study_course_kind: "major" | "retake" | "minor"
      study_error_type:
        | "concept"
        | "recall"
        | "recognition"
        | "method_selection"
        | "execution"
        | "proof_structure"
        | "calculation"
        | "misreading"
        | "time_management"
        | "programming_bug"
      study_evidence_dimension:
        | "recall"
        | "recognition"
        | "execution"
        | "transfer"
        | "exam"
      study_exam_answer_status:
        | "missing"
        | "unverified"
        | "verified"
        | "official"
      study_exam_grading_status:
        | "pending"
        | "provisional"
        | "verified"
        | "official"
      study_exam_simulation_status:
        | "in_progress"
        | "grading"
        | "completed"
        | "abandoned"
      study_independence:
        | "independent"
        | "hint_1"
        | "hint_2"
        | "solution_exposed"
      study_mastery_state:
        | "new"
        | "learning"
        | "fragile"
        | "stable"
        | "exam_ready"
      study_processing_status:
        | "new"
        | "classified"
        | "archived"
        | "extracted"
        | "mapped"
        | "verified"
        | "needs_review"
      study_question_origin: "official" | "generated" | "manual"
      study_question_type:
        | "recall"
        | "recognition"
        | "short_application"
        | "proof_skeleton"
        | "problem"
        | "exam_problem"
        | "trace"
        | "implement"
        | "debug"
        | "complexity"
        | "graph"
        | "derivation"
        | "interpretation"
      study_resource_type:
        | "lecture"
        | "exercise"
        | "solution"
        | "script"
        | "exam"
        | "exam_solution"
        | "reference"
        | "supplement"
        | "course_info"
        | "other"
      study_scheduled_block_status:
        | "proposed"
        | "committed"
        | "completed"
        | "cancelled"
      study_session_type:
        | "review"
        | "coursework"
        | "checkpoint"
        | "exam_simulation"
        | "relearning"
      study_skill_kind:
        | "definition"
        | "theorem"
        | "proof"
        | "procedure"
        | "problem_solving"
        | "programming"
        | "graph"
        | "derivation"
        | "interpretation"
        | "other"
      study_source_authority:
        | "official_solution"
        | "official_course"
        | "assigned_reference"
        | "reference"
        | "ai_generated"
        | "unknown"
      study_week_status:
        | "planned"
        | "current"
        | "completed"
        | "skipped"
        | "cancelled"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      study_attempt_result: ["incorrect", "partial", "correct"],
      study_baseline_classification: [
        "retained",
        "rusty",
        "weak",
        "never_mastered",
      ],
      study_baseline_status: [
        "not_started",
        "in_progress",
        "completed",
        "skipped",
      ],
      study_calendar_event_role: [
        "busy",
        "lecture",
        "exercise",
        "exam",
        "deadline",
        "study_block",
        "other",
      ],
      study_capacity_mode: [
        "normal",
        "light",
        "recovery",
        "intensive",
        "custom",
      ],
      study_commitment_kind: [
        "assignment",
        "deadline",
        "exam",
        "administrative",
        "other",
      ],
      study_commitment_status: ["open", "completed", "cancelled"],
      study_course_kind: ["major", "retake", "minor"],
      study_error_type: [
        "concept",
        "recall",
        "recognition",
        "method_selection",
        "execution",
        "proof_structure",
        "calculation",
        "misreading",
        "time_management",
        "programming_bug",
      ],
      study_evidence_dimension: [
        "recall",
        "recognition",
        "execution",
        "transfer",
        "exam",
      ],
      study_exam_answer_status: [
        "missing",
        "unverified",
        "verified",
        "official",
      ],
      study_exam_grading_status: [
        "pending",
        "provisional",
        "verified",
        "official",
      ],
      study_exam_simulation_status: [
        "in_progress",
        "grading",
        "completed",
        "abandoned",
      ],
      study_independence: [
        "independent",
        "hint_1",
        "hint_2",
        "solution_exposed",
      ],
      study_mastery_state: [
        "new",
        "learning",
        "fragile",
        "stable",
        "exam_ready",
      ],
      study_processing_status: [
        "new",
        "classified",
        "archived",
        "extracted",
        "mapped",
        "verified",
        "needs_review",
      ],
      study_question_origin: ["official", "generated", "manual"],
      study_question_type: [
        "recall",
        "recognition",
        "short_application",
        "proof_skeleton",
        "problem",
        "exam_problem",
        "trace",
        "implement",
        "debug",
        "complexity",
        "graph",
        "derivation",
        "interpretation",
      ],
      study_resource_type: [
        "lecture",
        "exercise",
        "solution",
        "script",
        "exam",
        "exam_solution",
        "reference",
        "supplement",
        "course_info",
        "other",
      ],
      study_scheduled_block_status: [
        "proposed",
        "committed",
        "completed",
        "cancelled",
      ],
      study_session_type: [
        "review",
        "coursework",
        "checkpoint",
        "exam_simulation",
        "relearning",
      ],
      study_skill_kind: [
        "definition",
        "theorem",
        "proof",
        "procedure",
        "problem_solving",
        "programming",
        "graph",
        "derivation",
        "interpretation",
        "other",
      ],
      study_source_authority: [
        "official_solution",
        "official_course",
        "assigned_reference",
        "reference",
        "ai_generated",
        "unknown",
      ],
      study_week_status: [
        "planned",
        "current",
        "completed",
        "skipped",
        "cancelled",
      ],
    },
  },
} as const

export type StudyAttemptResult = Database["public"]["Enums"]["study_attempt_result"];
export type StudyIndependence = Database["public"]["Enums"]["study_independence"];
export type StudyErrorType = Database["public"]["Enums"]["study_error_type"];
export type StudyEvidenceDimension = Database["public"]["Enums"]["study_evidence_dimension"];
export type StudyMasteryState = Database["public"]["Enums"]["study_mastery_state"];
export type StudyCourseKind = Database["public"]["Enums"]["study_course_kind"];
export type StudySkillKind = Database["public"]["Enums"]["study_skill_kind"];
export type StudyQuestionType = Database["public"]["Enums"]["study_question_type"];
export type StudyResourceType = Database["public"]["Enums"]["study_resource_type"];
export type StudySourceAuthority = Database["public"]["Enums"]["study_source_authority"];
export type StudyProcessingStatus = Database["public"]["Enums"]["study_processing_status"];
export type StudySessionType = Database["public"]["Enums"]["study_session_type"];
export type StudyExamAnswerStatus = Database["public"]["Enums"]["study_exam_answer_status"];
export type StudyExamSimulationStatus = Database["public"]["Enums"]["study_exam_simulation_status"];
export type StudyExamGradingStatus = Database["public"]["Enums"]["study_exam_grading_status"];
export type StudyCapacityMode = Database["public"]["Enums"]["study_capacity_mode"];
export type StudyCommitmentKind = Database["public"]["Enums"]["study_commitment_kind"];
export type StudyCommitmentStatus = Database["public"]["Enums"]["study_commitment_status"];
export type StudyCalendarEventRole = Database["public"]["Enums"]["study_calendar_event_role"];
export type StudyScheduledBlockStatus = Database["public"]["Enums"]["study_scheduled_block_status"];
export type StudyBaselineStatus = Database["public"]["Enums"]["study_baseline_status"];
export type StudyBaselineClassification = Database["public"]["Enums"]["study_baseline_classification"];
export type StudyWeekHealthStatus = "empty" | "needs_processing" | "source_only" | "learning" | "fragile" | "retained";
export type StudyIntakeStatus = "discovered" | "classified" | "candidate" | "registered" | "needs_review" | "ignored" | "failed";
