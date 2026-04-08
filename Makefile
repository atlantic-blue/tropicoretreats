# Tropico Retreats Deployment

.PHONY: staging-plan staging-apply production-plan production-apply test-staging test-production help cli check check-shared check-backend check-frontend check-admin check-infra

help:
	@echo "Checks:"
	@echo "  make check             - Run all pre-push checks"
	@echo "  make check-shared      - TypeScript (shared)"
	@echo "  make check-backend     - TypeScript + tests (backend)"
	@echo "  make check-frontend    - TypeScript + lint + prettier + tests (frontend)"
	@echo "  make check-admin       - TypeScript + lint (admin)"
	@echo "  make check-infra       - Terraform fmt (infra)"
	@echo ""
	@echo "Deployment:"
	@echo "  make staging-plan      - Plan staging deployment"
	@echo "  make staging-apply     - Deploy everything to staging"
	@echo "  make production-plan   - Plan production deployment"
	@echo "  make production-apply  - Deploy everything to production"
	@echo ""
	@echo "Testing:"
	@echo "  make test-staging      - Run integration tests on staging"
	@echo "  make test-production   - Run integration tests on production"
	@echo ""
	@echo "CLI (see ./cli.sh help for all commands):"
	@echo "  ./cli.sh leads:list [staging|production]"
	@echo "  ./cli.sh leads:count [staging|production]"
	@echo "  ./cli.sh admin:list [staging|production]"
	@echo "  ./cli.sh admin:create [env] <email>"
	@echo "  ./cli.sh admin:password [env] <email> <password>"

# Checks
check: check-shared check-backend check-frontend check-admin check-infra
	@echo "All checks passed."

check-shared:
	@echo "→ TypeScript (shared)"
	@cd backend && npx tsc --project ../shared/tsconfig.json --noEmit

check-backend:
	@echo "→ TypeScript (backend)"
	@cd backend && npm run typecheck
	@echo "→ Tests (backend)"
	@cd backend && npx vitest run

check-frontend:
	@echo "→ TypeScript (frontend)"
	@cd frontend && npx tsc --noEmit
	@echo "→ Lint (frontend)"
	@cd frontend && npm run lint
	@echo "→ Prettier (frontend)"
	@cd frontend && npm run format
	@echo "→ Tests (frontend)"
	@cd frontend && npm test

check-admin:
	@echo "→ TypeScript (admin)"
	@cd admin && npx tsc -b
	@echo "→ Lint (admin)"
	@cd admin && npm run lint

check-infra:
	@echo "→ Terraform fmt (infra)"
	@cd infra && terraform fmt -check -recursive

# Staging
staging-plan:
	cd backend && npm run build
	cd infra && terraform workspace select staging && terraform plan -var-file=staging.tfvars

staging-apply:
	cd backend && npm run build
	cd infra && terraform workspace select staging && terraform apply -var-file=staging.tfvars -auto-approve

staging-deploy:
	make staging-apply
	cd frontend && npm run build:staging && aws s3 sync dist/ s3://staging.tropicoretreat.com --delete
	cd admin && npm run deploy:staging

# Production
production-plan:
	cd backend && npm run build
	cd infra && terraform workspace select default && terraform plan

production-apply:
	cd backend && npm run build
	cd infra && terraform workspace select default && terraform apply -auto-approve

production-deploy:
	make production-apply
	cd frontend && npm run build && aws s3 sync dist/ s3://tropicoretreat.com --delete
	cd admin && npm run deploy:production

# Integration tests
test-staging:
	./test-integration.sh staging

test-production:
	./test-integration.sh production
