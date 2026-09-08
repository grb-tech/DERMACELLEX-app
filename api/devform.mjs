// 제품개발의뢰서(품목별 N건) 제출 → 📋 제품개발의뢰서 DB(제조사V2)에 기록
//
// 2026-09-08: 06 화면을 md 문서 기준 전체 필드로 확장하면서, 노션에 이미 있던 나머지 속성도
// 모두 프론트(App.jsx의 DEV_FIELD_GROUPS)와 매핑해 함께 쓴다. 아래 목록이 그 전체 매핑이다.

import { DB, createPage, notionCall, cors, text, title, select, multiSelect, url, quantityToBucket } from './_notion.mjs';

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
      };

      // ─── 기본 정보 ───
      if (p.productType) properties['제품카테고리'] = text(p.productType);
      if (p.volume) properties['내용량'] = text(p.volume);
      if (p.targetPrice) properties['목표원가'] = text(p.targetPrice);
      if (p.devType) properties['개발유형'] = select(p.devType);
      if (p.composition) properties['제품구성'] = select(p.composition);
      const bucket = quantityToBucket(p.quantity);
      if (bucket) properties['초도희망수량'] = select(bucket);

      // ─── 효능 · 사용감 ───
      if (p.mainEffect) properties['메인효능'] = select(p.mainEffect);
      if (p.subEffect?.length) properties['서브효능'] = multiSelect(p.subEffect);
      if (p.targetEffect) properties['타겟효능서술'] = text(p.targetEffect);
      if (p.formulation) properties['타겟사용감/제형'] = text(p.formulation);
      if (p.requiredFeel) properties['필수사용감'] = text(p.requiredFeel);
      if (p.gender) properties['타겟성별'] = select(p.gender);
      if (p.ageGroup) properties['타겟연령층'] = select(p.ageGroup);
      if (p.targetSkin) properties['타겟피부'] = text(p.targetSkin);
      if (p.targetSkinDesc) properties['타겟피부서술'] = text(p.targetSkinDesc);
      if (p.finish) properties['마무리감'] = select(p.finish);
      if (p.viscosity) properties['점도텍스처'] = select(p.viscosity);

      // ─── 색상 · 향 · 원료 ───
      if (p.color) properties['내용물색상'] = select(p.color);
      if (p.transparency) properties['내용물투명도'] = select(p.transparency);
      if (p.scent?.length) properties['향'] = multiSelect(p.scent);
      if (p.ph) properties['희망pH'] = select(p.ph);
      if (p.particle) properties['입자고형소재'] = select(p.particle);
      if (p.particleDetail) properties['입자고형상세'] = text(p.particleDetail);
      if (p.ingredients) properties['필수적용원료'] = text(p.ingredients);
      if (p.excludeIngredients) properties['제외희망원료'] = text(p.excludeIngredients);
      if (p.functional) properties['기능성화장품'] = select(p.functional);
      if (p.safety?.length) properties['성분안전성기준'] = multiSelect(p.safety);

      // ─── 포장 · 수출 · 일정 ───
      if (p.packaging) properties['포장형태'] = text(p.packaging);
      if (p.spec) properties['규격'] = text(p.spec);
      if (p.suppliedMaterial) properties['사급부자재'] = text(p.suppliedMaterial);
      if (p.turnkeyMaterial) properties['턴키부자재'] = text(p.turnkeyMaterial);
      if (p.otherMaterialCond) properties['기타부자재조건'] = text(p.otherMaterialCond);
      if (/^https?:\/\//i.test((p.targetContainerUrl || '').trim())) properties['타겟용기URL'] = url(p.targetContainerUrl);
      if (p.countries?.length) properties['판매예정국가'] = multiSelect(p.countries);
      if (p.exportRegs?.length) properties['수출규제기준'] = multiSelect(p.exportRegs);
      if (p.nmpaEffect) properties['NMPA효능'] = text(p.nmpaEffect);
      if (p.certs?.length) properties['인증기준'] = multiSelect(p.certs);
      if (p.countryLimits) properties['국가별제한사항'] = text(p.countryLimits);
      if (p.launchDate) properties['희망런칭일정'] = { date: { start: p.launchDate } };
      if (p.additionalNotes) properties['추가요청사항'] = text(p.additionalNotes);

      // '타겟제품/샘플'은 URL 타입 — http(s)로 시작하지 않으면 URL로 저장하지 않고 추가요청사항에 남긴다
      const referenceIsUrl = /^https?:\/\//i.test((p.reference || '').trim());
      if (referenceIsUrl) {
        properties['타겟제품/샘플'] = url(p.reference);
      } else if (p.reference) {
        const prev = properties['추가요청사항']?.rich_text?.[0]?.text?.content || '';
        properties['추가요청사항'] = text(`${prev}${prev ? '\n\n' : ''}레퍼런스: ${p.reference}`);
      }

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
