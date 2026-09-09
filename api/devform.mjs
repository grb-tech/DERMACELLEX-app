// 제품개발의뢰서(품목별 N건) 제출 → 📋 제품개발의뢰서 DB(제조사V2)에 기록
//
// 2026-09-08: 06 화면을 md 문서 기준 전체 필드로 확장하면서, 노션에 이미 있던 나머지 속성도
// 모두 프론트(App.jsx의 DEV_FIELD_GROUPS)와 매핑해 함께 쓴다. 아래 목록이 그 전체 매핑이다.

import { DB, createPage, notionCall, cors, text, title } from './_notion.mjs';
import { buildDevProperties, joinLines } from './_devform.mjs';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(200).json({ status: 'ok' });

  const TOKEN = process.env.NOTION_TOKEN;
  if (!TOKEN) return res.status(500).json({ success: false, error: 'NOTION_TOKEN not set' });

  try {
    // inquiryId: '제조 문의 관리' 페이지 ID. 예전 링크 형식(clientId)도 당분간 함께 받아준다.
    const { inquiryId, clientId, products } = req.body;
    const linkedInquiryId = inquiryId || clientId;
    if (!linkedInquiryId) {
      return res.status(400).json({ success: false, error: 'inquiryId가 없습니다. /form?inquiry=<제조 문의 관리 페이지 ID> 로 접속해주세요.' });
    }
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ success: false, error: '제품 정보가 없습니다.' });
    }

    // 제조사V2의 모든 DB는 "제조 의뢰 거래처"와 직접 관계를 맺어야 하므로, 문의 페이지에
    // 이미 연결된 거래처를 그대로 가져와 의뢰서에도 함께 연결한다.
    let linkedClientId = null;
    try {
      const inquiryPage = await notionCall(TOKEN, 'GET', `/pages/${linkedInquiryId}`);
      linkedClientId = inquiryPage.properties?.['제조 의뢰 거래처']?.relation?.[0]?.id || null;
    } catch (e) {
      console.error('거래처 조회 실패:', e.message);
    }

    const createdPages = [];

    for (const p of products) {
      const properties = {
        '제품명/가칭': title(p.productName),
        '제조 문의 관리': { relation: [{ id: linkedInquiryId }] },
        '상태': { status: { name: '시작 전' } },
        ...(linkedClientId ? { '제조 의뢰 거래처': { relation: [{ id: linkedClientId }] } } : {}),
        ...(p.itemId ? { '제조 품목': { relation: [{ id: p.itemId }] } } : {}),
        ...buildDevProperties(p),
      };

      const children = [];
      const ingredientLines = joinLines(p.ingredients);
      if (ingredientLines) {
        children.push(
          { object: 'block', type: 'heading_3', heading_3: { rich_text: [{ type: 'text', text: { content: '🧪 주요 성분 요청' } }] } },
          { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: ingredientLines } }] } },
        );
      }
      if (p.packaging) {
        children.push(
          { object: 'block', type: 'heading_3', heading_3: { rich_text: [{ type: 'text', text: { content: '📦 패키지 / 용기' } }] } },
          { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: p.packaging } }] } },
        );
      }
      if (p.reference) {
        children.push(
          { object: 'block', type: 'heading_3', heading_3: { rich_text: [{ type: 'text', text: { content: '🔗 레퍼런스' } }] } },
          { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: p.reference } }] } },
        );
      }
      if (p.additionalNotes) {
        children.push(
          { object: 'block', type: 'heading_3', heading_3: { rich_text: [{ type: 'text', text: { content: '📝 추가 요청사항' } }] } },
          { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: p.additionalNotes } }] } },
        );
      }

      const page = await createPage(TOKEN, DB.DEVREQUEST, properties, children);
      createdPages.push({ id: page.id, url: page.url, name: p.productName });
    }

    return res.status(200).json({ success: true, pages: createdPages, count: createdPages.length });
  } catch (err) {
    console.error('DevForm Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
