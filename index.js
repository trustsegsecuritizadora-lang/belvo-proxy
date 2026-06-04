const http = require('http');
const https = require('https');
 
const PORT = process.env.PORT || 3000;
 
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
 
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
 
  if (req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'TrustSeg Belvo Proxy online v4' }));
    return;
  }
 
  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
 
  // Read body
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    let parsed;
    try { parsed = JSON.parse(body); }
    catch (e) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }
 
    const { secretId, secretPassword, environment } = parsed;
 
    if (!secretId || !secretPassword) {
      res.writeHead(400);
      res.end(JSON.stringify({ 
        error: 'Missing credentials',
        received: Object.keys(parsed)
      }));
      return;
    }
 
    const baseUrl = environment === 'sandbox'
      ? 'sandbox.belvo.com'
      : 'api.belvo.com';
 
    const credentials = Buffer.from(`${secretId}:${secretPassword}`).toString('base64');
    const postBody = JSON.stringify({ 
      id: secretId,
      password: secretPassword,
      widget: 'credit_cards,checking_accounts,savings_accounts,investments'
    });
 
    const options = {
      hostname: baseUrl,
      path: '/api/token/',
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(postBody)
      }
    };
 
    const belvoReq = https.request(options, belvoRes => {
      let data = '';
      belvoRes.on('data', chunk => { data += chunk; });
      belvoRes.on('end', () => {
        let result;
        try { result = JSON.parse(data); }
        catch (e) { result = null; }
 
        if (result && result.hosted_widget_url) {
          res.writeHead(200);
          res.end(JSON.stringify(result));
        } else {
          res.writeHead(200);
          res.end(JSON.stringify({
            debug: true,
            belvo_status: belvoRes.statusCode,
            belvo_url_called: `https://${baseUrl}/api/token/`,
            belvo_payload_sent: { id: secretId ? 'PRESENT' : 'MISSING', password: secretPassword ? 'PRESENT' : 'MISSING' },
            belvo_raw_response: data.slice(0, 800),
            parsed_json: result
          }));
        }
      });
    });
 
    belvoReq.on('error', e => {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    });
 
    belvoReq.write(postBody);
    belvoReq.end();
  });
});
 
server.listen(PORT, () => {
  console.log(`TrustSeg Belvo Proxy v4 running on port ${PORT}`);
});
   
