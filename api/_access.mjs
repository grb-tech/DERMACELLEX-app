// 전용 페이지 접근 코드 발급 공통 로직 — /api/meeting(신규 문의 시)과 /api/portal-resend(재전송)이 함께 쓴다.
//
// 2026-09-08(2): "거래처당 코드 1개" 정책으로 변경. 예전에는 상담을 신청할 때마다, 혹은 재전송
// 요청마다 새 코드를 발급하고 이전 코드를 폐기했는데, 거래처가 문의를 여러 번 넣을 때마다
// 코드가 계속 바뀌어 관리가 어렵다는 요청에 따라 — 이제 같은 거래처(제조 의뢰 거래처)에 이미
// 폐기되지 않은 코드가 있으면 그 코드를 그대로 재사용하고, 새 문의가 생기면 그 문의만 같은
// 접근 기록에 추가로 연결한다. 코드는 거래처가 살아있는 한 계속 같다 — 재발급(폐기 후 새 코드)
// 기능은 지금은 없다(필요해지면 별도로 추가).
//
// 2026-09-08: 담당자가 노션에서 코드를 평문으로 바로 확인해야 한다는 요청에 따라, '코드 표시값'에
// 마스킹 대신 원본 6자리 코드를 그대로 저장한다(노션은 내부 직원만 접근 가능한 워크스페이스이므로
// 고객에게 노출될 위험은 없다 — 완전한 비공개 저장은 아니라는 점만 감안할 것).
// 검증 해시는 코드+거래처ID 기준(sha256(code:clientId))이라 문의가 몇 건이든 같은 코드로 맞는다.
// 이메일에는 코드와 함께 클릭 한 번으로 로그인되는 "바로가기" 링크도 넣어 직접 입력을 보완한다.

import crypto from 'crypto';
import { DB, createPage, notionCall, queryDb, plain, title, select, text } from './_notion.mjs';
import { sendEmail } from './_email.mjs';

export function baseUrl() {
  return process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://dermacellex-sxip.vercel.app';
}

// 이메일 + 6자리 코드 검증 — 전용 페이지 로그인과 의뢰서 수정이 같은 기준을 쓰도록 한곳에 둔다.
// 원본 코드를 대조하지 않고 sha256(code:거래처ID) 해시로만 맞춘다.
export async function findAccessMatch(TOKEN, email, code) {
  const contacts = await queryDb(TOKEN, DB.CONTACT, { property: '이메일', email: { equals: email } });
  let lastCandidate = null;
  for (const contactPage of (contacts.results || [])) {
    const clientId = contactPage.properties?.['거래처명']?.relation?.[0]?.id;
    if (!clientId) continue;

    const access = await queryDb(TOKEN, DB.ACCESS, {
      and: [
        { property: '제조 의뢰 거래처', relation: { contains: clientId } },
        { property: '코드 폐기', checkbox: { equals: false } },
      ],
    }, [{ timestamp: 'created_time', direction: 'descending' }]);

    const rec = (access.results || [])[0];
    if (!rec) continue;
    lastCandidate = rec;
    const expect = crypto.createHash('sha256').update(`${code}:${clientId}`).digest('hex');
    const stored = plain(rec.properties?.['코드 검증값'], 'text');
    if (stored && stored === expect) return { rec, clientId, contactId: contactPage.id, lastCandidate };
  }
  return { rec: null, lastCandidate };
}

export async function issueAccessCode(TOKEN, { inquiryId, clientId, contactId, businessName, contactEmail }) {
  if (!clientId) throw new Error('issueAccessCode: clientId가 필요합니다.');

  // 이 거래처에 이미 활성 코드가 있으면 재사용한다.
  const existing = await queryDb(TOKEN, DB.ACCESS, {
    and: [
      { property: '제조 의뢰 거래처', relation: { contains: clientId } },
      { property: '코드 폐기', checkbox: { equals: false } },
    ],
  }, [{ timestamp: 'created_time', direction: 'descending' }]);
  const rec = (existing.results || [])[0];
  const reusedCode = rec ? plain(rec.properties?.['코드 표시값'], 'text') : '';

  const code = reusedCode || String(crypto.randomInt(100000, 1000000));
  const verifyValue = crypto.createHash('sha256').update(`${code}:${clientId}`).digest('hex');
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
            <p style="color:#888;font-size:13px">이 코드는 앞으로 새 문의를 넣으셔도 계속 동일하게 쓰실 수 있습니다. 위 버튼을 누르면 코드를 직접 입력하지 않아도 바로 접속됩니다. 본인 확인용이며 타인에게 공유하지 마세요.</p>
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

  if (rec) {
    // 기존 코드 재사용 — 이 문의를 접근 기록에 추가로 연결하고 발송 이력만 갱신한다.
    const linkedInquiries = rec.properties?.['제조 문의 관리']?.relation || [];
    const nextInquiries = inquiryId && !linkedInquiries.some(r => r.id === inquiryId)
      ? [...linkedInquiries, { id: inquiryId }]
      : linkedInquiries;
    await notionCall(TOKEN, 'PATCH', `/pages/${rec.id}`, {
      properties: {
        ...(nextInquiries !== linkedInquiries ? { '제조 문의 관리': { relation: nextInquiries } } : {}),
        '코드 검증값': text(verifyValue), // 예전 문의 단위 해시로 만들어진 기록이면 여기서 거래처 단위로 맞춰준다
        ...(sendResult === '발송 성공' ? { '전송일': { date: { start: today } } } : {}),
        '전송 결과': select(sendResult),
      },
    }).catch(() => {});
  } else {
    await createPage(TOKEN, DB.ACCESS, {
      '접근권한명': title(`${businessName || '고객'} 전용 페이지 접근`),
      ...(inquiryId ? { '제조 문의 관리': { relation: [{ id: inquiryId }] } } : {}),
      '제조 의뢰 거래처': { relation: [{ id: clientId }] },
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
  }

  return { code, emailSent: sendResult === '발송 성공', emailError, reused: !!rec };
}
