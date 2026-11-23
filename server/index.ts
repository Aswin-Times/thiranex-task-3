import { resolve } from 'node:path';
import express from 'express';
import { createApp } from './app.js';
import { createDatabase, initializeDatabase } from './database.js';

const port = Number(process.env.PORT) || 4000;
const database = createDatabase();
await initializeDatabase(database);
const app = createApp(database);

if (process.env.NODE_ENV === 'production') {
  const clientPath = resolve('dist');
  app.use(express.static(clientPath));
  app.use((_req, res) => res.sendFile(resolve(clientPath, 'index.html')));
}

app.listen(port, () => console.log(`Atelier running at http://localhost:${port}`));

