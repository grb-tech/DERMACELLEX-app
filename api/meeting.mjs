// 상담 일정 신청 → 제조 문의 관리에 연결된 1차 상담 · 미팅을 생성한다.
// 고객은 희망 미팅일1(필수)·희망 미팅일2(선택)만 제안하고, 실제 확정 일시는
// 담당자가 노션에서 '미팅 확정일'에 직접 입력한다 — 이 필드는 고객 화면에서 절대 쓰지 않는다.
//
// 2026-09-08: 노션 실제 스키마를 다시 확인해보니 '미팅 일시'라는 속성은 존재하지 않았다(오기).
// 실제 속성명인 '희망 미팅일1' · '희망 미팅일2'(둘 다 date 타입) 기준으로 재작성.

import { DB, createPage, cors, title, select } from './_notion.mjs';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(200).json({ status: 'ok' });

  const TOKEN = process.env.NOTION_TOKEN;
  if (!TOKEN) return res.status(500).json({ success: false, error: 'NOTION_TOKEN not set' });

  try {
    const { inquiryId, contactId, clientId, businessName, meetingDate1, meetingTime1, meetingDate2, meetingTime2 } = req.body;
    if (!inquiryId || !contactId) {
      return res.status(400).json({ success: false, error: 'inquiryId · contactId가 필요합니다. 먼저 /api/register를 호출해주세요.' });
    }
    if (!meetingDate1 || !meetingTime1) {
      return res.status(400).json({ success: false, error: '희망 미팅일(1안)은 필수입니다.' });
    }

    const properties = {
      '미팅명': title(`${businessName || '고객'} 1차 상담`),
      '미팅구분': select('1차 상담'),
      '상태': { status: { name: '일정 제안' } },
      '희망 미팅일1': { date: { start: `${meetingDate1}T${meetingTime1}:00+09:00` } },
      '고객 담당자': { relation: [{ id: contactId }] },
      '제조 문의 관리': { relation: [{ id: inquiryId }] },
      ...(clientId ? { '제조 의뢰 거래처': { relation: [{ id: clientId }] } } : {}),
    };
    if (meetingDate2 && meetingTime2) {
      properties['희망 미팅일2'] = { date: { start: `${meetingDate2}T${meetingTime2}:00+09:00` } };
    }

    const page = await createPage(TOKEN, DB.MEETING, properties);

    return res.status(200).json({ success: true, pageId: page.id });
  } catch (err) {
    console.error('Meeting Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
