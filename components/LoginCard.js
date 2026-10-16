"use client";

import { useState } from "react";
import { supabase, errText } from "../lib/supabase";
import { Status } from "./common";

/* 🔐 이메일로 로그인 — 메일로 받은 링크를 누르면 로그인된다 (비밀번호 없음) */
export default function LoginCard() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ text: "" });

  async function sendLink() {
    const addr = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) return setStatus({ text: "이메일을 올바르게 입력해 주세요.", type: "bad" });
    setBusy(true);
    setStatus({ text: "보내는 중..." });
    const { error } = await supabase.auth.signInWithOtp({
      email: addr,
      options: { emailRedirectTo: window.location.origin + window.location.pathname }   // 링크를 누르면 이 페이지로 돌아온다
    });
    setBusy(false);
    if (error) setStatus({ text: "❌ 보내지 못했어요 — " + errText(error), type: "bad" });
    else setStatus({ text: "✅ 메일을 보냈어요. 메일함에서 로그인 링크를 눌러 주세요.", type: "ok" });
  }

  return (
    <div className="card">
      <h3>🔐 이메일로 로그인</h3>
      <p>이메일을 입력하면 로그인 링크를 보내 드려요. 메일의 링크를 이 브라우저에서 누르면 로그인돼요.</p>
      <div className="row">
        <input
          className="input grow" type="email" placeholder="예: me@company.com" autoFocus
          value={email} onChange={e => setEmail(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing) sendLink(); }}
        />
        <button className="btn primary" onClick={sendLink} disabled={busy}>📧 로그인 링크 받기</button>
      </div>
      <Status {...status} />
    </div>
  );
}
