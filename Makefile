# Repo-wide checks. Run from the repo root.
.PHONY: check check-web check-pipeline build

## check: typecheck, lint and unit tests for web, plus pipeline tests
check: check-web check-pipeline

check-web:
	cd web && npm run check

check-pipeline:
	cd pipeline && uv run pytest -q

## build: production build of the web app
build:
	cd web && npm run build
