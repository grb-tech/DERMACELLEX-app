// 상담 일정 신청 → 제조 문의 관리에 연결된 상담 · 미팅을 생성하고,
// 기획 문서(md) 흐름 "J 상담 일정 확정 → K 6자리 코드 전송" 기준으로 전용 페이지 접근 코드를
// 발급해 노션 "제조 의뢰 담당자"에 등록된 이메일로 보낸다.
//
// 2026-09-08: 노션 실제 스키마를 다시 확인해보니 '미팅 일시'라는 속성은 존재하지 않았다(오기).
// 실제 속성명인 '희망 미팅일1' · '희망 미팅일2'(둘 다 date 타입) 기준으로 재작성.

import { DB, createPage, notionCall, queryDb, cors, title, select } from './_notion.mjs';
import { issueAccessCode } from './_access.mjs';

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
    const todayStr = new Date().toISOString().slice(0, 10);
    if (meetingDate1 < todayStr || (meetingDate2 && meetingDate2 < todayStr)) {
      return res.status(400).json({ success: false, error: '지난 날짜는 선택할 수 없습니다.' });
    }

    const properties = {
      '미팅명': title(`${businessName || '고객'} 상담`),
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

    // 이 문의에 이미 작성된 제품개발의뢰서(06 화면에서 미리 제출됨)가 있으면 상담 · 미팅에도 연결한다.
    // 별도 PATCH로 분리 — 여기서 실패해도(속성명 변경 등) 방금 만든 상담 신청 자체는 그대로 완료시킨다.
    try {
      const devreqs = await queryDb(TOKEN, DB.DEVREQUEST, { property: '제조 문의 관리', relation: { contains: inquiryId } });
      const devreqIds = (devreqs.results || []).map(p => p.id);
      if (devreqIds.length) {
        await notionCall(TOKEN, 'PATCH', `/pages/${page.id}`, {
          properties: { '📋 제품개발의뢰서': { relation: devreqIds.map(id => ({ id })) } },
        });
      }
    } catch (e) {
      console.error('제품개발의뢰서 연결 실패:', e.message);
    }

    // 노션 "제조 의뢰 담당자"에 등록된 이메일로 보낸다 (사용자 요청 기준 — 프론트 입력값이 아닌 노션 저장값을 신뢰)
    let contactEmail = null;
    try {
      const contactPage = await notionCall(TOKEN, 'GET', `/pages/${contactId}`);
      contactEmail = contactPage.properties?.['이메일']?.email || null;
    } catch (e) {
      console.error('담당자 조회 실패:', e.message);
    }

    const { code, emailSent, emailError } = await issueAccessCode(TOKEN, {
      inquiryId, clientId, contactId, businessName, contactEmail,
    });

    return res.status(200).json({ success: true, pageId: page.id, accessCode: code, emailSent, emailError, contactEmail });
  } catch (err) {
    console.error('Meeting Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
