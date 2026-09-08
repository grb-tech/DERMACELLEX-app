// 05 제조 품목 검색 · 선택 화면 — 노션 "제조 품목" DB에서 고객 앱에 노출 가능한 항목만 가져온다.
// '활성'과 '고객 앱 노출'이 모두 체크된 품목만 반환 (내부 검토용 · 비활성 품목은 절대 노출 안 함).

import { DB, notionCall, cors } from './_notion.mjs';

// 품목 이미지: "대표 이미지"(또는 "이미지") Files & media 속성이 있으면 그걸 쓰고,
// 없으면 노션 페이지 자체에 설정한 커버 이미지를 대신 쓴다. 둘 다 없으면 null(placeholder 표시).
// 노션이 주는 파일 URL은 임시 서명 URL이라, 이 API를 호출할 때마다 새로 받아오므로 만료 걱정은 없다.
function extractImage(page, props) {
  const filesProp = props['대표 이미지'] || props['이미지'];
  const file = filesProp?.files?.[0];
  if (file) return file.file?.url || file.external?.url || null;
  if (page.cover) return page.cover.file?.url || page.cover.external?.url || null;
  return null;
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(200).json({ status: 'ok' });

  const TOKEN = process.env.NOTION_TOKEN;
  if (!TOKEN) return res.status(500).json({ success: false, error: 'NOTION_TOKEN not set' });

  try {
    const result = await notionCall(TOKEN, 'POST', `/databases/${DB.CATALOG}/query`, {
      filter: {
        and: [
          { property: '활성', checkbox: { equals: true } },
          { property: '고객 앱 노출', checkbox: { equals: true } },
        ],
      },
      sorts: [{ property: '정렬 순서', direction: 'ascending' }],
      page_size: 100,
    });

    const items = (result.results || []).map(p => {
      const props = p.properties || {};
      return {
        id: p.id,
        name: props['제조 품목명']?.title?.map(t => t.plain_text).join('') || '',
        category: props['대분류']?.select?.name || '',
        group: props['제품군']?.select?.name || '',
        form: props['제형']?.rich_text?.map(t => t.plain_text).join('') || '',
        status: props['제조 가능 상태']?.select?.name || '',
        desc: props['간단한 제형 설명']?.rich_text?.map(t => t.plain_text).join('') || '',
        image: extractImage(p, props),
      };
    });

    return res.status(200).json({ success: true, items });
  } catch (err) {
    console.error('Catalog Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
