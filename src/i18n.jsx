// 고객앱(MainFlow, DevRequestForm) 다국어 지원 — 1차로 한국어/영어만 지원한다.
// 관리자 페이지(Admin.jsx)는 내부 직원 전용이라 대상이 아니다.
//
// 설계: t(ko, en) 형태로 화면(JSX)에 바로 쓰는 문자열은 그 자리에서 한/영을 같이 적고,
// QUESTIONS · SVC처럼 데이터 배열에서 꺼내 쓰는 문자열은 t(koString) 한 개 인자로 불러
// 아래 DICT에서 찾는다(데이터 구조 자체는 한국어 원본 하나만 유지 — 점수 계산 등 로직이
// 문자열 값에 의존하지 않게 하기 위함). DICT에 없는 문자열은 원문(한국어)을 그대로 보여준다
// — 번역이 아직 안 된 문구가 있어도 화면이 깨지지 않는다.
//
// 노션에서 가져오는 값(고객 자유 입력, 담당자가 쓴 안내문 등)은 이 사전의 대상이 아니다 —
// 저장된 언어 그대로 보여준다(더마셀렉스 운영사항 문서, CLAUDE.md 참고).

import { createContext, useContext, useState, useEffect } from "react";

const STORAGE_KEY = "dc_lang";

function detectInitialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "ko" || saved === "en") return saved;
  } catch {}
  try {
    const nav = (navigator.language || navigator.userLanguage || "").toLowerCase();
    return nav.startsWith("ko") ? "ko" : "en";
  } catch {
    return "ko";
  }
}

export const LangContext = createContext({ lang: "ko", setLang: () => {}, t: (ko) => ko });

export function LangProvider({ children }) {
  const [lang, setLang] = useState(detectInitialLang);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
  }, [lang]);

  const t = (ko, en) => {
    if (lang !== "en") return ko;
    if (en != null) return en;
    return DICT[ko] || ko;
  };

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

// 화면 우상단 KOR/ENG 전환 버튼 — 자동 감지된 언어를 사용자가 직접 바꿀 수 있게 한다.
export function LangToggle({ style }) {
  const { lang, setLang } = useLang();
  return (
    <div style={{
      display: "flex", border: "1px solid #E4E4E4", borderRadius: 999, overflow: "hidden",
      fontSize: 11.5, fontWeight: 800, fontFamily: "inherit", ...style,
    }}>
      {["ko", "en"].map(l => (
        <button key={l} type="button" onClick={() => setLang(l)} style={{
          border: 0, cursor: "pointer", padding: "5px 10px",
          background: lang === l ? "#434343" : "#FFFFFF",
          color: lang === l ? "#FFFFFF" : "#6B6B6B",
        }}>{l === "ko" ? "KOR" : "ENG"}</button>
      ))}
    </div>
  );
}

