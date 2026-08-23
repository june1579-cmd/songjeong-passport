-- 송정 평생학습 패스포트 — Supabase / PostgreSQL 스키마
-- 실행: Supabase 프로젝트 SQL Editor에 붙여넣고 실행하세요.

create extension if not exists pgcrypto;

-- 1. 참여자 (최소 개인정보만 수집)
create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone4 text not null check (char_length(phone4) = 4),
  age_group text not null,
  residence_area text not null,
  created_at timestamptz not null default now(),
  unique (name, phone4)
);

-- 2. 프로그램
create table if not exists programs (
  id text primary key,                 -- slug (예: 'surf', 'board-art')
  title text not null,
  description text,
  location text,
  address text,
  fee text default '무료',
  target text,
  requirement text,
  prep text,
  instructor text,
  emoji text,
  capacity int default 10,
  status text not null default 'open', -- open | closed
  next_program_id text references programs(id),
  next_teaser text,
  created_at timestamptz not null default now()
);

-- 3. 회차
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  program_id text not null references programs(id) on delete cascade,
  session_label text not null,         -- 예: '1차 · 폐보드 재활'
  session_date date not null,
  start_time time not null default '10:00',
  end_time time not null default '12:00',
  qr_token text not null unique default encode(gen_random_bytes(9), 'base64'),
  created_at timestamptz not null default now()
);
create index if not exists idx_sessions_program on sessions(program_id);

-- 4. 신청
create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  program_id text not null references programs(id) on delete cascade,
  acquisition_channel text not null,
  registered_at timestamptz not null default now(),
  unique (participant_id, program_id)
);
create index if not exists idx_registrations_participant on registrations(participant_id);
create index if not exists idx_registrations_program on registrations(program_id);

-- 5. 출석 (QR 체크인) — 동일 회차 중복 체크인 방지
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  program_id text not null references programs(id) on delete cascade,
  session_id uuid not null references sessions(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  unique (participant_id, session_id)
);
create index if not exists idx_attendance_participant on attendance(participant_id);
create index if not exists idx_attendance_program on attendance(program_id);

-- 6. 만족도 조사
create table if not exists surveys (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  program_id text not null references programs(id) on delete cascade,
  satisfaction int not null check (satisfaction between 1 and 5),
  revisit_intention text not null,
  next_interest text,
  submitted_at timestamptz not null default now()
);
create index if not exists idx_surveys_program on surveys(program_id);

