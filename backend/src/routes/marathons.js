const router = require('express').Router();
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT m.*, u.name AS creator_name,
        COUNT(DISTINCT mc.id) AS category_count,
        COUNT(DISTINCT mp.id) AS participant_count
      FROM marathons m
      JOIN users u ON m.creator_id = u.id
      LEFT JOIN marathon_categories mc ON mc.marathon_id = m.id
      LEFT JOIN marathon_participants mp ON mp.marathon_id = m.id
      GROUP BY m.id, u.name
      ORDER BY m.marathon_date ASC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const m = await pool.query(`
      SELECT m.*, u.name AS creator_name
      FROM marathons m JOIN users u ON m.creator_id = u.id
      WHERE m.id = $1
    `, [req.params.id]);
    if (!m.rows[0]) return res.status(404).json({ error: '마라톤을 찾을 수 없습니다' });

    const categories = await pool.query(`
      SELECT mc.*, COUNT(mp.id) AS participant_count
      FROM marathon_categories mc
      LEFT JOIN marathon_participants mp ON mp.category_id = mc.id
      WHERE mc.marathon_id = $1
      GROUP BY mc.id
      ORDER BY mc.distance_km DESC NULLS LAST, mc.id ASC
    `, [req.params.id]);

    res.json({ ...m.rows[0], categories: categories.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, async (req, res) => {
  const { name, is_domestic, country, city, marathon_date, description, website_url, categories } = req.body;
  if (!name || !country || !marathon_date) return res.status(400).json({ error: '필수 항목을 모두 입력해주세요' });
  if (!Array.isArray(categories) || categories.filter(c => c?.name?.trim()).length === 0) {
    return res.status(400).json({ error: '최소 1개 이상의 거리 카테고리를 입력해주세요' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO marathons (creator_id,name,is_domestic,country,city,marathon_date,description,website_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.user.id, name, is_domestic !== false, country, city || null, marathon_date, description || null, website_url || null]
    );
    const marathon = rows[0];
    const insertedCategories = [];
    for (const c of categories) {
      if (!c?.name?.trim()) continue;
      const { rows: catRows } = await client.query(
        'INSERT INTO marathon_categories (marathon_id,name,distance_km) VALUES ($1,$2,$3) RETURNING *',
        [marathon.id, c.name.trim(), c.distance_km || null]
      );
      insertedCategories.push(catRows[0]);
    }
    await client.query('COMMIT');
    res.status(201).json({ ...marathon, categories: insertedCategories });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

router.put('/:id', authenticate, async (req, res) => {
  const { name, is_domestic, country, city, marathon_date, description, website_url } = req.body;
  if (!name || !country || !marathon_date) return res.status(400).json({ error: '필수 항목을 모두 입력해주세요' });
  try {
    const { rows } = await pool.query(
      `UPDATE marathons SET name=$1, is_domestic=$2, country=$3, city=$4, marathon_date=$5, description=$6, website_url=$7
       WHERE id=$8 AND creator_id=$9 RETURNING *`,
      [name, is_domestic !== false, country, city || null, marathon_date, description || null, website_url || null, req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: '마라톤을 찾을 수 없거나 권한이 없습니다' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM marathons WHERE id=$1 AND creator_id=$2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: '마라톤을 찾을 수 없거나 권한이 없습니다' });
    res.json({ message: '삭제되었습니다' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/categories', authenticate, async (req, res) => {
  const { name, distance_km } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: '카테고리 이름을 입력해주세요' });
  try {
    const marathon = await pool.query('SELECT id FROM marathons WHERE id=$1 AND creator_id=$2', [req.params.id, req.user.id]);
    if (!marathon.rows[0]) return res.status(404).json({ error: '마라톤을 찾을 수 없거나 권한이 없습니다' });
    const { rows } = await pool.query(
      'INSERT INTO marathon_categories (marathon_id,name,distance_km) VALUES ($1,$2,$3) RETURNING *',
      [req.params.id, name.trim(), distance_km || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id/categories/:catId', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      DELETE FROM marathon_categories AS mc USING marathons AS m
      WHERE mc.marathon_id=m.id AND mc.id=$1 AND m.id=$2 AND m.creator_id=$3
      RETURNING mc.id
    `, [req.params.catId, req.params.id, req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: '카테고리를 찾을 수 없거나 권한이 없습니다' });
    res.json({ message: '삭제되었습니다' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/participants', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT mp.id, mp.category_id, mp.message, mp.created_at, u.name AS user_name, mc.name AS category_name
      FROM marathon_participants mp
      JOIN users u ON mp.user_id = u.id
      JOIN marathon_categories mc ON mp.category_id = mc.id
      WHERE mp.marathon_id = $1
      ORDER BY mp.created_at ASC
    `, [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/participants/me', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM marathon_participants WHERE marathon_id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );
    res.json(rows[0] || null);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/participants', authenticate, async (req, res) => {
  const { category_id, message } = req.body;
  if (!category_id) return res.status(400).json({ error: '참가할 거리 카테고리를 선택해주세요' });
  try {
    const cat = await pool.query('SELECT id FROM marathon_categories WHERE id=$1 AND marathon_id=$2', [category_id, req.params.id]);
    if (!cat.rows[0]) return res.status(400).json({ error: '유효하지 않은 카테고리입니다' });
    const { rows } = await pool.query(
      'INSERT INTO marathon_participants (marathon_id,category_id,user_id,message) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.params.id, category_id, req.user.id, message || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: '이미 참가 신청한 마라톤입니다' });
    res.status(500).json({ error: err.message });
  }
});

router.delete('/participants/:participantId', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM marathon_participants WHERE id=$1 AND user_id=$2 RETURNING id',
      [req.params.participantId, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: '참가 신청을 찾을 수 없습니다' });
    res.json({ message: '참가가 취소되었습니다' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
