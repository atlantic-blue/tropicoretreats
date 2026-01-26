# Tropico Retreats Deployment

.PHONY: staging production help

help:
	@echo "make staging    - Deploy everything to staging"
	@echo "make production - Deploy everything to production"

# Deploy everything to staging
staging:
	cd infra && terraform workspace select staging && terraform apply -var-file=staging.tfvars -auto-approve
	cd backend && npm run build
	cd admin && npm run deploy:staging

# Deploy everything to production
production:
	cd infra && terraform workspace select default && terraform apply -auto-approve
	cd backend && npm run build
	cd admin && npm run deploy:production
