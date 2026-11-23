export type Role = 'user' | 'admin';
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface User { id: string; name: string; email: string; role: Role; createdAt: string; }
export interface Product { id: string; name: string; slug: string; description: string; category: string; priceCents: number; stock: number; imageUrl: string; featured: boolean; createdAt: string; updatedAt: string; }
export interface CartItem { product: Product; quantity: number; }
export interface OrderItem { id: string; productId: string; productName: string; quantity: number; unitPriceCents: number; }
export interface Order { id: string; userId: string; customerName: string; customerEmail: string; status: OrderStatus; totalCents: number; shippingAddress: string; createdAt: string; updatedAt: string; items: OrderItem[]; }
export interface ProductInput { name: string; slug: string; description: string; category: string; priceCents: number; stock: number; imageUrl: string; featured: boolean; }

