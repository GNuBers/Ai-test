"use client";

import { useState } from "react";
import { errText } from "../lib/supabase";
import { dateTime } from "../lib/excel";
import { downloadOriginal, removeUpload } from "../lib/data";

/* 🗂️ 올린 기록 — 기준일 고르기 · 원본 받기 · 삭제 */
export default function HistoryView({ uploads, current, chooseUpload, refreshUploads, goTo }) {
  const [busyId, setBusyId] = useState(null);   // 작업 중인 기록 번호 (버튼 잠그기용)

  async function download(u) {
    setBusyId(u.id);
    try { await downloadOriginal(u); } catch (e) { alert("내려받지 못했어요 — " + errText(e)); }
    setBusyId(null);
  }

  async function remove(u) {
    if (!confirm(u.base_date + " 기준 자료(" + u.file_name + ")를 지울까요?\n원본 파일과 모든 시트 내용이 Supabase에서 지워지고, 되돌릴 수 없어요.")) return;
    setBusyId(u.id);
    try {
      await removeUpload(u);
      await refreshUploads();
    } catch (e) {
      alert("지우지 못했어요 — " + errText(e));
    }
    setBusyId(null);
  }

  return (
    <div className="card">
      <h3>올린 자료 {uploads.length}건</h3>
      <p>파란 테두리가 지금 대시보드·시트 보기에서 보고 있는 기준일이에요.</p>
      <ul className="list">
        {uploads.map(u => {
          const rowsTotal = u.upload_sheets.reduce((s, x) => s + x.row_count, 0);
          const busy = busyId === u.id;
          return (
            <li key={u.id} className={"item" + (u.id === current.id ? " current" : "")}>
              <div className="grow">
                <div className="main-line">{u.base_date} 기준 — {u.file_name}</div>
                <div className="sub-line">
                  시트 {u.upload_sheets.length}개 · {rowsTotal.toLocaleString()}행 · 올린 시각 {dateTime(u.uploaded_at)}
                  {u.note ? " · " + u.note : ""}
                </div>
              </div>
              <button className="btn small primary" onClick={() => { chooseUpload(u.id); goTo("dashboard"); }}>이 기준으로 보기</button>
              <button className="btn small" disabled={busy} onClick={() => download(u)}>⬇ 원본 받기</button>
              <button className="btn small danger" disabled={busy} onClick={() => remove(u)}>삭제</button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
