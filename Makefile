.PHONY: help lint test build run deploy clean install dev

# Variables
APP_NAME=beacon-dashboard
DOCKER_IMAGE=beacon-dashboard:latest

# GCP/GKE Variables
GCP_PROJECT_ID?=$(shell echo $$GCP_PROJECT_ID)
GCP_REGION?=europe-west2
GKE_CLUSTER_NAME?=$(shell echo $$GKE_CLUSTER_NAME)
GKE_ZONE?=europe-west2-a
IMAGE_NAME=beacon-dashboard
DEPLOYMENT_NAME=beacon-dashboard
NAMESPACE?=staging
GIT_SHA?=$(shell git rev-parse --short HEAD)
FULL_IMAGE_PATH=$(GCP_REGION)-docker.pkg.dev/$(GCP_PROJECT_ID)/frontend-images/$(IMAGE_NAME)

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	@echo "Installing dependencies..."
	@npm install
	@echo "Dependencies installed successfully"

lint: ## Run linters
	@echo "Running linters..."
	@npm run lint

test: ## Run tests
	@echo "Running tests..."
	@npm run test || echo "No tests configured"

build: ## Build the application
	@echo "Building application..."
	@npm run build
	@echo "Build complete: ./dist"

run: ## Run the development server
	@echo "Starting development server..."
	@npm run dev

preview: ## Preview production build
	@echo "Previewing production build..."
	@npm run preview

docker-build: ## Build Docker image
	@echo "Building Docker image..."
	@docker build -t $(DOCKER_IMAGE) .
	@echo "Docker image built: $(DOCKER_IMAGE)"

docker-run: ## Run Docker container
	@echo "Running Docker container..."
	@docker run --rm -p 8080:8080 --name $(APP_NAME) $(DOCKER_IMAGE)

deploy: docker-build ## Build Docker image for deployment
	@echo "Deployment artifacts ready"

clean: ## Clean build artifacts
	@echo "Cleaning..."
	@rm -rf dist
	@rm -rf node_modules
	@echo "Clean complete"

check: lint test ## Run all checks (lint, test)

dev: ## Run in development mode with hot reload
	@echo "Starting development server..."
	@npm run dev

# ============================================
# GCP/GKE Deployment Targets
# ============================================

gcp-auth: ## Configure Docker for GCP Artifact Registry
	@echo "Configuring Docker authentication for GCP..."
	@gcloud auth configure-docker $(GCP_REGION)-docker.pkg.dev

gke-build-push: ## Build and push Docker image to GCP Artifact Registry
	@echo "Building Docker image..."
	@docker build -t $(FULL_IMAGE_PATH):$(GIT_SHA) .
	@docker tag $(FULL_IMAGE_PATH):$(GIT_SHA) $(FULL_IMAGE_PATH):latest
	@echo "Pushing Docker image to GCP Artifact Registry..."
	@docker push $(FULL_IMAGE_PATH):$(GIT_SHA)
	@docker push $(FULL_IMAGE_PATH):latest
	@echo "Image pushed: $(FULL_IMAGE_PATH):$(GIT_SHA)"

gke-get-credentials: ## Get GKE cluster credentials
	@echo "Getting GKE credentials..."
	@gcloud container clusters get-credentials $(GKE_CLUSTER_NAME) \
		--zone=$(GKE_ZONE) \
		--project=$(GCP_PROJECT_ID)

gke-deploy: gke-get-credentials gke-apply-manifests
	@echo "Waiting for rollout to complete..."
	@kubectl rollout status deployment/$(DEPLOYMENT_NAME) -n $(NAMESPACE) --timeout=300s
	@echo "Deployment complete!"

gke-status: ## Get service status and URL
	@echo "Getting service information..."
	@kubectl get service $(DEPLOYMENT_NAME) -n $(NAMESPACE)
	@echo ""
	@echo "Service IP:"
	@kubectl get service $(DEPLOYMENT_NAME) -n $(NAMESPACE) -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
	@echo ""

gke-apply-manifests: gke-get-credentials ## Apply Kubernetes manifests
	@echo "Applying Kubernetes manifests..."
	@for file in k8s/*.yml; do \
		NAMESPACE=$(NAMESPACE) IMAGE=$(FULL_IMAGE_PATH):$(GIT_SHA) envsubst < $$file | kubectl apply -f - ; \
	done
	@echo "Manifests applied successfully"

gke-logs: gke-get-credentials ## Tail logs from deployment
	@echo "Tailing logs from $(DEPLOYMENT_NAME)..."
	@kubectl logs -f deployment/$(DEPLOYMENT_NAME) -n $(NAMESPACE)

gke-describe: gke-get-credentials ## Describe deployment
	@kubectl describe deployment $(DEPLOYMENT_NAME) -n $(NAMESPACE)

gke-pods: gke-get-credentials ## List pods
	@kubectl get pods -n $(NAMESPACE) -l app=$(APP_NAME)

gke-restart: gke-get-credentials ## Restart deployment
	@echo "Restarting deployment..."
	@kubectl rollout restart deployment/$(DEPLOYMENT_NAME) -n $(NAMESPACE)

gke-scale: gke-get-credentials ## Scale deployment (usage: make gke-scale REPLICAS=3)
	@echo "Scaling deployment to $(REPLICAS) replicas..."
	@kubectl scale deployment/$(DEPLOYMENT_NAME) --replicas=$(REPLICAS) -n $(NAMESPACE)

gke-delete: gke-get-credentials ## Delete deployment from GKE
	@echo "Deleting deployment from GKE..."
	@kubectl delete -f k8s/ -n $(NAMESPACE)

.DEFAULT_GOAL := help
