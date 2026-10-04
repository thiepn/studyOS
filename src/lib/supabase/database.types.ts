export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type StudyAttemptResult = "incorrect" | "partial" | "correct";
export type StudyIndependence = "independent" | "hint_1" | "hint_2" | "solution_exposed";
export type StudyErrorType = "concept" | "recall" | "recognition" | "method_selection" | "execution" | "proof_structure" | "calculation" | "misreading" | "time_management" | "programming_bug";
export type StudyEvidenceDimension = "recall" | "recognition" | "execution" | "transfer" | "exam";
export type StudyMasteryState = "new" | "learning" | "fragile" | "stable" | "exam_ready";
export type StudyCourseKind = "major" | "retake" | "minor";
export type StudySkillKind = "definition" | "theorem" | "proof" | "procedure" | "problem_solving" | "programming" | "graph" | "derivation" | "interpretation" | "other";
export type StudyQuestionType = "recall" | "recognition" | "short_application" | "proof_skeleton" | "problem" | "exam_problem" | "trace" | "implement" | "debug" | "complexity" | "graph" | "derivation" | "interpretation";
export type StudyResourceType = "lecture" | "exercise" | "solution" | "script" | "exam" | "exam_solution" | "reference" | "supplement" | "course_info" | "other";
export type StudySourceAuthority = "official_solution" | "official_course" | "assigned_reference" | "reference" | "ai_generated" | "unknown";
export type StudyProcessingStatus = "new" | "classified" | "archived" | "extracted" | "mapped" | "verified" | "needs_review";
export type StudySessionType = "review" | "coursework" | "checkpoint" | "exam_simulation" | "relearning";
export type StudyWeekHealthStatus = "empty" | "needs_processing" | "source_only" | "learning" | "fragile" | "retained";
export type StudyIntakeStatus = "discovered" | "classified" | "candidate" | "registered" | "needs_review" | "ignored" | "failed";

