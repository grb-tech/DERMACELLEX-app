// 코드를 못 받았거나 잃어버린 고객을 위한 재발급. 이메일만 입력받는다 — 원본 코드를 절대
// 노션에 저장하지 않는 정책(md 문서 "고객 페이지 접근 이력" 보안 기준)이라 담당자도 기존 코드를
// 조회해서 알려줄 방법이 없고, 재발급이 유일한 복구 경로다.
//
// 기존 활성 코드는 폐기 처리하고 새 코드를 발급 · 발송한다. 등록된 이메일이 아니어도 같은
// 성공 메시지를 돌려줘 이메일 등록 여부가 외부에 노출되지 않게 한다.

import { DB, notionCall, queryDb, plain, cors } from './_notion.mjs';
import { issueAccessCode } from './_access.mjs';

const GENERIC_OK = { success: true, message: '등록된 이메일이면 코드가 재발송됩니다.' };

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(200).json({ status: 'ok' });

  const TOKEN = process.env.NOTION_TOKEN;
  if (!TOKEN) return res.status(500).json({ success: false, error: 'NOTION_TOKEN not set' });

  try {
    const email = (req.body.email || '').trim();
    if (!email) return res.status(400).json({ success: false, error: '이메일을 입력해주세요.' });

    const contacts = await queryDb(TOKEN, DB.CONTACT, { property: '이메일', email: { equals: email } });
    const contactIds = (contacts.results || []).map(p => p.id);
    if (contactIds.length === 0) return res.status(200).json(GENERIC_OK);

    for (const contactId of contactIds) {
      const access = await queryDb(TOKEN, DB.ACCESS, {
        and: [
          { property: '의뢰 담당자', relation: { contains: contactId } },
          { property: '코드 폐기', checkbox: { equals: false } },
        ],
      }, [{ timestamp: 'created_time', direction: 'descending' }]);

      const latest = (access.results || [])[0];
      if (!latest) continue;

      const inquiryId = latest.properties?.['제조 문의 관리']?.relation?.[0]?.id;
      const clientId = latest.properties?.['제조 의뢰 거래처']?.relation?.[0]?.id;
      if (!inquiryId) continue;

      await notionCall(TOKEN, 'PATCH', `/pages/${latest.id}`, {
        properties: { '코드 폐기': { checkbox: true } },
      });

      const businessName = plain(latest.properties?.['접근권한명'], 'title').replace(' 전용 페이지 접근', '');
      await issueAccessCode(TOKEN, { inquiryId, clientId, contactId, businessName, contactEmail: email });
      break; // 한 번에 하나의 이메일만 재발송한다(여러 문의가 있어도 메일이 중복 발송되지 않게)
    }

    return res.status(200).json(GENERIC_OK);
  } catch (err) {
    console.error('Portal Resend Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
