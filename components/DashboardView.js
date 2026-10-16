"use client";

import { useEffect, useState } from "react";
import { errText } from "../lib/supabase";
import { loadSheet } from "../lib/data";
import { DataTable, Notice, SnapshotPicker } from "./common";

/* 📊 대시보드 — '대시보드' 시트의 숫자 카드 + 유닛별 표 + '유닛별통계' 시트 */
export default function DashboardView({ uploads, current, chooseUpload }) {
  const [data, setData] = useState(null);   // { dash, stats } 또는 { error }
  const names = current.upload_sheets.map(s => s.sheet_name);
  const hasDash = names.includes("대시보드");
  const hasStats = names.includes("유닛별통계");

  // 기준일이 바뀔 때마다 그 날짜의 시트를 불러온다
  useEffect(() => {
    if (!hasDash) return;
    let alive = true;   // 기다리는 동안 다른 날짜를 고르면, 늦게 온 자료는 버린다
    setData(null);
    Promise.all([loadSheet(current.id, "대시보드"), hasStats ? loadSheet(current.id, "유닛별통계") : null])
      .then(([dash, stats]) => { if (alive) setData({ dash, stats }); })
      .catch(e => { if (alive) setData({ error: errText(e) }); });
    return () => { alive = false; };
  }, [current.id, hasDash, hasStats]);

  const picker = <SnapshotPicker uploads={uploads} current={current} onChoose={chooseUpload} />;
  if (!hasDash) return <>{picker}<Notice title="'대시보드' 시트가 없어요" text="이 파일에는 대시보드 시트가 없어요. 📋 시트 보기에서 다른 시트를 확인해 주세요." /></>;
  if (!data) return <>{picker}<Notice title="불러오는 중..." /></>;
  if (data.error) return <>{picker}<Notice title="⚠️ 불러오지 못했어요" text={data.error} /></>;

  const all = [data.dash.header, ...data.dash.rows];
  // 숫자 카드: "총 요청 부품" 같은 이름이 있는 줄 → 바로 다음 줄이 값
  const li = all.findIndex(r => r.includes("총 요청 부품"));
  const kpis = li >= 0 && all[li + 1]
    ? all[li].map((label, i) => ({ label, value: all[li + 1][i] || "-" })).filter(k => k.label)
    : [];
  // 유닛별 표: "스트럭처"가 있는 줄을 제목줄로
  const ti = all.findIndex(r => r.includes("스트럭처"));
  const unitHeader = ti >= 0 ? all[ti] : data.dash.header;
  const unitRows = ti >= 0 ? all.slice(ti + 1).filter(r => r.some(v => v)) : data.dash.rows;

  return (
    <>
      {picker}
      {kpis.length > 0 && (
        <div className="kpis">
          {kpis.map(k => (
            <div className="kpi" key={k.label}>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value">{k.value}</div>
            </div>
          ))}
        </div>
      )}
      <div className="card">
        <h3>유닛별 진척 현황</h3>
        <DataTable header={unitHeader} rows={unitRows} />
      </div>
      {data.stats && (
        <div className="card">
          <h3>유닛별 · 품목분류별 통계</h3>
          <DataTable header={data.stats.header} rows={data.stats.rows} />
        </div>
      )}
    </>
  );
}
