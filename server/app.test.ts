import { randomUUID } from 'node:crypto';
import { DataType, newDb } from 'pg-mem';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { initializeDatabase, type Database } from './database.js';

async function testDatabase(): Promise<Database> {
  const memory = newDb();
  memory.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: randomUUID, impure: true });
  const adapter = memory.adapters.createPg();
  const pool = new adapter.Pool();
  const database: Database = {
    query: (text, values) => pool.query(text, values),
    async transaction(work) {
      const client = await pool.connect();
      try { await client.query('BEGIN'); const result = await work(client as never); await client.query('COMMIT'); return result; }
      catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    }
  };
  await initializeDatabase(database);
  return database;
}

describe('commerce API', () => {
  let database: Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    process.env.ADMIN_EMAIL = 'admin@atelier.local';
    process.env.ADMIN_PASSWORD = 'atelier-admin';
    database = await testDatabase();
    app = createApp(database);
  });

  async function register() {
    return request(app).post('/api/auth/register').send({ name: 'Maya Chen', email: 'maya@example.com', password: 'strong-password' });
  }

  it('registers users and protects admin product management', async () => {
    const user = await register();
    expect(user.status).toBe(201);
    expect(user.body.user).toMatchObject({ name: 'Maya Chen', role: 'user' });
    expect((await request(app).post('/api/products').set('Authorization', `Bearer ${user.body.token}`).send({})).status).toBe(403);

    const admin = await request(app).post('/api/auth/login').send({ email: 'admin@atelier.local', password: 'atelier-admin' });
    expect(admin.body.user.role).toBe('admin');
    const created = await request(app).post('/api/products').set('Authorization', `Bearer ${admin.body.token}`).send({
      name: 'Oak Book Stand', slug: 'oak-book-stand', description: 'A solid oak stand for books and tablets.', category: 'Objects',
      priceCents: 5900, stock: 8, imageUrl: 'https://example.com/product.jpg', featured: false
    });
    expect(created.status).toBe(201);
  });

  it('lists products and completes a stock-aware checkout', async () => {
    const user = await register();
    const products = await request(app).get('/api/products');
    expect(products.body.products.length).toBeGreaterThan(5);
    const product = products.body.products[0];

    const order = await request(app).post('/api/orders').set('Authorization', `Bearer ${user.body.token}`).send({
      shippingAddress: '21 Market Street, Bengaluru, Karnataka 560001',
      items: [{ productId: product.id, quantity: 2 }]
    });
    expect(order.status).toBe(201);
    expect(order.body.order.totalCents).toBe(product.priceCents * 2);

    const history = await request(app).get('/api/orders').set('Authorization', `Bearer ${user.body.token}`);
    expect(history.body.orders).toHaveLength(1);
    expect(history.body.orders[0].items[0].quantity).toBe(2);
  });

  it('lets admins track orders and rejects invalid requests', async () => {
    expect((await request(app).get('/api/orders')).status).toBe(401);
    expect((await request(app).post('/api/auth/register').send({ name: 'M', email: 'bad', password: 'short' })).status).toBe(400);

    const admin = await request(app).post('/api/auth/login').send({ email: 'admin@atelier.local', password: 'atelier-admin' });
    const orders = await request(app).get('/api/orders').set('Authorization', `Bearer ${admin.body.token}`);
    expect(orders.status).toBe(200);
  });
});

