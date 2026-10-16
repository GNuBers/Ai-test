import "./globals.css";

// 브라우저 탭에 보이는 제목과 설명
export const metadata = {
  title: "바이폴라 조달 관리",
  description: "바이폴라 조달현황 엑셀을 Supabase에 기준일별로 저장하고 살펴보는 페이지"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
