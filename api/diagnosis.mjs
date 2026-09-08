// 03~04 진단·결과 화면 제출 → 02에서 이미 만든 거래처(clientId)에 진단 스코어링을 연결한다.
// 고객에게는 점수·등급을 절대 보여주지 않는다 — 이 응답은 화면에 그대로 노출하지 말 것
// (기획서 4장 "고객 진단으로 계산된 서비스 적합도는 내부 후보값" 원칙).

import { DB, createPage, cors, title, select, multiSelect } from './_notion.mjs';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(200).json({ status: 'ok' });

  const TOKEN = process.env.NOTION_TOKEN;
  if (!TOKEN) return res.status(500).json({ success: false, error: 'NOTION_TOKEN not set' });

  try {
    const data = req.body;
    const { clientId, businessName } = data;
    if (!clientId) return res.status(400).json({ success: false, error: 'clientId가 없습니다. 먼저 /api/register를 호출해주세요.' });

    const raw = data.sectionRaw || {};
    const sc = data.sectionScores || {};
    const svc = data.selectedService || data.recommendedService;
    const mismatch = data.selectedService && data.selectedService !== data.recommendedService;
    const svcVotes = data.svcVotes || {};
    const totalScore = Math.round(data.totalScore || 0);
    const grade = totalScore >= 90 ? 'S' : totalScore >= 80 ? 'A' : totalScore >= 70 ? 'B'
      : totalScore >= 60 ? 'C' : totalScore >= 50 ? 'D' : totalScore >= 40 ? 'E' : 'F';

    // 위험 플래그 — 담당자 내부 검토용. 명시된 계산식이 없어 준비도가 낮음을 시사하는
    // 신호들을 모아 구성한다. 고객 화면에는 절대 노출하지 않는다.
    const riskFlags = [];
    if (totalScore < 40) riskFlags.push('준비도 낮음');
    if (data.hasTrademark === '미보유') riskFlags.push('상표 미보유');
    if (data.hasLicense === '미등록') riskFlags.push('책임판매업 미등록');
    if (mismatch) riskFlags.push('희망서비스 불일치');
    if ((data.questions || []).some(q => q.isKey && Number(q.score) === 0)) riskFlags.push('핵심 역량 부족');

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
      // 20문항 5개 섹션(사업·브랜드/제품·생산/생산·발주/프로젝트 실행/판매·협업)을
      // 노션의 5개 점수 속성에 1:1로 매핑한다. "일정 실행"은 섹션2(제품·생산: 출시 순서·일정
      // 문항 포함)에, "예산·조직"은 섹션4(프로젝트 실행: 예산·조직·의사결정 문항)에 대응시켰다.
      '사업 · 브랜드 점수': { number: Math.round(sc[1] || 0) },
      '일정 실행 점수': { number: Math.round(sc[2] || 0) },
      '생산 · 발주 점수': { number: Math.round(sc[3] || 0) },
      '예산 · 조직 점수': { number: Math.round(sc[4] || 0) },
      '판매 · 유통 점수': { number: Math.round(sc[5] || 0) },
      // 프로젝트 준비도: 별도 산식이 확정되기 전까지는 총점을 그대로 반영한다.
      '프로젝트 준비도': { number: totalScore },
      '위험 플래그': multiSelect(riskFlags),
      'OEM적합도': { number: svcVotes.OEM || 0 },
      'ODM적합도': { number: svcVotes.ODM || 0 },
      'OCM적합도': { number: svcVotes.OCM || 0 },
      'OBM적합도': { number: svcVotes.OBM || 0 },
      '추천서비스': select(data.recommendedService),
      '희망서비스': select(svc),
      '제출일': { date: { start: new Date().toISOString().substring(0, 10) } },
    }, scoreChildren);

    return res.status(200).json({ success: true, grade, totalScore });
  } catch (err) {
    console.error('Diagnosis Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
