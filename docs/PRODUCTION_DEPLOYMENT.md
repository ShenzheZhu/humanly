# Production Deployment

Humanly production stays on the existing single GCP VM and Docker Compose
runtime. GitHub Actions now builds application images and pushes them to GCP
Artifact Registry. The VM only pulls prebuilt images and restarts Compose
services.

This change does not migrate PostgreSQL to Cloud SQL, does not add Cloud
Storage, and does not introduce Kubernetes, GKE, or Cloud Run.

## Deployment Flow

```text
push to main
  -> GitHub Actions builds backend and frontend-user images
  -> GitHub Actions pushes commit-SHA tags to Artifact Registry
  -> GitHub Actions SSHes into the production VM
  -> VM syncs the deploy files from main
  -> VM runs scripts/deploy.sh with exact image tags
  -> docker compose pull backend frontend-user
  -> docker compose up -d backend frontend-user nginx
```

Production service compatibility is unchanged:

- `backend` still listens on port `3001` inside the Compose network.
- `frontend-user` still listens on port `3002` inside the Compose network.
- `nginx` still routes `/`, `/api`, `/health`, `/tracker/`, and `/socket.io/`
  to the existing services.
- `postgres`, `redis`, volumes, networks, health checks, and backend `.env`
  behavior are preserved.

## Required GCP Setup

Set these shell variables before running the commands:

```bash
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="northamerica-northeast1"
export GCP_ARTIFACT_REPOSITORY="humanly"
export GITHUB_REPOSITORY="OWNER/REPO"
export DEPLOYER_SA_NAME="humanly-github-deployer"
export VM_RUNTIME_SA_NAME="humanly-vm-runtime"
```

Enable required APIs:

```bash
gcloud services enable artifactregistry.googleapis.com iamcredentials.googleapis.com \
  --project "$GCP_PROJECT_ID"
```

Create the Artifact Registry Docker repository:

```bash
gcloud artifacts repositories create "$GCP_ARTIFACT_REPOSITORY" \
  --project "$GCP_PROJECT_ID" \
  --repository-format docker \
  --location "$GCP_REGION" \
  --description "Humanly production Docker images"
```

Create a GitHub Actions deployer service account that can push images:

```bash
gcloud iam service-accounts create "$DEPLOYER_SA_NAME" \
  --project "$GCP_PROJECT_ID" \
  --display-name "Humanly GitHub deployer"

gcloud artifacts repositories add-iam-policy-binding "$GCP_ARTIFACT_REPOSITORY" \
  --project "$GCP_PROJECT_ID" \
  --location "$GCP_REGION" \
  --member "serviceAccount:${DEPLOYER_SA_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role "roles/artifactregistry.writer"
```

The VM also needs read access to pull images. If the VM already has an attached
service account, grant that account `roles/artifactregistry.reader`. Otherwise
create one:

```bash
gcloud iam service-accounts create "$VM_RUNTIME_SA_NAME" \
  --project "$GCP_PROJECT_ID" \
  --display-name "Humanly VM runtime"

gcloud artifacts repositories add-iam-policy-binding "$GCP_ARTIFACT_REPOSITORY" \
  --project "$GCP_PROJECT_ID" \
  --location "$GCP_REGION" \
  --member "serviceAccount:${VM_RUNTIME_SA_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role "roles/artifactregistry.reader"
```

On the VM, configure Docker to authenticate to Artifact Registry:

```bash
gcloud auth configure-docker "${GCP_REGION}-docker.pkg.dev" --quiet
```

If the VM does not use an attached service account, activate a service account
key on the VM first, then run the same Docker auth command:

```bash
gcloud auth activate-service-account \
  --key-file /path/to/vm-artifact-registry-reader.json
gcloud auth configure-docker "${GCP_REGION}-docker.pkg.dev" --quiet
```

## GitHub Authentication Options

### Option 1: Service Account JSON Key

This is the easiest initial setup. Create a key for the deployer service
account:

```bash
gcloud iam service-accounts keys create humanly-github-deployer.json \
  --project "$GCP_PROJECT_ID" \
  --iam-account "${DEPLOYER_SA_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
```

Store the full JSON file contents in the `GCP_SERVICE_ACCOUNT_KEY` GitHub
secret.

### Option 2: Workload Identity Federation

This avoids long-lived JSON keys and is the better long-term setup. Create a
pool, provider, and IAM binding:

