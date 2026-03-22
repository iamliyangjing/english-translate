export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      cards: {
        Row: {
          id: string;
          user_id: string;
          user_email: string | null;
          source_text: string;
          target_text: string;
          source_lang: string;
          target_lang: string;
          pronunciation: string | null;
          tags: string | null;
          created_at: string;
          updated_at: string;
          next_review_at: string;
          last_grade: number | null;
          review_count: number;
          lapse_count: number;
          ease_factor: number;
          interval_days: number;
          last_reviewed_at: string | null;
        };
        Insert: {
          id: string;
          user_id: string;
          user_email?: string | null;
          source_text: string;
          target_text: string;
          source_lang: string;
          target_lang: string;
          pronunciation?: string | null;
          tags?: string | null;
          created_at?: string;
          updated_at?: string;
          next_review_at?: string;
          last_grade?: number | null;
          review_count?: number;
          lapse_count?: number;
          ease_factor?: number;
          interval_days?: number;
          last_reviewed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["cards"]["Insert"]>;
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          provider: string;
          provider_account_id: string;
          email: string | null;
          name: string | null;
          image: string | null;
          created_at: string;
          updated_at: string;
          last_login_at: string;
        };
        Insert: {
          id: string;
          provider: string;
          provider_account_id: string;
          email?: string | null;
          name?: string | null;
          image?: string | null;
          created_at?: string;
          updated_at?: string;
          last_login_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [];
      };
      model_configs: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          model: string;
          api_endpoint: string | null;
          api_key: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          name: string;
          model: string;
          api_endpoint?: string | null;
          api_key: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["model_configs"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
