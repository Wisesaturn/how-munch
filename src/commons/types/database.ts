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
      ingredient_categories: {
        Row: {
          id: string;
          household_id: string | null;
          code: string;
          name: string;
          emoji_unicode: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id?: string | null;
          code: string;
          name: string;
          emoji_unicode: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string | null;
          code?: string;
          name?: string;
          emoji_unicode?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ingredient_categories_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
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
          category_id: string;
          count: number;
          unit: 'count' | 'g' | 'kg';
          linked_fridge_item_id: string | null;
          linked_fridge_batch_id: string | null;
          deleted_at: string | null;
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
          category_id?: string;
          count?: number;
          unit?: 'count' | 'g' | 'kg';
          linked_fridge_item_id?: string | null;
          linked_fridge_batch_id?: string | null;
          deleted_at?: string | null;
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
          category_id?: string;
          count?: number;
          unit?: 'count' | 'g' | 'kg';
          linked_fridge_item_id?: string | null;
          linked_fridge_batch_id?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ingredients_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'ingredient_categories';
            referencedColumns: ['id'];
          },
        ];
      };
      fridge_items: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          total_count: number;
          max_count: number;
          unit: 'count' | 'g' | 'kg';
          is_subdivided: boolean;
          category_id: string;
          from_grocery: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          total_count?: number;
          max_count?: number;
          unit?: 'count' | 'g' | 'kg';
          is_subdivided?: boolean;
          category_id?: string;
          from_grocery?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          name?: string;
          total_count?: number;
          max_count?: number;
          unit?: 'count' | 'g' | 'kg';
          is_subdivided?: boolean;
          category_id?: string;
          from_grocery?: boolean;
          deleted_at?: string | null;
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
          {
            foreignKeyName: 'fridge_items_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'ingredient_categories';
            referencedColumns: ['id'];
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
          deleted_at: string | null;
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
          deleted_at?: string | null;
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
          deleted_at?: string | null;
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
      meal_batch_usages: {
        Row: {
          id: string;
          meal_id: string;
          fridge_item_id: string;
          batch_id: string;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          meal_id: string;
          fridge_item_id: string;
          batch_id: string;
          amount?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          meal_id?: string;
          fridge_item_id?: string;
          batch_id?: string;
          amount?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          household_id: string;
          type: string;
          title: string;
          description: string;
          payload: Json;
          scheduled_at: string | null;
          sent_at: string;
          push_sent_at: string | null;
          read_at: string | null;
          status: 'pending' | 'sent' | 'read' | 'canceled';
          dedupe_key: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          household_id: string;
          type?: string;
          title: string;
          description: string;
          payload?: Json;
          scheduled_at?: string | null;
          sent_at?: string;
          push_sent_at?: string | null;
          read_at?: string | null;
          status?: 'pending' | 'sent' | 'read' | 'canceled';
          dedupe_key: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          household_id?: string;
          type?: string;
          title?: string;
          description?: string;
          payload?: Json;
          scheduled_at?: string | null;
          sent_at?: string;
          push_sent_at?: string | null;
          read_at?: string | null;
          status?: 'pending' | 'sent' | 'read' | 'canceled';
          dedupe_key?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notification_push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          user_id: string;
          expiry_soon_enabled: boolean;
          expiry_remind_days: number[];
          is_permission_asked: boolean;
          quiet_hours_start: string | null;
          quiet_hours_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          expiry_soon_enabled?: boolean;
          expiry_remind_days?: number[];
          is_permission_asked?: boolean;
          quiet_hours_start?: string | null;
          quiet_hours_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          expiry_soon_enabled?: boolean;
          expiry_remind_days?: number[];
          is_permission_asked?: boolean;
          quiet_hours_start?: string | null;
          quiet_hours_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      fridge_preferences: {
        Row: {
          user_id: string;
          hide_depleted_fridge_items: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          hide_depleted_fridge_items?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          hide_depleted_fridge_items?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_ingredient_with_fridge: {
        Args: {
          p_household_id: string;
          p_name: string;
          p_price?: number;
          p_store?: string | null;
          p_category_id?: string;
          p_count?: number;
          p_unit?: string;
          p_date?: string;
        };
        Returns: {
          id: string;
          household_id: string;
          user_id: string;
          date: string;
          name: string;
          price: number;
          store: string | null;
          category_id: string;
          count: number;
          unit: 'count' | 'g' | 'kg';
          linked_fridge_item_id: string | null;
          linked_fridge_batch_id: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      create_household_with_owner: {
        Args: { p_name: string };
        Returns: string;
      };
      create_fridge_item_with_batch: {
        Args: {
          p_household_id: string;
          p_name: string;
          p_category_id?: string;
          p_unit?: string;
          p_is_subdivided?: boolean;
          p_from_grocery?: boolean;
          p_quantity?: number;
          p_purchased_date?: string;
          p_expiry_date?: string | null;
          p_memo?: string | null;
        };
        Returns: {
          id: string;
          household_id: string;
          name: string;
          total_count: number;
          max_count: number;
          unit: 'count' | 'g' | 'kg';
          is_subdivided: boolean;
          category_id: string;
          from_grocery: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      delete_ingredient_with_cleanup: {
        Args: { p_ingredient_id: string };
        Returns: undefined;
      };
      delete_meal_with_usage_restore: {
        Args: { p_meal_id: string };
        Returns: undefined;
      };
      delete_my_account: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      ensure_current_user_household_member: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
      deactivate_push_subscription_by_endpoint: {
        Args: { p_endpoint: string };
        Returns: boolean;
      };
      get_fridge_items_with_active_batches: {
        Args: { p_household_id: string; p_search_keyword?: string | null };
        Returns: Json[];
      };
      get_pending_push_notifications: {
        Args: { p_limit?: number };
        Returns: {
          notification_id: string;
          user_id: string;
          title: string;
          description: string;
          endpoint: string;
          p256dh: string;
          auth: string;
        }[];
      };
      get_invite_household: {
        Args: { invite_code: string };
        Returns: {
          household_id: string;
          household_name: string;
          expires_at: string;
          max_uses: number;
          use_count: number;
          is_valid: boolean;
        }[];
      };
      generate_expiry_soon_notifications: {
        Args: { p_target_date?: string };
        Returns: number;
      };
      join_household: {
        Args: { invite_code: string };
        Returns: string;
      };
      leave_household: {
        Args: { p_household_id: string };
        Returns: undefined;
      };
      mark_notifications_push_sent: {
        Args: { p_ids: string[] };
        Returns: number;
      };
      resolve_ingredient_category_id: {
        Args: { p_household_id: string | null; p_category_code: string };
        Returns: string;
      };
      soft_delete_fridge_item: {
        Args: { p_fridge_item_id: string };
        Returns: undefined;
      };
      soft_delete_fridge_batch: {
        Args: { p_batch_id: string };
        Returns: undefined;
      };
      soft_delete_ingredient: {
        Args: { p_ingredient_id: string };
        Returns: undefined;
      };
      update_ingredient_with_fridge: {
        Args: { p_ingredient_id: string; p_updates?: Json };
        Returns: {
          id: string;
          household_id: string;
          user_id: string;
          date: string;
          name: string;
          price: number;
          store: string | null;
          category_id: string;
          count: number;
          unit: 'count' | 'g' | 'kg';
          linked_fridge_item_id: string | null;
          linked_fridge_batch_id: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      update_fridge_batch_guarded: {
        Args: { p_batch_id: string; p_updates?: Json };
        Returns: {
          id: string;
          fridge_item_id: string;
          quantity: number;
          expiry_date: string | null;
          purchased_date: string;
          memo: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      upsert_meal_with_usage: {
        Args: { p_household_id: string; p_date: string; p_type: string; p_dishes?: Json };
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
