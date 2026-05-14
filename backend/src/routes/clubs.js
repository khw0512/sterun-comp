const router = require('express').Router();
const pool = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

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
