CredCars Deployment Documentation
🧭 Overview

This document outlines the deployment process for both staging and production environments.

Deployments are automated via GitHub Actions, which:

Builds Docker images for the backend.

Pushes them to Docker Hub.

Connects via SSH to EC2 and restarts the container.

⚙️ Prerequisites

Before deploying:

Ensure .env.staging and .env.production exist on the EC2 instances.

Ensure your GitHub repository has the following secrets:

STAGING_SERVER_HOST

STAGING_SERVER_SSH_KEY

PRODUCTION_SERVER_HOST

PRODUCTION_SERVER_SSH_KEY

Nginx and Certbot must already be configured.

🧪 Staging Deployment
🔹 GitHub Actions Flow

Triggers automatically on push to dev branch:

on:
  push:
    branches:
      - dev

🔹 Manual Deployment (if needed)
ssh ubuntu@<staging-server-ip>

# Pull latest image
sudo docker pull credcars/credcars-backend:staging

# Stop and remove old container
sudo docker stop credcars-backend-staging && sudo docker rm credcars-backend-staging

# Run the new one
sudo docker run -d --name credcars-backend-staging \
  --env-file .env.staging \
  -p 3001:3000 \
  credcars/credcars-backend:staging

# Verify
curl http://localhost:3001/api/v1/health

🚀 Production Deployment
🔹 Trigger via GitHub Actions

Triggered on push to main branch:

on:
  push:
    branches:
      - main

🔹 Manual Deployment (if needed)
ssh ubuntu@<production-server-ip>

sudo docker pull credcars/credcars-backend:latest

sudo docker stop credcars-backend && sudo docker rm credcars-backend

sudo docker run -d --name credcars-backend \
  --env-file .env.production \
  -p 3000:3000 \
  credcars/credcars-backend:latest

curl http://localhost:3000/api/v1/health

🔧 Frontend Deployment (Staging)

Handled via GitHub Actions workflow:

Builds Vue frontend from the dev branch

Uploads /dist folder to /var/www/app-staging/dist

Restarts Nginx

Manual alternative:
scp -i <ssh-key> -r dist/* ubuntu@<staging-server-ip>:/var/www/app-staging/dist/
ssh ubuntu@<staging-server-ip>
sudo systemctl reload nginx

🧰 Rollback Instructions

If deployment fails:

sudo docker stop credcars-backend-staging
sudo docker run -d --name credcars-backend-staging \
  --env-file .env.staging \
  -p 3001:3000 \
  credcars/credcars-backend:<previous-tag>

🧾 Log Locations
Service	Path
Nginx Access Log	/var/log/nginx/app.access.log
Nginx Error Log	/var/log/nginx/app.error.log
Docker Logs	sudo docker logs credcars-backend
System Logs	/var/log/syslog
🕒 SSL Auto-Renewal

Certbot auto-renews certificates using a systemd timer:

sudo systemctl list-timers | grep certbot


Manual renewal (if needed):

sudo certbot renew --dry-run

🧪 Staging Data Seeding

You can populate test data with:

sudo docker exec -it credcars-backend-staging npm run seed:staging


This ensures every staging deploy has sample users, listings, and properties.

🧱 Maintenance Tips

Regularly prune Docker data:

sudo docker system prune -a -f


Monitor EC2 disk usage:

df -h


Restart services safely:

sudo systemctl reload nginx
sudo systemctl restart docker
