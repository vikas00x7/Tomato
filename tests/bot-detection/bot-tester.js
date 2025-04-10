const fetch = require('node-fetch');
const fs = require('fs');

// Configuration - CHANGE THIS TO YOUR WEBSITE
const TARGET_WEBSITE = 'https://www.bunnylovesoaps.com';
const RESULTS_DIR = './results';

// Create results directory if it doesn't exist
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// Bot user agents to test
const botUserAgents = [
  'Googlebot/2.1 (+http://www.google.com/bot.html)',
  'Bingbot/2.0 (+http://www.bing.com/bingbot.htm)',
  'Baiduspider/2.0; +http://www.baidu.com/search/spider.html',
  'YandexBot/3.0; +http://yandex.com/bots',
  'DuckDuckBot/1.0; (+http://duckduckgo.com/duckduckbot.html)',
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  'Mozilla/5.0 (compatible; SemrushBot/3.0; +http://www.semrush.com/bot.html)',
  // Some malicious bot signatures
  'zgrab/0.x',
  'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)',
  'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
  // Standard browser for comparison
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
];

// URLs to test
const urls = [
  '/',
  '/about',
  '/menu',
  '/contact',
  '/blog'
];

// Run tests
async function runBotTests() {
  const results = [];
  
  console.log(`🤖 Starting bot tests against ${TARGET_WEBSITE}`);
  console.log(`${botUserAgents.length} bot types × ${urls.length} URLs = ${botUserAgents.length * urls.length} total tests`);
  console.log('----------------------------------------------\n');
  
  // Log to file as well
  let logContent = `Bot Tests for ${TARGET_WEBSITE}\n`;
  logContent += `${new Date().toISOString()}\n`;
  logContent += '----------------------------------------------\n\n';
  
  for (const agent of botUserAgents) {
    console.log(`🔍 Testing with user agent: ${agent.substring(0, 40)}...`);
    logContent += `Testing with user agent: ${agent}\n`;
    
    for (const url of urls) {
      try {
        const startTime = Date.now();
        console.log(`  Testing ${url}...`);
        logContent += `  Testing ${url}...\n`;
        
        // Set up fetch to follow redirects but track them
        const response = await fetch(`${TARGET_WEBSITE}${url}`, {
          headers: {
            'User-Agent': agent
          },
          redirect: 'manual' // Don't automatically follow redirects
        });
        
        const responseTime = Date.now() - startTime;
        const status = response.status;
        
        // Check for redirects (paywall)
        const redirectedToPaywall = (status === 302 || status === 301) && 
                                   response.headers.get('location')?.includes('paywall');
        
        // Get response text if not redirected
        let responseText = '';
        let blocked = false;
        let detectedAsBot = false;
        
        if (!redirectedToPaywall) {
          // If not redirected, get the content and check if it's blocked
          const textResponse = await fetch(`${TARGET_WEBSITE}${url}`, {
            headers: { 'User-Agent': agent }
          });
          responseText = await textResponse.text();
          
          // Check if the response contains indicators of being blocked
          blocked = textResponse.status === 403 || 
                    responseText.includes('blocked') || 
                    responseText.includes('detected as a bot') ||
                    responseText.includes('challenge');
          
          // Determine if it was detected as a bot (might be allowed or blocked)
          detectedAsBot = blocked || 
                         responseText.includes('bot') || 
                         responseText.includes('captcha');
        }
        
        // For redirects, we're being sent to the paywall instead of being blocked
        if (redirectedToPaywall) {
          blocked = false;
          detectedAsBot = true;
        }
        
        results.push({
          userAgent: agent,
          url,
          status,
          responseTime,
          blocked,
          redirectedToPaywall,
          detectedAsBot,
          timestamp: new Date().toISOString(),
          responsePreview: responseText.substring(0, 100) + (responseText.length > 100 ? '...' : ''),
          redirectLocation: redirectedToPaywall ? response.headers.get('location') : null
        });
        
        if (redirectedToPaywall) {
          console.log(`  Result: 🔄 REDIRECTED TO PAYWALL (${status}) in ${responseTime}ms`);
          logContent += `  Result: REDIRECTED TO PAYWALL (${status}) in ${responseTime}ms\n`;
        } else if (blocked) {
          console.log(`  Result: ❌ BLOCKED (${status}) in ${responseTime}ms`);
          logContent += `  Result: BLOCKED (${status}) in ${responseTime}ms\n`;
        } else if (detectedAsBot) {
          console.log(`  Result: ⚠️ DETECTED BUT ALLOWED (${status}) in ${responseTime}ms`);
          logContent += `  Result: DETECTED BUT ALLOWED (${status}) in ${responseTime}ms\n`;
        } else {
          console.log(`  Result: ✅ NOT DETECTED (${status}) in ${responseTime}ms`);
          logContent += `  Result: NOT DETECTED (${status}) in ${responseTime}ms\n`;
        }
        
        // Wait between requests to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`  Error testing ${agent} on ${url}:`, error.message);
        results.push({
          userAgent: agent,
          url,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    console.log(''); // Add space between agent results
    logContent += '\n';
  }
  
  // Save results to file
  const filename = `${RESULTS_DIR}/bot-test-results-${new Date().toISOString().replace(/:/g, '-')}.json`;
  fs.writeFileSync(filename, JSON.stringify(results, null, 2));
  console.log(`\n✅ Test complete! Results saved to ${filename}`);
  
  // Save log file
  fs.writeFileSync(`${RESULTS_DIR}/bot-test-log-${new Date().toISOString().replace(/:/g, '-')}.txt`, logContent);
  console.log(`\n✅ Test complete! Log saved to ${RESULTS_DIR}/bot-test-log-*.txt`);
  
  // Summary
  const redirected = results.filter(r => r.redirectedToPaywall).length;
  const blocked = results.filter(r => r.blocked).length;
  const detected = results.filter(r => r.detectedAsBot && !r.blocked && !r.redirectedToPaywall).length;
  const allowed = results.filter(r => !r.detectedAsBot && !r.blocked && !r.redirectedToPaywall && !r.error).length;
  const errors = results.filter(r => r.error).length;
  
  console.log(`\n📊 Summary:`);
  console.log(`Total tests: ${results.length}`);
  console.log(`Redirected to paywall: ${redirected} (${Math.round(redirected/results.length*100)}%)`);
  console.log(`Blocked: ${blocked} (${Math.round(blocked/results.length*100)}%)`);
  console.log(`Detected but allowed: ${detected} (${Math.round(detected/results.length*100)}%)`);
  console.log(`Not detected (allowed): ${allowed} (${Math.round(allowed/results.length*100)}%)`);
  console.log(`Errors: ${errors} (${Math.round(errors/results.length*100)}%)`);
  
  // Generate HTML report
  generateHtmlReport(results, `${RESULTS_DIR}/bot-test-results-${new Date().toISOString().replace(/:/g, '-')}.html`);
}

// Generate HTML report for better visualization
function generateHtmlReport(results, filename) {
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Bot Testing Results - ${new Date().toLocaleString()}</title>
    <style>
      body { font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.5; padding: 2rem; }
      table { border-collapse: collapse; width: 100%; margin-bottom: 2rem; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background-color: #f2f2f2; }
      tr:nth-child(even) { background-color: #f9f9f9; }
      .redirected { background-color: #e3f2fd; }
      .blocked { background-color: #ffdddd; }
      .detected { background-color: #ffffcc; }
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
      .summary-box.detected { background-color: #fff8e1; }
      .summary-box.allowed { background-color: #e8f5e9; }
      .summary-box.error { background-color: #fce4ec; }
      .summary-number { font-size: 2rem; font-weight: bold; margin: 0.5rem 0; }
    </style>
  </head>
  <body>
    <h1>Bot Testing Results</h1>
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
        <div class="summary-number">${results.filter(r => r.blocked).length}</div>
        <div>${Math.round(results.filter(r => r.blocked).length/results.length*100)}%</div>
      </div>
      <div class="summary-box detected">
        <h3>Detected but Allowed</h3>
        <div class="summary-number">${results.filter(r => r.detectedAsBot && !r.blocked && !r.redirectedToPaywall).length}</div>
        <div>${Math.round(results.filter(r => r.detectedAsBot && !r.blocked && !r.redirectedToPaywall).length/results.length*100)}%</div>
      </div>
      <div class="summary-box allowed">
        <h3>Not Detected</h3>
        <div class="summary-number">${results.filter(r => !r.detectedAsBot && !r.blocked && !r.redirectedToPaywall && !r.error).length}</div>
        <div>${Math.round(results.filter(r => !r.detectedAsBot && !r.blocked && !r.redirectedToPaywall && !r.error).length/results.length*100)}%</div>
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
        <th>User Agent</th>
        <th>URL</th>
        <th>Status</th>
        <th>Result</th>
        <th>Response Time</th>
        <th>Details</th>
      </tr>
      ${results.map(r => `
        <tr class="${r.error ? 'error' : r.redirectedToPaywall ? 'redirected' : r.blocked ? 'blocked' : r.detectedAsBot ? 'detected' : 'allowed'}">
          <td>${r.userAgent ? r.userAgent.substring(0, 50) + '...' : 'N/A'}</td>
          <td>${r.url || 'N/A'}</td>
          <td>${r.status || 'Error'}</td>
          <td>
            ${r.error ? 
              `<span class="status-badge status-error">ERROR</span>` : 
              r.redirectedToPaywall ?
                `<span class="status-badge status-info">PAYWALL</span>` :
                r.blocked ? 
                  `<span class="status-badge status-error">BLOCKED</span>` : 
                  r.detectedAsBot ? 
                    `<span class="status-badge status-warning">DETECTED</span>` : 
                    `<span class="status-badge status-success">ALLOWED</span>`
            }
          </td>
          <td>${r.responseTime ? r.responseTime + 'ms' : 'N/A'}</td>
          <td>
            ${r.error ? r.error : 
              r.redirectedToPaywall ? `Redirected to: ${r.redirectLocation}` :
              r.responsePreview || 'N/A'}
          </td>
        </tr>
      `).join('')}
    </table>
  </body>
  </html>
  `;
  
  fs.writeFileSync(filename, html);
  console.log(`HTML report generated: ${filename}`);
}

runBotTests();
