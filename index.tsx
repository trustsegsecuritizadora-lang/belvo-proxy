// index.tsx (Bun v1.3 runtime)
import { Hono } from "hono@4";
import { cors } from 'hono/cors';

const app = new Hono();

app.use("/*", cors({
  origin: '*',
  allowMethods: ['POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}));

app.get("/", (c) => c.json({ status: "TrustSeg Belvo Proxy online v3" }));

app.post("/", async (c) => {
  try {
    // Log raw body for debug
    const rawBody = await c.req.text();
    console.log('RAW BODY RECEIVED:', rawBody);

    let parsed: any = {};
    try { parsed = JSON.parse(rawBody); } catch(e) { 
      return c.json({ error: 'Invalid JSON body', raw: rawBody }, 400);
    }

    console.log('PARSED:', JSON.stringify(parsed));

    const secretId       = parsed.secretId || parsed.id || '';
    const secretPassword = parsed.secretPassword || parsed.password || '';
    const environment    = parsed.environment || 'sandbox';

    console.log('secretId:', secretId ? 'PRESENT' : 'MISSING');
    console.log('secretPassword:', secretPassword ? 'PRESENT' : 'MISSING');

    if(!secretId || !secretPassword) {
      return c.json({ 
        error: "Missing credentials",
        received_fields: Object.keys(parsed),
        raw_body: rawBody
      }, 400);
    }

    const baseUrl = environment === 'sandbox'
      ? 'https://sandbox.belvo.com'
      : 'https://api.belvo.com';

    const belvoUrl = `${baseUrl}/api/token/`;

    const belvoPayload = {
      id: secretId,
      password: secretPassword,
      widget: 'credit_cards,checking_accounts,savings_accounts,investments'
    };

    console.log('Sending to Belvo:', JSON.stringify(belvoPayload));

    const belvoResponse = await fetch(belvoUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(belvoPayload)
    });

    const rawText = await belvoResponse.text();
    const status = belvoResponse.status;
    const contentType = belvoResponse.headers.get('content-type') || '';

    let result = null;
    try { result = JSON.parse(rawText); } catch(e) { result = null; }

    if(result && result.hosted_widget_url) {
      return c.json(result, 200);
    }

    return c.json({
      debug: true,
      belvo_status: status,
      belvo_content_type: contentType,
      belvo_url_called: belvoUrl,
      belvo_payload_sent: belvoPayload,
      belvo_raw_response: rawText.slice(0, 800),
      parsed_json: result
    }, 200);

  } catch(e: any) {
    return c.json({ error: e.message, stack: e.stack }, 500);
  }
});

Bun.serve({
  port: import.meta.env.PORT ?? 3000,
  fetch: app.fetch,
});
