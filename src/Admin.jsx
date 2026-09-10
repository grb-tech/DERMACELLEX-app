import { useState, useEffect, useCallback, useRef } from "react";

// ━━━━━━━━━━ 내부 관리자 페이지 (/admin) ━━━━━━━━━━
// Notion 16개 DB 전체를 스키마 기반으로 제네릭하게 조회·생성·수정·보관(archive)한다.
// 고객용 화면(App.jsx의 MainFlow)과는 완전히 분리된 별도 컴포넌트 — 고객 화면 회귀 위험 없음.
// 자세한 설계 배경은 CLAUDE.md, 더마셀렉스 운영사항.md, 그리고 이 기능을 만들 때의 계획 파일 참고.

const C = {
  bg: "#F7F7F7", surface: "#FFFFFF", surfaceAlt: "#F0F0F0",
  border: "#E4E4E4", borderLight: "#ECECEC",
  text: "#1A1A1A", textSub: "#6B6B6B", textMuted: "#9E9E9E",
  primary: "#434343", accent: "#EA5C2A", accentLight: "#FFF0EB", accentDark: "#C94A1E",
  success: "#10B981", error: "#D33", white: "#FFFFFF",
};
const FONT = "'Pretendard', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif";
const FONT_URL = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css";

const inputStyle = {
  width: "100%", height: 38, borderRadius: 8, border: `1px solid ${C.border}`, padding: "0 10px",
  fontSize: 13.5, fontFamily: FONT, boxSizing: "border-box", color: C.text, background: C.white,
};

function isAuthErr(e) { return String(e?.message || "").includes("로그인"); }

function groupBy(list, key) {
  const out = {};
  for (const item of list) (out[item[key]] ||= []).push(item);
  return out;
}

function fmtCell(v, type) {
  if (v == null || v === "") return "-";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "-";
  if (type === "checkbox") return v ? "✓" : "";
  if (type === "date" || type === "created_time" || type === "last_edited_time") return String(v).slice(0, 10);
  return String(v);
}

async function callAdmin(action, payload, sessionToken) {
  const r = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, sessionToken, ...payload }),
  });
  const d = await r.json();
  if (!d.success) throw new Error(d.error || "요청에 실패했습니다.");
  return d;
}

function loadSession() {
  try {
    const raw = sessionStorage.getItem("admin_session");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveSession(s) { try { sessionStorage.setItem("admin_session", JSON.stringify(s)); } catch {} }
function clearSession() { try { sessionStorage.removeItem("admin_session"); } catch {} }

// ━━━━━━━━━━ 최상위 ━━━━━━━━━━
export default function AdminApp() {
  const [session, setSession] = useState(loadSession);
  const onLogout = () => { clearSession(); setSession(null); };
  return (
    <div style={{ fontFamily: FONT }}>
      <style>{`@import url('${FONT_URL}'); * { box-sizing: border-box; }`}</style>
      {!session
        ? <AdminLogin onLogin={(s) => { saveSession(s); setSession(s); }} />
        : <AdminShell session={session} onLogout={onLogout} />}
    </div>
  );
}

// ━━━━━━━━━━ 로그인 ━━━━━━━━━━
function AdminLogin({ onLogin }) {
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const btnRef = useRef(null);
  // Client ID는 비밀값이 아니라 프런트 번들에 그대로 노출되는 공개 식별자라 하드코딩해도 안전하다
  // (api/_admin.mjs의 서버 쪽 값과 반드시 같아야 한다). 필요하면 VITE_GOOGLE_ADMIN_CLIENT_ID로 덮어쓴다.
  const clientId = import.meta.env.VITE_GOOGLE_ADMIN_CLIENT_ID
    || "459440676457-vpj7nnt22i6r9qr7vihnndtrc6j2rl2j.apps.googleusercontent.com";

  useEffect(() => {
    if (window.google?.accounts?.id) { setReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true; s.defer = true;
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (!ready || !clientId || !btnRef.current) return;
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (resp) => {
        setLoading(true); setErr("");
        try {
          const r = await fetch("/api/admin", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "login", credential: resp.credential }),
          });
          const d = await r.json();
          if (!d.success) throw new Error(d.error || "로그인에 실패했습니다.");
          onLogin({ sessionToken: d.sessionToken, email: d.email });
        } catch (e) {
          setErr(e.message);
        } finally {
          setLoading(false);
        }
      },
    });
    window.google.accounts.id.renderButton(btnRef.current, { theme: "outline", size: "large", width: 300, locale: "ko" });
  }, [ready, clientId]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
      <div style={{ width: 360, background: C.white, borderRadius: 20, padding: 32, boxShadow: "0 1px 2px rgba(0,0,0,.06)", textAlign: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 6 }}>DERMACELLEX 관리자</div>
        <div style={{ fontSize: 13, color: C.textSub, marginBottom: 24 }}>@bsgholdings.co.kr 구글 계정으로 로그인하세요.</div>
        {!clientId && (
          <div style={{ fontSize: 12.5, color: C.error, marginBottom: 16, lineHeight: 1.5 }}>
            관리자 설정이 완료되지 않았습니다. (VITE_GOOGLE_ADMIN_CLIENT_ID 미설정)
          </div>
        )}
        <div ref={btnRef} style={{ display: "flex", justifyContent: "center" }} />
        {loading && <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 12 }}>로그인 처리 중...</div>}
        {err && <div style={{ fontSize: 12.5, color: C.error, marginTop: 12 }}>{err}</div>}
      </div>
    </div>
  );
}

