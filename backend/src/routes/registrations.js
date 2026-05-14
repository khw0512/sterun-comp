const router = require('express').Router();
const pool = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

router.post('/', authenticate, requireRole('guest'), async (req, res) => {
  const { event_id, message } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO registrations (event_id,guest_id,message) VALUES ($1,$2,$3) RETURNING *',
      [event_id, req.user.id, message]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: '이미 신청한 이벤트입니다' });
    res.status(500).json({ error: err.message });
  }
});

router.get('/my', authenticate, requireRole('guest'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.*, e.title AS event_title, e.event_date, e.location AS event_location, c.name AS club_name
      FROM registrations r
      JOIN events e ON r.event_id=e.id
      JOIN clubs c ON e.club_id=c.id
      WHERE r.guest_id=$1
      ORDER BY r.created_at DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/check/:eventId', authenticate, requireRole('guest'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM registrations WHERE event_id=$1 AND guest_id=$2',
      [req.params.eventId, req.user.id]
    );
    res.json(rows[0] || null);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/event/:eventId', authenticate, requireRole('club_manager'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.*, u.name AS guest_name, u.email AS guest_email
      FROM registrations r
      JOIN users u ON r.guest_id=u.id
      JOIN events e ON r.event_id=e.id
      JOIN clubs c ON e.club_id=c.id
      WHERE r.event_id=$1 AND c.manager_id=$2
      ORDER BY r.created_at ASC
    `, [req.params.eventId, req.user.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/status', authenticate, requireRole('club_manager'), async (req, res) => {
  const { status } = req.body;
  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ error: '올바른 상태값이 아닙니다' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(`
      UPDATE registrations AS r SET status=$1
      FROM events AS e, clubs AS c
      WHERE r.event_id=e.id AND e.club_id=c.id AND c.manager_id=$2 AND r.id=$3
      RETURNING r.*, e.title AS event_title, c.name AS club_name
    `, [status, req.user.id, req.params.id]);
    if (!rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: '신청을 찾을 수 없거나 권한이 없습니다' }); }

    const reg = rows[0];
    const label = status === 'approved' ? '승인' : status === 'rejected' ? '거절' : '대기 중으로 변경';
    await client.query(
      'INSERT INTO notifications (user_id,registration_id,message) VALUES ($1,$2,$3)',
      [reg.guest_id, reg.id, `"${reg.event_title}" 이벤트 신청이 ${label}되었습니다.`]
    );
    await client.query('COMMIT');
    res.json(reg);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

router.put('/:id/attendance', authenticate, requireRole('club_manager'), async (req, res) => {
  const { attended } = req.body;
  try {
    const { rows } = await pool.query(`
      UPDATE registrations AS r SET attended=$1
      FROM events AS e, clubs AS c
      WHERE r.event_id=e.id AND e.club_id=c.id AND c.manager_id=$2 AND r.id=$3
      RETURNING r.*
    `, [attended, req.user.id, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: '신청을 찾을 수 없거나 권한이 없습니다' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