```bash
export WIF_POOL_ID="github"
export WIF_PROVIDER_ID="humanly"
export GITHUB_ORG="OWNER"
export GITHUB_REPO="REPO"

gcloud iam workload-identity-pools create "$WIF_POOL_ID" \
  --project "$GCP_PROJECT_ID" \
  --location global \
  --display-name "GitHub Actions"

gcloud iam workload-identity-pools providers create-oidc "$WIF_PROVIDER_ID" \
  --project "$GCP_PROJECT_ID" \
  --location global \
  --workload-identity-pool "$WIF_POOL_ID" \
  --display-name "Humanly GitHub provider" \
  --issuer-uri "https://token.actions.githubusercontent.com" \
  --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition "assertion.repository == '${GITHUB_ORG}/${GITHUB_REPO}'"

export PROJECT_NUMBER="$(gcloud projects describe "$GCP_PROJECT_ID" --format='value(projectNumber)')"
export WIF_PROVIDER="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WIF_POOL_ID}/providers/${WIF_PROVIDER_ID}"

gcloud iam service-accounts add-iam-policy-binding \
  "${DEPLOYER_SA_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --project "$GCP_PROJECT_ID" \
  --role "roles/iam.workloadIdentityUser" \
  --member "principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WIF_POOL_ID}/attribute.repository/${GITHUB_ORG}/${GITHUB_REPO}"
```

Store these GitHub secrets:

- `GCP_WORKLOAD_IDENTITY_PROVIDER`: the value of `$WIF_PROVIDER`
- `GCP_SERVICE_ACCOUNT_EMAIL`: `${DEPLOYER_SA_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com`

When both WIF secrets are present, the workflow uses WIF. Otherwise it falls
back to `GCP_SERVICE_ACCOUNT_KEY`.

## Required GitHub Secrets

Add these repository secrets:

- `GCP_PROJECT_ID`: GCP project ID.
- `GCP_REGION`: Artifact Registry region, for example `northamerica-northeast1`
  or `us-central1`.
- `GCP_ARTIFACT_REPOSITORY`: Artifact Registry repository name, usually
  `humanly`.
- `GCP_SERVICE_ACCOUNT_KEY`: service account JSON key contents, unless using
  Workload Identity Federation.
- `GCP_WORKLOAD_IDENTITY_PROVIDER`: optional WIF provider resource name.
- `GCP_SERVICE_ACCOUNT_EMAIL`: optional WIF target service account email.
- `VM_HOST`: production VM host or IP.
- `VM_USER`: SSH username.
- `VM_SSH_KEY`: private SSH key for `VM_USER`.
- `VM_DEPLOY_PATH`: repository path on the VM, for example
  `/home/humanly/humanly`.
- `NEXT_PUBLIC_API_URL`: production API URL baked into the frontend-user build,
  for example `https://app.writehumanly.net/api/v1`.
- `NEXT_PUBLIC_WS_URL`: production WebSocket URL baked into the frontend-user
  build, for example `wss://app.writehumanly.net`.

The VM still uses its production `.env` file for backend runtime configuration,
including database, Redis, JWT, email, CORS, and other server-side values.

## Manual Deploy

To deploy a specific pair of images from the VM:

```bash
cd /home/humanly/humanly

export BACKEND_IMAGE="REGION-docker.pkg.dev/PROJECT_ID/humanly/humanly-backend:GIT_SHA"
export FRONTEND_USER_IMAGE="REGION-docker.pkg.dev/PROJECT_ID/humanly/humanly-frontend-user:GIT_SHA"

bash scripts/deploy.sh
```

The deploy script writes the image tags to `.env.production-images`. Running
`bash scripts/deploy.sh` later with no image variables reuses the stored tags.

## Rollback

Rollback is a manual deploy of a previous commit-SHA tag:

```bash
cd /home/humanly/humanly

export BACKEND_IMAGE="REGION-docker.pkg.dev/PROJECT_ID/humanly/humanly-backend:PREVIOUS_GIT_SHA"
export FRONTEND_USER_IMAGE="REGION-docker.pkg.dev/PROJECT_ID/humanly/humanly-frontend-user:PREVIOUS_GIT_SHA"

bash scripts/deploy.sh
```

The script prunes only dangling images. It does not run `docker image prune -a`,
so tagged images needed for rollback are not aggressively deleted by deploys.

## Production Compose Images

`docker-compose.prod.yml` now requires these variables for image selection:

```bash
BACKEND_IMAGE=REGION-docker.pkg.dev/PROJECT_ID/humanly/humanly-backend:GIT_SHA
FRONTEND_USER_IMAGE=REGION-docker.pkg.dev/PROJECT_ID/humanly/humanly-frontend-user:GIT_SHA
```

The deploy script exports those variables before running Docker Compose. Local
development remains unchanged and continues to use `docker-compose.yml` and
local build workflows.
