// 내부 관리자 페이지(/admin)의 공통 로직 — Google Workspace 로그인 검증, 세션 서명/검증,
// 16개 Notion DB에 대한 스키마 기반 제네릭 CRUD 변환.
//
// 2026-09-10: DB별 속성 목록을 코드에 손으로 나열하지 않는다. 대신 Notion의 표준 REST API
// `GET /v1/databases/{id}`가 실제 속성명·타입·옵션·관계 대상을 그대로 돌려주므로, 매 요청마다
// 이걸 그대로 읽어서 화면을 구성한다. 이렇게 하면 이번 세션에 여러 번 겪었던 "문서/코드가 실제
// 노션 스키마와 어긋나는" 문제 자체가 구조적으로 생기지 않는다 — Notion이 항상 정답이다.

import crypto from 'crypto';
import { DB, notionCall, text, title, select, multiSelect, url, number, relation, date, checkbox, status } from './_notion.mjs';

const ALLOWED_DOMAIN = 'bsgholdings.co.kr';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12시간

// 관리자 화면에 보여줄 16개 DB — 표시 이름 · 사이드바 섹션만 여기서 정하고, 실제 속성 구성은
// 전부 Notion에서 실시간으로 읽는다(아래 getDbSchema).
export const ADMIN_DBS = [
  { key: 'CLIENT', label: '제조 의뢰 거래처', section: '고객·문의' },
  { key: 'CONTACT', label: '제조 의뢰 담당자', section: '고객·문의' },
  { key: 'SCORING', label: '고객 진단 스코어링', section: '고객·문의' },
  { key: 'INQUIRY', label: '제조 문의 관리', section: '고객·문의' },
  { key: 'DEVREQUEST', label: '제품개발의뢰서', section: '제품·상담' },
  { key: 'MEETING', label: '상담·미팅', section: '제품·상담' },
  { key: 'ACCESS', label: '고객 페이지 접근 이력', section: '제품·상담' },
  { key: 'ESTIMATE', label: '제조 가견적', section: '견적·계약' },
  { key: 'ESTIMATE_ITEM', label: '제조 가견적 항목', section: '견적·계약' },
  { key: 'CONTRACT', label: '제조 계약 관리', section: '견적·계약' },
  { key: 'PROJECT', label: '제조 프로젝트', section: '계약 후 진행' },
  { key: 'PROGRESS', label: '제조 개발 진행', section: '계약 후 진행' },
  { key: 'NOTIFICATION', label: '제조 고객 알림', section: '포털·시스템' },
  { key: 'FIELD_CONFIG', label: '제조 앱 필드 설정', section: '포털·시스템' },
  { key: 'SYNC_ERROR', label: '제조 연동 오류 관리', section: '포털·시스템' },
  { key: 'CATALOG', label: '제조 품목', section: '포털·시스템' },
];
const ADMIN_DB_BY_KEY = Object.fromEntries(ADMIN_DBS.map(d => [d.key, d]));
// Notion이 관계 속성에서 돌려주는 database_id(대시 없는 32자)로 우리 DB.key를 역추적하기 위한 표.
const DASHLESS_TO_KEY = Object.fromEntries(
  Object.entries(DB).map(([k, id]) => [id.replace(/-/g, ''), k])
);

export function dbEntry(dbKey) {
  const entry = ADMIN_DB_BY_KEY[dbKey];
  if (!entry) throw new Error(`알 수 없는 DB: ${dbKey}`);
  return { ...entry, id: DB[dbKey] };
}

// ─── 세션 (Google 로그인 후 발급하는 자체 토큰) ───

export function signSession(email) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('ADMIN_SESSION_SECRET 환경변수가 설정되어 있지 않습니다.');
  const expiry = Date.now() + SESSION_TTL_MS;
  const payload = `${email}:${expiry}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${payload}:${sig}`).toString('base64');
}

export function verifySession(token) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || !token) return null;
  try {
    const decoded = Buffer.from(String(token), 'base64').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length !== 3) return null;
    const [email, expiryStr, sig] = parts;
    const expiry = Number(expiryStr);
    if (!email || !expiry || !sig || Date.now() > expiry) return null;
    const expectSig = crypto.createHmac('sha256', secret).update(`${email}:${expiry}`).digest('hex');
    if (sig !== expectSig) return null;
    if (!email.endsWith('@' + ALLOWED_DOMAIN)) return null;
    return { email };
  } catch {
    return null;
  }
}

