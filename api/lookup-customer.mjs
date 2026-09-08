// 08 기존 고객 재문의 화면 — md 문서 3.3절 "기존 고객 흐름" 1번 항목("등록된 담당자로
// 기존 고객을 확인한다")을 구현한다. 이메일로 "제조 의뢰 담당자"를 찾고, 거래처 · 과거 문의
// 이력 · 간단한 통계를 함께 돌려준다. 못 찾으면 found:false만 주고 신규 등록 흐름을 그대로 탄다.

import { DB, notionCall, queryDb, plain, cors } from './_notion.mjs';

const ACTIVE_STATUSES = new Set(['접수', '상담', '견적', '계약', '프로젝트 전환', '보완', '보류']);

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(200).json({ status: 'ok' });

  const TOKEN = process.env.NOTION_TOKEN;
  if (!TOKEN) return res.status(500).json({ success: false, error: 'NOTION_TOKEN not set' });

  try {
    const email = (req.body.email || '').trim();
    if (!email) return res.status(200).json({ success: true, found: false });

    const contacts = await queryDb(TOKEN, DB.CONTACT, { property: '이메일', email: { equals: email } });
    const contactPage = (contacts.results || [])[0];
    if (!contactPage) return res.status(200).json({ success: true, found: false });

    const clientId = contactPage.properties?.['거래처명']?.relation?.[0]?.id;
    if (!clientId) return res.status(200).json({ success: true, found: false });

    const [clientPage, inquiries, devreqs] = await Promise.all([
      notionCall(TOKEN, 'GET', `/pages/${clientId}`),
      queryDb(TOKEN, DB.INQUIRY, { property: '제조 의뢰 거래처', relation: { contains: clientId } },
        [{ timestamp: 'created_time', direction: 'descending' }]),
      queryDb(TOKEN, DB.DEVREQUEST, { property: '제조 의뢰 거래처', relation: { contains: clientId } }),
    ]);

    const inquiryList = inquiries.results || [];
    const activeCount = inquiryList.filter(p => ACTIVE_STATUSES.has(plain(p.properties?.['상태'], 'status'))).length;
    const shippedCount = (devreqs.results || []).filter(p => plain(p.properties?.['상태'], 'status') === '완료').length;

    return res.status(200).json({
      success: true,
      found: true,
      client: { id: clientId, name: plain(clientPage.properties?.['법인 · 개인명'], 'title') },
      contact: {
        id: contactPage.id,
        name: plain(contactPage.properties?.['담당자명'], 'title'),
        department: plain(contactPage.properties?.['부서'], 'text'),
        position: plain(contactPage.properties?.['직책'], 'text'),
      },
      stats: {
        totalInquiries: inquiryList.length,
        activeProjects: activeCount,
        shippedProducts: shippedCount,
      },
      history: inquiryList.slice(0, 10).map(p => ({
        uid: plain(p.properties?.['고유 ID'], 'text'),
        status: plain(p.properties?.['상태'], 'status'),
        type: plain(p.properties?.['문의유형'], 'select'),
        createdAt: p.created_time,
      })),
    });
  } catch (err) {
    console.error('Lookup Customer Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
