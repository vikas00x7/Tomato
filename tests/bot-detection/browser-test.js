/**
 * Browser-based bot testing for TomatoWebsite
 * This script uses Puppeteer to simulate browsers with different user agents
 * and test how the bot detection responds to them.
 * 
 * To use: 
 * npm install puppeteer
 * node browser-test.js
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

// Configuration
const TARGET_WEBSITE = 'https://www.bunnylovesoaps.com';
const TEST_SCENARIOS = [
  {
    name: 'Regular User',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    additionalOptions: {}
  },
  {
    name: 'Googlebot',
    userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    additionalOptions: {}
  },
  {
    name: 'Generic Bot',
    userAgent: 'SomeBotCrawler/1.0',
    additionalOptions: {}
  },
  {
    name: 'Headless Browser Detection Test',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    additionalOptions: {
      // Keep headless: true to test for headless detection
      headless: true
    }
  },
  {
    name: 'Fingerprinting Evasion Test',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    additionalOptions: {},
    preTest: async (page) => {
      // Override navigator properties to try to evade fingerprinting
      await page.evaluateOnNewDocument(() => {
        // Override webdriver flag
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        
        // Add fake plugins
        Object.defineProperty(navigator, 'plugins', { 
          get: () => {
            return [1, 2, 3, 4, 5].map(() => ({
              name: `Plugin ${Math.random()}`,
              description: 'Fake plugin for testing',
              filename: `plugin${Math.random()}.dll`
            }));
          }
        });
        
        // Fake language settings
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      });
    }
  }
];

// URLs to test
const URLs = [
  '/',
  '/about',
  '/menu'
];

async function runTests() {
  console.log(`🤖 Starting browser-based bot tests against ${TARGET_WEBSITE}`);
  console.log(`${TEST_SCENARIOS.length} scenarios × ${URLs.length} URLs = ${TEST_SCENARIOS.length * URLs.length} total tests`);
  console.log('----------------------------------------------\n');
  
  const results = [];
  
  for (const scenario of TEST_SCENARIOS) {
    console.log(`🔍 Testing scenario: ${scenario.name}`);
    
    // Launch browser with scenario configuration
    const browserOptions = {
      headless: scenario.additionalOptions.headless !== undefined ? 
                scenario.additionalOptions.headless : 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', ...(scenario.additionalOptions.args || [])]
    };
    
    const browser = await puppeteer.launch(browserOptions);
    
    try {
      // Create a new page
      const page = await browser.newPage();
      
      // Set user agent
      await page.setUserAgent(scenario.userAgent);
      
      // Run any pre-test setup
      if (scenario.preTest) {
        await scenario.preTest(page);
      }
      
      // Detect redirects by listening to navigation events
      let redirects = [];
      page.on('request', request => {
        const url = request.url();
        if (redirects.length > 0 && 
            url !== redirects[redirects.length - 1]) {
          redirects.push(url);
        }
      });
      
      // Run tests for each URL
      for (const url of URLs) {
        try {
          redirects = [TARGET_WEBSITE + url]; // Initialize with starting URL
          
          console.log(`  Testing ${url}...`);
          const startTime = Date.now();
          
          // Navigate to the URL
          const response = await page.goto(TARGET_WEBSITE + url, {
            waitUntil: 'networkidle2',
            timeout: 30000
          });
          
          const responseTime = Date.now() - startTime;
          const finalUrl = page.url();
          
          // Check for paywall redirect
          const redirectedToPaywall = finalUrl.includes('paywall');
          
          // Get page content
          const content = await page.content();
          
          // Check page indicators
          const blocked = content.includes('blocked') || 
                          content.includes('access denied') || 
                          response.status() === 403;
          
          // Screenshot for visual verification
          const screenshotPath = `./browser-test-${scenario.name.replace(/\s+/g, '-')}-${url.replace(/\//g, '-')}.png`;
          await page.screenshot({ path: screenshotPath });
          
          // Push results
          results.push({
            scenario: scenario.name,
            userAgent: scenario.userAgent,
            url,
            finalUrl,
            status: response.status(),
            redirectedToPaywall,
            blocked,
            responseTime,
            redirects: redirects.length > 1 ? redirects : null,
            screenshot: screenshotPath
          });
          
          if (redirectedToPaywall) {
            console.log(`  Result: 🔄 REDIRECTED TO PAYWALL in ${responseTime}ms`);
          } else if (blocked) {
            console.log(`  Result: ❌ BLOCKED in ${responseTime}ms`);
          } else {
            console.log(`  Result: ✅ ALLOWED in ${responseTime}ms`);
          }
          
        } catch (error) {
          console.error(`  Error testing ${url}:`, error.message);
          results.push({
            scenario: scenario.name,
            userAgent: scenario.userAgent,
            url,
            error: error.message
          });
        }
        
        // Wait before next test
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } finally {
      await browser.close();
    }
    
    console.log(''); // Add space between scenarios
  }
  
  // Save results
  const filename = `browser-test-results-${new Date().toISOString().replace(/:/g, '-')}.json`;
  fs.writeFileSync(filename, JSON.stringify(results, null, 2));
  console.log(`\n✅ Browser tests complete! Results saved to ${filename}`);
  
  // Generate HTML report
  generateHtmlReport(results, filename.replace('.json', '.html'));
  
  // Summary
  const redirected = results.filter(r => r.redirectedToPaywall).length;
  const blocked = results.filter(r => r.blocked && !r.redirectedToPaywall).length;
  const allowed = results.filter(r => !r.blocked && !r.redirectedToPaywall && !r.error).length;
  const errors = results.filter(r => r.error).length;
  
  console.log(`\n📊 Summary:`);
  console.log(`Total tests: ${results.length}`);
  console.log(`Redirected to paywall: ${redirected} (${Math.round(redirected/results.length*100)}%)`);
  console.log(`Blocked: ${blocked} (${Math.round(blocked/results.length*100)}%)`);
  console.log(`Allowed: ${allowed} (${Math.round(allowed/results.length*100)}%)`);
  console.log(`Errors: ${errors} (${Math.round(errors/results.length*100)}%)`);
}

// Generate HTML report for better visualization
function generateHtmlReport(results, filename) {
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Browser Bot Testing Results - ${new Date().toLocaleString()}</title>
    <style>
      body { font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.5; padding: 2rem; }
      table { border-collapse: collapse; width: 100%; margin-bottom: 2rem; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background-color: #f2f2f2; }
      tr:nth-child(even) { background-color: #f9f9f9; }
      .redirected { background-color: #e3f2fd; }
      .blocked { background-color: #ffdddd; }
      .allowed { background-color: #ddffdd; }
      .error { background-color: #ffeeee; }
      .status-badge { 
        padding: 2px 8px; 
        border-radius: 4px; 
        font-size: 12px; 
        font-weight: bold; 
        color: white; 
      }
      .status-success { background-color: #4CAF50; }
      .status-warning { background-color: #FF9800; }
      .status-info { background-color: #2196F3; }
      .status-error { background-color: #F44336; }
      h1, h2 { color: #333; }
      .summary { display: flex; justify-content: space-between; margin-bottom: 2rem; flex-wrap: wrap; }
      .summary-box { 
        padding: 1rem; 
        border-radius: 8px; 
        flex: 1; 
        margin-right: 1rem;
        margin-bottom: 1rem;
        min-width: 180px;
        text-align: center;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      }
      .summary-box h3 { margin-top: 0; }
      .summary-box.redirected { background-color: #e3f2fd; }
      .summary-box.blocked { background-color: #ffeeee; }
      .summary-box.allowed { background-color: #e8f5e9; }
      .summary-box.error { background-color: #fce4ec; }
      .summary-number { font-size: 2rem; font-weight: bold; margin: 0.5rem 0; }
      .screenshots { display: flex; flex-wrap: wrap; margin-top: 2rem; }
      .screenshot { 
        margin: 1rem;
        border: 1px solid #ddd;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        width: 300px;
      }
      .screenshot img { 
        width: 100%;
        height: auto;
      }
      .screenshot-title {
        padding: 0.5rem;
        background: #f5f5f5;
        font-weight: bold;
        font-size: 0.9rem;
      }
      .screenshot-result {
        padding: 0.5rem;
        display: flex;
        justify-content: space-between;
      }
    </style>
  </head>
  <body>
    <h1>Browser Bot Testing Results</h1>
    <p>Website: ${TARGET_WEBSITE}</p>
    <p>Test run: ${new Date().toLocaleString()}</p>
    
    <h2>Summary</h2>
    <div class="summary">
      <div class="summary-box redirected">
        <h3>Redirected to Paywall</h3>
        <div class="summary-number">${results.filter(r => r.redirectedToPaywall).length}</div>
        <div>${Math.round(results.filter(r => r.redirectedToPaywall).length/results.length*100)}%</div>
      </div>
      <div class="summary-box blocked">
        <h3>Blocked</h3>
        <div class="summary-number">${results.filter(r => r.blocked && !r.redirectedToPaywall).length}</div>
        <div>${Math.round(results.filter(r => r.blocked && !r.redirectedToPaywall).length/results.length*100)}%</div>
      </div>
      <div class="summary-box allowed">
        <h3>Allowed</h3>
        <div class="summary-number">${results.filter(r => !r.blocked && !r.redirectedToPaywall && !r.error).length}</div>
        <div>${Math.round(results.filter(r => !r.blocked && !r.redirectedToPaywall && !r.error).length/results.length*100)}%</div>
      </div>
      <div class="summary-box error">
        <h3>Errors</h3>
        <div class="summary-number">${results.filter(r => r.error).length}</div>
        <div>${Math.round(results.filter(r => r.error).length/results.length*100)}%</div>
      </div>
    </div>
    
    <h2>Detailed Results</h2>
    <table>
      <tr>
        <th>Scenario</th>
        <th>URL</th>
        <th>Status</th>
        <th>Result</th>
        <th>Response Time</th>
        <th>Final URL</th>
      </tr>
      ${results.map(r => `
        <tr class="${r.error ? 'error' : r.redirectedToPaywall ? 'redirected' : r.blocked ? 'blocked' : 'allowed'}">
          <td>${r.scenario || 'N/A'}</td>
          <td>${r.url || 'N/A'}</td>
          <td>${r.status || 'Error'}</td>
          <td>
            ${r.error ? 
              `<span class="status-badge status-error">ERROR</span>` : 
              r.redirectedToPaywall ?
                `<span class="status-badge status-info">PAYWALL</span>` :
                r.blocked ? 
                  `<span class="status-badge status-error">BLOCKED</span>` : 
                  `<span class="status-badge status-success">ALLOWED</span>`
            }
          </td>
          <td>${r.responseTime ? r.responseTime + 'ms' : 'N/A'}</td>
          <td>${r.finalUrl || r.error || 'N/A'}</td>
        </tr>
      `).join('')}
    </table>
    
    <h2>Screenshots</h2>
    <div class="screenshots">
      ${results.filter(r => r.screenshot).map(r => `
        <div class="screenshot">
          <div class="screenshot-title">${r.scenario} - ${r.url}</div>
          <img src="${r.screenshot.replace('./', '')}" alt="${r.scenario} - ${r.url}" />
          <div class="screenshot-result">
            <span>${r.redirectedToPaywall ? 'Redirected to Paywall' : r.blocked ? 'Blocked' : 'Allowed'}</span>
            <span>${r.responseTime}ms</span>
          </div>
        </div>
      `).join('')}
    </div>
  </body>
  </html>
  `;
  
  fs.writeFileSync(filename, html);
  console.log(`HTML report generated: ${filename}`);
}

// Run the tests
runTests().catch(console.error);
