// 내부 관리자 페이지(/admin)의 공통 로직 — Google Workspace 로그인 검증, 세션 서명/검증,
// 16개 Notion DB에 대한 스키마 기반 제네릭 CRUD 변환.
//
// 2026-09-10: DB별 속성 목록을 코드에 손으로 나열하지 않는다. 대신 Notion의 표준 REST API
// `GET /v1/databases/{id}`가 실제 속성명·타입·옵션·관계 대상을 그대로 돌려주므로, 매 요청마다
// 이걸 그대로 읽어서 화면을 구성한다. 이렇게 하면 이번 세션에 여러 번 겪었던 "문서/코드가 실제
// 노션 스키마와 어긋나는" 문제 자체가 구조적으로 생기지 않는다 — Notion이 항상 정답이다.

import crypto from 'crypto';
import { DB, notionCall, queryDbAll, text, title, select, multiSelect, url, number, relation, date, checkbox, status } from './_notion.mjs';

const ALLOWED_DOMAIN = 'bsgholdings.co.kr';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12시간
// Google OAuth Client ID — 비밀값이 아니라 프런트 JS 번들에도 그대로 노출되는 공개 식별자라
// 코드에 하드코딩해도 안전하다(진짜 비밀인 클라이언트 시크릿은 애초에 이 로그인 방식에서 쓰지
// 않는다). 필요하면 GOOGLE_ADMIN_CLIENT_ID 환경변수로 덮어쓸 수 있다.
const GOOGLE_CLIENT_ID = process.env.GOOGLE_ADMIN_CLIENT_ID
  || '459440676457-vpj7nnt22i6r9qr7vihnndtrc6j2rl2j.apps.googleusercontent.com';

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
  if (!credential) throw new Error('Google 로그인 정보가 없습니다.');

  const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  const payload = await r.json();
  if (!r.ok) throw new Error('Google 토큰 검증에 실패했습니다.');
  if (payload.aud !== GOOGLE_CLIENT_ID) throw new Error('클라이언트 ID가 일치하지 않습니다.');
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

// ─── 업무 프로세스 기준 대시보드 (2026-09-10 v2) ───
// DB 목록형 관리자를 완전히 대체한다 — 거래처를 "문의→의뢰서→상담→가견적→계약→제조진행"
// 파이프라인 단계로 버킷팅한 칸반 보드, 거래처 하나의 전체 히스토리, 오늘 확인할 항목 3가지를
// 제공한다. 실제 레코드 조회·생성·수정은 위의 스키마 기반 getDbSchema/pageToInput/inputToProps를
// 그대로 재사용하고, 여기서는 "어느 거래처가 지금 어디에 있는가"만 집계한다.

// 거래처 관계 속성명은 DB마다 다르다 — 대부분 '제조 의뢰 거래처'지만 CONTACT·SCORING은
// 담당자를 거치지 않고 거래처를 직접 가리키는 '거래처명'을 쓴다(api/register.mjs,
// api/diagnosis.mjs에서 실제로 그렇게 생성한다). 절대 통일해서 짐작하지 않는다.
const CLIENT_RELATION_PROP = { CONTACT: '거래처명', SCORING: '거래처명' };
function clientRelationProp(dbKey) {
  return CLIENT_RELATION_PROP[dbKey] || '제조 의뢰 거래처';
}

// App.jsx의 ddayOf와 동일한 공식 — 프런트 표시값과 서버 집계값이 어긋나지 않게 그대로 포팅.
function ddayOf(deadline) {
  if (!deadline) return null;
  return Math.ceil((new Date(`${deadline}T00:00:00`) - new Date(new Date().toDateString())) / 86400000);
}

// '상태' 속성은 DB마다 select 타입(가견적·계약·프로젝트·개발진행)과 status 타입(문의·의뢰서·
// 상담)이 섞여 있다 — 둘 다 확인한다.
function statusOf(page) {
  const p = page?.properties?.['상태'];
  return p?.status?.name || p?.select?.name || '';
}

