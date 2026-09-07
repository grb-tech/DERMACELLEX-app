// 03~04 진단·결과 화면 제출 → 02에서 이미 만든 거래처(clientId)에 진단 스코어링을 연결한다.
// 고객에게는 점수·등급을 절대 보여주지 않는다 — 이 응답은 화면에 그대로 노출하지 말 것
// (기획서 4장 "고객 진단으로 계산된 서비스 적합도는 내부 후보값" 원칙).

import { DB, createPage, notionCall, cors, text, title, select } from './_notion.mjs';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(200).json({ status: 'ok' });

  const TOKEN = process.env.NOTION_TOKEN;
  if (!TOKEN) return res.status(500).json({ success: false, error: 'NOTION_TOKEN not set' });

  try {
    const data = req.body;
    const { clientId, inquiryId, businessName } = data;
    if (!clientId) return res.status(400).json({ success: false, error: 'clientId가 없습니다. 먼저 /api/register를 호출해주세요.' });

    const raw = data.sectionRaw || {};
    const sc = data.sectionScores || {};
    const svc = data.selectedService || data.recommendedService;
    const mismatch = data.selectedService && data.selectedService !== data.recommendedService;
    const svcVotes = data.svcVotes || {};
    const totalScore = Math.round(data.totalScore || 0);
    const grade = totalScore >= 90 ? 'S' : totalScore >= 80 ? 'A' : totalScore >= 70 ? 'B'
      : totalScore >= 60 ? 'C' : totalScore >= 50 ? 'D' : totalScore >= 40 ? 'E' : 'F';

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
        object: 'block', type: 'table', table: { table_width: 5, has_column_header: true, has_row_header: false, children: tableRows },
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
      '법인 · 개인명': title(`${businessName || '고객'} 진단`),
      '거래처명': { relation: [{ id: clientId }] },
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

    // 개발의뢰서를 작성하기로 한 경우, 거래처 비고에 의뢰서 작성 링크를 남겨 담당자가 바로 전달할 수 있게 한다.
    // (제품 개발의뢰서 05·06 화면이 아직 없어, 당분간은 담당자가 이 링크를 고객에게 직접 안내한다.)
    if (data.willWriteDoc && inquiryId) {
      const BASE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://dermacellex-sxip.vercel.app';
      const formUrl = `${BASE_URL}/form?inquiry=${inquiryId}`;
      const clientPage = await notionCall(TOKEN, 'GET', `/pages/${clientId}`);
      const prevNote = clientPage.properties?.['비고']?.rich_text?.map(t => t.plain_text).join('') || '';
      await notionCall(TOKEN, 'PATCH', `/pages/${clientId}`, {
        properties: { '비고': text(`${prevNote}${prevNote ? ' / ' : ''}개발의뢰서 링크: ${formUrl}`) },
      });
    }

    return res.status(200).json({ success: true, grade, totalScore });
  } catch (err) {
    console.error('Diagnosis Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
