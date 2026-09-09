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
// 원료 항목은 노션에 줄바꿈으로 이어 붙여 저장돼 있다 — 앱에서는 다시 줄 단위로 다룬다.
const splitLines = (s) => String(s || '').split('\n').map(v => v.trim()).filter(Boolean);

function mapProductDetail(p) {
  const pr = p.properties || {};
  return {
    id: p.id,
    name: plain(pr['제품명/가칭'], 'title'),
    status: plain(pr['상태'], 'status'),
    itemId: plain(pr['제조 품목'], 'relation')[0] || '',
    productName: plain(pr['제품명/가칭'], 'title'),
    volume: plain(pr['내용량'], 'text'),
    quantity: plain(pr['초도희망수량'], 'number'),
    targetPrice: plain(pr['목표원가'], 'number'),
    devType: plain(pr['개발유형'], 'select'),
    devTypeOther: plain(pr['개발유형(기타)'], 'text'),
    composition: plain(pr['제품구성'], 'select'),
    mainEffect: plain(pr['메인효능'], 'select'),
    subEffect: plain(pr['서브효능'], 'multi_select'),
    targetEffect: plain(pr['타겟효능서술'], 'text'),
    formulation: plain(pr['타겟사용감/제형'], 'text'),
    requiredFeel: plain(pr['필수사용감'], 'text'),
    gender: plain(pr['타겟성별'], 'select'),
    ageGroup: plain(pr['타겟연령층'], 'select'),
    targetSkin: plain(pr['타겟피부'], 'relation'),
    targetSkinDesc: plain(pr['타겟피부서술'], 'text'),
    finish: plain(pr['마무리감'], 'select'),
    finishOther: plain(pr['마무리감(기타)'], 'text'),
    viscosity: plain(pr['점도텍스처'], 'select'),
    viscosityOther: plain(pr['점도텍스처(기타)'], 'text'),
    color: plain(pr['내용물색상'], 'select'),
    colorOther: plain(pr['내용물색상(지정색)'], 'text'),
    transparency: plain(pr['내용물투명도'], 'select'),
    scent: plain(pr['향'], 'multi_select'),
    scentOther: plain(pr['향(지정향)'], 'text'),
    ph: plain(pr['희망pH'], 'select'),
    particle: plain(pr['입자고형소재'], 'select'),
    particleDetail: plain(pr['입자고형상세'], 'text'),
    ingredients: splitLines(plain(pr['필수적용원료'], 'text')),
    excludeIngredients: splitLines(plain(pr['제외희망원료'], 'text')),
    functional: plain(pr['기능성화장품'], 'select'),
    functionalOther: plain(pr['국내 기능성화장품(기타)'], 'text'),
    safety: plain(pr['성분안전성기준'], 'multi_select'),
    packaging: plain(pr['포장형태'], 'text'),
    spec: plain(pr['규격'], 'text'),
    suppliedMaterial: plain(pr['사급부자재'], 'multi_select'),
    turnkeyMaterial: plain(pr['턴키부자재'], 'multi_select'),
    otherMaterialCond: plain(pr['기타부자재조건'], 'text'),
    targetContainerUrl: plain(pr['타겟용기URL'], 'url'),
    reference: plain(pr['타겟제품/샘플'], 'url'),
    countries: plain(pr['판매예정국가'], 'multi_select'),
    countriesOther: plain(pr['판매예정국가(기타)'], 'text'),
    exportRegs: plain(pr['수출규제기준'], 'multi_select'),
    exportRegsOther: plain(pr['수출규제기준(기타)'], 'text'),
    nmpaEffect: plain(pr['NMPA효능'], 'multi_select'),
    certs: plain(pr['인증기준'], 'multi_select'),
    certsOther: plain(pr['인증기준(기타)'], 'text'),
    countryLimits: plain(pr['국가별제한사항'], 'text'),
    launchDate: plain(pr['희망런칭일정'], 'date'),
    additionalNotes: plain(pr['추가요청사항'], 'text'),
  };
}

