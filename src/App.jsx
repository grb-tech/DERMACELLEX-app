import { useState, useEffect, useRef, useCallback } from "react";
import AdminApp from "./Admin.jsx";
import { LangProvider, LangToggle, useLang } from "./i18n.jsx";

// ━━━━━━━━━━ DESIGN TOKENS (DERMACELLEX Palette) ━━━━━━━━━━
const C = {
  bg: "#F7F7F7", surface: "#FFFFFF", surfaceAlt: "#F0F0F0",
  border: "#E4E4E4", borderLight: "#ECECEC",
  text: "#1A1A1A", textSub: "#6B6B6B", textMuted: "#9E9E9E",
  primary: "#434343", accent: "#EA5C2A", accentLight: "#FFF0EB", accentDark: "#C94A1E",
  success: "#10B981", error: "#EF4444", white: "#FFFFFF", black: "#000000",
  disabled: "#D1D5DB", disabledBg: "#F3F4F6",
  gradStart: "#EA5C2A", gradEnd: "#FF8A5C",
};

const FONT = "'Pretendard', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif";
const FONT_URL = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css";

// ━━━━━━━━━━ SERVICES ━━━━━━━━━━
// 제조사 OS 앱.dc.html 04번 화면 스크립트의 SVC 상수 그대로 사용
const SVC = {
  OEM: {
    code: "OEM", full: "Original Equipment Manufacturing",
    head: "기획은 준비됐나요?\n이제 제품으로 만들 차례입니다.",
    desc: "확정된 제품 기획과 기준을 바탕으로 생산부터 충진 · 포장까지 완제품으로 구현합니다.",
    cust: "확정된 제품기획, 처방 · 벌크 또는 생산 기준, 부자재 기준",
    hq: "합의 범위의 생산 · 충진 · 포장. 처방 제공 또는 부자재 소싱 범위는 계약에서 확정",
    req: "03류 상표 + 화장품책임판매업 등록 필수",
  },
  ODM: {
    code: "ODM", full: "Original Design Manufacturing",
    head: "원하는 제품만 알려주세요.\n개발부터 생산까지 함께합니다.",
    desc: "제품의 방향을 바탕으로 기획 · 처방 개발부터 부자재 소싱과 생산까지 연결합니다.",
    cust: "제품개발의뢰서, 목표 제품 · 수량 · 일정 · 예산",
    hq: "제품기획 지원, 큐카드 스튜디오 · 상세페이지 기획, R&D 처방, 기존 · 신규 · 고객 소싱 부자재 핸들링",
    req: "03류 상표 보유 또는 출원 예정",
  },
  OCM: {
    code: "OCM", full: "Original Concept Management",
    head: "제품만 만드는 것이 아니라,\n보이는 모습까지 완성합니다.",
    desc: "제품 기획과 처방 개발부터 패키지 · 콘텐츠 디자인까지 시장에 선보이기 위한 제품을 완성합니다.",
    cust: "제품개발의뢰서, 제품 콘셉트 · 디자인 · 스토리보드 기초자료",
    hq: "ODM 범위와 함께 라벨 · 단상자 · 용기 적용 · 패키지 시안 · 상세페이지 · 브로슈어 · 카탈로그 등 디자인 업무",
    req: "제한 없음",
  },
  OBM: {
    code: "OBM", full: "Original Brand Manufacturing",
    head: "제품을 넘어,\n브랜드를 만듭니다.",
    desc: "브랜드 전략과 아이덴티티부터 제품 포트폴리오, 디자인과 마케팅 방향까지 함께 설계합니다.",
    cust: "제품개발의뢰서, 브랜드개발의뢰서, 사업 목표와 시장 · 타깃 자료",
    hq: "R&D · 부자재 소싱과 함께 BI · CI · 브랜드 가이드 · 컬러 · 아이덴티티 · 홈페이지 · SNS 방향, 패키지 · 콘텐츠 디자인, 브랜드 매니지먼트",
    req: "제한 없음",
  },
};

// ━━━━━━━━━━ 인트로 히어로: "WHY DERMACELLEX" 통계 (제조사 OS 앱.dc.html 01번 화면 기준) ━━━━━━━━━━
// num/unit은 AnimNum이 그대로 파싱해 카운트업 애니메이션을 돌리므로(콤마 제거 후 parseInt),
// 언어별로 숫자 표기 자체가 달라지는 항목(예: "1,800만원" → "18M")은 en 쪽 값을 따로 둔다.
const HERO_STATS = [
  { num: "110", unit: "개+", numEn: "110", unitEn: "+", label: "체크 요소", labelEn: "Checkpoints" },
  { num: "180", unit: "일+", numEn: "180", unitEn: "+ days", label: "기획~출시", labelEn: "Plan to Launch" },
  { num: "1,800", unit: "만+", numEn: "18", unitEn: "M+ KRW", label: "투입 비용", labelEn: "Investment" },
];

// ━━━━━━━━━━ 20 QUESTIONS (Spreadsheet-based) ━━━━━━━━━━
const QUESTIONS = [
  // ── Section 1: 사업·브랜드 (Q1-Q4, raw max 19→ 15pt) ──
  {
    id: "Q1", section: "사업·브랜드", sectionNum: 1,
    question: "현재 화장품 관련 사업은 어느 단계인가요?",
    options: [
      { text: "사업을 처음 준비하고 있습니다", score: 1, svcHint: "OBM" },
      { text: "브랜드 론칭을 준비하고 있습니다", score: 2, svcHint: "OCM" },
      { text: "자체 브랜드를 운영하고 있습니다", score: 3, svcHint: "ODM" },
      { text: "화장품 제조·유통 사업을 운영하고 있습니다", score: 4, svcHint: "OEM" },
    ],
  },
  {
    id: "Q2", section: "사업·브랜드", sectionNum: 1,
    question: "현재 운영하거나 준비 중인 자체 브랜드가 있으신가요?",
    isKey: "brand",
    options: [
      { text: "아직 없습니다", score: 0 },
      { text: "브랜드 콘셉트를 기획 중입니다", score: 1 },
      { text: "브랜드명과 방향이 확정되어 있습니다", score: 2 },
      { text: "상표 출원·등록이 완료되어 있습니다", score: 4 },
      { text: "자체 브랜드를 운영하고 있습니다", score: 5 },
    ],
  },
  {
    id: "Q3", section: "사업·브랜드", sectionNum: 1,
    question: "현재 판매 중인 화장품 제품은 어느 정도인가요?",
    options: [
      { text: "없음", score: 0 },
      { text: "1~4개", score: 1 },
      { text: "5~9개", score: 2 },
      { text: "10~19개", score: 4 },
      { text: "20개 이상", score: 5 },
    ],
  },
  {
    id: "Q4", section: "사업·브랜드", sectionNum: 1,
    question: "화장품을 개발하거나 생산해 본 경험은 어느 정도인가요?",
    isKey: "experience",
    options: [
      { text: "처음 진행합니다", score: 0, svcHint: "OBM" },
      { text: "샘플 개발 경험이 있습니다", score: 1, svcHint: "OCM" },
      { text: "제품 출시 경험이 있습니다", score: 2, svcHint: "ODM" },
      { text: "지속적인 생산 경험이 있습니다", score: 4, svcHint: "OEM" },
      { text: "다품목을 정기적으로 생산·발주하고 있습니다", score: 5, svcHint: "OEM" },
    ],
  },

  // ── Section 2: 제품·생산 (Q5-Q9, raw→ 25pt) ──
  {
    id: "Q5", section: "제품·생산", sectionNum: 2,
    question: "이번 프로젝트에서 개발 또는 생산을 희망하는 제품은 몇 개인가요?",
    options: [
      { text: "1~4개", score: 1 },
      { text: "5~9개", score: 2 },
      { text: "10~14개", score: 3 },
      { text: "15~20개", score: 4 },
      { text: "21개 이상", score: 5 },
    ],
  },
  {
    id: "Q6", section: "제품·생산", sectionNum: 2,
    question: "개발 또는 생산하려는 제품 목록은 어느 정도 정리되어 있나요?",
    options: [
      { text: "아직 아이디어 단계입니다", score: 0 },
      { text: "제품군만 정해져 있습니다", score: 1 },
      { text: "일부 제품이 정해져 있습니다", score: 2 },
      { text: "절반 이상 정해져 있습니다", score: 4 },
      { text: "대부분의 제품이 확정되어 있습니다", score: 5 },
    ],
  },
  {
    id: "Q7", section: "제품·생산", sectionNum: 2,
    question: "제품별 제형·용량·주요 효능 등 제품 사양은 어느 정도 준비되어 있나요?",
    isKey: "specs",
    options: [
      { text: "대부분 미정입니다", score: 0 },
      { text: "일부만 정리되어 있습니다", score: 1 },
      { text: "약 절반 정도 정리되어 있습니다", score: 2 },
      { text: "대부분 정리되어 있습니다", score: 4 },
      { text: "전체적으로 구체화되어 있습니다", score: 5 },
    ],
  },
  {
    id: "Q8", section: "제품·생산", sectionNum: 2,
    question: "제품별 목표 가격과 판매 조건은 어느 정도 준비되어 있나요?",
    options: [
      { text: "아직 미정입니다", score: 0 },
      { text: "목표 소비자가만 검토했습니다", score: 1 },
      { text: "주요 제품의 가격대가 정해져 있습니다", score: 2 },
      { text: "공급가·소비자가가 대부분 정해져 있습니다", score: 4 },
      { text: "제조원가·가격·판매채널까지 구체화되어 있습니다", score: 5 },
    ],
  },
  {
    id: "Q9", section: "제품·생산", sectionNum: 2,
    question: "여러 제품의 출시 순서와 우선순위가 정해져 있나요?",
    options: [
      { text: "아직 정해지지 않았습니다", score: 0 },
      { text: "전체 동시 출시를 고려하고 있습니다", score: 1 },
      { text: "일부 주력 제품만 정해져 있습니다", score: 2 },
      { text: "단계별 출시를 계획하고 있습니다", score: 4 },
      { text: "단계별 제품과 일정이 구체적으로 확정되어 있습니다", score: 5 },
    ],
  },

  // ── Section 3: 생산·발주 (Q10-Q12, raw max 15→ 20pt) ──
  {
    id: "Q10", section: "생산·발주", sectionNum: 3,
    question: "개별 제품의 예상 초도 생산수량은 어느 정도인가요?",
    options: [
      { text: "아직 정하지 않았습니다", score: 0 },
      { text: "3,000개 미만", score: 1 },
      { text: "3,000~4,999개", score: 2 },
      { text: "5,000~9,999개", score: 4 },
      { text: "10,000개 이상", score: 5 },
    ],
  },
  {
    id: "Q11", section: "생산·발주", sectionNum: 3,
    question: "제품별 최소 생산수량(MOQ)에 대해서는 어떻게 생각하시나요?",
    options: [
      { text: "아직 검토하지 않았습니다", score: 0 },
      { text: "최대한 소량 생산을 희망합니다", score: 1 },
      { text: "제품별 협의를 희망합니다", score: 2 },
      { text: "일반적인 제조 MOQ를 수용할 수 있습니다", score: 4 },
      { text: "제품 특성에 맞춰 생산수량을 조정할 수 있습니다", score: 5 },
    ],
  },
  {
    id: "Q12", section: "생산·발주", sectionNum: 3,
    question: "이번 제품 외에 추가적인 제품 개발 또는 라인업 확장 계획이 있으신가요?",
    options: [
      { text: "현재는 없습니다", score: 0 },
      { text: "출시·판매 결과에 따라 검토할 예정입니다", score: 1 },
      { text: "추가 개발을 검토 중인 제품이 있습니다", score: 2 },
      { text: "복수의 라인업 개발을 계획하고 있습니다", score: 4 },
      { text: "지속적인 제품 확대 및 연간 개발을 계획하고 있습니다", score: 5 },
    ],
  },

  // ── Section 4: 프로젝트 실행 (Q13-Q15, raw→ 15pt) ──
  {
    id: "Q13", section: "프로젝트 실행", sectionNum: 4,
    question: "이번 프로젝트의 전체 예상 예산은 어느 정도인가요?",
    options: [
      { text: "아직 검토 중입니다", score: 0 },
      { text: "5천만원 미만", score: 1 },
      { text: "5천만원~1억원", score: 2 },
      { text: "1억~3억원", score: 4 },
      { text: "3억원 이상", score: 5 },
    ],
  },
  {
    id: "Q14", section: "프로젝트 실행", sectionNum: 4,
    question: "이번 프로젝트를 담당할 담당자 또는 팀이 구성되어 있나요?",
    options: [
      { text: "아직 정해지지 않았습니다", score: 0 },
      { text: "대표자가 직접 담당합니다", score: 1 },
      { text: "실무 담당자가 있습니다", score: 2 },
      { text: "전담 담당자가 있습니다", score: 4 },
      { text: "관련 부서가 역할을 나누어 운영합니다", score: 5 },
    ],
  },
  {
    id: "Q15", section: "프로젝트 실행", sectionNum: 4,
    question: "프로젝트의 최종 의사결정은 어떻게 이루어지나요?",
    options: [
      { text: "아직 정해지지 않았습니다", score: 0 },
      { text: "외부 파트너·투자자 협의가 필요합니다", score: 1 },
      { text: "팀장·부서 책임자가 결정합니다", score: 2 },
      { text: "임원·경영진이 결정합니다", score: 4 },
      { text: "대표자·오너가 직접 결정합니다", score: 5 },
    ],
  },

  // ── Section 5: 판매·협업 (Q16-Q20, raw→ 15pt) ──
  {
    id: "Q16", section: "판매·협업", sectionNum: 5,
    question: "제품 출시를 희망하는 시기는 언제인가요?",
    options: [
      { text: "아직 정하지 않았습니다", score: 0 },
      { text: "3개월 이내", score: 1 },
      { text: "4~6개월 이내", score: 2 },
      { text: "7~12개월 이내", score: 4 },
    ],
  },
  {
    id: "Q17", section: "판매·협업", sectionNum: 5,
    question: "주요 판매 채널은 어떻게 계획하고 계신가요?",
    options: [
      { text: "아직 정하지 않았습니다", score: 0 },
      { text: "자사몰 위주로 시작할 계획입니다", score: 1 },
      { text: "온라인 마켓플레이스를 활용할 계획입니다", score: 2 },
      { text: "온·오프라인 복합 채널을 운영할 계획입니다", score: 4 },
      { text: "기존 유통 채널이 확보되어 있습니다", score: 5 },
    ],
  },
  {
    id: "Q18", section: "판매·협업", sectionNum: 5,
    question: "해외 판매 계획이 있으신가요?",
    options: [
      { text: "국내 시장에만 집중할 계획입니다", score: 1 },
      { text: "해외 진출을 검토 중입니다", score: 2 },
      { text: "해외 진출을 구체적으로 준비하고 있습니다", score: 4 },
      { text: "이미 해외 바이어·채널이 있습니다", score: 5 },
    ],
  },
  {
    id: "Q19", section: "판매·협업", sectionNum: 5,
    question: "제품의 처방(포뮬러/레시피)을 보유하고 계신가요?",
    isKey: "formula",
    options: [
      { text: "어떤 제품이 좋을지 추천받고 싶습니다", score: 0, svcHint: "OBM" },
      { text: "원하는 제형·텍스처 정도만 정해져 있습니다", score: 1, svcHint: "OCM" },
      { text: "기본 컨셉은 있으나 처방 개발이 필요합니다", score: 2, svcHint: "ODM" },
      { text: "완성된 처방을 보유하고 있습니다", score: 5, svcHint: "OEM" },
    ],
  },
  {
    id: "Q20", section: "판매·협업", sectionNum: 5,
    question: "이번 프로젝트에서 가장 필요한 지원은 무엇인가요?",
    isKey: "scope",
    options: [
      { text: "생산(충진·포장)만 필요합니다", score: 5, svcHint: "OEM" },
      { text: "제품 개발 + 생산이 필요합니다", score: 4, svcHint: "ODM" },
      { text: "기획 + 디자인 + 개발 + 생산이 필요합니다", score: 2, svcHint: "OCM" },
      { text: "브랜드 론칭부터 전체 관리가 필요합니다", score: 1, svcHint: "OBM" },
    ],
  },
];

// ── Section weights ──
const SECTION_WEIGHTS = {
  1: { maxRaw: 19, scaled: 15, label: "사업·브랜드", guide: "사업자와 브랜드 준비 상태를 확인합니다" },
  2: { maxRaw: 25, scaled: 25, label: "제품·생산", guide: "개발할 제품이 얼마나 구체화되었는지 확인합니다" },
  3: { maxRaw: 15, scaled: 20, label: "생산·발주", guide: "생산 수량과 발주 계획을 확인합니다" },
  4: { maxRaw: 15, scaled: 15, label: "프로젝트 실행", guide: "예산 · 담당 조직 · 의사결정 구조를 확인합니다" },
  5: { maxRaw: 24, scaled: 15, label: "판매·협업", guide: "출시 일정과 판매 채널을 확인합니다" },
};

// 07 상담 일정 화면 — 09:00~18:00, 30분 단위 시간 옵션
const TIME_SLOTS = Array.from({ length: 19 }, (_, i) => {
  const h = 9 + Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return h >= 18 && m === "30" ? null : `${String(h).padStart(2, "0")}:${m}`;
}).filter(Boolean);

// 노션 "상담 · 미팅" DB의 '미팅 확정일'에 이미 값이 있는 슬롯(담당자가 확정한 일정)은
// 고객이 같은 날짜 · 시간을 다시 희망 일정으로 고르지 못하게 막는다.
function isSlotBooked(bookedList, dateStr, timeStr) {
  if (!dateStr || !timeStr) return false;
  return (bookedList || []).some(iso => {
    if (!iso || iso.slice(0, 10) !== dateStr) return false;
    if (iso.length <= 10) return true; // 시간 없이 날짜만 확정된 경우 그 날 전체를 막는다
    return iso.slice(11, 16) === timeStr;
  });
}

// 한국 법정 공휴일(대체공휴일 포함, 2026~2027) — 주말과 겹치는 날짜는 요일 검사로 이미 걸러지므로
// 평일에 해당하는 날짜만 담았다. 해마다(특히 설날 · 추석 · 부처님오신날 등 음력 기준 공휴일) 갱신이 필요하다.
const KR_HOLIDAYS = new Set([
  "2026-01-01", "2026-02-16", "2026-02-17", "2026-02-18", "2026-03-02",
  "2026-05-01", "2026-05-05", "2026-05-25", "2026-08-17",
  "2026-09-24", "2026-09-25", "2026-10-05", "2026-10-09", "2026-12-25",
  "2027-01-01", "2027-02-08", "2027-02-09", "2027-03-01",
  "2027-05-05", "2027-05-13", "2027-08-16",
  "2027-09-14", "2027-09-15", "2027-09-16", "2027-10-04", "2027-10-11", "2027-12-27",
]);
function isWeekendOrHoliday(dateStr) {
  if (!dateStr) return false;
  const dow = new Date(`${dateStr}T00:00:00`).getDay();
  return dow === 0 || dow === 6 || KR_HOLIDAYS.has(dateStr);
}

const COUNTRIES = [
  "대한민국", "미국", "일본", "중국", "베트남", "태국", "인도네시아",
  "말레이시아", "필리핀", "싱가포르", "호주", "캐나다", "영국", "독일",
  "프랑스", "UAE", "사우디아라비아", "러시아", "브라질", "멕시코", "기타",
];

// ━━━━━━━━━━ UTILITY COMPONENTS ━━━━━━━━━━
function AnimNum({ value, suffix = "" }) {
  const [display, setDisplay] = useState("0");
  const ref = useRef(null);
  const [go, setGo] = useState(false);
  useEffect(() => {
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setGo(true); }, { threshold: 0.5 });
    if (ref.current) o.observe(ref.current);
    return () => o.disconnect();
  }, []);
  useEffect(() => {
    if (!go) return;
    const num = parseInt(value.replace(/,/g, ""), 10);
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / 1400, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.floor(num * e).toLocaleString());
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [go, value]);
  return <span ref={ref}>{display}{suffix}</span>;
}

// 02 고객 정보 등록 등 카드형 화면의 입력 필드 라벨 래퍼.
// (컴포넌트를 화면 함수 안쪽에 정의하면 매 렌더링마다 새로 생성되어, 그 안의 <input>이
//  타이핑할 때마다 통째로 리마운트되며 포커스를 잃는다 — 그래서 반드시 모듈 최상단에 둔다.)
function UField({ label, req, hint, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#8A8A8E", display: "flex", gap: 4 }}>
          {label}{req && <span style={{ color: C.accent }}>*</span>}
        </div>
        {hint && <div style={{ fontSize: 11.5, fontWeight: 600, color: "#B0B0B4", lineHeight: 1.45 }}>{hint}</div>}
      </div>
      {children}
    </div>
  );
}

