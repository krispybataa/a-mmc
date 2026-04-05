"""
before_request.py - Global Flask before_request hook example.

Add to app/__init__.py:
from a_mmc_security.backend import security_before_request
app.before_request(security_before_request)

Protects /api/* paths with additional checks (e.g., block if no JWT).
"""

from flask import request, jsonify, redirect, url_for, abort

def security_before_request():
    if request.path.startswith('/api/') and not request.headers.get('Authorization'):
        if request.headers.get('Accept') == 'text/html':
            return abort(401)  # Frontend expects HTML redirect or page
        return jsonify({"error": "Authentication header required for API access."}), 401
    # Add more checks: IP whitelist, session expiry, etc.
    # Example IP block:
    # blocked_ips = {'203.0.113.0'}
    # if request.remote_addr in blocked_ips:
    #     return jsonify({"error": "IP blocked."}), 403
