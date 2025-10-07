CredCars Infrastructure Documentation
📘 Overview

CredCars is a web-based property and automobile management platform connecting property owners, managers, and tenants.
It has two environments: Production and Staging, both hosted on separate AWS EC2 instances.

Each environment uses:

Nginx as a reverse proxy (with SSL via Certbot)

Docker to run the NestJS backend

MongoDB Atlas for data storage

GitHub Actions for CI/CD automation

⚙️ System Architecture
Client (Browser)
     ↓
Nginx (Reverse Proxy, SSL via Let's Encrypt)
     ↓
Docker Container (NestJS Backend)
     ↓
MongoDB Atlas (Cloud Database)

🌍 Environments
Environment	Domain	Port	Server	Purpose
Production	api.credcars.com.ng	3000	EC2 (prod)	Live system
Staging	devapi.credcars.com.ng	3001	EC2 (staging)	Test new features
🖥️ System Components
Component	Description
Backend	NestJS app containerized in Docker
Frontend	Vue app hosted via Nginx
Database	MongoDB Atlas (multi-region cloud-hosted)
CI/CD	GitHub Actions + Docker Hub
Security	HTTPS (Certbot), SSH key auth, restricted MongoDB IPs
Reverse Proxy	Nginx configuration under /etc/nginx/sites-available/
SSL Auto-Renewal	Managed via certbot.timer (renews every ~12 hours)
🧰 Server Specs
Resource	Value
Instance Type	t2.micro (Ubuntu 22.04)
Disk	8 GB (extended to /mnt/docker-data)
Swap	2 GB (recommended for stability)
Docker Root	/mnt/docker-data
Nginx Root	/etc/nginx/sites-available/
🔒 Access Control

SSH: via private key only (no password login)

MongoDB Atlas: only whitelisted EC2 IPs

Nginx: Enforces HTTPS-only access

Ports open: 80, 443, 22, 3000, 3001

🧾 Certificates and Renewal

Certificates generated using Let’s Encrypt via Certbot.

Renewal is automated with:

systemctl list-timers | grep certbot


Service file: /usr/lib/systemd/system/certbot.service

🧱 Folder Structure (Staging)
/var/www/app-staging
│
├── dist/                # Deployed frontend files
├── nginx/
│   └── devapp.conf      # Nginx config for staging
└── docker/
    └── backend/         # Backend container setup

🪣 Backups

MongoDB backups handled via Atlas Cloud Backups

Optional manual dumps using:

mongodump --uri="mongodb+srv://<user>:<pass>@cluster.mongodb.net/credcars" \
  --archive=/home/ubuntu/backups/credcars_$(date +%F).gz --gzip

🧩 Future Improvements

 Move EC2 provisioning to Terraform

 Automate configuration setup with Ansible

 Add monitoring (e.g., UptimeRobot or Prometheus + Grafana)

 Automate backup rotation and notifications
