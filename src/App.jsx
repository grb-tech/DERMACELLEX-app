import { useState, useEffect, useRef, useCallback } from "react";

// ━━━━━━━━━━ DESIGN TOKENS (DERMACELLEX Palette) ━━━━━━━━━━
const C = {
  bg: "#F7F7F7", surface: "#FFFFFF", surfaceAlt: "#F0F0F0",
  border: "#E4E4E4", borderLight: "#ECECEC",
  text: "#1A1A1A", textSub: "#6B6B6B", textMuted: "#9E9E9E",
  primary: "#434343", accent: "#EA5C2A", accentLight: "#FFF0EB", accentDark: "#C94A1E",
  oem: "#EA5C2A", odm: "#434343", ocm: "#2C7BE5", obm: "#7C3AED",
  success: "#10B981", error: "#EF4444", white: "#FFFFFF", black: "#000000",
  disabled: "#D1D5DB", disabledBg: "#F3F4F6",
  gradStart: "#EA5C2A", gradEnd: "#FF8A5C",
};

const FONT = "'Pretendard', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif";
const FONT_URL = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css";

// ━━━━━━━━━━ SERVICES ━━━━━━━━━━
const SVC = {
  OEM: {
    code: "OEM", full: "Original Equipment Manufacturing", color: C.oem, icon: "🏭",
    one: "제공된 처방 기반 충진·포장 생산",
    desc: "고객이 제공한 벌크 또는 자사 벌크를 충진·포장하여 완제품으로 제공",
    req: "03류 상표 + 책임판매업 필수",
    fit: "자체 처방을 보유한 제조사·브랜드사",
  },
  ODM: {
    code: "ODM", full: "Original Development Manufacturing", color: C.odm, icon: "🔬",
    one: "제품 기획·개발·생산 토탈 서비스",
    desc: "고객 브랜드로 제품을 기획·개발·생산하는 토탈 개발 서비스",
    req: "03류 상표 + 책임판매업 필수",
    fit: "상표와 브랜드 가이드를 보유한 브랜드사",
  },
  OCM: {
    code: "OCM", full: "Original Concept Management", color: C.ocm, icon: "🎨",
    one: "컨셉 기획부터 생산까지 일괄 관리",
    desc: "컨셉 기획부터 디자인, 개발, 생산까지 일괄 관리하는 서비스",
    req: "제한 없음",
    fit: "브랜드 방향은 있으나 구체화가 필요한 업체",
  },
  OBM: {
    code: "OBM", full: "Original Brand Management", color: C.obm, icon: "👑",
    one: "브랜드 생성부터 전체 운영 관리",
    desc: "브랜드 생성부터 전략, 제품, 마케팅, 운영까지 지속적 성장 관리",
    req: "제한 없음",
    fit: "화장품 브랜드를 처음 시작하려는 회사",
  },
};

// ━━━━━━━━━━ 인트로 히어로: "WHY DERMACELLEX" 통계 (제조사 OS 앱.dc.html 01번 화면 기준) ━━━━━━━━━━
const HERO_STATS = [
  { num: "110", unit: "개+", label: "체크 요소" },
  { num: "180", unit: "일+", label: "기획~출시" },
  { num: "1,800", unit: "만+", label: "투입 비용" },
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
  1: { maxRaw: 19, scaled: 15, label: "사업·브랜드" },
  2: { maxRaw: 25, scaled: 25, label: "제품·생산" },
  3: { maxRaw: 15, scaled: 20, label: "생산·발주" },
  4: { maxRaw: 15, scaled: 15, label: "프로젝트 실행" },
  5: { maxRaw: 24, scaled: 15, label: "판매·협업" },
};

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

function SectionProgress({ current, sections }) {
  return (
    <div style={{ display: "flex", gap: 4, padding: "8px 20px 0" }}>
      {sections.map((s, i) => (
        <div key={i} style={{
          flex: 1, height: 3, borderRadius: 2,
          background: i < current ? C.accent : i === current ? `linear-gradient(90deg, ${C.accent}, ${C.border})` : C.border,
          transition: "all 0.3s",
        }} />
      ))}
    </div>
  );
}