// 06 기획개발의뢰서 — 항목 순서와 안내 문구는 제조사OS 구글시트 3번 시트("제품개발의뢰서")를,
// 선택지 목록은 노션 "📋 제품개발의뢰서" 스키마를 정본으로 삼는다(시트에만 있는 옵션은 넣지 않는다).
// 화면은 시트와 같은 7개 섹션으로 나누고, 각 필드는 공용 DevField 렌더러 하나로 그린다.
const EFFECT_OPTIONS = ["미백", "홍조", "색소침착", "피부톤(밝기)", "피부톤(투명)", "광채", "진정(수딩)", "장벽개선", "리페어", "수분보습", "쿨링", "재생", "주름(탄력)", "볼륨(리프팅)", "항산화", "모공(피부결)", "피부두께", "유분조절", "커버", "노폐물제거"];
// 부자재 32종 — 노션 옵션의 색상이 곧 분류라, 같은 묶음끼리 모아 한 번만 보여준다.
const MATERIAL_GROUPS = [
  { title: "용기 · 튜브 · 파우치", items: ["용기(인쇄)", "용기(라벨)", "튜브(인쇄)", "파우치(인쇄)", "파우치(라벨)"] },
  { title: "단상자 · 완충재", items: ["단상자(하단접착형)", "단상자(십자조립형)", "단상자(맞뚜껑형)", "단상자(날개형)", "단상자(슬리브형)", "PET단상자(하단접착형)", "완충재(단상자용)"] },
  { title: "싸바리", items: ["싸바리(상하분리형)", "싸바리(일체형)", "싸바리(하단형)"] },
  { title: "내부포장재", items: ["내부포장재(간지)", "내부포장재(EVA)", "내부포장재(EVA상단종이)"] },
  { title: "필름 · 포장구조재 · 실링", items: ["필름(수축필름)", "포장구조재(슬리브)", "포장구조재(빠킹)", "실링(고주파)"] },
  { title: "라벨 · 스티커 · 인쇄물", items: ["라벨(개봉방지형)", "라벨(정품인증QR)", "스티커(봉합용)", "인쇄물(설명서)"] },
  { title: "지지대", items: ["지지대(플라스틱)", "지지대(종이)", "지지대(종이합지)"] },
  { title: "박스", items: ["박스(인박스)", "박스(아웃박스)"] },
  { title: "도구", items: ["도구(스패출러)"] },
];
const EXPORT_REG_OPTIONS = ["한국MFDS", "중국NMPA", "일본PMDA", "미국MoCRA", "유럽CPNP", "캐나다(CNF)", "대만(TFDA)", "영국(SCPN)", "베트남(DAV)", "호주(AICIS)", "필리핀(FDA)", "인도(CDSCO)", "사우디(SFDA)", "뉴질랜드(EPA)", "싱가포르(HSA)", "태국(Thai FDA)", "브라질(ANVISA)", "말레이시아(NPRA)", "인도네시아(BPOM)", "아랍에미리트(UAE)", "기타"];
const NMPA_OPTIONS = ["해당없음", "여드름제거/祛痘", "유분조절/控油", "청결/清洁", "각질제거/去角质", "영양공급/滋养", "메이크업리무버/卸妆", "보습/保湿", "진정/舒缓", "리페어/修护", "주름개선/抗皱", "타이트닝/紧致", "기미제거미백(특수)/祛斑美白（特殊）", "자외선차단(특수)/防晒（特殊）", "민감피부사용가능/敏感肌可用"];
const DEV_FIELD_GROUPS = [
  {
    title: "제품 기본정보",
    fields: [
      { key: "composition", label: "제품 구성", type: "select", options: ["단품", "패키지"], hint: "단품 또는 세트 구성 여부를 선택해 주세요." },
      { key: "productName", label: "제품명 / 가칭", type: "text", req: true, hint: "확정 전이라면 임시 제품명을 입력해 주세요." },
      { key: "productType", label: "제품 카테고리", type: "text", hint: "선택하신 제조 품목에서 자동으로 채워집니다. 다르면 직접 고쳐 주세요." },
      { key: "volume", label: "내용량", type: "text", placeholder: "예: 50ml", hint: "제품 1개 기준 희망 용량을 입력해 주세요." },
      { key: "spec", label: "규격", type: "text", placeholder: "예: 2ea", hint: "패키지 내 총 구성 수량을 입력해 주세요." },
      {
        key: "devType", label: "개발 유형", type: "select", hint: "원하는 개발 방식을 선택해 주세요.",
        options: ["신규 제형 개발", "기존 제형 응용", "타겟 제품 벤치마킹", "기존 제품 리뉴얼", "기타"],
        otherKey: "devTypeOther", otherWhen: "기타", otherLabel: "개발 유형 직접 작성",
      },
      { key: "quantity", label: "초도 희망수량", type: "number", placeholder: "예: 3000", unit: "개", hint: "첫 생산 시 예상·희망 수량을 입력해 주세요." },
      { key: "launchDate", label: "희망 런칭 일정", type: "date", hint: "출시를 목표로 하는 시점을 선택해 주세요." },
      { key: "targetPrice", label: "목표 원가", type: "number", placeholder: "예: 3000", unit: "원", hint: "완제품 1개 기준 희망 생산단가를 입력해 주세요. 부자재를 포함한 금액입니다." },
    ],
  },
  {
    title: "개발 콘셉트",
    fields: [
      { key: "reference", label: "타겟 제품 / 샘플", type: "url", hint: "참고할 제품명 또는 URL을 입력해 주세요." },
      { key: "formulation", label: "타겟 사용감 / 제형", type: "text", hint: "원하는 제형과 사용감을 작성해 주세요." },
      { key: "targetSkin", label: "타겟 피부", type: "skin", hint: "주요 사용 대상의 피부 고민을 선택해 주세요." },
      { key: "targetSkinDesc", label: "타겟 피부 서술", type: "textarea", hint: "선택한 피부 고민에 대해 추가로 고려할 사항이 있다면 작성해 주세요." },
      { key: "gender", label: "타겟 성별", type: "select", options: ["남성", "여성", "남녀공용"], hint: "주요 사용 대상의 성별을 선택해 주세요." },
      { key: "ageGroup", label: "타겟 연령층", type: "select", options: ["10~20대", "20~30대", "30~40대", "40대 이상", "전 연령"], hint: "주요 사용 대상의 연령대를 선택해 주세요." },
      { key: "mainEffect", label: "메인 효능", type: "select", options: EFFECT_OPTIONS, hint: "가장 중요하게 강조할 효능을 하나 선택해 주세요." },
      { key: "subEffect", label: "서브 효능", type: "multiselect", options: EFFECT_OPTIONS, max: 2, hint: "함께 구현하고 싶은 보조 효능을 최대 2개까지 선택해 주세요." },
      { key: "targetEffect", label: "타겟 효능 서술", type: "textarea", hint: "선택한 효능에 대해 추가로 구현하고 싶은 사항을 작성해 주세요." },
    ],
  },
  {
    title: "개발 처방기준",
    fields: [
      {
        key: "functional", label: "국내 기능성화장품 적용 여부", type: "select", hint: "한국 판매 시 적용을 원하는 기능성화장품 기준을 선택해 주세요.",
        options: ["비기능성", "미백", "주름개선", "자외선차단", "여드름성피부완화", "미백+주름개선", "미백+주름+자외선차단", "기타"],
        otherKey: "functionalOther", otherWhen: "기타", otherLabel: "희망하는 기능성 기준",
      },
      { key: "ingredients", label: "필수 적용 원료", type: "list", placeholder: "원료명 / 희망 함량 또는 ppm", hint: "반드시 포함하길 희망하는 원료와 함량을 작성해 주세요. + 를 눌러 여러 개를 추가할 수 있습니다." },
      { key: "excludeIngredients", label: "제외 희망 원료", type: "list", placeholder: "원료명 또는 성분 기준", hint: "사용을 원하지 않는 성분을 작성해 주세요." },
      { key: "safety", label: "성분 안전성 기준", type: "multiselect", options: ["PEG FREE", "20가지 주의성분 FREE", "알러지유발성분 FREE", "인공향료 FREE", "인공색소 FREE", "효능위주", "해당없음"], hint: "적용을 원하는 성분 배제 기준을 선택해 주세요." },
      { key: "ph", label: "희망 pH", type: "select", options: ["산성(3.0~4.5)", "약산성(4.5~6.5)", "중성(6.5~7.5)", "약알칼리성(7.5~9.0)", "강알칼리성(9.0이상)", "사용감에따라적용"], hint: "원하는 pH 기준을 선택해 주세요." },
      {
        key: "certs", label: "인증 기준", type: "multiselect", hint: "필요한 인증 기준을 선택해 주세요.",
        options: ["Vegan", "COSMOS NATURAL", "COSMOS ORGANIC", "HALAL", "USDA Organic", "해당없음", "기타"],
        otherKey: "certsOther", otherWhen: "기타", otherLabel: "필요한 인증 직접 작성",
      },
    ],
  },
  {
    title: "내용물 상세 사양",
    fields: [
      { key: "transparency", label: "내용물 투명도", type: "select", options: ["투명", "반투명", "불투명", "제조사제안"], hint: "원하는 내용물의 투명도를 선택해 주세요." },
      { key: "particle", label: "입자 · 고형 소재 적용", type: "select", options: ["미적용", "비드", "캡슐", "스크럽입자", "소금슈가", "허브식물분말", "꽃잎식물조각", "제조사제안", "기타"], hint: "내용물에 추가할 입자 또는 고형 소재를 선택해 주세요." },
      { key: "particleDetail", label: "입자 · 고형 소재 상세", type: "text", hint: "원하는 종류 · 색상 · 크기 · 함량 등을 작성해 주세요.", showIf: f => f.particle && f.particle !== "미적용" },
      {
        key: "color", label: "내용물 색상", type: "select", hint: "원하는 내용물 색상을 선택해 주세요.",
        options: ["무색", "백색", "원료고유색", "지정색", "제조사제안"],
        otherKey: "colorOther", otherWhen: "지정색", otherLabel: "지정 색상",
      },
      {
        key: "scent", label: "향", type: "multiselect", hint: "원하는 향의 유무와 강도를 선택해 주세요.",
        options: ["무향저취", "천연향료", "합성향료", "블렌딩", "지정향", "은은", "보통", "강함", "제조사제안"],
        otherKey: "scentOther", otherWhen: "지정향", otherLabel: "지정 향",
      },
      {
        key: "viscosity", label: "점도 / 텍스처", type: "select", hint: "원하는 내용물의 점도와 질감을 선택해 주세요.",
        options: ["가벼움", "중간", "리치함", "특수텍스처", "타겟품동일", "직접작성"],
        otherKey: "viscosityOther", otherWhen: "직접작성", otherLabel: "점도 · 텍스처 직접 작성",
      },
      {
        key: "finish", label: "마무리감", type: "select", hint: "도포 후 원하는 피부 느낌을 선택해 주세요.",
        options: ["산뜻", "촉촉", "글로우", "보송", "리치", "타겟품동일", "직접작성"],
        otherKey: "finishOther", otherWhen: "직접작성", otherLabel: "마무리감 직접 작성",
      },
      { key: "requiredFeel", label: "반드시 구현할 사용감", type: "textarea", hint: "꼭 구현되어야 할 사용감을 작성해 주세요." },
    ],
  },
  {
    title: "수출 · 규제 개발 기준",
    fields: [
      {
        key: "countries", label: "판매 예정 국가 · 지역", type: "multiselect", hint: "제품을 판매하거나 수출할 예정인 국가 · 지역을 선택해 주세요.",
        options: ["한국", "중국", "미국", "일본", "EU", "동남아", "중동", "기타"],
        otherKey: "countriesOther", otherWhen: "기타", otherLabel: "그 밖의 판매 예정 국가",
      },
      {
        key: "exportRegs", label: "수출 규제 적용 기준", type: "multiselect", options: EXPORT_REG_OPTIONS,
        hint: "판매 예정 국가에 맞춰 필요한 화장품 규제 기준을 검토합니다.",
        otherKey: "exportRegsOther", otherWhen: "기타", otherLabel: "그 밖의 규제 기준",
      },
      { key: "nmpaEffect", label: "중국 NMPA 효능 설정", type: "multiselect", options: NMPA_OPTIONS, hint: "중국 판매 시 적용할 효능을 선택해 주세요.", showIf: f => (f.exportRegs || []).includes("중국NMPA") || (f.countries || []).includes("중국") },
      { key: "countryLimits", label: "국가별 별도 제한사항", type: "textarea", hint: "국가별 추가 규제 조건을 작성해 주세요." },
    ],
  },
  {
    title: "용기 · 부자재 개발 기준",
    fields: [
      { key: "targetContainerUrl", label: "타겟 용기", type: "url", hint: "참고할 용기 또는 URL을 입력해 주세요." },
      { key: "packaging", label: "포장 형태", type: "text", hint: "원하는 최종 포장 형태를 작성해 주세요." },
      {
        key: "suppliedMaterial", label: "부자재 준비 방식", type: "material", turnkeyKey: "turnkeyMaterial", groups: MATERIAL_GROUPS,
        hint: "필요한 부자재마다 누가 준비할지 골라 주세요. 사급은 고객이 직접 제공, 턴키는 제조사가 소싱합니다.",
      },
      { key: "otherMaterialCond", label: "기타 부자재 조건", type: "textarea", hint: "원하는 부자재의 재질 · 색상 · 형태 · 인쇄 · 후가공 · 특수 사양 등 세부 요청사항을 작성해 주세요. 예) 무광 화이트 용기, 금박 로고, 투명 라벨 등" },
    ],
  },
  {
    title: "개발 핵심 요청사항",
    fields: [
      { key: "additionalNotes", label: "추가 요청사항", type: "textarea", hint: "기타 필요한 사항을 자유롭게 작성해 주세요." },
    ],
  },
];
const ALL_DEV_FIELDS = DEV_FIELD_GROUPS.flatMap(g => g.fields);
// 값이 배열로 들어가는 입력 유형 — 폼 초기화 · 저장 시 빈 배열로 다뤄야 하는 것들
const MULTI_VALUE_TYPES = ["multiselect", "list", "skin", "material"];

function Chip({ label, sel, onClick, dim }) {
  return (
    <button onClick={onClick} disabled={dim} style={{
      height: 36, padding: "0 13px", borderRadius: 99, fontSize: 12.5, fontWeight: 700, cursor: dim ? "not-allowed" : "pointer", fontFamily: FONT,
      background: sel ? "#111" : "#F4F4F5", color: sel ? "#fff" : "#434343", border: "1.5px solid transparent", whiteSpace: "nowrap",
      opacity: dim ? 0.4 : 1,
    }}>{label}</button>
  );
}

// 선택지가 20~32개나 되는 항목(효능 · 수출규제 · 부자재)은 칩을 전부 펼치면 화면이 압도된다.
// 고른 것만 위에 보여주고, 검색과 접이식 그룹으로 필요한 것만 찾아 고르게 한다.
const PICKER_THRESHOLD = 12;
function BigPicker({ options, groups, value, onToggle, max, single }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const sel = value || [];
  // 하나만 고르는 항목은 다른 선택지를 눌러 바로 바꿀 수 있어야 하므로 잠그지 않는다.
  const full = !single && max && sel.length >= max;
  const needle = q.trim().toLowerCase();
  const sections = (groups || [{ title: "", items: options }])
    .map(s => ({ ...s, items: s.items.filter(o => !needle || o.toLowerCase().includes(needle)) }))
    .filter(s => s.items.length > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {sel.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {sel.map(o => (
            <button key={o} onClick={() => onToggle(o)} style={{
              height: 32, padding: "0 9px 0 12px", borderRadius: 99, border: 0, background: "#111", color: "#fff",
              fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT, display: "flex", alignItems: "center", gap: 6,
            }}>{t(o)}<span style={{ color: "#9A9A9E", fontSize: 12 }}>✕</span></button>
          ))}
        </div>
      )}
      <button onClick={() => setOpen(v => !v)} style={{
        height: 42, borderRadius: 13, border: "1.5px solid #E4E4E4", background: "#fff", cursor: "pointer", fontFamily: FONT,
        fontSize: 13, fontWeight: 800, color: "#434343", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px",
      }}>
        <span>{sel.length > 0 ? t(`${sel.length}개 선택됨 · 고치기`, `${sel.length} selected · Edit`) : t("목록에서 선택하기", "Choose from list")}</span>
        <span style={{ color: "#B0B0B4", fontSize: 11 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 11, padding: 13, borderRadius: 14, background: "#F7F7F8" }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={t("검색", "Search")}
            style={{ height: 38, borderRadius: 10, border: 0, background: "#fff", padding: "0 12px", fontSize: 13.5, fontWeight: 600, fontFamily: FONT, outline: "none" }} />
          {max && !single && <div style={{ fontSize: 11.5, fontWeight: 700, color: full ? C.accent : "#B0B0B4" }}>{t(`최대 ${max}개까지 선택할 수 있습니다.`, `You can select up to ${max}.`)}</div>}
          {sections.map(s => (
            <div key={s.title || "all"} style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {s.title && <div style={{ fontSize: 11.5, fontWeight: 800, color: "#8A8A8E" }}>{t(s.title)}</div>}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {s.items.map(o => (
                  <Chip key={o} label={t(o)} sel={sel.includes(o)} dim={full && !sel.includes(o)} onClick={() => onToggle(o)} />
                ))}
              </div>
            </div>
          ))}
          {sections.length === 0 && <div style={{ fontSize: 12.5, color: "#B0B0B4", fontWeight: 600 }}>{t("검색 결과가 없습니다.", "No results found.")}</div>}
        </div>
      )}
    </div>
  );
}

// 사급 · 턴키는 노션에서 같은 32개 목록을 쓴다. 목록을 두 번 보여주면 같은 부자재를 양쪽에
// 중복 체크하기 쉬워서, 한 목록에서 항목마다 누가 준비할지 고르게 한다.
function MaterialPicker({ groups, supplied, turnkey, onChange }) {
  const { t } = useLang();
  const [openGroup, setOpenGroup] = useState(null);
  const sup = supplied || [];
  const turn = turnkey || [];
  const modeOf = (item) => (sup.includes(item) ? "supplied" : turn.includes(item) ? "turnkey" : "none");
  const setMode = (item, mode) => {
    const nextSup = sup.filter(v => v !== item);
    const nextTurn = turn.filter(v => v !== item);
    if (mode === "supplied") nextSup.push(item);
    if (mode === "turnkey") nextTurn.push(item);
    onChange(nextSup, nextTurn);
  };
  const MODES = [{ k: "supplied", label: t("사급", "Customer") }, { k: "turnkey", label: t("턴키", "Turnkey") }, { k: "none", label: "–" }];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      <div style={{ display: "flex", gap: 8, fontSize: 11.5, fontWeight: 800 }}>
        <span style={{ padding: "5px 10px", borderRadius: 99, background: "#EAF2FD", color: "#1B5FA8" }}>{t("사급", "Customer")} {sup.length}</span>
        <span style={{ padding: "5px 10px", borderRadius: 99, background: "#FDF1EC", color: "#B0562A" }}>{t("턴키", "Turnkey")} {turn.length}</span>
      </div>
      {groups.map(g => {
        const open = openGroup === g.title;
        const picked = g.items.filter(i => modeOf(i) !== "none").length;
        return (
          <div key={g.title} style={{ borderRadius: 14, background: "#F7F7F8", overflow: "hidden" }}>
            <button onClick={() => setOpenGroup(open ? null : g.title)} style={{
              width: "100%", border: 0, background: "transparent", cursor: "pointer", fontFamily: FONT,
              display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 14px",
            }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#111" }}>{t(g.title)}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {picked > 0 && <span style={{ fontSize: 11.5, fontWeight: 800, color: C.accent }}>{picked}</span>}
                <span style={{ color: "#B0B0B4", fontSize: 11 }}>{open ? "▲" : "▼"}</span>
              </span>
            </button>
            {open && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 14px 13px" }}>
                {g.items.map(item => {
                  const mode = modeOf(item);
                  return (
                    <div key={item} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: mode === "none" ? "#8A8A8E" : "#111", flex: 1, minWidth: 0 }}>{t(item)}</span>
                      <span style={{ display: "flex", flex: "none", background: "#fff", borderRadius: 99, padding: 2, gap: 2 }}>
                        {MODES.map(m => {
                          const on = mode === m.k && m.k !== "none";
                          return (
                            <button key={m.k} onClick={() => setMode(item, m.k)} style={{
                              border: 0, borderRadius: 99, cursor: "pointer", fontFamily: FONT, fontSize: 11.5, fontWeight: 800,
                              padding: "6px 11px", background: on ? "#111" : "transparent",
                              color: on ? "#fff" : mode === m.k ? "#8A8A8E" : "#C4C4C6",
                            }}>{m.label}</button>
                          );
                        })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// 필수 적용 원료 · 제외 희망 원료 — 한 줄에 하나씩 추가하고, 노션에는 줄바꿈으로 이어 저장한다.
function ListInput({ value, onChange, placeholder }) {
  const rows = value?.length ? value : [""];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {rows.map((row, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input value={row} placeholder={placeholder || ""} style={{ ...uInpBase, flex: 1 }}
            onChange={e => onChange(rows.map((r, k) => (k === i ? e.target.value : r)))} />
          {rows.length > 1 && (
            <button onClick={() => onChange(rows.filter((_, k) => k !== i))} style={{
              border: 0, background: "transparent", color: "#C4C4C6", fontSize: 14, cursor: "pointer", fontFamily: FONT, padding: 4,
            }}>✕</button>
          )}
        </div>
      ))}
      <button onClick={() => onChange([...rows, ""])} style={{
        alignSelf: "flex-start", height: 34, padding: "0 14px", borderRadius: 99, cursor: "pointer", fontFamily: FONT,
        border: "1.5px dashed #C4C4C6", background: "transparent", color: "#434343", fontSize: 12.5, fontWeight: 800,
      }}>+ 추가</button>
    </div>
  );
}

// 타겟 피부 — 노션 피부타입DB 관계형. 구분을 먼저 고르고 그 안의 세부 타입을 고른다.
function SkinPicker({ items, value, onChange }) {
  const [group, setGroup] = useState("");
  const sel = value || [];
  const groups = Array.from(new Set(items.flatMap(i => i.groups)));
  const nameOf = (id) => items.find(i => i.id === id)?.name || "";
  const inGroup = group ? items.filter(i => i.groups.includes(group)) : [];

  if (items.length === 0) {
    return <div style={{ fontSize: 12.5, color: "#B0B0B4", fontWeight: 600 }}>피부 타입을 불러오는 중...</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {sel.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {sel.map(id => (
            <button key={id} onClick={() => onChange(sel.filter(v => v !== id))} style={{
              height: 32, padding: "0 9px 0 12px", borderRadius: 99, border: 0, background: "#111", color: "#fff",
              fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT, display: "flex", alignItems: "center", gap: 6,
            }}>{nameOf(id)}<span style={{ color: "#9A9A9E", fontSize: 12 }}>✕</span></button>
          ))}
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {groups.map(g => <Chip key={g} label={g} sel={group === g} onClick={() => setGroup(group === g ? "" : g)} />)}
      </div>
      {group && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, padding: 13, borderRadius: 14, background: "#F7F7F8" }}>
          {inGroup.map(i => (
            <Chip key={i.id} label={i.name} sel={sel.includes(i.id)}
              onClick={() => onChange(sel.includes(i.id) ? sel.filter(v => v !== i.id) : [...sel, i.id])} />
          ))}
        </div>
      )}
    </div>
  );
}

function DevField({ f, value, onChange, form, skinTypes }) {
  const { t } = useLang();
  const body = () => {
    if (f.type === "text" || f.type === "url") {
      return <input value={value || ""} onChange={e => onChange(f.key, e.target.value)} placeholder={t(f.placeholder || "")} style={uInpBase} />;
    }
    if (f.type === "number") {
      return (
        <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
          <input value={value || ""} inputMode="numeric" placeholder={t(f.placeholder || "")} style={{ ...uInpBase, flex: 1 }}
            onChange={e => onChange(f.key, e.target.value.replace(/[^\d]/g, ""))} />
          {f.unit && <span style={{ fontSize: 13, fontWeight: 700, color: "#8A8A8E", flex: "none" }}>{t(f.unit)}</span>}
        </div>
      );
    }
    if (f.type === "textarea") {
      return <textarea value={value || ""} onChange={e => onChange(f.key, e.target.value)} placeholder={t(f.placeholder || "")} style={{ ...uInpBase, minHeight: 64, resize: "vertical" }} />;
    }
    if (f.type === "date") {
      return <input type="date" value={value || ""} onChange={e => onChange(f.key, e.target.value)} style={uInpBase} />;
    }
    if (f.type === "list") {
      return <ListInput value={value} placeholder={t(f.placeholder)} onChange={v => onChange(f.key, v)} />;
    }
    if (f.type === "skin") {
      return <SkinPicker items={skinTypes || []} value={value} onChange={v => onChange(f.key, v)} />;
    }
    if (f.type === "material") {
      return (
        <MaterialPicker groups={f.groups} supplied={value} turnkey={form?.[f.turnkeyKey]}
          onChange={(sup, turn) => { onChange(f.key, sup); onChange(f.turnkeyKey, turn); }} />
      );
    }
    if (f.type === "select") {
      if (f.options.length > PICKER_THRESHOLD) {
        return <BigPicker options={f.options} value={value ? [value] : []} onToggle={o => onChange(f.key, value === o ? "" : o)} single />;
      }
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {f.options.map(o => <Chip key={o} label={t(o)} sel={value === o} onClick={() => onChange(f.key, value === o ? "" : o)} />)}
        </div>
      );
    }
    if (f.type === "multiselect") {
      const arr = value || [];
      const toggle = (o) => {
        if (arr.includes(o)) return onChange(f.key, arr.filter(v => v !== o));
        if (f.max && arr.length >= f.max) return;
        onChange(f.key, [...arr, o]);
      };
      if (f.options.length > PICKER_THRESHOLD || f.groups) {
        return <BigPicker options={f.options} groups={f.groups} value={arr} onToggle={toggle} max={f.max} />;
      }
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {f.options.map(o => (
            <Chip key={o} label={t(o)} sel={arr.includes(o)} dim={f.max && arr.length >= f.max && !arr.includes(o)} onClick={() => toggle(o)} />
          ))}
        </div>
      );
    }
    return null;
  };

  // "기타 · 직접작성 · 지정색 · 지정향"을 고른 경우에만 직접 입력칸을 띄운다.
  const otherOn = f.otherKey && (Array.isArray(value) ? value.includes(f.otherWhen) : value === f.otherWhen);

  return (
    <UField label={t(f.label)} req={f.req} hint={t(f.hint)}>
      {body()}
      {otherOn && (
        <input value={form?.[f.otherKey] || ""} onChange={e => onChange(f.otherKey, e.target.value)}
          placeholder={t(f.otherLabel) || t("직접 입력", "Enter manually")} style={{ ...uInpBase, marginTop: 4 }} />
      )}
    </UField>
  );
}
const uInpBase = { width: "100%", border: 0, borderBottom: "1.5px solid #E4E4E4", background: "transparent", fontSize: 15, fontWeight: 700, color: "#111", padding: "0 0 9px", outline: "none", fontFamily: FONT };
// 여러 줄까지 보여주고 그 뒤로만 자른다 — 제형 설명처럼 긴 문장이 한 줄에서 잘려나가지 않도록.
const clamp = (lines) => ({ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: lines, overflow: "hidden", whiteSpace: "normal", wordBreak: "break-word" });

function ProgressBar({ current, total }) {
  return (
    <div style={{ display: "flex", gap: 3, padding: "6px 20px 0" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          flex: 1, height: 2.5, borderRadius: 2,
          background: i <= current ? C.accent : C.border,
          transition: "background 0.3s",
        }} />
      ))}
    </div>
  );
}


// ━━━━━━━━━━ MAIN APP ━━━━━━━━━━
export default function App() {
  // ─── Check for dev-request form route / 전용 페이지 이메일 링크(magic link) ───
  const [route, setRoute] = useState("main");
  const [clientId, setClientId] = useState(null);
  const [portalAuto, setPortalAuto] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (window.location.pathname === "/admin") {
      // 내부 담당자 전용 관리자 페이지 — 고객용 흐름(MainFlow)과 완전히 분리되어 있다.
      setRoute("admin");
    } else if (window.location.pathname === "/form" || params.has("form")) {
      setRoute("devform");
      // inquiry = 제조 문의 관리 페이지 ID (V2 스키마 기준, 신규 링크).
      // client/id는 예전에 이미 발송된 링크와의 호환을 위해 남겨둠.
      setClientId(params.get("inquiry") || params.get("client") || params.get("id"));
    } else if (params.has("portal_email") && params.has("portal_code")) {
      // 접속 코드 이메일의 "전용 페이지 바로가기" 버튼 — 코드를 직접 입력하지 않아도 자동 로그인된다.
      setPortalAuto({ email: params.get("portal_email"), code: params.get("portal_code") });
    }
  }, []);

  if (route === "admin") return <AdminApp />;
  return (
    <LangProvider>
      {route === "devform"
        ? <DevRequestForm clientId={clientId} />
        : <MainFlow initialPortalEmail={portalAuto?.email} initialPortalCode={portalAuto?.code} />}
    </LangProvider>
  );
}

