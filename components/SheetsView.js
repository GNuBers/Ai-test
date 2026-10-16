"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { errText } from "../lib/supabase";
import { loadSheet } from "../lib/data";
import { DataTable, SnapshotPicker } from "./common";

// 한 화면에 보여주는 최대 행 수 (너무 많으면 화면이 느려진다)
const MAX_SHOW = 300;
// 마지막으로 본 시트를 이 브라우저에 기억해 두는 이름표
const LAST_SHEET = "bipolar_last_sheet";

/* 📋 시트 보기 — 시트를 고르고 글자로 찾기 */
export default function SheetsView({ uploads, current, chooseUpload }) {
  const sheetNames = current.upload_sheets.map(s => s.sheet_name);
  const [picked, setPicked] = useState(() => {
    try { return localStorage.getItem(LAST_SHEET) || ""; } catch (e) { return ""; }
  });
  const name = sheetNames.includes(picked) ? picked : sheetNames[0];
  const [sheet, setSheet] = useState(null);   // { header, rows } 또는 { error }
  const [search, setSearch] = useState("");
  const query = useDeferredValue(search);     // 글자를 칠 때 화면이 버벅이지 않게 살짝 늦게 거른다

  useEffect(() => {
    let alive = true;
    setSheet(null);
    loadSheet(current.id, name)
      .then(s => { if (alive) setSheet(s); })
      .catch(e => { if (alive) setSheet({ error: errText(e) }); });
    return () => { alive = false; };
  }, [current.id, name]);

  function choose(n) {
    setPicked(n);
    try { localStorage.setItem(LAST_SHEET, n); } catch (e) {}
  }

  // 띄어쓰기로 나눈 단어가 모두 들어 있는 행만 남긴다
  const hits = useMemo(() => {
    if (!sheet || sheet.error) return [];
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return sheet.rows;
    return sheet.rows.filter(r => {
      const line = r.join(" ").toLowerCase();
      return words.every(w => line.includes(w));
    });
  }, [sheet, query]);

  let info = "불러오는 중...";
  if (sheet && sheet.error) info = "⚠️ " + sheet.error;
  else if (sheet) {
    info = "전체 " + sheet.rows.length.toLocaleString() + "행 중 " + hits.length.toLocaleString() + "행" +
           (hits.length > MAX_SHOW ? " (앞의 " + MAX_SHOW + "행만 표시 — 찾을 글자를 넣어 좁혀 보세요)" : "");
  }

  return (
    <>
      <SnapshotPicker uploads={uploads} current={current} onChoose={chooseUpload} />
      <div className="card">
        <div className="row">
          <select className="input" value={name} onChange={e => choose(e.target.value)}>
            {current.upload_sheets.map(s => (
              <option key={s.sheet_name} value={s.sheet_name}>{s.sheet_name} ({s.row_count.toLocaleString()}행)</option>
            ))}
          </select>
          <input className="input grow" value={search} onChange={e => setSearch(e.target.value)}
                 placeholder="🔍 찾을 글자 (품번, 품명, 업체명, 발주번호 등) — 띄어쓰기로 여러 단어" />
        </div>
        <div className="sub-line">{info}</div>
        {sheet && !sheet.error && <DataTable header={sheet.header} rows={hits.slice(0, MAX_SHOW)} />}
      </div>
    </>
  );
}
