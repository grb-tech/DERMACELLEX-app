// 전용 페이지 로그인 — 이메일 + 6자리 코드로 인증한다. 코드를 이메일로 보내므로 로그인도
// 같은 이메일을 기준으로 맞췄다(md 문서 13장 "고객 인증 방식"은 아직 미확정 사항으로 남아있음).
//
// 원본 코드를 저장하지 않으므로, 후보 접근 이력마다 같은 방식(sha256(code:제조문의ID))으로
// 해시를 다시 계산해 '코트 검증값'과 비교하는 방식으로 검증한다.

import crypto from 'crypto';
import { DB, notionCall, queryDb, plain, cors } from './_notion.mjs';

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
    const contactIds = (contacts.results || []).map(p => p.id);
    if (contactIds.length === 0) {
      return res.status(401).json({ success: false, error: '일치하는 정보를 찾을 수 없습니다.' });
    }

    let matched = null;
    let lastCandidate = null;
    for (const contactId of contactIds) {
      const access = await queryDb(TOKEN, DB.ACCESS, {
        and: [
          { property: '의뢰 담당자', relation: { contains: contactId } },
          { property: '코드 폐기', checkbox: { equals: false } },
        ],
      }, [{ timestamp: 'created_time', direction: 'descending' }]);

      for (const rec of access.results || []) {
        const inquiryId = rec.properties?.['제조 문의 관리']?.relation?.[0]?.id;
        if (!inquiryId) continue;
        lastCandidate = rec;
        const expect = crypto.createHash('sha256').update(`${code}:${inquiryId}`).digest('hex');
        const stored = plain(rec.properties?.['코트 검증값'], 'text');
        if (stored && stored === expect) { matched = { rec, inquiryId }; break; }
      }
      if (matched) break;
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

    const inquiryId = matched.inquiryId;
    const inquiryPage = await notionCall(TOKEN, 'GET', `/pages/${inquiryId}`);
    const meetings = await queryDb(TOKEN, DB.MEETING,
      { property: '제조 문의 관리', relation: { contains: inquiryId } },
      [{ timestamp: 'created_time', direction: 'descending' }]);
    const devreqs = await queryDb(TOKEN, DB.DEVREQUEST,
      { property: '제조 문의 관리', relation: { contains: inquiryId } });

    const latestMeeting = (meetings.results || [])[0];

    return res.status(200).json({
      success: true,
      inquiry: {
        name: plain(inquiryPage.properties?.['제조 문의명'], 'title'),
        status: plain(inquiryPage.properties?.['상태'], 'status'),
      },
      meeting: latestMeeting ? {
        status: plain(latestMeeting.properties?.['상태'], 'status'),
        wish1: plain(latestMeeting.properties?.['희망 미팅일1'], 'date'),
        wish2: plain(latestMeeting.properties?.['희망 미팅일2'], 'date'),
        confirmed: plain(latestMeeting.properties?.['미팅 확정일'], 'date'),
        zoomLink: plain(latestMeeting.properties?.['ZOOM Link'], 'url'),
      } : null,
      products: (devreqs.results || []).map(p => ({
        name: plain(p.properties?.['제품명/가칭'], 'title'),
        status: plain(p.properties?.['상태'], 'status'),
      })),
    });
  } catch (err) {
    console.error('Portal Login Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
