// 공통 Notion API 헬퍼 + 제조사V2 데이터베이스 ID
// 2026-09-07, 노션에서 직접 fetch로 확인한 현재 실제 스키마 기준으로 재작성.
// (기존 submit.mjs / devform.mjs는 "제조사V1"이라는 예전 워크스페이스의 DB ID를 쓰고 있었음.
//  devform.mjs가 쓰던 DB(383987733a9f4dbca74ca3a960d02f69)는 지금 사용 중인 제품개발의뢰서
//  스키마와 속성명이 전혀 달라 실제로는 저장이 실패하고 있었음.)

export const DB = {
  // 제조 의뢰 거래처
  CLIENT: '3d04c864-7128-8068-9320-cdd6444a4976',
  // 제조 의뢰 담당자
  CONTACT: '3d04c864-7128-80dd-8445-cbe2f475629f',
  // 고객 진단 스코어링
  SCORING: '3d04c864-7128-8009-886d-e3d082e4750a',
  // 제조 문의 관리
  INQUIRY: '3d04c864-7128-8087-bb32-d9e2eb08771a',
  // 상담 · 미팅
  MEETING: '3d14c864-7128-8091-982b-d3ff6202ebc0',
  // 📋 제품개발의뢰서
  DEVREQUEST: '3d04c864-7128-80c9-8cda-ee52c1c58cc8',
  // 제조 품목 (05 화면 카탈로그)
  CATALOG: '56544524-d8f6-45b3-a1ac-4a4813622546',
  // 고객 페이지 접근 이력 (전용 페이지 6자리 코드)
  ACCESS: '3d14c864-7128-80e8-9aa3-dc242a6f801c',
  // 제조 가견적
  ESTIMATE: '581b7f81-5640-4884-93b1-f5b5fa70186b',
  // 제조 가견적 항목
  ESTIMATE_ITEM: '0fca38a8-5a8a-48a7-969b-f2993ce553ce',
  // 제조 계약 관리
  CONTRACT: 'a5fb8837-00ea-43eb-9de4-8b38cd3c25d2',
  // 제조 프로젝트
  PROJECT: '6e164bfc-fabf-43f9-a529-2681fd09eaae',
  // 제조 개발 진행
  PROGRESS: 'c0925108-5e94-42b1-9c76-2fd9578e2929',
  // 제조 고객 알림
  NOTIFICATION: 'e0aededd-72a8-4b32-bb88-26bb5d635566',
  // 피부타입DB (제품개발의뢰서 '타겟피부' 관계 대상 — BUSINESS OS 쪽이 정본, 2026-09-09 확정.
  // 이름이 같은 BIOBIJOU 쪽 구버전(3024c864-...)과 혼동하지 않도록 주의)
  SKINTYPE: '38f4c864-7128-8041-8b1c-ed18d9e0c94a',
  // 제조 앱 필드 설정 (관리자 페이지용)
  FIELD_CONFIG: '65283f72-d68d-4977-9279-b81cf4129528',
  // 제조 연동 오류 관리 (관리자 페이지용)
  SYNC_ERROR: 'ec372b0a-1913-4d31-807a-6b024e953f3c',
};

export function queryDb(token, databaseId, filter, sorts) {
  return notionCall(token, 'POST', `/databases/${databaseId}/query`, {
    ...(filter ? { filter } : {}),
    ...(sorts ? { sorts } : {}),
    page_size: 20,
  });
}

// 관리자 대시보드 집계용 — 20건 제한 없이 전체 페이지를 커서로 끝까지 순회한다.
// queryDb는 기존 호출부(portal-login 등)가 한 거래처 범위라 20건으로 충분해 그대로 둔다.
export async function queryDbAll(token, databaseId, filter, sorts) {
  const results = [];
  let cursor;
  do {
    const body = {
      page_size: 100,
      ...(filter ? { filter } : {}),
      ...(sorts ? { sorts } : {}),
      ...(cursor ? { start_cursor: cursor } : {}),
    };
    const page = await notionCall(token, 'POST', `/databases/${databaseId}/query`, body);
    results.push(...(page.results || []));
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);
  return { results };
}

