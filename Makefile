test-backend:
	cd a-mmc_backend && python -m pytest -vv --cov=app --cov-fail-under=70 tests/