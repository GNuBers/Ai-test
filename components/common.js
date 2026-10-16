"use client";

/* 여러 화면에서 같이 쓰는 작은 조각들 */

// 안내 카드 (제목 + 설명 + 버튼 등)
export function Notice({ title, text, children }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {children}
    </div>
  );
}

// 상태 문구 (type: "ok" 초록 / "bad" 빨강 / 없으면 회색)
export function Status({ text, type }) {
  return <div className={"status" + (type ? " " + type : "")}>{text}</div>;
}

// 표 — 숫자처럼 보이는 칸은 오른쪽 정렬, 칸이 좁아 잘려도 마우스를 올리면 전체 글자가 보인다
export function DataTable({ header, rows }) {
  const width = Math.max(header.length, ...rows.map(r => r.length), 0);
  const cols = Array.from({ length: width }, (_, i) => i);
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{cols.map(i => <th key={i}>{header[i] || ""}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>
              {cols.map(i => {
                const v = r[i] == null ? "" : String(r[i]);
                return <td key={i} className={/^-?[\d,]+(\.\d+)?%?$/.test(v) ? "num" : ""} title={v}>{v}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// "기준일 고르기" 줄 — 바꾸면 그 날짜 자료로 다시 그린다
export function SnapshotPicker({ uploads, current, onChoose }) {
  return (
    <div className="row">
      <span className="sub-line">기준일</span>
      <select className="input" value={current.id} onChange={e => onChoose(Number(e.target.value))}>
        {uploads.map(u => (
          <option key={u.id} value={u.id}>{u.base_date} 기준 — {u.file_name}</option>
        ))}
      </select>
    </div>
  );
}

// 올린 자료가 필요한 화면 앞에서: 불러오는 중 / 실패 / 아직 없음 안내
// 자료가 있으면 null을 돌려준다 (→ 화면을 그대로 그리면 된다)
export function uploadsGate({ uploads, uploadsError, goTo }) {
  if (uploadsError) return <Notice title="⚠️ 불러오지 못했어요" text={uploadsError} />;
  if (!uploads) return <Notice title="불러오는 중..." />;
  if (!uploads.length) {
    return (
      <Notice title="아직 올린 자료가 없어요" text="📤 파일 올리기에서 조달현황 엑셀 파일을 먼저 올려 주세요.">
        <button className="btn primary" onClick={() => goTo("upload")}>📤 파일 올리기로 가기</button>
      </Notice>
    );
  }
  return null;
}
