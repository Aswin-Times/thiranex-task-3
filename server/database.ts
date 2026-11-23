import bcrypt from 'bcryptjs';
import pg, { type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
import { DataType, newDb } from 'pg-mem';
import { randomUUID } from 'node:crypto';

const { Pool } = pg;

export interface Database {
  query<T extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResult<T>>;
  transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T>;
}

export function createDatabase(connectionString = process.env.DATABASE_URL): Database {
  if (!connectionString) throw new Error('DATABASE_URL is required.');
  let pool: InstanceType<typeof Pool>;
  if (connectionString === 'memory') {
    const memory = newDb();
    memory.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: randomUUID, impure: true });
    const adapter = memory.adapters.createPg();
    pool = new adapter.Pool() as unknown as InstanceType<typeof Pool>;
  } else {
    pool = new Pool({ connectionString, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined });
  }
  return {
    query: (text, values) => pool.query(text, values),
    async transaction(work) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await work(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
  };
}

const seedProducts = [
  ['Arc Task Lamp', 'arc-task-lamp', 'A sculptural steel lamp with warm, focused light and a tactile dimmer.', 'Lighting', 12900, 18, 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=85', true],
  ['Mizu Carafe', 'mizu-carafe', 'Hand-blown borosilicate glass designed for the table and bedside.', 'Tableware', 6800, 26, 'https://images.unsplash.com/photo-1603899122634-f086ca5f5ddd?auto=format&fit=crop&w=1200&q=85', true],
  ['Still Ceramic Set', 'still-ceramic-set', 'A stackable four-piece stoneware set finished in a soft mineral glaze.', 'Tableware', 9400, 14, 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1200&q=85', true],
  ['Fold Magazine Rack', 'fold-magazine-rack', 'Powder-coated steel folded into a quiet home for books and magazines.', 'Storage', 11500, 9, 'https://images.unsplash.com/photo-1540932239986-30128078f3c5?auto=format&fit=crop&w=1200&q=85', false],
  ['Pebble Catchall', 'pebble-catchall', 'Solid ash, gently carved for keys, jewellery, and small everyday objects.', 'Objects', 4500, 35, 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=85', false],
  ['Linen Throw', 'linen-throw', 'Stonewashed European linen with a relaxed texture and generous drape.', 'Textiles', 13800, 12, 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=1200&q=85', true],
  ['Contour Vase', 'contour-vase', 'A weighty ceramic vessel made to hold a single branch or stand alone.', 'Objects', 7600, 20, 'https://images.unsplash.com/photo-1612621681466-9b63c223fb21?auto=format&fit=crop&w=1200&q=85', false],
  ['Form Wall Clock', 'form-wall-clock', 'A silent sweep clock with a crisp face and solid beech frame.', 'Objects', 8900, 16, 'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?auto=format&fit=crop&w=1200&q=85', false]
];

export async function initializeDatabase(database: Database) {
  await database.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      name VARCHAR(80) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      slug VARCHAR(140) UNIQUE NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(60) NOT NULL,
      price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
      stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
      image_url TEXT NOT NULL,
      featured BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id),
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','shipped','delivered','cancelled')),
      total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
      shipping_address TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id UUID PRIMARY KEY,
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id UUID NOT NULL REFERENCES products(id),
      product_name VARCHAR(120) NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0)
    );
    CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders(user_id);
    CREATE INDEX IF NOT EXISTS products_category_idx ON products(category);
  `);

  for (const product of seedProducts) {
    await database.query(
      `INSERT INTO products (id,name,slug,description,category,price_cents,stock,image_url,featured)
       VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (slug) DO NOTHING`, product
    );
  }

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@atelier.local').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'atelier-admin';
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await database.query(
    `INSERT INTO users (id,name,email,password_hash,role) VALUES (gen_random_uuid(),'Atelier Admin',$1,$2,'admin')
     ON CONFLICT (email) DO UPDATE SET role='admin',password_hash=EXCLUDED.password_hash`, [adminEmail, passwordHash]
  );
}