-- 7. 스탬프 (attendance 발생 시 앱에서 함께 기록; 조회 편의를 위한 비정규화 테이블)
create table if not exists stamps (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  program_id text not null references programs(id) on delete cascade,
  session_id uuid not null references sessions(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (participant_id, session_id)
);

-- ---------------------------------------------------------------
-- RLS: MVP 단계에서는 익명 사용자가 자기 정보를 쓰고 읽을 수 있도록
-- 넓게 열어둔다. 실서비스 전환 시 참여자별 접근 범위를 좁힐 것.
-- (섹션 24 개인정보 원칙 참고 — README의 "실서비스 전환 체크리스트" 참조)
-- ---------------------------------------------------------------
alter table participants enable row level security;
alter table programs enable row level security;
alter table sessions enable row level security;
alter table registrations enable row level security;
alter table attendance enable row level security;
alter table surveys enable row level security;
alter table stamps enable row level security;

create policy "public read programs" on programs for select using (true);
create policy "public read sessions" on sessions for select using (true);

create policy "anon insert participants" on participants for insert with check (true);
create policy "anon read participants" on participants for select using (true);

create policy "anon insert registrations" on registrations for insert with check (true);
create policy "anon read registrations" on registrations for select using (true);

create policy "anon insert attendance" on attendance for insert with check (true);
create policy "anon read attendance" on attendance for select using (true);

create policy "anon insert surveys" on surveys for insert with check (true);
create policy "anon read surveys" on surveys for select using (true);

create policy "anon insert stamps" on stamps for insert with check (true);
create policy "anon read stamps" on stamps for select using (true);

-- =================================================================
-- 확장 1: 운영자 프로그램 생성/게시, 휴대폰 인증, 공지사항, 사진 갤러리
-- =================================================================

-- participants: 휴대폰 전체 번호 + 개인정보 동의 이력 추가
alter table participants add column if not exists phone_number text;
alter table participants add column if not exists privacy_consent_at timestamptz;
alter table participants add column if not exists terms_version text default 'v1';

-- programs: 운영자가 만든 프로그램은 초안(draft) 상태로 시작해 검토 후 게시(published)
alter table programs add column if not exists is_published boolean not null default false;
alter table programs add column if not exists created_by text default 'admin';

-- 휴대폰 인증 (OTP)
create table if not exists phone_verifications (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null,
  code text not null,
  expires_at timestamptz not null,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_phone_verifications_phone on phone_verifications(phone_number);

-- 공지사항 (program_id가 null이면 전체 공지)
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  program_id text references programs(id) on delete cascade,
  title text not null,
  content text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_announcements_program on announcements(program_id);

-- 사진 갤러리 (program_id가 null이면 전체 갤러리)
create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  program_id text references programs(id) on delete cascade,
  image_url text not null,
  caption text,
  created_at timestamptz not null default now()
);
create index if not exists idx_photos_program on photos(program_id);

alter table phone_verifications enable row level security;
alter table announcements enable row level security;
alter table photos enable row level security;
alter table programs enable row level security;

create policy "anon insert phone_verifications" on phone_verifications for insert with check (true);
create policy "anon select own phone_verifications" on phone_verifications for select using (true);
create policy "anon update phone_verifications" on phone_verifications for update using (true);

create policy "public read announcements" on announcements for select using (true);
create policy "admin write announcements" on announcements for insert with check (true);
create policy "admin update announcements" on announcements for update using (true);
create policy "admin delete announcements" on announcements for delete using (true);

create policy "public read photos" on photos for select using (true);
create policy "admin write photos" on photos for insert with check (true);
create policy "admin delete photos" on photos for delete using (true);

create policy "admin write programs" on programs for insert with check (true);
create policy "admin update programs" on programs for update using (true);
create policy "admin write sessions" on sessions for insert with check (true);
create policy "admin delete sessions" on sessions for delete using (true);

-- 사진 업로드용 Storage 버킷 (공개 읽기, MVP는 익명 업로드 허용 — 실서비스 전환 시 운영자 인증 필요)
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

drop policy if exists "public read gallery bucket" on storage.objects;
create policy "public read gallery bucket" on storage.objects for select using (bucket_id = 'gallery');

drop policy if exists "anon upload gallery bucket" on storage.objects;
create policy "anon upload gallery bucket" on storage.objects for insert with check (bucket_id = 'gallery');

-- =================================================================
-- 확장 2: 회차별 정원(선택), 정원 제한 없음 지원
-- =================================================================
alter table programs alter column capacity drop not null;
alter table programs alter column capacity drop default;
alter table sessions add column if not exists capacity int; -- null = 이 회차는 정원 제한 없음

-- =================================================================
-- 확장 3: 신청 상태(선정/대기/미선정), 동의 이력 저장, 프로그램 상태/카테고리
-- =================================================================

-- 신청 상태: applied(신청) / selected(선정) / waitlisted(대기) / rejected(미선정) / cancelled(취소)
alter table registrations add column if not exists status text not null default 'applied'
  check (status in ('applied','selected','waitlisted','rejected','cancelled'));

-- 프로그램 진행 상태(표시용) + 카테고리
alter table programs add column if not exists program_status text not null default 'draft'
  check (program_status in ('draft','scheduled','recruiting','closed','in_progress','completed','cancelled'));
alter table programs add column if not exists category text;
alter table programs add column if not exists waiting_capacity int;

-- 개인정보 동의 이력 (항목별/버전별 기록)
create table if not exists consents (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  consent_type text not null,       -- 'privacy_required' | 'operation_required' | 'attendance_required' | 'marketing_optional' | 'media_optional'
  consent_version text not null default 'v1',
  agreed boolean not null,
  agreed_at timestamptz not null default now()
);
create index if not exists idx_consents_participant on consents(participant_id);

alter table consents enable row level security;
drop policy if exists "anon insert consents" on consents;
create policy "anon insert consents" on consents for insert with check (true);
drop policy if exists "anon read consents" on consents;
create policy "anon read consents" on consents for select using (true);

drop policy if exists "admin update registrations" on registrations;
create policy "admin update registrations" on registrations for update using (true);

-- =================================================================
-- 확장 4: 참여자가 직접 남기는 사진·후기 (프로그램별 오픈 갤러리)
-- =================================================================
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  program_id text not null references programs(id) on delete cascade,
  author_name text not null,
  rating int check (rating between 1 and 5),
  content text,
  image_url text,
  created_at timestamptz not null default now()
);
create index if not exists idx_reviews_program on reviews(program_id);

