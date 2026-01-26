# Tropico Retreats Deployment

.PHONY: staging production help

help:
	@echo "make staging    - Deploy everything to staging"
	@echo "make production - Deploy everything to production"

# Deploy everything to staging
staging-plan:
	cd infra && terraform workspace select staging && terraform plan -var-file=staging.tfvars

staging-apply:
	cd infra && terraform workspace select staging && terraform apply -var-file=staging.tfvars -auto-approve
	cd backend && npm run build
	cd admin && npm run deploy:staging

# Deploy everything to production
production-plan:
	cd infra && terraform workspace select default && terraform plan

production-apply:
	cd infra && terraform workspace select default && terraform apply -auto-approve
	cd backend && npm run build
	cd admin && npm run deploy:production
