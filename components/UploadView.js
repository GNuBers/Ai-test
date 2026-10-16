"use client";

import { useRef, useState } from "react";
import { errText } from "../lib/supabase";
import { readWorkbook, dateFromName, today } from "../lib/excel";
import { saveUpload } from "../lib/data";
import { Status } from "./common";

/* 📤 파일 올리기
   - 엑셀의 모든 시트를 읽어 "엑셀 화면에 보이는 글자 그대로" 저장한다
   - 원본 파일도 Supabase 파일 보관함에 함께 보관한다
   - 올릴 때마다 기준일별로 따로 쌓인다 (예전 자료는 지워지지 않음) */
export default function UploadView({ user, uploads, refreshUploads, chooseUpload }) {
  const [file, setFile] = useState(null);
  const [baseDate, setBaseDate] = useState(today());
  const [note, setNote] = useState("");
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ text: "" });
  const fileInput = useRef(null);

  function pick(f) {
    if (!f) return;
    if (!/\.(xlsm|xlsx|xls)$/i.test(f.name)) return setStatus({ text: "엑셀 파일(.xlsm, .xlsx)만 올릴 수 있어요.", type: "bad" });
    setFile(f);
    setBaseDate(dateFromName(f.name));   // 파일 이름에 날짜가 있으면 기준일로 자동 입력
    setStatus({ text: "" });
  }

  async function upload() {
    if (!file) return;
    if (!baseDate) return setStatus({ text: "기준일을 입력해 주세요.", type: "bad" });
    // 같은 파일·같은 기준일을 이미 올렸으면 한 번 물어본다
    if (uploads && uploads.some(u => u.base_date === baseDate && u.file_name === file.name) &&
        !confirm("같은 파일을 같은 기준일로 이미 올렸어요. 그래도 한 번 더 올릴까요?")) return;

    setBusy(true);
    try {
      setStatus({ text: "엑셀 파일을 읽는 중..." });
      const sheets = await readWorkbook(file);
      const id = await saveUpload({ user, file, sheets, baseDate, note: note.trim(), progress: text => setStatus({ text }) });
      chooseUpload(id);   // 방금 올린 자료를 '지금 보는 기준일'로
      await refreshUploads();
      const total = sheets.reduce((s, x) => s + x.rows.length, 0);
      setStatus({ text: "✅ 올렸어요! 시트 " + sheets.length + "개, " + total.toLocaleString() + "행을 저장했어요.", type: "ok" });
      setFile(null);
      setNote("");
    } catch (e) {
      setStatus({ text: "❌ 올리지 못했어요 — " + errText(e), type: "bad" });
    }
    setBusy(false);
  }

  return (
    <div className="card">
      <h3>조달현황 엑셀 올리기</h3>
      <div
        className={"drop" + (over ? " over" : "")}
        onClick={() => fileInput.current.click()}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files[0]); }}
      >
        📂 여기에 조달현황 엑셀(.xlsm, .xlsx)을 끌어다 놓거나 눌러서 고르세요
      </div>
      <input ref={fileInput} type="file" accept=".xlsm,.xlsx,.xls" hidden
             onChange={e => { pick(e.target.files[0]); e.target.value = ""; }} />
      <div className="sub-line">
        {file ? "📎 " + file.name + " (" + (file.size / 1024 / 1024).toFixed(1) + "MB)" : "고른 파일 없음"}
      </div>
      <div className="row">
        <label className="field">기준일
          <input className="input" type="date" value={baseDate} onChange={e => setBaseDate(e.target.value)} />
        </label>
        <label className="field grow">메모
          <input className="input" placeholder="메모 (선택) — 예: 10월 1주차 정기 업데이트"
                 value={note} onChange={e => setNote(e.target.value)} />
        </label>
      </div>
      <div className="row">
        <button className="btn primary" onClick={upload} disabled={!file || busy}>☁️ Supabase에 올리기</button>
      </div>
      <Status {...status} />
    </div>
  );
}
