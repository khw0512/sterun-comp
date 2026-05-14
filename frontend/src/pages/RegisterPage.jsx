import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'guest' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    if (form.password.length < 6) { setError('비밀번호는 6자 이상이어야 합니다'); return; }
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      login(data.token, data.user);
      navigate(data.user.role === 'club_manager' ? '/manager' : '/guest');
    } catch (err) {
      setError(err.response?.data?.error || '회원가입에 실패했습니다');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="card-body">
          <h1 className="auth-title">회원가입</h1>
          <p className="auth-subtitle">역할을 선택하고 Sterun을 시작하세요</p>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="role-selector">
            {[
              { value: 'guest', icon: '🏃', label: '게스트', desc: '이벤트 참여 신청' },
              { value: 'club_manager', icon: '📋', label: '클럽 담당자', desc: '클럽 & 이벤트 관리' },
            ].map(r => (
              <div
                key={r.value}
                className={`role-option${form.role === r.value ? ' selected' : ''}`}
                onClick={() => setForm(f => ({ ...f, role: r.value }))}
              >
                <div className="role-option-icon">{r.icon}</div>
                <div className="role-option-label">{r.label}</div>
                <div className="role-option-desc">{r.desc}</div>
              </div>
            ))}
          </div>

          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">이름</label>
              <input name="name" className="form-control" placeholder="이름" value={form.name} onChange={handle} required />
            </div>
            <div className="form-group">
              <label className="form-label">이메일</label>
              <input name="email" type="email" className="form-control" placeholder="이메일 주소" value={form.email} onChange={handle} required />
            </div>
            <div className="form-group">
              <label className="form-label">비밀번호</label>
              <input name="password" type="password" className="form-control" placeholder="6자 이상" value={form.password} onChange={handle} required />
            </div>
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
              {loading ? '처리 중...' : '가입하기'}
            </button>
          </form>
          <p className="auth-footer">이미 계정이 있으신가요? <Link to="/login">로그인</Link></p>
        </div>
      </div>
    </div>
  );
}
