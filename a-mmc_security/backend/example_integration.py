# example_integration.py - Copy this into your app/__init__.py or routes

# 1. Import security modules
from a_mmc_security.backend import (
    role_required,
    security_before_request,
    unauthorized_handler,
    forbidden_handler
)

# 2. Register before_request and error handlers
app.before_request(security_before_request)
app.errorhandler(401)(unauthorized_handler)
app.errorhandler(403)(forbidden_handler)

# 3. Protect a route example
@app.route('/api/super-secret')
@jwt_required()
@role_required('admin')
def super_secret():
    return {'data': 'Only admins see this!'}

print('Security integration example ready. Test with curl -H "Authorization: Bearer YOUR_JWT". Unauthorized → 403 error.')
