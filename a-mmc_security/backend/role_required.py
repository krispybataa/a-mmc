"""
role_required.py - Role-based decorator for Flask + flask-jwt-extended.

Usage:
from flask_jwt_extended import jwt_required
from a_mmc_security.backend import role_required

@app.route('/admin-only')
@jwt_required()
@role_required("admin")
def admin_only():
    return { "message": "Admin access granted" }
"""

from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt

def role_required(required_role: str):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            claims = get_jwt()
            user_role = claims["user"]["role"]
            if user_role != required_role:
                return jsonify({"error": f"Access denied. Requires '{required_role}' role. Current: '{user_role}'"}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator
