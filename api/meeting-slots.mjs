// 07 상담 일정 화면에서 "이미 예약된 시간"을 막기 위한 조회 전용 엔드포인트.
// 노션 "상담 · 미팅" DB에서 담당자가 '미팅 확정일'을 입력해둔(=이미 확정된) 건만 모아
// ISO 날짜/일시 문자열 배열로 돌려준다. 프론트는 이 값과 겹치는 날짜·시간을 선택 못하게 막는다.

import { DB, notionCall, cors } from './_notion.mjs';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(200).json({ status: 'ok' });

  const TOKEN = process.env.NOTION_TOKEN;
  if (!TOKEN) return res.status(500).json({ success: false, error: 'NOTION_TOKEN not set' });

  try {
    const result = await notionCall(TOKEN, 'POST', `/databases/${DB.MEETING}/query`, {
      filter: { property: '미팅 확정일', date: { is_not_empty: true } },
      page_size: 100,
    });

    const booked = (result.results || [])
      .map(p => p.properties?.['미팅 확정일']?.date?.start)
      .filter(Boolean);

    return res.status(200).json({ success: true, booked });
  } catch (err) {
    console.error('MeetingSlots Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
