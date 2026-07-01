import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import api from '../api/client';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) { setUnread(0); return; }
    const fetch = () => api.get('/notifications/unread-count').then(r => setUnread(r.data.count)).catch(() => {});
    fetch();
    const id = setInterval(fetch, 30000);
    return () => clearInterval(id);
  }, [user]);

  useEffect(() => {
    const handler = e => {
      if (e.detail.setTo !== undefined) setUnread(e.detail.setTo);
      else setUnread(n => Math.max(0, n - (e.detail.delta ?? 1)));
    };
    window.addEventListener('sterun:notif-read', handler);
    return () => window.removeEventListener('sterun:notif-read', handler);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const handleLogout = () => { logout(); navigate('/'); };

  const NotifBell = () => (
    <button className="notif-btn" onClick={() => navigate('/notifications')} title="알림">
      🔔
      {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
    </button>
  );

  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="navbar-brand">ste<span>run</span></Link>

        {/* 데스크탑 nav */}
        <div className="navbar-nav">
          <NavLink to="/" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} end>이벤트</NavLink>
          <NavLink to="/marathons" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>마라톤</NavLink>
          {user ? (
            <>
              <NavLink
                to={user.role === 'club_manager' ? '/manager' : '/guest'}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                {user.role === 'club_manager' ? '클럽 관리' : '내 신청'}
              </NavLink>
              {user.role === 'guest' && <NotifBell />}
              <span className="nav-user">{user.name}</span>
              <button className="btn btn-outline btn-sm" style={{ color: '#94a3b8', borderColor: '#334155' }} onClick={handleLogout}>
                로그아웃
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>로그인</NavLink>
              <Link to="/register" className="btn btn-primary btn-sm">회원가입</Link>
            </>
          )}
        </div>

        {/* 모바일: 알림 + 햄버거 */}
        <div className="navbar-mobile-right">
          {user?.role === 'guest' && <NotifBell />}
          <button
            className="hamburger-btn"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="메뉴 열기"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* 모바일 드롭다운 */}
      {menuOpen && (
        <div className="navbar-mobile-menu">
          <NavLink to="/" className="mobile-nav-link" end>🏃 이벤트</NavLink>
          <NavLink to="/marathons" className="mobile-nav-link">🏅 마라톤</NavLink>
          {user ? (
            <>
              <NavLink
                to={user.role === 'club_manager' ? '/manager' : '/guest'}
                className="mobile-nav-link"
              >
                {user.role === 'club_manager' ? '📋 클럽 관리' : '📝 내 신청'}
              </NavLink>
              <div className="mobile-nav-divider" />
              <span className="mobile-nav-user">{user.name}</span>
              <button className="mobile-nav-link mobile-nav-link-danger" onClick={handleLogout}>
                로그아웃
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="mobile-nav-link">로그인</NavLink>
              <NavLink to="/register" className="mobile-nav-link mobile-nav-link-accent">회원가입</NavLink>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
