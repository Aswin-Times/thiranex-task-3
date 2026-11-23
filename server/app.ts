import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { z, ZodError } from 'zod';
import { type AuthRequest, requireAdmin, requireAuth, signToken } from './auth.js';
import type { Database } from './database.js';
import type { OrderRecord, ProductRecord, UserRecord } from './types.js';

const credentialsSchema = z.object({ email: z.string().trim().email().transform((v) => v.toLowerCase()), password: z.string().min(8).max(72) });
const registerSchema = credentialsSchema.extend({ name: z.string().trim().min(2).max(80) });
const productSchema = z.object({
  name: z.string().trim().min(2).max(120), slug: z.string().trim().regex(/^[a-z0-9-]+$/).max(140),
  description: z.string().trim().min(10).max(1000), category: z.string().trim().min(2).max(60),
  priceCents: z.number().int().min(0), stock: z.number().int().min(0), imageUrl: z.string().url(), featured: z.boolean().default(false)
});
const checkoutSchema = z.object({
  shippingAddress: z.string().trim().min(10).max(500),
  items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(20) })).min(1).max(30)
});
const orderStatusSchema = z.object({ status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']) });

function publicUser(user: UserRecord) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.created_at };
}
function productJson(product: ProductRecord) {
  return { id: product.id, name: product.name, slug: product.slug, description: product.description, category: product.category, priceCents: product.price_cents, stock: product.stock, imageUrl: product.image_url, featured: product.featured, createdAt: product.created_at, updatedAt: product.updated_at };
}

