/**
 * Advanced Bot Detection Testing
 * Tests various bot techniques against the TomatoWebsite
 */

const puppeteer = require('puppeteer');
const playwright = require('playwright');
const fetch = require('node-fetch');
const fs = require('fs');
const { execSync } = require('child_process');

// Configuration
const TARGET_WEBSITE = 'https://www.bunnylovesoaps.com'; // Testing against live site
const TEST_PATHS = ['/', '/about', '/menu'];
const RESULTS_DIR = './results';

// Create results directory if it doesn't exist
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR);
}

// Helper to log results
function logResult(category, technique, detectionPath, detected, redirected) {
  console.log(`${category}\t${technique}\t${detected ? '✅ Detected' : '❌ Not detected'}\t${redirected ? '✅ Redirected' : '❌ Not redirected'}`);
  return {
    timestamp: new Date().toISOString(),
    category,
    technique,
    detectionPath,
    detected,
    redirected
  };
}

async function runTests() {
  console.log('Running advanced bot detection tests...');
  console.log('Scenario\tBot Type\tDetection Output\tRedirect');
  console.log('--------------------------------------------------------');
  
  const results = [];
  
  // 1. Puppeteer Headless Tests (navigator.webdriver, missing touch)
  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    for (const path of TEST_PATHS) {
      const response = await page.goto(`${TARGET_WEBSITE}${path}`, { waitUntil: 'networkidle2' });
      const url = page.url();
      const content = await page.content();
      
      const detected = content.includes('bot') || content.includes('challenge') || content.includes('captcha');
      const redirected = url.includes('paywall');
      
      results.push(logResult('Puppeteer', 'Headless automation', path, detected, redirected));
      
      // Take screenshot for evidence
      await page.screenshot({ path: `${RESULTS_DIR}/puppeteer-${path.replace(/\//g, '-')}.png` });
    }
    
    await browser.close();
  } catch (error) {
    console.error('Puppeteer test error:', error.message);
  }
  
  // 2. Playwright Tests (Cross-browser scripted bot)
  try {
    const browser = await playwright.chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    for (const path of TEST_PATHS) {
      const response = await page.goto(`${TARGET_WEBSITE}${path}`);
      const url = page.url();
      const content = await page.content();
      
      const detected = content.includes('bot') || content.includes('challenge') || content.includes('captcha');
      const redirected = url.includes('paywall');
      
      results.push(logResult('Playwright', 'Cross-browser scripted bot', path, detected, redirected));
      
      // Take screenshot for evidence
      await page.screenshot({ path: `${RESULTS_DIR}/playwright-${path.replace(/\//g, '-')}.png` });
    }
    
    await browser.close();
  } catch (error) {
    console.error('Playwright test error:', error.message);
  }
  
  // 3. Raw HTTP Tests (curl-like/httpx)
  try {
    for (const path of TEST_PATHS) {
      const response = await fetch(`${TARGET_WEBSITE}${path}`, {
        headers: {
          'User-Agent': 'curl/7.68.0'
        },
        redirect: 'manual'
      });
      
      const detected = response.status === 403 || response.status === 429;
      const redirected = response.status === 302 && 
                        (response.headers.get('location')?.includes('paywall') || false);
      
      results.push(logResult('curl/httpx', 'Raw scraper', path, detected, redirected));
    }
  } catch (error) {
    console.error('Raw HTTP test error:', error.message);
  }
  
  // 4. Real Chrome User Simulation
  try {
    const browser = await puppeteer.launch({ 
      headless: false, 
      args: ['--window-size=1920,1080'] 
    });
    const page = await browser.newPage();
    
    // Simulate realistic user behavior
    await page.setViewport({ width: 1920, height: 1080 });
    await page.evaluateOnNewDocument(() => {
      // Override webdriver flag
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      
      // Add real-like plugins
      Object.defineProperty(navigator, 'plugins', { 
        get: () => {
          return [
            { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
            { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
            { name: 'Native Client', filename: 'internal-nacl-plugin' }
          ];
        }
      });
      
      // Add real touch support
      Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5 });
    });
    
    for (const path of TEST_PATHS) {
      // Simulate mouse movements before page load
      for (let i = 0; i < 10; i++) {
        await page.mouse.move(Math.random() * 500, Math.random() * 500);
      }
      
      const response = await page.goto(`${TARGET_WEBSITE}${path}`, { waitUntil: 'networkidle2' });
      
      // Simulate scrolling
      await page.evaluate(() => {
        window.scrollBy(0, 300);
      });
      
      // Small pause to simulate reading
      await new Promise(r => setTimeout(r, 2000));
      
      const url = page.url();
      const content = await page.content();
      
      const detected = content.includes('bot') || content.includes('challenge') || content.includes('captcha');
      const redirected = url.includes('paywall');
      
      results.push(logResult('Chrome (human)', 'Real user', path, detected, redirected));
      
      // Take screenshot
      await page.screenshot({ path: `${RESULTS_DIR}/real-chrome-${path.replace(/\//g, '-')}.png` });
    }
    
    await browser.close();
  } catch (error) {
    console.error('Real Chrome test error:', error.message);
  }
  
  // 5. Spoofed Agent Bot
  try {
    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox']
    });
    const page = await browser.newPage();
    
    // Set a real-looking user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // But don't simulate realistic behavior - request pages rapidly
    for (const path of TEST_PATHS) {
      const response = await page.goto(`${TARGET_WEBSITE}${path}`);
      const url = page.url();
      const content = await page.content();
      
      const detected = content.includes('bot') || content.includes('challenge') || content.includes('captcha');
      const redirected = url.includes('paywall');
      
      results.push(logResult('Spoofed agent bot', '"Mozilla" + automation', path, detected, redirected));
      
      await page.screenshot({ path: `${RESULTS_DIR}/spoofed-${path.replace(/\//g, '-')}.png` });
    }
    
    await browser.close();
  } catch (error) {
    console.error('Spoofed agent test error:', error.message);
  }
  
  // Save results to file
  const resultsFile = `${RESULTS_DIR}/advanced-test-results-${new Date().toISOString().replace(/:/g, '-')}.json`;
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  
  // Generate HTML report
  generateHtmlReport(results);
  
  console.log('\nTests completed. Results saved to:', resultsFile);
}

