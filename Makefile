# Tropico Retreats Deployment

.PHONY: staging-plan staging-apply production-plan production-apply test-staging test-production help

help:
	@echo "make staging-plan      - Plan staging deployment"
	@echo "make staging-apply     - Deploy everything to staging"
	@echo "make production-plan   - Plan production deployment"
	@echo "make production-apply  - Deploy everything to production"
	@echo "make test-staging      - Run integration tests on staging"
	@echo "make test-production   - Run integration tests on production"

# Staging
staging-plan:
	cd infra && terraform workspace select staging && terraform plan -var-file=staging.tfvars

staging-apply:
	cd infra && terraform workspace select staging && terraform apply -var-file=staging.tfvars -auto-approve
	cd backend && npm run build
	cd admin && npm run deploy:staging

# Production
production-plan:
	cd infra && terraform workspace select default && terraform plan

production-apply:
	cd infra && terraform workspace select default && terraform apply -auto-approve
	cd backend && npm run build
	cd admin && npm run deploy:production

# Integration tests
test-staging:
	./test-integration.sh staging

test-production:
	./test-integration.sh production
