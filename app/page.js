"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase, errText } from "../lib/supabase";
import { getUploads } from "../lib/data";
import { Notice, uploadsGate } from "../components/common";
import LoginCard from "../components/LoginCard";
import UploadView from "../components/UploadView";
import DashboardView from "../components/DashboardView";
import SheetsView from "../components/SheetsView";
import HistoryView from "../components/HistoryView";

/* =========================================================
   메뉴 목록 — 새 기능을 붙일 때는 여기에 한 줄을 추가하면
   왼쪽 메뉴에 항목이 자동으로 생긴다
   (id: 구분 이름 / icon: 아이콘 / name: 메뉴 이름 / desc: 머리글 설명
    View: 화면 / needsData: 올린 자료가 있어야 보이는 화면인지)
   ========================================================= */
const MENUS = [
  { id: "upload",    icon: "📤", name: "파일 올리기", desc: "조달현황 엑셀(.xlsm)을 올리면 원본 파일과 모든 시트 내용이 Supabase에 저장돼요", View: UploadView },
  { id: "dashboard", icon: "📊", name: "대시보드",   desc: "선택한 기준일의 진척률·발주율·입고율",                                         View: DashboardView, needsData: true },
  { id: "sheets",    icon: "📋", name: "시트 보기",   desc: "저장된 시트를 골라 품번·품명·업체명 등으로 찾아보세요",                          View: SheetsView,    needsData: true },
  { id: "history",   icon: "🗂️", name: "올린 기록",   desc: "날짜별로 쌓인 자료 — 기준일 고르기·원본 받기·삭제",                               View: HistoryView,   needsData: true }
];

// 지금 보고 있는 기준일(올린 기록 번호)을 이 브라우저에 기억해 두는 이름표
const CURRENT_STORAGE = "bipolar_current_upload";

export default function Home() {
  const [menuId, setMenuId] = useState("upload");
  const [menuOpen, setMenuOpen] = useState(false);   // 휴대폰 화면에서 왼쪽 메뉴가 열려 있는지
  const [user, setUser] = useState(null);            // 로그인한 사람 (없으면 null)
  const [authReady, setAuthReady] = useState(false); // 로그인 상태 확인이 끝났는지
  const [uploads, setUploads] = useState(null);      // 올린 기록 목록
  const [uploadsError, setUploadsError] = useState("");
  const [currentId, setCurrentId] = useState(null);  // 지금 보고 있는 기준일

  // 처음 열 때: 기억해 둔 기준일 불러오기 + 로그인 상태 지켜보기
  // (로그인 링크를 누르고 돌아온 경우에도 여기서 자동으로 로그인된다)
  useEffect(() => {
    try { setCurrentId(Number(localStorage.getItem(CURRENT_STORAGE)) || null); } catch (e) {}
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session ? session.user : null);
      setAuthReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // 올린 기록 목록 새로 불러오기
  const refreshUploads = useCallback(async () => {
    try {
      setUploads(await getUploads());
      setUploadsError("");
    } catch (e) {
      setUploadsError(errText(e));
    }
  }, []);

  // 로그인한 사람이 바뀌면 목록을 다시 불러온다
  const userId = user ? user.id : null;
  useEffect(() => {
    setUploads(null);
    if (userId) refreshUploads();
  }, [userId, refreshUploads]);

  function chooseUpload(id) {
    setCurrentId(id);
    try { localStorage.setItem(CURRENT_STORAGE, String(id)); } catch (e) {}
  }

  function goTo(id) {
    setMenuId(id);
    setMenuOpen(false);   // 휴대폰 화면에서는 메뉴를 닫아준다
  }

  const menu = MENUS.find(m => m.id === menuId);
  // 고른 기준일이 없거나 지워졌으면 가장 최근 것
  const current = uploads && uploads.length ? (uploads.find(u => u.id === currentId) || uploads[0]) : null;

  // 오른쪽 화면에 무엇을 보여줄지 정한다
  let body;
  if (!supabase) {
    body = (
      <Notice title="☁️ Supabase 연결이 필요해요"
              text={"Vercel → Settings → Environment Variables에 아래 두 값을 넣고 다시 배포해 주세요.\n(내 컴퓨터에서 실행할 때는 .env.local 파일에 넣어요)\n\nNEXT_PUBLIC_SUPABASE_URL\nNEXT_PUBLIC_SUPABASE_ANON_KEY"} />
    );
  } else if (!authReady) {
    body = <Notice title="로그인 상태를 확인하는 중..." />;
  } else if (!user) {
    body = <LoginCard />;
  } else {
    const gate = menu.needsData ? uploadsGate({ uploads, uploadsError, goTo }) : null;
    const View = menu.View;
    body = gate || (
      <View user={user} uploads={uploads} current={current}
            chooseUpload={chooseUpload} refreshUploads={refreshUploads} goTo={goTo} />
    );
  }

  return (
    <div className="app">
      {/* ===================== 왼쪽 메뉴 ===================== */}
      <aside className={"sidebar" + (menuOpen ? " open" : "")}>
        <div className="brand">
          <div className="brand-logo">📦</div>
          <div>
            <div className="brand-name">바이폴라 조달 관리</div>
            <div className="brand-sub">조달현황 엑셀 → Supabase</div>
          </div>
        </div>

        <div className="menu-title">메뉴</div>
        <ul className="menu-list">
          {MENUS.map(m => (
            <li key={m.id} className={"menu-item" + (m.id === menuId ? " active" : "")} onClick={() => goTo(m.id)}>
              <span className="menu-icon">{m.icon}</span>
              <span>{m.name}</span>
            </li>
          ))}
        </ul>

        <div className="sidebar-footer">
          <div className="who">
            {!supabase ? "Supabase 설정이 필요해요" : user ? "👤 " + user.email : "로그인이 필요해요"}
          </div>
          {user && <button className="side-btn" onClick={() => supabase.auth.signOut()}>🚪 로그아웃</button>}
        </div>
      </aside>

      {/* ===================== 오른쪽 화면 ===================== */}
      <main className="main">
        <header className="header">
          <button className="menu-toggle" aria-label="메뉴 열기" onClick={() => setMenuOpen(o => !o)}>☰</button>
          <div>
            <div className="header-title">{menu.icon} {menu.name}</div>
            <div className="header-desc">{menu.desc}</div>
          </div>
        </header>
        <section className="content">
          <div className="content-inner">{body}</div>
        </section>
      </main>
    </div>
  );
}
