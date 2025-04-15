/**
 * AI Bot Simulator
 * Simulates various AI bots against a target website to test detection
 */

const puppeteer = require('puppeteer');
const playwright = require('playwright');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const TARGET_WEBSITE = 'https://www.bunnylovesoaps.com';
const TEST_PATHS = ['/', '/about', '/contact', '/products'];
const RESULTS_DIR = './results';

// Create results directory if it doesn't exist
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR);
}

// AI Bot User Agent Strings
const AI_BOT_USER_AGENTS = {
  'GPTBot': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.0; +https://openai.com/gptbot)',
  'Perplexity': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Perplexity/1.0',
  'Claude': 'Mozilla/5.0 (compatible; Claude/1.0; https://anthropic.com/claude-bot)',
  'Gemini': 'Mozilla/5.0 (compatible; Google-Gemini/1.0; +https://developers.google.com/gemini)',
  'Cohere': 'Mozilla/5.0 (compatible; Cohere-AI/1.0; research-bot)',
  'Bing AI': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 Edg/115.0.0.0 SearchBot/1.0',
  'BrowserGPT': 'Mozilla/5.0 (compatible; BrowserGPT/1.0; +https://browsergpt.app/bot)'
};

// Helper to log results
function logResult(botType, path, status, redirectedUrl, detectionMethod) {
  console.log(`${botType.padEnd(15)}\t${path.padEnd(12)}\t${status.padEnd(15)}\t${detectionMethod || 'N/A'}`);
  return {
    timestamp: new Date().toISOString(),
    botType,
    path,
    status,
    redirectedUrl,
    detectionMethod
  };
}

// Save screenshot if a directory is provided
async function saveScreenshot(page, botType, path, directory) {
  if (!directory) return;
  
  const safePath = path.replace(/\//g, '_');
  const screenshotPath = `${directory}/${botType}_${safePath}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved: ${screenshotPath}`);
}

