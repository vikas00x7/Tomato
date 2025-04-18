// Advanced Bot & Visitor Simulation Script - 500 Visitors
const userAgents = [
  // Regular browsers (human users) - 40% of traffic
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.101 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; SM-S908U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.210 Mobile Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 OPR/107.0.0.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Vivaldi/6.5.3206.53',
  
  // Search engine bots - 15% of traffic
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)',
  'Mozilla/5.0 (compatible; Yahoo! Slurp; http://help.yahoo.com/help/us/ysearch/slurp)',
  'Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)',
  'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
  'Mozilla/5.0 (compatible; DuckDuckBot/1.1; +http://duckduckgo.com/duckduckbot.html)',
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  'Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)',
  'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)',
  
  // AI Assistants - 25% of traffic
  'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.0; +https://openai.com/gptbot)',
  'Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)',
  'ChatGPT-User Mozilla/5.0 AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (compatible; Claude/1.0; https://anthropic.com/claude-bot)',
  'Mozilla/5.0 (compatible; Claude-Web/1.0; +https://claude.ai/)',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Perplexity/1.0',
  'PerplexityBot/1.0 (https://www.perplexity.ai)',
  'Mozilla/5.0 (compatible; Google-Gemini/1.0; +https://developers.google.com/gemini)',
  'Mozilla/5.0 (compatible; BardBot/1.0; +https://bard.google.com/)',
  'Mozilla/5.0 (compatible; Llama70b-Crawler/1.0; https://meta.com/llama-crawler)',
  'Mozilla/5.0 (compatible; Meta-AI/1.0; +https://meta.ai)',
  'Mozilla/5.0 (compatible; Cohere-AI/1.0; research-bot)',
  'Mozilla/5.0 (compatible; BrowserGPT/1.0; +https://browsergpt.app/bot)',
  'Mozilla/5.0 (compatible; PhindBot/1.0; +https://www.phind.com/bot)',
  'Mozilla/5.0 (compatible; YouBot/1.0; +https://you.com/search/bot)',
  'Mozilla/5.0 (compatible; MistralBot/1.0; +https://mistral.ai/)',
  
  // Web Scrapers/Automation Tools - 20% of traffic
  'Mozilla/5.0 (compatible; Scrapy/2.8.0; +https://scrapy.org)',
  'Mozilla/5.0 (compatible; HeadlessChrome/112.0.5615.49)',
  'Mozilla/5.0 (compatible; Octoparse/1.0.0; +https://docs.octoparse.com/)',
  'Mozilla/5.0 (compatible; Apify; +https://apify.com)',
  'Mozilla/5.0 (compatible; ZoominfoBot; +https://www.zoominfo.com/about-zoominfo/privacy-policy)',
  'Mozilla/5.0 (compatible; DataForSeoBot/1.0; +https://dataforseo.com/dataforseo-bot)',
  'Mozilla/5.0 (compatible; BrightData/1.0; +https://brightdata.com/web-data-integration)',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/88.0.4298.0 Safari/537.36 Puppeteer',
  'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 Selenium',
  'Mozilla/5.0 (compatible; WebScraper/1.0; +http://webscraper.io/)'
];

// Target URLs to simulate visits to
const targetUrls = [
  'http://127.0.0.1:5000/',
  'http://127.0.0.1:5000/menu',
  'http://127.0.0.1:5000/about',
  'http://127.0.0.1:5000/contact',
  'http://127.0.0.1:5000/blog',
  'http://127.0.0.1:5000/blog/1',
  'http://127.0.0.1:5000/blog/2',
  'http://127.0.0.1:5000/login',
  'http://127.0.0.1:5000/api/health'
];

// Bot detection for statistics
function isBotAgent(userAgent) {
  const botPatterns = [
    'googlebot', 'bingbot', 'yandexbot', 'slurp', 'baidu', 'semrush', 'ahrefs',
    'bot', 'crawler', 'spider', 'headless', 'puppeteer', 'selenium',
    'gptbot', 'claude', 'perplexity', 'gemini', 'llama', 'ai', 'cohere',
    'scraper', 'scrapy', 'apify', 'browser'
  ];
  const lowercaseAgent = userAgent.toLowerCase();
  return botPatterns.some(pattern => lowercaseAgent.includes(pattern));
}