export function createApp(database: Database) {
  const app = express();
  app.use(cors({ origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',').map((v) => v.trim()) : true }));
  app.use(express.json({ limit: '200kb' }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  app.post('/api/auth/register', async (req, res) => {
    const input = registerSchema.parse(req.body);
    const existing = await database.query<UserRecord>('SELECT * FROM users WHERE email=$1', [input.email]);
    if (existing.rowCount) return res.status(409).json({ message: 'An account with this email already exists.' });
    const result = await database.query<UserRecord>(
      `INSERT INTO users (id,name,email,password_hash,role) VALUES ($1,$2,$3,$4,'user') RETURNING *`,
      [randomUUID(), input.name, input.email, await bcrypt.hash(input.password, 12)]
    );
    const user = result.rows[0];
    res.status(201).json({ user: publicUser(user), token: signToken(user.id, user.role) });
  });

  app.post('/api/auth/login', async (req, res) => {
    const input = credentialsSchema.parse(req.body);
    const result = await database.query<UserRecord>('SELECT * FROM users WHERE email=$1', [input.email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(input.password, user.password_hash))) return res.status(401).json({ message: 'Email or password is incorrect.' });
    res.json({ user: publicUser(user), token: signToken(user.id, user.role) });
  });

  app.get('/api/auth/me', requireAuth, async (req, res) => {
    const result = await database.query<UserRecord>('SELECT * FROM users WHERE id=$1', [(req as AuthRequest).auth.userId]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Account not found.' });
    res.json({ user: publicUser(result.rows[0]) });
  });

  app.get('/api/products', async (req, res) => {
    const search = String(req.query.search || '').trim();
    const category = String(req.query.category || '').trim();
    const params: unknown[] = [];
    const where: string[] = [];
    if (search) { params.push(`%${search}%`); where.push(`(name ILIKE $${params.length} OR description ILIKE $${params.length})`); }
    if (category && category !== 'All') { params.push(category); where.push(`category = $${params.length}`); }
    const result = await database.query<ProductRecord>(`SELECT * FROM products ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY featured DESC, created_at DESC`, params);
    res.json({ products: result.rows.map(productJson) });
  });

  app.get('/api/products/:id', async (req, res) => {
    const result = await database.query<ProductRecord>('SELECT * FROM products WHERE id=$1 OR slug=$1', [String(req.params.id)]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Product not found.' });
    res.json({ product: productJson(result.rows[0]) });
  });

  app.post('/api/products', requireAuth, requireAdmin, async (req, res) => {
    const input = productSchema.parse(req.body);
    const result = await database.query<ProductRecord>(
      `INSERT INTO products (id,name,slug,description,category,price_cents,stock,image_url,featured) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [randomUUID(), input.name, input.slug, input.description, input.category, input.priceCents, input.stock, input.imageUrl, input.featured]
    );
    res.status(201).json({ product: productJson(result.rows[0]) });
  });

  app.patch('/api/products/:id', requireAuth, requireAdmin, async (req, res) => {
    const input = productSchema.partial().parse(req.body);
    const fields: string[] = []; const values: unknown[] = [];
    const columns: Record<string, string> = { name: 'name', slug: 'slug', description: 'description', category: 'category', priceCents: 'price_cents', stock: 'stock', imageUrl: 'image_url', featured: 'featured' };
    for (const [key, value] of Object.entries(input)) { values.push(value); fields.push(`${columns[key]}=$${values.length}`); }
    if (!fields.length) return res.status(400).json({ message: 'No changes supplied.' });
    values.push(String(req.params.id));
    const result = await database.query<ProductRecord>(`UPDATE products SET ${fields.join(',')},updated_at=NOW() WHERE id=$${values.length} RETURNING *`, values);
    if (!result.rows[0]) return res.status(404).json({ message: 'Product not found.' });
    res.json({ product: productJson(result.rows[0]) });
  });

  app.delete('/api/products/:id', requireAuth, requireAdmin, async (req, res) => {
    const result = await database.query('DELETE FROM products WHERE id=$1', [String(req.params.id)]);
    if (!result.rowCount) return res.status(404).json({ message: 'Product not found.' });
    res.status(204).end();
  });

  app.post('/api/orders', requireAuth, async (req, res) => {
    const input = checkoutSchema.parse(req.body);
    const userId = (req as AuthRequest).auth.userId;
    const orderId = randomUUID();
    await database.transaction(async (client) => {
      let totalCents = 0;
      const products: { product: ProductRecord; quantity: number }[] = [];
      for (const item of input.items) {
        const result = await client.query<ProductRecord>('SELECT * FROM products WHERE id=$1 FOR UPDATE', [item.productId]);
        const product = result.rows[0];
        if (!product) throw Object.assign(new Error('A product in your cart is no longer available.'), { status: 400 });
        if (product.stock < item.quantity) throw Object.assign(new Error(`Only ${product.stock} × ${product.name} remain in stock.`), { status: 409 });
        totalCents += product.price_cents * item.quantity;
        products.push({ product, quantity: item.quantity });
      }
      await client.query(`INSERT INTO orders (id,user_id,total_cents,shipping_address) VALUES ($1,$2,$3,$4)`, [orderId, userId, totalCents, input.shippingAddress]);
      for (const { product, quantity } of products) {
        await client.query(`INSERT INTO order_items (id,order_id,product_id,product_name,quantity,unit_price_cents) VALUES ($1,$2,$3,$4,$5,$6)`, [randomUUID(), orderId, product.id, product.name, quantity, product.price_cents]);
        await client.query('UPDATE products SET stock=$1,updated_at=NOW() WHERE id=$2', [product.stock - quantity, product.id]);
      }
    });
    const order = await fetchOrder(database, orderId);
    res.status(201).json({ order });
  });

  app.get('/api/orders', requireAuth, async (req, res) => {
    const auth = (req as AuthRequest).auth;
    const result = await database.query<OrderRecord>(`SELECT * FROM orders ${auth.role === 'admin' ? '' : 'WHERE user_id=$1'} ORDER BY created_at DESC`, auth.role === 'admin' ? [] : [auth.userId]);
    const orders = await Promise.all(result.rows.map((order) => fetchOrder(database, order.id)));
    res.json({ orders });
  });

  app.patch('/api/orders/:id/status', requireAuth, requireAdmin, async (req, res) => {
    const { status } = orderStatusSchema.parse(req.body);
    const result = await database.query<OrderRecord>('UPDATE orders SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING *', [status, String(req.params.id)]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Order not found.' });
    res.json({ order: await fetchOrder(database, result.rows[0].id) });
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ZodError) return res.status(400).json({ message: error.issues[0]?.message || 'Invalid request.' });
    const known = error as { status?: number; code?: string; message?: string };
    if (known.code === '23505') return res.status(409).json({ message: 'That value is already in use.' });
    if (known.status) return res.status(known.status).json({ message: known.message });
    console.error(error);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  });
  return app;
}

async function fetchOrder(database: Pick<Database, 'query'>, orderId: string) {
  const orderResult = await database.query<OrderRecord>(`SELECT o.*,u.name AS customer_name,u.email AS customer_email FROM orders o JOIN users u ON u.id=o.user_id WHERE o.id=$1`, [orderId]);
  const order = orderResult.rows[0] as OrderRecord & { customer_name: string; customer_email: string };
  if (!order) return null;
  const items = await database.query(`SELECT id,product_id AS "productId",product_name AS "productName",quantity,unit_price_cents AS "unitPriceCents" FROM order_items WHERE order_id=$1`, [orderId]);
  return { id: order.id, userId: order.user_id, customerName: order.customer_name, customerEmail: order.customer_email, status: order.status, totalCents: order.total_cents, shippingAddress: order.shipping_address, createdAt: order.created_at, updatedAt: order.updated_at, items: items.rows };
}