// 가견적/가견적 항목은 담당자가 Notion에서 확정한 값만 "고객 공개" 체크가 된 것을 그대로
// 보여준다 — 단가·합계 계산 로직은 앱에 두지 않는다.
function mapEstimateHeader(p) {
  const pr = p.properties || {};
  const files = plain(pr['견적서 파일'], 'files');
  return {
    id: p.id,
    name: plain(pr['가견적명'], 'title'),
    uid: plain(pr['가견적 ID'], 'unique_id'),
    version: plain(pr['버전'], 'number'),
    status: plain(pr['상태'], 'select'),
    quoteDate: plain(pr['견적일'], 'date'),
    validUntil: plain(pr['유효기간'], 'date'),
    currency: plain(pr['통화'], 'select'),
    supplyAmount: plain(pr['공급가액'], 'number'),
    taxAmount: plain(pr['세액'], 'number'),
    totalAmount: plain(pr['총액'], 'number'),
    includeNote: plain(pr['포함 조건'], 'text'),
    excludeNote: plain(pr['제외 조건'], 'text'),
    customerNote: plain(pr['고객 안내사항'], 'text'),
    fileUrl: files[0] || '',
  };
}

function mapEstimateItem(p) {
  const pr = p.properties || {};
  return {
    id: p.id,
    estimateIds: plain(pr['제조 가견적'], 'relation'),
    name: plain(pr['견적 항목명'], 'title'),
    type: plain(pr['항목 유형'], 'select'),
    costType: plain(pr['비용 유형'], 'select'),
    quantity: plain(pr['수량'], 'number'),
    unitPrice: plain(pr['단가'], 'number'),
    amount: plain(pr['금액'], 'number'),
    spec: plain(pr['규격·사양'], 'text'),
    sortOrder: plain(pr['정렬 순서'], 'number'),
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
    // 미팅 · 제품개발의뢰서는 문의 1건이 아니라 거래처 전체 기준으로 모은다 — 문의를 여러 번
    // 넣은 거래처도 예전 의뢰서 · 예전 상담까지 전용 페이지에서 전부 보이도록.
    const [meetings, devreqs, clientPage, contactPage, estimateHeaders, estimateItems] = await Promise.all([
      queryDb(TOKEN, DB.MEETING, { property: '제조 의뢰 거래처', relation: { contains: clientId } },
        [{ timestamp: 'created_time', direction: 'descending' }]),
      queryDb(TOKEN, DB.DEVREQUEST, { property: '제조 의뢰 거래처', relation: { contains: clientId } },
        [{ timestamp: 'created_time', direction: 'descending' }]),
      notionCall(TOKEN, 'GET', `/pages/${clientId}`).catch(() => null),
      notionCall(TOKEN, 'GET', `/pages/${contactId}`).catch(() => null),
      // 가견적은 담당자가 "고객 공개"를 체크한 것만 보여준다 — 작성 중인 초안은 노출하지 않는다.
      queryDb(TOKEN, DB.ESTIMATE, {
        and: [
          { property: '제조 의뢰 거래처', relation: { contains: clientId } },
          { property: '고객 공개', checkbox: { equals: true } },
        ],
      }, [{ timestamp: 'created_time', direction: 'descending' }]),
      queryDb(TOKEN, DB.ESTIMATE_ITEM, {
        and: [
          { property: '제조 의뢰 거래처', relation: { contains: clientId } },
          { property: '고객 공개', checkbox: { equals: true } },
        ],
      }, [{ property: '정렬 순서', direction: 'ascending' }]),
    ]);

    const latestMeeting = (meetings.results || [])[0];

    // 가견적 항목을 소속 가견적(헤더) ID별로 묶는다.
    const itemsByEstimate = {};
    for (const itemPage of (estimateItems.results || [])) {
      const mapped = mapEstimateItem(itemPage);
      for (const eid of mapped.estimateIds) {
        (itemsByEstimate[eid] ||= []).push(mapped);
      }
    }
    const estimates = (estimateHeaders.results || []).map(h => {
      const header = mapEstimateHeader(h);
      const items = (itemsByEstimate[h.id] || []).map(({ estimateIds, ...rest }) => rest);
      return { ...header, items };
    });

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
      estimates,
    });
  } catch (err) {
    console.error('Portal Login Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
