export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          user_id: string;
          display_name: string | null;
          allergens: {
            allergen_id: string;
            severity: 'preference' | 'intolerance' | 'allergy' | 'anaphylaxis';
            sensitive_to_traces: boolean;
          }[];
          country: string;
          quiz_completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          display_name?: string | null;
          allergens?: {
            allergen_id: string;
            severity: 'preference' | 'intolerance' | 'allergy' | 'anaphylaxis';
            sensitive_to_traces: boolean;
          }[];
          country?: string;
          quiz_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          display_name?: string | null;
          allergens?: {
            allergen_id: string;
            severity: 'preference' | 'intolerance' | 'allergy' | 'anaphylaxis';
            sensitive_to_traces: boolean;
          }[];
          country?: string;
          quiz_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
