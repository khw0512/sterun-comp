import { useEffect, useState } from 'react';
import api from '../api/client';

function timeAgo(dt) {
  const diff = (Date.now() - new Date(dt)) / 1000;
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  const dispatch = (detail) => window.dispatchEvent(new CustomEvent('sterun:notif-read', { detail }));

  useEffect(() => {
    api.get('/notifications')
      .then(r => {
        setNotifs(r.data);
        const unreadCount = r.data.filter(n => !n.is_read).length;
        if (unreadCount > 0) {
          api.put('/notifications/read-all').catch(() => {});
          dispatch({ setTo: 0 });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 640 }}>
        <div className="page-header flex-between">
          <div>
            <h1 className="page-title">알림</h1>
            <p className="page-subtitle">이벤트 신청 결과를 확인하세요</p>
          </div>
          {notifs.some(n => !n.is_read) && (
            <button
              className="btn btn-outline btn-sm"
              onClick={() => {
                api.put('/notifications/read-all');
                setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
                dispatch({ setTo: 0 });
              }}
            >
              모두 읽음
            </button>
          )}
        </div>

        {notifs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔔</div>
            <p>알림이 없습니다</p>
          </div>
        ) : (
          <div className="notif-list">
            {notifs.map(n => (
              <div key={n.id} className={`notif-item${n.is_read ? '' : ' unread'}`} onClick={() => {
                if (!n.is_read) {
                  api.put(`/notifications/${n.id}/read`);
                  setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
                }
              }}>
                <div className={`notif-dot${n.is_read ? ' read' : ''}`} />
                <div>
                  <div className="notif-msg">{n.message}</div>
                  <div className="notif-time">{timeAgo(n.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
