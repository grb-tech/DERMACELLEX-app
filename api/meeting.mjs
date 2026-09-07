// 상담 일정 신청 → 제조 문의 관리에 연결된 1차 상담 · 미팅을 생성한다.
// (제조사 OS 앱.dc.html 07번 화면의 최소 기능 버전 — 실제 캘린더 슬롯·6자리 코드 UI는 다음 단계에서 붙인다.)

import { DB, createPage, cors, text, title, select } from './_notion.mjs';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(200).json({ status: 'ok' });

  const TOKEN = process.env.NOTION_TOKEN;
  if (!TOKEN) return res.status(500).json({ success: false, error: 'NOTION_TOKEN not set' });

  try {
    const { inquiryId, contactId, businessName, meetingDate1, meetingTime1, meetingDate2, meetingTime2 } = req.body;
    if (!inquiryId || !contactId) {
      return res.status(400).json({ success: false, error: 'inquiryId · contactId가 필요합니다. 먼저 /api/register를 호출해주세요.' });
    }
    if (!meetingDate1 || !meetingTime1) {
      return res.status(400).json({ success: false, error: '희망 미팅일(1안)은 필수입니다.' });
    }

    const meetDt1 = `${meetingDate1}T${meetingTime1}:00+09:00`;
    const meetDt2Label = meetingDate2 && meetingTime2 ? `${meetingDate2} ${meetingTime2}` : null;

    const page = await createPage(TOKEN, DB.MEETING, {
      '미팅명': title(`${businessName || '고객'} 1차 상담`),
      '미팅구분': select('1차 상담'),
      '상태': { status: { name: '일정 제안' } },
      '미팅 일시': { date: { start: meetDt1 } },
      '사전확인사항': text(meetDt2Label ? `2차 희망 일정: ${meetDt2Label}` : ''),
      '고객 담당자': { relation: [{ id: contactId }] },
      '제조 문의 관리': { relation: [{ id: inquiryId }] },
    });

    return res.status(200).json({ success: true, pageId: page.id });
  } catch (err) {
    console.error('Meeting Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
