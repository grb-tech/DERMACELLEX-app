// 전용 페이지 로그인 — 이메일 + 6자리 코드로 인증한다. 코드를 이메일로 보내므로 로그인도
// 같은 이메일을 기준으로 맞췄다(md 문서 13장 "고객 인증 방식"은 아직 미확정 사항으로 남아있음).
//
// 2026-09-08(2): 코드가 "거래처당 1개"로 바뀌면서, 인증도 문의 단위가 아니라 거래처 단위로
// 한다 — 이메일로 담당자를 찾고, 그 담당자가 속한 거래처의 활성 코드와 대조한다(해시는
// sha256(code:거래처ID)). 로그인에 성공하면 그 거래처의 가장 최근 문의를 대시보드에 보여준다.
// 원본 코드를 저장하지 않으므로 후보마다 같은 방식으로 해시를 다시 계산해 대조한다.

import crypto from 'crypto';
import { DB, notionCall, queryDb, plain, cors } from './_notion.mjs';

// 제품개발의뢰서 상세를 고객이 직접 확인할 수 있도록, 프론트(App.jsx의 DEV_FIELD_GROUPS)와
// 같은 키로 전체 속성을 돌려준다. 값이 없는 필드는 프론트에서 알아서 숨긴다.
function mapProductDetail(p) {
  const pr = p.properties || {};
  return {
    name: plain(pr['제품명/가칭'], 'title'),
    status: plain(pr['상태'], 'status'),
    productName: plain(pr['제품명/가칭'], 'title'),
    volume: plain(pr['내용량'], 'text'),
    quantity: plain(pr['초도희망수량'], 'select'),
    targetPrice: plain(pr['목표원가'], 'text'),
    devType: plain(pr['개발유형'], 'select'),
    composition: plain(pr['제품구성'], 'select'),
    mainEffect: plain(pr['메인효능'], 'select'),
    subEffect: plain(pr['서브효능'], 'multi_select'),
    targetEffect: plain(pr['타겟효능서술'], 'text'),
    formulation: plain(pr['타겟사용감/제형'], 'text'),
    requiredFeel: plain(pr['필수사용감'], 'text'),
    gender: plain(pr['타겟성별'], 'select'),
    ageGroup: plain(pr['타겟연령층'], 'select'),
    targetSkin: plain(pr['타겟피부'], 'text'),
    targetSkinDesc: plain(pr['타겟피부서술'], 'text'),
    finish: plain(pr['마무리감'], 'select'),
    viscosity: plain(pr['점도텍스처'], 'select'),
    color: plain(pr['내용물색상'], 'select'),
    transparency: plain(pr['내용물투명도'], 'select'),
    scent: plain(pr['향'], 'multi_select'),
    ph: plain(pr['희망pH'], 'select'),
    particle: plain(pr['입자고형소재'], 'select'),
    particleDetail: plain(pr['입자고형상세'], 'text'),
    ingredients: plain(pr['필수적용원료'], 'text'),
    excludeIngredients: plain(pr['제외희망원료'], 'text'),
    functional: plain(pr['기능성화장품'], 'select'),
    safety: plain(pr['성분안전성기준'], 'multi_select'),
    packaging: plain(pr['포장형태'], 'text'),
    spec: plain(pr['규격'], 'text'),
    suppliedMaterial: plain(pr['사급부자재'], 'text'),
    turnkeyMaterial: plain(pr['턴키부자재'], 'text'),
    otherMaterialCond: plain(pr['기타부자재조건'], 'text'),
    targetContainerUrl: plain(pr['타겟용기URL'], 'url'),
    reference: plain(pr['타겟제품/샘플'], 'url'),
    countries: plain(pr['판매예정국가'], 'multi_select'),
    exportRegs: plain(pr['수출규제기준'], 'multi_select'),
    nmpaEffect: plain(pr['NMPA효능'], 'text'),
    certs: plain(pr['인증기준'], 'multi_select'),
    countryLimits: plain(pr['국가별제한사항'], 'text'),
    launchDate: plain(pr['희망런칭일정'], 'date'),
    additionalNotes: plain(pr['추가요청사항'], 'text'),
  };
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(200).json({ status: 'ok' });

  const TOKEN = process.env.NOTION_TOKEN;
  if (!TOKEN) return res.status(500).json({ success: false, error: 'NOTION_TOKEN not set' });

  try {
    const email = (req.body.email || '').trim();
    const code = (req.body.code || '').trim();
    if (!email || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ success: false, error: '이메일과 6자리 코드를 정확히 입력해주세요.' });
    }

    const contacts = await queryDb(TOKEN, DB.CONTACT, { property: '이메일', email: { equals: email } });
    const contactList = contacts.results || [];
    if (contactList.length === 0) {
      return res.status(401).json({ success: false, error: '일치하는 정보를 찾을 수 없습니다.' });
    }

    let matched = null;
    let lastCandidate = null;
    for (const contactPage of contactList) {
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
      if (stored && stored === expect) { matched = { rec, clientId, contactId: contactPage.id }; break; }
    }

    const today = new Date().toISOString().substring(0, 10);

    if (!matched) {
      if (lastCandidate) {
        const fails = (lastCandidate.properties?.['로그인 실패 횟수']?.number || 0) + 1;
        await notionCall(TOKEN, 'PATCH', `/pages/${lastCandidate.id}`, {
          properties: { '로그인 실패 횟수': { number: fails } },
        }).catch(() => {});
      }
      return res.status(401).json({ success: false, error: '코드가 일치하지 않습니다.' });
    }

    await notionCall(TOKEN, 'PATCH', `/pages/${matched.rec.id}`, {
      properties: { '마지막 접속일': { date: { start: today } } },
    }).catch(() => {});

    const { clientId, contactId } = matched;

    // 이 거래처의 가장 최근 문의를 대시보드에 보여준다(문의가 여러 건이어도 코드는 하나뿐).
    const inquiries = await queryDb(TOKEN, DB.INQUIRY, { property: '제조 의뢰 거래처', relation: { contains: clientId } },
      [{ timestamp: 'created_time', direction: 'descending' }]);
    const inquiryPage = (inquiries.results || [])[0];
    if (!inquiryPage) {
      return res.status(404).json({ success: false, error: '연결된 문의 내역을 찾을 수 없습니다.' });
    }
    const inquiryId = inquiryPage.id;

    const [meetings, devreqs, clientPage, contactPage] = await Promise.all([
      queryDb(TOKEN, DB.MEETING, { property: '제조 문의 관리', relation: { contains: inquiryId } },
        [{ timestamp: 'created_time', direction: 'descending' }]),
      queryDb(TOKEN, DB.DEVREQUEST, { property: '제조 문의 관리', relation: { contains: inquiryId } }),
      notionCall(TOKEN, 'GET', `/pages/${clientId}`).catch(() => null),
      notionCall(TOKEN, 'GET', `/pages/${contactId}`).catch(() => null),
    ]);

    const latestMeeting = (meetings.results || [])[0];

    // '제조 문의명'은 "[INQ-xxx] 회사명 | 제조개발 문의" 형태라 고유 ID · 회사명과 겹친다 —
    // 둘 다 이미 화면에 따로 나오니, 마지막 " | " 뒤쪽(문의 유형)만 표시용으로 뽑아 쓴다.
    const rawInquiryName = plain(inquiryPage.properties?.['제조 문의명'], 'title');
    const inquiryDisplayName = rawInquiryName.includes('|')
      ? rawInquiryName.split('|').pop().trim()
      : rawInquiryName;

    return res.status(200).json({
      success: true,
      inquiry: {
        name: inquiryDisplayName,
        uid: plain(inquiryPage.properties?.['고유 ID'], 'text'),
        status: plain(inquiryPage.properties?.['상태'], 'status'),
      },
      client: {
        id: clientId,
        name: clientPage ? plain(clientPage.properties?.['법인 · 개인명'], 'title') : '',
      },
      contact: {
        id: contactId,
        name: contactPage ? plain(contactPage.properties?.['담당자명'], 'title') : '',
      },
      meeting: latestMeeting ? {
        status: plain(latestMeeting.properties?.['상태'], 'status'),
        wish1: plain(latestMeeting.properties?.['희망 미팅일1'], 'date'),
        wish2: plain(latestMeeting.properties?.['희망 미팅일2'], 'date'),
        confirmed: plain(latestMeeting.properties?.['미팅 확정일'], 'date'),
        zoomLink: plain(latestMeeting.properties?.['ZOOM Link'], 'url'),
      } : null,
      products: (devreqs.results || []).map(mapProductDetail),
    });
  } catch (err) {
    console.error('Portal Login Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
