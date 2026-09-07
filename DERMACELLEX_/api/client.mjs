// 개발의뢰서 작성 화면(/form) 상단에 표시할 문의 정보 조회
// DevRequestForm이 /api/client?id=<제조 문의 관리 페이지 ID> 로 호출함.
// (이 엔드포인트가 지금까지 존재하지 않아 프론트엔드에서 조용히 실패하고 있었음 — 신규 추가)

import { notionCall, cors } from './_notion.mjs';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const TOKEN = process.env.NOTION_TOKEN;
  if (!TOKEN) return res.status(500).json({ error: 'NOTION_TOKEN not set' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id가 필요합니다.' });

  try {
    const page = await notionCall(TOKEN, 'GET', `/pages/${id}`);
    const titleProp = Object.values(page.properties || {}).find(p => p.type === 'title');
    const name = titleProp?.title?.map(t => t.plain_text).join('') || '고객';
    const status = page.properties?.['상태']?.status?.name || '';
    return res.status(200).json({ name, status });
  } catch (err) {
    console.error('client lookup error:', err.message);
    return res.status(404).json({ name: '고객', error: err.message });
  }
}
