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
  if (p.composition) props['제품구성'] = select(p.composition);
  if (p.productType) props['제품카테고리'] = text(p.productType);
  if (p.volume) props['내용량'] = text(p.volume);
  if (p.spec) props['규격'] = text(p.spec);
  if (p.devType) props['개발유형'] = select(p.devType);
  if (p.devTypeOther) props['개발유형(기타)'] = text(p.devTypeOther);
  if (p.quantity) props['초도희망수량'] = number(p.quantity);
  if (p.launchDate) props['희망런칭일정'] = { date: { start: p.launchDate } };
  if (p.targetPrice) props['목표원가'] = number(p.targetPrice);

  // ─── 02 개발 콘셉트 ───
  if (p.formulation) props['타겟사용감/제형'] = text(p.formulation);
  if (asArray(p.targetSkin).length) props['타겟피부'] = relation(asArray(p.targetSkin));
  if (p.targetSkinDesc) props['타겟피부서술'] = text(p.targetSkinDesc);
  if (p.gender) props['타겟성별'] = select(p.gender);
  if (p.ageGroup) props['타겟연령층'] = select(p.ageGroup);
  if (p.mainEffect) props['메인효능'] = select(p.mainEffect);
  if (asArray(p.subEffect).length) props['서브효능'] = multiSelect(asArray(p.subEffect));
  if (p.targetEffect) props['타겟효능서술'] = text(p.targetEffect);

  // ─── 03 개발 처방기준 ───
  if (p.functional) props['기능성화장품'] = select(p.functional);
  if (p.functionalOther) props['국내 기능성화장품(기타)'] = text(p.functionalOther);
  if (joinLines(p.ingredients)) props['필수적용원료'] = text(joinLines(p.ingredients));
  if (joinLines(p.excludeIngredients)) props['제외희망원료'] = text(joinLines(p.excludeIngredients));
  if (asArray(p.safety).length) props['성분안전성기준'] = multiSelect(asArray(p.safety));
  if (p.ph) props['희망pH'] = select(p.ph);
  if (asArray(p.certs).length) props['인증기준'] = multiSelect(asArray(p.certs));
  if (p.certsOther) props['인증기준(기타)'] = text(p.certsOther);

  // ─── 04 내용물 상세 사양 ───
  if (p.transparency) props['내용물투명도'] = select(p.transparency);
  if (p.particle) props['입자고형소재'] = select(p.particle);
  if (p.particleDetail) props['입자고형상세'] = text(p.particleDetail);
  if (p.color) props['내용물색상'] = select(p.color);
  if (p.colorOther) props['내용물색상(지정색)'] = text(p.colorOther);
  if (asArray(p.scent).length) props['향'] = multiSelect(asArray(p.scent));
  if (p.scentOther) props['향(지정향)'] = text(p.scentOther);
  if (p.viscosity) props['점도텍스처'] = select(p.viscosity);
  if (p.viscosityOther) props['점도텍스처(기타)'] = text(p.viscosityOther);
  if (p.finish) props['마무리감'] = select(p.finish);
  if (p.finishOther) props['마무리감(기타)'] = text(p.finishOther);
  if (p.requiredFeel) props['필수사용감'] = text(p.requiredFeel);

  // ─── 05 수출 · 규제 개발 기준 ───
  if (asArray(p.countries).length) props['판매예정국가'] = multiSelect(asArray(p.countries));
  if (p.countriesOther) props['판매예정국가(기타)'] = text(p.countriesOther);
  if (asArray(p.exportRegs).length) props['수출규제기준'] = multiSelect(asArray(p.exportRegs));
  if (p.exportRegsOther) props['수출규제기준(기타)'] = text(p.exportRegsOther);
  if (asArray(p.nmpaEffect).length) props['NMPA효능'] = multiSelect(asArray(p.nmpaEffect));
  if (p.countryLimits) props['국가별제한사항'] = text(p.countryLimits);

  // ─── 06 용기 · 부자재 개발 기준 ───
  if (/^https?:\/\//i.test((p.targetContainerUrl || '').trim())) props['타겟용기URL'] = url(p.targetContainerUrl);
  if (p.packaging) props['포장형태'] = text(p.packaging);
  if (asArray(p.suppliedMaterial).length) props['사급부자재'] = multiSelect(asArray(p.suppliedMaterial));
  if (asArray(p.turnkeyMaterial).length) props['턴키부자재'] = multiSelect(asArray(p.turnkeyMaterial));
  if (p.otherMaterialCond) props['기타부자재조건'] = text(p.otherMaterialCond);

  // ─── 07 개발 핵심 요청사항 ───
  if (p.additionalNotes) props['추가요청사항'] = text(p.additionalNotes);

  // '타겟제품/샘플'은 URL 타입 — http(s)로 시작하지 않으면 추가요청사항에 텍스트로 남긴다.
  if (/^https?:\/\//i.test((p.reference || '').trim())) {
    props['타겟제품/샘플'] = url(p.reference);
  } else if (p.reference) {
    const prev = props['추가요청사항']?.rich_text?.[0]?.text?.content || '';
    props['추가요청사항'] = text(`${prev}${prev ? '\n\n' : ''}레퍼런스: ${p.reference}`);
  }

  return props;
}

export { joinLines };
