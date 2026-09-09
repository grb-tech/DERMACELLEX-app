// 제품개발의뢰서 폼 값 → 노션 속성 변환. 신규 제출(devform)과 수정(devform-update)이 함께 쓴다.
//
// 2026-09-09: 노션에서 속성 타입이 바뀐 것을 반영했다. 목표원가 · 초도희망수량은 숫자,
// 사급/턴키부자재 · NMPA효능은 다중선택, 타겟피부는 피부타입DB 관계형이다. 이전에는 전부
// 텍스트로 보내고 있어서 값이 채워지면 노션이 400으로 거부해 의뢰서 저장 자체가 실패했다.
// 선택지에 "기타 · 직접작성 · 지정색 · 지정향"을 고른 경우 별도 (기타) 텍스트 속성에 담는다.

import { text, select, multiSelect, url, number, relation } from './_notion.mjs';

const asArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);
// 필수적용원료 · 제외희망원료는 앱에서 여러 줄로 입력받아 노션에는 줄바꿈 하나로 이어 붙인다.
const joinLines = (v) => asArray(v).map(s => String(s).trim()).filter(Boolean).join('\n');

export function buildDevProperties(p) {
  const props = {};

  // ─── 01 제품 기본정보 ───
  props['제품구성'] = select(p.composition);
  props['제품카테고리'] = text(p.productType);
  props['내용량'] = text(p.volume);
  props['규격'] = text(p.spec);
  props['개발유형'] = select(p.devType);
  props['개발유형(기타)'] = text(p.devTypeOther);
  props['초도희망수량'] = number(p.quantity);
  props['희망런칭일정'] = p.launchDate ? { date: { start: p.launchDate } } : { date: null };
  props['목표원가'] = number(p.targetPrice);

  // ─── 02 개발 콘셉트 ───
  props['타겟사용감/제형'] = text(p.formulation);
  props['타겟피부'] = relation(asArray(p.targetSkin));
  props['타겟피부서술'] = text(p.targetSkinDesc);
  props['타겟성별'] = select(p.gender);
  props['타겟연령층'] = select(p.ageGroup);
  props['메인효능'] = select(p.mainEffect);
  props['서브효능'] = multiSelect(asArray(p.subEffect));
  props['타겟효능서술'] = text(p.targetEffect);

  // ─── 03 개발 처방기준 ───
  props['기능성화장품'] = select(p.functional);
  props['국내 기능성화장품(기타)'] = text(p.functionalOther);
  props['필수적용원료'] = text(joinLines(p.ingredients));
  props['제외희망원료'] = text(joinLines(p.excludeIngredients));
  props['성분안전성기준'] = multiSelect(asArray(p.safety));
  props['희망pH'] = select(p.ph);
  props['인증기준'] = multiSelect(asArray(p.certs));
  props['인증기준(기타)'] = text(p.certsOther);

  // ─── 04 내용물 상세 사양 ───
  props['내용물투명도'] = select(p.transparency);
  props['입자고형소재'] = select(p.particle);
  props['입자고형상세'] = text(p.particleDetail);
  props['내용물색상'] = select(p.color);
  props['내용물색상(지정색)'] = text(p.colorOther);
  props['향'] = multiSelect(asArray(p.scent));
  props['향(지정향)'] = text(p.scentOther);
  props['점도텍스처'] = select(p.viscosity);
  props['점도텍스처(기타)'] = text(p.viscosityOther);
  props['마무리감'] = select(p.finish);
  props['마무리감(기타)'] = text(p.finishOther);
  props['필수사용감'] = text(p.requiredFeel);

  // ─── 05 수출 · 규제 개발 기준 ───
  props['판매예정국가'] = multiSelect(asArray(p.countries));
  props['판매예정국가(기타)'] = text(p.countriesOther);
  props['수출규제기준'] = multiSelect(asArray(p.exportRegs));
  props['수출규제기준(기타)'] = text(p.exportRegsOther);
  props['NMPA효능'] = multiSelect(asArray(p.nmpaEffect));
  props['국가별제한사항'] = text(p.countryLimits);

  // ─── 06 용기 · 부자재 개발 기준 ───
  props['타겟용기URL'] = url(p.targetContainerUrl);
  props['포장형태'] = text(p.packaging);
  props['사급부자재'] = multiSelect(asArray(p.suppliedMaterial));
  props['턴키부자재'] = multiSelect(asArray(p.turnkeyMaterial));
  props['기타부자재조건'] = text(p.otherMaterialCond);

  // ─── 07 개발 핵심 요청사항 ───
  props['추가요청사항'] = text(p.additionalNotes);

  // '타겟제품/샘플'은 URL 타입 — http(s)로 시작하지 않으면 추가요청사항에 텍스트로 남긴다.
  props['타겟제품/샘플'] = url(p.reference);
  if (p.reference && !/^https?:\/\//i.test(String(p.reference).trim())) {
    const prev = props['추가요청사항']?.rich_text?.[0]?.text?.content || '';
    props['추가요청사항'] = text(`${prev}${prev ? '\n\n' : ''}레퍼런스: ${p.reference}`);
  }

  return props;
}

export { joinLines };
