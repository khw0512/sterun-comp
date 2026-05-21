import { useEffect, useState } from 'react';
import api from '../api/client';

function formatDate(dt) {
  return new Date(dt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' });
}
function toInputDatetime(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
const statusLabel = { pending: '대기중', approved: '승인됨', rejected: '거절됨' };
const statusClass = { pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected' };

const emptyClub = { name: '', description: '', location: '', image_url: '' };
const emptyEvent = { title: '', description: '', event_date: '', location: '', max_guests: 20, languages: '' };

export default function ManagerDashboard() {
  const [club, setClub] = useState(null);
  const [loadingClub, setLoadingClub] = useState(true);
  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('events');
  const [expandedEventId, setExpandedEventId] = useState(null);
  const [registrations, setRegistrations] = useState({});

  const [clubForm, setClubForm] = useState(emptyClub);
  const [editingClub, setEditingClub] = useState(false);
  const [clubSaving, setClubSaving] = useState(false);
  const [clubMsg, setClubMsg] = useState('');
  const [emblemFile, setEmblemFile] = useState(null);
  const [emblemPreview, setEmblemPreview] = useState('');

  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState(emptyEvent);
  const [eventSaving, setEventSaving] = useState(false);
  const [eventMsg, setEventMsg] = useState('');

  useEffect(() => { loadClub(); }, []);

  const loadClub = async () => {
    try {
      const { data } = await api.get('/clubs/my');
      setClub(data);
      if (data) {
        setClubForm({ name: data.name, description: data.description || '', location: data.location || '', image_url: data.image_url || '' });
        setEmblemPreview(data.image_url || '');
        loadEvents(data.id);
      }
    } finally { setLoadingClub(false); }
  };

  const loadEvents = async (clubId) => {
    const { data } = await api.get(`/events/club/${clubId}`);
    setEvents(data);
  };

  const loadRegistrations = async (eventId) => {
    const { data } = await api.get(`/registrations/event/${eventId}`);
    setRegistrations(prev => ({ ...prev, [eventId]: data }));
  };

  const toggleEvent = async (eventId) => {
    if (expandedEventId === eventId) { setExpandedEventId(null); return; }
    setExpandedEventId(eventId);
    if (!registrations[eventId]) await loadRegistrations(eventId);
  };

  const handleEmblemChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    setEmblemFile(file);
    setEmblemPreview(URL.createObjectURL(file));
  };

  const saveClub = async e => {
    e.preventDefault();
    setClubSaving(true); setClubMsg('');
    try {
      let formData = { ...clubForm };
      if (emblemFile) {
        const fd = new FormData();
        fd.append('emblem', emblemFile);
        const { data: uploaded } = await api.post('/clubs/upload-emblem', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        formData.image_url = uploaded.url;
      }
      if (club) {
        const { data } = await api.put(`/clubs/${club.id}`, formData);
        setClub(data);
        setClubForm(f => ({ ...f, image_url: data.image_url || '' }));
        setEmblemFile(null);
        setClubMsg('저장되었습니다');
        setEditingClub(false);
      } else {
        const { data } = await api.post('/clubs', formData);
        setClub(data);
        setEmblemFile(null);
        setClubMsg('클럽이 생성되었습니다!');
        setEditingClub(false);
      }
    } catch (err) { setClubMsg(err.response?.data?.error || '오류가 발생했습니다'); }
    finally { setClubSaving(false); }
  };

  const startEditEvent = (ev) => {
    setEditingEvent(ev);
    setEventForm({ title: ev.title, description: ev.description || '', event_date: toInputDatetime(ev.event_date), location: ev.location, max_guests: ev.max_guests, languages: ev.languages || '' });
    setShowEventForm(true);
    setEventMsg('');
  };

  const saveEvent = async e => {
    e.preventDefault();
    setEventSaving(true); setEventMsg('');
    try {
      if (editingEvent) {
        const { data } = await api.put(`/events/${editingEvent.id}`, eventForm);
        setEvents(prev => prev.map(ev => ev.id === data.id ? { ...ev, ...data } : ev));
        setEventMsg('수정되었습니다');
      } else {
        const { data } = await api.post('/events', eventForm);
        setEvents(prev => [data, ...prev]);
        setEventMsg('이벤트가 추가되었습니다!');
      }
      setShowEventForm(false);
      setEditingEvent(null);
      setEventForm(emptyEvent);
    } catch (err) { setEventMsg(err.response?.data?.error || '오류가 발생했습니다'); }
    finally { setEventSaving(false); }
  };

  const deleteEvent = async (eventId) => {
    if (!confirm('이벤트를 삭제하시겠습니까?')) return;
    await api.delete(`/events/${eventId}`);
    setEvents(prev => prev.filter(e => e.id !== eventId));
    if (expandedEventId === eventId) setExpandedEventId(null);
  };

  const updateStatus = async (eventId, regId, status) => {
    const { data } = await api.put(`/registrations/${regId}/status`, { status });
    setRegistrations(prev => ({
      ...prev,
      [eventId]: prev[eventId].map(r => r.id === regId ? { ...r, status: data.status } : r),
    }));
  };

  const updateAttendance = async (eventId, regId, attended) => {
    const { data } = await api.put(`/registrations/${regId}/attendance`, { attended });
    setRegistrations(prev => ({
      ...prev,
      [eventId]: prev[eventId].map(r => r.id === regId ? { ...r, attended: data.attended } : r),
    }));
  };

  if (loadingClub) return <div className="loading-page"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">클럽 관리</h1>
          <p className="page-subtitle">클럽 프로필과 이벤트를 관리하세요</p>
        </div>

        <div className="tab-list">
          {['events', 'club'].map(t => (
            <button key={t} className={`tab-btn${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>
              {t === 'events' ? '이벤트 관리' : '클럽 프로필'}
            </button>
          ))}
        </div>

        {activeTab === 'club' && (
          <div className="card" style={{ maxWidth: 600 }}>
            <div className="card-header">
              <h2>{club ? '클럽 정보' : '클럽 생성'}</h2>
              {club && !editingClub && <button className="btn btn-outline btn-sm" onClick={() => setEditingClub(true)}>수정</button>}
            </div>
            <div className="card-body">
              {clubMsg && <div className={`alert ${clubMsg.includes('오류') ? 'alert-error' : 'alert-success'}`}>{clubMsg}</div>}
              {club && !editingClub ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {club.image_url && (
                    <div>
                      <strong>엠블럼</strong>
                      <div style={{ marginTop: 6 }}>
                        <img src={club.image_url} alt="클럽 엠블럼" style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--border)' }} />
                      </div>
                    </div>
                  )}
                  <div><strong>클럽명</strong><p style={{ marginTop: 2 }}>{club.name}</p></div>
                  <div><strong>소개</strong><p style={{ marginTop: 2, color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>{club.description || '—'}</p></div>
                  <div><strong>위치</strong><p style={{ marginTop: 2 }}>{club.location || '—'}</p></div>
                </div>
              ) : (
                <form onSubmit={saveClub}>
                  <div className="form-group">
                    <label className="form-label">클럽명 *</label>
                    <input className="form-control" placeholder="클럽 이름" value={clubForm.name} onChange={e => setClubForm(f => ({ ...f, name: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">클럽 소개</label>
                    <textarea className="form-control" placeholder="클럽을 소개해주세요" value={clubForm.description} onChange={e => setClubForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">주요 활동 지역</label>
                    <input className="form-control" placeholder="예: 서울 한강공원" value={clubForm.location} onChange={e => setClubForm(f => ({ ...f, location: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">클럽 엠블럼</label>
                    {emblemPreview && (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <img src={emblemPreview} alt="엠블럼 미리보기" style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--border)' }} />
                      </div>
                    )}
                    <input type="file" accept="image/*" className="form-control" onChange={handleEmblemChange} />
                    <small style={{ color: 'var(--muted)' }}>JPG, PNG, GIF, WebP, SVG · 최대 5MB</small>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="submit" className="btn btn-primary" disabled={clubSaving}>{clubSaving ? '저장 중...' : club ? '저장' : '클럽 생성'}</button>
                    {club && <button type="button" className="btn btn-outline" onClick={() => setEditingClub(false)}>취소</button>}
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div>
            {!club ? (
              <div className="alert alert-info">먼저 <button className="btn btn-ghost btn-sm" style={{ color: 'var(--primary)' }} onClick={() => setActiveTab('club')}>클럽 프로필</button>을 생성해주세요.</div>
            ) : (
              <>
                {showEventForm && (
                  <div className="card mb-2">
                    <div className="card-header">
                      <h3>{editingEvent ? '이벤트 수정' : '새 이벤트 추가'}</h3>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setShowEventForm(false); setEditingEvent(null); setEventForm(emptyEvent); }}>✕</button>
                    </div>
                    <div className="card-body">
                      {eventMsg && <div className={`alert ${eventMsg.includes('오류') ? 'alert-error' : 'alert-success'}`}>{eventMsg}</div>}
                      <form onSubmit={saveEvent}>
                        <div className="event-form-grid">
                          <div className="form-group event-form-full">
                            <label className="form-label">이벤트 제목 *</label>
                            <input className="form-control" placeholder="이벤트 이름" value={eventForm.title} onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))} required />
                          </div>
                          <div className="form-group">
                            <label className="form-label">날짜 및 시간 *</label>
                            <input type="datetime-local" className="form-control" value={eventForm.event_date} onChange={e => setEventForm(f => ({ ...f, event_date: e.target.value }))} required />
                          </div>
                          <div className="form-group">
                            <label className="form-label">최대 게스트 수</label>
                            <input type="number" min={1} max={500} className="form-control" value={eventForm.max_guests} onChange={e => setEventForm(f => ({ ...f, max_guests: parseInt(e.target.value) }))} />
                          </div>
                          <div className="form-group event-form-full">
                            <label className="form-label">장소 *</label>
                            <input className="form-control" placeholder="집합 장소" value={eventForm.location} onChange={e => setEventForm(f => ({ ...f, location: e.target.value }))} required />
                          </div>
                          <div className="form-group event-form-full">
                            <label className="form-label">사용 언어</label>
                            <input className="form-control" placeholder="예: 한국어, English, 日本語" value={eventForm.languages} onChange={e => setEventForm(f => ({ ...f, languages: e.target.value }))} />
                          </div>
                          <div className="form-group event-form-full">
                            <label className="form-label">이벤트 소개</label>
                            <textarea className="form-control" placeholder="코스, 페이스, 준비물 등" value={eventForm.description} onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button type="submit" className="btn btn-primary" disabled={eventSaving}>{eventSaving ? '저장 중...' : editingEvent ? '수정 저장' : '이벤트 추가'}</button>
                          <button type="button" className="btn btn-outline" onClick={() => { setShowEventForm(false); setEditingEvent(null); setEventForm(emptyEvent); }}>취소</button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                <div className="flex-between mb-2">
                  <span style={{ fontWeight: 600 }}>이벤트 목록 ({events.length})</span>
                  {!showEventForm && (
                    <button className="btn btn-primary btn-sm" onClick={() => { setShowEventForm(true); setEditingEvent(null); setEventForm(emptyEvent); }}>+ 이벤트 추가</button>
                  )}
                </div>

                {events.length === 0 ? (
                  <div className="empty-state"><div className="empty-state-icon">📅</div><p>등록된 이벤트가 없습니다</p></div>
                ) : events.map(ev => (
                  <div className="event-accordion" key={ev.id}>
                    <div className={`event-accordion-header${expandedEventId === ev.id ? ' open' : ''}`} onClick={() => toggleEvent(ev.id)}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{ev.title}</div>
                        <div className="event-meta">
                          <span className="event-meta-item">📅 {formatDate(ev.event_date)}</span>
                          <span className="event-meta-item">📍 {ev.location}</span>
                          <span className="event-meta-item">👥 {ev.registration_count}/{ev.max_guests}</span>
                        </div>
                      </div>
                      <div className="accordion-actions" onClick={e => e.stopPropagation()}>
                        <button className="btn btn-outline btn-sm" onClick={() => startEditEvent(ev)}>수정</button>
                        <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#991b1b', border: 'none' }} onClick={() => deleteEvent(ev.id)}>삭제</button>
                        <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{expandedEventId === ev.id ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {expandedEventId === ev.id && (
                      <div className="event-accordion-body">
                        <div style={{ fontWeight: 600, marginBottom: '0.75rem' }}>
                          게스트 신청 목록 ({(registrations[ev.id] || []).length}명)
                        </div>
                        {!registrations[ev.id] ? (
                          <div className="spinner" />
                        ) : registrations[ev.id].length === 0 ? (
                          <p className="text-muted">신청자가 없습니다</p>
                        ) : registrations[ev.id].map(reg => (
                          <div className="reg-row" key={reg.id}>
                            <div className="reg-info">
                              <div className="reg-name">{reg.guest_name}</div>
                              <div className="reg-email">{reg.guest_email}</div>
                              {reg.message && <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.2rem', fontStyle: 'italic' }}>"{reg.message}"</div>}
                            </div>
                            <div className="reg-actions">
                              <span className={`badge ${statusClass[reg.status]}`}>{statusLabel[reg.status]}</span>
                              {reg.status === 'pending' && (
                                <>
                                  <button className="btn btn-success btn-sm" onClick={() => updateStatus(ev.id, reg.id, 'approved')}>승인</button>
                                  <button className="btn btn-danger btn-sm" onClick={() => updateStatus(ev.id, reg.id, 'rejected')}>거절</button>
                                </>
                              )}
                              {reg.status === 'approved' && (
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', userSelect: 'none' }}>
                                  <input type="checkbox" checked={reg.attended} onChange={e => updateAttendance(ev.id, reg.id, e.target.checked)} />
                                  출석
                                </label>
                              )}
                              {reg.status !== 'pending' && (
                                <button className="btn btn-outline btn-sm" onClick={() => updateStatus(ev.id, reg.id, 'pending')}>되돌리기</button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
