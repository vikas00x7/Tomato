/**
 * AI Bot Simulation Script
 * Specifically targets AI Assistant bots with detailed breakdown by bot type
 */

// Import required modules
const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');
const { fileURLToPath } = require('url');

// Configuration
const TARGET_WEBSITE = 'https://cdn.bunnylovesoaps.com/';
const TARGET_PATHS = ['/', '/menu', '/about', '/contact', '/blog', '/blog/1'];
const RESULTS_DIR = './ai-bot-sim-results';
const TOTAL_SIMULATIONS = 10; // Run 10 visits per AI bot type
const SIMULATION_DELAY = 100; // millisecond delay between requests

// AI Bot categories with detailed breakdown by company/product
const AI_BOTS = {
  OPENAI: {
    name: 'OpenAI',
    userAgents: [
      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.0; +https://openai.com/gptbot)',
      'Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)',
      'ChatGPT-User Mozilla/5.0 AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36'
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
  META: {
    name: 'Meta AI/Llama',
    userAgents: [
      'Mozilla/5.0 (compatible; Llama70b-Crawler/1.0; https://meta.com/llama-crawler)',
      'Mozilla/5.0 (compatible; Meta-AI/1.0; +https://meta.ai)'
    ]
  },
  COHERE: {
    name: 'Cohere',
    userAgents: [
      'Mozilla/5.0 (compatible; Cohere-AI/1.0; research-bot)',
      'Cohere-Agent/1.0 (+https://cohere.com/search)'
    ]
  },
  MISC_AI: {
    name: 'Other AI Assistants',
    userAgents: [
      'Mozilla/5.0 (compatible; BrowserGPT/1.0; +https://browsergpt.app/bot)',
      'Mozilla/5.0 (compatible; PhindBot/1.0; +https://www.phind.com/bot)',
      'Mozilla/5.0 (compatible; YouBot/1.0; +https://you.com/search/bot)',
      'Mozilla/5.0 (compatible; SearchBot/1.0)',
      'Mozilla/5.0 (compatible; MistralBot/1.0; +https://mistral.ai/)'
    ]
  }
};

// Create results directory if it doesn't exist
async function ensureResultsDir() {
  try {
    await fs.mkdir(RESULTS_DIR, { recursive: true });
    console.log(`Created results directory: ${RESULTS_DIR}`);
  } catch (error) {
    console.error('Error creating results directory:', error);
  }
}

// Simulate a single bot visit
async function simulateBotVisit(botType, userAgent, path) {
  try {
    const url = `${TARGET_WEBSITE}${path}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'max-age=0'
      },
      redirect: 'manual' // Don't automatically follow redirects
    });
    
    return {
      botType,
      botName: AI_BOTS[botType].name,
      userAgent,
      path,
      status: response.status,
      isRedirect: response.status === 302,
      location: response.headers.get('location') || null,
      success: response.status >= 200 && response.status < 300
    };
  } catch (error) {
    console.error(`Error simulating ${botType} bot visit to ${path}:`, error);
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

// Run the simulation for all AI bots
async function runAIBotSimulation() {
  await ensureResultsDir();
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const resultsFile = path.join(RESULTS_DIR, `ai-bot-sim-${timestamp}.json`);
  
  // Prepare statistics tracking
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
  
  // Track all simulation results
  const results = [];
  
  console.log(`Starting AI bot simulation against ${TARGET_WEBSITE}...`);
  console.log(`Will simulate ${TOTAL_SIMULATIONS} visits per AI bot type`);
  
  // For each bot type, run the simulation
  for (const [botType, botConfig] of Object.entries(AI_BOTS)) {
    console.log(`\nSimulating ${botConfig.name} bots (${TOTAL_SIMULATIONS} requests)...`);
    
    // For each simulation run for this bot type
    for (let i = 0; i < TOTAL_SIMULATIONS; i++) {
      // Select a random user agent for this bot type
      const userAgent = botConfig.userAgents[i % botConfig.userAgents.length];
      // Select a random path
      const path = TARGET_PATHS[i % TARGET_PATHS.length];
      
      // Run the simulation
      const result = await simulateBotVisit(botType, userAgent, path);
      
      // Track statistics
      stats.totalRequests++;
      stats.botTypes[botType]++;
      
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
      await new Promise(resolve => setTimeout(resolve, SIMULATION_DELAY));
    }
  }
  
  // Finalize the stats
  stats.endTime = new Date().toISOString();
  stats.totalTime = (new Date(stats.endTime) - new Date(stats.startTime)) / 1000;
  
  // Create final results object
  const finalResults = {
    stats,
    configuration: {
      targetWebsite: TARGET_WEBSITE,
      targetPaths: TARGET_PATHS,
      totalSimulations: TOTAL_SIMULATIONS,
      timestamp: timestamp
    },
    results
  };
  
  // Save results to file
  await fs.writeFile(resultsFile, JSON.stringify(finalResults, null, 2));
  
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
(async () => {
  try {
    await runAIBotSimulation();
  } catch (error) {
    console.error('Error running simulation:', error);
  }
})();
