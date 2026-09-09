// 전용 페이지 알림함에서 "읽음" 처리하는 엔드포인트.
//
// 보안: devform-update.mjs와 동일하게 이메일 + 6자리 코드를 검증하고, 대상 알림이 그
// 거래처 소속인지 확인한 뒤에만 읽음 처리한다. id 하나만 처리하거나(단건), all:true로
// 그 거래처의 안 읽은 알림을 한 번에 처리한다("모두 읽음").

import { DB, notionCall, queryDb, cors } from './_notion.mjs';
import { findAccessMatch } from './_access.mjs';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(200).json({ status: 'ok' });

  const TOKEN = process.env.NOTION_TOKEN;
  if (!TOKEN) return res.status(500).json({ success: false, error: 'NOTION_TOKEN not set' });

  try {
    const email = (req.body.email || '').trim();
    const code = (req.body.code || '').trim();
    const { id, all } = req.body;

    if (!email || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ success: false, error: '이메일과 6자리 코드를 정확히 입력해주세요.' });
    }
    if (!id && !all) {
      return res.status(400).json({ success: false, error: '읽음 처리할 알림 정보가 없습니다.' });
    }

    const { rec, clientId } = await findAccessMatch(TOKEN, email, code);
    if (!rec) return res.status(401).json({ success: false, error: '코드가 일치하지 않습니다.' });

    const now = new Date().toISOString();

    if (all) {
      const unread = await queryDb(TOKEN, DB.NOTIFICATION, {
        and: [
          { property: '제조 의뢰 거래처', relation: { contains: clientId } },
          { property: '고객 페이지 노출', checkbox: { equals: true } },
          { property: '읽음 여부', checkbox: { equals: false } },
        ],
      });
      await Promise.all((unread.results || []).map(p => notionCall(TOKEN, 'PATCH', `/pages/${p.id}`, {
        properties: { '읽음 여부': { checkbox: true }, '읽은 시각': { date: { start: now } } },
      }).catch(() => {})));
      return res.status(200).json({ success: true, count: (unread.results || []).length });
    }

    const page = await notionCall(TOKEN, 'GET', `/pages/${id}`);
    const ownerId = page.properties?.['제조 의뢰 거래처']?.relation?.[0]?.id;
    if (ownerId !== clientId) {
      return res.status(403).json({ success: false, error: '이 알림을 처리할 권한이 없습니다.' });
    }

    await notionCall(TOKEN, 'PATCH', `/pages/${id}`, {
      properties: { '읽음 여부': { checkbox: true }, '읽은 시각': { date: { start: now } } },
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Notify Read Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
