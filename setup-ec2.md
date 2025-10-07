EC2 Server Setup — CredCars (Production & Staging)
📘 Overview

This document details how to set up a new EC2 instance from scratch to host the CredCars backend (NestJS + Docker), frontend (Vue + Nginx), and SSL (Certbot).

It applies to:

Production → api.credcars.com.ng

Staging → devapi.credcars.com.ng

🪜 1. Launch EC2 Instance
Setting	Value
OS	Ubuntu 22.04 LTS
Instance type	t2.micro (or larger)
Storage	8 GB (default)
Security group	Allow inbound ports 22 (SSH), 80 (HTTP), 443 (HTTPS), 3000 (API)
Key pair	credcars-key.pem (download and keep secure)

Once the instance is running, connect via SSH:

ssh -i credcars-key.pem ubuntu@<EC2_PUBLIC_IP>

⚙️ 2. Basic System Setup
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl unzip ufw

Create a swap file (to prevent OOM errors)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

🐳 3. Install Docker
sudo apt install -y ca-certificates curl gnupg lsb-release
sudo mkdir -m 0755 -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable docker
sudo systemctl start docker

💾 4. Move Docker Storage to /mnt

To avoid running out of space on /, move Docker data to /mnt/docker-data.

sudo systemctl stop docker
sudo rsync -aP /var/lib/docker/ /mnt/docker-data
sudo mv /var/lib/docker /var/lib/docker.old
sudo ln -s /mnt/docker-data /var/lib/docker
sudo systemctl start docker


🧠 Tip: If Docker fails to start, check sudo journalctl -xeu docker.

🌐 5. Install & Configure Nginx
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx


Check status:

sudo systemctl status nginx

📄 Example Nginx Config (Production)

Create a new file:

sudo nano /etc/nginx/sites-available/api.credcars.com.ng


Paste this:

server {
    server_name api.credcars.com.ng;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    listen 80;
}


Enable it:

sudo ln -s /etc/nginx/sites-available/api.credcars.com.ng /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx


Repeat the same for devapi.credcars.com.ng but with port 3001.

🔒 6. Install SSL (Certbot)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.credcars.com.ng -d devapi.credcars.com.ng


Check renewal timer:

sudo systemctl list-timers | grep certbot


Certbot auto-renews twice daily via systemd timer:

/usr/lib/systemd/system/certbot.service


Manual test:

sudo certbot renew --dry-run

🧱 7. Configure Dockerized Backend
Pull from Docker Hub
sudo docker pull credcars/credcars-backend:latest

Run production container
sudo docker run -d --name credcars-backend \
  --env-file .env.production \
  -p 3000:3000 \
  credcars/credcars-backend:latest

Run staging container
sudo docker run -d --name credcars-backend-staging \
  --env-file .env.staging \
  -p 3001:3000 \
  credcars/credcars-backend:staging

🔄 8. Enable HTTPS Reverse Proxy (Nginx + Docker)

Restart Nginx to apply Certbot SSL configs:

sudo systemctl reload nginx


Now:

https://api.credcars.com.ng → production backend

https://devapi.credcars.com.ng → staging backend

💾 9. MongoDB Connection

Your .env file should contain:

MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/credcars


Whitelist both EC2 IPs in MongoDB Atlas for access.

🧰 10. Useful Commands
Task	Command
View running containers	sudo docker ps
Stop container	sudo docker stop credcars-backend
Remove container	sudo docker rm credcars-backend
View logs	sudo docker logs credcars-backend
Free up disk	sudo docker system prune -a -f
Reload Nginx	sudo systemctl reload nginx
Restart Docker	sudo systemctl restart docker
🧪 11. Staging Data Seeding

To seed the staging database:

sudo docker exec -it credcars-backend-staging npm run seed:staging

🧾 12. Backups (Optional)

Manual backup command:

mongodump --uri="mongodb+srv://<user>:<pass>@cluster.mongodb.net/credcars" \
  --archive=/home/ubuntu/backups/credcars_$(date +%F).gz --gzip


Automate via cron:

sudo crontab -e


Add:

0 2 * * * mongodump --uri="mongodb+srv://<user>:<pass>@cluster.mongodb.net/credcars" --archive=/home/ubuntu/backups/credcars_$(date +\%F).gz --gzip

🧩 13. Firewall Setup

Enable UFW and allow required ports:

sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

🧱 14. Health Checks

Run:

curl http://localhost:3000/api/v1/health
curl http://localhost:3001/api/v1/health


Check Nginx logs:

sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

✅ Setup Summary
Service	Status
Docker	✅ Installed
Nginx	✅ Configured
SSL (Certbot)	✅ Auto-renewing
MongoDB Atlas	✅ Connected
Firewall	✅ Active
Backups	✅ Optional automation
CI/CD	✅ GitHub Actions setup
Logs	✅ Accessible via Nginx & Docker
