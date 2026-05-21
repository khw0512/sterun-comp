const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const pool = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

const uploadsDir = path.join(__dirname, '../../uploads/emblems');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `emblem-${req.user.id}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('이미지 파일만 업로드할 수 있습니다 (jpg, png, gif, webp, svg)'));
  },
});

router.post('/upload-emblem', authenticate, requireRole('club_manager'), (req, res, next) => {
  upload.single('emblem')(req, res, err => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: '파일이 없습니다' });
    res.json({ url: `/uploads/emblems/${req.file.filename}` });
  });
});

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT c.*, u.name AS manager_name FROM clubs c JOIN users u ON c.manager_id=u.id ORDER BY c.created_at DESC'
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/my', authenticate, requireRole('club_manager'), async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM clubs WHERE manager_id=$1', [req.user.id]);
    res.json(rows[0] || null);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT c.*, u.name AS manager_name FROM clubs c JOIN users u ON c.manager_id=u.id WHERE c.id=$1',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: '클럽을 찾을 수 없습니다' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, requireRole('club_manager'), async (req, res) => {
  const { name, description, location, image_url } = req.body;
  if (!name) return res.status(400).json({ error: '클럽 이름을 입력해주세요' });
  try {
    const existing = await pool.query('SELECT id FROM clubs WHERE manager_id=$1', [req.user.id]);
    if (existing.rows[0]) return res.status(400).json({ error: '이미 클럽이 있습니다' });
    const { rows } = await pool.query(
      'INSERT INTO clubs (manager_id,name,description,location,image_url) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.user.id, name, description, location, image_url]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, requireRole('club_manager'), async (req, res) => {
  const { name, description, location, image_url } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE clubs SET name=$1,description=$2,location=$3,image_url=$4 WHERE id=$5 AND manager_id=$6 RETURNING *',
      [name, description, location, image_url, req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: '클럽을 찾을 수 없거나 권한이 없습니다' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
