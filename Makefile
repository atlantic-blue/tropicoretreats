# Tropico Retreats Deployment

.PHONY: staging-plan staging-apply production-plan production-apply test-staging test-production help cli

help:
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

# Staging
staging-plan:
	cd infra && terraform workspace select staging && terraform plan -var-file=staging.tfvars

staging-apply:
	cd infra && terraform workspace select staging && terraform apply -var-file=staging.tfvars -auto-approve

staging-deploy:
	make staging-apply
	cd backend && npm run build
	cd frontend && npm run build:staging && aws s3 sync dist/ s3://staging.tropicoretreat.com --delete
	cd admin && npm run deploy:staging

# Production
production-plan:
	cd infra && terraform workspace select default && terraform plan

production-apply:
	cd infra && terraform workspace select default && terraform apply -auto-approve

production-deploy:
	make production-apply
	cd backend && npm run build
	cd frontend && npm run build && aws s3 sync dist/ s3://tropicoretreat.com --delete
	cd admin && npm run deploy:production

# Integration tests
test-staging:
	./test-integration.sh staging

test-production:
	./test-integration.sh production
