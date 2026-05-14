import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';

function formatDate(dt) {
  return new Date(dt).toLocaleString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function EventListPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming');

  useEffect(() => {
    const fetches = [api.get('/events')];
    if (user?.role === 'guest') fetches.push(api.get('/registrations/my'));

    Promise.all(fetches)
      .then(([evRes, regRes]) => {
        setEvents(evRes.data);
        if (regRes) setAppliedIds(new Set(regRes.data.map(r => r.event_id)));
      })
      .finally(() => setLoading(false));
  }, [user]);

  const now = new Date();
  const filtered = events.filter(e => {
    const d = new Date(e.event_date);
    return filter === 'upcoming' ? d >= now : d < now;
  });

  return (
    <div className="page">
      <div className="container">
        <div className="page-header flex-between">
          <div>
            <h1 className="page-title">러닝 이벤트</h1>
            <p className="page-subtitle">참여하고 싶은 이벤트를 찾아보세요</p>
          </div>
          <div className="flex gap-1">
            <button className={`btn btn-sm ${filter === 'upcoming' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter('upcoming')}>예정</button>
            <button className={`btn btn-sm ${filter === 'past' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter('past')}>지난</button>
          </div>
        </div>

        {loading ? (
          <div className="loading-page"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏃</div>
            <p>{filter === 'upcoming' ? '예정된 이벤트가 없습니다' : '지난 이벤트가 없습니다'}</p>
          </div>
        ) : (
          <div className="event-grid">
            {filtered.map(e => (
              <Link to={`/events/${e.id}`} className="event-card" key={e.id}>
                <div className="event-card-accent" />
                <div className="event-card-body">
                  <div className="event-card-club">{e.club_name}</div>
                  <div className="event-card-title">{e.title}</div>
                  <div className="event-card-meta">
                    <div className="event-card-meta-item">📅 {formatDate(e.event_date)}</div>
                    <div className="event-card-meta-item">📍 {e.location}</div>
                  </div>
                </div>
                <div className="event-card-footer">
                  <span className="event-capacity">
                    👥 {e.registration_count}/{e.max_guests} 명
                  </span>
                  {appliedIds.has(e.id) ? (
                    <span className="btn btn-sm" style={{ background: '#dcfce7', color: '#166534', cursor: 'default', pointerEvents: 'none' }}>
                      ✓ 신청완료
                    </span>
                  ) : (
                    <span className="btn btn-primary btn-sm">신청하기 →</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