function titleOf(page, propName) {
  return (page?.properties?.[propName]?.title || []).map(t => t.plain_text).join('');
}

function groupByRelation(queryResult, relProp) {
  const map = {};
  for (const p of queryResult.results || []) {
    const rel = p.properties?.[relProp]?.relation || [];
    for (const r of rel) (map[r.id] ||= []).push(p);
  }
  for (const id in map) map[id].sort((a, b) => new Date(b.created_time) - new Date(a.created_time));
  return map;
}

const PIPELINE_STAGE_ORDER = [
  { key: 'INQUIRY', label: '문의' },
  { key: 'DEVREQUEST', label: '의뢰서' },
  { key: 'MEETING', label: '상담' },
  { key: 'ESTIMATE', label: '가견적' },
  { key: 'CONTRACT', label: '계약' },
  { key: 'PROJECT', label: '제조진행' },
];

// 거래처별 "현재 단계" 칸반 보드. 전체 거래처를 다뤄야 하는 유일한 곳이라 필터 없는
// queryDbAll(전체 스캔)을 쓴다 — 다른 집계 함수는 항상 거래처 하나로 필터링한다.
export async function getPipelineBoard(token) {
  const [clients, inquiries, devrequests, meetings, estimates, contracts, projects] = await Promise.all([
    queryDbAll(token, DB.CLIENT),
    queryDbAll(token, DB.INQUIRY),
    queryDbAll(token, DB.DEVREQUEST),
    queryDbAll(token, DB.MEETING),
    queryDbAll(token, DB.ESTIMATE),
    queryDbAll(token, DB.CONTRACT),
    queryDbAll(token, DB.PROJECT),
  ]);

  const byInquiry = groupByRelation(inquiries, '제조 의뢰 거래처');
  const byDevreq = groupByRelation(devrequests, '제조 의뢰 거래처');
  const byMeeting = groupByRelation(meetings, '제조 의뢰 거래처');
  const byEstimate = groupByRelation(estimates, '제조 의뢰 거래처');
  const byContract = groupByRelation(contracts, '제조 의뢰 거래처');
  const byProject = groupByRelation(projects, '제조 의뢰 거래처');

  const columnKeys = [...PIPELINE_STAGE_ORDER.map(s => s.key), 'DONE', 'TERMINATED'];
  const buckets = Object.fromEntries(columnKeys.map(k => [k, []]));

  for (const c of clients.results || []) {
    const clientId = c.id;
    const clientName = titleOf(c, '법인 · 개인명') || '(이름 없음)';

    const latestInquiry = (byInquiry[clientId] || [])[0];
    const latestDevreq = (byDevreq[clientId] || [])[0];
    const latestMeeting = (byMeeting[clientId] || [])[0];
    const latestEstimate = (byEstimate[clientId] || [])[0];
    const latestContract = (byContract[clientId] || [])[0];
    const clientProjects = byProject[clientId] || [];

    const inquiryStatus = statusOf(latestInquiry);
    const contractStatus = statusOf(latestContract);
    const projectStatuses = clientProjects.map(statusOf);

    let bucket;
    let subLabel = '';
    if (['종료', '14일 내 미날인 종료'].includes(inquiryStatus)
      || ['취소', '14일 내 미날인 종료'].includes(contractStatus)
      || projectStatuses.includes('중단')) {
      bucket = 'TERMINATED';
      subLabel = inquiryStatus || contractStatus || '중단';
    } else if (clientProjects.length && projectStatuses.every(s => s === '완료')) {
      bucket = 'DONE';
    } else if (clientProjects.length) {
      bucket = 'PROJECT';
      subLabel = projectStatuses[0] || '';
    } else if (latestContract) {
      bucket = 'CONTRACT';
      subLabel = contractStatus;
    } else if (latestEstimate) {
      bucket = 'ESTIMATE';
      subLabel = statusOf(latestEstimate);
    } else if (latestMeeting) {
      bucket = 'MEETING';
      subLabel = statusOf(latestMeeting);
    } else if (latestDevreq) {
      bucket = 'DEVREQUEST';
      subLabel = statusOf(latestDevreq);
    } else if (latestInquiry) {
      bucket = 'INQUIRY';
      subLabel = inquiryStatus;
    } else {
      bucket = 'INQUIRY';
      subLabel = '문의 없음';
    }

    let contractDday = null;
    if (bucket === 'CONTRACT' && latestContract) {
      const pr = latestContract.properties || {};
      const deadline = pr['연장 기한']?.date?.start || pr['날인 기한']?.date?.start;
      contractDday = ddayOf(deadline);
    }

    const lastActivityAt = [latestInquiry, latestDevreq, latestMeeting, latestEstimate, latestContract, clientProjects[0]]
      .filter(Boolean)
      .map(p => p.last_edited_time || p.created_time)
      .sort()
      .reverse()[0] || c.created_time;

    buckets[bucket].push({ clientId, clientName, bucket, subLabel, lastActivityAt, contractDday });
  }

  for (const k of columnKeys) {
    buckets[k].sort((a, b) => new Date(b.lastActivityAt) - new Date(a.lastActivityAt));
  }

  const labels = {
    ...Object.fromEntries(PIPELINE_STAGE_ORDER.map(s => [s.key, s.label])),
    DONE: '완료',
    TERMINATED: '종료·취소',
  };

  return {
    columns: columnKeys.map(k => ({ key: k, label: labels[k], clients: buckets[k] })),
    generatedAt: new Date().toISOString(),
  };
}