function generateHtmlReport(results) {
  const reportPath = `${RESULTS_DIR}/advanced-test-report-${new Date().toISOString().replace(/:/g, '-')}.html`;
  
  // Group results by category
  const categories = {};
  results.forEach(r => {
    if (!categories[r.category]) {
      categories[r.category] = [];
    }
    categories[r.category].push(r);
  });
  
  // Generate HTML
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Advanced Bot Detection Test Results</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; padding: 2rem; max-width: 1200px; margin: 0 auto; }
      h1, h2, h3 { color: #333; }
      table { border-collapse: collapse; width: 100%; margin-bottom: 2rem; }
      th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
      th { background-color: #f5f5f5; position: sticky; top: 0; }
      tr:nth-child(even) { background-color: #f9f9f9; }
      .success { color: #4caf50; font-weight: bold; }
      .failure { color: #f44336; font-weight: bold; }
      .summary { display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 2rem; }
      .summary-box { flex: 1; min-width: 200px; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      .summary-box h3 { margin-top: 0; }
      .screenshots { display: flex; flex-wrap: wrap; gap: 20px; }
      .screenshot { width: 300px; margin-bottom: 2rem; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden; }
      .screenshot img { width: 100%; height: auto; }
      .screenshot-caption { padding: 10px; background: #f5f5f5; }
      .tag { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 12px; margin-right: 5px; }
      .tag.detected { background-color: #e8f5e9; color: #2e7d32; }
      .tag.not-detected { background-color: #ffebee; color: #c62828; }
      .tag.redirected { background-color: #e3f2fd; color: #1565c0; }
      .tag.not-redirected { background-color: #fff8e1; color: #f57f17; }
    </style>
  </head>
  <body>
    <h1>Advanced Bot Detection Test Results</h1>
    <p>Tests run at: ${new Date().toLocaleString()}</p>
    <p>Target: ${TARGET_WEBSITE}</p>
    
    <h2>Summary of Results</h2>
    <div class="summary">
      <div class="summary-box">
        <h3>Detection Rate</h3>
        <p><strong>${Math.round((results.filter(r => r.detected).length / results.length) * 100)}%</strong> of tests detected as bots</p>
      </div>
      <div class="summary-box">
        <h3>Redirection Rate</h3>
        <p><strong>${Math.round((results.filter(r => r.redirected).length / results.length) * 100)}%</strong> of tests redirected to paywall</p>
      </div>
      <div class="summary-box">
        <h3>False Positives</h3>
        <p><strong>${results.filter(r => r.category === 'Chrome (human)' && r.detected).length}</strong> human tests incorrectly flagged</p>
      </div>
    </div>
    
    <h2>Detailed Results</h2>
    
    ${Object.keys(categories).map(category => `
      <h3>${category}</h3>
      <table>
        <tr>
          <th>Technique</th>
          <th>Path</th>
          <th>Detection</th>
          <th>Redirection</th>
          <th>Time</th>
        </tr>
        ${categories[category].map(r => `
          <tr>
            <td>${r.technique}</td>
            <td>${r.detectionPath}</td>
            <td>
              <span class="tag ${r.detected ? 'detected' : 'not-detected'}">${r.detected ? '✅ Detected' : '❌ Not detected'}</span>
            </td>
            <td>
              <span class="tag ${r.redirected ? 'redirected' : 'not-redirected'}">${r.redirected ? '✅ Redirected' : '❌ Not redirected'}</span>
            </td>
            <td>${new Date(r.timestamp).toLocaleTimeString()}</td>
          </tr>
        `).join('')}
      </table>
    `).join('')}
    
    <h2>Screenshots</h2>
    <p>Screenshots are saved in the results directory and can be examined for visual confirmation.</p>
    
  </body>
  </html>
  `;
  
  fs.writeFileSync(reportPath, html);
  console.log('HTML report generated:', reportPath);
}

// Start the tests
runTests().catch(console.error);