// 파이프라인에 속하지 않는 DB(시스템 보조 메뉴에서만 접근) — 나머지 10개는 ClientDetail을
// 통해서만 접근한다. ADMIN_DBS 자체는 16개 그대로 유지(getDbSchema/dbEntry가 여전히 전체를 씀).
const SYSTEM_DB_KEYS = ["CLIENT", "CONTACT", "CATALOG", "FIELD_CONFIG", "SYNC_ERROR", "ACCESS"];

const navBtnStyle = (active) => ({
  display: "block", width: "100%", textAlign: "left", border: 0, borderRadius: 8, padding: "9px 8px",
  fontSize: 13.5, fontFamily: FONT, cursor: "pointer", marginBottom: 2,
  background: active ? C.accentLight : "transparent",
  color: active ? C.accentDark : C.text,
  fontWeight: active ? 800 : 600,
});
const smallBtnStyle = { height: 32, padding: "0 12px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.white, fontSize: 12.5, fontFamily: FONT, cursor: "pointer", color: C.text };
const backBtnStyle = { border: 0, background: "transparent", cursor: "pointer", fontSize: 13.5, fontFamily: FONT, color: C.textSub };

// ━━━━━━━━━━ 전체 레이아웃 (업무 현황 / 시스템 2개 탭 + 본문) ━━━━━━━━━━
function AdminShell({ session, onLogout }) {
  const [dbs, setDbs] = useState([]);
  const [nav, setNav] = useState("pipeline"); // 'pipeline' | 'system'
  const [systemActiveKey, setSystemActiveKey] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    callAdmin("dbList", {}, session.sessionToken)
      .then(d => {
        setDbs(d.dbs);
        setSystemActiveKey(d.dbs.find(x => SYSTEM_DB_KEYS.includes(x.key))?.key || null);
      })
      .catch(e => { if (isAuthErr(e)) onLogout(); else setErr(e.message); });
  }, []);

  const systemDbs = dbs.filter(d => SYSTEM_DB_KEYS.includes(d.key));
  const sections = groupBy(systemDbs, "section");
  const systemActiveLabel = systemDbs.find(d => d.key === systemActiveKey)?.label || "";

  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg }}>
      <div style={{ width: 210, flex: "none", background: C.white, borderRight: `1px solid ${C.borderLight}`, display: "flex", flexDirection: "column", padding: "20px 12px" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text, padding: "0 8px 18px" }}>DERMACELLEX<br />관리자</div>

        <button onClick={() => setNav("pipeline")} style={navBtnStyle(nav === "pipeline")}>업무 현황</button>
        <button onClick={() => setNav("system")} style={navBtnStyle(nav === "system")}>시스템</button>

        {nav === "system" ? (
          <div style={{ flex: 1, overflowY: "auto", marginTop: 14 }}>
            {Object.entries(sections).map(([section, list]) => (
              <div key={section} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, padding: "0 8px 6px", letterSpacing: 0.4 }}>{section}</div>
                {list.map(db => (
                  <button key={db.key} onClick={() => setSystemActiveKey(db.key)} style={{
                    display: "block", width: "100%", textAlign: "left", border: 0, borderRadius: 8, padding: "8px 8px",
                    fontSize: 13, fontFamily: FONT, cursor: "pointer", marginBottom: 2,
                    background: systemActiveKey === db.key ? C.accentLight : "transparent",
                    color: systemActiveKey === db.key ? C.accentDark : C.text,
                    fontWeight: systemActiveKey === db.key ? 700 : 500,
                  }}>{db.label}</button>
                ))}
              </div>
            ))}
          </div>
        ) : <div style={{ flex: 1 }} />}

        <div style={{ borderTop: `1px solid ${C.borderLight}`, paddingTop: 12, marginTop: 12 }}>
          <div style={{ fontSize: 11.5, color: C.textSub, padding: "0 8px 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.email}</div>
          <button onClick={onLogout} style={{ width: "100%", height: 34, border: `1px solid ${C.border}`, borderRadius: 8, background: C.white, fontSize: 12.5, fontFamily: FONT, cursor: "pointer", color: C.textSub }}>로그아웃</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {err && <div style={{ padding: 24, color: C.error, fontSize: 13.5 }}>{err}</div>}
        {nav === "pipeline" && <PipelineDashboard session={session} allDbs={dbs} onAuthError={onLogout} />}
        {nav === "system" && systemActiveKey && (
          <AdminList key={systemActiveKey} dbKey={systemActiveKey} label={systemActiveLabel} session={session} allDbs={dbs} onAuthError={onLogout} />
        )}
      </div>
    </div>
  );
}

