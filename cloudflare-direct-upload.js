#!/usr/bin/env node

/**
 * Tomato Restaurant - CloudFlare Direct Upload Tool
 * 
 * This script uses CloudFlare's Direct Upload API to upload your website
 * without needing to go through Git or the Pages UI.
 */

// Check Node.js version
const nodeVersion = process.version.match(/^v(\d+)\./)[1];
if (parseInt(nodeVersion) < 18) {
  console.error(`Error: Node.js version 18 or higher is required.`);
  console.error(`Current version: ${process.version}`);
  console.error(`Please install a compatible version of Node.js before continuing.`);
  process.exit(1);
}

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to prompt for input
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Helper function to validate required fields
function validateRequired(value, name) {
  if (!value || value.trim() === '') {
    console.error(`Error: ${name} is required`);
    return false;
  }
  return true;
}

// Helper function to make API requests
function makeApiRequest(method, url, headers, data) {
  return new Promise((resolve, reject) => {
    const options = {
      method: method,
      headers: headers
    };
    
    const req = https.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsedData);
          } else {
            reject({ statusCode: res.statusCode, data: parsedData });
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Main deployment function
async function deployToCloudflare() {
  console.log("=== Tomato Restaurant - CloudFlare Direct Upload Tool ===");
  console.log("This tool helps you deploy your website directly to CloudFlare Pages.\n");
  
  try {
    // Step 1: Collect necessary information
    console.log("=== Step 1: Configuration ===");
    const accountId = await prompt("Enter your CloudFlare account ID: ");
    if (!validateRequired(accountId, "Account ID")) return;
    
    const apiToken = await prompt("Enter your CloudFlare API token: ");
    if (!validateRequired(apiToken, "API token")) return;
    
    const projectName = await prompt("Enter project name (default: tomato-restaurant): ") || "tomato-restaurant";
    const domainName = await prompt("Enter your domain name: ");
    const apiKey = await prompt("Enter your API key (leave blank to use default): ") || "tomato-api-key-9c8b7a6d5e4f3g2h1i";
    
    // Step 2: Build the project
    console.log("\n=== Step 2: Building the Project ===");
    console.log("Running npm build...");
    
    try {
      execSync('npm run build', { stdio: 'inherit' });
    } catch (error) {
      console.error("Error: Build failed. Please check your code and try again.");
      return;
    }
    
    const distPath = path.join(process.cwd(), 'dist');
    if (!fs.existsSync(distPath)) {
      console.error("Error: 'dist' directory not found. Build may have failed.");
      return;
    }
    
    // Step 3: Create or get project on CloudFlare
    console.log("\n=== Step 3: Configuring CloudFlare Pages Project ===");
    
    try {
      // Check if project exists
      let projectExists = false;
      
      try {
        const projectsResponse = await makeApiRequest(
          'GET',
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects`,
          {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          }
        );
        
        projectExists = projectsResponse.result.some(project => project.name === projectName);
      } catch (error) {
        console.log("Could not check if project exists, will try to create it.");
      }
      
      // Create project if it doesn't exist
      if (!projectExists) {
        console.log(`Creating new project: ${projectName}`);
        
        try {
          await makeApiRequest(
            'POST',
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects`,
            {
              'Authorization': `Bearer ${apiToken}`,
              'Content-Type': 'application/json'
            },
            {
              name: projectName,
              production_branch: 'main'
            }
          );
          
          console.log("Project created successfully.");
        } catch (error) {
          console.error("Error creating project:", error.data?.errors || error.message);
          return;
        }
      } else {
        console.log(`Project ${projectName} already exists.`);
      }
      
      // Step 4: Create a direct upload URL
      console.log("\n=== Step 4: Preparing for Upload ===");
      console.log("Getting direct upload URL...");
      
      let uploadUrl;
      try {
        const uploadResponse = await makeApiRequest(
          'POST',
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}/deployments`,
          {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          }
        );
        
        uploadUrl = uploadResponse.result.upload_url;
        console.log("Upload URL obtained successfully.");
      } catch (error) {
        console.error("Error getting upload URL:", error.data?.errors || error.message);
        return;
      }
      
      // Step 5: Zip and upload the dist directory
      console.log("\n=== Step 5: Uploading Files ===");
      console.log("Preparing files for upload...");
      
      const zipFilePath = path.join(process.cwd(), 'dist.zip');
      
      try {
        // Zip the dist directory
        if (process.platform === 'win32') {
          execSync(`powershell -Command "Compress-Archive -Path '${distPath}/*' -DestinationPath '${zipFilePath}'" -Force`, { stdio: 'inherit' });
        } else {
          execSync(`cd "${distPath}" && zip -r "${zipFilePath}" .`, { stdio: 'inherit' });
        }
        
        console.log("Files prepared. Uploading to CloudFlare...");
        
        // Upload the zip file
        execSync(`curl -X POST "${uploadUrl}" -F "file=@${zipFilePath}"`, { stdio: 'inherit' });
        
        console.log("Upload successful!");
        
        // Clean up the zip file
        fs.unlinkSync(zipFilePath);
      } catch (error) {
        console.error("Error during upload:", error.message);
        return;
      }
      
      // Step 6: Set environment variables
      console.log("\n=== Step 6: Setting Environment Variables ===");
      
      try {
        await makeApiRequest(
          'PUT',
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}/deployments/environments`,
          {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          },
          {
            env_vars: {
              API_KEY: { value: apiKey },
              NODE_VERSION: { value: "20.x" }
            },
            deployment_configs: {
              production: {
                env_vars: {
                  API_KEY: { value: apiKey },
                  NODE_VERSION: { value: "20.x" }
                }
              }
            }
          }
        );
        
        console.log("Environment variables set successfully.");
      } catch (error) {
        console.error("Error setting environment variables:", error.data?.errors || error.message);
        // Continue despite errors with env vars
      }
      
      // Step 7: Success
      console.log("\n=== Deployment Complete! ===");
      console.log(`Your Tomato Restaurant website has been deployed to CloudFlare Pages.`);
      console.log(`Website URL: https://${projectName}.pages.dev`);
      
      if (domainName) {
        console.log(`\nTo set up your custom domain (${domainName}):`);
        console.log("1. Go to your CloudFlare Pages project");
        console.log("2. Click on 'Custom domains'");
        console.log("3. Add your domain and follow the verification steps");
      }
      
      console.log("\nRemember:");
      console.log(`- Access your admin panel at your website URL + /admin using API key: ${apiKey}`);
      console.log("- Refer to CLOUDFLARE_DEPLOYMENT_GUIDE.md for detailed instructions and troubleshooting");
      
    } catch (error) {
      console.error("An unexpected error occurred:", error.message || error);
    }
    
  } finally {
    rl.close();
  }
}

// Run the deployment
deployToCloudflare();