// 코드를 못 받았거나 잃어버린 고객을 위한 재전송. 이메일만 입력받는다.
//
// 2026-09-08(2): "거래처당 코드 1개" 정책으로 바뀌면서 이 엔드포인트는 더 이상 코드를 폐기하고
// 새로 만들지 않는다 — issueAccessCode가 거래처에 이미 있는 코드를 그대로 찾아 같은 코드를
// 다시 이메일로 보내주기만 한다(회사 내 다른 담당자가 같은 이메일로 조회해도 항상 같은 코드).
// 등록된 이메일이 아니어도 같은 성공 메시지를 돌려줘 이메일 등록 여부가 외부에 노출되지 않게 한다.

import { DB, notionCall, queryDb, plain, cors } from './_notion.mjs';
import { issueAccessCode } from './_access.mjs';

const GENERIC_OK = { success: true, message: '등록된 이메일이면 코드를 보내드렸습니다.' };

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
    const contactPage = (contacts.results || [])[0];
    if (!contactPage) return res.status(200).json(GENERIC_OK);

    const clientId = contactPage.properties?.['거래처명']?.relation?.[0]?.id;
    if (!clientId) return res.status(200).json(GENERIC_OK);

    const clientPage = await notionCall(TOKEN, 'GET', `/pages/${clientId}`).catch(() => null);
    const businessName = clientPage ? plain(clientPage.properties?.['법인 · 개인명'], 'title') : '';

    await issueAccessCode(TOKEN, { clientId, contactId: contactPage.id, businessName, contactEmail: email });

    return res.status(200).json(GENERIC_OK);
  } catch (err) {
    console.error('Portal Resend Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
