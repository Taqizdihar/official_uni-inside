import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'uni-inside-cms-secret-key-2026';

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// Middleware
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// Auth middleware
function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token required' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string };
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ==================== AUTH ====================

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username) as any;
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { id: user.id, username: user.username, displayName: user.display_name } });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = (req as any).user;
  res.json({ id: user.id, username: user.username });
});

// ==================== DASHBOARD ====================

app.get('/api/dashboard/stats', authMiddleware, (_req, res) => {
  const promptCount = (db.prepare('SELECT COUNT(*) as count FROM prompt_gallery').get() as any).count;
  const newsCount = (db.prepare('SELECT COUNT(*) as count FROM news').get() as any).count;
  const teamCount = (db.prepare('SELECT COUNT(*) as count FROM team_members').get() as any).count;
  res.json({ prompts: promptCount, news: newsCount, team: teamCount });
});

// ==================== PROMPT GALLERY CRUD ====================

app.get('/api/prompts', authMiddleware, (_req, res) => {
  const prompts = db.prepare('SELECT * FROM prompt_gallery ORDER BY sort_order ASC, created_at DESC').all();
  res.json(prompts.map((p: any) => ({ ...p, tags: JSON.parse(p.tags || '[]') })));
});

app.get('/api/prompts/:id', authMiddleware, (req, res) => {
  const prompt = db.prepare('SELECT * FROM prompt_gallery WHERE id = ?').get(req.params.id) as any;
  if (!prompt) return res.status(404).json({ error: 'Not found' });
  res.json({ ...prompt, tags: JSON.parse(prompt.tags || '[]') });
});

app.post('/api/prompts', authMiddleware, upload.single('image'), (req, res) => {
  const { title, category, type, orientation, aspect_ratio, prompt, negative_prompt, model, seed, tags, video_src, duration } = req.body;
  const id = 'pg-' + Date.now();
  const src = req.file ? '/uploads/' + req.file.filename : (req.body.src || '');
  const maxOrder = (db.prepare('SELECT MAX(sort_order) as max FROM prompt_gallery').get() as any).max || 0;

  db.prepare(`
    INSERT INTO prompt_gallery (id, title, category, type, orientation, aspect_ratio, prompt, negative_prompt, model, seed, src, video_src, duration, tags, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, title, category, type || 'photo', orientation || 'portrait', aspect_ratio || '9:16', prompt, negative_prompt || null, model, seed, src, video_src || null, duration || null, JSON.stringify(JSON.parse(tags || '[]')), maxOrder + 1);

  res.status(201).json({ id, message: 'Prompt created' });
});

app.put('/api/prompts/:id', authMiddleware, upload.single('image'), (req, res) => {
  const { title, category, type, orientation, aspect_ratio, prompt, negative_prompt, model, seed, tags, video_src, duration } = req.body;
  const existing = db.prepare('SELECT * FROM prompt_gallery WHERE id = ?').get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const src = req.file ? '/uploads/' + req.file.filename : (req.body.src || existing.src);

  db.prepare(`
    UPDATE prompt_gallery SET title=?, category=?, type=?, orientation=?, aspect_ratio=?, prompt=?, negative_prompt=?, model=?, seed=?, src=?, video_src=?, duration=?, tags=?, updated_at=datetime('now')
    WHERE id=?
  `).run(title, category, type || 'photo', orientation || 'portrait', aspect_ratio || '9:16', prompt, negative_prompt || null, model, seed, src, video_src || null, duration || null, JSON.stringify(JSON.parse(tags || '[]')), req.params.id);

  res.json({ message: 'Prompt updated' });
});

app.delete('/api/prompts/:id', authMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM prompt_gallery WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Prompt deleted' });
});

// ==================== NEWS CRUD ====================

app.get('/api/news', authMiddleware, (_req, res) => {
  const news = db.prepare('SELECT * FROM news ORDER BY sort_order ASC, created_at DESC').all();
  res.json(news);
});

app.get('/api/news/:id', authMiddleware, (req, res) => {
  const article = db.prepare('SELECT * FROM news WHERE id = ?').get(req.params.id);
  if (!article) return res.status(404).json({ error: 'Not found' });
  res.json(article);
});

app.post('/api/news', authMiddleware, upload.single('thumbnail'), (req, res) => {
  const { title, description, category, author, date, reading_time, featured } = req.body;
  const id = 'news-' + Date.now();
  const thumbnail = req.file ? '/uploads/' + req.file.filename : (req.body.thumbnail || '');
  const maxOrder = (db.prepare('SELECT MAX(sort_order) as max FROM news').get() as any).max || 0;

  db.prepare(`
    INSERT INTO news (id, title, description, category, author, date, thumbnail, reading_time, featured, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, title, description, category, author, date, thumbnail, reading_time || '5 min', featured === 'true' || featured === '1' ? 1 : 0, maxOrder + 1);

  res.status(201).json({ id, message: 'News created' });
});

app.put('/api/news/:id', authMiddleware, upload.single('thumbnail'), (req, res) => {
  const { title, description, category, author, date, reading_time, featured } = req.body;
  const existing = db.prepare('SELECT * FROM news WHERE id = ?').get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const thumbnail = req.file ? '/uploads/' + req.file.filename : (req.body.thumbnail || existing.thumbnail);

  db.prepare(`
    UPDATE news SET title=?, description=?, category=?, author=?, date=?, thumbnail=?, reading_time=?, featured=?, updated_at=datetime('now')
    WHERE id=?
  `).run(title, description, category, author, date, thumbnail, reading_time || '5 min', featured === 'true' || featured === '1' ? 1 : 0, req.params.id);

  res.json({ message: 'News updated' });
});

app.delete('/api/news/:id', authMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM news WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'News deleted' });
});