async function simulateAIBots() {
  console.log('Starting AI Bot Simulation...');
  console.log('Bot Type\t\tPath\t\tResult\t\tDetection Method');
  console.log('-'.repeat(80));
  
  const results = [];
  const screenshotDir = path.join(RESULTS_DIR, 'screenshots');
  
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir);
  }

  // Test each AI bot type
  for (const [botType, userAgent] of Object.entries(AI_BOT_USER_AGENTS)) {
    console.log(`\nTesting ${botType} bot...`);
    
    // 1. Direct fetch requests with AI bot user agent
    for (const testPath of TEST_PATHS) {
      try {
        const url = `${TARGET_WEBSITE}${testPath}`;
        const response = await fetch(url, {
          headers: {
            'User-Agent': userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          },
          redirect: 'manual' // Don't follow redirects automatically
        });
        
        const status = response.status;
        const redirected = status >= 300 && status < 400;
        const redirectUrl = redirected ? response.headers.get('location') : null;
        
        results.push(logResult(
          botType, 
          testPath, 
          redirected ? 'REDIRECTED' : 'ALLOWED',
          redirectUrl,
          redirected ? 'User-Agent Detection' : null
        ));
      } catch (error) {
        console.error(`Error with ${botType} on ${testPath}:`, error.message);
        results.push(logResult(botType, testPath, 'ERROR', null, error.message));
      }
    }
    
    // 2. Headless browser with AI bot user agent
    try {
      const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setUserAgent(userAgent);
      
      // Set referrer to simulate coming from an AI service
      let referrer = '';
      if (botType === 'GPTBot') referrer = 'https://chat.openai.com/';
      else if (botType === 'Claude') referrer = 'https://claude.ai/';
      else if (botType === 'Perplexity') referrer = 'https://www.perplexity.ai/';
      else if (botType === 'Gemini') referrer = 'https://gemini.google.com/';
      
      if (referrer) {
        await page.setExtraHTTPHeaders({
          'Referer': referrer
        });
      }
      
      for (const testPath of TEST_PATHS) {
        try {
          const url = `${TARGET_WEBSITE}${testPath}`;
          const response = await page.goto(url, { waitUntil: 'networkidle2' });
          
          const finalUrl = page.url();
          const redirected = finalUrl !== url;
          const content = await page.content();
          
          // Check if page contains paywall or block indications
          const containsPaywall = content.toLowerCase().includes('paywall') || 
                                 content.toLowerCase().includes('subscribe') ||
                                 content.toLowerCase().includes('bot detected');
          
          // Save screenshot for visual verification
          await saveScreenshot(page, botType, testPath, screenshotDir);
          
          const status = redirected ? 'REDIRECTED' : 
                        containsPaywall ? 'BLOCKED/PAYWALL' : 'ALLOWED';
          
          results.push(logResult(
            `${botType} (Browser)`, 
            testPath, 
            status,
            redirected ? finalUrl : null,
            redirected ? 'Browser Redirect' : 
            containsPaywall ? 'Content Detection' : null
          ));
        } catch (error) {
          console.error(`Error with ${botType} browser on ${testPath}:`, error.message);
          results.push(logResult(`${botType} (Browser)`, testPath, 'ERROR', null, error.message));
        }
      }
      
      await browser.close();
    } catch (error) {
      console.error(`Failed to launch browser for ${botType}:`, error.message);
    }
  }
  
  // 3. Test each AI bot with session behavior (multiple pages in sequence)
  console.log("\nTesting AI bot session behaviors...");
  
  try {
    for (const [botType, userAgent] of Object.entries(AI_BOT_USER_AGENTS)) {
      const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setUserAgent(userAgent);
      
      // Simulate browsing behavior with timing patterns
      console.log(`\nSimulating ${botType} session behavior...`);
      
      // Visit sequence of pages with AI-like timing
      let detected = false;
      let detectionPath = null;
      
      for (let i = 0; i < 3; i++) { // Visit each path multiple times
        for (const testPath of TEST_PATHS) {
          try {
            const url = `${TARGET_WEBSITE}${testPath}`;
            const response = await page.goto(url, { waitUntil: 'networkidle2' });
            
            const finalUrl = page.url();
            const redirected = finalUrl !== url;
            const content = await page.content();
            
            if (redirected || content.toLowerCase().includes('bot') || 
                content.toLowerCase().includes('paywall')) {
              detected = true;
              detectionPath = testPath;
              
              // Save screenshot at detection point
              await saveScreenshot(page, `${botType}_DETECTED`, testPath, screenshotDir);
              break;
            }
            
            // Add consistent timing (AI bots often have machine-like timing)
            await page.waitForTimeout(500); // Exactly 500ms between pages
          } catch (error) {
            console.error(`Error in session for ${botType}:`, error.message);
          }
        }
        
        if (detected) break;
      }
      
      results.push(logResult(
        `${botType} (Session)`, 
        detected ? detectionPath : 'FULL SESSION', 
        detected ? 'DETECTED' : 'NOT DETECTED',
        null,
        detected ? 'Behavioral Pattern' : null
      ));
      
      await browser.close();
    }
  } catch (error) {
    console.error("Error in session behavior testing:", error);
  }
  
  // Generate report
  generateReport(results);
  
  console.log('\nAI Bot simulation completed!');
  console.log(`Results and screenshots saved to ${RESULTS_DIR}`);
}