// 거래처 하나의 전체 히스토리 — "고객 공개" 게이트 없이(내부용이라 초안까지 전부) 8단계를
// 한 번에 모은다. portal-login.mjs와 같은 집계 패턴이되, 행 변환은 손으로 짠 mapper 대신
// pageToInput(스키마 기반)을 써서 Notion 스키마가 바뀌어도 자동으로 따라간다.
export async function getClientDetail(token, clientId) {
  const dbKeys = [
    'CLIENT', 'CONTACT', 'SCORING', 'INQUIRY', 'DEVREQUEST', 'MEETING',
    'ESTIMATE', 'ESTIMATE_ITEM', 'CONTRACT', 'PROJECT', 'PROGRESS', 'NOTIFICATION', 'ACCESS',
  ];
  const schemaList = await Promise.all(dbKeys.map(k => getDbSchema(token, k)));
  const schemas = Object.fromEntries(dbKeys.map((k, i) => [k, schemaList[i]]));

  const [
    clientPage, contacts, scoring, inquiries, devRequests, meetings,
    estimateHeaders, estimateItems, contracts, projects, progressSteps, notifications, accessHistory,
  ] = await Promise.all([
    notionCall(token, 'GET', `/pages/${clientId}`),
    queryDbAll(token, DB.CONTACT, { property: clientRelationProp('CONTACT'), relation: { contains: clientId } }),
    queryDbAll(token, DB.SCORING, { property: clientRelationProp('SCORING'), relation: { contains: clientId } }),
    queryDbAll(token, DB.INQUIRY, { property: '제조 의뢰 거래처', relation: { contains: clientId } }, [{ timestamp: 'created_time', direction: 'descending' }]),
    queryDbAll(token, DB.DEVREQUEST, { property: '제조 의뢰 거래처', relation: { contains: clientId } }, [{ timestamp: 'created_time', direction: 'descending' }]),
    queryDbAll(token, DB.MEETING, { property: '제조 의뢰 거래처', relation: { contains: clientId } }, [{ timestamp: 'created_time', direction: 'descending' }]),
    queryDbAll(token, DB.ESTIMATE, { property: '제조 의뢰 거래처', relation: { contains: clientId } }, [{ timestamp: 'created_time', direction: 'descending' }]),
    queryDbAll(token, DB.ESTIMATE_ITEM, { property: '제조 의뢰 거래처', relation: { contains: clientId } }, [{ property: '정렬 순서', direction: 'ascending' }]),
    queryDbAll(token, DB.CONTRACT, { property: '제조 의뢰 거래처', relation: { contains: clientId } }, [{ timestamp: 'created_time', direction: 'descending' }]),
    queryDbAll(token, DB.PROJECT, { property: '제조 의뢰 거래처', relation: { contains: clientId } }, [{ timestamp: 'created_time', direction: 'descending' }]),
    queryDbAll(token, DB.PROGRESS, { property: '제조 의뢰 거래처', relation: { contains: clientId } }, [{ property: '정렬 순서', direction: 'ascending' }]),
    queryDbAll(token, DB.NOTIFICATION, { property: '제조 의뢰 거래처', relation: { contains: clientId } }, [{ timestamp: 'created_time', direction: 'descending' }]),
    queryDbAll(token, DB.ACCESS, { property: '제조 의뢰 거래처', relation: { contains: clientId } }, [{ timestamp: 'created_time', direction: 'descending' }]),
  ]);

  const rows = (key, queryResult) => (queryResult.results || []).map(p => pageToInput(schemas[key], p));

  // 가견적 항목은 항목 쪽 관계 필드(대상=ESTIMATE)를 스키마에서 찾아 헤더에 묶는다 — 이름을
  // 하드코딩하지 않는다.
  const estimateItemRows = rows('ESTIMATE_ITEM', estimateItems);
  const estimateRelField = (schemas.ESTIMATE_ITEM.fields.find(f => f.relationTarget === 'ESTIMATE') || {}).name;
  const itemsByEstimate = {};
  if (estimateRelField) {
    for (const item of estimateItemRows) {
      for (const eid of (item[estimateRelField] || [])) (itemsByEstimate[eid] ||= []).push(item);
    }
  }
  const estimateRows = rows('ESTIMATE', estimateHeaders).map(e => ({ ...e, items: itemsByEstimate[e.id] || [] }));

  const progressRows = rows('PROGRESS', progressSteps);
  const progressRelField = (schemas.PROGRESS.fields.find(f => f.relationTarget === 'PROJECT') || {}).name;
  const stepsByProject = {};
  if (progressRelField) {
    for (const step of progressRows) {
      for (const pid of (step[progressRelField] || [])) (stepsByProject[pid] ||= []).push(step);
    }
  }
  const projectRows = rows('PROJECT', projects).map(p => ({ ...p, steps: stepsByProject[p.id] || [] }));

  return {
    client: pageToInput(schemas.CLIENT, clientPage),
    contacts: rows('CONTACT', contacts),
    scoring: rows('SCORING', scoring),
    inquiries: rows('INQUIRY', inquiries),
    devRequests: rows('DEVREQUEST', devRequests),
    meetings: rows('MEETING', meetings),
    estimates: estimateRows,
    contracts: rows('CONTRACT', contracts),
    projects: projectRows,
    notifications: rows('NOTIFICATION', notifications),
    accessHistory: rows('ACCESS', accessHistory),
  };
}