alter table reviews enable row level security;
drop policy if exists "public read reviews" on reviews;
create policy "public read reviews" on reviews for select using (true);
drop policy if exists "anon insert reviews" on reviews;
create policy "anon insert reviews" on reviews for insert with check (true);

-- =================================================================
-- 확장 5: 참여자 보관/삭제 관리, 대기자 자동 승격 알림 로그
-- =================================================================
alter table participants add column if not exists is_archived boolean not null default false;

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  program_id text references programs(id) on delete cascade,
  channel text not null default 'sms',
  message text not null,
  status text not null default 'pending', -- pending | sent | failed (실제 발송 연동 전까지는 pending으로 기록만 됨)
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_participant on notifications(participant_id);

alter table notifications enable row level security;
drop policy if exists "admin read notifications" on notifications;
create policy "admin read notifications" on notifications for select using (true);
drop policy if exists "admin insert notifications" on notifications;
create policy "admin insert notifications" on notifications for insert with check (true);

drop policy if exists "admin delete participants" on participants;
create policy "admin delete participants" on participants for delete using (true);
drop policy if exists "admin update participants" on participants;
create policy "admin update participants" on participants for update using (true);

-- =================================================================
-- 확장 6: 참여자 개인정보 보호 강화 — 익명 사용자의 전체 조회(스크래핑) 차단
-- =================================================================

-- 지금까지는 이 정책 때문에 브라우저에 노출된 anon key로 누구나
-- participants 테이블(이름/전화번호/연령대/거주지역)을 통째로 읽을 수 있었다.
-- 이 정책을 없애고, 앱에 실제로 필요한 조회만 좁게 허용하는 함수로 대체한다.
drop policy if exists "anon read participants" on participants;

-- 이름+전화번호 뒤4자리로 본인 확인 (패스포트 로그인, 기존 참여자 매칭용) — 필요한 컬럼만 반환
create or replace function rpc_find_participant(p_name text, p_phone4 text)
returns table (id uuid, name text, age_group text, residence_area text, phone_number text)
language sql security definer set search_path = public as $$
  select id, name, age_group, residence_area, phone_number
  from participants
  where name = p_name and phone4 = p_phone4
  limit 1;
$$;

-- 이미 로그인되어 id를 알고 있는 상태에서 내 정보 불러오기 (id는 추측 불가능한 UUID)
create or replace function rpc_get_my_participant(p_id uuid)
returns table (id uuid, name text, age_group text, residence_area text, phone_number text, phone4 text, privacy_consent_at timestamptz, is_archived boolean, created_at timestamptz)
language sql security definer set search_path = public as $$
  select id, name, age_group, residence_area, phone_number, phone4, privacy_consent_at, is_archived, created_at
  from participants
  where id = p_id
  limit 1;
$$;

-- 전화번호로 기존 가입 여부만 확인 (id만 반환, 다른 개인정보 노출 없음)
create or replace function rpc_check_phone_exists(p_phone_number text)
returns uuid
language sql security definer set search_path = public as $$
  select id from participants where phone_number = p_phone_number limit 1;
$$;