// ━━━━━━━━━━ 업무 프로세스 대시보드 (기본 화면) ━━━━━━━━━━
function PipelineDashboard({ session, allDbs, onAuthError }) {
  const [selectedClientId, setSelectedClientId] = useState(null);

  if (selectedClientId) {
    return (
      <ClientDetail
        clientId={selectedClientId} session={session} allDbs={allDbs}
        onClose={() => setSelectedClientId(null)} onAuthError={onAuthError}
      />
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <ActionItemsBar session={session} onAuthError={onAuthError} onSelectClient={setSelectedClientId} />
      <PipelineBoard session={session} onAuthError={onAuthError} onSelectClient={setSelectedClientId} />
    </div>
  );
}

function ddayLabel(dday) {
  return dday >= 0 ? `D-${dday}` : `D+${-dday}`;
}

// ─── 오늘 확인할 항목 ───
function ActionItemsBar({ session, onAuthError, onSelectClient }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true); setErr("");
    callAdmin("actionItems", {}, session.sessionToken)
      .then(setData)
      .catch(e => { if (isAuthErr(e)) onAuthError(); else setErr(e.message); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: C.textSub, fontSize: 13, marginBottom: 22 }}>할 일을 불러오는 중...</div>;
  if (err) return <div style={{ color: C.error, fontSize: 13, marginBottom: 22 }}>{err}</div>;
  if (!data) return null;

  const chips = [];
  for (const c of data.contractsDueSoon) {
    chips.push({
      key: `contract-${c.id}`, tone: c.dday <= 0 ? "error" : "accent",
      title: `${c.clientName || "(거래처 미상)"} · 계약 ${ddayLabel(c.dday)}`, sub: c.status, clientId: c.clientId,
    });
  }
  for (const m of data.upcomingMeetings) {
    chips.push({ key: `meeting-${m.id}`, tone: "neutral", title: `${m.clientName || "(거래처 미상)"} · 미팅 ${m.confirmedDate}`, sub: m.name, clientId: m.clientId });
  }
  for (const i of data.inquiriesNeedingFollowup) {
    chips.push({ key: `inquiry-${i.id}`, tone: "neutral", title: `${i.clientName || "(거래처 미상)"} · 자격요건 보완 필요`, sub: i.name, clientId: i.clientId });
  }
  for (const n of data.unreadNotifications) {
    chips.push({ key: `noti-${n.clientId}`, tone: "neutral", title: `${n.clientName || "(거래처 미상)"} · 미확인 알림 ${n.count}건`, sub: "", clientId: n.clientId });
  }
  if (data.unresolvedSyncErrors.count > 0) {
    chips.push({
      key: "sync-errors", tone: "error", title: `연동 오류 ${data.unresolvedSyncErrors.count}건`,
      sub: data.unresolvedSyncErrors.heuristic === "all-rows" ? "미해결 필드를 찾지 못해 전체 표시" : "", clientId: null,
    });
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: C.textSub, marginBottom: 10 }}>
        오늘 확인할 항목{chips.length > 0 ? ` (${chips.length})` : ""}
      </div>
      {chips.length === 0 ? (
        <div style={{ fontSize: 13, color: C.textMuted }}>지금은 급한 항목이 없습니다.</div>
      ) : (
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
          {chips.map(c => (
            <button key={c.key} onClick={() => c.clientId && onSelectClient(c.clientId)} style={{
              flex: "none", minWidth: 200, maxWidth: 240, textAlign: "left", padding: "12px 14px", borderRadius: 14,
              cursor: c.clientId ? "pointer" : "default", fontFamily: FONT,
              border: `1px solid ${c.tone === "error" ? C.error : c.tone === "accent" ? C.accent : C.border}`,
              background: c.tone === "error" ? "#FDECEC" : c.tone === "accent" ? C.accentLight : C.white,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: c.tone === "error" ? C.error : c.tone === "accent" ? C.accentDark : C.text }}>{c.title}</div>
              {c.sub && <div style={{ fontSize: 11.5, color: C.textSub, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.sub}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 칸반 파이프라인 보드 (표 뷰 토글 겸용 — 거래처별 통합 타임라인) ───
function PipelineBoard({ session, onAuthError, onSelectClient }) {
  const [board, setBoard] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("kanban");

  const load = useCallback(() => {
    setLoading(true); setErr("");
    callAdmin("pipelineBoard", {}, session.sessionToken)
      .then(setBoard)
      .catch(e => { if (isAuthErr(e)) onAuthError(); else setErr(e.message); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>거래처 파이프라인</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={load} style={smallBtnStyle}>새로고침</button>
          <div style={{ display: "flex", border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
            <button onClick={() => setViewMode("kanban")} style={{ height: 32, padding: "0 12px", border: 0, cursor: "pointer", fontFamily: FONT, fontSize: 12.5, background: viewMode === "kanban" ? C.primary : C.white, color: viewMode === "kanban" ? C.white : C.textSub }}>칸반</button>
            <button onClick={() => setViewMode("table")} style={{ height: 32, padding: "0 12px", border: 0, cursor: "pointer", fontFamily: FONT, fontSize: 12.5, background: viewMode === "table" ? C.primary : C.white, color: viewMode === "table" ? C.white : C.textSub }}>표</button>
          </div>
        </div>
      </div>
      {err && <div style={{ color: C.error, fontSize: 13, marginBottom: 12 }}>{err}</div>}
      {loading ? (
        <div style={{ color: C.textSub, fontSize: 13.5 }}>불러오는 중...</div>
      ) : !board ? null : viewMode === "kanban" ? (
        <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 12 }}>
          {board.columns.map(col => (
            <div key={col.key} style={{ flex: "none", width: 216, background: C.white, borderRadius: 14, padding: 12, boxShadow: "0 1px 2px rgba(0,0,0,.05)" }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: C.textSub, marginBottom: 10, display: "flex", justifyContent: "space-between" }}>
                <span>{col.label}</span><span style={{ color: C.textMuted }}>{col.clients.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {col.clients.map(c => (
                  <button key={c.clientId} onClick={() => onSelectClient(c.clientId)} style={{
                    textAlign: "left", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.borderLight}`,
                    background: C.surfaceAlt, cursor: "pointer", fontFamily: FONT,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{c.clientName}</div>
                    {c.subLabel && <div style={{ fontSize: 11.5, color: C.textSub, marginTop: 3 }}>{c.subLabel}</div>}
                    {c.contractDday != null && (
                      <div style={{ fontSize: 11, fontWeight: 800, marginTop: 4, color: c.contractDday <= 0 ? C.error : C.accentDark }}>
                        {ddayLabel(c.contractDday)}
                      </div>
                    )}
                  </button>
                ))}
                {col.clients.length === 0 && <div style={{ fontSize: 12, color: C.textMuted, padding: "2px 2px" }}>없음</div>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: C.white, borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,.05)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.surfaceAlt }}>
                <th style={thStyle}>거래처</th><th style={thStyle}>현재 단계</th><th style={thStyle}>상태</th><th style={thStyle}>최근 업데이트</th>
              </tr>
            </thead>
            <tbody>
              {board.columns.flatMap(col => col.clients.map(c => ({ ...c, colLabel: col.label })))
                .sort((a, b) => new Date(b.lastActivityAt) - new Date(a.lastActivityAt))
                .map(c => (
                  <tr key={c.clientId} onClick={() => onSelectClient(c.clientId)} style={{ cursor: "pointer", borderTop: `1px solid ${C.borderLight}` }}>
                    <td style={tdStyle}>{c.clientName}</td>
                    <td style={tdStyle}>{c.colLabel}</td>
                    <td style={tdStyle}>{c.subLabel || "-"}{c.contractDday != null ? ` (${ddayLabel(c.contractDday)})` : ""}</td>
                    <td style={tdStyle}>{String(c.lastActivityAt || "").slice(0, 10)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── 거래처 하나의 전체 히스토리 ───
const CLIENT_SECTIONS = [
  { key: "contacts", dbKey: "CONTACT", label: "담당자", titleProp: "담당자명" },
  { key: "scoring", dbKey: "SCORING", label: "진단", titleProp: null },
  { key: "inquiries", dbKey: "INQUIRY", label: "문의", titleProp: "제조 문의명" },
  { key: "devRequests", dbKey: "DEVREQUEST", label: "의뢰서(품목선택 포함)", titleProp: "제품명/가칭" },
  { key: "meetings", dbKey: "MEETING", label: "상담", titleProp: "미팅명" },
  { key: "estimates", dbKey: "ESTIMATE", label: "가견적", titleProp: "가견적명" },
  { key: "contracts", dbKey: "CONTRACT", label: "계약", titleProp: "계약명" },
  { key: "projects", dbKey: "PROJECT", label: "제조진행", titleProp: "프로젝트명" },
  { key: "notifications", dbKey: "NOTIFICATION", label: "알림", titleProp: "알림 제목" },
  { key: "accessHistory", dbKey: "ACCESS", label: "접근 이력", titleProp: null },
];

function ClientDetail({ clientId, session, allDbs, onClose, onAuthError }) {
  const [detail, setDetail] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | { dbKey, pageId, prefillRelation? }

  const load = useCallback(() => {
    setLoading(true); setErr("");
    callAdmin("clientDetail", { clientId }, session.sessionToken)
      .then(setDetail)
      .catch(e => { if (isAuthErr(e)) onAuthError(); else setErr(e.message); })
      .finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  if (editing) {
    return (
      <AdminRecordForm
        dbKey={editing.dbKey} pageId={editing.pageId} session={session} allDbs={allDbs}
        prefillRelation={editing.prefillRelation}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); load(); }}
        onAuthError={onAuthError}
      />
    );
  }

  if (loading) return <div style={{ padding: 24, color: C.textSub, fontSize: 13.5 }}>불러오는 중...</div>;
  if (err) {
    return (
      <div style={{ padding: 24 }}>
        <button onClick={onClose} style={backBtnStyle}>← 파이프라인으로</button>
        <div style={{ color: C.error, fontSize: 13.5, marginTop: 12 }}>{err}</div>
      </div>
    );
  }
  if (!detail) return null;

  const clientName = detail.client?.["법인 · 개인명"] || "(이름 없음)";

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <button onClick={onClose} style={backBtnStyle}>← 파이프라인으로</button>
        <button onClick={() => setEditing({ dbKey: "CLIENT", pageId: clientId })} style={smallBtnStyle}>거래처 정보 수정</button>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 20 }}>{clientName}</div>

      {CLIENT_SECTIONS.map(sec => (
        <ClientSection
          key={sec.key} section={sec} rows={detail[sec.key] || []}
          onOpenRow={(pageId) => setEditing({ dbKey: sec.dbKey, pageId })}
          onNewRow={() => setEditing({ dbKey: sec.dbKey, pageId: null, prefillRelation: { targetKey: "CLIENT", id: clientId } })}
        />
      ))}
    </div>
  );
}

function ClientSection({ section, rows, onOpenRow, onNewRow }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text }}>
          {section.label} <span style={{ color: C.textMuted, fontWeight: 500 }}>({rows.length})</span>
        </div>
        <button onClick={onNewRow} style={smallBtnStyle}>+ 새로 만들기</button>
      </div>
      {rows.length === 0 ? (
        <div style={{ fontSize: 12.5, color: C.textMuted, padding: "4px 2px 0" }}>없음</div>
      ) : (
        <div style={{ background: C.white, borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,.05)" }}>
          {rows.map(r => (
            <div key={r.id} onClick={() => onOpenRow(r.id)} style={{
              padding: "10px 14px", cursor: "pointer", borderTop: `1px solid ${C.borderLight}`,
              display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13,
            }}>
              <span style={{ color: C.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {section.titleProp ? (r[section.titleProp] || "(제목 없음)") : (r["제출일"] || r["마지막 접속일"] || r.id.slice(0, 8))}
              </span>
              {r["상태"] != null && r["상태"] !== "" && <span style={{ fontSize: 11.5, color: C.textSub, flex: "none", marginLeft: 10 }}>{r["상태"]}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━ 목록 화면 ━━━━━━━━━━
function AdminList({ dbKey, label, session, allDbs, onAuthError }) {
  const [schema, setSchema] = useState(null);
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState(null); // null | 'new' | pageId

  const load = useCallback((q) => {
    setLoading(true); setErr("");
    callAdmin("list", { dbKey, query: q }, session.sessionToken)
      .then(d => { setSchema(d.schema); setRows(d.rows); })
      .catch(e => { if (isAuthErr(e)) onAuthError(); else setErr(e.message); })
      .finally(() => setLoading(false));
  }, [dbKey]);

  useEffect(() => { load(""); }, [load]);

  if (editing !== null) {
    return (
      <AdminRecordForm
        dbKey={dbKey} pageId={editing === "new" ? null : editing} session={session} allDbs={allDbs}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); load(query); }}
        onAuthError={onAuthError}
      />
    );
  }

  const listColumns = schema ? schema.fields.filter(f => f.name !== schema.titleField).slice(0, 4) : [];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 19, fontWeight: 800, color: C.text }}>{label}</div>
        <button onClick={() => setEditing("new")} style={{
          height: 38, padding: "0 16px", border: 0, borderRadius: 10, background: C.primary, color: C.white,
          fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer",
        }}>+ 새로 만들기</button>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, maxWidth: 420 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && load(query)}
          placeholder="제목으로 검색..." style={inputStyle} />
        <button onClick={() => load(query)} style={{ height: 38, padding: "0 14px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.white, fontSize: 13, fontFamily: FONT, cursor: "pointer" }}>검색</button>
      </div>
      {err && <div style={{ color: C.error, fontSize: 13, marginBottom: 12 }}>{err}</div>}
      {loading ? (
        <div style={{ color: C.textSub, fontSize: 13.5 }}>불러오는 중...</div>
      ) : rows.length === 0 ? (
        <div style={{ color: C.textMuted, fontSize: 13.5 }}>레코드가 없습니다.</div>
      ) : (
        <div style={{ background: C.white, borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,.05)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.surfaceAlt }}>
                <th style={thStyle}>{schema.titleField || "제목"}</th>
                {listColumns.map(c => <th key={c.name} style={thStyle}>{c.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} onClick={() => setEditing(r.id)} style={{ cursor: "pointer", borderTop: `1px solid ${C.borderLight}` }}>
                  <td style={tdStyle}>{schema.titleField ? (r[schema.titleField] || "(제목 없음)") : r.id}</td>
                  {listColumns.map(c => <td key={c.name} style={tdStyle}>{fmtCell(r[c.name], c.type)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
const thStyle = { textAlign: "left", padding: "10px 14px", fontSize: 11.5, fontWeight: 800, color: C.textSub };
const tdStyle = { padding: "10px 14px", color: C.text, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

// ━━━━━━━━━━ 생성 · 수정 폼 ━━━━━━━━━━
function AdminRecordForm({ dbKey, pageId, session, allDbs, prefillRelation, onClose, onSaved, onAuthError }) {
  const [schema, setSchema] = useState(null);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    setLoading(true); setErr("");
    const req = pageId
      ? callAdmin("get", { dbKey, pageId }, session.sessionToken)
      : callAdmin("schema", { dbKey }, session.sessionToken).then(d => ({ schema: d.schema, row: {} }));
    req.then(d => {
      setSchema(d.schema);
      let row = d.row || {};
      // 거래처 상세에서 "+ 새로 만들기"로 들어왔을 때만 관계를 미리 채운다 — 대상 DB의 필드명이
      // '거래처명'/'제조 의뢰 거래처'로 다르므로 이름이 아니라 relationTarget으로 찾는다.
      if (!pageId && prefillRelation) {
        const f = d.schema.fields.find(f => f.type === "relation" && f.relationTarget === prefillRelation.targetKey);
        if (f) row = { ...row, [f.name]: [prefillRelation.id] };
      }
      setValues(row);
    })
      .catch(e => { if (isAuthErr(e)) onAuthError(); else setErr(e.message); })
      .finally(() => setLoading(false));
  }, [dbKey, pageId]);

  const setField = (name, v) => setValues(prev => ({ ...prev, [name]: v }));

  const save = async () => {
    setSaving(true); setErr("");
    try {
      const properties = {};
      for (const f of schema.fields) if (f.editable) properties[f.name] = values[f.name];
      if (pageId) await callAdmin("update", { dbKey, pageId, properties }, session.sessionToken);
      else await callAdmin("create", { dbKey, properties }, session.sessionToken);
      onSaved();
    } catch (e) {
      if (isAuthErr(e)) onAuthError(); else setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const archive = async () => {
    if (!window.confirm("이 레코드를 보관 처리할까요?\n완전 삭제가 아니라 Notion에서 휴지통으로 이동합니다.")) return;
    setSaving(true); setErr("");
    try {
      await callAdmin("archive", { dbKey, pageId }, session.sessionToken);
      onSaved();
    } catch (e) {
      if (isAuthErr(e)) onAuthError(); else setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 24, color: C.textSub, fontSize: 13.5 }}>불러오는 중...</div>;
  if (!schema) return <div style={{ padding: 24, color: C.error, fontSize: 13.5 }}>{err || "스키마를 불러올 수 없습니다."}</div>;

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <button onClick={onClose} style={{ border: 0, background: "transparent", cursor: "pointer", fontSize: 13.5, fontFamily: FONT, color: C.textSub }}>← 목록으로</button>
        {pageId && (
          <button onClick={archive} disabled={saving} style={{
            height: 34, padding: "0 14px", border: `1px solid ${C.error}`, borderRadius: 8, background: C.white,
            color: C.error, fontSize: 12.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer",
          }}>보관 처리 (archive)</button>
        )}
      </div>
      {err && <div style={{ color: C.error, fontSize: 13, marginBottom: 16 }}>{err}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {schema.fields.map(f => (
          <AdminField key={f.name} field={f} value={values[f.name]} onChange={v => setField(f.name, v)} session={session} allDbs={allDbs} />
        ))}
      </div>
      <button onClick={save} disabled={saving} style={{
        marginTop: 24, height: 46, width: "100%", border: 0, borderRadius: 12, background: C.accent, color: C.white,
        fontSize: 14.5, fontWeight: 800, fontFamily: FONT, cursor: "pointer", opacity: saving ? 0.6 : 1,
      }}>{saving ? "저장 중..." : "저장"}</button>
    </div>
  );
}

// ━━━━━━━━━━ 타입별 제네릭 입력 ━━━━━━━━━━
function AdminField({ field, value, onChange, session, allDbs }) {
  const { name, type, editable, options } = field;
  const label = <div style={{ fontSize: 12.5, fontWeight: 700, color: C.textSub, marginBottom: 5 }}>{name}{!editable ? " · 읽기 전용" : ""}</div>;

  if (!editable) {
    return <div>{label}<div style={{ fontSize: 13.5, color: C.text }}>{fmtCell(value, type)}</div></div>;
  }
  switch (type) {
    case "title":
    case "rich_text":
    case "url":
    case "email":
    case "phone_number":
      return <div>{label}<input value={value || ""} onChange={e => onChange(e.target.value)} style={inputStyle} /></div>;
    case "number":
      return <div>{label}<input type="number" value={value ?? ""} onChange={e => onChange(e.target.value)} style={inputStyle} /></div>;
    case "date":
      return <div>{label}<input type="date" value={value || ""} onChange={e => onChange(e.target.value)} style={inputStyle} /></div>;
    case "checkbox":
      return (
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13.5, color: C.text }}>
          <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} />{name}
        </label>
      );
    case "select":
    case "status":
      return (
        <div>{label}
          <select value={value || ""} onChange={e => onChange(e.target.value)} style={inputStyle}>
            <option value="">-</option>
            {(options || []).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      );
    case "multi_select":
      return <div>{label}<MultiSelectInput options={options || []} value={value || []} onChange={onChange} /></div>;
    case "relation":
      return <div>{label}<RelationRow field={field} value={value || []} onChange={onChange} session={session} allDbs={allDbs} /></div>;
    default:
      return <div>{label}<div style={{ fontSize: 13.5, color: C.textMuted }}>{fmtCell(value, type)}</div></div>;
  }
}

function MultiSelectInput({ options, value, onChange }) {
  const toggle = (o) => onChange(value.includes(o) ? value.filter(v => v !== o) : [...value, o]);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map(o => (
        <button key={o} type="button" onClick={() => toggle(o)} style={{
          padding: "5px 11px", borderRadius: 99, fontSize: 12.5, fontFamily: FONT, cursor: "pointer",
          border: value.includes(o) ? "none" : `1px solid ${C.border}`,
          background: value.includes(o) ? C.primary : C.white,
          color: value.includes(o) ? C.white : C.textSub,
        }}>{o}</button>
      ))}
      {options.length === 0 && <span style={{ fontSize: 12.5, color: C.textMuted }}>선택 옵션 없음</span>}
    </div>
  );
}

function RelationRow({ field, value, onChange, session, allDbs }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [names, setNames] = useState({});
  const targetKey = field.relationTarget;
  const targetLabel = allDbs.find(d => d.key === targetKey)?.label || targetKey || "관계";

  useEffect(() => {
    if (!targetKey || !value || value.length === 0) return;
    callAdmin("relationSearch", { dbKey: targetKey, query: "" }, session.sessionToken)
      .then(d => {
        const map = {};
        d.options.forEach(o => { map[o.id] = o.name; });
        setNames(prev => ({ ...prev, ...map }));
      }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey]);

  const search = (q) => {
    if (!targetKey) return;
    callAdmin("relationSearch", { dbKey: targetKey, query: q }, session.sessionToken)
      .then(d => setResults(d.options))
      .catch(() => {});
  };

  const add = (opt) => {
    if (!value.includes(opt.id)) onChange([...value, opt.id]);
    setNames(prev => ({ ...prev, [opt.id]: opt.name }));
    setQuery(""); setResults([]);
  };
  const remove = (id) => onChange(value.filter(v => v !== id));

  if (!targetKey) {
    return <div style={{ fontSize: 12.5, color: C.textMuted }}>연결 대상 DB를 자동으로 찾지 못했습니다(읽기 전용): {fmtCell(value)}</div>;
  }

  return (
    <div>
      {value.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {value.map(id => (
            <span key={id} style={{
              padding: "4px 6px 4px 10px", borderRadius: 99, background: C.accentLight, fontSize: 12,
              display: "flex", alignItems: "center", gap: 6, color: C.accentDark, fontWeight: 700,
            }}>
              {names[id] || id.slice(0, 8) + "…"}
              <button type="button" onClick={() => remove(id)} style={{ border: 0, background: "transparent", cursor: "pointer", color: C.accentDark, fontSize: 12 }}>✕</button>
            </span>
          ))}
        </div>
      )}
      <input value={query} onChange={e => { setQuery(e.target.value); search(e.target.value); }}
        onFocus={() => search(query)} placeholder={`${targetLabel} 검색...`} style={inputStyle} />
      {results.length > 0 && (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, marginTop: 4, maxHeight: 180, overflowY: "auto", background: C.white }}>
          {results.map(o => (
            <div key={o.id} onClick={() => add(o)} style={{ padding: "9px 12px", cursor: "pointer", fontSize: 13, borderBottom: `1px solid ${C.borderLight}` }}>{o.name}</div>
          ))}
        </div>
      )}
    </div>
  );
}