// 오늘 확인이 필요한 항목 — 계약 D-day 임박, 예정된 상담, 자격요건 보완 필요 문의, 미확인
// 알림, 미해결 연동 오류. 문서·코드에 값이 확정되지 않은 속성은 짐작해서 필터를 걸지 않고
// 라이브 스키마를 먼저 확인한다.
export async function getActionItems(token) {
  const [clients, contracts, meetings, notifications, inquirySchema, syncSchema] = await Promise.all([
    queryDbAll(token, DB.CLIENT),
    queryDbAll(token, DB.CONTRACT),
    queryDbAll(token, DB.MEETING, { property: '미팅 확정일', date: { is_not_empty: true } }),
    queryDbAll(token, DB.NOTIFICATION, {
      and: [
        { property: '읽음 여부', checkbox: { equals: false } },
        { property: '고객 페이지 노출', checkbox: { equals: true } },
        { property: '발송 상태', select: { equals: '발송 완료' } },
      ],
    }),
    getDbSchema(token, 'INQUIRY'),
    getDbSchema(token, 'SYNC_ERROR'),
  ]);

  const clientNameById = Object.fromEntries(
    (clients.results || []).map(c => [c.id, titleOf(c, '법인 · 개인명') || '(이름 없음)'])
  );
  const clientOf = (page, relProp = '제조 의뢰 거래처') => {
    const id = page.properties?.[relProp]?.relation?.[0]?.id || null;
    return { clientId: id, clientName: id ? (clientNameById[id] || '') : '' };
  };

  const contractsDueSoon = (contracts.results || [])
    .map(p => {
      const pr = p.properties || {};
      const deadline = pr['연장 기한']?.date?.start || pr['날인 기한']?.date?.start;
      return { p, status: statusOf(p), dday: ddayOf(deadline) };
    })
    .filter(({ status, dday }) => !['날인 완료', '취소', '14일 내 미날인 종료'].includes(status) && dday !== null && dday <= 3)
    .map(({ p, status, dday }) => ({ id: p.id, name: titleOf(p, '계약명'), status, dday, ...clientOf(p) }));

  const today = new Date().toISOString().slice(0, 10);
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const upcomingMeetings = (meetings.results || [])
    .map(p => ({ id: p.id, confirmedDate: p.properties?.['미팅 확정일']?.date?.start || '', name: titleOf(p, '미팅명'), ...clientOf(p) }))
    .filter(m => m.confirmedDate >= today && m.confirmedDate <= in7)
    .sort((a, b) => a.confirmedDate.localeCompare(b.confirmedDate));

  // 자격요건 충족 상태는 md 문서상 값은 확정(충족/보완 필요/확인 중)이지만 속성 타입(select
  // vs status)은 코드 어디서도 쓰인 적이 없어 라이브 스키마로 먼저 확인한다.
  const followupField = inquirySchema.fields.find(f => f.name === '자격요건 충족 상태');
  let inquiriesNeedingFollowup = [];
  if (followupField && (followupField.type === 'select' || followupField.type === 'status')) {
    const res = await queryDbAll(token, DB.INQUIRY, {
      property: '자격요건 충족 상태',
      [followupField.type]: { equals: '보완 필요' },
    });
    inquiriesNeedingFollowup = (res.results || []).map(p => ({ id: p.id, name: titleOf(p, '제조 문의명'), ...clientOf(p) }));
  }

  const unreadByClient = {};
  for (const p of (notifications.results || [])) {
    const { clientId, clientName } = clientOf(p);
    if (!clientId) continue;
    (unreadByClient[clientId] ||= { clientId, clientName, count: 0 }).count++;
  }
  const unreadNotifications = Object.values(unreadByClient).sort((a, b) => b.count - a.count);

  // '연동 오류' 해결 여부 필드명은 문서·코드 어디에도 확정돼 있지 않다 — 라이브 스키마에서
  // 이름에 "해결"이 들어간 체크박스 필드를 찾아 쓰고, 없으면(또는 체크박스가 아니면) 전체
  // 미보관 행을 "미확인"으로 간주한다(존재하지 않는 값을 짐작해 필터링하지 않는다).
  const resolvedField = syncSchema.fields.find(f => f.name.includes('해결') && f.type === 'checkbox');
  const syncRes = resolvedField
    ? await queryDbAll(token, DB.SYNC_ERROR, { property: resolvedField.name, checkbox: { equals: false } })
    : await queryDbAll(token, DB.SYNC_ERROR);
  const syncRows = (syncRes.results || []).filter(p => !p.archived);
  const unresolvedSyncErrors = {
    heuristic: resolvedField ? 'schema-field' : 'all-rows',
    count: syncRows.length,
    items: syncRows.map(p => ({ id: p.id, name: pageToInput(syncSchema, p)[syncSchema.titleField] || '' })),
  };

  return {
    generatedAt: new Date().toISOString(),
    contractsDueSoon,
    upcomingMeetings,
    inquiriesNeedingFollowup,
    unreadNotifications,
    unresolvedSyncErrors,
  };
}
