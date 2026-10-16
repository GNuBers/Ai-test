-- =========================================================
-- 바이폴라 조달 관리 — Supabase 표·파일 보관함 만들기
-- 사용법: Supabase 대시보드 → SQL Editor → 이 내용을 통째로 붙여넣고 [Run] 한 번
-- (여러 번 실행해도 괜찮아요)
-- =========================================================

-- 0) 예전 에디슨 챗봇용 표가 있으면 지운다 (대화·견적비교·메일 기록 — 더 이상 쓰지 않음)
drop table if exists public.chat_logs, public.quotes, public.mail_logs cascade;

-- 1) 올린 파일 목록 (엑셀 파일 하나를 올릴 때마다 한 줄 = 그날 기준 스냅샷)
create table if not exists public.uploads (
  id          bigint generated always as identity primary key,
  user_id     uuid        not null default auth.uid() references auth.users on delete cascade,
  file_name   text        not null,             -- 원래 파일 이름
  file_path   text,                             -- 파일 보관함(bipolar-files) 안의 위치
  file_size   bigint,
  base_date   date        not null,             -- 기준일 (예: 2026-10-02)
  note        text,                             -- 메모
  uploaded_at timestamptz not null default now()
);

-- 2) 파일 안의 시트 목록 (시트 이름·제목줄·행 수)
create table if not exists public.upload_sheets (
  upload_id   bigint  not null references public.uploads on delete cascade,
  user_id     uuid    not null default auth.uid() references auth.users on delete cascade,
  sheet_name  text    not null,
  sheet_order int     not null,
  header      jsonb   not null default '[]'::jsonb,
  row_count   int     not null default 0,
  primary key (upload_id, sheet_name)
);

-- 3) 시트의 각 행 (엑셀 화면에 보이는 글자 그대로 저장)
create table if not exists public.sheet_rows (
  upload_id  bigint not null,
  user_id    uuid   not null default auth.uid() references auth.users on delete cascade,
  sheet_name text   not null,
  row_no     int    not null,
  cells      jsonb  not null,
  primary key (upload_id, sheet_name, row_no),
  foreign key (upload_id, sheet_name) references public.upload_sheets on delete cascade
);

create index if not exists uploads_user_date_idx on public.uploads (user_id, base_date desc);

-- 로그인한 사람만 표를 쓸 수 있게 권한을 준다 (로그인 안 한 사람(anon)은 아무것도 못 함)
revoke all on public.uploads, public.upload_sheets, public.sheet_rows from anon;
grant select, insert, update, delete on public.uploads, public.upload_sheets, public.sheet_rows to authenticated;

-- =========================================================
-- 행 보안 규칙(RLS): 로그인한 본인이 올린 자료만 읽고·쓰고·지울 수 있다
-- (이게 없으면 페이지 주소를 아는 누구나 조달 자료를 볼 수 있으니 꼭 실행)
-- =========================================================
alter table public.uploads       enable row level security;
alter table public.upload_sheets enable row level security;
alter table public.sheet_rows    enable row level security;

drop policy if exists "own uploads" on public.uploads;
create policy "own uploads" on public.uploads
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own upload_sheets" on public.upload_sheets;
create policy "own upload_sheets" on public.upload_sheets
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own sheet_rows" on public.sheet_rows;
create policy "own sheet_rows" on public.sheet_rows
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- =========================================================
-- 원본 엑셀 파일 보관함 (비공개) — 본인 폴더(사용자 번호/…)에만 넣고·받고·지울 수 있다
-- =========================================================
insert into storage.buckets (id, name, public)
values ('bipolar-files', 'bipolar-files', false)
on conflict (id) do nothing;

drop policy if exists "own bipolar files" on storage.objects;
create policy "own bipolar files" on storage.objects
  for all to authenticated
  using (bucket_id = 'bipolar-files' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'bipolar-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
