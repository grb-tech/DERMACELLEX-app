// 진단·고객정보 제출 → 제조사V2 4개 DB에 순서대로 기록
//   제조 의뢰 거래처 → 제조 의뢰 담당자 → 고객 진단 스코어링 → 제조 문의 관리 → (선택) 상담 · 미팅
//
// 2026-09-07 재작성: 예전 코드는 "제조사V1"(옛 워크스페이스) DB에 쓰고 있었음.
// 지금은 기획서(제조사_OS_통합_기획_및_데이터베이스_설계_v1.4)가 지정한 "제조사V2" 16개 DB 기준으로 동작함.
//
// TODO (다음 단계, 이 파일 밖의 작업):
//   - 책임판매업 등록 여부 / 03류 상표 보유 여부는 V2 노션 스키마에 아직 전용 속성이 없어
//     일단 "제조 의뢰 거래처"의 비고(내부참고사항)에 텍스트로 남김. 전용 속성이 추가되면 옮길 것.
//   - 기존 고객 재문의 흐름(고객구분="기존")은 아직 프론트엔드에 없어 항상 "신규"로 저장함.
//   - "제조 문의 관리"의 고유 ID는 지금은 타임스탬프 기반 임시값. 순번 채번 방식으로 나중에 교체 권장.

import { DB, createPage, notionCall, cors, text, title, select, multiSelect } from './_notion.mjs';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(200).json({ status: 'ok', method: req.method });

  const TOKEN = process.env.NOTION_TOKEN;
  if (!TOKEN) return res.status(500).json({ success: false, error: 'NOTION_TOKEN not set' });

  const errors = [];
  let clientPageId = null;
  let inquiryPageId = null;

  try {
    const data = req.body;
    const c = data.customer;
    const raw = data.sectionRaw || {};
    const sc = data.sectionScores || {};
    const svc = data.selectedService || data.recommendedService;
    const mismatch = data.selectedService && data.selectedService !== data.recommendedService;
    const svcVotes = data.svcVotes || {};
    const totalScore = Math.round(data.totalScore || 0);

    const grade = totalScore >= 90 ? 'S' : totalScore >= 80 ? 'A' : totalScore >= 70 ? 'B'
      : totalScore >= 60 ? 'C' : totalScore >= 50 ? 'D' : totalScore >= 40 ? 'E' : 'F';

    const meetDt1 = c.meetingDate1 && c.meetingTime1 ? `${c.meetingDate1}T${c.meetingTime1}:00+09:00` : null;
    const meetDt2Label = c.meetingDate2 && c.meetingTime2 ? `${c.meetingDate2} ${c.meetingTime2}` : null;

    // ─── 1. 제조 의뢰 거래처 ───
    const clientNotes = [
      c.hasTrademark ? `03류 상표: ${c.hasTrademark}` : null,
      c.hasLicense ? `책임판매업: ${c.hasLicense}` : null,
    ].filter(Boolean).join(' / ');

    const clientPage = await createPage(TOKEN, DB.CLIENT, {
      '법인 · 개인명': title(c.businessName),
      '사업자 구분': select(c.businessType),
      '국가': select(c.country),
      '주요 유통국가': multiSelect(c.distributionCountries),
      '거래 상태': { status: { name: '접수' } },
      '비고': text(clientNotes),
    });
    clientPageId = clientPage.id;

    // ─── 2. 제조 의뢰 담당자 ───
    const contactPage = await createPage(TOKEN, DB.CONTACT, {
      '담당자명': title(c.name),
      '연락처': { phone_number: c.phone || null },
      '이메일': { email: c.email || null },
      '거래처명': { relation: [{ id: clientPageId }] },
      '대표 담당자': { checkbox: true },
    });

    // ─── 3. 고객 진단 스코어링 ───
    try {
      const questions = data.questions || [];
      const scoreChildren = [
        { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: '📋 진단 응답 상세' } }] } },
      ];
      if (questions.length > 0) {
        const tableRows = [
          { object: 'block', type: 'table_row', table_row: { cells: [
            [{ type: 'text', text: { content: 'NO' } }],
            [{ type: 'text', text: { content: '섹션' } }],
            [{ type: 'text', text: { content: '질문' } }],
            [{ type: 'text', text: { content: '선택 응답' } }],
            [{ type: 'text', text: { content: '점수' } }],
          ] } },
        ];
        questions.forEach((q, i) => {
          tableRows.push({ object: 'block', type: 'table_row', table_row: { cells: [
            [{ type: 'text', text: { content: `Q${i + 1}` } }],
            [{ type: 'text', text: { content: q.section || '' } }],
            [{ type: 'text', text: { content: (q.question || '').substring(0, 95) } }],
            [{ type: 'text', text: { content: q.selectedText || '' } }],
            [{ type: 'text', text: { content: String(q.score ?? '') } }],
          ] } });
        });
        scoreChildren.push({
          object: 'block', type: 'table', table: {
            table_width: 5, has_column_header: true, has_row_header: false,
            children: tableRows,
          },
        });
      }
      scoreChildren.push(
        { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: '📊 평가 결과' } }] } },
        { object: 'block', type: 'callout', callout: {
          icon: { type: 'emoji', emoji: '🏆' },
          rich_text: [{ type: 'text', text: { content:
            `총점: ${totalScore}점 / 100점\n고객등급: ${grade}\n추천 서비스: ${data.recommendedService}\n희망 서비스: ${svc}${mismatch ? ' ⚠️ 불일치' : ''}`
          } }],
        } },
      );

      await createPage(TOKEN, DB.SCORING, {
        '법인 · 개인명': title(`${c.businessName} 진단`),
        '거래처명': { relation: [{ id: clientPageId }] },
        '총점': { number: totalScore },
        '고객등급': select(grade),
        // V2 스키마는 섹션이 5개가 아니라 4개(사업·브랜드/생산·발주/일정 실행/판매·유통) + 예산·조직으로 재편됨.
        // 기존 20문항의 섹션2(제품·생산)는 대응 항목이 없어 개별 매핑하지 않음 — 총점에는 이미 반영되어 있음.
        '사업 · 브랜드 점수': { number: Math.round(sc[1] || 0) },
        '생산 · 발주 점수': { number: Math.round(sc[3] || 0) },
        '일정 실행 점수': { number: Math.round(sc[4] || 0) },
        '판매 · 유통 점수': { number: Math.round(sc[5] || 0) },
        'OEM적합도': { number: svcVotes.OEM || 0 },
        'ODM적합도': { number: svcVotes.ODM || 0 },
        'OCM적합도': { number: svcVotes.OCM || 0 },
        'OBM적합도': { number: svcVotes.OBM || 0 },
        '추천서비스': select(data.recommendedService),
        '희망서비스': select(svc),
        '제출일': { date: { start: new Date().toISOString().substring(0, 10) } },
      }, scoreChildren);
    } catch (e) {
      errors.push('scoring: ' + e.message);
      console.error('Scoring DB error:', e.message);
    }

    // ─── 4. 제조 문의 관리 (문의 허브 — 이후 의뢰서·상담이 여기에 연결됨) ───
    const inquiryUid = 'INQ-' + Date.now().toString(36).toUpperCase();
    const inquiryPage = await createPage(TOKEN, DB.INQUIRY, {
      '제조 문의명': title(`[${inquiryUid}] ${c.businessName} | 제조개발 문의`),
      '고유 ID': text(inquiryUid),
      '고객구분': select('신규'),
      '문의유형': select('신규개발'),
      '상태': { status: { name: '접수' } },
      '고객 담당자': { relation: [{ id: contactPage.id }] },
    });
    inquiryPageId = inquiryPage.id;

    // ─── 5. 상담 · 미팅 (희망 일정이 있는 경우만) ───
    try {
      if (meetDt1) {
        const preNotes = [
          meetDt2Label ? `2차 희망 일정: ${meetDt2Label}` : null,
          c.inquirySource?.length ? `문의경로: ${c.inquirySource.join(', ')}` : null,
        ].filter(Boolean).join('\n');

        await createPage(TOKEN, DB.MEETING, {
          '미팅명': title(`${c.businessName} 1차 상담`),
          '미팅구분': select('1차 상담'),
          '상태': { status: { name: '일정 제안' } },
          '미팅 일시': { date: { start: meetDt1 } },
          '사전확인사항': text(preNotes),
          '고객 담당자': { relation: [{ id: contactPage.id }] },
          '제조 문의 관리': { relation: [{ id: inquiryPageId }] },
        });
      }
    } catch (e) {
      errors.push('meeting: ' + e.message);
      console.error('Meeting DB error:', e.message);
    }

    // 개발의뢰서 링크는 '제조 문의 관리' 페이지 ID를 기준으로 발급 (devform.mjs가 이 ID로 연결함)
    if (data.willWriteDoc) {
      const BASE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://dermacellex-sxip.vercel.app';
      // '제조 의뢰 거래처'에는 기획개발의뢰서 링크 속성이 없으므로 비고에 덧붙여 담당자가 바로 확인 가능하게 함
      const formUrl = `${BASE_URL}/form?inquiry=${inquiryPageId}`;
      await notionCall(TOKEN, 'PATCH', `/pages/${clientPageId}`, {
        properties: { '비고': text(`${clientNotes}${clientNotes ? ' / ' : ''}개발의뢰서 링크: ${formUrl}`) },
      });
    }

    return res.status(200).json({
      success: true,
      clientId: clientPageId,
      inquiryId: inquiryPageId,
      grade,
      totalScore,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ success: false, error: err.message, clientId: clientPageId, inquiryId: inquiryPageId, partialErrors: errors });
  }
}
