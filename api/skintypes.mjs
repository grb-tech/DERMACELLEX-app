// 제품개발의뢰서 '타겟피부'는 노션에서 피부타입DB 관계형으로 바뀌었다. 고객이 고를 수 있도록
// 구분(건성 · 지성 · 민감성 · 복합성 · 특수) → 세부 타입 순으로 목록을 내려준다.

import { DB, notionCall, cors, plain } from './_notion.mjs';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(200).json({ status: 'ok' });

  const TOKEN = process.env.NOTION_TOKEN;
  if (!TOKEN) return res.status(500).json({ success: false, error: 'NOTION_TOKEN not set' });

  try {
    const pages = [];
    let cursor = undefined;
    do {
      const result = await notionCall(TOKEN, 'POST', `/databases/${DB.SKINTYPE}/query`, {
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      });
      pages.push(...(result.results || []));
      cursor = result.has_more ? result.next_cursor : undefined;
    } while (cursor);

    const items = pages
      .map(p => ({
        id: p.id,
        name: plain(p.properties?.['세부 타입'], 'title'),
        groups: plain(p.properties?.['구분'], 'multi_select'),
      }))
      .filter(it => it.name)
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'));

    return res.status(200).json({ success: true, items });
  } catch (err) {
    console.error('SkinTypes Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