// Determine specific bot type for detailed statistics
function getBotType(userAgent) {
  const lowercaseAgent = userAgent.toLowerCase();
  
  // AI Assistants
  if (lowercaseAgent.includes('gptbot') || lowercaseAgent.includes('openai') || lowercaseAgent.includes('chatgpt')) 
    return 'OpenAI';
  if (lowercaseAgent.includes('claude') || lowercaseAgent.includes('anthropic')) 
    return 'Claude';
  if (lowercaseAgent.includes('perplexity')) 
    return 'Perplexity';
  if (lowercaseAgent.includes('gemini') || lowercaseAgent.includes('bard') || lowercaseAgent.includes('google')) 
    return 'Google';
  if (lowercaseAgent.includes('llama') || lowercaseAgent.includes('meta')) 
    return 'Meta';
  if (lowercaseAgent.includes('browsergpt')) 
    return 'BrowserGPT';
  if (lowercaseAgent.includes('phind')) 
    return 'Phind';
  if (lowercaseAgent.includes('you.com') || lowercaseAgent.includes('youbot')) 
    return 'You.com';
  if (lowercaseAgent.includes('mistral')) 
    return 'Mistral';
  if (lowercaseAgent.includes('cohere')) 
    return 'Cohere';
  
  // Search engines
  if (lowercaseAgent.includes('googlebot')) 
    return 'GoogleSearch';
  if (lowercaseAgent.includes('bingbot')) 
    return 'BingSearch';
  if (lowercaseAgent.includes('yandexbot')) 
    return 'YandexSearch';
  if (lowercaseAgent.includes('baidu')) 
    return 'BaiduSearch';
  if (lowercaseAgent.includes('slurp')) 
    return 'YahooSearch';
  if (lowercaseAgent.includes('duckduckbot')) 
    return 'DuckDuckGo';
  if (lowercaseAgent.includes('facebook')) 
    return 'Facebook';
  
  // Scrapers and Tools
  if (lowercaseAgent.includes('scrapy') || lowercaseAgent.includes('scraper')) 
    return 'Scraper';
  if (lowercaseAgent.includes('headless') || lowercaseAgent.includes('puppeteer')) 
    return 'Headless';
  if (lowercaseAgent.includes('selenium')) 
    return 'Selenium';
  if (lowercaseAgent.includes('apify')) 
    return 'Apify';
  if (lowercaseAgent.includes('semrush')) 
    return 'SEMrush';
  if (lowercaseAgent.includes('ahrefs')) 
    return 'Ahrefs';
  
  // If no specific bot type is found but it matches bot patterns
  if (isBotAgent(userAgent)) 
    return 'OtherBot';
  
  return 'Human';
}

// Sleep function for rate limiting
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Generate simulation data
function generateVisitors(count) {
  const visitors = [];
  for (let i = 0; i < count; i++) {
    // Select a random user agent with proper distribution
    const userAgentIndex = Math.floor(Math.random() * userAgents.length);
    const userAgent = userAgents[userAgentIndex];
    
    // Select a random URL
    const urlIndex = Math.floor(Math.random() * targetUrls.length);
    const url = targetUrls[urlIndex];
    
    visitors.push({
      userAgent,
      url,
      botType: getBotType(userAgent)
    });
  }
  return visitors;
}