export function plain(prop, kind) {
  if (!prop) return '';
  if (kind === 'title') return (prop.title || []).map(t => t.plain_text).join('');
  if (kind === 'text') return (prop.rich_text || []).map(t => t.plain_text).join('');
  if (kind === 'select') return prop.select?.name || '';
  if (kind === 'status') return prop.status?.name || '';
  if (kind === 'date') return prop.date?.start || '';
  if (kind === 'url') return prop.url || '';
  if (kind === 'multi_select') return (prop.multi_select || []).map(o => o.name);
  if (kind === 'number') return prop.number ?? null;
  if (kind === 'checkbox') return !!prop.checkbox;
  if (kind === 'files') return (prop.files || []).map(f => f.file?.url || f.external?.url).filter(Boolean);
  if (kind === 'unique_id') return prop.unique_id ? `${prop.unique_id.prefix || ''}${prop.unique_id.number ?? ''}` : '';
  if (kind === 'relation') return (prop.relation || []).map(r => r.id);
  return '';
}

export async function notionCall(token, method, endpoint, body) {
  const r = await fetch('https://api.notion.com/v1' + endpoint, {
    method,
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json();
  if (!r.ok) throw new Error('Notion ' + r.status + ': ' + (d.message || JSON.stringify(d)));
  return d;
}

export function createPage(token, databaseId, properties, children) {
  return notionCall(token, 'POST', '/pages', {
    parent: { database_id: databaseId },
    properties,
    children: children && children.length ? children : undefined,
  });
}

export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export function text(content) {
  return { rich_text: content ? [{ text: { content: String(content) } }] : [] };
}
export function title(content) {
  return { title: content ? [{ text: { content: String(content) } }] : [{ text: { content: '(제목 없음)' } }] };
}
export function select(name) {
  return name ? { select: { name: String(name) } } : { select: null };
}
export function multiSelect(names) {
  return { multi_select: (names || []).filter(Boolean).map(n => ({ name: String(n) })) };
}
export function url(value) {
  const v = (value || '').trim();
  return { url: /^https?:\/\//i.test(v) ? v : null };
}
export function number(value) {
  const n = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return { number: Number.isFinite(n) && String(value ?? '').trim() !== '' ? n : null };
}
export function relation(ids) {
  return { relation: (ids || []).filter(Boolean).map(id => ({ id: String(id) })) };
}
export function date(value) {
  return { date: value ? { start: String(value) } : null };
}
export function checkbox(value) {
  return { checkbox: !!value };
}
export function status(name) {
  return { status: name ? { name: String(name) } : null };
}

// 한국 법정 공휴일(대체공휴일 포함, 2026~2027) — src/App.jsx의 동일 목록과 맞춰 유지한다.
// 주말과 겹치는 날짜는 요일 검사로 이미 걸러지므로 평일에 해당하는 날짜만 담았다.
const KR_HOLIDAYS = new Set([
  '2026-01-01', '2026-02-16', '2026-02-17', '2026-02-18', '2026-03-02',
  '2026-05-01', '2026-05-05', '2026-05-25', '2026-08-17',
  '2026-09-24', '2026-09-25', '2026-10-05', '2026-10-09', '2026-12-25',
  '2027-01-01', '2027-02-08', '2027-02-09', '2027-03-01',
  '2027-05-05', '2027-05-13', '2027-08-16',
  '2027-09-14', '2027-09-15', '2027-09-16', '2027-10-04', '2027-10-11', '2027-12-27',
]);
export function isWeekendOrHoliday(dateStr) {
  if (!dateStr) return false;
  const dow = new Date(`${dateStr}T00:00:00`).getDay();
  return dow === 0 || dow === 6 || KR_HOLIDAYS.has(dateStr);
}
