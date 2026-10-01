const MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-5-5';
const MAX_BODY_BYTES = 60_000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY is not set' }, 500);

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return json({ error: 'Request too large' }, 413);

  let body: { system?: unknown; messages?: unknown; tools?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  if (typeof body.system !== 'string' || !Array.isArray(body.messages) || (body.tools !== undefined && !Array.isArray(body.tools))) {
    return json({ error: 'Expected { system, messages, tools? }' }, 400);
  }

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 700, // fixed server-side so clients cannot inflate cost
      system: body.system,
      messages: body.messages,
      ...(Array.isArray(body.tools) && body.tools.length > 0 ? { tools: body.tools } : {}),
    }),
  });

  const data = await upstream.json();
  if (!upstream.ok) return json({ error: data?.error?.message ?? 'Upstream error' }, 502);
  return json({ content: data.content, stop_reason: data.stop_reason });
});
