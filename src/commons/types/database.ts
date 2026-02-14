export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: number;
          user_id: string;
          email: string;
          nickname: string;
          household_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          email: string;
          nickname: string;
          household_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          email?: string;
          nickname?: string;
          household_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      households: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      household_members: {
        Row: {
          id: string;
          household_id: string;
          user_id: string;
          role: 'owner' | 'member';
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          user_id: string;
          role?: 'owner' | 'member';
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          user_id?: string;
          role?: 'owner' | 'member';
          created_at?: string;
        };
        Relationships: [];
      };
      household_invites: {
        Row: {
          id: string;
          household_id: string;
          code: string;
          created_by: string;
          expires_at: string;
          max_uses: number;
          use_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          code: string;
          created_by: string;
          expires_at: string;
          max_uses?: number;
          use_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          code?: string;
          created_by?: string;
          expires_at?: string;
          max_uses?: number;
          use_count?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      ingredients: {
        Row: {
          id: string;
          household_id: string;
          user_id: string;
          date: string;
          name: string;
          price: number;
          store: string | null;
          category: string;
          count: number;
          unit: 'count' | 'g';
          linked_fridge_item_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          user_id: string;
          date: string;
          name: string;
          price?: number;
          store?: string | null;
          category?: string;
          count?: number;
          unit?: 'count' | 'g';
          linked_fridge_item_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          user_id?: string;
          date?: string;
          name?: string;
          price?: number;
          store?: string | null;
          category?: string;
          count?: number;
          unit?: 'count' | 'g';
          linked_fridge_item_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      fridge_items: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          total_count: number;
          unit: 'count' | 'g';
          is_subdivided: boolean;
          category: string;
          from_grocery: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          total_count?: number;
          unit?: 'count' | 'g';
          is_subdivided?: boolean;
          category?: string;
          from_grocery?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          name?: string;
          total_count?: number;
          unit?: 'count' | 'g';
          is_subdivided?: boolean;
          category?: string;
          from_grocery?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fridge_item_batches_fridge_item_id_fkey';
            columns: ['id'];
            isOneToOne: false;
            referencedRelation: 'fridge_item_batches';
            referencedColumns: ['fridge_item_id'];
          },
        ];
      };
      fridge_item_batches: {
        Row: {
          id: string;
          fridge_item_id: string;
          quantity: number;
          expiry_date: string | null;
          purchased_date: string;
          memo: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          fridge_item_id: string;
          quantity: number;
          expiry_date?: string | null;
          purchased_date?: string;
          memo?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          fridge_item_id?: string;
          quantity?: number;
          expiry_date?: string | null;
          purchased_date?: string;
          memo?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fridge_item_batches_fridge_item_id_fkey';
            columns: ['fridge_item_id'];
            isOneToOne: false;
            referencedRelation: 'fridge_items';
            referencedColumns: ['id'];
          },
        ];
      };
      meals: {
        Row: {
          id: string;
          household_id: string;
          date: string;
          type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          date: string;
          type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          date?: string;
          type?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      dishes: {
        Row: {
          id: string;
          meal_id: string;
          name: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          meal_id: string;
          name?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          meal_id?: string;
          name?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      dish_ingredients: {
        Row: {
          id: string;
          dish_id: string;
          fridge_item_id: string;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          dish_id: string;
          fridge_item_id: string;
          amount?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          dish_id?: string;
          fridge_item_id?: string;
          amount?: number;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      join_household: {
        Args: { invite_code: string };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
