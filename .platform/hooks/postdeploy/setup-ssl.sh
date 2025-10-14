#!/bin/bash
set -e

DOMAIN="api.credcars.com.ng"
WWW_DOMAIN="www.api.credcars.com.ng"
EMAIL="credcarsng@gmail.com"

echo "=============================="
echo "🔹 Starting SSL setup for $DOMAIN"
echo "=============================="

# Check if certificate already exists
if sudo certbot certificates | grep -q "$DOMAIN"; then
  echo "✅ Existing SSL certificate found for $DOMAIN. Skipping new issuance."
else
  echo "🔹 No existing certificate found. Installing Certbot if needed..."

  # Install Certbot only if missing
  if ! command -v certbot &> /dev/null; then
    echo "Installing Certbot..."
    sudo yum update -y
    sudo amazon-linux-extras install epel -y
    sudo yum install -y certbot python3-certbot-nginx
  else
    echo "✅ Certbot already installed."
  fi

  echo "🔹 Checking nginx configuration..."
  sudo nginx -t

  echo "🔹 Requesting new SSL certificate..."
  sudo certbot --nginx -d $DOMAIN -d $WWW_DOMAIN --non-interactive --agree-tos -m $EMAIL --redirect

  echo "✅ SSL certificate obtained successfully."
fi

# Ensure automatic renewal exists in crontab
if ! sudo crontab -l 2>/dev/null | grep -q "certbot renew"; then
  echo "🔹 Setting up automatic certificate renewal..."
  (sudo crontab -l 2>/dev/null; echo "0 3 * * * /usr/bin/certbot renew --quiet") | sudo crontab -
  echo "✅ Auto-renewal added to crontab."
else
  echo "✅ Auto-renewal already configured."
fi

# Check HTTPS connectivity
echo "🔹 Verifying HTTPS..."
if curl -Is https://$DOMAIN | grep -q "200"; then
  echo "✅ HTTPS is working correctly for $DOMAIN."
else
  echo "⚠️ HTTPS check failed. Please verify DNS and nginx configuration."
fi

echo "🎉 SSL setup complete!"
echo "=============================="
