import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

function formatDate(dt) {
  return new Date(dt).toLocaleString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' });
}
const statusLabel = { pending: '심사 중', approved: '승인됨', rejected: '거절됨' };
const statusClass = { pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected' };

export default function GuestDashboard() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/registrations/my').then(r => setRegistrations(r.data)).finally(() => setLoading(false));
  }, []);

  const upcoming = registrations.filter(r => new Date(r.event_date) >= new Date());
  const past = registrations.filter(r => new Date(r.event_date) < new Date());

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  const RegCard = ({ reg }) => (
    <div className="card mb-1" style={{ transition: 'box-shadow 0.15s' }}>
      <div className="card-body" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>
            {reg.club_name}
          </div>
          <Link to={`/events/${reg.event_id}`} style={{ fontWeight: 700, fontSize: '1.05rem', textDecoration: 'none', color: 'var(--text)' }}>
            {reg.event_title}
          </Link>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>📅 {formatDate(reg.event_date)}</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>📍 {reg.event_location}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <span className={`badge ${statusClass[reg.status]}`}>{statusLabel[reg.status]}</span>
          {reg.status === 'approved' && (
            <span style={{ fontSize: '0.75rem', color: reg.attended ? 'var(--success)' : 'var(--muted)' }}>
              {reg.attended ? '✅ 출석 완료' : '출석 미확인'}
            </span>
          )}
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
            신청일: {new Date(reg.created_at).toLocaleDateString('ko-KR')}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 720 }}>
        <div className="page-header">
          <h1 className="page-title">내 신청 목록</h1>
          <p className="page-subtitle">신청한 이벤트와 결과를 확인하세요</p>
        </div>

        {registrations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏃</div>
            <p>아직 신청한 이벤트가 없습니다</p>
            <Link to="/" className="btn btn-primary mt-2">이벤트 둘러보기</Link>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <section>
                <h2 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1.1rem' }}>다가오는 이벤트</h2>
                {upcoming.map(r => <RegCard key={r.id} reg={r} />)}
              </section>
            )}
            {past.length > 0 && (
              <section className="mt-3">
                <h2 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--muted)' }}>지난 이벤트</h2>
                {past.map(r => <RegCard key={r.id} reg={r} />)}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
