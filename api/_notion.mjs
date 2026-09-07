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
};

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

// 초도희망수량(자유 숫자 입력) → 제품개발의뢰서 '초도희망수량' select 옵션으로 변환
export function quantityToBucket(n) {
  const v = Number(n);
  if (!v || Number.isNaN(v)) return null;
  if (v < 1000) return '1000개 미만';
  if (v < 3000) return '1000~3000개';
  if (v < 5000) return '3000~5000개';
  if (v < 10000) return '5000~10000개';
  return '10000개 이상';
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
