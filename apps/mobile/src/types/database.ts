export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>, Relationships = []> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationships;
};

export type Database = {
  public: {
    Tables: {
      categories: Table<{
        id: string;
        name: string;
        sort_order: number;
        active: boolean;
        created_at: string;
      }>;
      loyalty_accounts: Table<{
        id: string;
        user_id: string;
        points_balance: number;
        lifetime_points: number;
        created_at: string;
      }>;
      loyalty_settings: Table<{
        id: number;
        points_percentage: number;
        qr_expiration_minutes: number;
        updated_at: string;
      }>;
      point_transactions: Table<{
        id: string;
        user_id: string;
        type: 'purchase' | 'reward' | 'adjustment' | 'promotion';
        points: number;
        description: string | null;
        created_at: string;
      }>;
      products: Table<{
        id: string;
        category_id: string;
        name: string;
        description: string | null;
        price: number;
        image_url: string | null;
        active: boolean;
        created_at: string;
      }, Partial<{
        id: string;
        category_id: string;
        name: string;
        description: string | null;
        price: number;
        image_url: string | null;
        active: boolean;
        created_at: string;
      }>, Partial<{
        id: string;
        category_id: string;
        name: string;
        description: string | null;
        price: number;
        image_url: string | null;
        active: boolean;
        created_at: string;
      }>, [{
        foreignKeyName: 'products_category_id_fkey';
        columns: ['category_id'];
        isOneToOne: false;
        referencedRelation: 'categories';
        referencedColumns: ['id'];
      }] >;
      profiles: Table<{
        id: string;
        name: string | null;
        phone: string | null;
        birthday: string | null;
        created_at: string;
      }>;
      qr_tokens: Table<{
        id: string;
        token: string;
        points: number;
        purchase_amount: number | null;
        description: string | null;
        expires_at: string;
        redeemed_at: string | null;
        redeemed_by: string | null;
        created_at: string;
      }>;
      reward_redemptions: Table<{
        id: string;
        user_id: string;
        reward_id: string;
        points_spent: number;
        status: 'pending' | 'used' | 'cancelled';
        created_at: string;
        used_at: string | null;
      }, Partial<{
        id: string;
        user_id: string;
        reward_id: string;
        points_spent: number;
        status: 'pending' | 'used' | 'cancelled';
        created_at: string;
        used_at: string | null;
      }>, Partial<{
        id: string;
        user_id: string;
        reward_id: string;
        points_spent: number;
        status: 'pending' | 'used' | 'cancelled';
        created_at: string;
        used_at: string | null;
      }>, [{
        foreignKeyName: 'reward_redemptions_reward_id_fkey';
        columns: ['reward_id'];
        isOneToOne: false;
        referencedRelation: 'rewards';
        referencedColumns: ['id'];
      }] >;
      rewards: Table<{
        id: string;
        name: string;
        description: string | null;
        points_required: number;
        active: boolean;
        created_at: string;
      }>;
      staff_members: Table<{
        user_id: string;
        role: 'employee' | 'admin';
        active: boolean;
        created_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      add_points: {
        Args: { p_user_id: string; p_points: number; p_description?: string };
        Returns: undefined;
      };
      create_purchase_qr: {
        Args: { p_purchase_amount: number };
        Returns: {
          token: string;
          points: number;
          purchase_amount: number;
          expires_at: string;
        }[];
      };
      redeem_qr: {
        Args: { p_token: string };
        Returns: number;
      };
      redeem_reward: {
        Args: { p_reward_id: string };
        Returns: string;
      };
      use_reward: {
        Args: { p_redemption_id: string };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<TableName extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][TableName]['Row'];
