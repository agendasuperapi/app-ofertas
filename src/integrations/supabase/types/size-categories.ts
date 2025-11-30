// Temporary types for size_categories table until Supabase types are regenerated
export interface SizeCategory {
  id: string;
  store_id: string;
  name: string;
  display_order: number;
  is_active: boolean;
  is_exclusive: boolean;
  min_items: number;
  max_items: number | null;
  created_at: string;
  updated_at: string;
}

export interface SizeCategoryInsert {
  id?: string;
  store_id: string;
  name: string;
  display_order?: number;
  is_active?: boolean;
  is_exclusive?: boolean;
  min_items?: number;
  max_items?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface SizeCategoryUpdate {
  id?: string;
  store_id?: string;
  name?: string;
  display_order?: number;
  is_active?: boolean;
  is_exclusive?: boolean;
  min_items?: number;
  max_items?: number | null;
  created_at?: string;
  updated_at?: string;
}
