const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
});

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error('Telegram environment variables are not configured');
    return json(500, { error: 'Telegram is not configured' });
  }

  const params = new URLSearchParams(event.body || '');
  // Honeypot: silently accept automated submissions without sending them.
  if (params.get('bot-field')) {
    return json(200, { ok: true });
  }

  const name = params.get('name')?.trim();
  const attendance = params.get('attendance')?.trim();
  const alcohol = params.getAll('alcohol').map((item) => item.trim()).filter(Boolean);

  if (!name || !attendance) {
    return json(400, { error: 'Name and attendance are required' });
  }

  const message = [
    '<b>Новый ответ на свадебную анкету</b>',
    '',
    `<b>Имя:</b> ${escapeHtml(name)}`,
    `<b>Присутствие:</b> ${escapeHtml(attendance)}`,
    `<b>Напитки:</b> ${escapeHtml(alcohol.length ? alcohol.join(', ') : 'Не указаны')}`,
  ].join('\n');

  try {
    const response = await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const result = await response.json();
    if (!response.ok || !result.ok) {
      console.error('Telegram API error:', result);
      return json(502, { error: 'Unable to send Telegram message' });
    }

    return json(200, { ok: true });
  } catch (error) {
    console.error('Telegram request failed:', error);
    return json(502, { error: 'Unable to send Telegram message' });
  }
};
