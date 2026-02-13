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
      };
    };
  };
}