// ━━━━━━━━━━ MAIN APP ━━━━━━━━━━
export default function App() {
  // ─── Check for dev-request form route ───
  const [route, setRoute] = useState("main");
  const [clientId, setClientId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (window.location.pathname === "/form" || params.has("form")) {
      setRoute("devform");
      // inquiry = 제조 문의 관리 페이지 ID (V2 스키마 기준, 신규 링크).
      // client/id는 예전에 이미 발송된 링크와의 호환을 위해 남겨둠.
      setClientId(params.get("inquiry") || params.get("client") || params.get("id"));
    }
  }, []);

  if (route === "devform") return <DevRequestForm clientId={clientId} />;
  return <MainFlow />;
}

// ━━━━━━━━━━ MAIN FLOW ━━━━━━━━━━
function MainFlow() {
  const [phase, setPhase] = useState("intro");
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
  const cRef = useRef(null);

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

  const pickAnswer = (qi, oi) => {
    const wasAnswered = answers.hasOwnProperty(qi);
    setAnswers(prev => ({ ...prev, [qi]: oi }));
    if (!wasAnswered) {
      setTimeout(() => {
        if (qi < QUESTIONS.length - 1) {
          setAnim(true);
          setTimeout(() => { setQIdx(i => i + 1); setAnim(false); }, 200);
        } else {
          setPhase("result");
        }
      }, 320);
    }
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
    if (!form.name.trim()) e.name = "필수";
    if (!form.phone.trim()) e.phone = "필수";
    if (!form.email.includes("@")) e.email = "올바른 이메일을 입력해주세요";
    if (!form.businessName.trim()) e.businessName = "필수";
    if (!form.businessType) e.businessType = "필수";
    if (!form.ceoName.trim()) e.ceoName = "필수";
    if (!form.hasTrademark) e.hasTrademark = "필수";
    if (!form.hasLicense) e.hasLicense = "필수";
    if (!form.distributionCountries.length) e.distributionCountries = "최소 1개 선택";
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

  // ─── 04 결과 화면 제출: 진단 스코어링 기록 (내부 전용) + 다음 단계 분기 ───
  const submitDiagnosis = async (willWriteDoc) => {
    setSubmitSt("loading");
    const sc = calcScores();
    const questionsDetail = QUESTIONS.map((q, i) => ({
      section: q.section,
      question: q.question,
      selectedText: answers[i] !== undefined ? q.options[answers[i]].text : '',
      score: answers[i] !== undefined ? q.options[answers[i]].score : 0,
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
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "서버 오류");
      setField("willWriteDoc", willWriteDoc);
      setSubmitSt(null);
      setPhase("meeting");
    } catch (err) {
      console.error("Diagnosis error:", err);
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
    setSubmitSt("loading");
    try {
      const res = await fetch("/api/meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquiryId: reg?.inquiryId,
          contactId: reg?.contactId,
          businessName: form.businessName,
          meetingDate1: form.meetingDate1, meetingTime1: form.meetingTime1,
          meetingDate2: form.meetingDate2, meetingTime2: form.meetingTime2,
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "서버 오류");
      setSubmitSt("success");
      setPhase("complete");
    } catch (err) {
      console.error("Meeting error:", err);
      setSubmitSt("error");
      setTimeout(() => setSubmitSt(null), 3000);
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
  const uLabel = (req) => ({ fontSize: 12, fontWeight: 700, color: "#8A8A8E", display: "flex", gap: 4 });
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
  const UField = ({ label, req, children }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <div style={uLabel()}>{label}{req && <span style={{ color: C.accent }}>*</span>}</div>
      {children}
    </div>
  );

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
          <button style={{
            display: "flex", alignItems: "center", gap: 6, height: 34, padding: "0 12px",
            border: "1px solid #2E2E32", borderRadius: 99, background: "rgba(20,20,22,.72)",
            color: "#E4E4E4", fontSize: 12.5, fontWeight: 800, cursor: "pointer", fontFamily: FONT,
          }}>🌐 한국어</button>
        </div>
        <div ref={cRef} style={{ flex: 1, overflowY: "auto", padding: "8px 26px 32px", position: "relative", display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, color: "#fff", marginTop: 6 }}>DERMACELLEX</div>

          <div style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 3, color: C.accent }}>MANUFACTURING OS</div>
            <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.32, letterSpacing: -0.8, color: "#fff", whiteSpace: "pre-line" }}>
              {"제품 진단부터 생산까지\n제조의 모든 과정을\n함께 합니다"}
            </div>
            <div style={{ fontSize: 15, lineHeight: 1.7, color: "#9A9A9E" }}>
              제품 진단부터 기획 · 견적 · 계약 · 생산까지, 복잡했던 제조 과정을 하나로 연결합니다.
            </div>
          </div>

          <div style={{ marginTop: "auto", paddingTop: 32, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: "#5E5E62" }}>WHY DERMACELLEX</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {HERO_STATS.map((st, i) => (
                <div key={i} style={{ background: "#161618", border: "1px solid #232326", borderRadius: 16, padding: "13px 12px" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -1, display: "flex", alignItems: "baseline" }}>
                    <AnimNum value={st.num} />
                    <span style={{ fontSize: 12, color: C.accent, marginLeft: 1 }}>{st.unit}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "#8A8A8E", marginTop: 3 }}>{st.label}</div>
                </div>
              ))}
              <div style={{ gridColumn: "span 3", background: "#161618", border: "1px solid #232326", borderRadius: 16, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: C.accent, flex: "none" }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: "#D8D8DA" }}>30분 진단으로 제품기술(개발)기준서까지</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => setPhase("info")} style={{
              height: 58, border: 0, borderRadius: 18, background: C.accent, color: "#fff",
              fontSize: 17, fontWeight: 800, letterSpacing: -0.4, cursor: "pointer", fontFamily: FONT,
              boxShadow: "0 12px 28px -12px rgba(234,92,42,.9)",
            }}>제조서비스 문의하기</button>
            <button style={{
              height: 58, border: "1px solid #2E2E32", borderRadius: 18, background: "#141416",
              color: "#E4E4E4", fontSize: 17, fontWeight: 700, letterSpacing: -0.4, cursor: "pointer", fontFamily: FONT,
            }}>전용 페이지 이동하기</button>
            <div style={{ textAlign: "center", fontSize: 12, color: "#5E5E62", marginTop: 2 }}>
              20문항 · 약 5분 · 상담 확정 시 6자리 코드 발급
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ━━━━━━━━━━ PHASE: QUIZ ━━━━━━━━━━
  if (phase === "quiz") {
    const q = QUESTIONS[qIdx];
    const sections = [...new Set(QUESTIONS.map(q => q.sectionNum))];
    const currentSectionIdx = sections.indexOf(q.sectionNum);
    const isNewSection = qIdx === 0 || QUESTIONS[qIdx - 1].sectionNum !== q.sectionNum;

    return (
      <div style={wrap}>
        <style>{css}</style>
        <div style={hdr}>
          <button onClick={goBackQuiz} style={backBtn}>←</button>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.textMuted }}>{qIdx + 1} / {QUESTIONS.length}</div>
          <div style={{ width: 32 }} />
        </div>
        <SectionProgress current={currentSectionIdx} sections={sections} />
        <div ref={cRef} style={{
          ...body, padding: "24px 20px",
          opacity: anim ? 0 : 1, transform: anim ? "translateX(20px)" : "none",
          transition: "all 0.2s ease",
        }}>
          {/* Section Badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "5px 14px", borderRadius: 100, marginBottom: 16,
            background: C.accentLight, color: C.accent,
            fontSize: 12, fontWeight: 600,
          }}>
            {q.section}
          </div>

          <h2 style={{
            fontSize: 20, fontWeight: 700, lineHeight: 1.5,
            color: C.text, margin: "0 0 24px", letterSpacing: -0.5,
          }}>{q.question}</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {q.options.map((opt, i) => {
              const sel = answers[qIdx] === i;
              return (
                <button key={i}
                  onClick={() => pickAnswer(qIdx, i)}
                  style={{
                    width: "100%", padding: "16px 18px", textAlign: "left",
                    border: `1.5px solid ${sel ? C.accent : C.border}`,
                    borderRadius: 14, cursor: "pointer",
                    background: sel ? C.accentLight : C.surface,
                    fontSize: 14, fontFamily: FONT, lineHeight: 1.5,
                    color: sel ? C.accent : C.text,
                    fontWeight: sel ? 600 : 400,
                    transition: "all 0.15s",
                    boxShadow: sel ? `0 2px 12px ${C.accent}18` : "none",
                  }}
                >{opt.text}</button>
              );
            })}
          </div>
          {/* Next button for already-answered questions */}
          {answers.hasOwnProperty(qIdx) && (
            <div style={{ padding: "16px 0 0" }}>
              <button onClick={() => {
                if (qIdx < QUESTIONS.length - 1) {
                  setAnim(true);
                  setTimeout(() => { setQIdx(i => i + 1); setAnim(false); }, 200);
                } else { setPhase("result"); }
              }} style={btn1}>다음</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ━━━━━━━━━━ PHASE: RESULT ━━━━━━━━━━
  if (phase === "result" && scoring) {
    return (
      <div style={wrap}>
        <style>{css}</style>
        <div style={hdr}>
          <button onClick={() => { setPhase("quiz"); setQIdx(QUESTIONS.length - 1); }} style={backBtn}>←</button>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.accent }}>진단 결과</div>
          <div style={{ width: 32 }} />
        </div>
        <div ref={cRef} style={{ ...body, padding: "24px 20px 140px" }}>
          {/* Hero Card */}
          <div style={{
            background: `linear-gradient(135deg, ${C.primary} 0%, ${C.accent} 100%)`,
            borderRadius: 20, padding: "32px 24px", marginBottom: 20,
            color: C.white, textAlign: "center",
            boxShadow: `0 12px 40px ${C.accent}30`,
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{SVC[recommended].icon}</div>
            <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.8, letterSpacing: 2, marginBottom: 8 }}>추천 서비스</div>
            <h2 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 8px", letterSpacing: -1 }}>{recommended}</h2>
            <p style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.6 }}>{SVC[recommended].one}</p>
          </div>

          {/* Service Cards */}
          <div style={{ fontSize: 13, fontWeight: 700, color: C.textMuted, marginBottom: 12, padding: "0 2px" }}>
            다른 서비스를 선택하실 수도 있습니다
          </div>
          {Object.entries(SVC).map(([code, s]) => {
            const isSel = chosen === code;
            const isRec = recommended === code;
            const isOemOdm = code === "OEM" || code === "ODM";
            return (
              <div key={code}>
                <button onClick={() => setSelectedSvc(code)} style={{
                  width: "100%", padding: "16px 18px", marginBottom: isOemOdm ? 4 : 10,
                  border: `1.5px solid ${isSel ? s.color : C.border}`,
                  borderRadius: 14, background: isSel ? `${s.color}08` : C.surface,
                  textAlign: "left", cursor: "pointer", fontFamily: FONT,
                  transition: "all 0.15s", display: "flex", gap: 14, alignItems: "center",
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: `${s.color}12`, display: "flex",
                    alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0,
                  }}>{s.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{code}</span>
                      {isRec && <span style={{
                        fontSize: 10, fontWeight: 700, color: C.accent,
                        background: C.accentLight, padding: "2px 7px", borderRadius: 100,
                      }}>추천</span>}
                    </div>
                    <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.4 }}>{s.one}</div>
                  </div>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    border: `2px solid ${isSel ? s.color : C.border}`,
                    background: isSel ? s.color : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, transition: "all 0.15s",
                  }}>
                    {isSel && <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.white }} />}
                  </div>
                </button>
                {isOemOdm && (
                  <div style={{ fontSize: 11, color: C.textMuted, padding: "0 6px 8px", lineHeight: 1.4 }}>
                    화장품 책임판매업 등록 또는 03류 상표 보유 시 권장
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* 다음 단계 선택 — 제조사 OS 앱.dc.html 04번 화면 기준 두 갈래 */}
        <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.textMuted, padding: "8px 2px 0" }}>다음 단계 선택</div>
          <button onClick={() => submitDiagnosis(true)} disabled={submitSt === "loading"} style={{
            ...btn1, opacity: submitSt === "loading" ? 0.6 : 1,
          }}>
            {submitSt === "loading" ? "저장 중..." : "제조 품목 선택까지 진행"}
          </button>
          <button onClick={() => submitDiagnosis(false)} disabled={submitSt === "loading"} style={btnOutline}>
            상담만 먼저 신청하기
          </button>
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
              <div style={{ fontSize: 22, fontWeight: 800, color: "#111", letterSpacing: -0.8 }}>고객 정보 등록</div>
              <div style={{ fontSize: 13.5, color: "#8A8A8E", marginTop: 3, fontWeight: 600 }}>진단 전 1회만 입력하면 이후 문의에 자동 연결됩니다</div>
            </div>
          </div>
        </div>
        <div ref={cRef} style={{ flex: 1, overflowY: "auto", padding: "2px 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>

          {/* 사업자 정보 */}
          <div style={card2}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#111", letterSpacing: -0.2 }}>사업자 정보</div>
            <UField label="회사명" req>
              <input value={form.businessName} placeholder="더마테스트 주식회사" onChange={e => setField("businessName", e.target.value)} style={uInpBig} />
              <Err f="businessName" />
            </UField>
            <UField label="대표자" req>
              <input value={form.ceoName} placeholder="이도현" onChange={e => setField("ceoName", e.target.value)} style={uInp} />
              <Err f="ceoName" />
            </UField>
            <UField label="사업자 구분" req>
              <div style={{ display: "flex", gap: 7 }}>
                {["법인", "개인", "예비창업"].map(v => (
                  <button key={v} onClick={() => setField("businessType", v)} style={toggle3(form.businessType === v)}>{v}</button>
                ))}
              </div>
              <Err f="businessType" />
            </UField>
            <UField label="국가" req>
              <select value={form.country} onChange={e => setField("country", e.target.value)} style={{ ...uInp, appearance: "none" }}>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </UField>
            <UField label="03류 상표">
              <div style={{ display: "flex", gap: 7 }}>
                {[{ v: "보유", l: "보유" }, { v: "출원중", l: "출원중" }, { v: "미보유", l: "미보유" }].map(({ v, l }) => (
                  <button key={v} onClick={() => setField("hasTrademark", v)} style={toggle3(form.hasTrademark === v)}>{l}</button>
                ))}
              </div>
              <Err f="hasTrademark" />
            </UField>
            <UField label="화장품책임판매업 등록">
              <div style={{ display: "flex", gap: 7 }}>
                {[{ v: "등록완료", l: "등록완료" }, { v: "등록예정", l: "등록예정" }, { v: "미등록", l: "미등록" }].map(({ v, l }) => (
                  <button key={v} onClick={() => setField("hasLicense", v)} style={toggle3(form.hasLicense === v)}>{l}</button>
                ))}
              </div>
              <Err f="hasLicense" />
            </UField>
          </div>

          {/* 담당자 정보 */}
          <div style={card2}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#111", letterSpacing: -0.2 }}>담당자 정보</div>
            <UField label="이름" req>
              <input value={form.name} placeholder="김예시" onChange={e => setField("name", e.target.value)} style={uInp} />
              <Err f="name" />
            </UField>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <UField label="부서">
                <input value={form.department} placeholder="마케팅팀" onChange={e => setField("department", e.target.value)} style={uInp} />
              </UField>
              <UField label="직함">
                <input value={form.position} placeholder="대리" onChange={e => setField("position", e.target.value)} style={uInp} />
              </UField>
            </div>
            <UField label="연락처" req>
              <input value={form.phone} placeholder="010-1234-5678" type="tel" onChange={e => setField("phone", e.target.value)} style={uInp} />
              <Err f="phone" />
            </UField>
            <UField label="이메일" req>
              <input value={form.email} placeholder="brand@dermatest.co.kr" type="email" onChange={e => setField("email", e.target.value)} style={uInp} />
              <Err f="email" />
            </UField>
          </div>

          {/* 주요 유통국가 + 문의 경로 */}
          <div style={card2}>
            <UField label="주요 유통국가" req>
              <span style={{ fontWeight: 400, fontSize: 12, color: "#B0B0B4", marginLeft: 4 }}>복수 선택</span>
            </UField>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: -8 }}>
              {COUNTRIES.map(c => (
                <button key={c} onClick={() => toggleDist(c)} style={pill2(form.distributionCountries.includes(c))}>{c}</button>
              ))}
            </div>
            <Err f="distributionCountries" />
            <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#111", letterSpacing: -0.2 }}>문의 경로</div>
              <div style={{ fontSize: 12, color: "#8A8A8E", fontWeight: 600 }}>더마셀렉스를 알게 된 경로를 하나만 선택해 주세요</div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {["검색엔진", "SNS", "온라인광고", "제품·제조사검색", "제품레퍼런스", "지인·업계추천", "기존고객·재문의", "박람회·전시회", "세미나·교육", "영업담당자", "파트너·협력사", "B2B플랫폼", "언론·콘텐츠", "기타"].map(s => (
                <button key={s} onClick={() => setField("inquirySource", s)} style={pill2(form.inquirySource === s)}>{s}</button>
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
            {submitSt === "loading" ? "저장 중..." : submitSt === "error" ? "오류 — 잠시 후 재시도" : "진단 시작"}
          </button>
        </div>
      </div>
    );
  }

  // ━━━━━━━━━━ PHASE: MEETING (07 상담 일정 — 최소 기능 버전) ━━━━━━━━━━
  if (phase === "meeting") {
    return (
      <div style={{ ...wrap, background: "#F4F4F5" }}>
        <style>{css}</style>
        <div style={{ flex: "none", padding: "14px 20px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#111", letterSpacing: -0.8 }}>1차 제조 상담 일정</div>
            <div style={{ fontSize: 13.5, color: "#8A8A8E", marginTop: 3, fontWeight: 600 }}>
              {form.willWriteDoc ? "개발의뢰서 작성 후 담당자가 별도 안내해 드립니다" : "담당자와 30분간 Zoom으로 진행됩니다"}
            </div>
          </div>
        </div>
        <div ref={cRef} style={{ flex: 1, overflowY: "auto", padding: "2px 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={card2}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#111", letterSpacing: -0.2 }}>희망 미팅일 <span style={{ color: C.accent }}>*</span> <span style={{ fontWeight: 600, fontSize: 12, color: "#8A8A8E" }}>ZOOM 미팅</span></div>
              <div style={{ fontSize: 11.5, color: "#B0B0B4", marginTop: 6, lineHeight: 1.5 }}>※ 한국 시간(KST) 기준 · 영업일(월~금) · 09:00~18:00</div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#8A8A8E", marginBottom: 6 }}>1안 (필수)</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="date" value={form.meetingDate1} onChange={e => setField("meetingDate1", e.target.value)}
                  style={{ ...uInp, borderBottom: `1.5px solid ${errors.meetingDate1 ? C.error : "#E4E4E4"}` }} />
                <select value={form.meetingTime1 || ""} onChange={e => setField("meetingTime1", e.target.value)} style={uInp}>
                  <option value="">시간 선택</option>
                  {Array.from({ length: 19 }, (_, i) => {
                    const h = 9 + Math.floor(i / 2);
                    const m = i % 2 === 0 ? "00" : "30";
                    if (h >= 18 && m === "30") return null;
                    return <option key={i} value={`${h}:${m}`}>{`${h}:${m}`}</option>;
                  }).filter(Boolean)}
                </select>
              </div>
              <Err f="meetingDate1" />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#8A8A8E", marginBottom: 6 }}>2안 (선택)</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="date" value={form.meetingDate2} onChange={e => setField("meetingDate2", e.target.value)} style={uInp} />
                <select value={form.meetingTime2 || ""} onChange={e => setField("meetingTime2", e.target.value)} style={uInp}>
                  <option value="">시간 선택</option>
                  {Array.from({ length: 19 }, (_, i) => {
                    const h = 9 + Math.floor(i / 2);
                    const m = i % 2 === 0 ? "00" : "30";
                    if (h >= 18 && m === "30") return null;
                    return <option key={i} value={`${h}:${m}`}>{`${h}:${m}`}</option>;
                  }).filter(Boolean)}
                </select>
              </div>
            </div>
          </div>
        </div>
        <div style={{ flex: "none", padding: "12px 20px", background: "#fff", borderTop: "1px solid #E4E4E4" }}>
          <button onClick={submitMeeting} disabled={submitSt === "loading"} style={{
            width: "100%", height: 52, border: 0, borderRadius: 16, background: submitSt === "error" ? C.error : "#111",
            color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: FONT, letterSpacing: -0.4,
            opacity: submitSt === "loading" ? 0.6 : 1,
          }}>
            {submitSt === "loading" ? "제출 중..." : submitSt === "error" ? "오류 — 잠시 후 재시도" : "상담 신청 완료"}
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
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 12px", color: C.text }}>접수가 완료되었습니다</h2>
            <p style={{ fontSize: 15, color: C.textSub, lineHeight: 1.7 }}>
              담당자가 확인 후<br />
              <strong style={{ color: C.text }}>기입하신 이메일로 안내</strong>드리겠습니다.
            </p>
          </div>

          {/* Summary */}
          <div style={{
            background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`,
            padding: 20, marginBottom: 20,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, letterSpacing: 1, marginBottom: 14 }}>접수 요약</div>
            {[
              ["선택 서비스", `${chosen} · ${SVC[chosen].full}`],
              ["담당자", form.name],
              ["이메일", form.email],
              ["연락처", form.phone],
              ["사업자", `${form.businessType} · ${form.businessName}`],
              ["상표", form.hasTrademark],
              ["책임판매업", form.hasLicense],
              ["주요 유통국가", form.distributionCountries.join(", ")],
              ["개발의뢰서", form.willWriteDoc ? "작성 예정" : "미작성 (상담 우선)"],
              ["미팅 1안", form.meetingDate1 ? new Date(form.meetingDate1).toLocaleString("ko") : "-"],
              ["미팅 2안", form.meetingDate2 ? new Date(form.meetingDate2).toLocaleString("ko") : "-"],
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
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14 }}>다음 단계 안내</div>
            {[
              { n: "1", t: "담당자 배정 및 가이드 메일 발송" },
              { n: "2", t: "미팅 일정 확정 (ZOOM)" },
              { n: "3", t: form.willWriteDoc ? "개발의뢰서 양식 안내" : "상담 후 개발의뢰서 안내" },
              { n: "4", t: "가견적 산출 및 계약 검토" },
            ].map(({ n, t }) => (
              <div key={n} style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "center" }}>
                <div style={{
                  width: 26, height: 26, borderRadius: "50%", background: C.accent, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>{n}</div>
                <span style={{ fontSize: 13, color: C.textSub }}>{t}</span>
              </div>
            ))}
          </div>

          {/* Contact */}
          <div style={{
            background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`,
            padding: "16px 18px", fontSize: 13, color: C.textSub, lineHeight: 1.7,
          }}>
            📧 메일 확인이 어려우신 경우 아래 연락처로 문의해 주세요.<br />
            <strong style={{ color: C.text }}>이메일:</strong> contact@dermacellex.com
          </div>
        </div>
      </div>
    );
  }

  return null;
}