// ━━━━━━━━━━ MAIN FLOW ━━━━━━━━━━
function MainFlow({ initialPortalEmail, initialPortalCode }) {
  const { t, lang } = useLang();
  const [phase, setPhase] = useState("intro");
  // 화면 이동 이력 — 05 품목 선택 · 07 상담 화면에는 원래 뒤로가기가 없어서 한 번 들어가면
  // 빠져나올 수 없었다. 같은 화면으로 되돌아가는 경우(품목 ↔ 의뢰서)는 쌓지 않고 걷어낸다.
  const [phaseStack, setPhaseStack] = useState([]);
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [anim, setAnim] = useState(false);
  const [selectedSvc, setSelectedSvc] = useState(null);
  const [form, setForm] = useState({
    name: "", phone: "", email: "", country: "대한민국",
    businessType: "", businessName: "", ceoName: "",
    department: "", position: "", hasLicense: "",
    hasTrademark: "", distributionCountries: [], inquirySource: "",
    willWriteDoc: null,
    meetingDate1: "", meetingTime1: "", meetingDate2: "", meetingTime2: "",
  });
  const [errors, setErrors] = useState({});
  const [submitSt, setSubmitSt] = useState(null);
  // 02 고객 정보 등록 시 노션에 만들어지는 거래처 · 담당자 · 제조 문의 ID (이후 진단·미팅이 여기에 연결됨)
  const [reg, setReg] = useState(null);
  // 08 기존 고객 재문의 — 이메일로 조회된 기존 거래처 · 담당자 · 이전 문의 이력(md 3.3절)
  const [existingCustomer, setExistingCustomer] = useState(null);
  const [existingDismissed, setExistingDismissed] = useState(false);
  // 노션에 이미 '미팅 확정일'이 등록된 슬롯(ISO 날짜/일시 문자열) — 07 화면에서 선택 못하게 막는다
  const [bookedSlots, setBookedSlots] = useState([]);
  // 05 제조 품목 화면 — 노션 "제조 품목" DB에서 가져온 카탈로그 · 검색어 · 대분류 필터 · 선택한 품목
  const [catalog, setCatalog] = useState([]);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogCat, setCatalogCat] = useState("전체");
  const [catalogGroup, setCatalogGroup] = useState("전체");
  const [pickedItems, setPickedItems] = useState([]);
  const [skinTypes, setSkinTypes] = useState([]);
  // 06 기획개발의뢰서(간이형) — 선택한 품목별 상세 입력 폼과 현재 작성 중인 품목 인덱스
  const [devForms, setDevForms] = useState([]);
  const [devIdx, setDevIdx] = useState(0);
  const [devStep, setDevStep] = useState(0);
  // 진단은 한 문의당 한 번만 기록한다 — 뒤로 갔다 다시 진행해도 중복 저장되지 않도록.
  const [diagnosisDone, setDiagnosisDone] = useState(false);
  // 전용 페이지에서 기존 의뢰서를 고치는 중이면 해당 노션 페이지 ID가 들어간다(신규 작성이면 null).
  const [editingPageId, setEditingPageId] = useState(null);
  // 전용 페이지 접근 코드(상담 신청 시 1회 발급) · 로그인 입력값 · 로그인 후 받아온 전용 페이지 데이터
  const [accessCode, setAccessCode] = useState("");
  const [codeEmailed, setCodeEmailed] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [portalEmail, setPortalEmail] = useState("");
  const [portalCode, setPortalCode] = useState("");
  const [portalErr, setPortalErr] = useState("");
  const [portalMsg, setPortalMsg] = useState("");
  const [portalData, setPortalData] = useState(null);
  const [portalSynced, setPortalSynced] = useState(null);
  const [portalTab, setPortalTab] = useState("home");
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [expandedEstimate, setExpandedEstimate] = useState(null);
  const [expandedContract, setExpandedContract] = useState(null);
  const [expandedStep, setExpandedStep] = useState(null);
  const [activeProject, setActiveProject] = useState(0);
  const cRef = useRef(null);

  const go = (next) => {
    setPhaseStack(s => (s[s.length - 1] === next ? s.slice(0, -1) : [...s, phase]));
    setPhase(next);
  };
  const goBack = () => {
    if (phaseStack.length === 0) return;
    setPhase(phaseStack[phaseStack.length - 1]);
    setPhaseStack(s => s.slice(0, -1));
  };
  // 새 문의를 시작할 때 이전 문의의 품목 · 카테고리 · 작성 내용이 남아 있으면 대분류 선택이
  // 통째로 건너뛰어지고 지난번 품목이 그대로 선택돼 보인다. 초안 상태를 모두 비운다.
  const resetInquiryDraft = () => {
    setCatalogQuery("");
    setCatalogCat("전체");
    setCatalogGroup("전체");
    setPickedItems([]);
    setDevForms([]);
    setDevIdx(0);
    setDevStep(0);
    setReg(null);
    setDiagnosisDone(false);
    setEditingPageId(null);
    setPhaseStack([]);
  };
  const blankDevForm = (it) => {
    const f = { itemId: it.id, productName: it.name, productType: it.category, formulation: it.form };
    for (const def of ALL_DEV_FIELDS) {
      if (def.otherKey && f[def.otherKey] === undefined) f[def.otherKey] = "";
      if (def.turnkeyKey && f[def.turnkeyKey] === undefined) f[def.turnkeyKey] = [];
      if (f[def.key] !== undefined) continue;
      f[def.key] = MULTI_VALUE_TYPES.includes(def.type) ? [] : "";
    }
    return f;
  };

  useEffect(() => {
    if (phase !== "meeting") return;
    fetch("/api/meeting").then(r => r.json()).then(d => {
      if (d.success) setBookedSlots(d.booked || []);
    }).catch(() => {});
  }, [phase]);

  useEffect(() => {
    if (phase !== "items" || catalog.length > 0) return;
    fetch("/api/catalog").then(r => r.json()).then(d => {
      if (d.success) setCatalog(d.items || []);
    }).catch(() => {});
  }, [phase]);

  // 타겟 피부(피부타입DB 관계형) 선택지 — 의뢰서 작성 화면과 전용 페이지 요약 양쪽에서 쓴다.
  useEffect(() => {
    if (!["devdetail", "portal"].includes(phase) || skinTypes.length > 0) return;
    fetch("/api/skintypes").then(r => r.json()).then(d => {
      if (d.success) setSkinTypes(d.items || []);
    }).catch(() => {});
  }, [phase]);

  // ─── Scoring ───
  const calcScores = useCallback(() => {
    const sectionRaw = {};
    Object.keys(SECTION_WEIGHTS).forEach(k => { sectionRaw[k] = 0; });
    const svcVotes = { OEM: 0, ODM: 0, OCM: 0, OBM: 0 };

    Object.entries(answers).forEach(([qi, oi]) => {
      const q = QUESTIONS[qi];
      const opt = q.options[oi];
      sectionRaw[q.sectionNum] = (sectionRaw[q.sectionNum] || 0) + opt.score;
      if (opt.svcHint) svcVotes[opt.svcHint] += (q.isKey ? 3 : 1);
    });

    // Weighted section scores
    const sectionScaled = {};
    let totalScore = 0;
    Object.entries(SECTION_WEIGHTS).forEach(([k, w]) => {
      const raw = sectionRaw[k] || 0;
      const scaled = Math.round((raw / w.maxRaw) * w.scaled * 10) / 10;
      sectionScaled[k] = Math.min(scaled, w.scaled);
      totalScore += sectionScaled[k];
    });

    // Service recommendation
    const ranked = Object.entries(svcVotes).sort((a, b) => b[1] - a[1]);
    const recommended = ranked[0][0];

    return { sectionRaw, sectionScaled, totalScore, svcVotes, recommended };
  }, [answers]);

  const scoring = Object.keys(answers).length === QUESTIONS.length ? calcScores() : null;
  const recommended = scoring?.recommended || "ODM";
  const chosen = selectedSvc || recommended;
  const maxTotal = Object.values(SECTION_WEIGHTS).reduce((s, w) => s + w.scaled, 0);

  // ─── Handlers ───
  const scrollTop = () => cRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  useEffect(() => { scrollTop(); }, [phase, qIdx]);

  // 답을 고르면 바로 다음 문항으로 넘어간다 (사용자 피드백 반영 — "다음" 버튼은
  // 이미 답한 문항을 다시 검토할 때만 쓴다).
  const goToNextQuestion = () => {
    if (qIdx < QUESTIONS.length - 1) {
      setAnim(true);
      setTimeout(() => { setQIdx(i => i + 1); setAnim(false); }, 200);
    } else {
      setPhase("result");
    }
  };

  const pickAnswer = (qi, oi) => {
    const wasAnswered = answers.hasOwnProperty(qi);
    setAnswers(prev => ({ ...prev, [qi]: oi }));
    if (!wasAnswered) setTimeout(goToNextQuestion, 320);
  };

  const nextQuestion = () => {
    if (!answers.hasOwnProperty(qIdx)) return;
    goToNextQuestion();
  };

  const goBackQuiz = () => {
    if (qIdx > 0) {
      setQIdx(i => i - 1);
    } else {
      setPhase("info");
    }
  };

  const setField = (f, v) => {
    setForm(p => ({ ...p, [f]: v }));
    if (errors[f]) setErrors(p => ({ ...p, [f]: null }));
  };

  const toggleDist = (c) => {
    setForm(p => ({
      ...p,
      distributionCountries: p.distributionCountries.includes(c)
        ? p.distributionCountries.filter(x => x !== c)
        : [...p.distributionCountries, c],
    }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = t("필수", "Required");
    if (!form.phone.trim()) e.phone = t("필수", "Required");
    if (!form.email.includes("@")) e.email = t("올바른 이메일을 입력해주세요", "Please enter a valid email");
    if (!form.businessName.trim()) e.businessName = t("필수", "Required");
    if (!form.businessType) e.businessType = t("필수", "Required");
    if (!form.ceoName.trim()) e.ceoName = t("필수", "Required");
    if (!form.hasTrademark) e.hasTrademark = t("필수", "Required");
    if (!form.hasLicense) e.hasLicense = t("필수", "Required");
    if (!form.distributionCountries.length) e.distributionCountries = t("최소 1개 선택", "Select at least 1");
    setErrors(e);
    return !Object.keys(e).length;
  };

  // ─── 02 고객 정보 등록 제출: 거래처 · 담당자 · 제조 문의 생성 (진단 이전) ───
  const registerCustomer = async () => {
    if (!validate()) return;
    setSubmitSt("loading");
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer: form }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "서버 오류");
      setReg({ clientId: result.clientId, contactId: result.contactId, inquiryId: result.inquiryId });
      setSubmitSt(null);
      setPhase("quiz");
    } catch (err) {
      console.error("Register error:", err);
      setSubmitSt("error");
      setTimeout(() => setSubmitSt(null), 3000);
    }
  };

  // ─── 이메일 입력을 마치면 기존 고객인지 확인한다(md 3.3절 "1. 등록된 담당자로 기존 고객 확인") ───
  const lookupExisting = async () => {
    const email = form.email.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    try {
      const res = await fetch("/api/lookup-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await res.json();
      if (result.success && result.found) {
        setExistingCustomer(result);
        setExistingDismissed(false);
      }
    } catch (err) {
      console.error("Lookup existing customer error:", err);
    }
  };

  // ─── 08 기존 고객: 진단 없이 거래처 · 담당자를 재사용해 새 제조 문의만 만든다 ───
  const registerExisting = async (willWriteDoc) => {
    if (!existingCustomer) return;
    // 뒤로 갔다가 다시 들어온 경우 — 이미 만든 문의를 재사용해 빈 문의가 중복 생성되지 않게 한다.
    if (reg?.inquiryId && reg.clientId === existingCustomer.client.id) {
      setField("willWriteDoc", willWriteDoc);
      go(willWriteDoc ? "items" : "meeting");
      return;
    }
    setSubmitSt("loading");
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          existing: {
            clientId: existingCustomer.client.id,
            contactId: existingCustomer.contact.id,
            businessName: existingCustomer.client.name,
          },
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "서버 오류");
      setReg({ clientId: result.clientId, contactId: result.contactId, inquiryId: result.inquiryId });
      setField("businessName", existingCustomer.client.name);
      setField("name", existingCustomer.contact.name);
      setField("email", form.email);
      setField("willWriteDoc", willWriteDoc);
      setSubmitSt(null);
      go(willWriteDoc ? "items" : "meeting");
    } catch (err) {
      console.error("Existing register error:", err);
      setSubmitSt("error");
      setTimeout(() => setSubmitSt(null), 3000);
    }
  };

  // ─── 04 결과 화면 제출: 진단 스코어링 기록 (내부 전용) + 다음 단계 분기 ───
  const submitDiagnosis = async (willWriteDoc) => {
    // 뒤로 갔다 다시 넘어온 경우 진단을 두 번 기록하지 않는다.
    if (diagnosisDone) {
      setField("willWriteDoc", willWriteDoc);
      go(willWriteDoc ? "items" : "meeting");
      return;
    }
    setSubmitSt("loading");
    const sc = calcScores();
    const questionsDetail = QUESTIONS.map((q, i) => ({
      section: q.section,
      question: q.question,
      selectedText: answers[i] !== undefined ? q.options[answers[i]].text : '',
      score: answers[i] !== undefined ? q.options[answers[i]].score : 0,
      isKey: !!q.isKey,
    }));
    try {
      const res = await fetch("/api/diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: reg?.clientId,
          inquiryId: reg?.inquiryId,
          businessName: form.businessName,
          answers, questions: questionsDetail,
          sectionScores: sc.sectionScaled,
          sectionRaw: sc.sectionRaw,
          totalScore: sc.totalScore,
          svcVotes: sc.svcVotes,
          recommendedService: sc.recommended,
          selectedService: chosen,
          willWriteDoc,
          hasTrademark: form.hasTrademark,
          hasLicense: form.hasLicense,
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "서버 오류");
      setDiagnosisDone(true);
      setField("willWriteDoc", willWriteDoc);
      setSubmitSt(null);
      go(willWriteDoc ? "items" : "meeting");
    } catch (err) {
      console.error("Diagnosis error:", err);
      setSubmitSt("error");
      setTimeout(() => setSubmitSt(null), 3000);
    }
  };

  // ─── 05 → 06 : 선택한 품목마다 상세 입력 폼(간이형)을 준비하고 06 화면으로 이동 ───
  // 기획 문서 흐름상 "제조 품목 선택 → 품목별 제품개발의뢰서 상세 작성 → 상담 일정"이 맞는 순서라,
  // 05에서 바로 노션에 저장하지 않고 06에서 내용을 채운 뒤 한 번에 제출한다.
  // 품목을 추가·삭제하고 다시 돌아올 수 있으므로, 이미 작성한 내용은 itemId 기준으로 보존한다.
  const goToDevDetail = () => {
    if (pickedItems.length === 0) return;
    setEditingPageId(null);
    setDevForms(prev => pickedItems.map(it => prev.find(f => f.itemId === it.id) || blankDevForm(it)));
    setDevIdx(i => Math.min(i, pickedItems.length - 1));
    setDevStep(0);
    go("devdetail");
  };
  const removeDevItem = (idx) => {
    if (devForms.length <= 1) return;
    const removed = devForms[idx];
    setDevForms(prev => prev.filter((_, i) => i !== idx));
    setPickedItems(prev => prev.filter(p => p.id !== removed.itemId));
    setDevIdx(i => (i >= idx && i > 0 ? i - 1 : i));
    setDevStep(0);
  };
  // 조건이 풀려 숨겨진 입력값이 그대로 남아 제출되던 문제가 있어, 값을 바꿀 때마다 화면에서
  // 사라진 항목(showIf가 거짓이 된 필드 · 트리거를 해제한 기타 입력칸)을 함께 비운다.
  const updateDevField = (idx, field, value) => {
    setDevForms(prev => prev.map((f, i) => {
      if (i !== idx) return f;
      const next = { ...f, [field]: value };
      for (const def of ALL_DEV_FIELDS) {
        if (def.showIf && !def.showIf(next)) next[def.key] = MULTI_VALUE_TYPES.includes(def.type) ? [] : "";
        if (!def.otherKey) continue;
        const v = next[def.key];
        const on = Array.isArray(v) ? v.includes(def.otherWhen) : v === def.otherWhen;
        if (!on) next[def.otherKey] = "";
      }
      return next;
    }));
  };

  // ─── 전용 페이지에서 이미 제출한 의뢰서 고치기 (상태가 '시작 전'일 때만) ───
  const startEditingProduct = (product) => {
    setEditingPageId(product.id);
    setDevForms([{ ...blankDevForm({ id: product.itemId, name: product.name, category: "", form: "" }), ...product, productName: product.name }]);
    setDevIdx(0);
    setDevStep(0);
    go("devdetail");
  };
  const submitProductEdit = async () => {
    setSubmitSt("loading");
    try {
      const res = await fetch("/api/devform-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: portalEmail.trim(), code: portalCode.trim(), pageId: editingPageId, product: devForms[0] }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "서버 오류");
      setSubmitSt(null);
      setEditingPageId(null);
      setDevForms([]);
      setPhaseStack([]);
      setPhase("portal");
      refreshPortalData();
    } catch (err) {
      console.error("DevDetail edit error:", err);
      setSubmitSt("error");
      setTimeout(() => setSubmitSt(null), 3000);
    }
  };

  // ─── 06 작성한 개발의뢰서(품목별 1건씩) 제출 ───
  const submitDevDetails = async () => {
    if (editingPageId) return submitProductEdit();
    setSubmitSt("loading");
    try {
      const res = await fetch("/api/devform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiryId: reg?.inquiryId, products: devForms }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "서버 오류");
      setSubmitSt(null);
      // 의뢰서가 이미 노션에 저장됐으므로 여기서부터는 되돌아갈 수 없다(중복 저장 방지).
      setPhaseStack([]);
      setPhase("meeting");
    } catch (err) {
      console.error("DevDetail submit error:", err);
      setSubmitSt("error");
      setTimeout(() => setSubmitSt(null), 3000);
    }
  };

  // ─── 07 상담 일정 제출 ───
  const submitMeeting = async () => {
    if (!form.meetingDate1 || !form.meetingTime1) {
      setErrors({ meetingDate1: "필수" });
      return;
    }
    const todayStr = new Date().toISOString().slice(0, 10);
    if (form.meetingDate1 < todayStr || (form.meetingDate2 && form.meetingDate2 < todayStr)) {
      setErrors({ meetingDate1: "지난 날짜는 선택할 수 없습니다" });
      return;
    }
    if (isWeekendOrHoliday(form.meetingDate1) || isWeekendOrHoliday(form.meetingDate2)) {
      setErrors({ meetingDate1: "주말 · 공휴일은 선택할 수 없습니다" });
      return;
    }
    if (isSlotBooked(bookedSlots, form.meetingDate1, form.meetingTime1) || isSlotBooked(bookedSlots, form.meetingDate2, form.meetingTime2)) {
      setErrors({ meetingDate1: "이미 예약된 시간입니다" });
      return;
    }
    setSubmitSt("loading");
    try {
      const res = await fetch("/api/meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquiryId: reg?.inquiryId,
          contactId: reg?.contactId,
          clientId: reg?.clientId,
          businessName: form.businessName,
          meetingDate1: form.meetingDate1, meetingTime1: form.meetingTime1,
          meetingDate2: form.meetingDate2, meetingTime2: form.meetingTime2,
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "서버 오류");
      setAccessCode(result.accessCode || "");
      setCodeEmailed(!!result.emailSent);
      setPortalEmail(form.email);
      setSubmitSt("success");
      setPhase("complete");
    } catch (err) {
      console.error("Meeting error:", err);
      setSubmitSt("error");
      setTimeout(() => setSubmitSt(null), 3000);
    }
  };

  // ─── 전용 페이지 로그인(이메일 + 6자리 코드) — 이메일 속 "바로가기" 링크의 자동 로그인도 이 함수를 탄다 ───
  const attemptPortalLogin = async (email, code) => {
    setPortalErr("");
    if (!email.trim() || !/^\d{6}$/.test(code.trim())) {
      setPortalErr(t("이메일과 6자리 코드를 정확히 입력해주세요.", "Please enter a valid email and 6-digit code."));
      return;
    }
    setSubmitSt("loading");
    try {
      const res = await fetch("/api/portal-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "인증에 실패했습니다.");
      setPortalData(result);
      setPortalSynced(new Date());
      setSubmitSt(null);
      setPhase("portal");
    } catch (err) {
      setPortalErr(err.message);
      setSubmitSt(null);
    }
  };
  const submitPortalLogin = () => attemptPortalLogin(portalEmail, portalCode);

  // 담당자가 노션에서 '미팅 확정일' 등을 바꾸면, 전용 페이지를 켜둔 채로도 반영되도록 조용히 주기적으로
  // 다시 불러온다(Notion API에는 실시간 웹훅이 없어 폴링으로 대체 — 화면 깜빡임 없이 데이터만 갱신).
  const refreshPortalData = async () => {
    if (!portalEmail || !/^\d{6}$/.test(portalCode)) return;
    try {
      const res = await fetch("/api/portal-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: portalEmail.trim(), code: portalCode.trim() }),
      });
      const result = await res.json();
      if (result.success) { setPortalData(result); setPortalSynced(new Date()); }
    } catch {}
  };
  useEffect(() => {
    if (phase !== "portal") return;
    const id = setInterval(refreshPortalData, 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // 이메일 "전용 페이지 바로가기" 링크로 들어온 경우 코드를 직접 입력하지 않아도 자동 로그인한다.
  useEffect(() => {
    if (initialPortalEmail && initialPortalCode) {
      setPortalEmail(initialPortalEmail);
      setPortalCode(initialPortalCode);
      setPhase("portal-login");
      attemptPortalLogin(initialPortalEmail, initialPortalCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── 코드를 못 받았거나 잃어버린 경우 재발급 ───
  const resendPortalCode = async () => {
    setPortalErr("");
    setPortalMsg("");
    if (!portalEmail.trim()) {
      setPortalErr(t("이메일을 먼저 입력해주세요.", "Please enter your email first."));
      return;
    }
    setSubmitSt("loading");
    try {
      const res = await fetch("/api/portal-resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: portalEmail.trim() }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "재전송에 실패했습니다.");
      setPortalMsg(t("등록된 이메일이면 새 코드를 보내드렸습니다. 메일함을 확인해주세요.", "If this email is registered, a new code has been sent — please check your inbox."));
    } catch (err) {
      setPortalErr(err.message);
    } finally {
      setSubmitSt(null);
    }
  };

  // ─── 전용 페이지 대시보드에서 곧장 새 제조 문의 시작하기 — 이미 코드로 인증된 이메일을
  // 그대로 재사용해 08 화면(기존 고객 재문의)과 같은 통계 · 이력을 불러온다. ───
  const startNewInquiryFromPortal = async () => {
    if (!portalEmail) return;
    setSubmitSt("loading");
    try {
      const res = await fetch("/api/lookup-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: portalEmail.trim() }),
      });
      const result = await res.json();
      if (!result.success || !result.found) throw new Error("고객 정보를 확인하지 못했습니다.");
      setExistingCustomer(result);
      setSubmitSt(null);
      resetInquiryDraft();
      setPhase("returning");
    } catch (err) {
      console.error("Start new inquiry from portal error:", err);
      setSubmitSt(null);
    }
  };

  // ─── Shared Styles ───
  const wrap = {
    maxWidth: 440, margin: "0 auto", minHeight: "100dvh",
    background: C.bg, fontFamily: FONT,
    display: "flex", flexDirection: "column",
    position: "relative",
  };
  const hdr = {
    padding: "12px 20px", display: "flex", alignItems: "center",
    justifyContent: "space-between",
    background: "rgba(247,247,247,0.92)", backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    position: "sticky", top: 0, zIndex: 10,
  };
  const body = { flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" };
  const btn1 = {
    width: "100%", padding: "16px", border: "none", borderRadius: 14,
    background: C.accent, color: C.white, fontSize: 16, fontWeight: 600,
    fontFamily: FONT, cursor: "pointer", transition: "all 0.15s",
    letterSpacing: -0.3,
  };
  const btnOutline = {
    ...btn1, background: "transparent", border: `1.5px solid ${C.border}`,
    color: C.text,
  };
  const inp = {
    width: "100%", padding: "14px 16px", border: `1.5px solid ${C.border}`,
    borderRadius: 12, fontSize: 15, fontFamily: FONT, background: C.surface,
    color: C.text, outline: "none", boxSizing: "border-box",
    transition: "border-color 0.2s",
  };
  const backBtn = {
    background: "none", border: "none", cursor: "pointer",
    padding: 6, fontSize: 20, color: C.text, lineHeight: 1,
  };
  const Label = ({ children, req, sub }) => (
    <label style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 8, display: "block" }}>
      {children} {req && <span style={{ color: C.accent }}>*</span>}
      {sub && <span style={{ fontWeight: 400, fontSize: 12, color: C.textMuted, marginLeft: 6 }}>{sub}</span>}
    </label>
  );
  const Err = ({ f }) => errors[f] ? <div style={{ fontSize: 12, color: C.error, marginTop: 5 }}>{errors[f]}</div> : null;

  // ─── "카드형" 화면(02 고객 정보 등록 등) 공용 스타일 — 제조사 OS 앱.dc.html 기준 ───
  const card2 = { background: "#fff", borderRadius: 20, padding: 18, boxShadow: "0 1px 2px rgba(0,0,0,.05)", display: "flex", flexDirection: "column", gap: 16 };
  const uInp = { width: "100%", border: 0, borderBottom: "1.5px solid #E4E4E4", background: "transparent", fontSize: 15, fontWeight: 700, color: "#111", padding: "0 0 9px", outline: "none", fontFamily: FONT };
  const uInpBig = { ...uInp, fontSize: 17, borderBottom: "2px solid #111" };
  const toggle3 = (active) => ({
    flex: 1, height: 42, borderRadius: 13, fontSize: 13.5, fontWeight: 800, cursor: "pointer", fontFamily: FONT,
    transition: "all .18s", background: active ? "#111" : "#F4F4F5", color: active ? "#fff" : "#434343", border: "1.5px solid transparent",
  });
  const pill2 = (active) => ({
    height: 40, padding: "0 14px", borderRadius: 99, fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT,
    transition: "all .18s", background: active ? "#FDF1EC" : "#F4F4F5", color: active ? C.accent : "#434343",
    border: active ? "1.5px solid #F6D9CD" : "1.5px solid transparent",
  });
  const css = `
    @import url('${FONT_URL}');
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700;800;900&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
    html,body,#root{height:100%;background:${C.bg}}
    input:focus,select:focus,textarea:focus{border-color:${C.accent}!important;outline:none}
    button:active{transform:scale(0.97);opacity:0.9}
    ::-webkit-scrollbar{display:none}
    ::placeholder{color:${C.textMuted}}
    input[type="date"]{color-scheme:light}
  `;

  // ━━━━━━━━━━ PHASE: INTRO (제조사 OS 앱.dc.html · 01 인트로 기준) ━━━━━━━━━━
  if (phase === "intro") {
    return (
      <div style={{ ...wrap, background: "#0B0B0C" }}>
        <style>{css}</style>
        <div style={{ position: "absolute", inset: "0 0 auto 0", height: 460, background: "radial-gradient(closest-side, rgba(234,92,42,.38), transparent 70%)", filter: "blur(10px)", pointerEvents: "none" }} />
        <div style={{ height: 52, flex: "none", display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 20px", position: "relative" }}>
          <LangToggle style={{ borderColor: "#2E2E32", background: "rgba(20,20,22,.72)" }} />
        </div>
        <div ref={cRef} style={{ flex: 1, overflowY: "auto", padding: "8px 26px 32px", position: "relative", display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, color: "#fff", marginTop: 6 }}>DERMACELLEX</div>

          <div style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 3, color: C.accent }}>MANUFACTURING OS</div>
            <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.32, letterSpacing: -0.8, color: "#fff", whiteSpace: "pre-line" }}>
              {t("제품 진단부터 생산까지\n제조의 모든 과정을\n함께 합니다", "From product diagnosis\nto production —\nwe're with you the whole way")}
            </div>
            <div style={{ fontSize: 15, lineHeight: 1.7, color: "#9A9A9E" }}>
              {t("제품 진단부터 기획 · 견적 · 계약 · 생산까지, 복잡했던 제조 과정을 하나로 연결합니다.", "From diagnosis to planning, quoting, contracting, and production — we connect the entire manufacturing process in one place.")}
            </div>
          </div>

          <div style={{ marginTop: "auto", paddingTop: 32, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: "#5E5E62" }}>WHY DERMACELLEX</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {HERO_STATS.map((st, i) => (
                <div key={i} style={{ background: "#161618", border: "1px solid #232326", borderRadius: 16, padding: "13px 12px" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -1, display: "flex", alignItems: "baseline" }}>
                    <AnimNum value={lang === "en" ? st.numEn : st.num} />
                    <span style={{ fontSize: 12, color: C.accent, marginLeft: 1 }}>{lang === "en" ? st.unitEn : st.unit}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "#8A8A8E", marginTop: 3 }}>{lang === "en" ? st.labelEn : st.label}</div>
                </div>
              ))}
              <div style={{ gridColumn: "span 3", background: "#161618", border: "1px solid #232326", borderRadius: 16, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: C.accent, flex: "none" }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: "#D8D8DA" }}>{t("30분 진단으로 제품기술(개발)기준서까지", "From a 30-minute diagnosis to a full product development brief")}</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => setPhase("info")} style={{
              height: 58, border: 0, borderRadius: 18, background: C.accent, color: "#fff",
              fontSize: 17, fontWeight: 800, letterSpacing: -0.4, cursor: "pointer", fontFamily: FONT,
              boxShadow: "0 12px 28px -12px rgba(234,92,42,.9)",
            }}>{t("제조서비스 문의하기", "Inquire About Manufacturing")}</button>
            <button onClick={() => setPhase("portal-login")} style={{
              height: 58, border: "1px solid #2E2E32", borderRadius: 18, background: "#141416",
              color: "#E4E4E4", fontSize: 17, fontWeight: 700, letterSpacing: -0.4, cursor: "pointer", fontFamily: FONT,
            }}>{t("전용 페이지 이동하기", "Go to My Portal")}</button>
            <div style={{ textAlign: "center", fontSize: 12, color: "#5E5E62", marginTop: 2 }}>
              {t("20문항 · 약 5분 · 상담 확정 시 6자리 코드 발급", "20 questions · ~5 min · A 6-digit code is issued once your consultation is confirmed")}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ━━━━━━━━━━ PHASE: QUIZ (제조사 OS 앱.dc.html · 03 진단 기준) ━━━━━━━━━━
  if (phase === "quiz") {
    const q = QUESTIONS[qIdx];
    const guide = SECTION_WEIGHTS[q.sectionNum]?.guide || "";
    const answeredCount = Object.keys(answers).length;
    const isAnswered = answers.hasOwnProperty(qIdx);

    return (
      <div style={{ ...wrap, background: "#F4F4F5" }}>
        <style>{css}</style>
        <div style={{ flex: "none", padding: "10px 20px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button onClick={goBackQuiz} style={{
              width: 36, height: 36, border: 0, borderRadius: 12, background: "#fff",
              color: "#434343", fontSize: 18, cursor: "pointer", fontFamily: FONT, boxShadow: "0 1px 2px rgba(0,0,0,.06)",
            }}>‹</button>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#434343" }}>{t("맞춤 진단", "Custom Diagnosis")}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#9A9A9E" }}>{qIdx + 1} / {QUESTIONS.length}</div>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: "#E4E4E4", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 99, background: C.accent, transition: "width .45s cubic-bezier(.2,.8,.3,1)", width: `${((qIdx + 1) / QUESTIONS.length) * 100}%` }} />
          </div>
        </div>
        <div ref={cRef} style={{
          flex: 1, overflowY: "auto", padding: "8px 20px 20px",
          opacity: anim ? 0 : 1, transform: anim ? "translateX(20px)" : "none",
          transition: "all 0.2s ease",
        }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", color: C.accent, marginBottom: 8 }}>
            {`SECTION ${q.sectionNum} · ${t(q.section)}`.toUpperCase()}
          </div>
          <div style={{ fontSize: 25, fontWeight: 800, lineHeight: 1.32, letterSpacing: -0.9, color: "#111", marginBottom: 6 }}>{t(q.question)}</div>
          {guide && <div style={{ fontSize: 14, color: "#8A8A8E", marginBottom: 20 }}>{t(guide)}</div>}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {q.options.map((opt, i) => {
              const sel = answers[qIdx] === i;
              return (
                <button key={i} onClick={() => pickAnswer(qIdx, i)} style={{
                  textAlign: "left", borderRadius: 18, padding: "18px 18px", cursor: "pointer", fontFamily: FONT,
                  display: "flex", alignItems: "center", gap: 14, transition: "all .16s",
                  background: sel ? "#FDF1EC" : "#fff", border: sel ? "1.5px solid #EA5C2A" : "1.5px solid transparent",
                  boxShadow: sel ? "none" : "0 1px 2px rgba(0,0,0,.05)",
                }}>
                  <span style={{
                    width: 26, height: 26, flex: "none", borderRadius: 99, display: "grid", placeItems: "center",
                    fontSize: 13, fontWeight: 800, color: sel ? "#fff" : "#8A8A8E", background: sel ? C.accent : "#F1F1F2",
                  }}>{sel ? "✓" : i + 1}</span>
                  <span style={{ flex: 1, fontSize: 15.5, fontWeight: 700, letterSpacing: -0.4, lineHeight: 1.45, color: sel ? "#7A3520" : "#111" }}>{t(opt.text)}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ flex: "none", padding: "14px 20px 10px", background: "#fff", borderTop: "1px solid #E4E4E4", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#8A8A8E" }}>{t("작성률", "Progress")}</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: "#111", letterSpacing: -0.6 }}>{Math.round((answeredCount / QUESTIONS.length) * 100)}%</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "#9A9A9E" }}>{answeredCount}/{QUESTIONS.length}</span>
            </div>
            <div style={{ height: 5, borderRadius: 99, background: "#E4E4E4", overflow: "hidden" }}>
              <div style={{ height: "100%", background: C.accent, transition: "width .5s cubic-bezier(.2,.8,.3,1)", width: `${(answeredCount / QUESTIONS.length) * 100}%` }} />
            </div>
          </div>
          <button onClick={nextQuestion} disabled={!isAnswered} style={{
            height: 50, padding: "0 22px", border: 0, borderRadius: 16, color: "#fff", fontSize: 15, fontWeight: 800,
            cursor: isAnswered ? "pointer" : "default", fontFamily: FONT, letterSpacing: -0.4, transition: "all .2s",
            background: isAnswered ? C.accent : "#D4D4D6",
          }}>{qIdx === QUESTIONS.length - 1 ? t("결과 보기", "See Results") : t("다음", "Next")}</button>
        </div>
      </div>
    );
  }

  // ━━━━━━━━━━ PHASE: RESULT (제조사 OS 앱.dc.html · 04 진단 결과 기준) ━━━━━━━━━━
  if (phase === "result" && scoring) {
    const best = SVC[recommended];
    const fillPct = Math.round((Object.keys(answers).length / QUESTIONS.length) * 100);

    return (
      <div style={{ ...wrap, background: "#F4F4F5" }}>
        <style>{css}</style>
        <div ref={cRef} style={{ flex: 1, overflowY: "auto" }}>
          {/* 다크 히어로 — 추천 서비스 (내부 진단 점수는 표시하지 않음, 서비스명만 안내) */}
          <div style={{ background: "#111", padding: "20px 24px 34px", color: "#fff" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <button onClick={() => { setPhase("quiz"); setQIdx(QUESTIONS.length - 1); }} style={{
                width: 32, height: 32, border: 0, borderRadius: 10, background: "rgba(255,255,255,.1)",
                color: "#fff", fontSize: 16, cursor: "pointer", fontFamily: FONT,
              }}>←</button>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#9A9A9E" }}>{t("맞춤 진단 결과", "Diagnosis Results")} · {t("작성률", "Progress")} {fillPct}%</div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", color: C.accent, marginBottom: 10 }}>{t("추천 서비스", "Recommended Service")}</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontSize: 60, fontWeight: 800, lineHeight: 0.9, letterSpacing: -3 }}>{recommended}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#8A8A8E", paddingBottom: 8 }}>{best.full}</div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.4, letterSpacing: -0.6, color: "#fff", marginTop: 16, whiteSpace: "pre-line" }}>{t(best.head)}</div>
            <div style={{ fontSize: 14, color: "#A0A0A4", marginTop: 10, lineHeight: 1.65 }}>{t(best.desc)}</div>
            <div style={{ marginTop: 18, padding: "14px 16px", borderRadius: 16, background: "#1C1C1F", border: "1px solid #2A2A2E", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: C.accent, width: 58, flex: "none", paddingTop: 1 }}>{t("권장 사항", "Requirements")}</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "#E4E4E4", lineHeight: 1.5, flex: 1 }}>{t(best.req)}</span>
            </div>
          </div>

          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, marginTop: -18 }}>
            {/* 진행할 서비스 선택 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "0 2px" }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#111", letterSpacing: -0.4 }}>{t("진행할 서비스 선택", "Choose a Service")}</span>
                <span style={{ fontSize: 12.5, color: "#8A8A8E", fontWeight: 600 }}>{t("추천과 다르게 선택 가능", "You can choose a different service than the one recommended")}</span>
              </div>
              {Object.entries(SVC).map(([code, s]) => {
                const isSel = chosen === code;
                const isRec = recommended === code;
                return (
                  <div key={code} onClick={() => setSelectedSvc(code)} style={{
                    textAlign: "left", borderRadius: 22, padding: 18, cursor: "pointer", fontFamily: FONT,
                    display: "flex", flexDirection: "column", gap: 12, transition: "transform .16s",
                    background: isSel ? "#fff" : "#fff", border: isSel ? `2px solid ${C.accent}` : "1.5px solid transparent",
                    boxShadow: "0 1px 2px rgba(0,0,0,.05)",
                  }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 9, width: "100%" }}>
                      <span style={{
                        width: 22, height: 22, flex: "none", borderRadius: 99, display: "grid", placeItems: "center",
                        fontSize: 12, fontWeight: 800, color: isSel ? "#fff" : "#B0B0B4",
                        background: isSel ? C.accent : "transparent", border: isSel ? "none" : "1.5px solid #D4D4D6",
                      }}>{isSel ? "✓" : ""}</span>
                      <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.5, color: "#111" }}>{code}</span>
                      {isRec && <span style={{ fontSize: 10.5, fontWeight: 800, padding: "3px 8px", borderRadius: 99, color: C.accent, background: "#FDF1EC" }}>{t("추천", "Recommended")}</span>}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.45, letterSpacing: -0.4, whiteSpace: "pre-line", color: "#111" }}>{t(s.head)}</span>
                    <span style={{ fontSize: 13.5, lineHeight: 1.6, color: "#8A8A8E" }}>{t(s.desc)}</span>
                    {isSel && (
                      <span style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10, paddingTop: 12, borderTop: "1px solid #EFEFF0" }}>
                        <span style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", color: C.accent }}>{t("고객 준비 범위", "What You Prepare")}</span>
                          <span style={{ fontSize: 13, lineHeight: 1.6, fontWeight: 600, color: "#434343" }}>{t(s.cust)}</span>
                        </span>
                        <span style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", color: "#8A8A8E" }}>{t("본사 제공 범위", "What We Provide")}</span>
                          <span style={{ fontSize: 13, lineHeight: 1.6, fontWeight: 600, color: "#434343" }}>{t(s.hq)}</span>
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 12, background: "#F7F7F8" }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: "#434343", flex: "none" }}>{t("권장 사항", "Requirements")}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#434343" }}>{t(s.req)}</span>
                        </span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 다음 단계 선택 */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "6px 2px 0" }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#111", letterSpacing: -0.4 }}>{t("다음 단계 선택", "Choose Next Step")}</span>
              <span style={{ fontSize: 12.5, color: "#8A8A8E", fontWeight: 600 }}>{chosen} {t("기준", "based")}</span>
            </div>

            <div style={{ background: "#fff", borderRadius: 22, padding: 20, boxShadow: "0 1px 2px rgba(0,0,0,.04)", border: `2px solid ${C.accent}`, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ fontSize: 11, fontWeight: 800, padding: "4px 9px", borderRadius: 99, background: C.accent, color: "#fff" }}>{t("권장", "Recommended")}</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#111", letterSpacing: -0.4 }}>{t("개발의뢰서까지 작성", "Complete the Development Request Form")}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "#434343", padding: "6px 11px", borderRadius: 10, background: "#F4F4F5" }}>{t("제조 품목 선택", "Select Products")}</span>
                <span style={{ fontSize: 11, color: "#C4C4C6", fontWeight: 800 }}>→</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "#434343", padding: "6px 11px", borderRadius: 10, background: "#F4F4F5" }}>{t("개발의뢰서", "Dev Request")}</span>
                <span style={{ fontSize: 11, color: "#C4C4C6", fontWeight: 800 }}>→</span>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: "#fff", padding: "6px 11px", borderRadius: 10, background: C.accent }}>{t("가견적", "Estimate")}</span>
              </div>
              <div style={{ borderRadius: 16, background: "#FDF1EC", border: "1px solid #F6D9CD", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ width: 20, height: 20, flex: "none", borderRadius: 99, background: C.accent, color: "#fff", fontSize: 12, fontWeight: 800, display: "grid", placeItems: "center" }}>!</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#7A3520", letterSpacing: -0.4 }}>{t("가견적 산출 안내", "About Preliminary Estimates")}</span>
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: "#7A3520" }}>{t("개발의뢰서 작성 시 가견적 산출이 가능합니다.", "A preliminary estimate becomes available once you complete the development request form.")}</div>
                <div style={{ fontSize: 13, color: "#8C5340", lineHeight: 1.65, fontWeight: 600 }}>
                  {t("가견적은 고객이 현재까지 제공한 제품 정보와 개발 조건을 기준으로 산출한 예상 견적입니다. 제형·원료·용기·패키지·생산수량 및 서비스 범위가 구체화되면 제조 조건도 함께 확정되므로, 최종 견적은 상담 및 검토를 거쳐 조정될 수 있습니다.", "The preliminary estimate is based on the product information and development conditions you've provided so far. As formulation, materials, containers, packaging, quantity, and service scope become more specific, manufacturing terms are also finalized — so the final quote may be adjusted after consultation and review.")}
                </div>
              </div>
              <button onClick={() => submitDiagnosis(true)} disabled={submitSt === "loading"} style={{
                height: 54, border: 0, borderRadius: 16, background: C.accent, color: "#fff", fontSize: 16, fontWeight: 800,
                cursor: "pointer", fontFamily: FONT, letterSpacing: -0.4, opacity: submitSt === "loading" ? 0.6 : 1,
              }}>{submitSt === "loading" ? t("저장 중...", "Saving...") : t("제조 품목 선택하기", "Select Products")}</button>
            </div>

            <div style={{ background: "#fff", borderRadius: 22, padding: 20, boxShadow: "0 1px 2px rgba(0,0,0,.04)", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#111", letterSpacing: -0.4 }}>{t("상담 먼저 진행", "Consult First")}</div>
              <div style={{ fontSize: 13.5, color: "#8A8A8E", lineHeight: 1.6, fontWeight: 600 }}>{t("제품 사양이 아직 정해지지 않은 경우. 담당자와 상담 후 개발의뢰서를 작성하며, 가견적은 의뢰서 작성 이후 산출됩니다.", "For when product specs aren't decided yet. You'll fill out the development request form after consulting with our team, and the estimate becomes available afterward.")}</div>
              <button onClick={() => submitDiagnosis(false)} disabled={submitSt === "loading"} style={{
                height: 50, border: "1.5px solid #E4E4E4", borderRadius: 16, background: "#fff", color: "#434343",
                fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: FONT, letterSpacing: -0.4,
              }}>{t("상담만 신청하기", "Request Consultation Only")}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ━━━━━━━━━━ PHASE: INFO (02 고객 정보 등록 — 진단 이전) ━━━━━━━━━━
  if (phase === "info") {
    return (
      <div style={{ ...wrap, background: "#F4F4F5" }}>
        <style>{css}</style>
        <div style={{ flex: "none", padding: "14px 20px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setPhase("intro")} style={backBtn}>←</button>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#111", letterSpacing: -0.8 }}>{t("고객 정보 등록", "Register Your Info")}</div>
              <div style={{ fontSize: 13.5, color: "#8A8A8E", marginTop: 3, fontWeight: 600 }}>{t("진단 전 1회만 입력하면 이후 문의에 자동 연결됩니다", "Enter this once before diagnosis — it's automatically linked to future inquiries")}</div>
            </div>
          </div>
        </div>
        <div ref={cRef} style={{ flex: 1, overflowY: "auto", padding: "2px 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>

          {/* 사업자 정보 */}
          <div style={card2}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#111", letterSpacing: -0.2 }}>{t("사업자 정보", "Business Information")}</div>
            <UField label={t("회사명", "Company Name")} req>
              <input value={form.businessName} placeholder={t("더마테스트 주식회사", "Dermatest Inc.")} onChange={e => setField("businessName", e.target.value)} style={uInpBig} />
              <Err f="businessName" />
            </UField>
            <UField label={t("대표자", "CEO")} req>
              <input value={form.ceoName} placeholder={t("이도현", "Dohyun Lee")} onChange={e => setField("ceoName", e.target.value)} style={uInp} />
              <Err f="ceoName" />
            </UField>
            <UField label={t("사업자 구분", "Business Type")} req>
              <div style={{ display: "flex", gap: 7 }}>
                {["법인", "개인", "예비창업"].map(v => (
                  <button key={v} onClick={() => setField("businessType", v)} style={toggle3(form.businessType === v)}>{t(v)}</button>
                ))}
              </div>
              <Err f="businessType" />
            </UField>
            <UField label={t("국가", "Country")} req>
              <select value={form.country} onChange={e => setField("country", e.target.value)} style={{ ...uInp, appearance: "none" }}>
                {COUNTRIES.map(c => <option key={c} value={c}>{t(c)}</option>)}
              </select>
            </UField>
            <UField label={t("03류 상표", "Class 3 Trademark")}>
              <div style={{ display: "flex", gap: 7 }}>
                {[{ v: "보유", l: "보유" }, { v: "출원중", l: "출원중" }, { v: "미보유", l: "미보유" }].map(({ v, l }) => (
                  <button key={v} onClick={() => setField("hasTrademark", v)} style={toggle3(form.hasTrademark === v)}>{t(l)}</button>
                ))}
              </div>
              <Err f="hasTrademark" />
            </UField>
            <UField label={t("화장품책임판매업 등록", "Cosmetics Distributor Registration")}>
              <div style={{ display: "flex", gap: 7 }}>
                {[{ v: "등록완료", l: "등록완료" }, { v: "등록예정", l: "등록예정" }, { v: "미등록", l: "미등록" }].map(({ v, l }) => (
                  <button key={v} onClick={() => setField("hasLicense", v)} style={toggle3(form.hasLicense === v)}>{t(l)}</button>
                ))}
              </div>
              <Err f="hasLicense" />
            </UField>
          </div>

          {/* 담당자 정보 */}
          <div style={card2}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#111", letterSpacing: -0.2 }}>{t("담당자 정보", "Contact Information")}</div>
            <UField label={t("이름", "Name")} req>
              <input value={form.name} placeholder={t("김예시", "Yeji Kim")} onChange={e => setField("name", e.target.value)} style={uInp} />
              <Err f="name" />
            </UField>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <UField label={t("부서", "Department")}>
                <input value={form.department} placeholder={t("마케팅팀", "Marketing")} onChange={e => setField("department", e.target.value)} style={uInp} />
              </UField>
              <UField label={t("직함", "Title")}>
                <input value={form.position} placeholder={t("대리", "Manager")} onChange={e => setField("position", e.target.value)} style={uInp} />
              </UField>
            </div>
            <UField label={t("연락처", "Phone")} req>
              <input value={form.phone} placeholder="010-1234-5678" type="tel" inputMode="tel"
                onChange={e => setField("phone", e.target.value.replace(/[^\d+\-() ]/g, ""))} style={uInp} />
              <Err f="phone" />
            </UField>
            <UField label={t("이메일", "Email")} req>
              <input value={form.email} placeholder="brand@dermatest.co.kr" type="email"
                onChange={e => { setField("email", e.target.value); setExistingCustomer(null); }}
                onBlur={lookupExisting} style={uInp} />
              <Err f="email" />
            </UField>
            {existingCustomer && !existingDismissed && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14, borderRadius: 14, background: "#EAF6F0", border: "1px solid #CBE7DA" }}>
                <span style={{ fontSize: 13, color: "#1F6B4A", fontWeight: 700, lineHeight: 1.5 }}>
                  {t(`${existingCustomer.contact.name}님, 등록된 고객으로 확인되었습니다 — 진단 없이 바로 진행할 수 있습니다.`, `Hi ${existingCustomer.contact.name}, we found you as a registered customer — you can skip diagnosis and continue right away.`)}
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setPhase("returning")} style={{
                    flex: 1, height: 40, border: 0, borderRadius: 10, background: "#1F6B4A", color: "#fff",
                    fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: FONT,
                  }}>{t("이전 정보로 진행", "Continue with Previous Info")}</button>
                  <button onClick={() => setExistingDismissed(true)} style={{
                    flex: "none", height: 40, padding: "0 14px", border: "1px solid #CBE7DA", borderRadius: 10, background: "transparent",
                    color: "#1F6B4A", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT,
                  }}>{t("새로 입력할게요", "I'll Enter New Info")}</button>
                </div>
              </div>
            )}
          </div>

          {/* 주요 유통국가 + 문의 경로 */}
          <div style={card2}>
            <UField label={t("주요 유통국가", "Main Distribution Countries")} req>
              <span style={{ fontWeight: 400, fontSize: 12, color: "#B0B0B4", marginLeft: 4 }}>{t("복수 선택", "Multiple selection")}</span>
            </UField>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: -8 }}>
              {COUNTRIES.map(c => (
                <button key={c} onClick={() => toggleDist(c)} style={pill2(form.distributionCountries.includes(c))}>{t(c)}</button>
              ))}
            </div>
            <Err f="distributionCountries" />
            <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#111", letterSpacing: -0.2 }}>{t("문의 경로", "How You Found Us")}</div>
              <div style={{ fontSize: 12, color: "#8A8A8E", fontWeight: 600 }}>{t("더마셀렉스를 알게 된 경로를 하나만 선택해 주세요", "Please select the one way you found out about DERMACELLEX")}</div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {["검색엔진", "SNS", "온라인광고", "제품·제조사검색", "제품레퍼런스", "지인·업계추천", "기존고객·재문의", "박람회·전시회", "세미나·교육", "영업담당자", "파트너·협력사", "B2B플랫폼", "언론·콘텐츠", "기타"].map(s => (
                <button key={s} onClick={() => setField("inquirySource", s)} style={pill2(form.inquirySource === s)}>{t(s)}</button>
              ))}
            </div>
          </div>

        </div>

        <div style={{ flex: "none", padding: "12px 20px", background: "#fff", borderTop: "1px solid #E4E4E4" }}>
          <button onClick={registerCustomer} disabled={submitSt === "loading"} style={{
            width: "100%", height: 52, border: 0, borderRadius: 16, background: submitSt === "error" ? C.error : "#111",
            color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: FONT, letterSpacing: -0.4,
            opacity: submitSt === "loading" ? 0.6 : 1,
          }}>
            {submitSt === "loading" ? t("저장 중...", "Saving...") : submitSt === "error" ? t("오류 — 잠시 후 재시도", "Error — please try again") : t("진단 시작", "Start Diagnosis")}
          </button>
        </div>
      </div>
    );
  }

  // ━━━━━━━━━━ PHASE: RETURNING (제조사 OS 앱.dc.html · 08 기존 고객 재문의 기준) ━━━━━━━━━━
  // md 3.3절: 기존 고객은 진단을 다시 하지 않는다. 이메일로 이미 확인된 거래처 · 담당자를
  // 재사용해 새 제조 문의만 만들고, 04번 화면과 같은 "품목 먼저 vs 상담 먼저" 분기로 곧장 간다.
  if (phase === "returning" && existingCustomer) {
    const { client, contact, stats, history } = existingCustomer;
    const initial = (client.name || "?").trim().charAt(0);
    const statusColor = (s) => (
      s === "완료" || s === "프로젝트 전환" ? { fg: "#1E7A46", bg: "#E7F5EC" } :
      s === "종료" || s === "14일 내 미날인 종료" ? { fg: "#8A8A8E", bg: "#EFEFF0" } :
      { fg: "#B0562A", bg: "#FDF1EC" }
    );
    return (
      <div style={{ ...wrap, background: "#F4F4F5" }}>
        <style>{css}</style>
        <div ref={cRef} style={{ flex: 1, overflowY: "auto", padding: "14px 20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {portalData && (
              <button onClick={() => setPhase("portal")} style={backBtn}>←</button>
            )}
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#111", letterSpacing: -0.8 }}>{t("다시 오셨네요", "Welcome Back")}</div>
              <div style={{ fontSize: 13.5, color: "#8A8A8E", marginTop: 5, fontWeight: 600 }}>{t("등록된 거래처로 확인되어 진단을 건너뜁니다", "You're a registered customer, so diagnosis is skipped")}</div>
            </div>
          </div>

          <div style={{ background: "#111", borderRadius: 22, padding: 20, color: "#fff", display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 46, height: 46, borderRadius: 14, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 800, flex: "none" }}>{initial}</span>
              <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.4 }}>{client.name}</span>
                <span style={{ fontSize: 12.5, color: "#9A9A9E", fontWeight: 600 }}>{[contact.name, contact.position, contact.department].filter(Boolean).join(" · ")}</span>
              </span>
              <span style={{ fontSize: 11, fontWeight: 800, padding: "5px 10px", borderRadius: 99, background: "#2A2A2E", color: "#E4E4E4", flex: "none" }}>{t("기존", "Returning")}</span>
            </div>
            <div style={{ display: "flex", gap: 10, paddingTop: 16, borderTop: "1px solid #2A2A2E" }}>
              {[[t("누적 문의", "Total Inquiries"), stats.totalInquiries], [t("진행 프로젝트", "Active Projects"), stats.activeProjects], [t("출시 품목", "Launched Products"), stats.shippedProducts]].map(([label, n]) => (
                <div key={label} style={{ flex: 1 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.6 }}>{n}</div>
                  <div style={{ fontSize: 11.5, color: "#8A8A8E", fontWeight: 600, marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, padding: "14px 16px", borderRadius: 16, background: "#EAF6F0", border: "1px solid #CBE7DA" }}>
            <span style={{ fontSize: 13, color: "#1F6B4A", fontWeight: 700, lineHeight: 1.5 }}>{t("맞춤 진단 생략 · 거래처와 담당자 정보 자동 연결됨", "Diagnosis skipped · Your company and contact info are linked automatically")}</span>
          </div>

          {history.length > 0 && (
            <>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#111", marginTop: 2 }}>{t("이전 문의 이어가기", "Continue a Previous Inquiry")}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {history.map((h, i) => {
                  const sc = statusColor(h.status);
                  return (
                    <div key={i} style={{ borderRadius: 18, padding: 16, background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.05)", display: "flex", flexDirection: "column", gap: 9 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, fontFamily: "ui-monospace, monospace", color: "#8A8A8E" }}>{h.uid}</span>
                        <span style={{ fontSize: 10.5, fontWeight: 800, padding: "2px 8px", borderRadius: 99, color: sc.fg, background: sc.bg }}>{h.status ? t(h.status) : "-"}</span>
                      </span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: "#111", letterSpacing: -0.4 }}>{h.type ? t(h.type) : t("제조 문의", "Manufacturing Inquiry")}</span>
                      <span style={{ fontSize: 12.5, color: "#8A8A8E", fontWeight: 600 }}>{h.createdAt ? new Date(h.createdAt).toLocaleDateString(lang === "en" ? "en-US" : "ko") : "-"}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div style={{
            marginTop: 4, borderRadius: 18, padding: 18, background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.05)",
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#111" }}>{t("새 제조 문의 시작하기", "Start a New Inquiry")}</div>
            <button onClick={() => registerExisting(true)} disabled={submitSt === "loading"} style={{
              height: 54, border: 0, borderRadius: 16, background: C.accent, color: "#fff",
              fontSize: 15.5, fontWeight: 800, cursor: "pointer", fontFamily: FONT, letterSpacing: -0.3,
              opacity: submitSt === "loading" ? 0.6 : 1,
            }}>{t("제조 품목 선택부터 시작", "Start with Product Selection")}</button>
            <button onClick={() => registerExisting(false)} disabled={submitSt === "loading"} style={{
              height: 54, border: "1.5px solid #E4E4E4", borderRadius: 16, background: "#fff", color: "#434343",
              fontSize: 15.5, fontWeight: 800, cursor: "pointer", fontFamily: FONT, letterSpacing: -0.3,
              opacity: submitSt === "loading" ? 0.6 : 1,
            }}>{submitSt === "loading" ? t("처리 중...", "Processing...") : t("상담부터 받을게요", "I'd Like to Consult First")}</button>
          </div>
        </div>
      </div>
    );
  }

  // ━━━━━━━━━━ PHASE: ITEMS (제조사 OS 앱.dc.html · 05 제조 품목 검색 · 선택 기준) ━━━━━━━━━━
  // 노션 "제조 품목" DB에서 '활성' · '고객 앱 노출' 둘 다 체크된 항목만 불러온다(/api/catalog).
  // 06번 화면(기획개발의뢰서 4단계 마법사 — 콘셉트 키워드 · 원료 · 용기 · 일정 등)은 아직 없어서,
  // 우선 선택한 품목별로 최소 정보(품목명·대분류·제형)만 담아 개발의뢰서를 바로 생성한다.
  if (phase === "items") {
    const q = catalogQuery.trim().toLowerCase();
    const searching = q.length > 0;

    // 대분류 → 제품군 → 품목 순으로 단계별로 좁혀가며 고른다(검색어를 입력하면 단계 무시하고 바로 전체에서 찾는다).
    const cats = Array.from(new Set(catalog.map(it => it.category).filter(Boolean)));
    const catCount = c => catalog.filter(it => it.category === c).length;
    const groupsInCat = Array.from(new Set(catalog.filter(it => it.category === catalogCat).map(it => it.group).filter(Boolean)));
    const groupCount = g => catalog.filter(it => it.category === catalogCat && it.group === g).length;

    const filtered = catalog.filter(it => {
      if (searching) return [it.name, it.category, it.group, it.form, it.desc].some(v => (v || "").toLowerCase().includes(q));
      if (catalogCat !== "전체" && it.category !== catalogCat) return false;
      if (catalogGroup !== "전체" && catalogGroup !== "__all__" && it.group !== catalogGroup) return false;
      return true;
    });

    const isPicked = id => pickedItems.some(p => p.id === id);
    const toggleItem = (it) => {
      if (it.status === "불가" || it.status === "중단") return;
      setPickedItems(prev => isPicked(it.id) ? prev.filter(p => p.id !== it.id) : [...prev, it]);
    };
    const statusColor = (s) => (
      s === "가능" ? { fg: "#1E7A46", bg: "#E7F5EC" } :
      s === "조건부 검토" ? { fg: "#8A6D1B", bg: "#FBF2D6" } :
      s === "검토 필요" ? { fg: "#B0562A", bg: "#FDF1EC" } :
      { fg: "#8A8A8E", bg: "#EFEFF0" }
    );
    const pickCat = (c) => { setCatalogCat(c); setCatalogGroup("전체"); };
    const backTo = (level) => { if (level === "cats") { setCatalogCat("전체"); setCatalogGroup("전체"); } else if (level === "groups") setCatalogGroup("전체"); };

    // 검색 중이 아닐 때: 대분류 미선택 → 대분류 목록, 대분류만 선택 → 제품군 목록, 둘 다 선택 → 품목 목록
    const level = searching ? "items" : catalogCat === "전체" ? "cats" : catalogGroup === "전체" && groupsInCat.length > 0 ? "groups" : "items";

    const ItemRow = ({ it }) => {
      const sel = isPicked(it.id);
      const sc = statusColor(it.status);
      const blocked = it.status === "불가" || it.status === "중단";
      return (
        <button onClick={() => toggleItem(it)} disabled={blocked} style={{
          textAlign: "left", borderRadius: 18, padding: "15px 16px", cursor: blocked ? "not-allowed" : "pointer", fontFamily: FONT,
          display: "flex", gap: 13, alignItems: "center", transition: "border-color .2s",
          background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.05)",
          border: sel ? `1.5px solid ${C.accent}` : "1.5px solid transparent", opacity: blocked ? 0.5 : 1,
        }}>
          {it.image ? (
            <img src={it.image} alt="" style={{ width: 44, height: 44, flex: "none", borderRadius: 14, objectFit: "cover" }} />
          ) : (
            <span style={{ width: 44, height: 44, flex: "none", borderRadius: 14, background: "repeating-linear-gradient(135deg,#E4E4E4 0 6px,#EFEFF0 6px 12px)" }} />
          )}
          <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 15.5, fontWeight: 800, color: "#111", letterSpacing: -0.3 }}>{it.name}</span>
              <span style={{ fontSize: 10.5, fontWeight: 800, padding: "2px 7px", borderRadius: 99, color: sc.fg, background: sc.bg, flex: "none" }}>{t(it.status)}</span>
            </span>
            <span style={{ fontSize: 12.5, color: "#8A8A8E", fontWeight: 600, ...clamp(1) }}>
              {[it.category, it.group].filter(v => v && v !== it.name).join(" · ")}
            </span>
            {it.desc && <span style={{ fontSize: 12, color: "#B0B0B4", fontWeight: 500, lineHeight: 1.45, ...clamp(3) }}>{it.desc}</span>}
          </span>
          <span style={{
            width: 24, height: 24, flex: "none", borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 800, color: sel ? "#fff" : "#C4C4C6",
            background: sel ? C.accent : "transparent", border: sel ? "none" : "1.5px solid #E4E4E4",
          }}>{sel ? "✓" : ""}</span>
        </button>
      );
    };

    return (
      <div style={{ ...wrap, background: "#F4F4F5" }}>
        <style>{css}</style>
        <div ref={cRef} style={{ flex: 1, overflowY: "auto", padding: "14px 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {phaseStack.length > 0 && <button onClick={goBack} style={backBtn}>←</button>}
            <div style={{ fontSize: 22, fontWeight: 800, color: "#111", letterSpacing: -0.8 }}>{t("제조 가능 품목", "Available Products")}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, height: 50, padding: "0 16px", background: "#fff", borderRadius: 16, boxShadow: "0 1px 2px rgba(0,0,0,.05)" }}>
            <span style={{ fontSize: 15, color: "#B0B0B4" }}>⌕</span>
            <input value={catalogQuery} onChange={e => setCatalogQuery(e.target.value)} placeholder={t("품목 · 제품군 · 제형 검색", "Search products, categories, formulations")}
              style={{ flex: 1, border: 0, outline: "none", fontSize: 15, fontWeight: 600, fontFamily: FONT, color: "#111", background: "transparent" }} />
            {searching && (
              <button onClick={() => setCatalogQuery("")} style={{ border: 0, background: "none", color: "#B0B0B4", fontSize: 16, cursor: "pointer", padding: 2 }}>✕</button>
            )}
          </div>

          {level === "cats" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {cats.map(c => (
                <button key={c} onClick={() => pickCat(c)} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", textAlign: "left",
                  borderRadius: 18, padding: "17px 18px", cursor: "pointer", fontFamily: FONT,
                  background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.05)", border: "1.5px solid transparent",
                }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: "#111", letterSpacing: -0.3 }}>{t(c)}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12.5, color: "#8A8A8E", fontWeight: 700 }}>{lang === "en" ? `${catCount(c)}` : `${catCount(c)}개`}</span>
                    <span style={{ color: "#C4C4C6", fontSize: 16 }}>›</span>
                  </span>
                </button>
              ))}
              {cats.length === 0 && (
                <div style={{ padding: "40px 0", textAlign: "center", fontSize: 14, color: "#9A9A9E", fontWeight: 600 }}>{t("품목을 불러오는 중...", "Loading products...")}</div>
              )}
            </div>
          )}

          {level === "groups" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => backTo("cats")} style={{
                  width: 32, height: 32, border: 0, borderRadius: 10, background: "#fff",
                  color: "#434343", fontSize: 16, cursor: "pointer", fontFamily: FONT, boxShadow: "0 1px 2px rgba(0,0,0,.06)",
                }}>‹</button>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#111" }}>{t(catalogCat)}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                <button onClick={() => setCatalogGroup("__all__")} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", textAlign: "left",
                  borderRadius: 18, padding: "15px 18px", cursor: "pointer", fontFamily: FONT,
                  background: "#111", border: "1.5px solid transparent",
                }}>
                  <span style={{ fontSize: 14.5, fontWeight: 800, color: "#fff" }}>{t("전체 제품군 보기", "View All Categories")}</span>
                  <span style={{ fontSize: 12.5, color: "#9A9A9E", fontWeight: 700 }}>{lang === "en" ? `${catCount(catalogCat)}` : `${catCount(catalogCat)}개`}</span>
                </button>
                {groupsInCat.map(g => (
                  <button key={g} onClick={() => setCatalogGroup(g)} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", textAlign: "left",
                    borderRadius: 18, padding: "15px 18px", cursor: "pointer", fontFamily: FONT,
                    background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.05)", border: "1.5px solid transparent",
                  }}>
                    <span style={{ fontSize: 14.5, fontWeight: 700, color: "#111" }}>{t(g)}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12.5, color: "#8A8A8E", fontWeight: 700 }}>{lang === "en" ? `${groupCount(g)}` : `${groupCount(g)}개`}</span>
                      <span style={{ color: "#C4C4C6", fontSize: 16 }}>›</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {level === "items" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {!searching && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={() => backTo(groupsInCat.length > 0 ? "groups" : "cats")} style={{
                    width: 32, height: 32, border: 0, borderRadius: 10, background: "#fff",
                    color: "#434343", fontSize: 16, cursor: "pointer", fontFamily: FONT, boxShadow: "0 1px 2px rgba(0,0,0,.06)",
                  }}>‹</button>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#111" }}>
                    {t(catalogCat)}{catalogGroup !== "__all__" && catalogGroup !== "전체" ? ` · ${t(catalogGroup)}` : ""}
                  </span>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {filtered.map(it => <ItemRow key={it.id} it={it} />)}
                {filtered.length === 0 && (
                  <div style={{ padding: "40px 0", textAlign: "center", fontSize: 14, color: "#9A9A9E", fontWeight: 600 }}>
                    {t("검색 결과 없음 · 담당자 확인 요청 가능", "No results · You can request a manual check from our team")}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div style={{ flex: "none", padding: "14px 20px", background: "#111", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
            <span style={{ fontSize: 12, color: "#9A9A9E", fontWeight: 600 }}>{t("선택한 품목", "Selected Products")}</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: -0.3, lineHeight: 1.4, ...clamp(2) }}>
              {pickedItems.length === 0 ? t("품목을 선택해주세요", "Please select a product") : pickedItems.map(p => p.name).join(", ")}
            </span>
          </div>
          <button onClick={goToDevDetail} disabled={pickedItems.length === 0} style={{
            height: 48, padding: "0 22px", border: 0, borderRadius: 16, background: C.accent, color: "#fff",
            fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: FONT, transition: "opacity .18s",
            opacity: pickedItems.length === 0 ? 0.5 : 1, flex: "none",
          }}>{t(`의뢰서 ${pickedItems.length}건 작성하기`, `Fill Out ${pickedItems.length} Request${pickedItems.length === 1 ? "" : "s"}`)}</button>
        </div>
      </div>
    );
  }

  // ━━━━━━━━━━ PHASE: DEVDETAIL (제조사 OS 앱.dc.html · 06 기획개발의뢰서 — 노션 전체 필드 기준) ━━━━━━━━━━
  // "05 품목 선택 → 06 상세 작성(4단계) → 07 상담 일정" 순서. 원본 디자인의 화려한 원료·용기
  // 비주얼 피커까지는 아니지만, 노션 제품개발의뢰서에 실제로 있는 입력 가능 속성은 모두 담았다.
  if (phase === "devdetail" && devForms.length > 0) {
    const d = devForms[devIdx];
    const isLastItem = devIdx === devForms.length - 1;
    const isLastStep = devStep === DEV_FIELD_GROUPS.length - 1;
    const group = DEV_FIELD_GROUPS[devStep];

    const goPrev = () => {
      if (devStep > 0) setDevStep(s => s - 1);
      else if (devIdx > 0) { setDevIdx(i => i - 1); setDevStep(DEV_FIELD_GROUPS.length - 1); }
      else goBack();
    };
    const goNext = () => {
      if (!isLastStep) { setDevStep(s => s + 1); return; }
      if (!isLastItem) { setDevIdx(i => i + 1); setDevStep(0); return; }
      submitDevDetails();
    };

    return (
      <div style={{ ...wrap, background: "#F4F4F5" }}>
        <style>{css}</style>
        <div style={{ flex: "none", padding: "14px 20px 0" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 11 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: "#111", letterSpacing: -0.7 }}>
              {t("기획개발의뢰서", "Development Request Form")}{editingPageId ? t(" 수정", " Edit") : ""}
            </span>
            {!editingPageId && <span style={{ fontSize: 12.5, fontWeight: 800, color: C.accent }}>{devIdx + 1} / {devForms.length}</span>}
          </div>
          <div style={{ display: editingPageId ? "none" : "flex", gap: 7, overflowX: "auto", paddingBottom: 10 }}>
            {devForms.map((f, i) => {
              const active = i === devIdx;
              return (
                <div key={f.itemId || i} style={{
                  flex: "none", borderRadius: 14, cursor: "pointer", background: active ? "#111" : "#fff",
                  border: active ? "1.5px solid #111" : "1.5px solid transparent",
                  display: "flex", alignItems: "center",
                }}>
                  <button onClick={() => { setDevIdx(i); setDevStep(0); }} style={{
                    border: 0, background: "transparent", padding: "9px 4px 9px 13px", cursor: "pointer",
                    fontFamily: FONT, textAlign: "left",
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: active ? "#8A8A8E" : "#B0B0B4", fontFamily: "ui-monospace, monospace" }}>DEV-{String(i + 1).padStart(2, "0")}</div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: active ? "#fff" : "#111", whiteSpace: "nowrap" }}>{f.productName}</div>
                  </button>
                  {devForms.length > 1 && (
                    <button onClick={() => removeDevItem(i)} title={t("이 품목 빼기", "Remove this product")} style={{
                      border: 0, background: "transparent", cursor: "pointer", fontFamily: FONT,
                      padding: "0 11px 0 5px", fontSize: 13, color: active ? "#8A8A8E" : "#C4C4C6",
                    }}>✕</button>
                  )}
                </div>
              );
            })}
            <button onClick={() => go("items")} style={{
              flex: "none", borderRadius: 14, padding: "9px 15px", cursor: "pointer", fontFamily: FONT,
              background: "transparent", border: "1.5px dashed #C4C4C6", color: "#434343",
              fontSize: 13, fontWeight: 800, whiteSpace: "nowrap",
            }}>{t("+ 품목 추가", "+ Add Product")}</button>
          </div>
          <div style={{ display: "flex", gap: 4, paddingBottom: 12, marginBottom: 2 }}>
            {DEV_FIELD_GROUPS.map((g, i) => (
              <span key={g.title} style={{ flex: 1, height: 4, borderRadius: 99, background: i <= devStep ? C.accent : "#E4E4E4", transition: "background .3s" }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 12 }}>
            {DEV_FIELD_GROUPS.map((g, i) => (
              <button key={g.title} onClick={() => setDevStep(i)} style={{
                flex: "none", border: 0, background: i === devStep ? "#111" : "#EFEFF0", borderRadius: 99,
                cursor: "pointer", fontFamily: FONT, padding: "7px 13px", whiteSpace: "nowrap",
                fontSize: 12, fontWeight: 800, color: i === devStep ? "#fff" : "#8A8A8E",
              }}>{i + 1}. {t(g.title)}</button>
            ))}
          </div>
        </div>
        <div ref={cRef} style={{ flex: 1, overflowY: "auto", padding: "6px 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={card2}>
            {group.fields.filter(f => !f.showIf || f.showIf(d)).map(f => (
              <DevField key={f.key} f={f} value={d[f.key]} form={d} skinTypes={skinTypes}
                onChange={(k, v) => updateDevField(devIdx, k, v)} />
            ))}
          </div>
        </div>
        <div style={{ flex: "none", padding: "12px 20px", background: "#fff", borderTop: "1px solid #E4E4E4", display: "flex", gap: 10 }}>
          {(devStep > 0 || devIdx > 0) && (
            <button onClick={goPrev} style={{
              height: 52, padding: "0 20px", border: "1.5px solid #E4E4E4", borderRadius: 16, background: "#fff",
              color: "#434343", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: FONT,
            }}>{t("이전", "Back")}</button>
          )}
          <button
            onClick={goNext}
            disabled={!d.productName.trim() || submitSt === "loading"}
            style={{
              flex: 1, height: 52, border: 0, borderRadius: 16, background: submitSt === "error" ? C.error : "#111",
              color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: FONT,
              opacity: (!d.productName.trim() || submitSt === "loading") ? 0.6 : 1,
            }}>
            {submitSt === "loading" ? t("저장 중...", "Saving...") : submitSt === "error" ? t("오류 — 잠시 후 재시도", "Error — please try again") :
              !isLastStep ? t("다음", "Next") : !isLastItem ? t("다음 품목", "Next Product") :
                editingPageId ? t("수정 내용 저장", "Save Changes") : t(`의뢰서 ${devForms.length}건 제출하고 상담 신청`, `Submit ${devForms.length} Request${devForms.length === 1 ? "" : "s"} & Request Consultation`)}
          </button>
        </div>
      </div>
    );
  }

  // ━━━━━━━━━━ PHASE: MEETING (제조사 OS 앱.dc.html · 07 상담 일정 기준) ━━━━━━━━━━
  // 실제 담당자 캘린더·6자리 접근 코드 발급(고객 페이지 접근 이력 DB)은 아직 없어,
  // 슬롯 선택 UI만 디자인대로 만들고 코드 카드는 다음 단계로 남겨둔다.
  if (phase === "meeting") {
    const slot1Booked = isSlotBooked(bookedSlots, form.meetingDate1, form.meetingTime1);
    const slot2Booked = isSlotBooked(bookedSlots, form.meetingDate2, form.meetingTime2);
    const todayStr = new Date().toISOString().slice(0, 10);
    const holiday1 = isWeekendOrHoliday(form.meetingDate1);
    const holiday2 = isWeekendOrHoliday(form.meetingDate2);

    const timeSelect = (dateVal, timeVal, onChange) => (
      <select value={timeVal || ""} onChange={e => onChange(e.target.value)} style={uInp}>
        <option value="">{t("시간 선택", "Select time")}</option>
        {TIME_SLOTS.map(tm => {
          const booked = isSlotBooked(bookedSlots, dateVal, tm);
          return <option key={tm} value={tm} disabled={booked}>{tm}{booked ? t(" (예약됨)", " (booked)") : ""}</option>;
        })}
      </select>
    );

    return (
      <div style={{ ...wrap, background: "#F4F4F5" }}>
        <style>{css}</style>
        <div ref={cRef} style={{ flex: 1, overflowY: "auto", padding: "14px 20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {phaseStack.length > 0 && <button onClick={goBack} style={backBtn}>←</button>}
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#111", letterSpacing: -0.8 }}>{t("제조 상담 일정", "Consultation Schedule")}</div>
              <div style={{ fontSize: 13.5, color: "#8A8A8E", marginTop: 5, fontWeight: 600 }}>
                {t("담당자 배정 예정 · 30분 · Zoom", "A team member will be assigned · 30 min · Zoom")}{form.willWriteDoc ? t(" · 개발의뢰서는 상담 후 별도 안내", " · The development request form will be arranged after the consultation") : ""}
              </div>
            </div>
          </div>

          <div style={card2}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#111" }}>{t("희망 상담 일정", "Preferred Consultation Times")}</div>
            <div style={{ fontSize: 12, color: "#8A8A8E", fontWeight: 600, marginTop: -8 }}>
              {t("담당자가 확인 후 두 일정 중 하나로 최종 확정해 안내드립니다. 이미 예약된 시간은 선택할 수 없습니다.", "Our team will review and confirm one of the two times. Already-booked slots can't be selected.")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 2 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#8A8A8E", marginBottom: 6 }}>{t("희망 미팅일 1 (필수)", "Preferred Date 1 (Required)")}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="date" min={todayStr} value={form.meetingDate1} onChange={e => setField("meetingDate1", e.target.value)}
                    style={{ ...uInp, borderBottom: `1.5px solid ${(errors.meetingDate1 || holiday1) ? C.error : "#E4E4E4"}` }} />
                  {timeSelect(form.meetingDate1, form.meetingTime1, v => setField("meetingTime1", v))}
                </div>
                {holiday1 && <div style={{ fontSize: 11.5, color: C.error, fontWeight: 700, marginTop: 6 }}>{t("주말 · 공휴일은 선택할 수 없습니다. 평일을 선택해주세요.", "Weekends and holidays can't be selected. Please choose a weekday.")}</div>}
                {!holiday1 && slot1Booked && <div style={{ fontSize: 11.5, color: C.error, fontWeight: 700, marginTop: 6 }}>{t("이미 예약된 시간입니다. 다른 시간을 선택해주세요.", "This time is already booked. Please choose another.")}</div>}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#8A8A8E", marginBottom: 6 }}>{t("희망 미팅일 2 (선택)", "Preferred Date 2 (Optional)")}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="date" min={todayStr} value={form.meetingDate2} onChange={e => setField("meetingDate2", e.target.value)}
                    style={{ ...uInp, borderBottom: `1.5px solid ${holiday2 ? C.error : "#E4E4E4"}` }} />
                  {timeSelect(form.meetingDate2, form.meetingTime2, v => setField("meetingTime2", v))}
                </div>
                {holiday2 && <div style={{ fontSize: 11.5, color: C.error, fontWeight: 700, marginTop: 6 }}>{t("주말 · 공휴일은 선택할 수 없습니다. 평일을 선택해주세요.", "Weekends and holidays can't be selected. Please choose a weekday.")}</div>}
                {!holiday2 && slot2Booked && <div style={{ fontSize: 11.5, color: C.error, fontWeight: 700, marginTop: 6 }}>{t("이미 예약된 시간입니다. 다른 시간을 선택해주세요.", "This time is already booked. Please choose another.")}</div>}
              </div>
            </div>
            <Err f="meetingDate1" />
          </div>

          <div style={card2}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#111" }}>{t("사전 확인 사항", "Good to Prepare")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                t("브랜드 콘셉트 자료 · 벤치마크 제품 정보", "Brand concept materials · Benchmark product info"),
                t("목표 판매가 · 유통 채널 · 예상 물량", "Target price · Distribution channels · Expected volume"),
                t("수출 예정 국가 및 인증 요구사항", "Target export countries and certification requirements"),
              ].map((txt, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: C.accent, marginTop: 7, flex: "none" }} />
                  <span style={{ fontSize: 13.5, color: "#434343", lineHeight: 1.5, fontWeight: 600 }}>{txt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ flex: "none", padding: "12px 20px", background: "#fff", borderTop: "1px solid #E4E4E4" }}>
          <button onClick={submitMeeting} disabled={submitSt === "loading" || slot1Booked || slot2Booked || holiday1 || holiday2} style={{
            width: "100%", height: 52, border: 0, borderRadius: 16, background: submitSt === "error" ? C.error : "#111",
            color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: FONT, letterSpacing: -0.4,
            opacity: (submitSt === "loading" || slot1Booked || slot2Booked || holiday1 || holiday2) ? 0.6 : 1,
          }}>
            {submitSt === "loading" ? t("제출 중...", "Submitting...") : submitSt === "error" ? t("오류 — 잠시 후 재시도", "Error — please try again") : t("상담 신청하기", "Request Consultation")}
          </button>
        </div>
      </div>
    );
  }

  // ━━━━━━━━━━ PHASE: COMPLETE ━━━━━━━━━━
  if (phase === "complete") {
    return (
      <div style={wrap}>
        <style>{css}</style>
        <div style={hdr}>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.accent }}>DERMACELLEX</div>
          <div />
        </div>
        <div ref={cRef} style={{ ...body, padding: "40px 24px" }}>
          {/* Success */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%", margin: "0 auto 20px",
              background: `${C.success}12`, display: "flex", alignItems: "center",
              justifyContent: "center",
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 12px", color: C.text }}>{t("접수가 완료되었습니다", "Your Request Has Been Received")}</h2>
            <p style={{ fontSize: 15, color: C.textSub, lineHeight: 1.7 }}>
              {t("아래", "Use the")} <strong style={{ color: C.text }}>{t("전용 페이지 접속 코드", "portal access code")}</strong>{t("로", " below")}<br />
              {t("진행 상황을 바로 확인하실 수 있습니다.", "to check your progress anytime.")}
            </p>
          </div>

          {/* 전용 페이지 접속 코드 */}
          {accessCode && (
            <div style={{
              background: "#111", borderRadius: 18, padding: "22px 20px", marginBottom: 20,
              display: "flex", flexDirection: "column", gap: 14, alignItems: "center", textAlign: "center",
            }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "#9A9A9E" }}>{t("전용 페이지 접속 코드 · 이메일과 함께 사용", "Portal access code · Use together with your email")}</span>
              <span style={{ fontSize: 34, fontWeight: 800, color: "#fff", letterSpacing: 6, fontFamily: "ui-monospace, monospace" }}>{accessCode}</span>
              <button onClick={() => {
                navigator.clipboard?.writeText(accessCode).then(() => {
                  setCodeCopied(true);
                  setTimeout(() => setCodeCopied(false), 2000);
                }).catch(() => {});
              }} style={{
                background: "none", border: "1px solid #2E2E32", borderRadius: 99, padding: "5px 14px",
                color: "#E4E4E4", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT,
              }}>{codeCopied ? t("복사됨 ✓", "Copied ✓") : t("코드 복사", "Copy Code")}</button>
              <span style={{ fontSize: 12, color: "#8A8A8E", fontWeight: 600 }}>
                {codeEmailed ? t("담당자 이메일로도 발송되었습니다 · 이 화면에서는 지금 한 번만 표시됩니다", "Also sent to your email · This is the only time it's shown on screen") : t("이 코드는 지금 한 번만 표시됩니다 · 꼭 저장해주세요", "This code is shown only once · Please be sure to save it")}
              </span>
              <button onClick={() => setPhase("portal-login")} style={{
                width: "100%", height: 48, border: 0, borderRadius: 14, background: C.accent, color: "#fff",
                fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: FONT, marginTop: 4,
              }}>{t("전용 페이지 바로가기", "Go to My Portal")}</button>
            </div>
          )}

          {/* Summary */}
          <div style={{
            background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`,
            padding: 20, marginBottom: 20,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, letterSpacing: 1, marginBottom: 14 }}>{t("접수 요약", "Submission Summary")}</div>
            {[
              [t("선택 서비스", "Service"), `${chosen} · ${SVC[chosen].full}`],
              [t("담당자", "Contact"), form.name],
              [t("이메일", "Email"), form.email],
              [t("연락처", "Phone"), form.phone],
              [t("사업자", "Business"), `${t(form.businessType)} · ${form.businessName}`],
              [t("상표", "Trademark"), t(form.hasTrademark)],
              [t("책임판매업", "Distributor License"), t(form.hasLicense)],
              [t("주요 유통국가", "Main Distribution Countries"), form.distributionCountries.map(c => t(c)).join(", ")],
              [t("개발의뢰서", "Dev Request Form"), form.willWriteDoc ? t("작성 예정", "To be completed") : t("미작성 (상담 우선)", "Not yet (consultation first)")],
              [t("미팅 1안", "Meeting Option 1"), form.meetingDate1 ? new Date(form.meetingDate1).toLocaleString(lang === "en" ? "en-US" : "ko") : "-"],
              [t("미팅 2안", "Meeting Option 2"), form.meetingDate2 ? new Date(form.meetingDate2).toLocaleString(lang === "en" ? "en-US" : "ko") : "-"],
            ].map(([k, v], i, arr) => (
              <div key={k} style={{
                display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                padding: "9px 0", borderBottom: i < arr.length - 1 ? `1px solid ${C.borderLight}` : "none",
              }}>
                <span style={{ fontSize: 12, color: C.textMuted, flexShrink: 0, marginRight: 12 }}>{k}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: C.text, textAlign: "right", wordBreak: "break-all" }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Next Steps */}
          <div style={{
            background: C.accentLight, borderRadius: 16, padding: 20, marginBottom: 20,
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14 }}>{t("다음 단계 안내", "Next Steps")}</div>
            {[
              { n: "1", label: t("담당자 배정 및 전용 페이지에서 진행 상황 확인", "A team member is assigned · Track progress in your portal") },
              { n: "2", label: t("미팅 일정 확정 (ZOOM)", "Meeting time confirmed (Zoom)") },
              { n: "3", label: form.willWriteDoc ? t("개발의뢰서 양식 안내", "Development request form guidance") : t("상담 후 개발의뢰서 안내", "Development request form arranged after consultation") },
              { n: "4", label: t("가견적 산출 및 계약 검토", "Preliminary estimate and contract review") },
            ].map(({ n, label }) => (
              <div key={n} style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "center" }}>
                <div style={{
                  width: 26, height: 26, borderRadius: "50%", background: C.accent, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>{n}</div>
                <span style={{ fontSize: 13, color: C.textSub }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Contact */}
          <div style={{
            background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`,
            padding: "16px 18px", fontSize: 13, color: C.textSub, lineHeight: 1.7,
          }}>
            🔑 {t("접속 코드를 분실하신 경우 아래 연락처로 문의해 주세요.", "If you've lost your access code, please contact us below.")}<br />
            <strong style={{ color: C.text }}>{t("이메일", "Email")}:</strong> contact@dermacellex.com
          </div>
        </div>
      </div>
    );
  }

  // ━━━━━━━━━━ PHASE: PORTAL LOGIN (md 문서 8장 "전용 페이지" 접근 — 이메일 + 6자리 코드) ━━━━━━━━━━
  if (phase === "portal-login") {
    return (
      <div style={{ ...wrap, background: "#F4F4F5" }}>
        <style>{css}</style>
        <div ref={cRef} style={{ flex: 1, overflowY: "auto", padding: "14px 20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#111", letterSpacing: -0.8 }}>{t("전용 페이지", "My Portal")}</div>
            <div style={{ fontSize: 13.5, color: "#8A8A8E", marginTop: 5, fontWeight: 600 }}>{t("이메일과 접속 코드로 진행 상황을 확인하세요.", "Check your progress with your email and access code.")}</div>
          </div>
          <div style={card2}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#8A8A8E", marginBottom: 6 }}>{t("이메일", "Email")}</div>
              <input type="email" value={portalEmail} onChange={e => setPortalEmail(e.target.value)} placeholder="you@company.com" style={uInp} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#8A8A8E", marginBottom: 6 }}>{t("6자리 접속 코드", "6-Digit Access Code")}</div>
              <input value={portalCode} onChange={e => setPortalCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000"
                style={{ ...uInp, fontFamily: "ui-monospace, monospace", letterSpacing: 4 }} />
            </div>
            {portalErr && <div style={{ fontSize: 12, color: C.error, fontWeight: 700 }}>{portalErr}</div>}
            {portalMsg && <div style={{ fontSize: 12, color: C.success, fontWeight: 700 }}>{portalMsg}</div>}
            <button onClick={resendPortalCode} disabled={submitSt === "loading"} style={{
              alignSelf: "flex-start", background: "none", border: 0, padding: 0, cursor: "pointer",
              fontFamily: FONT, fontSize: 12.5, fontWeight: 700, color: "#8A8A8E", textDecoration: "underline",
            }}>{t("코드를 못 받으셨나요? 재전송", "Didn't receive a code? Resend")}</button>
          </div>
        </div>
        <div style={{ flex: "none", padding: "12px 20px", background: "#fff", borderTop: "1px solid #E4E4E4" }}>
          <button onClick={submitPortalLogin} disabled={submitSt === "loading"} style={{
            width: "100%", height: 52, border: 0, borderRadius: 16, background: "#111",
            color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: FONT, letterSpacing: -0.4,
            opacity: submitSt === "loading" ? 0.6 : 1,
          }}>{submitSt === "loading" ? t("확인 중...", "Checking...") : t("전용 페이지 접속", "Log In to Portal")}</button>
        </div>
      </div>
    );
  }

  // ━━━━━━━━━━ PHASE: PORTAL (제조사 OS 앱.dc.html · 09 대시보드 기준, 하단 탭 포함) ━━━━━━━━━━
  // 가견적은 담당자가 Notion에서 "고객 공개"로 체크한 것만 그대로 보여준다(단가·합계 계산은
  // 앱에 두지 않음). 계약 · 제조 프로젝트(디자인 11~12번 화면)는 아직 DB 연동을 안 붙여서
  // "아직 없음" 자리표시로 남겨둔다 — 실제로 없는 데이터를 지어내지 않기 위함. 진단 점수 ·
  // 등급 · 위험 플래그는 /api/portal-login 응답에 애초에 포함되지 않으므로 여기서도 노출되지 않는다.
  if (phase === "portal" && portalData) {
    const { inquiry, client, contact, meeting, products, estimates = [], contracts = [], projects = [], notifications = [] } = portalData;
    const locale = lang === "en" ? "en-US" : "ko";
    const fmt = (d) => d ? new Date(d).toLocaleString(locale, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-";
    const fmtMoney = (n, cur) => (typeof n === "number" ? `${n.toLocaleString(locale)}${cur === "USD" ? " USD" : cur === "CNY" ? " CNY" : (lang === "en" ? " KRW" : "원")}` : "-");
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString(locale) : "-";
    // 날인 기한까지 D-day. 연장 기한이 있으면 그쪽을 기준으로 삼는다.
    const ddayOf = (c) => {
      const deadline = c.extendedDeadline || c.signDeadline;
      if (!deadline) return null;
      const diff = Math.ceil((new Date(`${deadline}T00:00:00`) - new Date(new Date().toDateString())) / 86400000);
      return diff;
    };
    const latestContract = contracts[0] || null;
    const latestProject = projects[0] || null;
    const unreadNotis = notifications.filter(n => !n.read);
    const markNotiRead = async (id) => {
      setPortalData(prev => prev ? {
        ...prev,
        notifications: prev.notifications.map(n => n.id === id ? { ...n, read: true } : n),
      } : prev);
      try {
        // 알림 읽음 처리는 별도 API가 아니라 portal-login에 얹어서 보낸다(Vercel Hobby
        // 플랜의 서버리스 함수 개수 제한 때문 — 이미 인증 로직이 있는 곳에 재사용).
        await fetch("/api/portal-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: portalEmail.trim(), code: portalCode.trim(), markReadId: id }),
        });
      } catch {}
    };
    const markAllNotisRead = async () => {
      setPortalData(prev => prev ? {
        ...prev,
        notifications: prev.notifications.map(n => ({ ...n, read: true })),
      } : prev);
      try {
        await fetch("/api/portal-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: portalEmail.trim(), code: portalCode.trim(), markReadAll: true }),
        });
      } catch {}
    };
    const NOTI_ICON = {
      "일정": { icon: "談", bg: "#111", fg: "#fff" },
      "보완 요청": { icon: "補", bg: "#FDF1EC", fg: C.accent },
      "가견적": { icon: "見", bg: "#111", fg: "#fff" },
      "계약": { icon: "契", bg: C.accent, fg: "#fff" },
      "프로젝트": { icon: "進", bg: "#111", fg: "#fff" },
      "마감 안내": { icon: "急", bg: "#FDF1EC", fg: C.accent },
      "일반 안내": { icon: "안", bg: "#F1F1F2", fg: "#434343" },
    };
    const STAGES = ["접수", "상담", "견적", "계약", "프로젝트 전환"];
    const stageIdx = Math.max(0, STAGES.indexOf(inquiry.status));
    const openProducts = products.filter(p => p.status && p.status !== "완료").length;
    const TABS = [
      { key: "home", icon: "🏠", label: t("홈", "Home") },
      { key: "inquiry", icon: "📄", label: t("문의", "Inquiry") },
      { key: "estimate", icon: "💰", label: t("견적", "Quote") },
      { key: "progress", icon: "📈", label: t("진행", "Progress") },
      { key: "alerts", icon: "🔔", label: t("알림", "Alerts") },
    ];
    const skinName = (id) => skinTypes.find(s => s.id === id)?.name || "";
    const fmtFieldValue = (f, v, product) => {
      if (f.type === "skin") return (v || []).map(skinName).filter(Boolean).join(", ");
      if (f.type === "material") {
        const sup = (v || []).join(", ");
        const turn = (product?.[f.turnkeyKey] || []).join(", ");
        return [sup && `${t("사급", "Customer")} · ${sup}`, turn && `${t("턴키", "Turnkey")} · ${turn}`].filter(Boolean).join("\n");
      }
      if (f.type === "list") return (v || []).join("\n");
      if (Array.isArray(v)) return v.join(", ");
      if (f.type === "number" && v !== "" && v != null) return `${Number(v).toLocaleString(locale)}${f.unit || ""}`;
      if (f.type === "date" && v) return new Date(v).toLocaleDateString(locale);
      return v || "";
    };
    const placeholder = { background: "#fff", borderRadius: 22, padding: 18, boxShadow: "0 1px 2px rgba(0,0,0,.05)" };

    // 담당자(주/부) 카드 — 문의 전체 담당자와 제품개발의뢰서별 담당자가 다를 수 있어 양쪽에서 재사용.
    const renderStaffCard = (mainStaff, subStaff) => {
      const people = [
        ...(mainStaff || []).map(s => ({ ...s, roleLabel: t("주담당자", "Main Contact") })),
        ...(subStaff || []).map(s => ({ ...s, roleLabel: t("부담당자", "Secondary Contact") })),
      ].filter(p => p.name);
      if (people.length === 0) return null;
      return (
        <div style={{ background: "#fff", borderRadius: 22, padding: 18, boxShadow: "0 1px 2px rgba(0,0,0,.05)", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#8A8A8E" }}>{t("담당자", "Your Contact")}</div>
          {people.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 40, height: 40, flex: "none", borderRadius: 12, background: "#F1F1F2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: "#434343" }}>{p.name.slice(0, 1)}</span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#111" }}>{p.name}</span>
                  {p.position && <span style={{ fontSize: 11.5, color: "#8A8A8E", fontWeight: 600 }}>{p.position}</span>}
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: C.accent, background: "#FDF1EC", padding: "2px 7px", borderRadius: 99 }}>{p.roleLabel}</span>
                </span>
                <span style={{ fontSize: 12, color: "#8A8A8E", fontWeight: 600, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {p.email && <span>{p.email}</span>}
                  {p.phone && <span>{p.phone}</span>}
                </span>
              </span>
            </div>
          ))}
        </div>
      );
    };

    let hero = inquiry.mainStaff?.length
      ? { label: t("담당자", "Your Contact"), title: inquiry.mainStaff.map(s => s.name).filter(Boolean).join(", "), sub: t("곧 상담 일정을 안내드립니다.", "We'll reach out to schedule a consultation soon."), cta: null }
      : { label: t("다음 행동", "Next Step"), title: t("담당자 배정 대기", "Awaiting Assignment"), sub: t("곧 담당자가 배정되어 안내드립니다.", "A team member will be assigned to you shortly."), cta: null };
    if (meeting?.confirmed) {
      hero = { label: t("확정된 일정", "Confirmed Schedule"), title: t("제조 상담", "Consultation"), sub: fmt(meeting.confirmed), cta: meeting.zoomLink ? { label: t("Zoom 접속", "Join Zoom"), href: meeting.zoomLink } : null };
    } else if (meeting) {
      hero = { label: t("다음 행동", "Next Step"), title: t("상담 일정 확정 대기", "Awaiting Schedule Confirmation"), sub: t("담당자가 확인 후 일정을 확정해 안내드립니다.", "Our team will confirm your schedule shortly."), cta: null };
    }

    return (
      <div style={{ ...wrap, background: "#F4F4F5" }}>
        <style>{css}</style>
        <div ref={cRef} style={{ flex: 1, overflowY: "auto", padding: "14px 20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 13, color: "#8A8A8E", fontWeight: 700 }}>{[client?.name, contact?.name].filter(Boolean).join(" · ") || t("고객", "Customer")}</div>
              <div style={{ fontSize: 23, fontWeight: 800, color: "#111", letterSpacing: -0.8, marginTop: 3 }}>{inquiry.status ? t(inquiry.status) : "-"}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setPhase("intro")} title={t("메인 홈으로", "Back to Home")} style={{
                width: 42, height: 42, borderRadius: 14, background: "#fff", border: 0, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 2px rgba(0,0,0,.06)",
              }}>
                <span style={{ fontSize: 16 }}>🏠</span>
              </button>
              <button onClick={refreshPortalData} title={t("새로고침", "Refresh")} style={{
                width: 42, height: 42, borderRadius: 14, background: "#fff", border: 0, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 2px rgba(0,0,0,.06)", position: "relative",
              }}>
                <span style={{ fontSize: 16 }}>↻</span>
                <span style={{ position: "absolute", top: 8, right: 9, width: 7, height: 7, borderRadius: 99, background: C.accent }} />
              </button>
            </div>
          </div>

          {portalTab === "home" && (<>
            <div style={{
              borderRadius: 24, padding: 20, background: "linear-gradient(150deg,#EA5C2A,#C33F14)", color: "#fff",
              boxShadow: "0 18px 34px -20px rgba(234,92,42,.9)", display: "flex", flexDirection: "column", gap: 4,
            }}>
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, opacity: 0.85 }}>{hero.label}</span>
              <span style={{ fontSize: 21, fontWeight: 800, letterSpacing: -0.6, marginTop: 8 }}>{hero.title}</span>
              <span style={{ fontSize: 13.5, opacity: 0.9, fontWeight: 600, marginTop: 2 }}>{hero.sub}</span>
              {hero.cta && (
                <a href={hero.cta.href} target="_blank" rel="noreferrer" style={{
                  marginTop: 14, height: 50, border: 0, borderRadius: 15, background: "#fff", color: "#C33F14",
                  fontSize: 15, fontWeight: 800, fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none",
                }}>{hero.cta.label}</a>
              )}
            </div>

            <div style={{ background: "#fff", borderRadius: 22, padding: 18, boxShadow: "0 1px 2px rgba(0,0,0,.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, minWidth: 0 }}>
                {inquiry.uid && <span style={{ fontSize: 11, fontWeight: 800, fontFamily: "ui-monospace, monospace", color: "#8A8A8E", flex: "none" }}>{inquiry.uid}</span>}
                <span style={{ fontSize: 15.5, fontWeight: 800, color: "#111", letterSpacing: -0.4, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inquiry.name || t("제조개발 문의", "Manufacturing Inquiry")}</span>
              </div>
              <div style={{ display: "flex", gap: 0 }}>
                {STAGES.map((s, i) => (
                  <span key={s} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <span style={{ width: "100%", height: 3, borderRadius: 99, background: i <= stageIdx ? "#111" : "#E4E4E4" }} />
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: i <= stageIdx ? "#111" : "#B0B0B4" }}>{t(s)}</span>
                  </span>
                ))}
              </div>
            </div>

            {renderStaffCard(inquiry.mainStaff, inquiry.subStaff)}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button onClick={() => setPortalTab("inquiry")} style={{ textAlign: "left", background: "#fff", borderRadius: 20, padding: 16, boxShadow: "0 1px 2px rgba(0,0,0,.05)", border: 0, cursor: "pointer", fontFamily: FONT }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#8A8A8E" }}>{t("기획개발의뢰서", "Development Request Form")}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: "#111", letterSpacing: -0.8, marginTop: 6 }}>
                  {products.length}<span style={{ fontSize: 14, color: "#B0B0B4" }}>{t("건", "")}</span>
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: openProducts > 0 ? C.accent : "#8A8A8E", marginTop: 4 }}>
                  {openProducts > 0 ? t(`진행 중 ${openProducts}건`, `${openProducts} in progress`) : products.length > 0 ? t("전체 완료", "All Complete") : t("작성된 의뢰서 없음", "No requests yet")}
                </div>
              </button>
              <button onClick={() => setPortalTab("estimate")} style={{ textAlign: "left", background: "#fff", borderRadius: 20, padding: 16, boxShadow: "0 1px 2px rgba(0,0,0,.05)", border: 0, cursor: "pointer", fontFamily: FONT }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#8A8A8E" }}>{t("가견적", "Estimate")}</div>
                {estimates.length === 0 ? (
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#B0B0B4", marginTop: 10 }}>{t("아직 없음", "None yet")}</div>
                ) : (
                  <>
                    <div style={{ fontSize: 26, fontWeight: 800, color: "#111", letterSpacing: -0.8, marginTop: 6 }}>
                      {estimates.length}<span style={{ fontSize: 14, color: "#B0B0B4" }}>{t("건", "")}</span>
                    </div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: C.accent, marginTop: 4 }}>{estimates[0].status ? t(estimates[0].status) : "-"}</div>
                  </>
                )}
              </button>
            </div>

            {latestContract && (
              <button onClick={() => setPortalTab("estimate")} style={{
                textAlign: "left", background: "#fff", borderRadius: 22, padding: 18, boxShadow: "0 1px 2px rgba(0,0,0,.05)",
                border: 0, cursor: "pointer", fontFamily: FONT, display: "flex", alignItems: "center", gap: 13,
              }}>
                <span style={{ width: 42, height: 42, borderRadius: 14, background: "#111", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, flex: "none" }}>▤</span>
                <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 800, color: "#111", letterSpacing: -0.4 }}>{latestContract.name || t("제조 계약서", "Manufacturing Contract")}{latestContract.version ? ` v${latestContract.version}` : ""}</span>
                  <span style={{ fontSize: 12.5, color: "#8A8A8E", fontWeight: 600 }}>
                    {latestContract.status === "날인 완료" ? `${t("날인 완료 · ", "Signed · ")}${fmtDate(latestContract.signedDate)}` :
                      ddayOf(latestContract) != null ? t(`날인 기한까지 D${ddayOf(latestContract) >= 0 ? "-" + ddayOf(latestContract) : "+" + (-ddayOf(latestContract))}`, `${ddayOf(latestContract) >= 0 ? "D-" + ddayOf(latestContract) : "D+" + (-ddayOf(latestContract))} to sign`) :
                        latestContract.status ? t(latestContract.status) : "-"}
                  </span>
                </span>
                <span style={{ fontSize: 11.5, fontWeight: 800, color: C.accent, background: "#FDF1EC", padding: "3px 9px", borderRadius: 99, flex: "none" }}>{latestContract.status ? t(latestContract.status) : "-"}</span>
              </button>
            )}

            {latestProject ? (
              <button onClick={() => setPortalTab("progress")} style={{
                textAlign: "left", background: "#111", borderRadius: 22, padding: 18, boxShadow: "0 1px 2px rgba(0,0,0,.05)",
                border: 0, cursor: "pointer", fontFamily: FONT, color: "#fff", display: "flex", flexDirection: "column", gap: 4,
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#9A9A9E" }}>{latestProject.uid ? `${latestProject.uid} · ` : ""}{latestProject.name || t("제조 프로젝트", "Manufacturing Project")}</span>
                <span style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.4 }}>{latestProject.currentStage ? t(latestProject.currentStage) : latestProject.status ? t(latestProject.status) : "-"}</span>
                  {typeof latestProject.progress === "number" && (
                    <span style={{ fontSize: 20, fontWeight: 800, color: C.accent, letterSpacing: -0.6 }}>{Math.round(latestProject.progress <= 1 ? latestProject.progress * 100 : latestProject.progress)}%</span>
                  )}
                </span>
              </button>
            ) : (
              <div style={placeholder}>
                <div style={{ fontSize: 15.5, fontWeight: 800, color: "#111", letterSpacing: -0.4, marginBottom: 6 }}>{t("제조 프로젝트", "Manufacturing Project")}</div>
                <div style={{ fontSize: 13.5, color: "#8A8A8E", fontWeight: 600 }}>{t("계약 완료 후 여기에 표시됩니다.", "This will appear once your contract is signed.")}</div>
              </div>
            )}

            {meeting && (
              <div style={{ background: "#fff", borderRadius: 22, padding: 18, boxShadow: "0 1px 2px rgba(0,0,0,.05)", display: "flex", alignItems: "center", gap: 13 }}>
                <span style={{ width: 42, height: 42, borderRadius: 14, background: "#111", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 15, fontWeight: 800, flex: "none" }}>Z</span>
                <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 800, color: "#111", letterSpacing: -0.4 }}>
                    {meeting.confirmed ? `${t("제조 상담", "Consultation")} · ${fmt(meeting.confirmed)}` : t("제조 상담 · 일정 조율 중", "Consultation · Scheduling in progress")}
                  </span>
                  <span style={{ fontSize: 12.5, color: "#8A8A8E", fontWeight: 600 }}>{meeting.zoomLink ? t("Zoom 링크 확정", "Zoom Link Ready") : meeting.status ? t(meeting.status) : "-"}</span>
                </span>
                {meeting.zoomLink && (
                  <a href={meeting.zoomLink} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, fontWeight: 800, color: C.accent, textDecoration: "none" }}>{t("입장", "Join")}</a>
                )}
              </div>
            )}

            <button onClick={startNewInquiryFromPortal} disabled={submitSt === "loading"} style={{
              height: 54, border: "1.5px dashed #C4C4C6", borderRadius: 18, background: "transparent", color: "#434343",
              fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: FONT, letterSpacing: -0.3,
              opacity: submitSt === "loading" ? 0.6 : 1,
            }}>{submitSt === "loading" ? t("확인 중...", "Checking...") : t("+ 새 제조 문의 시작하기", "+ Start a New Inquiry")}</button>
          </>)}

          {portalTab === "inquiry" && (<>
            <div style={placeholder}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                {inquiry.uid && <span style={{ fontSize: 11, fontWeight: 800, fontFamily: "ui-monospace, monospace", color: "#8A8A8E", flex: "none" }}>{inquiry.uid}</span>}
                <span style={{ fontSize: 15.5, fontWeight: 800, color: "#111", letterSpacing: -0.4, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inquiry.name || t("제조개발 문의", "Manufacturing Inquiry")}</span>
              </div>
              <div style={{ fontSize: 13, color: C.accent, fontWeight: 700, marginTop: 6 }}>{t("현재 상태", "Current Status")} · {inquiry.status ? t(inquiry.status) : "-"}</div>
            </div>

            <div style={card2}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#111" }}>{t("내가 작성한 제품개발의뢰서", "My Development Request Forms")}</div>
              {products.length === 0 && <div style={{ fontSize: 13.5, color: "#8A8A8E", fontWeight: 600 }}>{t("작성된 개발의뢰서가 없습니다.", "No development requests yet.")}</div>}
              {products.map((p, i) => {
                const isOpen = expandedProduct === i;
                const filled = ALL_DEV_FIELDS
                  .filter(f => f.key !== "productName")
                  .flatMap(f => {
                    const shown = [];
                    const v = p[f.key];
                    const hasValue = Array.isArray(v) ? v.length > 0 : v !== "" && v != null;
                    // 부자재는 사급이 비어 있어도 턴키만 고른 경우가 있어 두 값을 함께 본다.
                    if (hasValue || (f.turnkeyKey && p[f.turnkeyKey]?.length)) shown.push({ f, value: fmtFieldValue(f, v, p) });
                    if (f.otherKey && p[f.otherKey]) shown.push({ f: { ...f, key: f.otherKey, label: f.otherLabel || t(`${f.label} 직접 입력`, `${t(f.label)} (manual)`) }, value: p[f.otherKey] });
                    return shown.filter(s => s.value);
                  });
                return (
                  <div key={i} style={{ borderBottom: i < products.length - 1 ? "1px solid #F0F0F0" : "none" }}>
                    <button onClick={() => setExpandedProduct(isOpen ? null : i)} style={{
                      width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
                      padding: "12px 0", border: 0, background: "transparent", cursor: "pointer", fontFamily: FONT, textAlign: "left",
                    }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{p.name || t("(제목 없음)", "(Untitled)")}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
                        <span style={{ fontSize: 11.5, fontWeight: 800, color: C.accent, background: "#FDF1EC", padding: "3px 9px", borderRadius: 99 }}>{p.status ? t(p.status) : "-"}</span>
                        <span style={{ color: "#B0B0B4", fontSize: 11 }}>{isOpen ? "▲" : "▼"}</span>
                      </span>
                    </button>
                    {isOpen && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 9, paddingBottom: 16 }}>
                        {p.status === "시작 전" && (
                          <button onClick={() => startEditingProduct(p)} style={{
                            alignSelf: "flex-start", height: 36, padding: "0 14px", borderRadius: 99, cursor: "pointer", fontFamily: FONT,
                            border: "1.5px solid #E4E4E4", background: "#fff", color: "#434343", fontSize: 12.5, fontWeight: 800,
                          }}>{t("수정하기", "Edit")}</button>
                        )}
                        {(p.mainStaff?.length || p.subStaff?.length) ? (
                          <div style={{ fontSize: 12.5, color: "#434343", fontWeight: 700 }}>
                            {t("담당자", "Contact")} · {[...(p.mainStaff || []), ...(p.subStaff || [])].map(s => s.name).filter(Boolean).join(", ")}
                          </div>
                        ) : null}
                        {filled.length === 0 && <div style={{ fontSize: 12.5, color: "#B0B0B4", fontWeight: 600 }}>{t("작성된 상세 항목이 없습니다.", "No details entered yet.")}</div>}
                        {filled.map(({ f, value }) => (
                          <div key={f.key} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
                            <span style={{ color: "#8A8A8E", fontWeight: 600, flex: "none" }}>{t(f.label)}</span>
                            <span style={{ color: "#111", fontWeight: 700, textAlign: "right", whiteSpace: "pre-line" }}>{value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>)}

          {portalTab === "estimate" && (<>
            {estimates.length === 0 && (
              <div style={placeholder}>
                <div style={{ fontSize: 15.5, fontWeight: 800, color: "#111", marginBottom: 6 }}>{t("가견적", "Estimate")}</div>
                <div style={{ fontSize: 13.5, color: "#8A8A8E", fontWeight: 600 }}>{t("아직 생성된 가견적이 없습니다. 담당자 검토 후 이곳에 공개됩니다.", "No estimate has been created yet. It will appear here after our team's review.")}</div>
              </div>
            )}
            {estimates.map((e, i) => {
              const isOpen = expandedEstimate === i;
              return (
                <div key={e.id || i} style={card2}>
                  <button onClick={() => setExpandedEstimate(isOpen ? null : i)} style={{
                    width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
                    border: 0, background: "transparent", cursor: "pointer", fontFamily: FONT, textAlign: "left", padding: 0,
                  }}>
                    <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        {e.uid && <span style={{ fontSize: 11, fontWeight: 800, fontFamily: "ui-monospace, monospace", color: "#8A8A8E", flex: "none" }}>{e.uid}</span>}
                        <span style={{ fontSize: 14.5, fontWeight: 800, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name || t("가견적", "Estimate")}{e.version ? ` v${e.version}` : ""}</span>
                      </span>
                      <span style={{ fontSize: 20, fontWeight: 800, color: "#111", letterSpacing: -0.6 }}>{fmtMoney(e.totalAmount, e.currency)}</span>
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
                      <span style={{ fontSize: 11.5, fontWeight: 800, color: C.accent, background: "#FDF1EC", padding: "3px 9px", borderRadius: 99 }}>{e.status ? t(e.status) : "-"}</span>
                      <span style={{ color: "#B0B0B4", fontSize: 11 }}>{isOpen ? "▲" : "▼"}</span>
                    </span>
                  </button>

                  {isOpen && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                        {e.quoteDate && (
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
                            <span style={{ color: "#8A8A8E", fontWeight: 600 }}>{t("견적일", "Quote Date")}</span>
                            <span style={{ color: "#111", fontWeight: 700 }}>{new Date(e.quoteDate).toLocaleDateString(locale)}</span>
                          </div>
                        )}
                        {e.validUntil && (
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
                            <span style={{ color: "#8A8A8E", fontWeight: 600 }}>{t("유효기간", "Valid Until")}</span>
                            <span style={{ color: "#111", fontWeight: 700 }}>{new Date(e.validUntil).toLocaleDateString(locale)}{t("까지", "")}</span>
                          </div>
                        )}
                        {typeof e.supplyAmount === "number" && (
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
                            <span style={{ color: "#8A8A8E", fontWeight: 600 }}>{t("공급가액", "Supply Amount")}</span>
                            <span style={{ color: "#111", fontWeight: 700 }}>{fmtMoney(e.supplyAmount, e.currency)}</span>
                          </div>
                        )}
                        {typeof e.taxAmount === "number" && (
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
                            <span style={{ color: "#8A8A8E", fontWeight: 600 }}>{t("세액", "Tax")}</span>
                            <span style={{ color: "#111", fontWeight: 700 }}>{fmtMoney(e.taxAmount, e.currency)}</span>
                          </div>
                        )}
                      </div>

                      {e.items.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 0, borderTop: "1px solid #F0F0F0" }}>
                          {e.items.map((it, j) => (
                            <div key={it.id || j} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: j < e.items.length - 1 ? "1px solid #F5F5F5" : "none" }}>
                              <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{it.name || it.type || t("항목", "Item")}</span>
                                <span style={{ fontSize: 11.5, color: "#8A8A8E", fontWeight: 600 }}>
                                  {[it.type, it.spec, it.quantity ? `${it.quantity.toLocaleString(locale)}${t("개", "")}` : null].filter(Boolean).join(" · ") || "-"}
                                </span>
                              </span>
                              <span style={{ fontSize: 13.5, fontWeight: 800, color: "#111", flex: "none" }}>{fmtMoney(it.amount, e.currency)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {(e.includeNote || e.excludeNote || e.customerNote) && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: "#8A8A8E", fontWeight: 600, background: "#F7F7F7", borderRadius: 12, padding: 12 }}>
                          {e.customerNote && <div>{e.customerNote}</div>}
                          {e.includeNote && <div>{t("포함", "Included")}: {e.includeNote}</div>}
                          {e.excludeNote && <div>{t("제외", "Excluded")}: {e.excludeNote}</div>}
                        </div>
                      )}

                      {e.fileUrl && (
                        <a href={e.fileUrl} target="_blank" rel="noreferrer" style={{
                          height: 46, borderRadius: 14, background: "#111", color: "#fff", fontSize: 13.5, fontWeight: 800,
                          display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none",
                        }}>{t("견적서 파일 보기", "View Estimate File")}</a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{ fontSize: 15.5, fontWeight: 800, color: "#111", letterSpacing: -0.4, marginTop: 4 }}>{t("계약", "Contract")}</div>
            {contracts.length === 0 && (
              <div style={placeholder}>
                <div style={{ fontSize: 13.5, color: "#8A8A8E", fontWeight: 600 }}>{t("아직 발송된 계약이 없습니다. 견적 협의가 끝나면 이곳에 공개됩니다.", "No contract has been sent yet. It will appear here once the estimate is finalized.")}</div>
              </div>
            )}
            {contracts.map((c, i) => {
              const isOpen = expandedContract === i;
              const dday = ddayOf(c);
              const pending = c.status && !["날인 완료", "14일 내 미날인 종료", "취소"].includes(c.status);
              return (
                <div key={c.id || i} style={card2}>
                  <button onClick={() => setExpandedContract(isOpen ? null : i)} style={{
                    width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
                    border: 0, background: "transparent", cursor: "pointer", fontFamily: FONT, textAlign: "left", padding: 0,
                  }}>
                    <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        {c.uid && <span style={{ fontSize: 11, fontWeight: 800, fontFamily: "ui-monospace, monospace", color: "#8A8A8E", flex: "none" }}>{c.uid}</span>}
                        <span style={{ fontSize: 14.5, fontWeight: 800, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name || t("계약", "Contract")}{c.version ? ` v${c.version}` : ""}</span>
                      </span>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: c.status === "날인 완료" ? "#1F6B4A" : dday != null && pending ? (dday >= 0 ? "#EA5C2A" : "#D33") : "#8A8A8E" }}>
                        {c.status === "날인 완료" ? `${t("날인 완료 · ", "Signed · ")}${fmtDate(c.signedDate)}` :
                          dday != null && pending ? (dday >= 0 ? t(`날인 기한까지 D-${dday}`, `D-${dday} to sign`) : t(`기한 경과 D+${-dday}`, `D+${-dday} overdue`)) :
                            "-"}
                      </span>
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
                      <span style={{ fontSize: 11.5, fontWeight: 800, color: C.accent, background: "#FDF1EC", padding: "3px 9px", borderRadius: 99 }}>{c.status ? t(c.status) : "-"}</span>
                      <span style={{ color: "#B0B0B4", fontSize: 11 }}>{isOpen ? "▲" : "▼"}</span>
                    </span>
                  </button>

                  {isOpen && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                        {c.sentDate && (
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
                            <span style={{ color: "#8A8A8E", fontWeight: 600 }}>{t("계약서 발송일", "Contract Sent")}</span>
                            <span style={{ color: "#111", fontWeight: 700 }}>{fmtDate(c.sentDate)}</span>
                          </div>
                        )}
                        {c.signDeadline && (
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
                            <span style={{ color: "#8A8A8E", fontWeight: 600 }}>{t("날인 기한", "Signing Deadline")}</span>
                            <span style={{ color: "#111", fontWeight: 700 }}>{fmtDate(c.signDeadline)}</span>
                          </div>
                        )}
                        {c.extendedDeadline && (
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
                            <span style={{ color: "#8A8A8E", fontWeight: 600 }}>{t("연장된 기한", "Extended Deadline")}</span>
                            <span style={{ color: "#111", fontWeight: 700 }}>{fmtDate(c.extendedDeadline)}</span>
                          </div>
                        )}
                        {c.signedDate && (
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
                            <span style={{ color: "#8A8A8E", fontWeight: 600 }}>{t("날인일", "Signed Date")}</span>
                            <span style={{ color: "#111", fontWeight: 700 }}>{fmtDate(c.signedDate)}</span>
                          </div>
                        )}
                        {c.endDate && (
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
                            <span style={{ color: "#8A8A8E", fontWeight: 600 }}>{t("종료일", "End Date")}</span>
                            <span style={{ color: "#111", fontWeight: 700 }}>{fmtDate(c.endDate)}</span>
                          </div>
                        )}
                      </div>

                      {(c.customerNote || c.terms || c.endReason) && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: "#8A8A8E", fontWeight: 600, background: "#F7F7F7", borderRadius: 12, padding: 12 }}>
                          {c.customerNote && <div>{c.customerNote}</div>}
                          {c.terms && <div>{t("계약 조건", "Contract Terms")}: {c.terms}</div>}
                          {c.endReason && <div>{t("종료 사유", "End Reason")}: {c.endReason}</div>}
                        </div>
                      )}

                      {c.fileUrl && (
                        <a href={c.fileUrl} target="_blank" rel="noreferrer" style={{
                          height: 46, borderRadius: 14, background: "#111", color: "#fff", fontSize: 13.5, fontWeight: 800,
                          display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none",
                        }}>{t("계약서 파일 보기", "View Contract File")}</a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>)}
          {portalTab === "progress" && (<>
            {projects.length === 0 && (
              <div style={placeholder}>
                <div style={{ fontSize: 15.5, fontWeight: 800, color: "#111", marginBottom: 6 }}>{t("진행 상황", "Progress")}</div>
                <div style={{ fontSize: 13.5, color: "#8A8A8E", fontWeight: 600 }}>{t("계약 완료 후 제품별 진행 타임라인이 여기에 표시됩니다.", "The per-product progress timeline will appear here once your contract is signed.")}</div>
              </div>
            )}
            {projects.length > 1 && (
              <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
                {projects.map((p, i) => (
                  <button key={p.id || i} onClick={() => setActiveProject(i)} style={{
                    flex: "none", height: 38, padding: "0 14px", borderRadius: 12, cursor: "pointer", fontFamily: FONT,
                    border: 0, fontSize: 12.5, fontWeight: 800,
                    background: activeProject === i ? "#111" : "#fff", color: activeProject === i ? "#fff" : "#8A8A8E",
                  }}>{p.name || t(`프로젝트 ${i + 1}`, `Project ${i + 1}`)}</button>
                ))}
              </div>
            )}
            {projects[activeProject] && (() => {
              const proj = projects[activeProject];
              const pct = typeof proj.progress === "number" ? Math.round(proj.progress <= 1 ? proj.progress * 100 : proj.progress) : null;
              const steps = [...proj.steps].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
              return (
                <>
                  <div style={{ borderRadius: 22, padding: "18px 20px 22px", background: "#111", color: "#fff" }}>
                    <div style={{ fontSize: 12.5, color: "#9A9A9E", fontWeight: 700 }}>{proj.uid ? `${proj.uid} · ` : ""}{proj.name || t("제조 프로젝트", "Manufacturing Project")}</div>
                    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 12 }}>
                      <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.6 }}>{proj.currentStage ? t(proj.currentStage) : proj.status ? t(proj.status) : "-"}</div>
                      {pct != null && <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -1, color: C.accent }}>{pct}%</div>}
                    </div>
                    {pct != null && (
                      <div style={{ height: 8, borderRadius: 99, background: "#2A2A2E", overflow: "hidden", marginTop: 12 }}>
                        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: C.accent }} />
                      </div>
                    )}
                    {proj.summary && <div style={{ fontSize: 12.5, color: "#C4C4C6", fontWeight: 600, marginTop: 12, lineHeight: 1.5 }}>{proj.summary}</div>}
                  </div>

                  {steps.length === 0 ? (
                    <div style={placeholder}>
                      <div style={{ fontSize: 13.5, color: "#8A8A8E", fontWeight: 600 }}>{t("아직 공개된 세부 진행 단계가 없습니다.", "No detailed progress steps have been shared yet.")}</div>
                    </div>
                  ) : (
                    <div style={card2}>
                      {steps.map((s, i) => {
                        const done = s.status === "완료";
                        const active = s.status === "진행 중" || s.status === "고객 확인 대기";
                        const attention = s.status === "보완 필요";
                        const dotBg = done ? "#111" : active ? C.accent : attention ? "#D33" : "#fff";
                        const dotFg = done || active || attention ? "#fff" : "#B0B0B4";
                        const dotBorder = done || active || attention ? "none" : "1.5px solid #E4E4E4";
                        const isOpen = expandedStep === i;
                        return (
                          <div key={s.id || i} style={{ display: "flex", gap: 13, alignItems: "stretch" }}>
                            <div style={{ width: 22, flex: "none", display: "flex", flexDirection: "column", alignItems: "center" }}>
                              <span style={{
                                width: 20, height: 20, borderRadius: 99, flex: "none", display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 10, fontWeight: 800, color: dotFg, background: dotBg, border: dotBorder,
                              }}>{done ? "✓" : i + 1}</span>
                              {i < steps.length - 1 && <span style={{ flex: 1, width: 2, minHeight: 14, background: done ? "#111" : "#E4E4E4" }} />}
                            </div>
                            <button onClick={() => setExpandedStep(isOpen ? null : i)} style={{
                              flex: 1, textAlign: "left", border: 0, background: "transparent", cursor: "pointer", fontFamily: FONT,
                              padding: 0, paddingBottom: 16, display: "flex", flexDirection: "column", gap: 8,
                            }}>
                              <span style={{ display: "flex", alignItems: "center", gap: 9, width: "100%" }}>
                                <span style={{ fontSize: 14.5, fontWeight: 800, letterSpacing: -0.3, color: done ? "#8A8A8E" : "#111" }}>{s.stage ? t(s.stage) : s.name || "-"}</span>
                                <span style={{ fontSize: 10.5, fontWeight: 800, padding: "2px 8px", borderRadius: 99, color: active ? C.accent : attention ? "#D33" : "#8A8A8E", background: active ? "#FDF1EC" : attention ? "#FDECEC" : "#F1F1F2" }}>{s.status ? t(s.status) : "-"}</span>
                                <span style={{ flex: 1 }} />
                                <span style={{ fontSize: 12, fontWeight: 700, color: "#A8A8AC" }}>{fmtDate(s.endDate || s.targetDate)}</span>
                              </span>
                              {isOpen && (
                                <span style={{ width: "100%", padding: 14, borderRadius: 16, background: "#F7F7F7", display: "flex", flexDirection: "column", gap: 8 }}>
                                  <span style={{ fontSize: 13.5, color: "#434343", lineHeight: 1.55, fontWeight: 600 }}>{s.summary || t("공개된 세부 설명이 없습니다.", "No detailed description shared yet.")}</span>
                                  {s.targetDate && <span style={{ fontSize: 11.5, fontWeight: 700, color: "#8A8A8E" }}>{t("목표일", "Target Date")} {fmtDate(s.targetDate)}</span>}
                                </span>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </>)}
          {portalTab === "alerts" && (<>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
                <span style={{ fontSize: 15.5, fontWeight: 800, color: "#111" }}>{t("알림", "Alerts")}</span>
                {unreadNotis.length > 0 && <span style={{ fontSize: 13, fontWeight: 800, color: C.accent }}>{t(`${unreadNotis.length}개 안읽음`, `${unreadNotis.length} unread`)}</span>}
              </div>
              {unreadNotis.length > 0 && (
                <button onClick={markAllNotisRead} style={{
                  height: 34, padding: "0 13px", border: 0, borderRadius: 11, background: "#fff", color: "#434343",
                  fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT, boxShadow: "0 1px 2px rgba(0,0,0,.05)",
                }}>{t("모두 읽음", "Mark All Read")}</button>
              )}
            </div>
            {notifications.length === 0 && (
              <div style={placeholder}>
                <div style={{ fontSize: 13.5, color: "#8A8A8E", fontWeight: 600 }}>{t("아직 알림이 없습니다.", "No alerts yet.")}</div>
              </div>
            )}
            {notifications.map((n, i) => {
              const ic = NOTI_ICON[n.type] || NOTI_ICON["일반 안내"];
              return (
                <button key={n.id || i} onClick={() => !n.read && markNotiRead(n.id)} style={{
                  textAlign: "left", border: 0, borderRadius: 18, padding: 16, cursor: n.read ? "default" : "pointer", fontFamily: FONT,
                  display: "flex", gap: 12, alignItems: "flex-start", background: n.read ? "#fff" : "#FFFDFB", boxShadow: "0 1px 2px rgba(0,0,0,.05)",
                }}>
                  <span style={{ width: 36, height: 36, flex: "none", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: ic.fg, background: ic.bg }}>{ic.icon}</span>
                  <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: C.accent }}>{n.type ? t(n.type) : t("안내", "Notice")}</span>
                      <span style={{ fontSize: 11, color: "#B0B0B4", fontWeight: 600 }}>{fmtDate(n.sentDate)}</span>
                    </span>
                    <span style={{ fontSize: 14.5, letterSpacing: -0.3, color: "#111", fontWeight: n.read ? 700 : 800 }}>{n.title || "-"}</span>
                    {n.body && <span style={{ fontSize: 12.5, color: "#8A8A8E", lineHeight: 1.5, fontWeight: 600 }}>{n.body}</span>}
                  </span>
                  {!n.read && <span style={{ width: 8, height: 8, flex: "none", borderRadius: 99, marginTop: 6, background: C.accent }} />}
                </button>
              );
            })}
          </>)}

          <div style={{ textAlign: "center", fontSize: 11.5, color: "#B0B0B4", fontWeight: 600, marginTop: 4 }}>
            {portalSynced ? t(`마지막 업데이트 ${portalSynced.toLocaleTimeString("ko", { hour: "2-digit", minute: "2-digit" })} · 15초마다 자동 새로고침`, `Last updated ${portalSynced.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} · Auto-refreshes every 15s`) : ""}
          </div>
        </div>
        <div style={{ flex: "none", height: 74, background: "#fff", borderTop: "1px solid #E9E9EA", display: "flex", alignItems: "flex-start", padding: "10px 8px 0" }}>
          {TABS.map(tab => {
            const active = portalTab === tab.key;
            return (
              <button key={tab.key} onClick={() => setPortalTab(tab.key)} style={{
                flex: 1, border: 0, background: "transparent", cursor: "pointer", fontFamily: FONT,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "4px 0",
              }}>
                <span style={{ fontSize: 17, position: "relative" }}>
                  {tab.icon}
                  {tab.key === "alerts" && unreadNotis.length > 0 && (
                    <span style={{ position: "absolute", top: -2, right: -6, width: 7, height: 7, borderRadius: 99, background: C.accent }} />
                  )}
                </span>
                <span style={{ fontSize: 10.5, fontWeight: 800, color: active ? "#111" : "#B0B0B4" }}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}


// ━━━━━━━━━━ DEV REQUEST FORM (개발의뢰서) ━━━━━━━━━━
function DevRequestForm({ clientId }) {
  const { t, lang } = useLang();
  const [loading, setLoading] = useState(true);
  const [clientInfo, setClientInfo] = useState(null);
  const [form, setForm] = useState({
    productName: "", productType: "", targetEffect: "",
    formulation: "", volume: "", quantity: "",
    targetPrice: "", ingredients: "", packaging: "",
    reference: "", additionalNotes: "",
  });
  const [products, setProducts] = useState([]);
  const [submitSt, setSubmitSt] = useState(null);

  useEffect(() => {
    if (clientId) {
      fetch(`/api/client?id=${clientId}`)
        .then(r => r.json())
        .then(d => { setClientInfo(d); setLoading(false); })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [clientId]);

  const addProduct = () => {
    if (!form.productName.trim()) return;
    setProducts(prev => [...prev, { ...form, id: Date.now() }]);
    setForm({
      productName: "", productType: "", targetEffect: "",
      formulation: "", volume: "", quantity: "",
      targetPrice: "", ingredients: "", packaging: "",
      reference: "", additionalNotes: "",
    });
  };

  const removeProduct = (id) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const submitDevForm = async () => {
    if (products.length === 0 && !form.productName.trim()) {
      alert(t("최소 1개 이상의 제품을 입력해주세요.", "Please enter at least 1 product."));
      return;
    }
    const allProducts = form.productName.trim()
      ? [...products, { ...form, id: Date.now() }]
      : products;

    setSubmitSt("loading");
    try {
      const res = await fetch("/api/devform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, products: allProducts, timestamp: new Date().toISOString() }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      setSubmitSt("success");
    } catch (err) {
      console.error(err);
      setSubmitSt("error");
      setTimeout(() => setSubmitSt(null), 3000);
    }
  };

  const css = `
    @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
    *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
    html,body,#root{height:100%;background:${C.bg}}
    input:focus,select:focus,textarea:focus{border-color:${C.accent}!important;outline:none}
    button:active{transform:scale(0.97)}
    ::-webkit-scrollbar{display:none}
    ::placeholder{color:${C.textMuted}}
  `;

  const wrap = {
    maxWidth: 440, margin: "0 auto", minHeight: "100dvh",
    background: C.bg, fontFamily: FONT,
    display: "flex", flexDirection: "column",
  };
  const inp = {
    width: "100%", padding: "13px 16px", border: `1.5px solid ${C.border}`,
    borderRadius: 12, fontSize: 14, fontFamily: FONT, background: C.surface,
    color: C.text, outline: "none", boxSizing: "border-box",
  };
  const ta = { ...inp, minHeight: 80, resize: "vertical" };

  if (submitSt === "success") {
    return (
      <div style={wrap}>
        <style>{css}</style>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 40, textAlign: "center" }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%", marginBottom: 20,
            background: `${C.success}12`, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, color: C.text }}>{t("개발의뢰서가 제출되었습니다", "Your Development Request Has Been Submitted")}</h2>
          <p style={{ fontSize: 14, color: C.textSub, lineHeight: 1.7 }}>
            {t("담당자 검토 후 가견적이 산출됩니다.", "An estimate will be prepared after our team's review.")}<br />
            {t("이메일로 안내드리겠습니다.", "We'll notify you by email.")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <style>{css}</style>
      <div style={{
        padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(247,247,247,0.92)", backdropFilter: "blur(20px)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.accent }}>DERMACELLEX</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.textMuted }}>{t("개발의뢰서", "Development Request")}</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 160px" }}>
        {/* Client Info */}
        {clientInfo && (
          <div style={{
            background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`,
            padding: "14px 16px", marginBottom: 20,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 8 }}>{t("의뢰사 정보", "Client Info")}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{clientInfo.name || t("고객", "Customer")}</div>
            <div style={{ fontSize: 12, color: C.textSub }}>{clientInfo.service || ""}</div>
          </div>
        )}

        {/* Info Banner */}
        <div style={{
          background: C.accentLight, borderRadius: 14, padding: "14px 16px", marginBottom: 20,
          border: `1px solid ${C.accent}20`,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 6 }}>💡 {t("가견적 산출 안내", "About Preliminary Estimates")}</div>
          <p style={{ fontSize: 12, color: C.textSub, lineHeight: 1.6, margin: 0 }}>
            {t("개발의뢰서를 작성하시면 가견적을 산출해 드립니다. 여러 제품을 한번에 등록할 수 있습니다.", "Once you submit this form, we'll prepare a preliminary estimate. You can register multiple products at once.")}
          </p>
        </div>

        {/* Added Products */}
        {products.map((p, i) => (
          <div key={p.id} style={{
            background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`,
            padding: "14px 16px", marginBottom: 10,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{p.productName}</div>
              <div style={{ fontSize: 12, color: C.textSub }}>{p.productType} · {p.volume} · {p.quantity}{t("개", "")}</div>
            </div>
            <button onClick={() => removeProduct(p.id)} style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 18, color: C.textMuted, padding: 4,
            }}>×</button>
          </div>
        ))}

        {/* Product Form */}
        <div style={{
          background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`,
          padding: "20px 18px", marginBottom: 16,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>
            {t(`제품 ${products.length + 1} 정보 입력`, `Product ${products.length + 1} Details`)}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6, display: "block" }}>
                {t("제품명", "Product Name")} <span style={{ color: C.accent }}>*</span>
              </label>
              <input value={form.productName} onChange={e => setForm(p => ({ ...p, productName: e.target.value }))}
                placeholder={t("예: 모이스처 세럼", "e.g. Moisture Serum")} style={inp} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6, display: "block" }}>{t("제품 유형", "Product Type")}</label>
                <select value={form.productType} onChange={e => setForm(p => ({ ...p, productType: e.target.value }))} style={inp}>
                  <option value="">{t("선택", "Select")}</option>
                  {["세럼/에센스", "토너/스킨", "크림", "로션/에멀전", "클렌저", "마스크팩", "선케어", "앰플", "미스트", "기타"].map(pt =>
                    <option key={pt} value={pt}>{t(pt)}</option>
                  )}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6, display: "block" }}>{t("용량", "Volume")}</label>
                <input value={form.volume} onChange={e => setForm(p => ({ ...p, volume: e.target.value }))}
                  placeholder={t("예: 50ml", "e.g. 50ml")} style={inp} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6, display: "block" }}>{t("생산수량", "Quantity")}</label>
                <input value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                  placeholder={t("예: 3000", "e.g. 3000")} type="number" style={inp} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6, display: "block" }}>{t("목표가격", "Target Price")}</label>
                <input value={form.targetPrice} onChange={e => setForm(p => ({ ...p, targetPrice: e.target.value }))}
                  placeholder={t("예: 25,000원", "e.g. 25,000 KRW")} style={inp} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6, display: "block" }}>{t("제형 / 텍스처", "Formulation / Texture")}</label>
              <input value={form.formulation} onChange={e => setForm(p => ({ ...p, formulation: e.target.value }))}
                placeholder={t("예: 수분 젤 타입, 끈적이지 않은 마무리", "e.g. Hydrating gel type, non-sticky finish")} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6, display: "block" }}>{t("타겟 효능", "Target Benefit")}</label>
              <input value={form.targetEffect} onChange={e => setForm(p => ({ ...p, targetEffect: e.target.value }))}
                placeholder={t("예: 보습, 미백, 주름 개선", "e.g. Hydration, whitening, anti-wrinkle")} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6, display: "block" }}>{t("주요 성분 요청", "Requested Ingredients")}</label>
              <textarea value={form.ingredients} onChange={e => setForm(p => ({ ...p, ingredients: e.target.value }))}
                placeholder={t("원하는 성분이 있으시면 입력해주세요", "Enter any ingredients you'd like included")} style={ta} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6, display: "block" }}>{t("패키지 / 용기", "Packaging / Container")}</label>
              <textarea value={form.packaging} onChange={e => setForm(p => ({ ...p, packaging: e.target.value }))}
                placeholder={t("용기, 포장재 관련 요청사항", "Requests for container or packaging materials")} style={ta} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6, display: "block" }}>{t("레퍼런스", "Reference")}</label>
              <textarea value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))}
                placeholder={t("참고 제품, 브랜드, 이미지 링크 등", "Reference products, brands, image links, etc.")} style={ta} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6, display: "block" }}>{t("추가 요청사항", "Additional Requests")}</label>
              <textarea value={form.additionalNotes} onChange={e => setForm(p => ({ ...p, additionalNotes: e.target.value }))}
                placeholder={t("기타 요청사항을 자유롭게 입력해주세요", "Feel free to describe anything else you need")} style={ta} />
            </div>
          </div>

          {/* Add Product Button */}
          <button onClick={addProduct} style={{
            width: "100%", padding: 14, marginTop: 16,
            border: `1.5px dashed ${C.accent}`,
            borderRadius: 12, background: C.accentLight,
            fontSize: 14, fontWeight: 600, color: C.accent,
            cursor: "pointer", fontFamily: FONT,
          }}>
            {t("+ 이 제품 추가하고 다음 제품 입력", "+ Add This Product & Enter Another")}
          </button>
        </div>
      </div>

      {/* Submit */}
      <div style={{
        padding: "12px 20px 28px",
        background: "rgba(247,247,247,0.92)", backdropFilter: "blur(20px)",
        position: "sticky", bottom: 0, borderTop: `1px solid ${C.border}`,
      }}>
        <div style={{ fontSize: 12, color: C.textMuted, textAlign: "center", marginBottom: 8 }}>
          {products.length > 0 ? t(`${products.length}개 제품 등록됨`, `${products.length} product${products.length === 1 ? "" : "s"} added`) : ""}
          {products.length > 0 && form.productName.trim() ? t(" + 작성 중 1개", " + 1 in progress") : ""}
        </div>
        <button onClick={submitDevForm} disabled={submitSt === "loading"} style={{
          width: "100%", padding: 16, border: "none", borderRadius: 14,
          background: submitSt === "error" ? C.error : C.accent,
          color: C.white, fontSize: 16, fontWeight: 600,
          fontFamily: FONT, cursor: "pointer",
          opacity: submitSt === "loading" ? 0.6 : 1,
        }}>
          {submitSt === "loading" ? t("제출 중...", "Submitting...") : submitSt === "error" ? t("오류 — 재시도", "Error — Retry") : t("개발의뢰서 제출하기", "Submit Development Request")}
        </button>
      </div>
    </div>
  );
}
