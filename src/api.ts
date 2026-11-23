import type { Order, OrderStatus, Product, ProductInput, User } from './types';

const TOKEN_KEY = 'atelier_session';
export const session = { get: () => localStorage.getItem(TOKEN_KEY), set: (token: string) => localStorage.setItem(TOKEN_KEY, token), clear: () => localStorage.removeItem(TOKEN_KEY) };

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = session.get();
  const response = await fetch(`/api${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
  if (!response.ok) { const body = await response.json().catch(() => ({ message: 'Request failed.' })); throw new Error(body.message || 'Request failed.'); }
  return response.status === 204 ? undefined as T : response.json();
}

export const client = {
  register: (input: { name: string; email: string; password: string }) => api<{ user: User; token: string }>('/auth/register', { method: 'POST', body: JSON.stringify(input) }),
  login: (input: { email: string; password: string }) => api<{ user: User; token: string }>('/auth/login', { method: 'POST', body: JSON.stringify(input) }),
  me: () => api<{ user: User }>('/auth/me'),
  products: () => api<{ products: Product[] }>('/products'),
  createProduct: (input: ProductInput) => api<{ product: Product }>('/products', { method: 'POST', body: JSON.stringify(input) }),
  updateProduct: (id: string, input: Partial<ProductInput>) => api<{ product: Product }>(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteProduct: (id: string) => api<void>(`/products/${id}`, { method: 'DELETE' }),
  orders: () => api<{ orders: Order[] }>('/orders'),
  checkout: (input: { shippingAddress: string; items: { productId: string; quantity: number }[] }) => api<{ order: Order }>('/orders', { method: 'POST', body: JSON.stringify(input) }),
  updateOrder: (id: string, status: OrderStatus) => api<{ order: Order }>(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
};

export const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

