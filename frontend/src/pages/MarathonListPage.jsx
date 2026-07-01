import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';

function toLocalDate(dt) {
  const [y, m, d] = dt.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}
function formatDate(dt) {
  return toLocalDate(dt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
}

const emptyMarathon = { name: '', is_domestic: true, country: '', city: '', marathon_date: '', description: '', website_url: '' };
const emptyCategoryRow = () => ({ name: '', distance_km: '' });

export default function MarathonListPage() {
  const { user } = useAuth();
  const [marathons, setMarathons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('upcoming');
  const [regionFilter, setRegionFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('asc');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyMarathon);
  const [categoryRows, setCategoryRows] = useState([emptyCategoryRow()]);
  const [saving, setSaving] = useState(false);
  const [formMsg, setFormMsg] = useState('');

  useEffect(() => {
    api.get('/marathons').then(({ data }) => setMarathons(data)).finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const filtered = marathons.filter(m => {
    const isUpcoming = toLocalDate(m.marathon_date) >= now;
    if (timeFilter === 'upcoming' && !isUpcoming) return false;
    if (timeFilter === 'past' && isUpcoming) return false;
    if (regionFilter === 'domestic' && !m.is_domestic) return false;
    if (regionFilter === 'international' && m.is_domestic) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const cmp = sortBy === 'name'
      ? a.name.localeCompare(b.name, 'ko')
      : toLocalDate(a.marathon_date) - toLocalDate(b.marathon_date);
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  const updateCategoryRow = (idx, field, value) => {
    setCategoryRows(rows => rows.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };
  const addCategoryRow = () => setCategoryRows(rows => [...rows, emptyCategoryRow()]);
  const removeCategoryRow = idx => setCategoryRows(rows => rows.filter((_, i) => i !== idx));

  const resetForm = () => {
    setForm(emptyMarathon);
    setCategoryRows([emptyCategoryRow()]);
    setShowForm(false);
    setFormMsg('');
  };

  const submit = async e => {
    e.preventDefault();
    setSaving(true); setFormMsg('');
    try {
      const categories = categoryRows
        .filter(r => r.name.trim())
        .map(r => ({ name: r.name.trim(), distance_km: r.distance_km ? parseFloat(r.distance_km) : null }));
      const { data } = await api.post('/marathons', { ...form, categories });
      setMarathons(prev => [{ ...data, category_count: data.categories.length, participant_count: 0 }, ...prev]);
      resetForm();
    } catch (err) {
      setFormMsg(err.response?.data?.error || '오류가 발생했습니다');
    } finally { setSaving(false); }
  };

  return (
    <div className="page">
      <div className="container">
        <div className="page-header flex-between">
          <div>
            <h1 className="page-title">마라톤 대회</h1>
            <p className="page-subtitle">국내외 마라톤 대회를 찾아보고 참가 신청하세요</p>
          </div>
          {user && !showForm && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ 마라톤 등록</button>
          )}
        </div>

        {showForm && (
          <div className="card mb-2">
            <div className="card-header">
              <h3>새 마라톤 등록</h3>
              <button className="btn btn-ghost btn-sm" onClick={resetForm}>✕</button>
            </div>
            <div className="card-body">
              {formMsg && <div className="alert alert-error">{formMsg}</div>}
              <form onSubmit={submit}>
                <div className="event-form-grid">
                  <div className="form-group event-form-full">
                    <label className="form-label">대회명 *</label>
                    <input className="form-control" placeholder="예: 서울 국제 마라톤" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">구분 *</label>
                    <select className="form-control" value={form.is_domestic ? 'domestic' : 'international'} onChange={e => setForm(f => ({ ...f, is_domestic: e.target.value === 'domestic' }))}>
                      <option value="domestic">국내</option>
                      <option value="international">해외</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">대회 날짜 *</label>
                    <input type="date" className="form-control" value={form.marathon_date} onChange={e => setForm(f => ({ ...f, marathon_date: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">국가 *</label>
                    <input className="form-control" placeholder="예: 대한민국" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">도시</label>
                    <input className="form-control" placeholder="예: 서울" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                  </div>
                  <div className="form-group event-form-full">
                    <label className="form-label">공식 홈페이지</label>
                    <input className="form-control" placeholder="https://..." value={form.website_url} onChange={e => setForm(f => ({ ...f, website_url: e.target.value }))} />
                  </div>
                  <div className="form-group event-form-full">
                    <label className="form-label">대회 소개</label>
                    <textarea className="form-control" placeholder="코스, 특징 등" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">거리 카테고리 *</label>
                  {categoryRows.map((row, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <input className="form-control" placeholder="예: 풀코스" value={row.name} onChange={e => updateCategoryRow(idx, 'name', e.target.value)} required />
                      <input type="number" step="any" min="0" className="form-control" style={{ maxWidth: 140 }} placeholder="거리(km)" value={row.distance_km} onChange={e => updateCategoryRow(idx, 'distance_km', e.target.value)} />
                      {categoryRows.length > 1 && (
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => removeCategoryRow(idx)}>삭제</button>
                      )}
                    </div>
                  ))}
                  <button type="button" className="btn btn-outline btn-sm" onClick={addCategoryRow}>+ 카테고리 추가</button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '등록 중...' : '마라톤 등록'}</button>
                  <button type="button" className="btn btn-outline" onClick={resetForm}>취소</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-2" style={{ flexWrap: 'wrap' }}>
          <div className="flex gap-1">
            <button className={`btn btn-sm ${timeFilter === 'upcoming' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTimeFilter('upcoming')}>예정</button>
            <button className={`btn btn-sm ${timeFilter === 'past' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTimeFilter('past')}>지난</button>
          </div>
          <div className="flex gap-1">
            <button className={`btn btn-sm ${regionFilter === 'all' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setRegionFilter('all')}>전체</button>
            <button className={`btn btn-sm ${regionFilter === 'domestic' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setRegionFilter('domestic')}>국내</button>
            <button className={`btn btn-sm ${regionFilter === 'international' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setRegionFilter('international')}>해외</button>
          </div>
          <div className="flex gap-1" style={{ marginLeft: 'auto' }}>
            <button className={`btn btn-sm ${sortBy === 'date' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSortBy('date')}>날짜순</button>
            <button className={`btn btn-sm ${sortBy === 'name' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSortBy('name')}>이름순</button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'))}
              title={sortOrder === 'asc' ? '오름차순' : '내림차순'}
            >
              {sortOrder === 'asc' ? '▲' : '▼'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-page"><div className="spinner" /></div>
        ) : sorted.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏅</div>
            <p>{timeFilter === 'upcoming' ? '예정된 마라톤이 없습니다' : '지난 마라톤이 없습니다'}</p>
          </div>
        ) : (
          <div className="event-grid">
            {sorted.map(m => (
              <Link to={`/marathons/${m.id}`} className="event-card" key={m.id}>
                <div className="event-card-accent" />
                <div className="event-card-body">
                  <div style={{ marginBottom: '0.5rem' }}>
                    <span className={`badge ${m.is_domestic ? 'badge-domestic' : 'badge-intl'}`}>{m.is_domestic ? '국내' : '해외'}</span>
                  </div>
                  <div className="event-card-title">{m.name}</div>
                  <div className="event-card-meta">
                    <div className="event-card-meta-item">📅 {formatDate(m.marathon_date)}</div>
                    <div className="event-card-meta-item">📍 {[m.country, m.city].filter(Boolean).join(' · ')}</div>
                    <div className="event-card-meta-item">🏁 카테고리 {m.category_count}개</div>
                  </div>
                </div>
                <div className="event-card-footer">
                  <span className="event-capacity">👥 참가자 {m.participant_count}명</span>
                  <span className="btn btn-primary btn-sm">자세히 보기 →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
