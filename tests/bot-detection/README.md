# Bot Detection Testing Environment

This directory contains tools for testing the bot detection and paywall redirection system for TomatoWebsite.

## Setup

```bash
# Install dependencies
npm install
```

## Available Tests

### 1. HTTP Request Tests

The `bot-tester.js` script simulates HTTP requests with different bot user agents:

```bash
# Run HTTP tests
npm run test:http
```

This test:
- Makes plain HTTP requests with various bot user agents
- Tests multiple URLs on your website
- Detects if bots are redirected to the paywall
- Generates a detailed HTML report

### 2. Browser-Based Tests

The `browser-test.js` script uses Puppeteer to simulate real browser behavior:

```bash
# Run browser tests
npm run test:browser
```

This test:
- Opens a headless Chrome browser with different user agents
- Takes screenshots of each test for visual verification
- Tests browser fingerprinting and detection mechanisms
- Detects redirects to paywall or blocking

### 3. Run All Tests

```bash
# Run all tests
npm run test:all
```

## Test Configuration

You can modify the test targets in each script:

- Update `TARGET_WEBSITE` to point to your environment (development, staging, production)
- Add or remove bot user agents to test
- Modify the URLs to test specific pages

## Reports

Each test generates:
1. Console output with real-time results
2. A JSON file with detailed test results
3. An HTML report with visualizations
4. (For browser tests) Screenshots of the rendered pages

## Integration with Admin Dashboard

The testing results align with your admin dashboard:
- Bots detected by your system should appear in the Logs tab
- Bot visits will be counted in your Analytics dashboard
- IP addresses from the tests may appear in your IP Management tab

## Testing Paywall Redirection

The most important feature to test is the paywall redirection:
1. Unauthorized bots should be redirected to the paywall page
2. The paywall URL should include tracking parameters (source, returnUrl)
3. Authorized bots (based on your Bot Policy) should be allowed access
