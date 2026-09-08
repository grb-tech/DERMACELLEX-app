// 전용 페이지 접근 코드 발급 공통 로직 — /api/meeting(최초 발급)과 /api/portal-resend(재발급)이 함께 쓴다.
// 2026-09-08: 담당자가 노션에서 코드를 평문으로 바로 확인해야 한다는 요청에 따라, '코드 표시값'에
// 마스킹 대신 원본 6자리 코드를 그대로 저장한다(노션은 내부 직원만 접근 가능한 워크스페이스이므로
// 고객에게 노출될 위험은 없다 — 완전한 비공개 저장은 아니라는 점만 감안할 것).
// 검증은 여전히 해시(코드 검증값)로 하므로, 로그인 로직은 이 변경의 영향을 받지 않는다.
// 이메일에는 코드와 함께 클릭 한 번으로 로그인되는 "바로가기" 링크도 넣어 직접 입력을 보완한다.

import crypto from 'crypto';
import { DB, createPage, title, select, text } from './_notion.mjs';
import { sendEmail } from './_email.mjs';

export function baseUrl() {
  return process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://dermacellex-sxip.vercel.app';
}

export async function issueAccessCode(TOKEN, { inquiryId, clientId, contactId, businessName, contactEmail }) {
  const code = String(crypto.randomInt(100000, 1000000));
  const verifyValue = crypto.createHash('sha256').update(`${code}:${inquiryId}`).digest('hex');
  const today = new Date().toISOString().substring(0, 10);

  let sendResult = '미발송';
  let emailError = null;
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (RESEND_KEY && contactEmail) {
    try {
      const magicLink = `${baseUrl()}/?portal_email=${encodeURIComponent(contactEmail)}&portal_code=${code}`;
      await sendEmail(RESEND_KEY, {
        to: contactEmail,
        subject: '[DERMACELLEX] 전용 페이지 접속 코드',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2 style="color:#111">전용 페이지 접속 코드</h2>
            <p>${businessName || '고객'}님, 제조 상담 신청이 접수되었습니다.</p>
            <div style="font-size:32px;font-weight:800;letter-spacing:8px;background:#111;color:#fff;padding:20px;text-align:center;border-radius:12px;margin:20px 0">${code}</div>
            <a href="${magicLink}" style="display:block;text-align:center;background:#EA5C2A;color:#fff;text-decoration:none;font-weight:700;padding:14px;border-radius:12px;margin-bottom:12px">전용 페이지 바로가기</a>
            <p style="color:#888;font-size:13px">위 버튼을 누르면 코드를 직접 입력하지 않아도 바로 접속됩니다. 이 코드는 본인 확인용이며 타인에게 공유하지 마세요.</p>
          </div>
        `,
      });
      sendResult = '발송 성공';
    } catch (e) {
      console.error('메일 발송 실패:', e.message);
      sendResult = '발송 실패';
      emailError = e.message;
    }
  }

  await createPage(TOKEN, DB.ACCESS, {
    '접근권한명': title(`${businessName || '고객'} 전용 페이지 접근`),
    '제조 문의 관리': { relation: [{ id: inquiryId }] },
    ...(clientId ? { '제조 의뢰 거래처': { relation: [{ id: clientId }] } } : {}),
    '의뢰 담당자': { relation: [{ id: contactId }] },
    '코드 표시값': text(code),
    '코드 검증값': text(verifyValue),
    '코드 상태': { status: { name: '진행 중' } },
    '발급일': { date: { start: today } },
    ...(sendResult === '발송 성공' ? { '전송일': { date: { start: today } } } : {}),
    '전송 결과': select(sendResult),
    '활성일': { date: { start: today } },
    '로그인 실패 횟수': { number: 0 },
    '코드 폐기': { checkbox: false },
  });

  return { code, emailSent: sendResult === '발송 성공', emailError };
}
