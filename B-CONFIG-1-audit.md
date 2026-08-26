# B-CONFIG-1 — Production Config Audit

Audit-only. No code changes made in this pass. Scope: every call site of
`create_app()`, the actual diff between `DevelopmentConfig` and
`ProductionConfig`, whether any env var selects between them, and what is
really running in the deployed container today.

**Bottom line: the suspicion is confirmed.** Every executable path that calls
`create_app()` calls it with zero arguments, so `config_name` always defaults
to `"development"`. `ProductionConfig` is dead code in every real deployment
— local docker-compose and Railway alike. Two docs (`README.md`, `DEPLOY.md`)
describe a `FLASK_ENV` variable that is never read anywhere in the codebase.

---

## 1. Every `create_app()` call site

| # | Location | Call | Config loaded | Runs where |
|---|---|---|---|---|
| 1 | [Dockerfile:30](a-mmc_backend/Dockerfile:30) | `gunicorn ... 'run:create_app()'` | `development` | **The actual production container** — this Dockerfile's image is what's pushed to Docker Hub by CI and pulled by both docker-compose and Railway. `run:create_app()` is gunicorn's factory syntax: import `run`, call `create_app()` with no args. |
| 2 | [run.py:4](a-mmc_backend/run.py:4) | `app = create_app()` | `development` | Module-level, so it also runs the instant gunicorn imports `run` (see #1) — this is the actual line gunicorn is invoking through the factory string. Also what runs under `python run.py` / `flask run` locally. |
| 3 | [app/seed.py:722](a-mmc_backend/app/seed.py:722) | `app = create_app()` | `development` | Runs for **every** invocation mode of the seed script, including the `--production` full-data-seed branch ([app/seed.py:679-731](a-mmc_backend/app/seed.py:679)). The `--production` flag only picks which *seed data* branch runs — it has no effect on which Flask config class backs the app instance doing the seeding. |
| 4 | [tests/conftest.py:37](a-mmc_backend/tests/conftest.py:37) | `create_app("development")` | `development` | Explicit and correct — this one is not a bug, tests are supposed to run under dev config. |
| 5 | [DEPLOY.md:29](a-mmc_backend/DEPLOY.md:29) | `create_app('production')` | `production` | **Documentation only, not executed by any automated path.** This is a one-off snippet a human is meant to paste into a Railway shell to seed the first admin. It's the *only* place in the whole repo that would actually load `ProductionConfig` — and only if someone manually runs it, once, outside the running server process. |

No other call sites exist (grepped the full repo for `create_app(` and
`config_name`).

## 2. `DevelopmentConfig` vs `ProductionConfig` — actual diff

Read directly: [config/BaseConfig.py](a-mmc_backend/config/BaseConfig.py),
[config/DevelopmentConfig.py](a-mmc_backend/config/DevelopmentConfig.py),
[config/ProductionConfig.py](a-mmc_backend/config/ProductionConfig.py).

| Setting | `BaseConfig` | `DevelopmentConfig` | `ProductionConfig` |
|---|---|---|---|
| `DEBUG` | *(not set)* | `True` | `False` |
| `JWT_COOKIE_SECURE` | `True` | `False` (overridden) | `True` (inherited, not overridden) |
| `SQLALCHEMY_DATABASE_URI` | built from `PG*` env vars, or `ACTIONS_TEST_DATABASE_URL` | identical copy-pasted construction | identical copy-pasted construction |

**That's the entire diff — two flags.** Everything else that matters for a
production posture is set once in `BaseConfig` and is **identical regardless
of which subclass loads**:

- `SECRET_KEY` / `JWT_SECRET_KEY` — same weak hardcoded fallbacks
  (`"change-me-before-production"` / `"change-jwt-secret-before-production"`)
  either way if the env vars aren't set.
- `JWT_COOKIE_CSRF_PROTECT = False` — same in both, explicitly flagged
  `# TODO(security)` in the source, never overridden by `ProductionConfig`.
- CORS — not part of the config classes at all. `app/__init__.py:45` calls
  bare `CORS(app)` unconditionally, no origin allowlist, same under either
  config.
- `JWT_ALGORITHM`, token lifetimes, mail settings — all `BaseConfig`, identical.

**Implication for any fix**: correcting config selection alone does not
harden CORS or CSRF — those need separate changes regardless of which config
class ends up active. `ProductionConfig` as currently written only ever
flips `DEBUG` and `JWT_COOKIE_SECURE`.

## 3. Is `FLASK_ENV` / `APP_ENV` read anywhere?

**No.** Grepped the entire repo (`app/`, `config/`, `run.py`, workflows,
compose, infra) for `FLASK_ENV` and `APP_ENV`:

- Zero matches in any `.py` file.
- Zero matches in [a-mmc_infra/compose.yaml](a-mmc_infra/compose.yaml) — the
  backend service only has `env_file: ../a-mmc_backend/.env`, no explicit
  `environment:` overrides and no command override.
- Zero matches in [.github/workflows/backend_workflow.yml](.github/workflows/backend_workflow.yml)
  — CI sets `FLASK_APP` (for `flask db upgrade`) but never `FLASK_ENV`.
- The backend's own `.env` (checked directly, not committed) has **no**
  `FLASK_ENV` or `APP_ENV` key at all.
- The only two places `FLASK_ENV` is mentioned anywhere in the repo are
  **documentation, not code**: [README.md:186](README.md:186) lists it as a
  var to set, and [DEPLOY.md:12](a-mmc_backend/DEPLOY.md:12) tells whoever
  provisions Railway to set `FLASK_ENV=production` in the Railway dashboard.
  Since nothing in the Python code ever calls `os.environ.get("FLASK_ENV")`,
  **setting that var in Railway today has literally no effect** — it's an
  inert instruction in a doc, not a working switch.

## 4. What's actually active in the deployed container, and the real consequence

Tracing the exact chain that runs in production (Railway, per `DEPLOY.md`)
and in local docker-compose — both pull the same image built from
[Dockerfile](a-mmc_backend/Dockerfile):

```
gunicorn ... 'run:create_app()'
  → imports run.py
  → run.py:4 executes create_app()            # no arg
  → app/__init__.py:37 config_name defaults to "development"
  → config_by_name["development"] = DevelopmentConfig
```

**`DevelopmentConfig` is what's live, everywhere, right now.** Concretely:

- **`DEBUG=True` is live in production.** Under gunicorn (not Flask's own
  dev server), this does *not* auto-wrap the app with Werkzeug's interactive
  in-browser debugger — that wrapping only happens inside `Flask.run()`,
  which gunicorn never calls. So the pin-protected RCE-grade debugger
  console is **not** reachable through the normal gunicorn/nginx path today.
  What `DEBUG=True` *does* still do live: `PROPAGATE_EXCEPTIONS` defaults to
  true, so a genuinely unhandled exception is re-raised past Flask's own
  handling instead of being caught and converted to the app's custom JSON
  `@app.errorhandler(500)` — meaning unhandled 500s can behave inconsistently
  with the rest of the API's error contract (exact client-visible behavior
  then depends on gunicorn's own exception handling, not the app's).
  Separately and more directly reachable: [run.py:7](a-mmc_backend/run.py:7)
  hardcodes `app.run(debug=True, ...)` regardless of which config is loaded
  — if anyone ever runs the image with `python run.py` instead of the
  Dockerfile's gunicorn `CMD` (e.g. debugging a "prod" build locally), the
  interactive debugger **would** be live and network-reachable at that point.
