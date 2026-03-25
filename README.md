# A-MMC Full Stack Auth App

## Quick Dev Setup (No Docker/Node/Python needed)

1. **Install Prerequisites** (one-time):
   - Download/Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) for Windows
   - Or install Python 3.12, Node.js 20 (includes npm) from official sites.

2. **Run with Docker** (Recommended - self-contained):
   ```
   docker compose up --build
   ```
   - Builds frontend/backend, starts Postgres DB.
   - Access:
     - Frontend: http://localhost
     - Backend: http://localhost:8000
     - DB: localhost:5432 (pgadmin/pgAdmin)

3. **Test APIs** (curl or Postman):
   ```
   curl -X POST http://localhost:8000/register -H "Content-Type: application/json" -d "{\"email\":\"test@example.com\",\"password\":\"password123\"}"
   curl -X POST http://localhost:8000/login -H "Content-Type: application/json" -d "{\"email\":\"test@example.com\",\"password\":\"password123\"}"
   ```

4. **Stop**:
   ```
   docker compose down
   ```

## Manual Dev (Alternative):
**Backend:**
```
cd a-mmc_backend
pip install -r requirements.txt
# Run Postgres Docker: docker run -d --name db -e POSTGRES_DB=mydb -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:15
python hello.py
```

**Frontend:**
```
cd a-mmc_frontend
npm install
npm run dev
```

## Files Updated:
- Docker Compose full stack ready
- Backend ready (register/login/JWT)
- Frontend Vite dev server

Enjoy!
