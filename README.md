# Sterun — 러닝 클럽 플랫폼

러닝 클럽과 게스트 참여자를 연결하는 플랫폼입니다.

## 시작하기

### 사전 요구사항
- Node.js 18+
- PostgreSQL 14+

### 1. 데이터베이스 설정

```bash
createdb sterun
psql -d sterun -f backend/src/db/schema.sql
```

### 2. 백엔드 설정

```bash
cd backend
cp .env.example .env
# .env 파일 열어서 DATABASE_URL과 JWT_SECRET 설정
npm install
npm run dev
```

### 3. 프론트엔드 설정

```bash
cd frontend
npm install
npm run dev
```

앱: http://localhost:5173  
API: http://localhost:4000

---

## 역할별 사용법

### 클럽 담당자 (club_manager)
1. 회원가입 시 "클럽 담당자" 선택
2. **클럽 프로필** 탭에서 클럽 생성
3. **이벤트 관리** 탭에서 이벤트 추가
4. 이벤트 행을 클릭하면 게스트 신청 목록 확인 → 승인/거절 처리
5. 이벤트 당일 출석 체크 가능

### 게스트 (guest)
1. 회원가입 시 "게스트" 선택
2. 메인 페이지에서 이벤트 탐색 → 신청
3. **내 신청** 페이지에서 신청 현황 확인
4. 🔔 알림에서 승인/거절 결과 확인

---

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| POST | /api/auth/register | 회원가입 |
| POST | /api/auth/login | 로그인 |
| GET | /api/events | 전체 이벤트 목록 |
| POST | /api/events | 이벤트 생성 (담당자) |
| POST | /api/registrations | 이벤트 신청 (게스트) |
| PUT | /api/registrations/:id/status | 승인/거절 (담당자) |
| PUT | /api/registrations/:id/attendance | 출석 체크 (담당자) |
| GET | /api/notifications | 알림 목록 |
# sterun-comp
