const http = require('http');
const https = require('https');
const url = require('url'); // Kept for legacy compatibility if needed, but we use new URL

const PORT = 3000;

const server = http.createServer((req, res) => {
    // Enable CORS for all
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept'); // Added Accept to allowed headers

    console.log(`[${new Date().toISOString()}] Incoming request: ${req.method} ${req.url}`);

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const baseURL = 'http://' + req.headers.host + '/';
    const reqUrl = new URL(req.url, baseURL);

    // Choose endpoint based on path
    let targetPath = '';
    let isXmlExport = false;

    if (reqUrl.pathname === '/autocomplete') {
        const query = reqUrl.searchParams.get('adresa');
        if (!query) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing adresa parameter' }));
            return;
        }
        targetPath = `/vdp/ruian/adresnimista/fulltext?adresa=${encodeURIComponent(query)}`;
    } else if (reqUrl.pathname === '/detail') {
        const kod = reqUrl.searchParams.get('kod');
        if (!kod) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing kod parameter' }));
            return;
        }
        // Official XML export endpoint: kodAd={code} & mediaType=xml
        targetPath = `/vdp/ruian/adresnimista?kodAd=${kod}&mediaType=xml`;
        isXmlExport = true;
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found. Use /autocomplete?adresa=... or /detail?kod=...');
        return;
    }

    const options = {
        hostname: 'vdp.cuzk.gov.cz',
        path: targetPath,
        method: 'GET',
        headers: {
            'Accept': 'application/json, text/xml',
            'Accept-Encoding': 'identity',
            'User-Agent': 'Mozilla/5.0 (Node.js Proxy)'
        }
    };

    console.log(`[${new Date().toISOString()}] Forwarding to: https://${options.hostname}${options.path}`);

    const proxyReq = https.request(options, (proxyRes) => {
        console.log(`[${new Date().toISOString()}] Upstream response: ${proxyRes.statusCode} ${proxyRes.statusMessage}`);

        // If it's the detail export, we want to parse it to JSON before sending back
        if (isXmlExport) {
            let xmlData = '';
            proxyRes.on('data', chunk => xmlData += chunk);
            proxyRes.on('end', () => {
                // Check if we got a valid XML response
                if (proxyRes.statusCode !== 200) {
                    res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Upstream returned ' + proxyRes.statusCode }));
                    return;
                }

                // Simple dependency-free XML to JSON parser
                const simpleXmlToJson = (xml) => {
                    const result = {};

                    // Remove namespaces from tags matching <prefix:tag> or </prefix:tag>
                    xml = xml.replace(/<(\/?)([^:>\s]*:)?([^>]+)>/g, "<$1$3>");

                    // extract value from tag
                    const getTagValue = (tag, parentXml) => {
                        const regex = new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'i');
                        const match = parentXml.match(regex);
                        return match ? match[1] : null;
                    };

                    // Recursive parsing or just specific extraction?
                    // Given the user wants to "play with json", let's build a flat map of relevant fields
                    // or a simplified object tree.
                    // Doing a full generic parser in one function is complex without deps.
                    // Let's create a "flatter" JSON object of all unique tags found.

                    const tags = xml.match(/<([a-zA-Z0-9]+)[^>]*>([^<]*)<\/\1>/g);
                    if (tags) {
                        tags.forEach(t => {
                            const m = t.match(/<([a-zA-Z0-9]+)[^>]*>([^<]*)<\/\1>/);
                            if (m) {
                                result[m[1]] = m[2];
                            }
                        });
                    }
                    return result;
                };

                // Parse the XML string to a flat JSON object
                const parsedJson = simpleXmlToJson(xmlData);

                // Send full structured data to client as requested
                const result = parsedJson;

                // Send clean JSON to client
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify(result));
            });
        } else {
            // Standard proxy for autocomplete - Buffer and Log for debugging
            let responseData = '';
            proxyRes.on('data', chunk => responseData += chunk);
            proxyRes.on('end', () => {
                console.log(`[${new Date().toISOString()}] Autocomplete Response Body Preview: ${responseData.substring(0, 500)}`);

                res.writeHead(proxyRes.statusCode, {
                    'Content-Type': proxyRes.headers['content-type'] || 'application/json',
                    'Access-Control-Allow-Origin': '*' // Ensure CORS headers are sent here too specifically if needed
                });
                res.end(responseData);
            });
        }
    });

    proxyReq.on('error', (e) => {
        console.error(`Problem with request: ${e.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
    });

    proxyReq.end();
});

server.listen(PORT, () => {
    console.log(`Proxy server running at http://localhost:${PORT}/`);
    console.log(`Test: http://localhost:${PORT}/autocomplete?adresa=Praha`);
});
