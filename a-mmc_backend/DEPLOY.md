# Deployment Guide — Alagang MMC Backend

## Railway setup (first deploy)

### Environment variables to set in Railway dashboard
| Variable | Value |
|---|---|
| SECRET_KEY | Generate: `python -c "import secrets; print(secrets.token_hex(32))"` |
| JWT_SECRET_KEY | Same as above, different value |
| JWT_ACCESS_TOKEN_EXPIRES | 3600 |
| JWT_COOKIE_SECURE | true |
| FLASK_ENV | production |
| SYSTEM_URL | https://your-app.up.railway.app |
| DATABASE_URL | Auto-provided by Railway PostgreSQL plugin |

### First deploy sequence
1. Push to main — CI builds and pushes Docker image to Docker Hub
2. Railway pulls the image and runs the start command:
   ```
   flask db upgrade && gunicorn ...
   ```
3. Migrations apply automatically
4. Seed the first admin account (one-time only) via Railway shell:
   ```python
   python -c "
   from app import create_app, db
   from app.models.admin import Admin
   from app.services.auth_service import hash_password
   app = create_app('production')
   with app.app_context():
       admin = Admin(
           first_name='Admin',
           last_name='User',
           login_email='admin@asclepius.app',
           login_password_hash=hash_password('ChangeMe123!')
       )
       db.session.add(admin)
       db.session.commit()
       print('Admin seeded.')
   "
   ```
5. Log in at /staff/login with role Admin and change the password immediately

## Subsequent deploys
Push to main → CI runs tests → builds image → Railway auto-deploys.
`flask db upgrade` runs on every start — safe and idempotent.

## Health check
```
GET /api/health → {"status": "ok"}
```
Railway uses this endpoint to confirm the service is alive after each deploy.
