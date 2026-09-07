// 02 고객 정보 등록 화면 제출 → 진단 이전에 거래처 · 담당자 · 제조 문의를 먼저 생성한다.
// (제조사 OS 앱.dc.html 기준: 02번 화면은 "진단 전 1회 입력"이며, 여기서 만들어진
//  제조 문의 관리 페이지 ID가 이후 진단·미팅·개발의뢰서를 모두 연결하는 허브가 된다.)
//
// 2026-09-07: "제조 의뢰 거래처"에 대표자명 · 03류 상표 · 화장품책임판매업 · 문의 경로
// 속성이 정식으로 추가되어, 더 이상 비고에 텍스트로 욱여넣지 않고 실제 속성에 저장한다.

import { DB, createPage, cors, text, title, select, multiSelect } from './_notion.mjs';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(200).json({ status: 'ok' });

  const TOKEN = process.env.NOTION_TOKEN;
  if (!TOKEN) return res.status(500).json({ success: false, error: 'NOTION_TOKEN not set' });

  try {
    const c = req.body.customer || {};
    if (!c.businessName || !c.name) {
      return res.status(400).json({ success: false, error: '회사명과 담당자명은 필수입니다.' });
    }

    // ─── 1. 제조 의뢰 거래처 ───
    const clientPage = await createPage(TOKEN, DB.CLIENT, {
      '법인 · 개인명': title(c.businessName),
      '사업자 구분': select(c.businessType),
      '국가': select(c.country),
      '주요 유통국가': multiSelect(c.distributionCountries),
      '거래 상태': { status: { name: '접수' } },
      '대표자명': text(c.ceoName),
      '03류 상표': select(c.hasTrademark),
      '화장품책임판매업': select(c.hasLicense),
      '문의 경로': select(c.inquirySource),
    });

    // ─── 2. 제조 의뢰 담당자 ───
    const contactPage = await createPage(TOKEN, DB.CONTACT, {
      '담당자명': title(c.name),
      '연락처': { phone_number: c.phone || null },
      '이메일': { email: c.email || null },
      '부서': text(c.department),
      '직책': text(c.position),
      '거래처명': { relation: [{ id: clientPage.id }] },
      '대표 담당자': { checkbox: true },
    });

    // ─── 3. 제조 문의 관리 (문의 허브 — 이후 진단·의뢰서·상담이 여기에 연결됨) ───
    const inquiryUid = 'INQ-' + Date.now().toString(36).toUpperCase();
    const inquiryPage = await createPage(TOKEN, DB.INQUIRY, {
      '제조 문의명': title(`[${inquiryUid}] ${c.businessName} | 제조개발 문의`),
      '고유 ID': text(inquiryUid),
      '고객구분': select('신규'),
      '문의유형': select('신규개발'),
      '상태': { status: { name: '접수' } },
      '고객 담당자': { relation: [{ id: contactPage.id }] },
    });

    return res.status(200).json({
      success: true,
      clientId: clientPage.id,
      contactId: contactPage.id,
      inquiryId: inquiryPage.id,
      inquiryUid,
    });
  } catch (err) {
    console.error('Register Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
