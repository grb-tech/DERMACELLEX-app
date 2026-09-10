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

// ━━━━━━━━━━ 전체 레이아웃 (사이드바 + 본문) ━━━━━━━━━━
function AdminShell({ session, onLogout }) {
  const [dbs, setDbs] = useState([]);
  const [activeKey, setActiveKey] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    callAdmin("dbList", {}, session.sessionToken)
      .then(d => { setDbs(d.dbs); setActiveKey(d.dbs[0]?.key || null); })
      .catch(e => { if (isAuthErr(e)) onLogout(); else setErr(e.message); });
  }, []);

  const sections = groupBy(dbs, "section");
  const activeLabel = dbs.find(d => d.key === activeKey)?.label || "";

  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg }}>
      <div style={{ width: 220, flex: "none", background: C.white, borderRight: `1px solid ${C.borderLight}`, display: "flex", flexDirection: "column", padding: "20px 12px" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text, padding: "0 8px 18px" }}>DERMACELLEX<br />관리자</div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {Object.entries(sections).map(([section, list]) => (
            <div key={section} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, padding: "0 8px 6px", letterSpacing: 0.4 }}>{section}</div>
              {list.map(db => (
                <button key={db.key} onClick={() => setActiveKey(db.key)} style={{
                  display: "block", width: "100%", textAlign: "left", border: 0, borderRadius: 8, padding: "8px 8px",
                  fontSize: 13, fontFamily: FONT, cursor: "pointer", marginBottom: 2,
                  background: activeKey === db.key ? C.accentLight : "transparent",
                  color: activeKey === db.key ? C.accentDark : C.text,
                  fontWeight: activeKey === db.key ? 700 : 500,
                }}>{db.label}</button>
              ))}
            </div>
          ))}
        </div>
        <div style={{ borderTop: `1px solid ${C.borderLight}`, paddingTop: 12, marginTop: 12 }}>
          <div style={{ fontSize: 11.5, color: C.textSub, padding: "0 8px 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.email}</div>
          <button onClick={onLogout} style={{ width: "100%", height: 34, border: `1px solid ${C.border}`, borderRadius: 8, background: C.white, fontSize: 12.5, fontFamily: FONT, cursor: "pointer", color: C.textSub }}>로그아웃</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {err && <div style={{ padding: 24, color: C.error, fontSize: 13.5 }}>{err}</div>}
        {activeKey && <AdminList key={activeKey} dbKey={activeKey} label={activeLabel} session={session} allDbs={dbs} onAuthError={onLogout} />}
      </div>
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
function AdminRecordForm({ dbKey, pageId, session, allDbs, onClose, onSaved, onAuthError }) {
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
    req.then(d => { setSchema(d.schema); setValues(d.row || {}); })
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