async function simulate() {
  const TOTAL_VISITORS = 500;
  const BATCH_SIZE = 20; // Process in batches to avoid overwhelming the server
  const MIN_DELAY = 10;  // Minimum delay between requests (ms)
  const MAX_DELAY = 50;  // Maximum delay between requests (ms)
  
  console.log(`Starting simulation of ${TOTAL_VISITORS} visitors to the website...`);
  console.log(`Target server: ${targetUrls[0]}`);
  
  // Statistics collection
  const stats = {
    totalRequests: 0,
    humans: 0,
    bots: 0,
    allowed: 0,
    redirected: 0,
    error: 0,
    botTypes: {},
    aiAssistants: {}, // Specific AI assistant stats
    botActions: {
      allowed: 0,
      redirected: 0,
      error: 0
    },
    startTime: new Date().toISOString(),
    endTime: null,
    duration: 0,
    pathStats: {} // Stats by path
  };

  // Generate all visitors
  const visitors = generateVisitors(TOTAL_VISITORS);
  
  // Process visitors in batches
  for (let i = 0; i < visitors.length; i += BATCH_SIZE) {
    const batch = visitors.slice(i, i + BATCH_SIZE);
    
    // Process batch in parallel
    const batchResults = await Promise.all(batch.map(async (visitor) => {
      try {
        const { userAgent, url, botType } = visitor;
        const isBot = isBotAgent(userAgent);
        
        // Add random delay between requests
        await sleep(Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY) + MIN_DELAY));
        
        // Make request
        const res = await fetch(url, {
          headers: { 'User-Agent': userAgent },
          redirect: 'manual'
        });
        
        // Track stats by path
        const pathKey = new URL(url).pathname || '/';
        if (!stats.pathStats[pathKey]) {
          stats.pathStats[pathKey] = { 
            total: 0, 
            human: 0, 
            bot: 0, 
            allowed: 0, 
            redirected: 0,
            error: 0
          };
        }
        stats.pathStats[pathKey].total++;
        
        if (isBot) {
          stats.pathStats[pathKey].bot++;
        } else {
          stats.pathStats[pathKey].human++;
        }
        
        // Return result
        return {
          userAgent,
          url,
          isBot,
          botType,
          status: res.status,
          location: res.headers.get('location')
        };
      } catch (error) {
        console.error(`Error with request: ${error.message}`);
        return {
          userAgent: visitor.userAgent,
          url: visitor.url,
          isBot: isBotAgent(visitor.userAgent),
          botType: visitor.botType,
          status: 'ERROR',
          error: error.message
        };
      }
    }));
    
    // Update statistics
    for (const result of batchResults) {
      stats.totalRequests++;
      
      // Count by bot vs human
      if (result.isBot) {
        stats.bots++;
        // Count bot types
        stats.botTypes[result.botType] = (stats.botTypes[result.botType] || 0) + 1;
        
        // Classify AI assistants specially for detailed reporting
        if (['OpenAI', 'Claude', 'Perplexity', 'Google', 'Meta', 'BrowserGPT', 'Phind', 'You.com', 'Mistral', 'Cohere'].includes(result.botType)) {
          stats.aiAssistants[result.botType] = stats.aiAssistants[result.botType] || {
            requests: 0,
            allowed: 0,
            redirected: 0,
            error: 0
          };
          stats.aiAssistants[result.botType].requests++;
        }
      } else {
        stats.humans++;
      }
      
      // Count by result
      if (result.status === 'ERROR') {
        stats.error++;
        stats.pathStats[new URL(result.url).pathname || '/'].error++;
        
        if (result.isBot) {
          stats.botActions.error++;
          if (stats.aiAssistants[result.botType]) {
            stats.aiAssistants[result.botType].error++;
          }
        }
      } else if (result.status === 302) {
        stats.redirected++;
        stats.pathStats[new URL(result.url).pathname || '/'].redirected++;
        
        if (result.isBot) {
          stats.botActions.redirected++;
          if (stats.aiAssistants[result.botType]) {
            stats.aiAssistants[result.botType].redirected++;
          }
        }
      } else {
        stats.allowed++;
        stats.pathStats[new URL(result.url).pathname || '/'].allowed++;
        
        if (result.isBot) {
          stats.botActions.allowed++;
          if (stats.aiAssistants[result.botType]) {
            stats.aiAssistants[result.botType].allowed++;
          }
        }
      }
      
      // Progress indication every 50 requests
      if (stats.totalRequests % 50 === 0 || stats.totalRequests === TOTAL_VISITORS) {
        console.log(`Processed ${stats.totalRequests}/${TOTAL_VISITORS} requests (${Math.floor(stats.totalRequests/TOTAL_VISITORS*100)}%)`);
      }
    }
  }
  
  // Calculate duration
  stats.endTime = new Date().toISOString();
  stats.duration = (new Date(stats.endTime) - new Date(stats.startTime)) / 1000; // in seconds
  
  // Display detailed statistics
  console.log('\n----- SIMULATION COMPLETE -----');
  console.log(`Total Requests: ${stats.totalRequests}`);
  console.log(`Duration: ${stats.duration.toFixed(2)} seconds`);
  console.log(`Requests/sec: ${(stats.totalRequests / stats.duration).toFixed(2)}`);
  
  console.log('\n----- VISITOR BREAKDOWN -----');
  console.log(`Humans: ${stats.humans} (${(stats.humans/stats.totalRequests*100).toFixed(1)}%)`);
  console.log(`Bots: ${stats.bots} (${(stats.bots/stats.totalRequests*100).toFixed(1)}%)`);
  
  console.log('\n----- RESPONSE RESULTS -----');
  console.log(`Allowed: ${stats.allowed} (${(stats.allowed/stats.totalRequests*100).toFixed(1)}%)`);
  console.log(`Redirected: ${stats.redirected} (${(stats.redirected/stats.totalRequests*100).toFixed(1)}%)`);
  console.log(`Errors: ${stats.error} (${(stats.error/stats.totalRequests*100).toFixed(1)}%)`);
  
  console.log('\n----- BOT ACTIONS -----');
  console.log(`Bots Allowed: ${stats.botActions.allowed} (${(stats.botActions.allowed/stats.bots*100).toFixed(1)}% of bots)`);
  console.log(`Bots Redirected: ${stats.botActions.redirected} (${(stats.botActions.redirected/stats.bots*100).toFixed(1)}% of bots)`);
  console.log(`Bots Errors: ${stats.botActions.error} (${(stats.botActions.error/stats.bots*100).toFixed(1)}% of bots)`);
  
  console.log('\n----- BOT TYPE DISTRIBUTION -----');
  Object.entries(stats.botTypes).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
    console.log(`${type}: ${count} (${(count/stats.bots*100).toFixed(1)}% of bots)`);
  });
  
  console.log('\n----- AI ASSISTANT DETAILS -----');
  Object.entries(stats.aiAssistants).forEach(([aiType, data]) => {
    console.log(`${aiType}:`);
    console.log(`  Requests: ${data.requests}`);
    console.log(`  Allowed: ${data.allowed} (${data.requests ? (data.allowed/data.requests*100).toFixed(1) : 0}%)`);
    console.log(`  Redirected: ${data.redirected} (${data.requests ? (data.redirected/data.requests*100).toFixed(1) : 0}%)`);
    console.log(`  Errors: ${data.error} (${data.requests ? (data.error/data.requests*100).toFixed(1) : 0}%)`);
  });
  
  console.log('\n----- PATH STATISTICS -----');
  Object.entries(stats.pathStats).forEach(([path, pathData]) => {
    console.log(`${path}:`);
    console.log(`  Total: ${pathData.total} (${(pathData.total/stats.totalRequests*100).toFixed(1)}% of all traffic)`);
    console.log(`  Human: ${pathData.human} | Bot: ${pathData.bot}`);
    console.log(`  Allowed: ${pathData.allowed} | Redirected: ${pathData.redirected} | Errors: ${pathData.error}`);
  });
  
  // Save results to file
  try {
    const fs = await import('fs/promises');
    const statsFilePath = './simulation-stats.json';
    const detailedStatsPath = `./simulation-${new Date().toISOString().replace(/:/g, '-')}.json`;
    
    await fs.writeFile(statsFilePath, JSON.stringify({
      timestamp: stats.endTime,
      stats: {
        totalRequests: stats.totalRequests,
        humans: stats.humans,
        bots: stats.bots,
        allowed: stats.allowed,
        redirected: stats.redirected,
        error: stats.error,
        duration: stats.duration,
        requestsPerSecond: (stats.totalRequests / stats.duration).toFixed(2)
      }
    }, null, 2));
    
    // Write detailed stats to a separate file
    await fs.writeFile(detailedStatsPath, JSON.stringify(stats, null, 2));
    
    console.log(`\nSummary statistics saved to ${statsFilePath}`);
    console.log(`Detailed statistics saved to ${detailedStatsPath}`);
  } catch (err) {
    console.log('Could not save statistics to file:', err.message);
  }
}

simulate().catch(error => {
  console.error('Simulation error:', error);
});
