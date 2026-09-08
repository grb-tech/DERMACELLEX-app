// 상담 일정 신청 → 제조 문의 관리에 연결된 1차 상담 · 미팅을 생성하고,
// 기획 문서(md) 흐름 "J 상담 일정 확정 → K 6자리 코드 전송" 기준으로 전용 페이지 접근 코드를
// 발급해 노션 "제조 의뢰 담당자"에 등록된 이메일로 보낸다.
//
// 코드 정책(문서 13장 "구현 전 추가 확정 사항"이 아직 미확정이라 MVP 기준으로 임의 확정한 부분):
// - 원본 6자리 코드는 절대 노션에 저장하지 않는다. 이메일 발송 + 이 응답으로 딱 한 번만
//   내려주고, 노션에는 마스킹 표시값과 검증용 해시만 남긴다.
// - RESEND_API_KEY가 설정돼있지 않거나 발송이 실패해도 상담 신청 자체는 그대로 완료시키고,
//   화면에 코드를 직접 보여주는 것으로 대체한다(전송 결과는 '전송 결과' 속성에 기록).
//
// 2026-09-08: 노션 실제 스키마를 다시 확인해보니 '미팅 일시'라는 속성은 존재하지 않았다(오기).
// 실제 속성명인 '희망 미팅일1' · '희망 미팅일2'(둘 다 date 타입) 기준으로 재작성.

import crypto from 'crypto';
import { DB, createPage, notionCall, cors, title, select, text } from './_notion.mjs';
import { sendEmail } from './_email.mjs';

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

    // ─── 전용 페이지 접근 코드 발급 (원본 코드는 여기서만 만들고 절대 저장하지 않는다) ───
    const code = String(crypto.randomInt(100000, 1000000));
    const masked = `${code[0]}••••${code[5]}`;
    const verifyValue = crypto.createHash('sha256').update(`${code}:${inquiryId}`).digest('hex');
    const today = new Date().toISOString().substring(0, 10);

    // 노션 "제조 의뢰 담당자"에 등록된 이메일로 보낸다 (사용자 요청 기준 — 프론트 입력값이 아닌 노션 저장값을 신뢰)
    let contactEmail = null;
    try {
      const contactPage = await notionCall(TOKEN, 'GET', `/pages/${contactId}`);
      contactEmail = contactPage.properties?.['이메일']?.email || null;
    } catch (e) {
      console.error('담당자 조회 실패:', e.message);
    }

    let sendResult = '미발송';
    const RESEND_KEY = process.env.RESEND_API_KEY;
    if (RESEND_KEY && contactEmail) {
      try {
        await sendEmail(RESEND_KEY, {
          to: contactEmail,
          subject: '[DERMACELLEX] 전용 페이지 접속 코드',
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
              <h2 style="color:#111">전용 페이지 접속 코드</h2>
              <p>${businessName || '고객'}님, 제조 상담 신청이 접수되었습니다.</p>
              <p>아래 접속 코드와 등록하신 연락처로 전용 페이지에서 진행 상황을 확인하실 수 있습니다.</p>
              <div style="font-size:32px;font-weight:800;letter-spacing:8px;background:#111;color:#fff;padding:20px;text-align:center;border-radius:12px;margin:20px 0">${code}</div>
              <p style="color:#888;font-size:13px">이 코드는 본인 확인용이며 타인에게 공유하지 마세요.</p>
            </div>
          `,
        });
        sendResult = '발송 성공';
      } catch (e) {
        console.error('메일 발송 실패:', e.message);
        sendResult = '발송 실패';
      }
    }

    await createPage(TOKEN, DB.ACCESS, {
      '접근권한명': title(`${businessName || '고객'} 전용 페이지 접근`),
      '제조 문의 관리': { relation: [{ id: inquiryId }] },
      ...(clientId ? { '제조 의뢰 거래처': { relation: [{ id: clientId }] } } : {}),
      '의뢰 담당자': { relation: [{ id: contactId }] },
      '코트 표시값': text(masked),
      '코트 검증값': text(verifyValue),
      '코드 상태': { status: { name: '진행 중' } },
      '발급일': { date: { start: today } },
      ...(sendResult === '발송 성공' ? { '전송일': { date: { start: today } } } : {}),
      '전송 결과': select(sendResult),
      '활성일': { date: { start: today } },
      '로그인 실패 횟수': { number: 0 },
      '코드 폐기': { checkbox: false },
    });

    return res.status(200).json({ success: true, pageId: page.id, accessCode: code, emailSent: sendResult === '발송 성공' });
  } catch (err) {
    console.error('Meeting Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
