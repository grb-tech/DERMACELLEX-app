// 전용 페이지에서 이미 제출한 제품개발의뢰서를 고치는 엔드포인트.
//
// 담당자가 검토를 시작한 뒤에 내용이 밑에서 바뀌면 안 되므로, 상태가 '시작 전'인 의뢰서만
// 수정할 수 있다(md 문서 13장 9번, 2026-09-09 확정).
//
// 보안: 페이지 ID만으로 수정하게 두면 남의 의뢰서도 고칠 수 있으므로, 전용 페이지 로그인과
// 똑같이 이메일 + 6자리 코드를 검증하고, 그 의뢰서가 검증된 거래처의 것인지까지 확인한다.

import { notionCall, cors, title } from './_notion.mjs';
import { findAccessMatch } from './_access.mjs';
import { buildDevProperties } from './_devform.mjs';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(200).json({ status: 'ok' });

  const TOKEN = process.env.NOTION_TOKEN;
  if (!TOKEN) return res.status(500).json({ success: false, error: 'NOTION_TOKEN not set' });

  try {
    const email = (req.body.email || '').trim();
    const code = (req.body.code || '').trim();
    const { pageId, product } = req.body;

    if (!email || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ success: false, error: '이메일과 6자리 코드를 정확히 입력해주세요.' });
    }
    if (!pageId || !product) {
      return res.status(400).json({ success: false, error: '수정할 의뢰서 정보가 없습니다.' });
    }

    const { rec, clientId } = await findAccessMatch(TOKEN, email, code);
    if (!rec) return res.status(401).json({ success: false, error: '코드가 일치하지 않습니다.' });

    const page = await notionCall(TOKEN, 'GET', `/pages/${pageId}`);
    const ownerId = page.properties?.['제조 의뢰 거래처']?.relation?.[0]?.id;
    if (ownerId !== clientId) {
      return res.status(403).json({ success: false, error: '이 의뢰서를 수정할 권한이 없습니다.' });
    }

    const status = page.properties?.['상태']?.status?.name || '';
    if (status !== '시작 전') {
      return res.status(409).json({ success: false, error: '담당자가 검토를 시작한 의뢰서는 수정할 수 없습니다. 담당자에게 문의해주세요.' });
    }

    await notionCall(TOKEN, 'PATCH', `/pages/${pageId}`, {
      properties: {
        ...(product.productName ? { '제품명/가칭': title(product.productName) } : {}),
        ...buildDevProperties(product),
      },
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('DevForm Update Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
