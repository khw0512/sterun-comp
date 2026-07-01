import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';

function formatDate(dt) {
  const [y, m, d] = dt.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
}

const emptyEditForm = m => ({
  name: m.name, is_domestic: m.is_domestic, country: m.country, city: m.city || '',
  marathon_date: m.marathon_date.slice(0, 10), description: m.description || '', website_url: m.website_url || '',
});
const emptyNewCategory = { name: '', distance_km: '' };

export default function MarathonDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [marathon, setMarathon] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [myRegistration, setMyRegistration] = useState(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg, setEditMsg] = useState('');

  const [newCategory, setNewCategory] = useState(emptyNewCategory);
  const [addingCategory, setAddingCategory] = useState(false);
  const [categoryMsg, setCategoryMsg] = useState('');

  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [joinMessage, setJoinMessage] = useState('');
  const [joinSubmitting, setJoinSubmitting] = useState(false);
  const [joinError, setJoinError] = useState('');

  const load = () => {
    Promise.all([
      api.get(`/marathons/${id}`),
      api.get(`/marathons/${id}/participants`),
      user ? api.get(`/marathons/${id}/participants/me`) : Promise.resolve({ data: null }),
    ])
      .then(([m, p, mine]) => {
        setMarathon(m.data);
        setParticipants(p.data);
        setMyRegistration(mine.data);
      })
      .catch(() => navigate('/marathons'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id, user]);

  const startEdit = () => { setEditForm(emptyEditForm(marathon)); setEditing(true); setEditMsg(''); };

  const saveEdit = async e => {
    e.preventDefault();
    setEditSaving(true); setEditMsg('');
    try {
      const { data } = await api.put(`/marathons/${id}`, editForm);
      setMarathon(prev => ({ ...prev, ...data }));
      setEditing(false);
    } catch (err) { setEditMsg(err.response?.data?.error || '오류가 발생했습니다'); }
    finally { setEditSaving(false); }
  };

  const deleteMarathon = async () => {
    if (!confirm('마라톤을 삭제하시겠습니까?')) return;
    await api.delete(`/marathons/${id}`);
    navigate('/marathons');
  };

  const addCategory = async e => {
    e.preventDefault();
    setAddingCategory(true); setCategoryMsg('');
    try {
      const { data } = await api.post(`/marathons/${id}/categories`, {
        name: newCategory.name.trim(),
        distance_km: newCategory.distance_km ? parseFloat(newCategory.distance_km) : null,
      });
      setMarathon(prev => ({ ...prev, categories: [...prev.categories, { ...data, participant_count: 0 }] }));
      setNewCategory(emptyNewCategory);
    } catch (err) { setCategoryMsg(err.response?.data?.error || '오류가 발생했습니다'); }
    finally { setAddingCategory(false); }
  };

  const deleteCategory = async catId => {
    if (!confirm('카테고리를 삭제하시겠습니까? 등록된 참가자도 함께 삭제됩니다.')) return;
    await api.delete(`/marathons/${id}/categories/${catId}`);
    setMarathon(prev => ({ ...prev, categories: prev.categories.filter(c => c.id !== catId) }));
    setParticipants(prev => prev.filter(p => p.category_id !== catId));
  };

  const join = async e => {
    e.preventDefault();
    if (!user) return navigate('/login');
    if (!selectedCategoryId) { setJoinError('참가할 거리 카테고리를 선택해주세요'); return; }
    setJoinSubmitting(true); setJoinError('');
    try {
      const { data } = await api.post(`/marathons/${id}/participants`, { category_id: parseInt(selectedCategoryId), message: joinMessage });
      setMyRegistration(data);
      load();
    } catch (err) { setJoinError(err.response?.data?.error || '참가 신청에 실패했습니다'); }
    finally { setJoinSubmitting(false); }
  };

  const cancelJoin = async () => {
    if (!confirm('참가 신청을 취소하시겠습니까?')) return;
    await api.delete(`/marathons/participants/${myRegistration.id}`);
    setMyRegistration(null);
    load();
  };

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;
  if (!marathon) return null;

  const isCreator = user && user.id === marathon.creator_id;
  const myCategory = myRegistration && marathon.categories.find(c => c.id === myRegistration.category_id);
  const participantsByCategory = marathon.categories.map(c => ({
    ...c,
    people: participants.filter(p => p.category_id === c.id),
  }));

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 720 }}>
        <button className="btn btn-ghost btn-sm mb-2" onClick={() => navigate('/marathons')}>← 목록으로</button>

        <div className="card">
          <div style={{ height: 6, background: 'linear-gradient(90deg, #3b82f6, #818cf8)' }} />
          <div className="card-body">
            {editing ? (
              <form onSubmit={saveEdit}>
                {editMsg && <div className="alert alert-error">{editMsg}</div>}
                <div className="event-form-grid">
                  <div className="form-group event-form-full">
                    <label className="form-label">대회명 *</label>
                    <input className="form-control" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">구분 *</label>
                    <select className="form-control" value={editForm.is_domestic ? 'domestic' : 'international'} onChange={e => setEditForm(f => ({ ...f, is_domestic: e.target.value === 'domestic' }))}>
                      <option value="domestic">국내</option>
                      <option value="international">해외</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">대회 날짜 *</label>
                    <input type="date" className="form-control" value={editForm.marathon_date} onChange={e => setEditForm(f => ({ ...f, marathon_date: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">국가 *</label>
                    <input className="form-control" value={editForm.country} onChange={e => setEditForm(f => ({ ...f, country: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">도시</label>
                    <input className="form-control" value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} />
                  </div>
                  <div className="form-group event-form-full">
                    <label className="form-label">공식 홈페이지</label>
                    <input className="form-control" value={editForm.website_url} onChange={e => setEditForm(f => ({ ...f, website_url: e.target.value }))} />
                  </div>
                  <div className="form-group event-form-full">
                    <label className="form-label">대회 소개</label>
                    <textarea className="form-control" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" className="btn btn-primary" disabled={editSaving}>{editSaving ? '저장 중...' : '저장'}</button>
                  <button type="button" className="btn btn-outline" onClick={() => setEditing(false)}>취소</button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex-between" style={{ alignItems: 'flex-start' }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <span className={`badge ${marathon.is_domestic ? 'badge-domestic' : 'badge-intl'}`}>{marathon.is_domestic ? '국내' : '해외'}</span>
                  </div>
                  {isCreator && (
                    <div className="flex gap-1">
                      <button className="btn btn-outline btn-sm" onClick={startEdit}>수정</button>
                      <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#991b1b', border: 'none' }} onClick={deleteMarathon}>삭제</button>
                    </div>
                  )}
                </div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1rem' }}>{marathon.name}</h1>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <div className="event-card-meta-item">📅 {formatDate(marathon.marathon_date)}</div>
                  <div className="event-card-meta-item">📍 {[marathon.country, marathon.city].filter(Boolean).join(' · ')}</div>
                  <div className="event-card-meta-item">👥 참가자 {participants.length}명</div>
                  {marathon.website_url && (
                    <div className="event-card-meta-item">
                      🔗 <a href={marathon.website_url} target="_blank" rel="noreferrer">{marathon.website_url}</a>
                    </div>
                  )}
                </div>

                {marathon.description && (
                  <>
                    <hr className="divider" />
                    <p style={{ color: 'var(--muted)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{marathon.description}</p>
                  </>
                )}
                <div className="alert alert-info mt-2">등록자: {marathon.creator_name}</div>
              </>
            )}
          </div>
        </div>

        <div className="card mt-2">
          <div className="card-header"><h3>거리 카테고리</h3></div>
          <div className="card-body">
            {participantsByCategory.length === 0 ? (
              <p className="text-muted">등록된 카테고리가 없습니다</p>
            ) : participantsByCategory.map(c => (
              <div className="reg-row" key={c.id}>
                <div className="reg-info">
                  <div className="reg-name">{c.name}{c.distance_km ? ` · ${c.distance_km}km` : ''}</div>
                  <div className="reg-email">참가자 {c.people.length}명{c.people.length > 0 ? ` · ${c.people.map(p => p.user_name).join(', ')}` : ''}</div>
                </div>
                {isCreator && (
                  <div className="reg-actions">
                    <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#991b1b', border: 'none' }} onClick={() => deleteCategory(c.id)}>삭제</button>
                  </div>
                )}
              </div>
            ))}

            {isCreator && (
              <form onSubmit={addCategory} style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                {categoryMsg && <div className="alert alert-error">{categoryMsg}</div>}
                <input className="form-control" placeholder="예: 10km" value={newCategory.name} onChange={e => setNewCategory(f => ({ ...f, name: e.target.value }))} required />
                <input type="number" step="any" min="0" className="form-control" style={{ maxWidth: 140 }} placeholder="거리(km)" value={newCategory.distance_km} onChange={e => setNewCategory(f => ({ ...f, distance_km: e.target.value }))} />
                <button type="submit" className="btn btn-outline btn-sm" disabled={addingCategory}>{addingCategory ? '추가 중...' : '+ 추가'}</button>
              </form>
            )}
          </div>
        </div>

        <div className="card mt-2">
          <div className="card-header"><h3>참가 신청</h3></div>
          <div className="card-body">
            {!user ? (
              <div className="text-center">
                <p className="text-muted mb-2">참가 신청하려면 로그인이 필요합니다</p>
                <button className="btn btn-primary" onClick={() => navigate('/login')}>로그인하러 가기</button>
              </div>
            ) : myRegistration ? (
              <div>
                <p className="mb-1">참가 신청 현황</p>
                <span className="badge badge-approved" style={{ fontSize: '0.9rem', padding: '0.4rem 1rem' }}>
                  {myCategory ? myCategory.name : ''} 부문 신청 완료
                </span>
                <div className="mt-2">
                  <button className="btn btn-outline btn-sm" onClick={cancelJoin}>참가 취소</button>
                </div>
              </div>
            ) : marathon.categories.length === 0 ? (
              <p className="text-muted">아직 등록된 거리 카테고리가 없습니다.</p>
            ) : (
              <form onSubmit={join}>
                {joinError && <div className="alert alert-error">{joinError}</div>}
                <div className="form-group">
                  <label className="form-label">거리 카테고리 선택 *</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {marathon.categories.map(c => (
                      <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="category"
                          value={c.id}
                          checked={selectedCategoryId === String(c.id)}
                          onChange={e => setSelectedCategoryId(e.target.value)}
                        />
                        {c.name}{c.distance_km ? ` (${c.distance_km}km)` : ''}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">메시지 (선택)</label>
                  <textarea className="form-control" placeholder="각오, 목표 기록 등" value={joinMessage} onChange={e => setJoinMessage(e.target.value)} rows={3} />
                </div>
                <button type="submit" className="btn btn-primary btn-lg" disabled={joinSubmitting}>
                  {joinSubmitting ? '신청 중...' : '참가 신청'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
