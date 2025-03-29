#!/bin/bash

# Tomato Restaurant - CloudFlare Deployment Script
# This script automates the deployment process to CloudFlare

echo "=== Tomato Restaurant - CloudFlare Deployment ==="
echo "This script will help you deploy your website to CloudFlare."

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Check if CloudFlare Wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "CloudFlare Wrangler not found. Installing..."
    npm install -g wrangler

    if [ $? -ne 0 ]; then
        echo "Error installing Wrangler. Please install manually with: npm install -g wrangler"
        exit 1
    fi
fi

# Step 1: Collect necessary information
echo ""
echo "=== Step 1: Configuration ==="
read -p "Enter your domain name (e.g., bunnylovesoaps.com): " DOMAIN_NAME
read -p "Enter your CloudFlare account ID (found in your CloudFlare dashboard): " CF_ACCOUNT_ID
read -p "Enter your database URL (leave blank for demo mode): " DATABASE_URL
read -p "Enter your API key (leave blank to use default): " API_KEY

# Use default if no API key is provided
if [ -z "$API_KEY" ]; then
    API_KEY="tomato-api-key-9c8b7a6d5e4f3g2h1i"
    echo "Using default API key: $API_KEY"
fi

# Step 2: Update configuration files
echo ""
echo "=== Step 2: Updating Configuration Files ==="

# Update wrangler.toml
echo "Updating wrangler.toml..."
sed -i "s/bunnylovesoaps.com/$DOMAIN_NAME/g" wrangler.toml
sed -i "s/your-cloudflare-zone-id/$CF_ACCOUNT_ID/g" wrangler.toml

# Update CloudFlare worker
echo "Updating CloudFlare worker configuration..."
sed -i "s/bunnylovesoaps.com/$DOMAIN_NAME/g" cloudflare/worker.js
sed -i "s/tomato-api-key-9c8b7a6d5e4f3g2h1i/$API_KEY/g" cloudflare/worker.js

# Update server API key
echo "Updating server API key..."
sed -i "s/tomato-api-key-9c8b7a6d5e4f3g2h1i/$API_KEY/g" server/routes.ts

# Step 3: Build the project
echo ""
echo "=== Step 3: Building the Project ==="
echo "Running npm build..."
npm run build

if [ $? -ne 0 ]; then
    echo "Error: Build failed. Please check your code and try again."
    exit 1
fi

# Step 4: Login to CloudFlare
echo ""
echo "=== Step 4: CloudFlare Authentication ==="
echo "You'll need to authenticate with CloudFlare."
wrangler login

if [ $? -ne 0 ]; then
    echo "Error: CloudFlare authentication failed. Please try again."
    exit 1
fi

# Step 5: Deploy to CloudFlare Pages
echo ""
echo "=== Step 5: Deploying to CloudFlare Pages ==="
echo "Deploying to CloudFlare Pages..."

# Create environment variables file
echo "Creating environment variables..."
cat > .env << EOL
API_KEY=$API_KEY
DATABASE_URL=$DATABASE_URL
EOL

# Deploy using Wrangler
wrangler pages publish dist --project-name=tomato-restaurant --env-file=.env

if [ $? -ne 0 ]; then
    echo "Error: Deployment to CloudFlare Pages failed. Please check the error message and try again."
    exit 1
fi

# Step 6: Deploy the Worker
echo ""
echo "=== Step 6: Deploying CloudFlare Worker ==="
echo "Deploying bot protection worker..."
wrangler publish cloudflare/worker.js

if [ $? -ne 0 ]; then
    echo "Error: Worker deployment failed. Please check the error message and try again."
    exit 1
fi

# Step 7: Success message
echo ""
echo "=== Deployment Complete! ==="
echo "Your Tomato Restaurant website has been deployed to CloudFlare."
echo "Website URL: https://$DOMAIN_NAME"
echo ""
echo "Next Steps:"
echo "1. Set up a Worker Route in your CloudFlare dashboard to direct all traffic through your bot protection worker"
echo "2. Access your admin panel at https://$DOMAIN_NAME/admin using your API key: $API_KEY"
echo "3. View the CLOUDFLARE_DEPLOYMENT_GUIDE.md file for more detailed instructions and troubleshooting"
echo ""
echo "Thank you for using the Tomato Restaurant deployment script!"