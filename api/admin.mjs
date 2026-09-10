// 내부 관리자 페이지(/admin) 전용 API — Vercel Hobby 플랜의 서버리스 함수 12개 한도 때문에
// 로그인부터 16개 DB 전체 CRUD까지 이 파일 하나에서 action으로 분기한다.
// (자세한 배경: CLAUDE.md "api/ 아래 서버리스 함수는 12개가 상한이다")

import { notionCall, createPage, cors } from './_notion.mjs';
import {
  ADMIN_DBS, dbEntry, signSession, verifySession, verifyGoogleToken,
  getDbSchema, pageToInput, inputToProps,
} from './_admin.mjs';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(200).json({ status: 'ok' });

  const TOKEN = process.env.NOTION_TOKEN;
  if (!TOKEN) return res.status(500).json({ success: false, error: 'NOTION_TOKEN not set' });

  const { action } = req.body || {};

  try {
    // ─── 로그인은 세션이 없는 상태에서 호출되는 유일한 액션 ───
    if (action === 'login') {
      const { credential } = req.body;
      const { email } = await verifyGoogleToken(credential);
      const sessionToken = signSession(email);
      return res.status(200).json({ success: true, sessionToken, email });
    }

    // ─── 그 외 모든 액션은 세션 필요 ───
    const session = verifySession(req.body.sessionToken);
    if (!session) return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });

    if (action === 'dbList') {
      return res.status(200).json({ success: true, dbs: ADMIN_DBS, email: session.email });
    }

    const { dbKey } = req.body;
    if (!dbKey) return res.status(400).json({ success: false, error: 'dbKey가 필요합니다.' });

    if (action === 'schema') {
      const schema = await getDbSchema(TOKEN, dbKey);
      return res.status(200).json({ success: true, schema });
    }

    if (action === 'list') {
      const { query, cursor } = req.body;
      const schema = await getDbSchema(TOKEN, dbKey);
      const body = { page_size: 30, sorts: [{ timestamp: 'created_time', direction: 'descending' }] };
      if (query && schema.titleField) body.filter = { property: schema.titleField, title: { contains: query } };
      if (cursor) body.start_cursor = cursor;
      const result = await notionCall(TOKEN, 'POST', `/databases/${dbEntry(dbKey).id}/query`, body);
      const rows = (result.results || []).map(p => pageToInput(schema, p));
      return res.status(200).json({ success: true, schema, rows, nextCursor: result.has_more ? result.next_cursor : null });
    }

    if (action === 'get') {
      const { pageId } = req.body;
      const [schema, page] = await Promise.all([
        getDbSchema(TOKEN, dbKey),
        notionCall(TOKEN, 'GET', `/pages/${pageId}`),
      ]);
      return res.status(200).json({ success: true, schema, row: pageToInput(schema, page) });
    }

    if (action === 'create') {
      const { properties } = req.body;
      const schema = await getDbSchema(TOKEN, dbKey);
      const page = await createPage(TOKEN, dbEntry(dbKey).id, inputToProps(schema, properties || {}));
      return res.status(200).json({ success: true, id: page.id });
    }

    if (action === 'update') {
      const { pageId, properties } = req.body;
      const schema = await getDbSchema(TOKEN, dbKey);
      await notionCall(TOKEN, 'PATCH', `/pages/${pageId}`, { properties: inputToProps(schema, properties || {}) });
      return res.status(200).json({ success: true });
    }

    if (action === 'archive') {
      const { pageId } = req.body;
      await notionCall(TOKEN, 'PATCH', `/pages/${pageId}`, { archived: true });
      return res.status(200).json({ success: true });
    }

    if (action === 'relationSearch') {
      const { query } = req.body;
      const schema = await getDbSchema(TOKEN, dbKey);
      const body = { page_size: 20, sorts: [{ timestamp: 'created_time', direction: 'descending' }] };
      if (query && schema.titleField) body.filter = { property: schema.titleField, title: { contains: query } };
      const result = await notionCall(TOKEN, 'POST', `/databases/${dbEntry(dbKey).id}/query`, body);
      const options = (result.results || []).map(p => ({
        id: p.id,
        name: schema.titleField ? (p.properties?.[schema.titleField]?.title || []).map(t => t.plain_text).join('') || '(제목 없음)' : p.id,
      }));
      return res.status(200).json({ success: true, options });
    }

    return res.status(400).json({ success: false, error: `알 수 없는 action: ${action}` });
  } catch (err) {
    console.error('Admin API Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