// ── 데이터 배열(QUESTIONS · SECTION_WEIGHTS · SVC 등)에서 꺼내 쓰는 문자열 사전 ──
const DICT = {
  // SECTION_WEIGHTS: 섹션 라벨
  "사업·브랜드": "Business & Brand",
  "제품·생산": "Product & Production",
  "생산·발주": "Production & Ordering",
  "프로젝트 실행": "Project Execution",
  "판매·협업": "Sales & Partnership",
  // SECTION_WEIGHTS: 섹션 안내문
  "사업자와 브랜드 준비 상태를 확인합니다": "Checks your business and brand readiness",
  "개발할 제품이 얼마나 구체화되었는지 확인합니다": "Checks how specific your products are",
  "생산 수량과 발주 계획을 확인합니다": "Checks production quantity and ordering plans",
  "예산 · 담당 조직 · 의사결정 구조를 확인합니다": "Checks budget, team, and decision-making structure",
  "출시 일정과 판매 채널을 확인합니다": "Checks launch timing and sales channels",

  // Q1
  "현재 화장품 관련 사업은 어느 단계인가요?": "What stage is your cosmetics business at?",
  "사업을 처음 준비하고 있습니다": "Just starting to prepare my business",
  "브랜드 론칭을 준비하고 있습니다": "Preparing to launch a brand",
  "자체 브랜드를 운영하고 있습니다": "I run my own brand",
  "화장품 제조·유통 사업을 운영하고 있습니다": "I run a cosmetics manufacturing/distribution business",
  // Q2
  "현재 운영하거나 준비 중인 자체 브랜드가 있으신가요?": "Do you have (or are preparing) your own brand?",
  "아직 없습니다": "Not yet",
  "브랜드 콘셉트를 기획 중입니다": "Planning the brand concept",
  "브랜드명과 방향이 확정되어 있습니다": "The brand name and direction are set",
  "상표 출원·등록이 완료되어 있습니다": "The trademark has been filed/registered",
  // Q3
  "현재 판매 중인 화장품 제품은 어느 정도인가요?": "How many cosmetics products are you currently selling?",
  "없음": "None",
  "1~4개": "1-4",
  "5~9개": "5-9",
  "10~19개": "10-19",
  "20개 이상": "20+",
  // Q4
  "화장품을 개발하거나 생산해 본 경험은 어느 정도인가요?": "How much experience do you have developing/manufacturing cosmetics?",
  "처음 진행합니다": "This is my first time",
  "샘플 개발 경험이 있습니다": "I have sample development experience",
  "제품 출시 경험이 있습니다": "I have launched a product before",
  "지속적인 생산 경험이 있습니다": "I have ongoing production experience",
  "다품목을 정기적으로 생산·발주하고 있습니다": "I regularly produce/order multiple products",
  // Q5
  "이번 프로젝트에서 개발 또는 생산을 희망하는 제품은 몇 개인가요?": "How many products do you want to develop/produce in this project?",
  "10~14개": "10-14",
  "15~20개": "15-20",
  "21개 이상": "21+",
  // Q6
  "개발 또는 생산하려는 제품 목록은 어느 정도 정리되어 있나요?": "How finalized is your product list?",
  "아직 아이디어 단계입니다": "Still at the idea stage",
  "제품군만 정해져 있습니다": "Only the product category is decided",
  "일부 제품이 정해져 있습니다": "Some products are decided",
  "절반 이상 정해져 있습니다": "More than half are decided",
  "대부분의 제품이 확정되어 있습니다": "Most products are finalized",
  // Q7
  "제품별 제형·용량·주요 효능 등 제품 사양은 어느 정도 준비되어 있나요?": "How ready are your product specs (formulation, volume, key benefits, etc.)?",
  "대부분 미정입니다": "Mostly undecided",
  "일부만 정리되어 있습니다": "Only some are outlined",
  "약 절반 정도 정리되어 있습니다": "About half are outlined",
  "대부분 정리되어 있습니다": "Most are outlined",
  "전체적으로 구체화되어 있습니다": "Everything is fully specified",
  // Q8
  "제품별 목표 가격과 판매 조건은 어느 정도 준비되어 있나요?": "How ready are your target price and sales terms?",
  "아직 미정입니다": "Not decided yet",
  "목표 소비자가만 검토했습니다": "Only the target retail price has been reviewed",
  "주요 제품의 가격대가 정해져 있습니다": "Price ranges are set for key products",
  "공급가·소비자가가 대부분 정해져 있습니다": "Supply and retail prices are mostly set",
  "제조원가·가격·판매채널까지 구체화되어 있습니다": "Manufacturing cost, pricing, and sales channels are all specified",
  // Q9
  "여러 제품의 출시 순서와 우선순위가 정해져 있나요?": "Is the launch order and priority set for your products?",
  "아직 정해지지 않았습니다": "Not decided yet",
  "전체 동시 출시를 고려하고 있습니다": "Considering launching everything at once",
  "일부 주력 제품만 정해져 있습니다": "Only some flagship products are decided",
  "단계별 출시를 계획하고 있습니다": "Planning a phased launch",
  "단계별 제품과 일정이 구체적으로 확정되어 있습니다": "Phased products and schedule are fully confirmed",
  // Q10
  "개별 제품의 예상 초도 생산수량은 어느 정도인가요?": "What's the expected initial production quantity per product?",
  "아직 정하지 않았습니다": "Not decided yet",
  "3,000개 미만": "Under 3,000",
  "3,000~4,999개": "3,000-4,999",
  "5,000~9,999개": "5,000-9,999",
  "10,000개 이상": "10,000+",
  // Q11
  "제품별 최소 생산수량(MOQ)에 대해서는 어떻게 생각하시나요?": "How do you feel about minimum order quantity (MOQ) per product?",
  "아직 검토하지 않았습니다": "Haven't considered it yet",
  "최대한 소량 생산을 희망합니다": "I want the smallest quantity possible",
  "제품별 협의를 희망합니다": "I'd like to negotiate per product",
  "일반적인 제조 MOQ를 수용할 수 있습니다": "I can accept a standard manufacturing MOQ",
  "제품 특성에 맞춰 생산수량을 조정할 수 있습니다": "I can adjust quantity based on product characteristics",
  // Q12
  "이번 제품 외에 추가적인 제품 개발 또는 라인업 확장 계획이 있으신가요?": "Do you plan to develop more products or expand your lineup?",
  "현재는 없습니다": "Not at the moment",
  "출시·판매 결과에 따라 검토할 예정입니다": "I'll consider it based on launch/sales results",
  "추가 개발을 검토 중인 제품이 있습니다": "There are additional products I'm considering",
  "복수의 라인업 개발을 계획하고 있습니다": "I'm planning to develop multiple lineups",
  "지속적인 제품 확대 및 연간 개발을 계획하고 있습니다": "I'm planning ongoing expansion and annual development",
  // Q13
  "이번 프로젝트의 전체 예상 예산은 어느 정도인가요?": "What's the total expected budget for this project?",
  "아직 검토 중입니다": "Still under review",
  "5천만원 미만": "Under 50M KRW",
  "5천만원~1억원": "50M-100M KRW",
  "1억~3억원": "100M-300M KRW",
  "3억원 이상": "300M+ KRW",
  // Q14
  "이번 프로젝트를 담당할 담당자 또는 팀이 구성되어 있나요?": "Is there a person or team in charge of this project?",
  "대표자가 직접 담당합니다": "The CEO handles it directly",
  "실무 담당자가 있습니다": "There's a working-level person in charge",
  "전담 담당자가 있습니다": "There's a dedicated person in charge",
  "관련 부서가 역할을 나누어 운영합니다": "Relevant departments share the responsibilities",
  // Q15
  "프로젝트의 최종 의사결정은 어떻게 이루어지나요?": "How are final decisions made for this project?",
  "외부 파트너·투자자 협의가 필요합니다": "Requires consultation with outside partners/investors",
  "팀장·부서 책임자가 결정합니다": "Team leads/department heads decide",
  "임원·경영진이 결정합니다": "Executives/management decide",
  "대표자·오너가 직접 결정합니다": "The CEO/owner decides directly",
  // Q16
  "제품 출시를 희망하는 시기는 언제인가요?": "When would you like to launch the product?",
  "3개월 이내": "Within 3 months",
  "4~6개월 이내": "Within 4-6 months",
  "7~12개월 이내": "Within 7-12 months",
  // Q17
  "주요 판매 채널은 어떻게 계획하고 계신가요?": "What are your main planned sales channels?",
  "자사몰 위주로 시작할 계획입니다": "Planning to start mainly with our own online store",
  "온라인 마켓플레이스를 활용할 계획입니다": "Planning to use online marketplaces",
  "온·오프라인 복합 채널을 운영할 계획입니다": "Planning to run a mix of online and offline channels",
  "기존 유통 채널이 확보되어 있습니다": "We already have distribution channels in place",
  // Q18
  "해외 판매 계획이 있으신가요?": "Do you have plans to sell overseas?",
  "국내 시장에만 집중할 계획입니다": "Planning to focus only on the domestic market",
  "해외 진출을 검토 중입니다": "Considering expanding overseas",
  "해외 진출을 구체적으로 준비하고 있습니다": "Actively preparing to expand overseas",
  "이미 해외 바이어·채널이 있습니다": "Already have overseas buyers/channels",
  // Q19
  "제품의 처방(포뮬러/레시피)을 보유하고 계신가요?": "Do you already have a product formula (recipe)?",
  "어떤 제품이 좋을지 추천받고 싶습니다": "I'd like recommendations on what product to make",
  "원하는 제형·텍스처 정도만 정해져 있습니다": "Only the desired formulation/texture is decided",
  "기본 컨셉은 있으나 처방 개발이 필요합니다": "I have a basic concept but need formula development",
  "완성된 처방을 보유하고 있습니다": "I have a finished formula",
  // Q20
  "이번 프로젝트에서 가장 필요한 지원은 무엇인가요?": "What support do you need most for this project?",
  "생산(충진·포장)만 필요합니다": "Just production (filling/packaging)",
  "제품 개발 + 생산이 필요합니다": "Product development + production",
  "기획 + 디자인 + 개발 + 생산이 필요합니다": "Planning + design + development + production",
  "브랜드 론칭부터 전체 관리가 필요합니다": "Full management from brand launch onward",

  // SVC — OEM
  "기획은 준비됐나요?\n이제 제품으로 만들 차례입니다.": "Is your plan ready?\nTime to turn it into a product.",
  "확정된 제품 기획과 기준을 바탕으로 생산부터 충진 · 포장까지 완제품으로 구현합니다.": "Based on your finalized product plan and specs, we handle everything from production to filling and packaging.",
  "확정된 제품기획, 처방 · 벌크 또는 생산 기준, 부자재 기준": "Finalized product plan, formula/bulk or production standards, packaging material specs",
  "합의 범위의 생산 · 충진 · 포장. 처방 제공 또는 부자재 소싱 범위는 계약에서 확정": "Production, filling, and packaging within the agreed scope. Formula supply or material sourcing scope is finalized in the contract",
  "03류 상표 + 화장품책임판매업 등록 필수": "Class 3 trademark + cosmetics distributor registration required",
  // SVC — ODM
  "원하는 제품만 알려주세요.\n개발부터 생산까지 함께합니다.": "Just tell us what product you want.\nWe'll handle development through production.",
  "제품의 방향을 바탕으로 기획 · 처방 개발부터 부자재 소싱과 생산까지 연결합니다.": "Based on your product direction, we connect planning and formula development through material sourcing and production.",
  "제품개발의뢰서, 목표 제품 · 수량 · 일정 · 예산": "Product development request form, target product, quantity, schedule, and budget",
  "제품기획 지원, 큐카드 스튜디오 · 상세페이지 기획, R&D 처방, 기존 · 신규 · 고객 소싱 부자재 핸들링": "Product planning support, key-visual studio and detail-page planning, R&D formulation, handling of existing/new/customer-sourced materials",
  "03류 상표 보유 또는 출원 예정": "Class 3 trademark held or pending application",
  // SVC — OCM
  "제품만 만드는 것이 아니라,\n보이는 모습까지 완성합니다.": "We don't just make the product —\nwe complete how it looks, too.",
  "제품 기획과 처방 개발부터 패키지 · 콘텐츠 디자인까지 시장에 선보이기 위한 제품을 완성합니다.": "From product planning and formula development to packaging and content design, we complete your product for market.",
  "제품개발의뢰서, 제품 콘셉트 · 디자인 · 스토리보드 기초자료": "Product development request form, product concept, design, and storyboard reference materials",
  "ODM 범위와 함께 라벨 · 단상자 · 용기 적용 · 패키지 시안 · 상세페이지 · 브로슈어 · 카탈로그 등 디자인 업무": "ODM scope plus design work: labels, cartons, container application, packaging drafts, detail pages, brochures, and catalogs",
  "제한 없음": "No requirements",
  // SVC — OBM
  "제품을 넘어,\n브랜드를 만듭니다.": "Beyond the product —\nwe build the brand.",
  "브랜드 전략과 아이덴티티부터 제품 포트폴리오, 디자인과 마케팅 방향까지 함께 설계합니다.": "We design everything together — from brand strategy and identity to product portfolio, design, and marketing direction.",
  "제품개발의뢰서, 브랜드개발의뢰서, 사업 목표와 시장 · 타깃 자료": "Product development request form, brand development request form, business goals, and market/target materials",
  "R&D · 부자재 소싱과 함께 BI · CI · 브랜드 가이드 · 컬러 · 아이덴티티 · 홈페이지 · SNS 방향, 패키지 · 콘텐츠 디자인, 브랜드 매니지먼트": "R&D and material sourcing plus BI/CI, brand guide, color and identity, website/SNS direction, packaging and content design, and brand management",
};

export default DICT;
