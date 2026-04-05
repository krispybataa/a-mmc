"""
error_handlers.py - Enhanced error handlers for HTML/JSON responses.

Add to app/__init__.py after existing @app.errorhandler:

from a_mmc_security.backend import unauthorized_handler, forbidden_handler
app.errorhandler(401)(unauthorized_handler)
app.errorhandler(403)(forbidden_handler)
"""

from flask import Response, render_template_string, request

HTML_UNAUTHORIZED = '''
<!DOCTYPE html>
<html>
<head>
    <title>401 - Unauthorized</title>
    <style>body { font-family: sans-serif; max-width: 500px; margin: 100px auto; padding: 20px; }</style>
</head>
<body>
    <h1>Access Denied</h1>
    <p>You need valid credentials to access this page.</p>
    <p><a href="/staff/login">Staff Login</a> | <a href="/login">Patient Login</a></p>
</body>
</html>
'''

HTML_FORBIDDEN = '''
<!DOCTYPE html>
<html>
<head>
    <title>403 - Forbidden</title>
    <style>body { font-family: sans-serif; max-width: 500px; margin: 100px auto; padding: 20px; }</style>
</head>
<body>
    <h1>Forbidden</h1>
    <p>You do not have permission for this action.</p>
    <p><a href="/">Home</a></p>
</body>
</html>
'''

def unauthorized_handler(e):
    if 'text/html' in request.headers.get('Accept', ''):
        return Response(HTML_UNAUTHORIZED, 401, {'Content-Type': 'text/html'})
    return {'error': 'Unauthorized — valid credentials required'}, 401

def forbidden_handler(e):
    if 'text/html' in request.headers.get('Accept', ''):
        return Response(HTML_FORBIDDEN, 403, {'Content-Type': 'text/html'})
    return {'error': 'Forbidden — you do not have permission to perform this action'}, 403
