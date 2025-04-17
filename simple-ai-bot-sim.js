/**
 * Simple AI Bot Simulation Script
 */

// Configuration
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Target configuration
const TARGET_HOSTNAME = '127.0.0.1';
const TARGET_PORT = 5000;
const TARGET_PATHS = ['/', '/menu', '/about', '/contact', '/blog', '/blog/1'];
const RESULTS_DIR = path.join(__dirname, 'ai-bot-sim-results');
const TOTAL_SIMULATIONS = 5; // Simulations per bot type
const SIMULATION_DELAY = 100; // milliseconds

// AI Bot categories with detailed breakdown
const AI_BOTS = {
  OPENAI: {
    name: 'OpenAI',
    userAgents: [
      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.0; +https://openai.com/gptbot)',
      'Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)'
    ]
  },
  ANTHROPIC: {
    name: 'Anthropic Claude',
    userAgents: [
      'Mozilla/5.0 (compatible; Claude/1.0; https://anthropic.com/claude-bot)',
      'Mozilla/5.0 (compatible; Claude-Web/1.0; +https://claude.ai/)'
    ]
  },
  PERPLEXITY: {
    name: 'Perplexity',
    userAgents: [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Perplexity/1.0',
      'PerplexityBot/1.0 (https://www.perplexity.ai)'
    ]
  },
  GOOGLE: {
    name: 'Google Bard/Gemini',
    userAgents: [
      'Mozilla/5.0 (compatible; Google-Gemini/1.0; +https://developers.google.com/gemini)',
      'Mozilla/5.0 (compatible; BardBot/1.0; +https://bard.google.com/)'
    ]
  },
  MISC_AI: {
    name: 'Other AI Assistants',
    userAgents: [
      'Mozilla/5.0 (compatible; BrowserGPT/1.0; +https://browsergpt.app/bot)',
      'Mozilla/5.0 (compatible; PhindBot/1.0; +https://www.phind.com/bot)'
    ]
  }
};

// Ensure results directory exists
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  console.log(`Created results directory: ${RESULTS_DIR}`);
}

// Statistics tracking
const stats = {
  totalRequests: 0,
  startTime: new Date().toISOString(),
  botTypes: {},
  actions: {
    allowed: 0,
    redirected: 0,
    error: 0
  },
  perBotTypeActions: {}
};

// Initialize stats for each bot type
Object.keys(AI_BOTS).forEach(botType => {
  stats.botTypes[botType] = 0;
  stats.perBotTypeActions[botType] = {
    allowed: 0,
    redirected: 0,
    error: 0
  };
});

// Results array
const results = [];

// HTTP request function using Node.js native http module
function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

// Simulate a single bot visit
async function simulateBotVisit(botType, userAgent, path) {
  try {
    const options = {
      hostname: TARGET_HOSTNAME,
      port: TARGET_PORT,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Cache-Control': 'max-age=0'
      }
    };
    
    const response = await makeRequest(options);
    
    const result = {
      botType,
      botName: AI_BOTS[botType].name,
      userAgent,
      path,
      status: response.statusCode,
      isRedirect: response.statusCode === 302,
      location: response.headers.location || null,
      success: response.statusCode >= 200 && response.statusCode < 300
    };
    
    return result;
  } catch (error) {
    console.error(`Error simulating ${botType} bot visit to ${path}:`, error.message);
    return {
      botType,
      botName: AI_BOTS[botType].name,
      userAgent,
      path,
      status: 'ERROR',
      isRedirect: false,
      location: null,
      success: false,
      error: error.message
    };
  }
}

// Sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the simulation for all AI bots
async function runAIBotSimulation() {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const resultsFile = path.join(RESULTS_DIR, `ai-bot-sim-${timestamp}.json`);
  
  console.log(`Starting AI bot simulation against ${TARGET_HOSTNAME}:${TARGET_PORT}...`);
  console.log(`Will simulate ${TOTAL_SIMULATIONS} visits per AI bot type`);
  
  // For each bot type, run the simulation
  for (const [botType, botConfig] of Object.entries(AI_BOTS)) {
    console.log(`\nSimulating ${botConfig.name} bots (${TOTAL_SIMULATIONS} requests)...`);
    
    // For each simulation run for this bot type
    for (let i = 0; i < TOTAL_SIMULATIONS; i++) {
      // Select a user agent for this bot type
      const userAgent = botConfig.userAgents[i % botConfig.userAgents.length];
      // Select a path
      const path = TARGET_PATHS[i % TARGET_PATHS.length];
      
      // Run the simulation
      const result = await simulateBotVisit(botType, userAgent, path);
      
      // Track statistics
      stats.totalRequests++;
      stats.botTypes[botType] = (stats.botTypes[botType] || 0) + 1;
      
      if (result.error) {
        stats.actions.error++;
        stats.perBotTypeActions[botType].error++;
      } else if (result.isRedirect) {
        stats.actions.redirected++;
        stats.perBotTypeActions[botType].redirected++;
      } else {
        stats.actions.allowed++;
        stats.perBotTypeActions[botType].allowed++;
      }
      
      // Log the result
      console.log(`  Request #${i+1}: ${path} - Status: ${result.status} - ${result.isRedirect ? 'REDIRECTED' : 'ALLOWED'}`);
      
      // Add to results
      results.push(result);
      
      // Add a delay between requests
      await sleep(SIMULATION_DELAY);
    }
  }
  
  // Finalize the stats
  stats.endTime = new Date().toISOString();
  stats.totalTime = (new Date(stats.endTime) - new Date(stats.startTime)) / 1000;
  
  // Create final results object
  const finalResults = {
    stats,
    configuration: {
      targetHostname: TARGET_HOSTNAME,
      targetPort: TARGET_PORT,
      targetPaths: TARGET_PATHS,
      totalSimulations: TOTAL_SIMULATIONS,
      timestamp: timestamp
    },
    results
  };
  
  // Save results to file
  fs.writeFileSync(resultsFile, JSON.stringify(finalResults, null, 2));
  
  // Log summary
  console.log('\n===== SIMULATION COMPLETE =====');
  console.log(`Total requests: ${stats.totalRequests}`);
  console.log(`Total time: ${stats.totalTime.toFixed(2)} seconds`);
  console.log('\n===== BOT TYPE DISTRIBUTION =====');
  
  Object.entries(stats.botTypes).forEach(([botType, count]) => {
    const percentage = (count / stats.totalRequests * 100).toFixed(1);
    console.log(`${AI_BOTS[botType].name}: ${count} requests (${percentage}%)`);
  });
  
  console.log('\n===== ACTIONS BY BOT TYPE =====');
  Object.entries(stats.perBotTypeActions).forEach(([botType, actions]) => {
    const botCount = stats.botTypes[botType];
    if (botCount === 0) return;
    
    const allowedPercent = (actions.allowed / botCount * 100).toFixed(1);
    const redirectedPercent = (actions.redirected / botCount * 100).toFixed(1);
    
    console.log(`${AI_BOTS[botType].name}:`);
    console.log(`  Allowed: ${actions.allowed} (${allowedPercent}%)`);
    console.log(`  Redirected: ${actions.redirected} (${redirectedPercent}%)`);
    if (actions.error > 0) {
      console.log(`  Errors: ${actions.error}`);
    }
  });
  
  console.log(`\nResults saved to: ${resultsFile}`);
  
  return finalResults;
}

// Run the simulation
runAIBotSimulation().catch(error => {
  console.error('Error running simulation:', error);
});