// ─── Google 로그인 토큰 검증 ───
// Google Identity Services가 프런트에 돌려준 ID 토큰을 tokeninfo 엔드포인트로 그대로
// 검증한다 — 별도 JWT 라이브러리 없이 fetch 하나로 서명·만료를 Google이 확인해준다.
export async function verifyGoogleToken(credential) {
  const clientId = process.env.GOOGLE_ADMIN_CLIENT_ID;
  if (!clientId) throw new Error('GOOGLE_ADMIN_CLIENT_ID 환경변수가 설정되어 있지 않습니다.');
  if (!credential) throw new Error('Google 로그인 정보가 없습니다.');

  const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  const payload = await r.json();
  if (!r.ok) throw new Error('Google 토큰 검증에 실패했습니다.');
  if (payload.aud !== clientId) throw new Error('클라이언트 ID가 일치하지 않습니다.');
  if (payload.email_verified !== 'true' && payload.email_verified !== true) {
    throw new Error('이메일이 인증되지 않은 계정입니다.');
  }
  const email = String(payload.email || '').toLowerCase();
  const hd = payload.hd || '';
  if (hd !== ALLOWED_DOMAIN && !email.endsWith('@' + ALLOWED_DOMAIN)) {
    throw new Error(`@${ALLOWED_DOMAIN} 회사 계정으로만 로그인할 수 있습니다.`);
  }
  return { email };
}

// ─── Notion 스키마 실시간 조회 + 제네릭 변환 ───

const READONLY_TYPES = new Set([
  'formula', 'rollup', 'created_time', 'created_by', 'last_edited_time', 'last_edited_by',
  'unique_id', 'files', 'people', 'button', 'verification',
]);

export async function getDbSchema(token, dbKey) {
  const entry = dbEntry(dbKey);
  const db = await notionCall(token, 'GET', `/databases/${entry.id}`);
  const fields = Object.entries(db.properties || {}).map(([name, prop]) => {
    const type = prop.type;
    const field = { name, type, editable: !READONLY_TYPES.has(type) };
    if (type === 'select' || type === 'status') {
      field.options = (prop[type]?.options || []).map(o => o.name);
    } else if (type === 'multi_select') {
      field.options = (prop.multi_select?.options || []).map(o => o.name);
    } else if (type === 'relation') {
      const targetId = (prop.relation?.database_id || '').replace(/-/g, '');
      field.relationTarget = DASHLESS_TO_KEY[targetId] || null;
    }
    return field;
  });
  const titleField = fields.find(f => f.type === 'title')?.name || null;
  return { key: dbKey, label: entry.label, section: entry.section, titleField, fields };
}

// Notion 페이지 → 프런트로 보낼 평평한 {속성명: 값} 객체.
export function pageToInput(schema, page) {
  const props = page.properties || {};
  const out = { id: page.id, archived: !!page.archived };
  for (const f of schema.fields) {
    const p = props[f.name];
    out[f.name] = decodeValue(f.type, p);
  }
  return out;
}

function decodeValue(type, p) {
  if (!p) return type === 'multi_select' || type === 'relation' ? [] : type === 'checkbox' ? false : '';
  switch (type) {
    case 'title': return (p.title || []).map(t => t.plain_text).join('');
    case 'rich_text': return (p.rich_text || []).map(t => t.plain_text).join('');
    case 'select': return p.select?.name || '';
    case 'status': return p.status?.name || '';
    case 'multi_select': return (p.multi_select || []).map(o => o.name);
    case 'number': return p.number ?? '';
    case 'checkbox': return !!p.checkbox;
    case 'date': return p.date?.start || '';
    case 'url': return p.url || '';
    case 'email': return p.email || '';
    case 'phone_number': return p.phone_number || '';
    case 'relation': return (p.relation || []).map(r => r.id);
    case 'files': return (p.files || []).map(f => f.file?.url || f.external?.url).filter(Boolean);
    case 'unique_id': return p.unique_id ? `${p.unique_id.prefix || ''}${p.unique_id.number ?? ''}` : '';
    case 'created_time': return p.created_time || '';
    case 'last_edited_time': return p.last_edited_time || '';
    case 'created_by': return p.created_by?.name || p.created_by?.id || '';
    case 'last_edited_by': return p.last_edited_by?.name || p.last_edited_by?.id || '';
    case 'people': return (p.people || []).map(u => u.name || u.id);
    case 'formula': return p.formula?.[p.formula?.type] ?? '';
    default: return '';
  }
}

// 프런트에서 받은 {속성명: 값}(편집 가능한 것만) → Notion PATCH/CREATE용 properties 객체.
export function inputToProps(schema, input) {
  const out = {};
  for (const f of schema.fields) {
    if (!f.editable) continue;
    if (!(f.name in input)) continue;
    const v = input[f.name];
    switch (f.type) {
      case 'title': out[f.name] = title(v); break;
      case 'rich_text': out[f.name] = text(v); break;
      case 'select': out[f.name] = select(v); break;
      case 'status': out[f.name] = status(v); break;
      case 'multi_select': out[f.name] = multiSelect(v); break;
      case 'number': out[f.name] = number(v); break;
      case 'checkbox': out[f.name] = checkbox(v); break;
      case 'date': out[f.name] = date(v); break;
      case 'url': out[f.name] = url(v); break;
      case 'email': out[f.name] = { email: v ? String(v) : null }; break;
      case 'phone_number': out[f.name] = { phone_number: v ? String(v) : null }; break;
      case 'relation': out[f.name] = relation(v); break;
      default: break; // 읽기 전용 타입은 애초에 editable=false라 여기 오지 않음
    }
  }
  return out;
}
