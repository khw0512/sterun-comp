import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';

function formatDate(dt) {
  return new Date(dt).toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour: '2-digit', minute: '2-digit' });
}

const statusLabel = { pending: '심사 중', approved: '승인됨', rejected: '거절됨' };
const statusClass = { pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected' };

export default function EventDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/events/${id}`),
      user?.role === 'guest' ? api.get(`/registrations/check/${id}`) : Promise.resolve({ data: null }),
    ])
      .then(([ev, reg]) => { setEvent(ev.data); setRegistration(reg.data); })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id, user]);

  const apply = async e => {
    e.preventDefault();
    if (!user) return navigate('/login');
    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post('/registrations', { event_id: parseInt(id), message });
      setRegistration(data);
    } catch (err) {
      setError(err.response?.data?.error || '신청에 실패했습니다');
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;
  if (!event) return null;

  const full = parseInt(event.registration_count) >= event.max_guests;
  const isPast = new Date(event.event_date) < new Date();

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 720 }}>
        <button className="btn btn-ghost btn-sm mb-2" onClick={() => navigate(-1)}>← 뒤로</button>

        <div className="card">
          <div style={{ height: 6, background: 'linear-gradient(90deg, #3b82f6, #818cf8)' }} />
          <div className="card-body">
            <div style={{ marginBottom: '0.5rem' }}>
              <span className="badge badge-info">{event.club_name}</span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1rem' }}>{event.title}</h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <div className="event-card-meta-item">📅 {formatDate(event.event_date)}</div>
              <div className="event-card-meta-item">📍 {event.location}</div>
              <div className="event-card-meta-item">👥 {event.registration_count}/{event.max_guests} 명 신청</div>
              {event.languages && (
                <div className="event-card-meta-item">🌐 {event.languages}</div>
              )}
            </div>

            {event.description && (
              <>
                <hr className="divider" />
                <p style={{ color: 'var(--muted)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{event.description}</p>
              </>
            )}

            {event.club_description && (
              <div className="alert alert-info mt-2">
                <strong>{event.club_name}</strong>: {event.club_description}
              </div>
            )}
          </div>
        </div>

        <div className="card mt-2">
          <div className="card-header"><h3>이벤트 신청</h3></div>
          <div className="card-body">
            {isPast ? (
              <p className="text-muted">이미 종료된 이벤트입니다.</p>
            ) : !user ? (
              <div className="text-center">
                <p className="text-muted mb-2">신청하려면 로그인이 필요합니다</p>
                <button className="btn btn-primary" onClick={() => navigate('/login')}>로그인하러 가기</button>
              </div>
            ) : user.role === 'club_manager' ? (
              <p className="text-muted">클럽 담당자는 이벤트에 신청할 수 없습니다.</p>
            ) : registration ? (
              <div>
                <p className="mb-1">신청 현황</p>
                <span className={`badge ${statusClass[registration.status]}`} style={{ fontSize: '0.9rem', padding: '0.4rem 1rem' }}>
                  {statusLabel[registration.status]}
                </span>
                {registration.status === 'approved' && (
                  <div className="alert alert-success mt-2">🎉 이벤트 참여가 확정되었습니다!</div>
                )}
                {registration.status === 'rejected' && (
                  <div className="alert alert-error mt-2">이번에는 함께하지 못하게 되었습니다.</div>
                )}
              </div>
            ) : full ? (
              <p className="text-muted">정원이 마감되었습니다.</p>
            ) : (
              <form onSubmit={apply}>
                {error && <div className="alert alert-error">{error}</div>}
                <div className="form-group">
                  <label className="form-label">메시지 (선택)</label>
                  <textarea
                    className="form-control"
                    placeholder="클럽에 전달할 메시지를 입력해주세요 (경험, 페이스 등)"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={3}
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
                  {submitting ? '신청 중...' : '신청하기'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
