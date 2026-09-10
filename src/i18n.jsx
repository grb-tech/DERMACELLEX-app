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
  // COUNTRIES (02 고객 정보 등록 — 국가 · 주요 유통국가). 저장값은 한국어 그대로 유지하고
  // 화면 표시만 영문으로 바꾼다.
  "대한민국": "South Korea", "미국": "United States", "일본": "Japan", "중국": "China",
  "베트남": "Vietnam", "태국": "Thailand", "인도네시아": "Indonesia", "말레이시아": "Malaysia",
  "필리핀": "Philippines", "싱가포르": "Singapore", "호주": "Australia", "캐나다": "Canada",
  "영국": "United Kingdom", "독일": "Germany", "프랑스": "France", "UAE": "UAE",
  "사우디아라비아": "Saudi Arabia", "러시아": "Russia", "브라질": "Brazil", "멕시코": "Mexico",
  "기타": "Other",

  // 사업자 구분 / 03류 상표 / 화장품책임판매업 등록
  "법인": "Corporation", "개인": "Individual", "예비창업": "Pre-startup",
  "보유": "Held", "출원중": "Filing", "미보유": "Not held",
  "등록완료": "Registered", "등록예정": "Planned", "미등록": "Not registered",

  // 문의 경로
  "검색엔진": "Search engine", "SNS": "Social media", "온라인광고": "Online ad",
  "제품·제조사검색": "Product/manufacturer search", "제품레퍼런스": "Product reference",
  "지인·업계추천": "Referral", "기존고객·재문의": "Returning customer", "박람회·전시회": "Trade show",
  "세미나·교육": "Seminar/training", "영업담당자": "Sales rep", "파트너·협력사": "Partner",
  "B2B플랫폼": "B2B platform", "언론·콘텐츠": "Press/content",

  // 노션 상태값 어휘 — 문의 / 의뢰서 / 상담 / 가견적 / 계약 / 프로젝트·개발진행 전 단계에서
  // 공통으로 쓰는 '상태' 표시값. 저장값은 그대로 두고 화면 표시만 바꾼다.
  "접수": "Received", "상담": "Consulting", "견적": "Quoting", "계약": "Contracting",
  "프로젝트 전환": "Converted to Project", "보완": "Needs Follow-up", "보류": "On Hold",
  "종료": "Closed", "14일 내 미날인 종료": "Closed (Unsigned in 14 Days)",
  "시작 전": "Not Started", "진행 중": "In Progress", "완료": "Done",
  "일정 제안": "Proposed", "확정": "Confirmed",
  "작성 전": "Not Drafted", "작성 중": "Drafting", "내부 검토": "Internal Review",
  "고객 공개": "Shared with Customer", "수정 협의": "Revision Discussion", "만료": "Expired", "취소": "Cancelled",
  "발송 준비": "Preparing to Send", "발송 완료": "Sent", "날인 대기": "Awaiting Signature",
  "날인 완료": "Signed", "수정 발송": "Resent (Revised)", "기한 연장": "Deadline Extended",
  "진행 예정": "Upcoming", "중단": "Discontinued", "고객 확인 대기": "Awaiting Customer Review",
  "보완 필요": "Needs Follow-up", "예정": "Scheduled",
  "가능": "Available", "조건부 검토": "Conditional Review", "검토 필요": "Needs Review", "불가": "Unavailable",
  "제조 문의": "Manufacturing Inquiry",


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

  // ── 06 제품개발의뢰서(DEV_FIELD_GROUPS) — 그룹 타이틀 ──
  "제품 기본정보": "Product Basic Info",
  "개발 콘셉트": "Development Concept",
  "개발 처방기준": "Formulation Standards",
  "내용물 상세 사양": "Contents Specification",
  "수출 · 규제 개발 기준": "Export & Regulatory Standards",
  "용기 · 부자재 개발 기준": "Container & Packaging Standards",
  "개발 핵심 요청사항": "Key Development Requests",

  // 필드 라벨 + 힌트 + placeholder + otherLabel
  "제품 구성": "Product Composition", "단품 또는 세트 구성 여부를 선택해 주세요.": "Choose whether this is a single item or a set.",
  "단품": "Single Item", "패키지": "Package",
  "제품명 / 가칭": "Product Name / Working Title", "확정 전이라면 임시 제품명을 입력해 주세요.": "If not finalized, enter a working title.",
  "제품 카테고리": "Product Category", "선택하신 제조 품목에서 자동으로 채워집니다. 다르면 직접 고쳐 주세요.": "Auto-filled from the product you selected — edit it if it's different.",
  "내용량": "Volume", "예: 50ml": "e.g. 50ml", "제품 1개 기준 희망 용량을 입력해 주세요.": "Enter the desired volume per unit.",
  "규격": "Spec", "예: 2ea": "e.g. 2ea", "패키지 내 총 구성 수량을 입력해 주세요.": "Enter the total quantity included in the package.",
  "개발 유형": "Development Type", "원하는 개발 방식을 선택해 주세요.": "Choose your preferred development approach.",
  "신규 제형 개발": "New Formulation Development", "기존 제형 응용": "Adapt Existing Formulation",
  "타겟 제품 벤치마킹": "Benchmark a Target Product", "기존 제품 리뉴얼": "Renew an Existing Product",
  "개발 유형 직접 작성": "Describe development type",
  "초도 희망수량": "Initial Desired Quantity", "예: 3000": "e.g. 3000", "개": "units",
  "첫 생산 시 예상·희망 수량을 입력해 주세요.": "Enter the expected/desired quantity for the first production run.",
  "희망 런칭 일정": "Desired Launch Date", "출시를 목표로 하는 시점을 선택해 주세요.": "Select your target launch date.",
  "목표 원가": "Target Cost", "원": "KRW",
  "완제품 1개 기준 희망 생산단가를 입력해 주세요. 부자재를 포함한 금액입니다.": "Enter your desired unit production cost per finished product, including packaging materials.",

  "타겟 제품 / 샘플": "Target Product / Sample", "참고할 제품명 또는 URL을 입력해 주세요.": "Enter a reference product name or URL.",
  "타겟 사용감 / 제형": "Target Texture / Formulation", "원하는 제형과 사용감을 작성해 주세요.": "Describe your desired formulation and texture.",
  "타겟 피부": "Target Skin", "주요 사용 대상의 피부 고민을 선택해 주세요.": "Select the skin concerns of your target users.",
  "타겟 피부 서술": "Target Skin Description", "선택한 피부 고민에 대해 추가로 고려할 사항이 있다면 작성해 주세요.": "Add any further considerations about the selected skin concerns.",
  "타겟 성별": "Target Gender", "남성": "Male", "여성": "Female", "남녀공용": "Unisex",
  "주요 사용 대상의 성별을 선택해 주세요.": "Select the gender of your target users.",
  "타겟 연령층": "Target Age Group", "10~20대": "Teens-20s", "20~30대": "20s-30s", "30~40대": "30s-40s", "40대 이상": "40s+", "전 연령": "All ages",
  "주요 사용 대상의 연령대를 선택해 주세요.": "Select the age range of your target users.",
  "메인 효능": "Primary Benefit", "가장 중요하게 강조할 효능을 하나 선택해 주세요.": "Select the one benefit to emphasize most.",
  "서브 효능": "Secondary Benefits", "함께 구현하고 싶은 보조 효능을 최대 2개까지 선택해 주세요.": "Select up to 2 additional benefits you'd like to include.",
  "타겟 효능 서술": "Target Benefit Description", "선택한 효능에 대해 추가로 구현하고 싶은 사항을 작성해 주세요.": "Describe anything further you'd like to achieve with the selected benefits.",

  "국내 기능성화장품 적용 여부": "Korean Functional Cosmetics Category",
  "한국 판매 시 적용을 원하는 기능성화장품 기준을 선택해 주세요.": "Select the functional cosmetics category you want to apply for Korean sales.",
  "비기능성": "Non-functional", "미백": "Whitening", "주름개선": "Anti-wrinkle", "자외선차단": "UV Protection",
  "여드름성피부완화": "Acne-prone Skin Relief", "미백+주름개선": "Whitening + Anti-wrinkle",
  "미백+주름+자외선차단": "Whitening + Anti-wrinkle + UV Protection", "희망하는 기능성 기준": "Desired functional category",
  "필수 적용 원료": "Required Ingredients", "원료명 / 희망 함량 또는 ppm": "Ingredient name / desired content or ppm",
  "반드시 포함하길 희망하는 원료와 함량을 작성해 주세요. + 를 눌러 여러 개를 추가할 수 있습니다.": "List ingredients and amounts you want included. Tap + to add more.",
  "제외 희망 원료": "Excluded Ingredients", "원료명 또는 성분 기준": "Ingredient name or criteria",
  "사용을 원하지 않는 성분을 작성해 주세요.": "List ingredients you don't want used.",
  "성분 안전성 기준": "Ingredient Safety Standards", "20가지 주의성분 FREE": "20 Caution Ingredients FREE",
  "알러지유발성분 FREE": "Allergen FREE", "인공향료 FREE": "Synthetic Fragrance FREE", "인공색소 FREE": "Synthetic Dye FREE",
  "효능위주": "Efficacy-focused", "해당없음": "Not applicable",
  "적용을 원하는 성분 배제 기준을 선택해 주세요.": "Select the ingredient exclusion standards you'd like applied.",
  "희망 pH": "Desired pH", "산성(3.0~4.5)": "Acidic (3.0-4.5)", "약산성(4.5~6.5)": "Mildly Acidic (4.5-6.5)",
  "중성(6.5~7.5)": "Neutral (6.5-7.5)", "약알칼리성(7.5~9.0)": "Mildly Alkaline (7.5-9.0)",
  "강알칼리성(9.0이상)": "Strongly Alkaline (9.0+)", "사용감에따라적용": "Based on Texture",
  "원하는 pH 기준을 선택해 주세요.": "Select your desired pH range.",
  "인증 기준": "Certification Standards", "필요한 인증 기준을 선택해 주세요.": "Select any certifications you need.",
  "필요한 인증 직접 작성": "Describe the certification needed",

  "내용물 투명도": "Transparency", "투명": "Transparent", "반투명": "Translucent", "불투명": "Opaque", "제조사제안": "Manufacturer's Suggestion",
  "원하는 내용물의 투명도를 선택해 주세요.": "Select the desired transparency of the contents.",
  "입자 · 고형 소재 적용": "Particles / Solid Materials", "미적용": "None", "비드": "Beads", "캡슐": "Capsules",
  "스크럽입자": "Scrub Particles", "소금슈가": "Salt/Sugar", "허브식물분말": "Herb/Plant Powder", "꽃잎식물조각": "Flower/Plant Petals",
  "내용물에 추가할 입자 또는 고형 소재를 선택해 주세요.": "Select particles or solid materials to add to the contents.",
  "입자 · 고형 소재 상세": "Particle / Solid Material Detail",
  "원하는 종류 · 색상 · 크기 · 함량 등을 작성해 주세요.": "Describe the desired type, color, size, and content.",
  "내용물 색상": "Contents Color", "무색": "Colorless", "백색": "White", "원료고유색": "Ingredient's Natural Color", "지정색": "Specified Color",
  "원하는 내용물 색상을 선택해 주세요.": "Select the desired color of the contents.", "지정 색상": "Specify color",
  "향": "Fragrance", "무향저취": "Unscented/Low Scent", "천연향료": "Natural Fragrance", "합성향료": "Synthetic Fragrance",
  "블렌딩": "Blended", "지정향": "Specified Scent", "은은": "Subtle", "보통": "Moderate", "강함": "Strong",
  "원하는 향의 유무와 강도를 선택해 주세요.": "Select whether you want fragrance and its intensity.", "지정 향": "Specify scent",
  "점도 / 텍스처": "Viscosity / Texture", "가벼움": "Light", "중간": "Medium", "리치함": "Rich", "특수텍스처": "Special Texture",
  "타겟품동일": "Same as Target Product", "직접작성": "Describe manually",
  "원하는 내용물의 점도와 질감을 선택해 주세요.": "Select the desired viscosity and texture of the contents.",
  "점도 · 텍스처 직접 작성": "Describe viscosity/texture",
  "마무리감": "Finish", "산뜻": "Fresh", "촉촉": "Moisturized", "글로우": "Glow", "보송": "Powdery", "리치": "Rich",
  "도포 후 원하는 피부 느낌을 선택해 주세요.": "Select the desired skin feel after application.",
  "마무리감 직접 작성": "Describe finish",
  "반드시 구현할 사용감": "Must-Have Texture", "꼭 구현되어야 할 사용감을 작성해 주세요.": "Describe any texture that must be achieved.",

  "판매 예정 국가 · 지역": "Target Sales Countries/Regions",
  "제품을 판매하거나 수출할 예정인 국가 · 지역을 선택해 주세요.": "Select the countries/regions you plan to sell or export to.",
  "한국": "Korea", "EU": "EU", "동남아": "Southeast Asia", "중동": "Middle East",
  "그 밖의 판매 예정 국가": "Other target countries",
  "수출 규제 적용 기준": "Export Regulatory Standards",
  "판매 예정 국가에 맞춰 필요한 화장품 규제 기준을 검토합니다.": "We'll review the cosmetics regulations required for your target countries.",
  "그 밖의 규제 기준": "Other regulatory standards",
  "중국 NMPA 효능 설정": "China NMPA Claims", "중국 판매 시 적용할 효능을 선택해 주세요.": "Select the claims to apply for sales in China.",
  "국가별 별도 제한사항": "Country-Specific Restrictions", "국가별 추가 규제 조건을 작성해 주세요.": "Describe any additional regulatory conditions by country.",

  "타겟 용기": "Target Container", "참고할 용기 또는 URL을 입력해 주세요.": "Enter a reference container or URL.",
  "포장 형태": "Packaging Format", "원하는 최종 포장 형태를 작성해 주세요.": "Describe your desired final packaging format.",
  "부자재 준비 방식": "Material Sourcing",
  "필요한 부자재마다 누가 준비할지 골라 주세요. 사급은 고객이 직접 제공, 턴키는 제조사가 소싱합니다.": "For each material, choose who will source it. Customer-supplied means you provide it directly; Turnkey means we source it.",
  "기타 부자재 조건": "Other Material Requirements",
  "원하는 부자재의 재질 · 색상 · 형태 · 인쇄 · 후가공 · 특수 사양 등 세부 요청사항을 작성해 주세요. 예) 무광 화이트 용기, 금박 로고, 투명 라벨 등": "Describe details like material, color, shape, printing, finishing, or special specs. e.g. matte white container, gold foil logo, transparent label",

  "추가 요청사항": "Additional Requests", "기타 필요한 사항을 자유롭게 작성해 주세요.": "Feel free to describe anything else you need.",
  "사급": "Customer", "턴키": "Turnkey", "직접 입력": "Enter manually",

  // EFFECT_OPTIONS
  "홍조": "Redness", "색소침착": "Pigmentation", "피부톤(밝기)": "Skin Tone (Brightness)", "피부톤(투명)": "Skin Tone (Clarity)",
  "광채": "Radiance", "진정(수딩)": "Soothing", "장벽개선": "Barrier Repair", "리페어": "Repair", "수분보습": "Hydration",
  "쿨링": "Cooling", "재생": "Regeneration", "주름(탄력)": "Wrinkle (Elasticity)", "볼륨(리프팅)": "Volume (Lifting)",
  "항산화": "Antioxidant", "모공(피부결)": "Pores (Texture)", "피부두께": "Skin Thickness", "유분조절": "Oil Control",
  "커버": "Coverage", "노폐물제거": "Impurity Removal",

  // MATERIAL_GROUPS — 그룹 타이틀 + 항목 32종
  "용기 · 튜브 · 파우치": "Containers/Tubes/Pouches", "단상자 · 완충재": "Cartons/Cushioning", "싸바리": "Rigid Box Wrap",
  "내부포장재": "Inner Packaging", "필름 · 포장구조재 · 실링": "Film/Packaging Structures/Sealing",
  "라벨 · 스티커 · 인쇄물": "Labels/Stickers/Printed Materials", "지지대": "Supports", "박스": "Boxes", "도구": "Tools",
  "용기(인쇄)": "Container (Printed)", "용기(라벨)": "Container (Labeled)", "튜브(인쇄)": "Tube (Printed)",
  "파우치(인쇄)": "Pouch (Printed)", "파우치(라벨)": "Pouch (Labeled)",
  "단상자(하단접착형)": "Carton (Bottom-glued)", "단상자(십자조립형)": "Carton (Cross-lock)", "단상자(맞뚜껑형)": "Carton (Lid-and-base)",
  "단상자(날개형)": "Carton (Wing-lock)", "단상자(슬리브형)": "Carton (Sleeve)", "PET단상자(하단접착형)": "PET Carton (Bottom-glued)",
  "완충재(단상자용)": "Cushioning (For Carton)",
  "싸바리(상하분리형)": "Rigid Box (Base & Lid)", "싸바리(일체형)": "Rigid Box (One-piece)", "싸바리(하단형)": "Rigid Box (Base Only)",
  "내부포장재(간지)": "Inner Packaging (Interleaving Paper)", "내부포장재(EVA)": "Inner Packaging (EVA)",
  "내부포장재(EVA상단종이)": "Inner Packaging (EVA + Paper Top)",
  "필름(수축필름)": "Film (Shrink Film)", "포장구조재(슬리브)": "Packaging Structure (Sleeve)",
  "포장구조재(빠킹)": "Packaging Structure (Packing)", "실링(고주파)": "Sealing (High-frequency)",
  "라벨(개봉방지형)": "Label (Tamper-evident)", "라벨(정품인증QR)": "Label (Authentication QR)",
  "스티커(봉합용)": "Sticker (Seal)", "인쇄물(설명서)": "Printed Material (Insert)",
  "지지대(플라스틱)": "Support (Plastic)", "지지대(종이)": "Support (Paper)", "지지대(종이합지)": "Support (Paperboard)",
  "박스(인박스)": "Box (Inner)", "박스(아웃박스)": "Box (Outer)", "도구(스패출러)": "Tool (Spatula)",

  // EXPORT_REG_OPTIONS
  "한국MFDS": "Korea MFDS", "중국NMPA": "China NMPA", "일본PMDA": "Japan PMDA", "미국MoCRA": "US MoCRA", "유럽CPNP": "EU CPNP",
  "캐나다(CNF)": "Canada (CNF)", "대만(TFDA)": "Taiwan (TFDA)", "영국(SCPN)": "UK (SCPN)", "베트남(DAV)": "Vietnam (DAV)",
  "호주(AICIS)": "Australia (AICIS)", "필리핀(FDA)": "Philippines (FDA)", "인도(CDSCO)": "India (CDSCO)",
  "사우디(SFDA)": "Saudi Arabia (SFDA)", "뉴질랜드(EPA)": "New Zealand (EPA)", "싱가포르(HSA)": "Singapore (HSA)",
  "태국(Thai FDA)": "Thailand (Thai FDA)", "브라질(ANVISA)": "Brazil (ANVISA)", "말레이시아(NPRA)": "Malaysia (NPRA)",
  "인도네시아(BPOM)": "Indonesia (BPOM)", "아랍에미리트(UAE)": "UAE",

  // NMPA_OPTIONS (중국 효능 설정 — 한/중 병기 원문은 유지, 영문은 한글 의미만 표기)
  "여드름제거/祛痘": "Acne Removal", "유분조절/控油": "Oil Control", "청결/清洁": "Cleansing", "각질제거/去角质": "Exfoliating",
  "영양공급/滋养": "Nourishing", "메이크업리무버/卸妆": "Makeup Remover", "보습/保湿": "Moisturizing", "진정/舒缓": "Soothing",
  "리페어/修护": "Repair", "주름개선/抗皱": "Anti-wrinkle", "타이트닝/紧致": "Tightening",
  "기미제거미백(특수)/祛斑美白（特殊）": "Blemish Removal & Whitening (Special)",
  "자외선차단(특수)/防晒（特殊）": "UV Protection (Special)", "민감피부사용가능/敏感肌可用": "Suitable for Sensitive Skin",

  // ── 09 전용 페이지(포털) 홈 탭 ──
  "홈": "Home", "문의": "Inquiry", "진행": "Progress", "알림": "Alerts",
  "다음 행동": "Next Step", "담당자 배정 대기": "Awaiting Assignment", "곧 담당자가 배정되어 안내드립니다.": "A team member will be assigned to you shortly.",
  "확정된 일정": "Confirmed Schedule", "제조 상담": "Consultation", "Zoom 접속": "Join Zoom",
  "상담 일정 확정 대기": "Awaiting Schedule Confirmation", "담당자가 확인 후 일정을 확정해 안내드립니다.": "Our team will confirm your schedule shortly.",
  "고객": "Customer", "새로고침": "Refresh", "제조개발 문의": "Manufacturing Inquiry",
  "전체 완료": "All Complete", "작성된 의뢰서 없음": "No requests yet", "아직 없음": "None yet",
  "제조 계약서": "Manufacturing Contract", "날인 완료 · ": "Signed · ",
  "제조 프로젝트": "Manufacturing Project", "계약 완료 후 여기에 표시됩니다.": "This will appear once your contract is signed.",
  "건": "", // 한국어 개수 단위 — 영문은 접미사 없이 숫자만 표시
};

export default DICT;