function generateReport(results) {
  const reportPath = path.join(RESULTS_DIR, `ai-bot-report-${new Date().toISOString().replace(/:/g, '-')}.html`);
  
  // Count statistics
  const stats = {
    total: results.length,
    detected: results.filter(r => r.status !== 'ALLOWED' && r.status !== 'ERROR').length,
    allowed: results.filter(r => r.status === 'ALLOWED').length,
    error: results.filter(r => r.status === 'ERROR').length,
    byBotType: {}
  };
  
  // Calculate detection rates by bot type
  results.forEach(result => {
    const botBase = result.botType.split(' ')[0]; // Get base name without (Browser) or (Session)
    
    if (!stats.byBotType[botBase]) {
      stats.byBotType[botBase] = {
        total: 0,
        detected: 0
      };
    }
    
    stats.byBotType[botBase].total++;
    if (result.status !== 'ALLOWED' && result.status !== 'ERROR') {
      stats.byBotType[botBase].detected++;
    }
  });
  
  // HTML template with embedded chart
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>AI Bot Detection Report</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; }
      h1, h2 { color: #333; }
      table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background-color: #f2f2f2; }
      tr:nth-child(even) { background-color: #f9f9f9; }
      .stats { display: flex; justify-content: space-between; margin-bottom: 20px; }
      .stat-box { background-color: #f2f2f2; padding: 15px; border-radius: 5px; flex: 1; margin: 0 10px; text-align: center; }
      .stat-value { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
      .chart-container { display: flex; height: 300px; margin-bottom: 30px; }
      .chart-bars, .chart-bars2 { flex: 1; position: relative; margin-right: 20px; }
      .bar-group { display: flex; height: 100%; align-items: flex-end; }
      .bar { margin: 0 3px; position: relative; }
      .bar-value { position: absolute; top: -20px; left: 0; right: 0; text-align: center; }
      .bar-label { position: absolute; bottom: -25px; left: 0; right: 0; text-align: center; font-size: 12px; }
      .bar-detection { background-color: #ff6361; }
      .bar-total { background-color: #58508d; }
      .timestamp { color: #666; font-style: italic; margin-bottom: 20px; }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  </head>
  <body>
    <h1>AI Bot Detection Report</h1>
    <p class="timestamp">Generated: ${new Date().toLocaleString()}</p>
    
    <div class="stats">
      <div class="stat-box">
        <div class="stat-value">${stats.total}</div>
        <div>Total Requests</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${stats.detected}</div>
        <div>Detected</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${Math.round(stats.detected / stats.total * 100)}%</div>
        <div>Detection Rate</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${stats.allowed}</div>
        <div>Allowed</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${stats.error}</div>
        <div>Errors</div>
      </div>
    </div>
    
    <h2>Detection by Bot Type</h2>
    <div class="chart-container">
      <canvas id="botTypeChart"></canvas>
    </div>
    
    <h2>Detailed Results</h2>
    <table>
      <tr>
        <th>Bot Type</th>
        <th>Path</th>
        <th>Status</th>
        <th>Redirected URL</th>
        <th>Detection Method</th>
        <th>Timestamp</th>
      </tr>
      ${results.map(r => `
        <tr>
          <td>${r.botType}</td>
          <td>${r.path}</td>
          <td>${r.status}</td>
          <td>${r.redirectedUrl || 'N/A'}</td>
          <td>${r.detectionMethod || 'N/A'}</td>
          <td>${r.timestamp}</td>
        </tr>
      `).join('')}
    </table>
    
    <script>
      // Create chart for bot type detection
      const ctx = document.getElementById('botTypeChart').getContext('2d');
      const botTypeChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: [${Object.keys(stats.byBotType).map(bot => `'${bot}'`).join(', ')}],
          datasets: [
            {
              label: 'Detected',
              data: [${Object.values(stats.byBotType).map(stat => stat.detected).join(', ')}],
              backgroundColor: '#ff6361'
            },
            {
              label: 'Total',
              data: [${Object.values(stats.byBotType).map(stat => stat.total).join(', ')}],
              backgroundColor: '#58508d'
            }
          ]
        },
        options: {
          plugins: {
            title: {
              display: true,
              text: 'Bot Detection by Type'
            },
          },
          responsive: true,
          scales: {
            x: {
              stacked: false,
            },
            y: {
              stacked: false
            }
          }
        }
      });
    </script>
  </body>
  </html>
  `;
  
  fs.writeFileSync(reportPath, html);
  console.log(`Report generated: ${reportPath}`);
}

// Run the simulation
simulateAIBots().catch(console.error);
