const router = require('express').Router();
const pool = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT e.*, c.name AS club_name, c.id AS club_id,
        COUNT(r.id) FILTER (WHERE r.status != 'rejected') AS registration_count
      FROM events e
      JOIN clubs c ON e.club_id = c.id
      LEFT JOIN registrations r ON e.id = r.event_id
      GROUP BY e.id, c.name, c.id
      ORDER BY e.event_date ASC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/club/:clubId', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT e.*, COUNT(r.id) FILTER (WHERE r.status != 'rejected') AS registration_count
      FROM events e
      LEFT JOIN registrations r ON e.id = r.event_id
      WHERE e.club_id = $1
      GROUP BY e.id
      ORDER BY e.event_date DESC
    `, [req.params.clubId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT e.*, c.name AS club_name, c.description AS club_description,
        c.location AS club_location, c.manager_id,
        COUNT(r.id) FILTER (WHERE r.status != 'rejected') AS registration_count
      FROM events e
      JOIN clubs c ON e.club_id = c.id
      LEFT JOIN registrations r ON e.id = r.event_id
      WHERE e.id = $1
      GROUP BY e.id, c.name, c.description, c.location, c.manager_id
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: '이벤트를 찾을 수 없습니다' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, requireRole('club_manager'), async (req, res) => {
  const { title, description, event_date, location, max_guests, languages } = req.body;
  if (!title || !event_date || !location) return res.status(400).json({ error: '필수 항목을 모두 입력해주세요' });
  try {
    const club = await pool.query('SELECT id FROM clubs WHERE manager_id=$1', [req.user.id]);
    if (!club.rows[0]) return res.status(400).json({ error: '먼저 클럽을 생성해주세요' });
    const { rows } = await pool.query(
      'INSERT INTO events (club_id,title,description,event_date,location,max_guests,languages) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [club.rows[0].id, title, description, event_date, location, max_guests || 20, languages || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, requireRole('club_manager'), async (req, res) => {
  const { title, description, event_date, location, max_guests, languages } = req.body;
  try {
    const { rows } = await pool.query(`
      UPDATE events AS e SET title=$1, description=$2, event_date=$3, location=$4, max_guests=$5, languages=$6
      FROM clubs AS c
      WHERE e.club_id=c.id AND e.id=$7 AND c.manager_id=$8
      RETURNING e.*
    `, [title, description, event_date, location, max_guests, languages || null, req.params.id, req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: '이벤트를 찾을 수 없거나 권한이 없습니다' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, requireRole('club_manager'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      DELETE FROM events AS e USING clubs AS c
      WHERE e.club_id=c.id AND e.id=$1 AND c.manager_id=$2
      RETURNING e.id
    `, [req.params.id, req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: '이벤트를 찾을 수 없거나 권한이 없습니다' });
    res.json({ message: '삭제되었습니다' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
