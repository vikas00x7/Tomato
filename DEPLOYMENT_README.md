# Tomato Restaurant CloudFlare Deployment

This directory contains multiple tools and guides to help you deploy the Tomato Restaurant website to CloudFlare easily.

## Important Node.js Version Requirement

This project requires **Node.js version 18 or higher** (Node.js 20 is recommended).

If you're using an older version of Node.js, you'll need to upgrade before deployment will succeed.
You can check your Node.js version with:

```bash
node -v
```

If you need to update Node.js, visit [nodejs.org](https://nodejs.org/) to download the latest version.

## Deployment Options

Choose from the following deployment methods based on your preference:

### 1. One-Click Web Interface

For a guided experience with a graphical interface:

1. Open `deploy.html` in your web browser
2. Fill in your domain and CloudFlare account information
3. Click "Deploy to CloudFlare" to be guided through the deployment process

### 2. Command Line Deployment

For users comfortable with command line tools:

```bash
# Make the script executable
chmod +x deploy-to-cloudflare.sh

# Run the deployment script
./deploy-to-cloudflare.sh
```

The script will guide you through the deployment process step by step.

### 3. Direct Upload Tool

For direct deployment without Git or the CloudFlare UI:

```bash
# Make the script executable
chmod +x cloudflare-direct-upload.js

# Run the direct upload tool
node cloudflare-direct-upload.js
```

This tool will build and upload your site directly to CloudFlare Pages.

## Detailed Guide

For comprehensive instructions, please refer to the `CLOUDFLARE_DEPLOYMENT_GUIDE.md` file, which includes:

- Detailed setup instructions
- Troubleshooting tips
- Advanced configuration options
- Security considerations
- Custom domain setup

## API Key

All deployment methods use the following default API key:
```
tomato-api-key-9c8b7a6d5e4f3g2h1i
```

You can specify a custom API key during the deployment process.

## Bot Protection Worker

The CloudFlare Worker for bot protection is automatically deployed as part of the process. It will redirect bots to the paywall page while allowing legitimate users to access your site.

## After Deployment

Once deployed, your website will be available at:
- CloudFlare Pages URL: `https://your-project-name.pages.dev`
- Custom domain (if configured): `https://your-domain.com`

Access the admin panel at `/admin` using your API key to view bot logs and manage your site.