/* 엑셀 파일 읽기 도우미 */

// 엑셀 파일 읽기 → 시트마다 { 이름, 순서, 제목줄, 행들 }
// (엑셀 화면에 보이는 글자 그대로 읽고, 빈 줄과 줄 끝의 빈칸은 뺀다)
// 엑셀 도구(SheetJS)는 크기가 커서, 파일을 올릴 때만 불러온다
export async function readWorkbook(file) {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  return wb.SheetNames.map((name, i) => {
    const all = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: "", blankrows: false });
    const rows = all
      .map(r => {
        const cells = r.map(v => String(v).trim());
        let n = cells.length;
        while (n && cells[n - 1] === "") n--;
        return cells.slice(0, n);
      })
      .filter(r => r.length);
    return { name, order: i, header: rows[0] || [], rows: rows.slice(1) };
  });
}

// 오늘 날짜를 "2026-10-16" 모양으로
export function today() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

// 파일 이름에서 기준일 찾기 — 예: "조달현황 Ver 2.5(26-10-2).xlsm" → "2026-10-02"
export function dateFromName(name) {
  const m = name.match(/\((\d{2})-(\d{1,2})-(\d{1,2})\)/);
  if (!m) return today();
  return "20" + m[1] + "-" + m[2].padStart(2, "0") + "-" + m[3].padStart(2, "0");
}

// 날짜를 "2026. 10. 16. 오후 3:05" 모양으로
export function dateTime(s) {
  return new Date(s).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
}