// ━━━━━━━━━━ DEV REQUEST FORM (개발의뢰서) ━━━━━━━━━━
function DevRequestForm({ clientId }) {
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
      alert("최소 1개 이상의 제품을 입력해주세요.");
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
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, color: C.text }}>개발의뢰서가 제출되었습니다</h2>
          <p style={{ fontSize: 14, color: C.textSub, lineHeight: 1.7 }}>
            담당자 검토 후 가견적이 산출됩니다.<br />
            이메일로 안내드리겠습니다.
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
        <div style={{ fontSize: 13, fontWeight: 600, color: C.textMuted }}>개발의뢰서</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 160px" }}>
        {/* Client Info */}
        {clientInfo && (
          <div style={{
            background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`,
            padding: "14px 16px", marginBottom: 20,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 8 }}>의뢰사 정보</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{clientInfo.name || "고객"}</div>
            <div style={{ fontSize: 12, color: C.textSub }}>{clientInfo.service || ""}</div>
          </div>
        )}

        {/* Info Banner */}
        <div style={{
          background: C.accentLight, borderRadius: 14, padding: "14px 16px", marginBottom: 20,
          border: `1px solid ${C.accent}20`,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 6 }}>💡 가견적 산출 안내</div>
          <p style={{ fontSize: 12, color: C.textSub, lineHeight: 1.6, margin: 0 }}>
            개발의뢰서를 작성하시면 가견적을 산출해 드립니다.
            여러 제품을 한번에 등록할 수 있습니다.
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
              <div style={{ fontSize: 12, color: C.textSub }}>{p.productType} · {p.volume} · {p.quantity}개</div>
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
            제품 {products.length + 1} 정보 입력
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6, display: "block" }}>
                제품명 <span style={{ color: C.accent }}>*</span>
              </label>
              <input value={form.productName} onChange={e => setForm(p => ({ ...p, productName: e.target.value }))}
                placeholder="예: 모이스처 세럼" style={inp} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6, display: "block" }}>제품 유형</label>
                <select value={form.productType} onChange={e => setForm(p => ({ ...p, productType: e.target.value }))} style={inp}>
                  <option value="">선택</option>
                  {["세럼/에센스", "토너/스킨", "크림", "로션/에멀전", "클렌저", "마스크팩", "선케어", "앰플", "미스트", "기타"].map(t =>
                    <option key={t} value={t}>{t}</option>
                  )}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6, display: "block" }}>용량</label>
                <input value={form.volume} onChange={e => setForm(p => ({ ...p, volume: e.target.value }))}
                  placeholder="예: 50ml" style={inp} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6, display: "block" }}>생산수량</label>
                <input value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                  placeholder="예: 3000" type="number" style={inp} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6, display: "block" }}>목표가격</label>
                <input value={form.targetPrice} onChange={e => setForm(p => ({ ...p, targetPrice: e.target.value }))}
                  placeholder="예: 25,000원" style={inp} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6, display: "block" }}>제형 / 텍스처</label>
              <input value={form.formulation} onChange={e => setForm(p => ({ ...p, formulation: e.target.value }))}
                placeholder="예: 수분 젤 타입, 끈적이지 않은 마무리" style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6, display: "block" }}>타겟 효능</label>
              <input value={form.targetEffect} onChange={e => setForm(p => ({ ...p, targetEffect: e.target.value }))}
                placeholder="예: 보습, 미백, 주름 개선" style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6, display: "block" }}>주요 성분 요청</label>
              <textarea value={form.ingredients} onChange={e => setForm(p => ({ ...p, ingredients: e.target.value }))}
                placeholder="원하는 성분이 있으시면 입력해주세요" style={ta} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6, display: "block" }}>패키지 / 용기</label>
              <textarea value={form.packaging} onChange={e => setForm(p => ({ ...p, packaging: e.target.value }))}
                placeholder="용기, 포장재 관련 요청사항" style={ta} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6, display: "block" }}>레퍼런스</label>
              <textarea value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))}
                placeholder="참고 제품, 브랜드, 이미지 링크 등" style={ta} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6, display: "block" }}>추가 요청사항</label>
              <textarea value={form.additionalNotes} onChange={e => setForm(p => ({ ...p, additionalNotes: e.target.value }))}
                placeholder="기타 요청사항을 자유롭게 입력해주세요" style={ta} />
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
            + 이 제품 추가하고 다음 제품 입력
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
          {products.length > 0 ? `${products.length}개 제품 등록됨` : ""}
          {products.length > 0 && form.productName.trim() ? " + 작성 중 1개" : ""}
        </div>
        <button onClick={submitDevForm} disabled={submitSt === "loading"} style={{
          width: "100%", padding: 16, border: "none", borderRadius: 14,
          background: submitSt === "error" ? C.error : C.accent,
          color: C.white, fontSize: 16, fontWeight: 600,
          fontFamily: FONT, cursor: "pointer",
          opacity: submitSt === "loading" ? 0.6 : 1,
        }}>
          {submitSt === "loading" ? "제출 중..." : submitSt === "error" ? "오류 — 재시도" : "개발의뢰서 제출하기"}
        </button>
      </div>
    </div>
  );
}
