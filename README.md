# Experience Passport (MVP)

프로그램 발견 → 신청 → 참여 → 활동 기록 → 성과 → 다음 프로그램 추천 → 재참여로 이어지는
송정동 평생학습 참여 흐름을 하나의 참여자 ID로 연결해 기록하는 웹 MVP.

핵심 가설: **주민의 평생학습 활동을 하나의 ID로 연결해 기록하고 다음 프로그램을 추천하면
재참여율을 높일 수 있는가?**

## 1. 기술 스택
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Supabase (PostgreSQL, RLS)
- lucide-react 아이콘
- 배포: Vercel (프론트) + Supabase (DB)

## 2. 정보 구조 (URL)
```
/                     홈 — 프로그램 목록
/programs/[id]        프로그램 상세, 신청 상태, 회차별 QR 체크인 진입
/join                 간편 참여자 등록 (?programId=)
/checkin/[token]      QR 스캔 시 열리는 체크인 확인 화면 (session.qr_token)
/survey/[programId]   참여 후 만족도 조사 + 다음 프로그램 추천
/passport             나의 패스포트 (이름 + 전화번호 뒤 4자리로 식별)
/admin                운영자 대시보드 (KPI, 전환율, 유입경로) — 비밀번호 보호
```

## 3. DB 스키마
`supabase/schema.sql` 참고. 엔티티: `participants`, `programs`, `sessions`,
`registrations`, `attendance`, `surveys`, `stamps`.
- `attendance`는 `(participant_id, session_id)` 유니크 제약으로 **중복 체크인을 DB 레벨에서 방지**한다.
- `sessions.qr_token`은 랜덤 토큰이라 URL을 추측해 체크인할 수 없다.
- MVP 단계 RLS는 익명 사용자가 자신의 신청/체크인/설문을 쓰고 읽을 수 있도록 넓게 열려 있다.
  **실서비스 전환 전 반드시 참여자별 접근 범위를 좁힐 것** (섹션 8 참고).

## 4. 로컬 실행
```bash
npm install
cp .env.local.example .env.local   # Supabase URL/anon key 입력
npm run dev
```

### Supabase 설정
1. supabase.com에서 새 프로젝트 생성
2. SQL Editor에서 `supabase/schema.sql` 실행
3. 이어서 `supabase/seed.sql` 실행 (프로그램 3개 + 데모 참여자 46명 자동 생성)
4. 프로젝트 설정 > API에서 URL / anon key를 `.env.local`에 입력

## 5. Vercel 배포
1. 이 저장소를 GitHub에 push
2. vercel.com에서 Import → 환경변수 3개(`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_ADMIN_PASSWORD`) 등록 후 배포
3. 프로그램별 QR 코드는 `https://<도메인>/checkin/<session.qr_token>` 형태로 생성해 현장에 비치

## 6. 핵심 KPI 정의
- **신청→참석률**: 실제 참석자 수 / 신청자 수
- **재참여율**: (2개 이상 프로그램에 출석 기록이 있는 참여자 수) / (출석 기록이 있는 전체 참여자 수)
- **평균 참여 횟수**: 전체 체크인 수 / 전체 등록 참여자 수
- **프로그램 전환율**: 프로그램 A 출석자 중 프로그램 B에도 출석한 사람 비율
- **만족도**: 프로그램별 설문 만족도(1~5)의 평균
- **재참여 의향**: "꼭 참여하고 싶어요" + "관심 있어요" 응답 비율

계산 로직은 `src/lib/kpi.ts`에 있다.

## 7. 구현 범위
- **P0 (완료)**: 프로그램 목록/상세, 참여자 등록, 신청, QR 체크인, 출석 저장, 나의 패스포트, 관리자 대시보드, KPI
- **P1 (완료)**: 스탬프, 만족도 조사, 다음 프로그램 추천, 유입경로 분석, 프로그램 전환율
- **P2 (미구현, 구조만 확장 가능)**: 알림, 고급 분석, 데이터 export, 여러 동 확장, 관리자 권한 세분화

## 8. 실서비스 전환 전 체크리스트
- [ ] 개인정보 수집·이용 동의 화면 및 보관/삭제 정책 추가
- [ ] 관리자 인증을 Supabase Auth(이메일/비밀번호 또는 SSO)로 교체
- [ ] RLS 정책을 참여자 본인 데이터만 조회 가능하도록 좁히기 (현재는 MVP 검증을 위해 넓게 열려 있음)
- [ ] 집계·관리자 조회를 Route Handler + service role key로 이전 (anon key 직접 노출 최소화)
- [ ] QR 발급/출력 운영 프로세스 정의 (회차별 포스터/테이블 스탠드 등)

## 9. 4~8주 현장 운영 시 검증해야 할 것

핵심 가설(위 참고)을 검증하기 위해 다음을 측정한다.

