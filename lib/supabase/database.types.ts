export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AllergenProfileItem = {
  allergen_id: string;
  severity: 'preference' | 'intolerance' | 'allergy' | 'anaphylaxis';
  sensitive_to_traces: boolean;
};

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          user_id: string;
          display_name: string | null;
          allergens: AllergenProfileItem[] | null;
          country: string;
          quiz_completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          display_name?: string | null;
          allergens?: AllergenProfileItem[] | null;
          country?: string;
          quiz_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          display_name?: string | null;
          allergens?: AllergenProfileItem[] | null;
          country?: string;
          quiz_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      products: {
        Row: {
          barcode: string;
          name: string | null;
          brand: string | null;
          image_url: string | null;
          ingredients_text: string | null;
          allergens_tags: string[];
          traces_tags: string[];
          labels_tags: string[];
          additives_tags: string[];
          raw_off_data: Json | null;
          last_fetched_at: string;
          manual_overrides: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          barcode: string;
          name?: string | null;
          brand?: string | null;
          image_url?: string | null;
          ingredients_text?: string | null;
          allergens_tags?: string[];
          traces_tags?: string[];
          labels_tags?: string[];
          additives_tags?: string[];
          raw_off_data?: Json | null;
          last_fetched_at?: string;
          manual_overrides?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          barcode?: string;
          name?: string | null;
          brand?: string | null;
          image_url?: string | null;
          ingredients_text?: string | null;
          allergens_tags?: string[];
          traces_tags?: string[];
          labels_tags?: string[];
          additives_tags?: string[];
          raw_off_data?: Json | null;
          last_fetched_at?: string;
          manual_overrides?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      saved_products: {
        Row: {
          id: string;
          user_id: string;
          product_barcode: string;
          saved_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_barcode: string;
          saved_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_barcode?: string;
          saved_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_products_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_products_product_barcode_fkey";
            columns: ["product_barcode"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["barcode"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