export type Database = {
  public: {
    Tables: {
      study_semesters: {
        Row: {
          id: string; user_id: string; stable_key: string; display_name: string;
          starts_on: string | null; ends_on: string | null; timezone: string;
          review_daily_budget_minutes: number; weekly_checkpoint_minutes: number;
          active: boolean; created_at: string; updated_at: string;
          drive_root_folder_id: string | null; drive_root_folder_url: string | null;
          drive_inbox_folder_id: string | null; drive_inbox_folder_url: string | null;
          drive_last_scan_at: string | null; drive_last_scan_status: "ok" | "partial" | "error" | null;
          drive_last_scan_note: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["study_semesters"]["Row"]> & { user_id: string; stable_key: string; display_name: string };
        Update: Partial<Database["public"]["Tables"]["study_semesters"]["Row"]>;
        Relationships: [];
      };
      study_courses: {
        Row: {
          id: string; user_id: string; semester_id: string; stable_key: string;
          display_name: string; short_name: string | null; course_kind: StudyCourseKind;
          professor: string | null; credits: number | null; exam_at: string | null;
          exam_duration_minutes: number | null; exam_format: string | null;
          drive_folder_id: string | null; drive_folder_url: string | null; drive_folder_map: Json;
          chatgpt_project_ref: string | null; sort_order: number; active: boolean;
          created_at: string; updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["study_courses"]["Row"]> & { user_id: string; semester_id: string; stable_key: string; display_name: string; course_kind: StudyCourseKind };
        Update: Partial<Database["public"]["Tables"]["study_courses"]["Row"]>;
        Relationships: [];
      };
      study_course_workflow_settings: {
        Row: {
          course_id: string; user_id: string; expected_lectures_per_week: number | null;
          expects_exercise: boolean; expects_solution: boolean;
          lecture_retrieval_target_hours: number; solution_reconcile_target_hours: number;
          checkpoint_weight: number; created_at: string; updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["study_course_workflow_settings"]["Row"]> & { course_id: string; user_id: string };
        Update: Partial<Database["public"]["Tables"]["study_course_workflow_settings"]["Row"]>;
        Relationships: [];
      };
      study_questions: {
        Row: {
          id: string; user_id: string; course_id: string; primary_skill_id: string;
          question_type: StudyQuestionType; evidence_dimension: StudyEvidenceDimension;
          prompt: string; answer_key_or_rubric: string | null; hint_1: string | null; hint_2: string | null;
          difficulty: number; expected_minutes: number; source_confidence: number | null;
          origin: "official" | "generated" | "manual"; active: boolean;
          ingestion_run_id: string | null; version: number; created_at: string; updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["study_questions"]["Row"]> & { user_id: string; course_id: string; primary_skill_id: string; question_type: StudyQuestionType; evidence_dimension: StudyEvidenceDimension; prompt: string };
        Update: Partial<Database["public"]["Tables"]["study_questions"]["Row"]>;
        Relationships: [];
      };
      study_resources: {
        Row: {
          id: string; user_id: string; course_id: string; teaching_week_id: string | null;
          logical_key: string | null; resource_type: StudyResourceType; title: string;
          official_number: string | null; original_filename: string | null; canonical_filename: string | null;
          drive_file_id: string | null; drive_url: string | null; mime_type: string | null;
          published_at: string | null; processed_at: string | null; processing_status: StudyProcessingStatus;
          source_authority: StudySourceAuthority; extraction_confidence: number | null;
          content_sha256: string | null; active: boolean; created_at: string; updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["study_resources"]["Row"]> & { user_id: string; course_id: string; resource_type: StudyResourceType; title: string };
        Update: Partial<Database["public"]["Tables"]["study_resources"]["Row"]>;
        Relationships: [];
      };
      study_ingestion_runs: {
        Row: {
          id: string; user_id: string; course_id: string; resource_id: string;
          status: "queued" | "candidate" | "accepted" | "rejected" | "failed";
          processor: string | null; processor_version: string | null; candidate_payload: Json | null;
          validation_issues: Json; failure_detail: string | null; candidate_at: string | null;
          decided_at: string | null; created_at: string; updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["study_ingestion_runs"]["Row"]> & { user_id: string; course_id: string; resource_id: string };
        Update: Partial<Database["public"]["Tables"]["study_ingestion_runs"]["Row"]>;
        Relationships: [];
      };
      study_intake_items: {
        Row: {
          id: string; user_id: string; semester_id: string; course_id: string | null;
          drive_file_id: string; drive_url: string | null; title: string; mime_type: string | null;
          parent_folder_id: string | null; size_bytes: number | null;
          drive_created_at: string | null; drive_modified_at: string | null;
          detected_resource_type: StudyResourceType | null; detected_week_no: number | null;
          classification_confidence: number | null; status: StudyIntakeStatus;
          resource_id: string | null; ingestion_run_id: string | null; note: string | null;
          first_seen_at: string; last_seen_at: string; processed_at: string | null;
          created_at: string; updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["study_intake_items"]["Row"]> & { user_id: string; semester_id: string; drive_file_id: string; title: string };
        Update: Partial<Database["public"]["Tables"]["study_intake_items"]["Row"]>;
        Relationships: [];
      };
      study_drive_connections: {
        Row: {
          user_id: string; google_account_sub: string | null; google_account_email: string | null; scopes: string[];
          status: "disconnected" | "connected" | "error"; root_folder_id: string | null; root_folder_url: string | null;
          semester_folder_id: string | null; semester_folder_url: string | null; inbox_folder_id: string | null; inbox_folder_url: string | null;
          connected_at: string | null; last_scan_at: string | null; last_scan_status: "ok" | "partial" | "error" | null; last_error: string | null;
          created_at: string; updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["study_drive_connections"]["Row"]> & { user_id: string };
        Update: Partial<Database["public"]["Tables"]["study_drive_connections"]["Row"]>;
        Relationships: [];
      };
      study_drive_credentials: {
        Row: { user_id: string; encrypted_refresh_token: string; encryption_version: number; created_at: string; updated_at: string };
        Insert: Partial<Database["public"]["Tables"]["study_drive_credentials"]["Row"]> & { user_id: string; encrypted_refresh_token: string };
        Update: Partial<Database["public"]["Tables"]["study_drive_credentials"]["Row"]>;
        Relationships: [];
      };
      study_sessions: {
        Row: {
          id: string; user_id: string; course_id: string | null; session_type: StudySessionType;
          planned_minutes: number | null; actual_minutes: number | null; started_at: string;
          ended_at: string | null; note: string | null; created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["study_sessions"]["Row"]> & { user_id: string; session_type: StudySessionType };
        Update: Partial<Database["public"]["Tables"]["study_sessions"]["Row"]>;
        Relationships: [];
      };
    };
    Views: {
      study_course_progress: {
        Row: {
          user_id: string | null; course_id: string | null; semester_id: string | null;
          stable_key: string | null; display_name: string | null; short_name: string | null;
          course_kind: StudyCourseKind | null; sort_order: number | null; exam_at: string | null;
          total_skills: number | null; new_skills: number | null; learning_skills: number | null;
          fragile_skills: number | null; stable_skills: number | null; exam_ready_skills: number | null;
          coverage_percent: number | null; durable_mastery_percent: number | null;
          unverified_resources: number | null; unresolved_errors: number | null; latest_week_no: number | null;
        }; Relationships: [];
      };
      study_due_skills: {
        Row: {
          user_id: string | null; skill_id: string | null; course_id: string | null; semester_id: string | null;
          skill_title: string | null; skill_kind: StudySkillKind | null; exam_importance: number | null;
          prerequisite_importance: number | null; required_dimensions: StudyEvidenceDimension[] | null;
          mastery_state: StudyMasteryState | null; next_review_at: string | null; due_reason: string | null;
          lapse_count: number | null; consecutive_failures: number | null; relearning_until: string | null;
          evidence_floor: number | null; overdue_days: number | null; exam_factor: number | null;
          min_question_minutes: number | null; is_due: boolean | null; priority_score: number | null;
          recall_evidence: number | null; recognition_evidence: number | null; execution_evidence: number | null;
          transfer_evidence: number | null; exam_evidence: number | null;
        }; Relationships: [];
      };
      study_weekly_health: {
        Row: {
          user_id: string | null; course_id: string | null; semester_id: string | null;
          teaching_week_id: string | null; week_no: number | null; course_stable_key: string | null;
          course_display_name: string | null; resource_count: number | null; lecture_count: number | null;
          exercise_count: number | null; solution_count: number | null; verified_resources: number | null;
          pending_resources: number | null; candidate_runs: number | null; skill_count: number | null;
          new_skills: number | null; learning_skills: number | null; fragile_skills: number | null;
          stable_skills: number | null; exam_ready_skills: number | null; due_skills: number | null;
          due_minutes: number | null; unresolved_errors: number | null; expected_lectures_per_week: number | null;
          expects_exercise: boolean | null; expects_solution: boolean | null; health_status: StudyWeekHealthStatus | null;
          lecture_expectation_met: boolean | null; exercise_expectation_met: boolean | null; solution_expectation_met: boolean | null;
        }; Relationships: [];
      };
    };
    Functions: {
      connect_thiepn_app: { Args: { p_app_slug: string }; Returns: Json };
      study_initialize_ws2627: { Args: Record<PropertyKey, never>; Returns: Json };
      study_record_attempt: { Args: { p_question_id: string; p_result: StudyAttemptResult; p_independence: StudyIndependence; p_duration_seconds?: number | null; p_response_text?: string | null; p_self_confidence?: number | null; p_error_types?: StudyErrorType[]; p_completed_at?: string }; Returns: Json };
      study_record_attempt_v2: { Args: { p_request_id: string; p_question_id: string; p_result: StudyAttemptResult; p_independence: StudyIndependence; p_duration_seconds?: number | null; p_response_text?: string | null; p_self_confidence?: number | null; p_error_types?: StudyErrorType[]; p_completed_at?: string }; Returns: Json };
      study_record_attempt_v3: { Args: { p_request_id: string; p_question_id: string; p_result: StudyAttemptResult; p_independence: StudyIndependence; p_session_id?: string | null; p_started_at?: string | null; p_duration_seconds?: number | null; p_response_text?: string | null; p_self_confidence?: number | null; p_error_types?: StudyErrorType[]; p_completed_at?: string }; Returns: Json };
      study_start_review_session: { Args: { p_session_id: string; p_planned_minutes?: number | null; p_started_at?: string }; Returns: Json };
      study_finish_review_session: { Args: { p_session_id: string; p_ended_at?: string; p_note?: string | null }; Returns: Json };
      study_register_resource: { Args: { p_course_id: string; p_resource_type: StudyResourceType; p_title: string; p_drive_file_id?: string | null; p_drive_url?: string | null; p_original_filename?: string | null; p_mime_type?: string | null; p_week_no?: number | null; p_source_authority?: StudySourceAuthority; p_published_at?: string | null; p_content_sha256?: string | null; p_logical_key?: string | null }; Returns: Json };
      study_submit_ingestion_candidate: { Args: { p_run_id: string; p_payload: Json; p_processor?: string | null; p_processor_version?: string | null; p_extraction_confidence?: number | null; p_validation_issues?: Json }; Returns: Json };
      study_accept_ingestion_run: { Args: { p_run_id: string }; Returns: Json };
      study_reject_ingestion_run: { Args: { p_run_id: string; p_reason?: string | null }; Returns: Json };
    };
    Enums: {
      study_attempt_result: StudyAttemptResult; study_independence: StudyIndependence; study_error_type: StudyErrorType;
      study_evidence_dimension: StudyEvidenceDimension; study_mastery_state: StudyMasteryState;
      study_course_kind: StudyCourseKind; study_skill_kind: StudySkillKind; study_question_type: StudyQuestionType;
      study_resource_type: StudyResourceType; study_source_authority: StudySourceAuthority;
      study_processing_status: StudyProcessingStatus; study_session_type: StudySessionType;
    };
    CompositeTypes: Record<string, never>;
  };
};