| 측정 항목 | 방법 | 성공 기준 예시 |
|---|---|---|
| ID 연결이 실제로 되는가 | 동일 이름+전화번호 뒤4자리로 재등록 시 신규 레코드가 아닌 기존 참여자로 매칭되는 비율 | 매칭 실패(중복 생성)율 5% 미만 |
| 추천이 다음 참여로 이어지는가 | 설문 제출 후 추천된 다음 프로그램 상세 페이지 클릭률, 실제 신청 전환율 | 추천 노출 대비 신청 전환 15%+ |
| 재참여율 변화 | 4주차, 8주차 시점의 재참여율(섹션 6 정의)을 비교 | 운영 전 대비 재참여율 상승 |
| 유입경로별 실참여 기여도 | 채널별 신청자 수 대비 실제 출석률 비교 | 저비용 채널(SNS/카카오톡) 대비 동주민센터·지인추천의 참석 전환 확인 |
| 데이터 축적의 지속성 | 프로그램 종료 후에도 패스포트에 누적 기록이 남아있는지, 참여자가 재방문해 확인하는지 | 패스포트 재방문(로그인) 비율 |

운영 중 매주 관리자 대시보드의 KPI 스냅샷을 기록해두면, 종료 시점에
"ID 연결 + 추천이 재참여율을 실제로 끌어올렸는지"를 정량적으로 비교할 수 있다.

## 10. 추가된 기능 (운영자 프로그램 관리 / 회원가입 인증 / QR 발급 / 갤러리·공지)

### 10-1. 운영자 프로그램 생성·게시
- `/admin/programs` — 프로그램 목록, 게시/비공개 전환
- `/admin/programs/new` — 새 프로그램 생성 (기본정보 + 회차 일정 한 번에 입력, "초안 저장" 또는 "저장 후 게시")
- `/admin/programs/[id]/edit` — 정보 수정, 회차 추가/삭제/수정, 프로그램 삭제
- 홈 화면(`/`)에는 `is_published = true`인 프로그램만 노출된다.

### 10-2. 참여자 가입 절차 (개인정보 동의 + 휴대폰 인증)
`/join` 흐름이 4단계로 변경되었다.
1. **개인정보 수집·이용 동의** — 수집 항목/목적/보유기간 고지 + 필수 동의 체크박스 2개
2. **휴대폰 번호 입력** → 인증번호 발송
3. **인증번호 확인** (`phone_verifications` 테이블, 5분 만료, 1회용)
4. 이름/연령대/거주지역/유입경로 입력 후 신청 완료

⚠️ 이 환경에는 실제 SMS 발송 연동이 없어 **인증번호를 화면에 함께 표시하는 데모 모드**로 구현했다
(`src/lib/otp.ts`). 실서비스 전환 시 이 파일만 SMS 프로바이더(NHN Cloud, 알리고, Solapi 등) 연동으로
교체하고, 화면에 코드가 노출되지 않도록 반드시 제거해야 한다.

### 10-3. QR 코드 생성 · 저장 · 출력
`/admin/programs/[id]/qr`에서 프로그램의 모든 회차에 대한 QR 코드를 한 번에 확인할 수 있다.
- 개별/전체 PNG 다운로드
- 인쇄 버튼 → 인쇄용 2열 그리드 레이아웃으로 전환 (`window.print()`)
- QR은 `session.qr_token`(랜덤 토큰)을 담은 `/checkin/[token]` URL을 인코딩한다.

### 10-4. 공지 게시판 / 사진 갤러리
- `/admin/announcements`, `/admin/photos`에서 운영자가 등록·삭제
- 사진은 Supabase Storage `gallery` 버킷에 업로드된다. **schema.sql 실행 시 버킷이 자동 생성**되지만,
  Supabase 대시보드 > Storage에서 `gallery` 버킷이 Public으로 되어 있는지 한 번 확인할 것.
- 프로그램 상세(신청) 페이지(`/programs/[id]`)에 해당 프로그램 공지 + 전체 공지, 해당 프로그램 사진 +
  전체 갤러리 사진이 함께 노출된다.

### 10-5. 스키마 변경 요약
`supabase/schema.sql` 하단에 추가된 내용을 반드시 기존 프로젝트에도 실행할 것:
- `participants`에 `phone_number`, `privacy_consent_at`, `terms_version` 컬럼 추가
- `programs`에 `is_published`, `created_by` 컬럼 추가
- 신규 테이블: `phone_verifications`, `announcements`, `photos`
- Storage 버킷 `gallery` 및 관련 정책 생성

## 11. 실사용 전환 — 관리자 인증 구조 변경

기존에는 관리자 비밀번호를 `NEXT_PUBLIC_ADMIN_PASSWORD`로 저장해 브라우저 쪽에서 직접 비교했다.
이 방식은 **누구나 개발자도구로 소스를 열어 비밀번호를 확인할 수 있는 심각한 보안 문제**였다.

지금은 다음 구조로 바뀌었다.

