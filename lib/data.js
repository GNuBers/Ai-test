import { supabase, BUCKET } from "./supabase";

/* Supabase에 자료를 넣고·꺼내고·지우는 함수들
   표 구조는 supabase-setup.sql 참고:
   uploads(올린 파일 한 건) → upload_sheets(그 파일의 시트들) → sheet_rows(시트의 행들) */

// 한 번에 Supabase로 보내는 행 수 — 너무 크면 실패할 수 있어 나눠서 보낸다
const CHUNK = 500;

// 한 번 불러온 시트 내용은 기억해 둔다 ("기록번호|시트이름" → 내용)
const sheetCache = {};

// 올린 기록 목록 (기준일 최신순)
export async function getUploads() {
  const { data, error } = await supabase
    .from("uploads")
    .select("id, file_name, file_path, file_size, base_date, note, uploaded_at, upload_sheets(sheet_name, sheet_order, row_count)")
    .order("base_date", { ascending: false })
    .order("uploaded_at", { ascending: false });
  if (error) throw error;
  data.forEach(u => u.upload_sheets.sort((a, b) => a.sheet_order - b.sheet_order));
  return data;
}

// 시트 내용 불러오기 — Supabase는 한 번에 1000행까지 주므로 나눠서 받는다
export async function loadSheet(uploadId, name) {
  const key = uploadId + "|" + name;
  if (sheetCache[key]) return sheetCache[key];
  const { data: meta, error: metaErr } = await supabase
    .from("upload_sheets").select("header").eq("upload_id", uploadId).eq("sheet_name", name).single();
  if (metaErr) throw metaErr;
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("sheet_rows").select("cells").eq("upload_id", uploadId).eq("sheet_name", name)
      .order("row_no").range(from, from + 999);
    if (error) throw error;
    data.forEach(r => rows.push(r.cells));
    if (data.length < 1000) break;
  }
  return (sheetCache[key] = { header: meta.header, rows });
}

// Supabase에 저장: ① 기록 한 줄 → ② 원본 파일 → ③ 시트 목록 → ④ 행들 (나눠서)
// 중간에 실패하면 이번에 올린 것을 모두 지워서 반쪽짜리 자료가 남지 않게 한다
export async function saveUpload({ user, file, sheets, baseDate, note, progress }) {
  const { data: up, error } = await supabase
    .from("uploads")
    .insert({ user_id: user.id, file_name: file.name, file_size: file.size, base_date: baseDate, note: note || null })
    .select("id").single();
  if (error) throw error;

  let path = null;
  try {
    // ② 원본 파일 (보관함 안의 이름은 영문·숫자로: 사용자번호/기록번호.확장자)
    progress("원본 파일을 보관함에 올리는 중...");
    const ext = (file.name.match(/\.\w+$/) || [".xlsm"])[0].toLowerCase();
    path = user.id + "/" + up.id + ext;
    const { error: fileErr } = await supabase.storage.from(BUCKET)
      .upload(path, file, { contentType: file.type || "application/octet-stream" });
    if (fileErr) { path = null; throw fileErr; }
    const { error: pathErr } = await supabase.from("uploads").update({ file_path: path }).eq("id", up.id);
    if (pathErr) throw pathErr;

    // ③ 시트 목록
    const { error: sheetErr } = await supabase.from("upload_sheets").insert(sheets.map(s => ({
      upload_id: up.id, user_id: user.id, sheet_name: s.name, sheet_order: s.order, header: s.header, row_count: s.rows.length
    })));
    if (sheetErr) throw sheetErr;

    // ④ 행들 — CHUNK 줄씩 나눠서 보낸다
    const total = sheets.reduce((s, x) => s + x.rows.length, 0);
    let done = 0;
    for (const s of sheets) {
      for (let i = 0; i < s.rows.length; i += CHUNK) {
        const part = s.rows.slice(i, i + CHUNK).map((cells, j) => ({
          upload_id: up.id, user_id: user.id, sheet_name: s.name, row_no: i + j + 1, cells
        }));
        const { error: rowErr } = await supabase.from("sheet_rows").insert(part);
        if (rowErr) throw rowErr;
        done += part.length;
        progress("[" + s.name + "] 저장 중... " + done.toLocaleString() + " / " + total.toLocaleString() + "행");
      }
    }
    return up.id;
  } catch (e) {
    // 반쪽짜리 자료 정리 (기록을 지우면 시트·행도 함께 지워진다)
    if (path) await supabase.storage.from(BUCKET).remove([path]);
    await supabase.from("uploads").delete().eq("id", up.id);
    throw e;
  }
}

// 보관함에 있는 원본 엑셀 파일을 원래 이름으로 내려받는다
export async function downloadOriginal(u) {
  if (!u.file_path) throw new Error("원본 파일이 보관되어 있지 않아요.");
  const { data, error } = await supabase.storage.from(BUCKET).download(u.file_path);
  if (error) throw error;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(data);
  link.download = u.file_name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

// 올린 자료 하나를 원본 파일까지 모두 지운다 (되돌릴 수 없음)
export async function removeUpload(u) {
  if (u.file_path) {
    const { error } = await supabase.storage.from(BUCKET).remove([u.file_path]);
    if (error) throw error;
  }
  const { error } = await supabase.from("uploads").delete().eq("id", u.id);
  if (error) throw error;
  Object.keys(sheetCache).forEach(k => { if (k.startsWith(u.id + "|")) delete sheetCache[k]; });
}