// ==================== TEAM MEMBERS CRUD ====================

app.get('/api/team', authMiddleware, (_req, res) => {
  const team = db.prepare('SELECT * FROM team_members ORDER BY sort_order ASC').all();
  res.json(team);
});

app.post('/api/team', authMiddleware, upload.single('image'), (req, res) => {
  const { name, role } = req.body;
  const image = req.file ? '/uploads/' + req.file.filename : (req.body.image || '');
  const maxOrder = (db.prepare('SELECT MAX(sort_order) as max FROM team_members').get() as any).max || 0;

  const result = db.prepare('INSERT INTO team_members (name, role, image, sort_order) VALUES (?, ?, ?, ?)').run(name, role, image, maxOrder + 1);

  res.status(201).json({ id: result.lastInsertRowid, message: 'Team member added' });
});

app.put('/api/team/:id', authMiddleware, upload.single('image'), (req, res) => {
  const { name, role } = req.body;
  const existing = db.prepare('SELECT * FROM team_members WHERE id = ?').get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const image = req.file ? '/uploads/' + req.file.filename : (req.body.image || existing.image);

  db.prepare('UPDATE team_members SET name=?, role=?, image=?, updated_at=datetime(\'now\') WHERE id=?').run(name, role, image, req.params.id);

  res.json({ message: 'Team member updated' });
});

app.delete('/api/team/:id', authMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM team_members WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Team member deleted' });
});

// ==================== FILE UPLOAD ====================

app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: '/uploads/' + req.file.filename, filename: req.file.filename });
});

// ==================== PUBLIC API (for frontend) ====================

app.get('/api/public/prompts', (_req, res) => {
  const prompts = db.prepare('SELECT * FROM prompt_gallery ORDER BY sort_order ASC, created_at DESC').all();
  res.json(prompts.map((p: any) => ({ ...p, tags: JSON.parse(p.tags || '[]') })));
});

app.get('/api/public/news', (_req, res) => {
  const news = db.prepare('SELECT * FROM news ORDER BY sort_order ASC, created_at DESC').all();
  res.json(news);
});

app.get('/api/public/team', (_req, res) => {
  const team = db.prepare('SELECT * FROM team_members ORDER BY sort_order ASC').all();
  res.json(team);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 CMS API Server running at http://localhost:${PORT}`);
  console.log(`📦 Database: ${path.join(__dirname, '..', 'data', 'cms.db')}`);
});
