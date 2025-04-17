/**
 * Mass Bot Simulation Script
 * Simulates 500+ bots of various types visiting BunnyLoveSoaps website
 */

const axios = require('axios');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { setTimeout } = require('timers/promises');
const UserAgent = require('user-agents');

// Configuration
const TARGET_WEBSITE = 'http://127.0.0.1:5000';
const TARGET_PATHS = ['/', '/menu', '/about', '/contact', '/blog', '/blog/1', '/blog/2', '/blog/3', '/blog/4', '/blog/5', '/blog/6'];
const RESULTS_DIR = './results/mass-sim';
const LOG_FILE = path.join(RESULTS_DIR, `bot-simulation-${new Date().toISOString().replace(/:/g, '-')}.json`);
const TOTAL_SIMULATIONS = 30;
const MAX_CONCURRENT = 10;
const SIM_DELAY_MIN = 50;  // minimum delay between requests in ms
const SIM_DELAY_MAX = 200; // maximum delay between requests in ms

// Ensure results directory exists
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// Initialize log file
fs.writeFileSync(LOG_FILE, JSON.stringify({ 
  startTime: new Date().toISOString(),
  configuration: {
    targetWebsite: TARGET_WEBSITE,
    targetPaths: TARGET_PATHS,
    totalSimulations: TOTAL_SIMULATIONS
  },
  results: []
}, null, 2));

// Bot Categories
const BOT_CATEGORIES = {
  // Search Engine Bots
  SEARCH_ENGINE: {
    weight: 20,
    userAgents: [
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)',
      'Mozilla/5.0 (compatible; Yahoo! Slurp; http://help.yahoo.com/help/us/ysearch/slurp)',
      'Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)',
      'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
      'Mozilla/5.0 (compatible; DuckDuckGo-Favicons-Bot/1.0; +http://duckduckgo.com)',
      'Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)'
    ],
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive'
    },
    behavior: 'standard'
  },
  
  // AI Assistant Bots
  AI_ASSISTANT: {
    weight: 25,
    userAgents: [
      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.0; +https://openai.com/gptbot)',
      'Mozilla/5.0 (compatible; Claude/1.0; https://anthropic.com/claude-bot)',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Perplexity/1.0',
      'Mozilla/5.0 (compatible; Google-Gemini/1.0; +https://developers.google.com/gemini)',
      'Mozilla/5.0 (compatible; Cohere-AI/1.0; research-bot)',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 Edg/115.0.0.0 SearchBot/1.0',
      'Mozilla/5.0 (compatible; BrowserGPT/1.0; +https://browsergpt.app/bot)',
      'Mozilla/5.0 (compatible; Llama70b-Crawler/1.0; https://meta.com/llama-crawler)'
    ],
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Cache-Control': 'max-age=0'
    },
    behavior: 'ai'
  },
  
  // Web Scrapers
  SCRAPER: {
    weight: 15,
    userAgents: [
      'Mozilla/5.0 (compatible; Scrapy/2.8.0; +https://scrapy.org)',
      'Mozilla/5.0 (compatible; HeadlessChrome/112.0.5615.49)',
      'Mozilla/5.0 (compatible; Octoparse/1.0.0; +https://docs.octoparse.com/)',
      'Mozilla/5.0 (compatible; Apify; +https://apify.com)',
      'Mozilla/5.0 (compatible; ZoominfoBot; +https://www.zoominfo.com/about-zoominfo/privacy-policy)',
      'Mozilla/5.0 (compatible; DataForSeoBot/1.0; +https://dataforseo.com/dataforseo-bot)',
      'Mozilla/5.0 (compatible; BrightData/1.0; +https://brightdata.com/web-data-integration)'
    ],
    headers: {
      'Accept': '*/*',
      'Connection': 'keep-alive'
    },
    behavior: 'aggressive'
  },
  
  // Security/Monitoring Bots
  SECURITY: {
    weight: 10,
    userAgents: [
      'Mozilla/5.0 (compatible; UptimeRobot/2.0; http://www.uptimerobot.com/)',
      'Mozilla/5.0 (compatible; Pingdom.com_bot/1.0; +http://www.pingdom.com/)',
      'Mozilla/5.0 (compatible; SecureBrain; +https://www.securebrain.co.jp/)',
      'Mozilla/5.0 (compatible; StatusCake; +https://www.statuscake.com)',
      'Mozilla/5.0 (compatible; Uptimebot/1.0; +http://uptime.com/uptimebot)',
      'Mozilla/5.0 (compatible; SiteMonitor/1.0; +https://www.site-monitoring.com)'
    ],
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    },
    behavior: 'monitoring'
  },
  
  // Generic/Unknown Bots
  GENERIC_BOT: {
    weight: 15,
    userAgents: [
      'Mozilla/5.0 (compatible; Botify; +https://www.botify.com/bot)',
      'Mozilla/5.0 (compatible; SimplePie/1.5)',
      'Mozilla/5.0 (compatible; Gluten Free Crawler/1.0)',
      'Mozilla/5.0 (compatible; FindLinks/1.1.6-beta6; +http://wortschatz.uni-leipzig.de/findlinks/)',
      'Mozilla/5.0 (compatible; LinkChecker/1.0; +http://linkchecker.example.com)',
      'Mozilla/5.0 (compatible; WebSiteInspector)',
      'Mozilla/5.0 (compatible; BLEXBot/1.0; +http://webmeup-crawler.com/)'
    ],
    headers: {
      'Accept': '*/*'
    },
    behavior: 'standard'
  },
  
  // Social Media Bots
  SOCIAL_MEDIA: {
    weight: 5,
    userAgents: [
      'Mozilla/5.0 (compatible; Twitterbot/1.0; +https://dev.twitter.com/cards/)',
      'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      'Mozilla/5.0 (compatible; PinterestBot; +https://www.pinterest.com/bot.html)',
      'Mozilla/5.0 (compatible; LinkedInBot/1.0; +https://www.linkedin.com/bot)',
      'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)'
    ],
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    },
    behavior: 'standard'
  },
  
  // Human-like Bot Browsing (most sophisticated)
  HUMAN_LIKE: {
    weight: 10,
    userAgents: [
      // These are modern browser user agents that bots might use to appear human
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0'
    ],
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Cache-Control': 'max-age=0',
      'Sec-Ch-Ua': '"Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    },
    behavior: 'human'
  }
};

