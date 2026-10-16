.PHONY: install lint lint-fix validate web api mobile smoke test report clean

install:
	pnpm install --frozen-lockfile
	pnpm exec playwright install --with-deps

lint:
	pnpm run lint
	pnpm run validate:env

lint-fix:
	pnpm run lint:fix

validate:
	pnpm run validate:env

web:
	pnpm test:web

api:
	pnpm test:api

mobile:
	pnpm test:mobile

smoke:
	pnpm test:smoke

test:
	pnpm test

report:
	pnpm report

clean:
	rm -rf reports playwright-report test-results
