import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.token, data.user);
      navigate(data.user.role === 'club_manager' ? '/manager' : '/guest');
    } catch (err) {
      setError(err.response?.data?.error || '로그인에 실패했습니다');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="card-body">
          <h1 className="auth-title">로그인</h1>
          <p className="auth-subtitle">계정에 로그인하여 러닝 이벤트를 즐겨보세요</p>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">이메일</label>
              <input name="email" type="email" className="form-control" placeholder="이메일 주소" value={form.email} onChange={handle} required />
            </div>
            <div className="form-group">
              <label className="form-label">비밀번호</label>
              <input name="password" type="password" className="form-control" placeholder="비밀번호" value={form.password} onChange={handle} required />
            </div>
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
          <p className="auth-footer">계정이 없으신가요? <Link to="/register">회원가입</Link></p>
        </div>
      </div>
    </div>
  );
}