// Bot behavior patterns
const BOT_BEHAVIORS = {
  // Standard bot behavior - predictable path crawling
  standard: async (browser, pages, botType, userAgent) => {
    const results = [];
    
    try {
      // Basic HTTP request based approach
      for (const path of pages) {
        const url = `${TARGET_WEBSITE}${path}`;
        const botCategory = BOT_CATEGORIES[botType];
        
        try {
          // Add a random delay between requests
          await setTimeout(Math.floor(Math.random() * (SIM_DELAY_MAX - SIM_DELAY_MIN) + SIM_DELAY_MIN));
          
          const response = await axios.get(url, {
            headers: {
              'User-Agent': userAgent,
              ...botCategory.headers
            },
            maxRedirects: 3,
            validateStatus: () => true // Accept any status code
          });
          
          results.push({
            path,
            status: response.status,
            redirected: response.request.res.responseUrl !== url,
            finalUrl: response.request.res.responseUrl || url,
            success: response.status >= 200 && response.status < 300
          });
        } catch (error) {
          results.push({
            path,
            status: error.response?.status || 'ERROR',
            error: error.message,
            success: false
          });
        }
      }
    } catch (error) {
      console.error(`Error in standard behavior for ${botType}:`, error);
    }
    
    return results;
  },
  
  // Aggressive behavior - rapid crawling
  aggressive: async (browser, pages, botType, userAgent) => {
    const results = [];
    
    try {
      // Make requests in parallel with minimal delay
      const promises = pages.map(async (path) => {
        const url = `${TARGET_WEBSITE}${path}`;
        const botCategory = BOT_CATEGORIES[botType];
        
        try {
          const response = await axios.get(url, {
            headers: {
              'User-Agent': userAgent,
              ...botCategory.headers
            },
            maxRedirects: 2,
            validateStatus: () => true
          });
          
          return {
            path,
            status: response.status,
            redirected: response.request.res.responseUrl !== url,
            finalUrl: response.request.res.responseUrl || url,
            success: response.status >= 200 && response.status < 300
          };
        } catch (error) {
          return {
            path,
            status: error.response?.status || 'ERROR',
            error: error.message,
            success: false
          };
        }
      });
      
      results.push(...(await Promise.all(promises)));
    } catch (error) {
      console.error(`Error in aggressive behavior for ${botType}:`, error);
    }
    
    return results;
  },
  
  // Monitoring behavior - periodic checks
  monitoring: async (browser, pages, botType, userAgent) => {
    const results = [];
    
    try {
      // Only check a subset of pages (typically home page plus one more)
      const monitoringPaths = [pages[0], pages[Math.floor(Math.random() * (pages.length - 1)) + 1]];
      
      for (const path of monitoringPaths) {
        const url = `${TARGET_WEBSITE}${path}`;
        const botCategory = BOT_CATEGORIES[botType];
        
        try {
          const response = await axios.get(url, {
            headers: {
              'User-Agent': userAgent,
              ...botCategory.headers
            },
            timeout: 5000,
            validateStatus: () => true
          });
          
          results.push({
            path,
            status: response.status,
            redirected: response.request.res.responseUrl !== url,
            finalUrl: response.request.res.responseUrl || url,
            success: response.status >= 200 && response.status < 300
          });
        } catch (error) {
          results.push({
            path,
            status: error.response?.status || 'ERROR',
            error: error.message,
            success: false
          });
        }
      }
    } catch (error) {
      console.error(`Error in monitoring behavior for ${botType}:`, error);
    }
    
    return results;
  },
  
  // AI behavior - more sophisticated browsing with browser
  ai: async (browser, pages, botType, userAgent) => {
    const results = [];
    
    try {
      // Always use puppeteer for AI bots to better simulate browser environment
      if (!browser) {
        browser = await puppeteer.launch({ 
          headless: 'new',
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
      }
      
      const page = await browser.newPage();
      await page.setUserAgent(userAgent);
      
      const botCategory = BOT_CATEGORIES[botType];
      
      // Set extra headers to simulate AI assistant browsing
      await page.setExtraHTTPHeaders({
        ...botCategory.headers,
        'Referer': botType.includes('GPT') ? 'https://chat.openai.com/' : 
                  botType.includes('Claude') ? 'https://claude.ai/' : 
                  botType.includes('Gemini') ? 'https://gemini.google.com/' : 
                  'https://www.perplexity.ai/'
      });
      
      for (const path of pages) {
        try {
          const url = `${TARGET_WEBSITE}${path}`;
          
          // AI-like timing delay (200-500ms)
          await setTimeout(Math.floor(Math.random() * 300) + 200);
          
          const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
          await page.waitForTimeout(100);
          
          const finalUrl = page.url();
          const content = await page.content();
          
          // Check if page contains bot detection markers
          const detectionMarkers = ['bot detected', 'access denied', 'captcha', 'paywall'];
          const detected = detectionMarkers.some(marker => content.toLowerCase().includes(marker));
          
          results.push({
            path,
            status: response.status(),
            redirected: finalUrl !== url,
            finalUrl,
            detected,
            success: response.status() >= 200 && response.status() < 300 && !detected
          });
        } catch (error) {
          results.push({
            path,
            error: error.message,
            success: false
          });
        }
      }
      
      await page.close();
    } catch (error) {
      console.error(`Error in AI behavior for ${botType}:`, error);
    }
    
    return results;
  },
  
  // Human-like behavior - very sophisticated with browser interaction
  human: async (browser, pages, botType, userAgent) => {
    const results = [];
    
    try {
      if (!browser) {
        browser = await puppeteer.launch({ 
          headless: 'new',
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
      }
      
      const page = await browser.newPage();
      
      // Set a modern browser user agent
      await page.setUserAgent(userAgent);
      
      // Set common headers that real browsers send
      const botCategory = BOT_CATEGORIES[botType];
      await page.setExtraHTTPHeaders(botCategory.headers);
      
      // Set viewport like a real desktop
      await page.setViewport({ width: 1366, height: 768 });
      
      // Enable JavaScript, just like a real browser
      await page.setJavaScriptEnabled(true);
      
      // First visit the homepage
      try {
        await page.goto(`${TARGET_WEBSITE}/`, { waitUntil: 'networkidle2', timeout: 15000 });
        
        // Human-like delay (1-3 seconds)
        await page.waitForTimeout(Math.floor(Math.random() * 2000) + 1000);
        
        results.push({
          path: '/',
          status: 200,
          success: true
        });
        
        // Now visit a few of the target pages, but not all (like a real user)
        const pagesToVisit = pages.filter(p => p !== '/').sort(() => 0.5 - Math.random()).slice(0, 3);
        
        for (const path of pagesToVisit) {
          try {
            // Click links when possible instead of direct navigation
            const links = await page.$$('a');
            let clickedLink = false;
            
            for (const link of links) {
              const href = await page.evaluate(el => el.getAttribute('href'), link);
              if (href && href.includes(path)) {
                // Human-like delay before clicking (1-2 seconds)
                await page.waitForTimeout(Math.floor(Math.random() * 1000) + 1000);
                
                // Scroll down a bit like a human would
                await page.evaluate(() => {
                  window.scrollBy(0, Math.floor(Math.random() * 300) + 100);
                });
                
                await Promise.all([
                  page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }),
                  link.click()
                ]);
                
                clickedLink = true;
                break;
              }
            }
            
            // If no matching link found, navigate directly
            if (!clickedLink) {
              await page.goto(`${TARGET_WEBSITE}${path}`, { waitUntil: 'networkidle2', timeout: 10000 });
            }
            
            // Human-like delay on page (2-5 seconds)
            await page.waitForTimeout(Math.floor(Math.random() * 3000) + 2000);
            
            // Sometimes scroll down
            if (Math.random() > 0.5) {
              await page.evaluate(() => {
                window.scrollBy(0, Math.floor(Math.random() * 500) + 200);
              });
              await page.waitForTimeout(Math.floor(Math.random() * 1000) + 500);
            }
            
            results.push({
              path,
              status: 200,
              success: true
            });
          } catch (error) {
            results.push({
              path,
              error: error.message,
              success: false
            });
          }
        }
      } catch (error) {
        results.push({
          path: '/',
          error: error.message,
          success: false
        });
      }
      
      await page.close();
    } catch (error) {
      console.error(`Error in human-like behavior for ${botType}:`, error);
    }
    
    return results;
  }
};

// Helper to select a random bot type based on weights
function selectRandomBotType() {
  const weights = Object.entries(BOT_CATEGORIES).map(([type, config]) => ({ type, weight: config.weight }));
  const totalWeight = weights.reduce((sum, { weight }) => sum + weight, 0);
  
  let random = Math.random() * totalWeight;
  
  for (const { type, weight } of weights) {
    random -= weight;
    if (random <= 0) {
      return type;
    }
  }
  
  // Fallback
  return Object.keys(BOT_CATEGORIES)[0];
}

// Helper to select a random user agent for a bot type
function selectRandomUserAgent(botType) {
  const userAgents = BOT_CATEGORIES[botType].userAgents;
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// Main simulation function
async function runBotSimulation(numBots) {
  console.log(`Starting mass bot simulation with ${numBots} bots against ${TARGET_WEBSITE}...`);
  console.log(`Target paths: ${TARGET_PATHS.join(', ')}`);
  console.log('Results will be logged to:', LOG_FILE);
  
  // Track simulation stats
  const stats = {
    totalBots: numBots,
    startTime: new Date(),
    botTypeDistribution: {},
    behaviorDistribution: {},
    requestResults: {
      success: 0,
      redirected: 0,
      blocked: 0,
      error: 0
    }
  };

  // Keep track of all simulation results
  const allResults = [];
  
  // Create a shared browser instance for headless browser simulations
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  } catch (error) {
    console.error('Failed to launch browser:', error);
    console.log('Continuing with HTTP-only simulations...');
  }
  
  // Run simulations in controlled batches to avoid overwhelming the target
  for (let i = 0; i < numBots; i += MAX_CONCURRENT) {
    const batch = [];
    const batchSize = Math.min(MAX_CONCURRENT, numBots - i);
    
    console.log(`Starting batch ${Math.floor(i/MAX_CONCURRENT) + 1} (${i+1}-${i+batchSize} of ${numBots})...`);
    
    for (let j = 0; j < batchSize; j++) {
      // Select bot type, user agent, and behavior
      const botType = selectRandomBotType();
      const userAgent = selectRandomUserAgent(botType);
      const behavior = BOT_CATEGORIES[botType].behavior;
      
      // Track distribution
      stats.botTypeDistribution[botType] = (stats.botTypeDistribution[botType] || 0) + 1;
      stats.behaviorDistribution[behavior] = (stats.behaviorDistribution[behavior] || 0) + 1;
      
      // Create a unique ID for this simulation
      const simulationId = uuidv4().substring(0, 8);
      
      // Create a simulation job
      batch.push(async () => {
        console.log(`Bot #${i+j+1} (${simulationId}): Type=${botType}, Behavior=${behavior}`);
        
        try {
          // Run the appropriate behavior simulation
          const results = await BOT_BEHAVIORS[behavior](browser, TARGET_PATHS, botType, userAgent);
          
          // Analyze results for statistics
          for (const result of results) {
            if (result.success) {
              stats.requestResults.success++;
            } else if (result.redirected) {
              stats.requestResults.redirected++;
            } else if (result.error) {
              stats.requestResults.error++;
            } else {
              stats.requestResults.blocked++;
            }
          }
          
          // Add to results
          const simulationResult = {
            id: simulationId,
            timestamp: new Date().toISOString(),
            botType,
            userAgent,
            behavior,
            results
          };
          
          allResults.push(simulationResult);
          
          // Periodically save results to file
          if (allResults.length % 20 === 0) {
            const resultsToSave = {
              stats: {
                ...stats,
                endTime: new Date(),
                runtime: (new Date() - stats.startTime) / 1000,
                progress: `${allResults.length}/${numBots} (${Math.round(allResults.length/numBots*100)}%)`
              },
              results: allResults
            };
            
            fs.writeFileSync(LOG_FILE, JSON.stringify(resultsToSave, null, 2));
          }
          
          return simulationResult;
        } catch (error) {
          console.error(`Error in simulation ${simulationId}:`, error);
          return {
            id: simulationId,
            timestamp: new Date().toISOString(),
            botType,
            userAgent,
            behavior,
            error: error.message
          };
        }
      });
    }
    
    // Run the batch in parallel
    await Promise.all(batch.map(job => job()));
    
    // Add a small delay between batches to avoid overwhelming the target
    if (i + batchSize < numBots) {
      console.log(`Batch complete. Pausing before next batch...`);
      await setTimeout(1000);
    }
  }
  
  // Close browser if we created one
  if (browser) {
    await browser.close();
  }
  
  // Update final stats
  stats.endTime = new Date();
  stats.runtime = (stats.endTime - stats.startTime) / 1000;
  
  // Write final results to file
  const finalResults = {
    stats,
    results: allResults
  };
  
  fs.writeFileSync(LOG_FILE, JSON.stringify(finalResults, null, 2));
  
  console.log('Bot simulation complete!');
  console.log(`Total time: ${stats.runtime} seconds`);
  console.log(`Total bots: ${numBots}`);
  console.log(`Results saved to: ${LOG_FILE}`);
  
  return finalResults;
}

// Create a summary report
function generateSummaryReport(results) {
  const reportFile = path.join(RESULTS_DIR, `summary-${new Date().toISOString().replace(/:/g, '-')}.html`);
  
  const botTypeLabels = Object.keys(results.stats.botTypeDistribution);
  const botTypeCounts = botTypeLabels.map(label => results.stats.botTypeDistribution[label]);
  
  const behaviorLabels = Object.keys(results.stats.behaviorDistribution);
  const behaviorCounts = behaviorLabels.map(label => results.stats.behaviorDistribution[label]);
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Bot Simulation Summary</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1, h2 { color: #333; }
        .stat-box { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 15px; }
        .chart-container { width: 600px; height: 400px; margin: 20px 0; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        tr:nth-child(even) { background-color: #f9f9f9; }
      </style>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    </head>
    <body>
      <h1>Bot Simulation Summary</h1>
      <p>Generated: ${new Date().toLocaleString()}</p>
      
      <div class="stat-box">
        <h2>Simulation Stats</h2>
        <p><strong>Total Bots:</strong> ${results.stats.totalBots}</p>
        <p><strong>Runtime:</strong> ${results.stats.runtime} seconds</p>
        <p><strong>Start Time:</strong> ${new Date(results.stats.startTime).toLocaleString()}</p>
        <p><strong>End Time:</strong> ${new Date(results.stats.endTime).toLocaleString()}</p>
      </div>
      
      <div class="stat-box">
        <h2>Request Results</h2>
        <p><strong>Success:</strong> ${results.stats.requestResults.success}</p>
        <p><strong>Redirected:</strong> ${results.stats.requestResults.redirected}</p>
        <p><strong>Blocked:</strong> ${results.stats.requestResults.blocked}</p>
        <p><strong>Error:</strong> ${results.stats.requestResults.error}</p>
      </div>
      
      <h2>Bot Type Distribution</h2>
      <div class="chart-container">
        <canvas id="botTypeChart"></canvas>
      </div>
      
      <h2>Behavior Distribution</h2>
      <div class="chart-container">
        <canvas id="behaviorChart"></canvas>
      </div>
      
      <script>
        // Bot Type Chart
        new Chart(document.getElementById('botTypeChart').getContext('2d'), {
          type: 'bar',
          data: {
            labels: ${JSON.stringify(botTypeLabels)},
            datasets: [{
              label: 'Number of Bots',
              data: ${JSON.stringify(botTypeCounts)},
              backgroundColor: 'rgba(54, 162, 235, 0.5)',
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            scales: {
              y: {
                beginAtZero: true
              }
            }
          }
        });
        
        // Behavior Chart
        new Chart(document.getElementById('behaviorChart').getContext('2d'), {
          type: 'pie',
          data: {
            labels: ${JSON.stringify(behaviorLabels)},
            datasets: [{
              label: 'Behaviors',
              data: ${JSON.stringify(behaviorCounts)},
              backgroundColor: [
                'rgba(255, 99, 132, 0.5)',
                'rgba(54, 162, 235, 0.5)',
                'rgba(255, 206, 86, 0.5)',
                'rgba(75, 192, 192, 0.5)',
                'rgba(153, 102, 255, 0.5)'
              ],
              borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)'
              ],
              borderWidth: 1
            }]
          },
          options: {
            responsive: true
          }
        });
      </script>
    </body>
    </html>
  `;
  
  fs.writeFileSync(reportFile, html);
  console.log(`Summary report saved to: ${reportFile}`);
}

// Run the simulation
(async () => {
  try {
    const results = await runBotSimulation(TOTAL_SIMULATIONS);
    generateSummaryReport(results);
  } catch (error) {
    console.error('Error running simulation:', error);
  }
})();
