export type Role = 'user' | 'admin';
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  created_at: Date;
}

export interface ProductRecord {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  price_cents: number;
  stock: number;
  image_url: string;
  featured: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface OrderRecord {
  id: string;
  user_id: string;
  status: OrderStatus;
  total_cents: number;
  shipping_address: string;
  created_at: Date;
  updated_at: Date;
}

