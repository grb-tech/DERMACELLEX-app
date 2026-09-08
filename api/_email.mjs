// Resend REST API로 메일을 보낸다(fetch만 사용 — 별도 npm 패키지 설치 불필요).
// 발신 도메인을 아직 인증하지 않았다면 RESEND_FROM을 비워둬도 Resend 테스트 발신 주소로 동작한다.

export async function sendEmail(apiKey, { to, subject, html }) {
  const from = process.env.RESEND_FROM || 'DERMACELLEX <bsg_system@bsgholdings.co.kr>';
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error('Resend ' + r.status + ': ' + (d.message || JSON.stringify(d)));
  return d;
}
