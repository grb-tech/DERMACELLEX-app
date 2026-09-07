// 제품개발의뢰서(품목별 N건) 제출 → 📋 제품개발의뢰서 DB(제조사V2)에 기록
//
// 2026-09-07 재작성: 예전 코드가 쓰던 DB(383987733a9f4dbca74ca3a960d02f69)는 지금의
// 제품개발의뢰서와 속성명이 전혀 달라 실제로는 저장이 400 오류로 실패하고 있었음.
// 지금은 노션에서 직접 확인한 실제 스키마(총 49개 속성) 기준으로 정확한 속성명·타입에 맞춰 씀.
//
// TODO (다음 단계): 지금 프론트엔드(DevRequestForm) 폼은 11개 필드만 수집함.
// 기획서 기준 고객 입력 43개 항목 중 아래는 노션 DB에는 이미 있지만 화면에는 아직 없음 —
// 05/06 화면을 확장할 때 함께 추가할 것:
//   타겟성별, 타겟연령층, 메인효능, 서브효능, 내용물색상, 내용물투명도, 점도텍스처, 마무리감,
//   향, 희망pH, 입자고형소재, 입자고형상세, 판매예정국가, 수출규제기준, 인증기준, 성분안전성기준,
//   국가별제한사항, 제외희망원료, 기능성화장품, 개발유형, 제품구성, 규격, 사급부자재, 턴키부자재,
//   기타부자재조건, 타겟피부, 타겟피부서술, 타겟용기URL, NMPA효능, 희망런칭일정

import { DB, createPage, cors, text, title, select, url, quantityToBucket } from './_notion.mjs';

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

    const createdPages = [];

    for (const p of products) {
      const properties = {
        '제품명/가칭': title(p.productName),
        '제조 문의 관리': { relation: [{ id: linkedInquiryId }] },
        '상태': { status: { name: '시작 전' } },
      };

      if (p.productType) properties['제품카테고리'] = text(p.productType);
      if (p.volume) properties['내용량'] = text(p.volume);
      if (p.targetPrice) properties['목표원가'] = text(p.targetPrice);
      if (p.formulation) properties['타겟사용감/제형'] = text(p.formulation);
      if (p.targetEffect) properties['타겟효능서술'] = text(p.targetEffect);
      if (p.ingredients) properties['필수적용원료'] = text(p.ingredients);
      if (p.packaging) properties['포장형태'] = text(p.packaging);

      const bucket = quantityToBucket(p.quantity);
      if (bucket) properties['초도희망수량'] = select(bucket);

      // '타겟제품/샘플'은 URL 타입 — http(s)로 시작하지 않으면 URL로 저장하지 않고 추가요청사항에 남긴다
      const referenceIsUrl = /^https?:\/\//i.test((p.reference || '').trim());
      if (referenceIsUrl) properties['타겟제품/샘플'] = url(p.reference);

      const extraNotes = [
        p.additionalNotes || '',
        !referenceIsUrl && p.reference ? `레퍼런스: ${p.reference}` : '',
      ].filter(Boolean).join('\n\n');
      if (extraNotes) properties['추가요청사항'] = text(extraNotes);

      const children = [];
      if (p.ingredients) {
        children.push(
          { object: 'block', type: 'heading_3', heading_3: { rich_text: [{ type: 'text', text: { content: '🧪 주요 성분 요청' } }] } },
          { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: p.ingredients } }] } },
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
