# CloudFlare Deployment Guide with One-Click Setup

This guide will walk you through deploying the Tomato Restaurant website to CloudFlare Pages with bot protection enabled. The deployment process is designed to be as simple as possible with minimal configuration.

## Prerequisites

Before you begin, make sure you have:

1. A CloudFlare account
2. A domain connected to CloudFlare (for DNS management)
3. Access to the CloudFlare dashboard
4. Node.js version 18 or later installed (Node.js 20 is recommended)

> **Important**: This project requires Node.js version 18 or later. If you're using an older version, you'll need to upgrade before deploying to CloudFlare Pages.

## Step 1: Prepare Your Repository

If you're deploying directly from this codebase:

1. Make sure you've completed all local development and testing
2. Commit all changes to your repository
3. Push your repository to GitHub or another Git provider supported by CloudFlare Pages

## Step 2: One-Click Deployment Setup

### Option A: Deploy via CloudFlare Pages UI

1. Log in to your CloudFlare dashboard
2. Navigate to **Pages** in the left sidebar
3. Click **Create a project**
4. Select your Git provider (GitHub, GitLab, etc.)
5. Authorize CloudFlare to access your repositories if prompted
6. Select the repository containing your Tomato Restaurant website
7. Configure your build settings:
   - **Project name**: `tomato-restaurant` (or your preferred name)
   - **Production branch**: `main` (or your main branch)
   - **Framework preset**: Select `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: Leave blank (uses repository root)

8. Under **Environment variables**, add the following:
   ```
   DATABASE_URL: your-postgres-database-url
   API_KEY: tomato-api-key-9c8b7a6d5e4f3g2h1i (or your preferred secure key)
   NODE_VERSION: 20.x
   ```

9. Click **Save and Deploy**

### Option B: Deploy using Wrangler CLI (Advanced)

If you prefer using the command line:

1. Install Wrangler globally:
   ```
   npm install -g wrangler
   ```

2. Log in to CloudFlare:
   ```
   wrangler login
   ```

3. Build your project:
   ```
   npm run build
   ```

4. Deploy to CloudFlare Pages:
   ```
   wrangler pages publish dist --project-name=tomato-restaurant
   ```

## Step 3: Setting Up the CloudFlare Worker for Bot Protection

The bot protection is handled by a CloudFlare Worker that intercepts requests to your site.

1. In your CloudFlare dashboard, go to **Workers & Pages**
2. Click **Create a Service**
3. Name your service (e.g., `tomato-bot-protection`)
4. Click **Create service**
5. Delete the boilerplate code and paste the content of `cloudflare/worker.js`
6. Update the configuration section:
   ```javascript
   const CONFIG = {
     // Update these values as needed
     allowedDomains: ['your-actual-domain.com'],
     apiKey: 'your-api-key', // Use the same key as in Pages environment variables
     logEndpoint: 'https://your-actual-domain.com/api/log',
   };
   ```
7. Click **Save and Deploy**

## Step 4: Configure Worker Routes

1. In your CloudFlare dashboard, go to your domain's overview
2. Click on **Workers Routes** in the sidebar
3. Click **Add Route**
4. For the route pattern, enter `*your-domain.com/*`
5. Select your bot protection worker
6. Click **Save**

## Step 5: Testing Your Deployment

After deployment is complete:

1. Visit your site at `https://your-domain.com` to ensure it loads correctly
2. Test the bot detection by:
   - Using a browser with a user agent containing bot keywords
   - Accessing from different locations
   - Using incognito/private browsing
3. Access `/admin` with your API key to verify logs are being recorded

## Troubleshooting

If you encounter issues:

1. **Node.js Version Error**: 
   - **Error Message**: `TypeError: crypto$2.getRandomValues is not a function`
   - **Cause**: This project requires Node.js 18 or newer, but CloudFlare Pages is using Node.js 16 by default
   - **Solution**: Add `NODE_VERSION: 20.x` to your environment variables and make sure `.node-version` file is included in your repository

2. **Dependency Compatibility Errors**:
   - **Error Messages**: `EBADENGINE` warnings such as `required: { node: '^18.0.0 || >=20.0.0' }`
   - **Solution**: Update the Node.js version as described above, or add the `--force` flag to npm commands if absolutely necessary

3. **Pages not deploying**: Check your build settings and ensure dependencies are correctly installed
4. **Worker not intercepting**: Verify your worker routes are correctly configured
5. **API endpoints not working**: Check environment variables and ensure the API key matches between worker and server
6. **Database connection issues**: Verify your DATABASE_URL is correct and accessible from CloudFlare

## Security Considerations

For production use:

1. Generate a strong, random API key instead of using the default
2. Store all sensitive information in CloudFlare environment variables
3. Regularly review bot logs to adjust detection parameters
4. Consider implementing rate limiting for API endpoints

## Advanced Configuration

### Custom Domain Setup

1. In your CloudFlare Pages project, click on **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain name
4. Follow the verification steps

### Automatic Deployments

CloudFlare Pages automatically deploys when you push to your repository's main branch. To set up preview deployments for other branches:

1. Go to your project settings
2. Under **Builds & deployments**, configure preview branches
3. Optionally set environment variables specific to preview deployments

## Support and Resources

- [CloudFlare Pages Documentation](https://developers.cloudflare.com/pages/)
- [CloudFlare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)