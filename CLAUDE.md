# 코딩 규칙

1. Next.js(App Router) + JavaScript로 작성한다. 화면은 `app/page.js`, 화면 조각은 `components/`, 데이터 처리는 `lib/`에 둔다.
2. 주석은 비개발자도 이해할 수 있게 쉬운 한글로 쓴다.
3. 외부 라이브러리는 npm으로 설치해 `package.json`에 남긴다.
4. 코드를 바꿀 때마다 무엇을 바꿨는지 한 줄로 설명한다.
5. 작업 내용은 `히스토리/날짜.md`(예: 2026-09-30.md)에 한 줄씩 기록한다.
6. 바이폴라 조달 데이터만 Supabase에 저장한다. 표 구조는 `supabase-setup.sql`에 둔다.

## 키 보안 규칙
- API 키 등 비밀 정보는 코드와 문서에 적지 않는다.
- Supabase 주소·키는 환경변수 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`로만 넣는다. (Vercel 설정 / 로컬은 `.env.local`, git에 올리지 않음)
- Supabase는 anon public 키만 쓰고, service_role 키는 쓰지 않는다.
- 불러온 데이터는 화면에 글자로만 넣고, `dangerouslySetInnerHTML`은 쓰지 않는다.

## 화면 규칙
- 왼쪽에 메뉴 목록, 오른쪽에 내용 화면이 있는 구조를 유지한다.
- 새 기능은 `app/page.js`의 메뉴 목록(MENUS)에 항목을 하나 추가하는 방식으로 붙인다.
- 새 기능을 붙여도 기존 메뉴는 그대로 동작해야 한다.