- 비밀번호는 `ADMIN_PASSWORD` (서버 전용 환경변수, `NEXT_PUBLIC_` 접두사 없음)로 저장 — 브라우저에 절대 노출되지 않는다.
- 로그인은 `/api/admin/login` 서버 라우트에서만 비교하고, 성공 시 `httpOnly` 쿠키(`admin_auth`)를 발급한다. 이 쿠키는 JS로 읽을 수 없다.
- `src/middleware.ts`가 `/admin/*` 요청을 서버 단에서 가로채 쿠키를 검증하고, 없으면 `/admin/login`으로 리다이렉트한다.
- 로그아웃은 `/api/admin/logout`이 쿠키를 만료시킨다.

**Vercel 환경변수를 반드시 아래처럼 바꿔야 한다** (기존 `NEXT_PUBLIC_ADMIN_PASSWORD`는 삭제):

```
ADMIN_PASSWORD=원하는_비밀번호
ADMIN_COOKIE_SECRET=임의의_긴_무작위_문자열
```

## 12. 실사용 시작 전 체크리스트

- [ ] Vercel 환경변수에서 `NEXT_PUBLIC_ADMIN_PASSWORD` 삭제, `ADMIN_PASSWORD` / `ADMIN_COOKIE_SECRET` 추가
- [ ] 데모 참여자 46명 삭제 (아래 SQL 참고) — 실제 신청 데이터만 남기기
- [ ] 휴대폰 인증을 실제 SMS 연동으로 교체 (`src/lib/otp.ts`) — 지금은 인증번호가 화면에 그대로 표시되는 데모 모드. 실제 운영 전 반드시 SMS 프로바이더(Solapi, NHN Cloud 등) 연동으로 교체하고, 화면에 코드가 보이지 않도록 수정할 것
- [ ] 갤러리의 placeholder 사진(Unsplash)을 실제 활동 사진으로 교체
- [ ] 개인정보처리방침 문구(수집 항목/목적/보유기간)를 실제 기관 기준으로 검수
- [ ] RLS 정책 재검토 — 현재 참여자 관련 테이블은 익명 사용자가 읽고 쓸 수 있게 넓게 열려 있음(누구나 참여자 정보를 조회 가능). 실제 개인정보 보호를 위해서는 참여자 본인 데이터만 조회 가능하도록 좁히는 작업이 필요 (실제 사용자 인증 체계 도입과 함께 진행 권장)

### 데모 데이터 삭제 SQL (실사용 시작 직전 1회 실행)
```sql
truncate table stamps, surveys, attendance, registrations, phone_verifications, consents restart identity cascade;
delete from participants;
-- programs, sessions, announcements, photos는 그대로 유지
```

## 13. 실사용 전환 (2) — 참여자 개인정보 보호 강화

기존에는 `participants` 테이블(이름/전화번호/연령대/거주지역)에 익명 사용자도 전체 조회가 가능한 RLS 정책이 있었다.
브라우저에 노출된 anon key로 **누구나 개발자도구/직접 API 호출을 통해 전체 참여자 개인정보를 다운로드할 수 있는 상태**였다.

이제 다음 구조로 바뀌었다.

- `participants` 테이블의 "전체 조회" RLS 정책을 제거했다.
- 주민 화면(로그인, 회원가입, 내 정보 조회)은 **좁은 범위만 반환하는 Postgres 함수**(`rpc_find_participant`, `rpc_get_my_participant`, `rpc_check_phone_exists`, `rpc_create_participant`)를 통해서만 접근한다. 이 함수들은 이름+전화번호 뒤4자리 매칭, 또는 이미 알고 있는(추측 불가능한) 본인의 UUID로만 정보를 반환한다.
- **관리자 전용 데이터**(참여자 명단 전체, 신청자 관리 화면)는 `/api/admin/participants`, `/api/admin/applications/[programId]` 같은 서버 Route Handler를 거친다. 이 라우트는 (1) 관리자 로그인 쿠키를 서버에서 검증하고, (2) `SUPABASE_SERVICE_ROLE_KEY`(RLS를 우회하는 서버 전용 키)로 조회한다. 브라우저는 이 결과를 fetch로만 받아본다 — 직접 DB에 접근하지 않는다.

**Vercel 환경변수에 반드시 추가해야 한다**: `SUPABASE_SERVICE_ROLE_KEY` (Supabase > API Keys > Secret keys에서 발급, `NEXT_PUBLIC_` 접두사 절대 금지).

### 아직 남은 낮은 우선순위 항목
`registrations`, `attendance`, `consents` 테이블은 여전히 익명 조회가 넓게 열려있다(참여자의 신청 상태, 체크인 시각, 동의 여부가 참여자 ID와 함께 노출될 수 있음). `participants`만큼 직접적인 PII는 아니지만, 실사용 규모가 커지면 같은 방식(RPC 또는 서버 API 경유)으로 좁히는 것을 권장한다.
