-- 송정 평생학습 패스포트 — Seed Data
-- schema.sql 실행 후 이 파일을 실행하세요.

-- 1) 실제 프로그램 3개
insert into programs (id, title, description, location, address, fee, target, requirement, prep, instructor, emoji, capacity, next_program_id, next_teaser)
values
('surf', '송정해변 서핑체험',
 '송정 앞바다에서 강사와 함께 파도를 타보는 첫 서핑 체험 프로그램입니다.',
 '송정해수욕장 (더 서프)', '부산광역시 해운대구 송정광어골로 29', '무료',
 '송정주민 및 관광객 · 회차별 10명 (선착순, 1인 최대 2회차)',
 '신장 130cm 이상 / 초등자녀는 부모 동반 필수',
 '수영복, 선크림, 개인 세면도구 (샴푸·바디워시 비치)',
 '서핑강사 옥영현 · 보조강사 송교선', '🏄', 10, 'board-art',
 '서핑 경험을 작품으로 남겨보세요.'),
('board-art', '폐서핑보드 친환경 작품 만들기',
 '버려진 서핑보드에 그림을 그려 나만의 친환경 작품으로 되살리는 프로그램입니다.',
 '갈포행복마을센터 5층', '해운대구 송정동', '무료',
 '해운대구민 6명 (송정동 거주자 우선)',
 '전 회차 참여 권장 (재활 → 밑그림 → 채색 → 전시)',
 '편한 복장, 앞치마 (준비물은 현장 지급)',
 '차혜진 작가 (미술지도사)', '🎨', 6, 'share-event',
 '내 작품이 전시되는 성과공유회에 참여하세요.'),
('share-event', '성과공유회 (작품 전시)',
 '한 학기 동안의 작품과 활동 기록을 함께 나누는 전시·공유의 자리입니다.',
 '갈포행복마을센터 5층', '해운대구 송정동', '무료',
 '송정동 평생학습 프로그램 참여자 누구나', '없음', '없음',
 '송정동 평생학습 빌리지 운영팀', '🖼', 30, null, '')
on conflict (id) do nothing;

-- 2) 회차
insert into sessions (program_id, session_label, session_date, capacity) values
('surf', '1차', '2026-08-14', 10),
('surf', '2차', '2026-08-16', 10),
('surf', '3차', '2026-08-21', 10),
('surf', '4차', '2026-08-23', 10),
('surf', '5차', '2026-08-28', 10),
('surf', '6차', '2026-08-30', 10),
('board-art', '1차 · 폐보드 재활', '2026-08-15', 6),
('board-art', '2차 · 폐보드 재활', '2026-08-16', 6),
('board-art', '3차 · 밑그림 작업', '2026-08-22', 6),
('board-art', '4차 · 밑그림 작업', '2026-08-23', 6),
('board-art', '5차 · 채색 작업', '2026-08-29', 6),
('board-art', '6차 · 채색 작업', '2026-08-30', 6),
('board-art', '7차 · 성과공유회', '2026-09-02', 6),
('share-event', '성과공유회', '2026-09-02', null);

-- 3) 데모 참여자 46명 + 신청/출석/설문 (신규·재참여자가 섞이도록 무작위 생성)
do $$
declare
  channels text[] := array['동주민센터','동주민센터','동주민센터','지인 추천','지인 추천','기존 프로그램','SNS','카카오톡','기타'];
  ages text[] := array['10대','20대','30대','40대','50대','60대 이상'];
  areas text[] := array['송정동','해운대구 다른 지역','부산 다른 지역','기타'];
  interests text[] := array['서핑','해양스포츠','환경','미술','공예','사진','지역문화','기타'];
  revisits text[] := array['꼭 참여하고 싶어요','꼭 참여하고 싶어요','관심 있어요','관심 있어요','잘 모르겠어요','참여하지 않을 것 같아요'];
  pid uuid;
  i int;
  pattern int;
  prog text;
  progs text[];
  s record;
  ch text;
begin
  for i in 1..46 loop
    insert into participants (name, phone4, age_group, residence_area)
    values (
      '송정 참여자 ' || lpad(i::text, 2, '0'),
      lpad((1000 + floor(random()*9000))::int::text, 4, '0'),
      ages[1 + floor(random()*array_length(ages,1))],
      areas[1 + floor(random()*array_length(areas,1))]
    )
    returning id into pid;

    -- 참여 패턴 결정 (재참여율이 의미있게 나오도록 가중치 구성)
    pattern := width_bucket(random(), array[0, 0.38, 0.62, 0.76, 0.86, 0.92, 0.97, 1.0]);
    progs := case pattern
      when 1 then array['surf']
      when 2 then array['surf','board-art']
      when 3 then array['surf','board-art','share-event']
      when 4 then array['board-art']
      when 5 then array['board-art','share-event']
      when 6 then array['share-event']
      else array['surf','board-art','share-event']
    end;

    foreach prog in array progs loop
      ch := channels[1 + floor(random()*array_length(channels,1))];
      insert into registrations (participant_id, program_id, acquisition_channel)
      values (pid, prog, ch)
      on conflict do nothing;

      for s in select id, session_date from sessions where program_id = prog loop
        if random() < 0.82 then
          insert into attendance (participant_id, program_id, session_id)
          values (pid, prog, s.id)
          on conflict do nothing;
        end if;
      end loop;

      -- 최소 1회 출석 보장
      if not exists (select 1 from attendance a where a.participant_id = pid and a.program_id = prog) then
        insert into attendance (participant_id, program_id, session_id)
        select pid, prog, id from sessions where program_id = prog order by session_date limit 1
        on conflict do nothing;
      end if;

      insert into surveys (participant_id, program_id, satisfaction, revisit_intention, next_interest)
      values (
        pid, prog,
        (array[4,5,5,5,3])[1 + floor(random()*5)],
        revisits[1 + floor(random()*array_length(revisits,1))],
        interests[1 + floor(random()*array_length(interests,1))]
      );
    end loop;
  end loop;
end $$;

-- 기존 3개 프로그램은 이미 게시 상태로 전환
update programs set is_published = true where id in ('surf', 'board-art', 'share-event');

-- 샘플 공지사항
insert into announcements (program_id, title, content, pinned) values
(null, '2026 송정동 평생학습 빌리지 사업 안내', '올해 송정동에서 진행되는 평생학습 프로그램을 하나의 패스포트로 기록해보세요.', true),
('surf', '서핑체험 우천 시 안내', '우천 또는 높은 파고 시 현장 상황에 따라 일정이 변경될 수 있습니다. 변경 시 문자로 안내드립니다.', false),
('board-art', '작품 재료 준비 완료', '폐서핑보드와 페인트 등 모든 재료는 현장에서 제공됩니다. 편한 복장으로 와주세요.', false);

-- 샘플 갤러리 사진 (실서비스에서는 /admin/photos에서 실제 업로드)
insert into photos (program_id, image_url, caption) values
('surf', 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=800', '지난 서핑체험 현장'),
('board-art', 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800', '완성된 폐서핑보드 작품'),
(null, 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800', '송정해변 전경');
