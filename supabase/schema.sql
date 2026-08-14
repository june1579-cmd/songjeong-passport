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