-- 회원가입 시 참여자 생성 (insert 후 값을 돌려받으려면 select 권한이 필요한데,
-- select 정책을 없앴으므로 생성+반환을 함수 안에서 함께 처리)
create or replace function rpc_create_participant(
  p_name text, p_phone4 text, p_phone_number text, p_age_group text, p_residence_area text
)
returns uuid
language sql security definer set search_path = public as $$
  insert into participants (name, phone4, phone_number, age_group, residence_area, privacy_consent_at)
  values (p_name, p_phone4, p_phone_number, p_age_group, p_residence_area, now())
  returning id;
$$;

grant execute on function rpc_find_participant(text, text) to anon;
grant execute on function rpc_get_my_participant(uuid) to anon;
grant execute on function rpc_check_phone_exists(text) to anon;
grant execute on function rpc_create_participant(text, text, text, text, text) to anon;

-- participants insert/update/delete는 이제 서버 전용 API(서비스 롤 키)로만 수행하므로
-- 익명 직접 insert 정책은 제거한다(가입은 위 rpc_create_participant를 통해서만 가능).
drop policy if exists "anon insert participants" on participants;

-- =================================================================
-- 확장 7: 신청 시 회차(스케줄) 선택 저장
-- =================================================================
create table if not exists registration_sessions (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references registrations(id) on delete cascade,
  session_id uuid not null references sessions(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  program_id text not null references programs(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (registration_id, session_id)
);
create index if not exists idx_regsessions_participant on registration_sessions(participant_id);
create index if not exists idx_regsessions_session on registration_sessions(session_id);

alter table registration_sessions enable row level security;
drop policy if exists "anon insert registration_sessions" on registration_sessions;
create policy "anon insert registration_sessions" on registration_sessions for insert with check (true);
drop policy if exists "public read registration_sessions" on registration_sessions;
create policy "public read registration_sessions" on registration_sessions for select using (true);

-- =================================================================
-- 확장 8: 프로그램별 회차 신청 방식 (자유 선택 vs 고정 기수제)
-- =================================================================
-- select: 서핑체험처럼 참여자가 원하는 회차를 골라서 신청 (필요시 인당 최대 회차 수 제한)
-- fixed : 폐서핑보드 작품 만들기처럼 처음 모집된 인원이 전체 회차를 함께 진행하는 고정 기수제.
--         회차 선택 UI 없이 신청과 동시에 전체 회차에 자동 등록되고, 정원은 프로그램 전체 기준으로 관리한다.
alter table programs add column if not exists session_selection_mode text not null default 'select'
  check (session_selection_mode in ('select', 'fixed'));
alter table programs add column if not exists max_selectable_sessions int; -- null = 제한 없음 (select 모드에서만 사용)

update programs set session_selection_mode = 'select', max_selectable_sessions = 2 where id = 'surf';
update programs set session_selection_mode = 'fixed', max_selectable_sessions = null where id = 'board-art';

-- =================================================================
-- 확장 9: 강사 프로필(사진/소개) 추가
-- =================================================================
alter table programs add column if not exists instructor_bio text;
alter table programs add column if not exists instructor_photo_url text;

-- =================================================================
-- 확장 10: 프로그램 삭제가 막히던 문제 수정
-- =================================================================
-- 1) "다음 추천 프로그램"으로 다른 프로그램이 가리키고 있으면 삭제가 막혔던 문제 —
--    삭제 시 그 연결만 자동으로 풀리도록(null) 변경.
alter table programs drop constraint if exists programs_next_program_id_fkey;
alter table programs add constraint programs_next_program_id_fkey
  foreign key (next_program_id) references programs(id) on delete set null;

-- =================================================================
-- 확장 11: 프로그램/회차 생성·수정을 서버 API 전용으로 전환
-- =================================================================
-- 지금까지는 이 정책들 때문에 브라우저에 노출된 anon key로 누구나
-- 프로그램을 만들거나 내용을 바꿀 수 있었다. 이제 관리자 화면은
-- /api/admin/programs 서버 라우트(관리자 로그인 확인 + 서비스 롤 키)를 통해서만
-- 쓰기 작업을 하므로 이 익명 쓰기 정책들은 제거한다. 읽기(public read)는 그대로 유지.
drop policy if exists "admin write programs" on programs;
drop policy if exists "admin update programs" on programs;
drop policy if exists "admin write sessions" on sessions;
drop policy if exists "admin delete sessions" on sessions;

-- =================================================================
-- 확장 12: 프로그램별 참여자 대화방 (실시간 채팅)
-- =================================================================
create table if not exists program_messages (
  id uuid primary key default gen_random_uuid(),
  program_id text not null references programs(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  author_name text not null,
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_program_messages_program on program_messages(program_id, created_at);

alter table program_messages enable row level security;
drop policy if exists "public read program_messages" on program_messages;
create policy "public read program_messages" on program_messages for select using (true);
drop policy if exists "anon insert program_messages" on program_messages;
create policy "anon insert program_messages" on program_messages for insert with check (true);

-- 실시간 기능(Realtime)을 이 테이블에 활성화 (메시지가 즉시 다른 참여자 화면에 뜨도록)
alter publication supabase_realtime add table program_messages;

-- =================================================================
-- 확장 13: 거주지 상세화(구/군 + 동/읍/면), 회원가입 인적사항 반영
-- =================================================================
alter table participants add column if not exists residence_district text; -- 구/군 (예: 해운대구)
alter table participants add column if not exists residence_dong text;     -- 동/읍/면 (예: 송정동)

-- 회원가입 시 상세 주소를 받도록 RPC 함수 확장 (기존 호출과의 호환을 위해 새 파라미터는 끝에 옵션으로 추가)
create or replace function rpc_create_participant(
  p_name text, p_phone4 text, p_phone_number text, p_age_group text, p_residence_area text,
  p_residence_district text default null, p_residence_dong text default null
)
returns uuid
language sql security definer set search_path = public as $$
  insert into participants (name, phone4, phone_number, age_group, residence_area, residence_district, residence_dong, privacy_consent_at)
  values (p_name, p_phone4, p_phone_number, p_age_group, p_residence_area, p_residence_district, p_residence_dong, now())
  returning id;
$$;
grant execute on function rpc_create_participant(text, text, text, text, text, text, text) to anon;

create or replace function rpc_get_my_participant(p_id uuid)
returns table (
  id uuid, name text, age_group text, residence_area text, phone_number text, phone4 text,
  privacy_consent_at timestamptz, is_archived boolean, created_at timestamptz,
  residence_district text, residence_dong text
)
language sql security definer set search_path = public as $$
  select id, name, age_group, residence_area, phone_number, phone4, privacy_consent_at, is_archived, created_at,
         residence_district, residence_dong
  from participants
  where id = p_id
  limit 1;
$$;

create or replace function rpc_find_participant(p_name text, p_phone4 text)
returns table (id uuid, name text, age_group text, residence_area text, phone_number text, residence_district text, residence_dong text)
language sql security definer set search_path = public as $$
  select id, name, age_group, residence_area, phone_number, residence_district, residence_dong
  from participants
  where name = p_name and phone4 = p_phone4
  limit 1;
$$;

-- =================================================================
-- 확장 14: 사진 갤러리 업로드 안 되는 문제 — 버킷/정책 재확인 및 재생성
-- =================================================================
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do update set public = true;

drop policy if exists "public read gallery bucket" on storage.objects;
create policy "public read gallery bucket" on storage.objects for select using (bucket_id = 'gallery');

drop policy if exists "anon upload gallery bucket" on storage.objects;
create policy "anon upload gallery bucket" on storage.objects for insert with check (bucket_id = 'gallery');

drop policy if exists "admin write photos" on photos;
create policy "admin write photos" on photos for insert with check (true);

-- =================================================================
-- 확장 15: registrations/attendance/consents 익명 전체 조회 차단
-- =================================================================
-- INSERT 정책(신청/체크인/동의 기록 생성)은 그대로 유지 — 문제는 "전체 조회"였다.
drop policy if exists "anon read registrations" on registrations;
drop policy if exists "anon read attendance" on attendance;
drop policy if exists "anon read consents" on consents;

-- 공개 집계(정원 표시용) — 개인 식별 정보 없이 프로그램별/회차별 신청·출석 인원수만 반환
create or replace function rpc_program_registration_counts()
returns table (program_id text, active_count bigint, selected_count bigint)
language sql security definer set search_path = public as $$
  select program_id,
         count(*) filter (where status not in ('cancelled', 'rejected')) as active_count,
         count(*) filter (where status = 'selected') as selected_count
  from registrations
  group by program_id;
$$;
grant execute on function rpc_program_registration_counts() to anon;

create or replace function rpc_session_attendance_counts(p_program_id text)
returns table (session_id uuid, cnt bigint)
language sql security definer set search_path = public as $$
  select session_id, count(*) from attendance where program_id = p_program_id group by session_id;
$$;
grant execute on function rpc_session_attendance_counts(text) to anon;

-- 본인 참여자 ID(추측 불가능한 UUID)로만 조회 가능한 함수들
create or replace function rpc_get_my_registrations(p_participant_id uuid)
returns setof registrations
language sql security definer set search_path = public as $$
  select * from registrations where participant_id = p_participant_id;
$$;
grant execute on function rpc_get_my_registrations(uuid) to anon;

create or replace function rpc_get_my_registration_for_program(p_participant_id uuid, p_program_id text)
returns setof registrations
language sql security definer set search_path = public as $$
  select * from registrations where participant_id = p_participant_id and program_id = p_program_id limit 1;
$$;
grant execute on function rpc_get_my_registration_for_program(uuid, text) to anon;

create or replace function rpc_get_my_attendance(p_participant_id uuid)
returns setof attendance
language sql security definer set search_path = public as $$
  select * from attendance where participant_id = p_participant_id order by checked_in_at asc;
$$;
grant execute on function rpc_get_my_attendance(uuid) to anon;

create or replace function rpc_get_my_attendance_for_program(p_participant_id uuid, p_program_id text)
returns setof attendance
language sql security definer set search_path = public as $$
  select * from attendance where participant_id = p_participant_id and program_id = p_program_id;
$$;
grant execute on function rpc_get_my_attendance_for_program(uuid, text) to anon;

create or replace function rpc_check_attendance(p_participant_id uuid, p_session_id uuid)
returns setof attendance
language sql security definer set search_path = public as $$
  select * from attendance where participant_id = p_participant_id and session_id = p_session_id limit 1;
$$;
grant execute on function rpc_check_attendance(uuid, uuid) to anon;

create or replace function rpc_get_my_consent(p_participant_id uuid, p_consent_type text)
returns boolean
language sql security definer set search_path = public as $$
  select agreed from consents
  where participant_id = p_participant_id and consent_type = p_consent_type
  order by agreed_at desc limit 1;
$$;
grant execute on function rpc_get_my_consent(uuid, text) to anon;

-- =================================================================
-- 확장 16: 신청 생성 시 방금 만든 행을 돌려받으려면 select 권한이 필요한데,
-- 익명 select를 막았으므로 생성+반환을 함수 안에서 함께 처리한다.
-- (participant_id, program_id) unique 제약이 있어 이미 신청한 경우 기존 행의 id를 그대로 반환한다.
-- =================================================================
create or replace function rpc_create_registration(p_participant_id uuid, p_program_id text, p_acquisition_channel text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  reg_id uuid;
begin
  insert into registrations (participant_id, program_id, acquisition_channel, status)
  values (p_participant_id, p_program_id, p_acquisition_channel, 'applied')
  on conflict (participant_id, program_id) do nothing
  returning id into reg_id;

  if reg_id is null then
    select id into reg_id from registrations where participant_id = p_participant_id and program_id = p_program_id;
  end if;

  return reg_id;
end;
$$;
grant execute on function rpc_create_registration(uuid, text, text) to anon;

-- =================================================================
-- 확장 17: 같은 전화번호로 중복 가입 방지 (DB 차원에서 확실하게 잠금)
-- =================================================================
-- phone_number가 null인 레코드는 여러 개 있어도 무방(표준 SQL: null끼리는 unique 위반 아님).
-- 이미 중복 데이터가 있으면 이 제약 추가가 실패할 수 있으니, 먼저 아래 조회로 확인 후 진행 권장:
--   select phone_number, count(*) from participants where phone_number is not null group by phone_number having count(*) > 1;
alter table participants add constraint participants_phone_number_key unique (phone_number);

-- =================================================================
-- 확장 18: 참여자 대화방 사진 첨부
-- =================================================================
alter table program_messages add column if not exists image_url text;

-- =================================================================
-- 확장 19: 미성년자 가입 시 보호자 정보 수집
-- =================================================================
alter table participants add column if not exists guardian_name text;
alter table participants add column if not exists guardian_phone text;

create or replace function rpc_create_participant(
  p_name text, p_phone4 text, p_phone_number text, p_age_group text, p_residence_area text,
  p_residence_district text default null, p_residence_dong text default null,
  p_guardian_name text default null, p_guardian_phone text default null
)
returns uuid
language sql security definer set search_path = public as $$
  insert into participants (name, phone4, phone_number, age_group, residence_area, residence_district, residence_dong, guardian_name, guardian_phone, privacy_consent_at)
  values (p_name, p_phone4, p_phone_number, p_age_group, p_residence_area, p_residence_district, p_residence_dong, p_guardian_name, p_guardian_phone, now())
  returning id;
$$;
grant execute on function rpc_create_participant(text, text, text, text, text, text, text, text, text) to anon;

drop function if exists rpc_get_my_participant(uuid);
create function rpc_get_my_participant(p_id uuid)
returns table (
  id uuid, name text, age_group text, residence_area text, phone_number text, phone4 text,
  privacy_consent_at timestamptz, is_archived boolean, created_at timestamptz,
  residence_district text, residence_dong text, guardian_name text, guardian_phone text
)
language sql security definer set search_path = public as $$
  select id, name, age_group, residence_area, phone_number, phone4, privacy_consent_at, is_archived, created_at,
         residence_district, residence_dong, guardian_name, guardian_phone
  from participants
  where id = p_id
  limit 1;
$$;
grant execute on function rpc_get_my_participant(uuid) to anon;

-- =================================================================
-- 확장 20: 취소/미선정된 신청을 다시 신청할 때 상태가 되돌아가지 않던 문제 수정
-- =================================================================
create or replace function rpc_create_registration(p_participant_id uuid, p_program_id text, p_acquisition_channel text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  reg_id uuid;
  reg_status text;
begin
  insert into registrations (participant_id, program_id, acquisition_channel, status)
  values (p_participant_id, p_program_id, p_acquisition_channel, 'applied')
  on conflict (participant_id, program_id) do nothing
  returning id into reg_id;

  if reg_id is null then
    select id, status into reg_id, reg_status from registrations where participant_id = p_participant_id and program_id = p_program_id;
    -- 예전에 취소/미선정됐던 신청을 다시 신청하는 경우 상태를 '신청'으로 되돌리고,
    -- 예전에 골랐던 회차 선택은 지워서 깨끗하게 새로 고를 수 있게 한다.
    if reg_status in ('cancelled', 'rejected') then
      update registrations set status = 'applied', acquisition_channel = p_acquisition_channel, registered_at = now()
      where id = reg_id;
      delete from registration_sessions where registration_id = reg_id;
    end if;
  end if;

  return reg_id;
end;
$$;
grant execute on function rpc_create_registration(uuid, text, text) to anon;

-- =================================================================
-- 확장 21: 프로그램 간 시간 겹침 방지를 위한 내 전체 일정 조회
-- =================================================================
create or replace function rpc_get_my_schedule(p_participant_id uuid)
returns table (program_id text, session_id uuid, session_date date, start_time time, end_time time)
language sql security definer set search_path = public as $$
  select s.program_id, s.id as session_id, s.session_date, s.start_time, s.end_time
  from registration_sessions rs
  join sessions s on s.id = rs.session_id
  join registrations r on r.id = rs.registration_id
  where rs.participant_id = p_participant_id
    and r.status not in ('cancelled', 'rejected');
$$;
grant execute on function rpc_get_my_schedule(uuid) to anon;

-- =================================================================
-- 확장 22: 보호자 1명(같은 전화번호) + 자녀 여러 명 가입 지원
-- =================================================================
-- 지금까지는 phone_number 하나에 참여자 한 명만 허용되어, 같은 부모 번호로
-- 자녀 여러 명을 각각 가입시킬 수 없었다(둘째부터는 첫째 계정으로 로그인되어버림).
-- "전화번호+이름"이 둘 다 같을 때만 "이미 있는 계정"으로 보고, 이름이 다르면
-- (형제자매) 같은 번호를 써도 별도 계정을 만들 수 있게 바꾼다.
alter table participants drop constraint if exists participants_phone_number_key;
drop index if exists participants_phone_number_key;
create unique index if not exists participants_phone_name_key on participants (phone_number, name);

-- 이름까지 함께 확인해서, 완전히 동일한 사람만 "이미 가입됨"으로 판단
create or replace function rpc_check_existing_participant(p_phone_number text, p_name text)
returns uuid
language sql security definer set search_path = public as $$
  select id from participants where phone_number = p_phone_number and name = p_name limit 1;
$$;
grant execute on function rpc_check_existing_participant(text, text) to anon;

-- 참여자 생성도 "전화번호+이름" 조합 충돌만 방지하도록 조정
create or replace function rpc_create_participant(
  p_name text, p_phone4 text, p_phone_number text, p_age_group text, p_residence_area text,
  p_residence_district text default null, p_residence_dong text default null,
  p_guardian_name text default null, p_guardian_phone text default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  new_id uuid;
begin
  insert into participants (name, phone4, phone_number, age_group, residence_area, residence_district, residence_dong, guardian_name, guardian_phone, privacy_consent_at)
  values (p_name, p_phone4, p_phone_number, p_age_group, p_residence_area, p_residence_district, p_residence_dong, p_guardian_name, p_guardian_phone, now())
  on conflict (phone_number, name) do nothing
  returning id into new_id;

  if new_id is null then
    select id into new_id from participants where phone_number = p_phone_number and name = p_name;
  end if;

  return new_id;
end;
$$;
grant execute on function rpc_create_participant(text, text, text, text, text, text, text, text, text) to anon;

-- =================================================================
-- 확장 23: 당일 노쇼 기록 및 블랙리스트
-- =================================================================
alter table participants add column if not exists is_blacklisted boolean not null default false;
alter table participants add column if not exists no_show_count int not null default 0;

create table if not exists no_shows (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  program_id text not null references programs(id) on delete cascade,
  session_id uuid references sessions(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_no_shows_participant on no_shows(participant_id);
-- 관리자 전용 서버 API(서비스 롤 키)로만 접근 — 익명 정책은 두지 않는다.
alter table no_shows enable row level security;

-- 신청/회원가입 화면에서 "내가 블랙리스트인지"만 확인할 수 있게 (그 외 정보는 노출 안 함)
create or replace function rpc_am_i_blacklisted(p_participant_id uuid)
returns boolean
language sql security definer set search_path = public as $$
  select is_blacklisted from participants where id = p_participant_id;
$$;
grant execute on function rpc_am_i_blacklisted(uuid) to anon;

-- rpc_get_my_participant에 블랙리스트 여부 포함 (반환 타입이 바뀌므로 drop 후 재생성 필요)
drop function if exists rpc_get_my_participant(uuid);
create function rpc_get_my_participant(p_id uuid)
returns table (
  id uuid, name text, age_group text, residence_area text, phone_number text, phone4 text,
  privacy_consent_at timestamptz, is_archived boolean, created_at timestamptz,
  residence_district text, residence_dong text, guardian_name text, guardian_phone text,
  is_blacklisted boolean
)
language sql security definer set search_path = public as $$
  select id, name, age_group, residence_area, phone_number, phone4, privacy_consent_at, is_archived, created_at,
         residence_district, residence_dong, guardian_name, guardian_phone, is_blacklisted
  from participants
  where id = p_id
  limit 1;
$$;
grant execute on function rpc_get_my_participant(uuid) to anon;
