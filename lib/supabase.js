import { createClient } from "@supabase/supabase-js";

/* Supabase 연결
   - 주소와 키는 Vercel 환경변수(로컬에서는 .env.local)에서 읽는다
   - NEXT_PUBLIC_ 로 시작하는 값만 화면(브라우저)에서 읽을 수 있다
   - anon public 키만 쓴다 (service_role 키는 절대 쓰지 않는다) */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 환경변수가 없으면 null → 화면에 "설정이 필요해요" 안내가 나온다
export const supabase = url && key ? createClient(url, key) : null;

// 원본 엑셀 파일을 넣어 두는 Supabase 보관함 이름 (supabase-setup.sql과 같아야 한다)
export const BUCKET = "bipolar-files";

// Supabase 오류를 알기 쉬운 문장으로 바꾼다
export function errText(err) {
  const msg = (err && (err.message || err.error_description)) || String(err);
  if (/relation .* does not exist|Could not find the table/i.test(msg)) return "Supabase에 표가 없어요. SQL Editor에서 supabase-setup.sql을 먼저 실행해 주세요.";
  if (/Bucket not found/i.test(msg)) return "파일 보관함(bipolar-files)이 없어요. supabase-setup.sql을 먼저 실행해 주세요.";
  if (/Failed to fetch/i.test(msg)) return "Supabase에 연결하지 못했어요. 인터넷 연결과 환경변수의 주소를 확인해 주세요.";
  return msg;
}