- **`JWT_COOKIE_SECURE=False` is live in production.** The refresh-token
  cookie (`refresh_token`, httpOnly, set per `BaseConfig.JWT_TOKEN_LOCATION`)
  is issued without the `Secure` attribute. On Railway (HTTPS-terminated
  public URL per `DEPLOY.md`), this means the cookie *could* legally be sent
  over a plaintext channel if one ever existed — it's a real
  defense-in-depth gap on that deployment target.
  **On the self-hosted docker-compose/nginx path this is currently moot**:
  `nginx.conf` terminates no TLS at all (port 80 only, no matching `443`
  server block despite `start.sh` opening port 443 in UFW) — see the infra
  section of `CLAUDE.md`. So on that target the whole stack is already
  HTTP-only, and `JWT_COOKIE_SECURE=False` is the only reason the refresh
  cookie currently works there at all — flip it to `True` without also
  adding TLS and the browser will silently refuse to send the cookie over
  plain HTTP, breaking silent token refresh for every self-hosted deploy.
  **This is the key constraint any fix has to respect** (see §5).

## 5. Proposed minimal fix (not implemented this session)

Free, config-level only — no paid infra/managed services, per Gus's scope.

1. **Add a real env var switch**, e.g. `FLASK_ENV` (matches what the docs
   already tell people to set in Railway — reuse it rather than invent a
   third name) or `APP_ENV`, read once in `app/__init__.py`:
   ```python
   config_name = config_name or os.environ.get("FLASK_ENV", "development")
   ```
   Keep the parameter override-able (tests already pass `"development"`
   explicitly and should keep doing so unchanged).
2. **Default must stay `"development"`** if the var is unset or misspelled —
   fail safe toward the *more permissive-but-working* config rather than a
   silent 500 from a missing/renamed key in `config_by_name`. This also
   means nothing breaks for anyone with an existing `.env` that doesn't set
   the var yet.
3. **Don't flip `JWT_COOKIE_SECURE` to `True` for the self-hosted target
   until nginx actually terminates TLS.** Two honest options, pick one:
   - Add TLS to `a-mmc_infra/nginx.conf` (free via Let's Encrypt/certbot,
     no paid cert) so `ProductionConfig`'s `JWT_COOKIE_SECURE=True` is safe
     to turn on everywhere, or
   - Make `JWT_COOKIE_SECURE` its own independent env-driven flag
     (`os.environ.get("JWT_COOKIE_SECURE", "true" if prod else "false")`)
     instead of something implied purely by which config class loads, so
     Railway (has TLS) and self-hosted-without-TLS (doesn't, yet) can be
     told the truth separately even while both run "production" mode.
4. **Set `FLASK_ENV=production`** in Railway's dashboard (already documented
   in `DEPLOY.md` — it just needs the code change above to stop being inert)
   and leave it unset (or explicitly `development`) in
   `a-mmc_infra/.env`/local `.env` files, since the local docker-compose
   stack has no TLS yet per point 3.
5. **Do not treat this as "flip a switch and done."** Per §2, `ProductionConfig`
   as it stands today only changes `DEBUG` and `JWT_COOKIE_SECURE` — it does
   *not* touch CORS (still wide open via bare `CORS(app)`) or
   `JWT_COOKIE_CSRF_PROTECT` (still `False` in `BaseConfig`, unconditionally).
   Both are already flagged with their own `# TODO(security)` comments in
   `BaseConfig.py` and are separate follow-up work, not part of this fix.
6. **Leave `run.py:7`'s hardcoded `debug=True`** as a known-narrow risk to
   flag but not silently "fix" here — it only matters if someone runs
   `python run.py` directly against a production image/environment instead
   of the Dockerfile's gunicorn `CMD`; worth a one-line comment warning
   future-you not to do that, decided alongside the config-selection fix
   rather than bundled into this audit.

Refs: B-CONFIG-1
