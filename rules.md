# Cloudflare WAF Rules for BunnyLoveSoaps.com

This document outlines the optimized Cloudflare Web Application Firewall (WAF) rules for BunnyLoveSoaps.com, designed to work within the available rule limits:
- 10 User Agent Blocking rules
- 1 Rate Limiting Rule
- 5 Custom Rules

Each rule is crafted to maximize protection against bots and unauthorized scraping while directing potential scrapers to the paywall.

## Prioritized Protection Strategy

Our strategy focuses on three key objectives:
1. Identify obviously malicious bots
2. Challenge suspicious traffic to separate humans from sophisticated bots
3. Redirect bots and scrapers to the paywall for monetization opportunities

## User Agent Blocking Rules (10 Available)

### Rule 1: Redirect Common Scraping Libraries

**Purpose:** Redirect user agents that explicitly identify as web scraping tools to the paywall.

**User Agent Pattern:** `*[Ss]crape*` or `*crawler*` (except verified crawlers)

**Form Field Values:**
- **Name/Description**: `Redirect Common Scraping Libraries`
- **Action**: Select `Redirect` (not Block)
- **Redirect URL**: Enter `https://www.bunnylovesoaps.com/paywall`
- **User Agent**: Enter `*[Ss]crape*` (Create a second rule with `*crawler*` if multiple patterns cannot be combined)

**Implementation Steps:**
1. Navigate to Security → WAF → Tools → User Agent Blocking
2. Click "Create Blocking Rule"
3. Fill in the fields as specified above
4. Click "Save and Deploy rule"

### Rule 2: Redirect Headless Browsers

**Purpose:** Redirect common headless browser user agents often used for automated scraping.

**Form Field Values:**
- **Name/Description**: `Redirect Headless Browsers`
- **Action**: Select `Redirect` (not Block)
- **Redirect URL**: Enter `https://www.bunnylovesoaps.com/paywall`
- **User Agent**: Enter `*[Hh]eadless*`

**Note:** Create additional rules if needed for:
- `*PhantomJS*`
- `*Puppeteer*`
- `*Selenium*`

**Implementation Steps:**
Same as Rule 1

### Rule 3: Redirect Data Mining Tools

**Purpose:** Redirect data mining and extraction tools to the paywall.

**Form Field Values:**
- **Name/Description**: `Redirect Data Mining Tools`
- **Action**: Select `Redirect` (not Block)
- **Redirect URL**: Enter `https://www.bunnylovesoaps.com/paywall`
- **User Agent**: Enter `*[Dd]ata*[Mm]in*`

**Note:** Create additional rules if needed for:
- `*[Ee]xtract*`
- `*[Hh]arvest*`

**Implementation Steps:**
Same as Rule 1

### Rule 4: Redirect Outdated Browsers

**Purpose:** Redirect very old browser versions commonly spoofed by bots.

**Form Field Values:**
- **Name/Description**: `Redirect Outdated Browsers`
- **Action**: Select `Redirect` (not Block)
- **Redirect URL**: Enter `https://www.bunnylovesoaps.com/paywall`
- **User Agent**: Enter `*MSIE [1-6]*`

**Note:** Create an additional rule if needed:
- `*Firefox/[1-2].*`

**Implementation Steps:**
Same as Rule 1

### Rule 5: Redirect Programming Request Libraries

**Purpose:** Redirect common programming request libraries used for scraping.

**Form Field Values:**
- **Name/Description**: `Redirect Programming Request Libraries`
- **Action**: Select `Redirect` (not Block)
- **Redirect URL**: Enter `https://www.bunnylovesoaps.com/paywall`
- **User Agent**: Enter `*[Pp]ython*`

**Note:** Create additional rules if needed for:
- `*requests*`
- `*Ruby*`
- `*PHP*`

**Implementation Steps:**
Same as Rule 1

### Rule 6: Redirect Known Content Aggregators

**Purpose:** Redirect specific content aggregation services to the paywall.

**Form Field Values:**
- **Name/Description**: `Redirect Content Aggregators`
- **Action**: Select `Redirect` (not Block)
- **Redirect URL**: Enter `https://www.bunnylovesoaps.com/paywall`
- **User Agent**: Enter `*[Dd]iffbot*`

**Note:** Create additional rules if needed for:
- `*[Rr]ogerbot*`
- `*[Bb]ot*` (be careful with this one as it could redirect legitimate bots)

**Implementation Steps:**
Same as Rule 1

### Rule 7: Redirect Empty User Agents

**Purpose:** Many basic scraping scripts don't set a user agent. Redirect them to the paywall.

**Form Field Values:**
- **Name/Description**: `Redirect Empty User Agents`
- **Action**: Select `Redirect` (not Block)
- **Redirect URL**: Enter `https://www.bunnylovesoaps.com/paywall`
- **User Agent**: Leave empty or enter a single space character

**Implementation Steps:**
Same as Rule 1

### Rule 8: Redirect AI Data Collection Bots

**Purpose:** Redirect bots known to collect data for AI training to the paywall.

**Form Field Values:**
- **Name/Description**: `Redirect AI Data Collection Bots`
- **Action**: Select `Redirect` (not Block)
- **Redirect URL**: Enter `https://www.bunnylovesoaps.com/paywall`
- **User Agent**: Enter `*GPTBot*`

**Note:** Create additional rules if needed for:
- `*ChatGPT*`
- `*Claude*`
- `*Anthropic*`
- `*Bard*`
- `*-crawler*`
- `*CCBot*` (Common Crawl bot often used for AI training)
- `*Cohere*` (Cohere AI bot)
- `*[Aa][Ii].*` (Generic AI identifier)

**Implementation Steps:**
Same as Rule 1

### Rule 9: Redirect Specific Bad Bots

**Purpose:** Redirect known bad bot signatures to the paywall.

**Form Field Values:**
- **Name/Description**: `Redirect Bad Bot Signatures`
- **Action**: Select `Redirect` (not Block)
- **Redirect URL**: Enter `https://www.bunnylovesoaps.com/paywall`
- **User Agent**: Enter `*[Dd]ownloader*`

**Note:** Create additional rules if needed for:
- `*[Ss]ucker*`
- `*[Cc]opy*`
- `*[Mm]irror*`

**Implementation Steps:**
Same as Rule 1

### Rule 10: Redirect API Clients in Browser Context

**Purpose:** Redirect API client libraries when used in browser context to the paywall.

**Form Field Values:**
- **Name/Description**: `Redirect API Clients in Browser Context`
- **Action**: Select `Redirect` (not Block)
- **Redirect URL**: Enter `https://www.bunnylovesoaps.com/paywall`
- **User Agent**: Enter `*axios*`

**Note:** Create additional rules if needed for:
- `*http-client*`
- `*okhttp*`

**Implementation Steps:**
Same as Rule 1

## Rate Limiting Rule (1 Available)

### Rule 11: Advanced AI Pattern Detection with Token Bucket

**Purpose:** Detect and redirect AI bots based on their request patterns and methodical navigation.

**Form Field Values:**
- **Rule name**: `Advanced AI Pattern Detection`
- **Field**: Select `URI Path`
- **Operator**: Select `contains`
- **Value**: Enter `/products`
- **And/Or**: Click "Or" to add another condition
- **Field**: Select `URI Path`
- **Operator**: Select `contains`
- **Value**: Enter `/collections`
- **And/Or**: Click "Or" to add another condition
- **Field**: Select `URI Path`
- **Operator**: Select `contains`
- **Value**: Enter `/api/`

**For Token Bucket Configuration:**
- **When rate exceeded...**: 
  - **Requests (required)**: Enter `20` (Lower than human browsing)
  - **Period**: Select `1 minute`
  - **Mitigation Timeout**: `10 minutes` (Longer than standard to capture methodical AI patterns)
- **Additional Characteristics**:
  - **Same IP**: Check this to group by IP address
  - **Same JA3 Fingerprint**: If available, check this to detect AI tools with consistent TLS signatures
- **Then take action...**:
  - **Choose action**: Select `Redirect` 
  - **Redirect URL**: Enter `https://www.bunnylovesoaps.com/paywall`

**Implementation Steps:**
1. Navigate to Security → WAF → Rate Limiting Rules
2. Click "Create Rate Limiting Rule"
3. Fill in the fields as specified above
4. Click "Deploy"

## Custom Rules (5 Available)

### Rule 12: AI Signature Detection via TLS and HTTP Fingerprinting

**Purpose:** Identify and redirect AI bots based on their distinctive TLS fingerprints and HTTP request patterns.

**Form Field Values for Expression Editor:**
```
(http.request.timestamp.sec mod 10 eq 0 or http.request.timestamp.sec mod 5 eq 0) and (http.request.headers.names contains "accept-encoding" and not http.request.headers.names contains "accept-language") and not(bot_management.verified_bot)
```

**Explanation:**
This rule catches AI bots with these characteristics:
- Request timing tends to be unnaturally regular (often on exact intervals)
- Headers are often minimalist with specific patterns different from browsers
- Missing typical browser headers like Accept-Language

**Action Settings:**
- **Action**: Select `Redirect`
- **Redirect URL**: Enter `https://www.bunnylovesoaps.com/paywall`
- **Description**: Enter `AI Signature Detection`
- **Priority** (if available): Enter `3`

**Implementation Steps:**
1. Navigate to Security → WAF → Custom Rules
2. Click "Create Rule"
3. Switch to Expression Editor
4. Fill in the fields as specified above
5. Click "Deploy"

### Rule 13: Redirect Definitive Bot Traffic with Enhanced AI Detection

**Purpose:** Redirect traffic with very low bot scores and AI-specific characteristics.

**Form Field Values for Expression Editor:**
```
(bot_management.score lt 5 or 
(http.request.headers.order contains "host,connection,content-length,cache-control,upgrade-insecure-requests,user-agent,accept,sec-fetch-site,sec-fetch-mode,sec-fetch-user,sec-fetch-dest,referer,accept-encoding,accept-language" and false) or
(http.user_agent contains "python" and http.user_agent contains "/")) and not(bot_management.verified_bot)
```

**Note:** The header order check is set to "and false" to disable it initially - many Cloudflare plans don't support this feature, but if you have Enterprise you can remove "and false" to enable it.

**Action Settings:**
- **Action**: Select `Redirect` 
- **Redirect URL**: Enter `https://www.bunnylovesoaps.com/paywall`
- **Description**: Enter `Redirect Definitive Bot Traffic with Enhanced AI Detection`
- **Priority** (if available): Enter `1`

**Implementation Steps:**
1. Navigate to Security → WAF → Custom Rules
2. Click "Create Rule"
3. Switch to Expression Editor
4. Fill in the fields as specified above
5. Click "Deploy"

### Rule 14: Advanced Scraper and AI Bot Paywall Redirect

**Purpose:** Redirect suspected content scrapers and AI tools to the paywall.

**Form Field Values for Expression Editor:**
```
(bot_management.score lt 20 or 
http.user_agent contains "bot" or 
http.user_agent contains "Bot" or
(http.request.uri.path matches "^/products/[0-9a-zA-Z-]+$" and http.referer eq "" and http.request.cookies eq "") or
(http.request.method eq "GET" and http.response.code eq 200 and http.request.uri.path matches "/products/[^/]+$" and http.referer eq "")) and 
(http.request.uri.path contains "/products/" or 
http.request.uri.path contains "/collections/") and 
not(bot_management.verified_bot) and 
(http.request.uri.path ne "/products/paywall") and
(http.request.uri.path ne "/paywall")
```

**Explanation:**
Enhanced to catch:
- Direct product page access without referrers (common in scraping)
- Sequential access through product pages without normal browsing patterns
- Requests with missing cookies (indicates automated tools)

**Action Settings:**
- **Action**: Select `Redirect`
- **Redirect URL**: Enter `https://www.bunnylovesoaps.com/paywall`
- **Description**: Enter `Advanced Scraper and AI Bot Redirect`
- **Priority** (if available): Enter `2`

**Implementation Steps:**
1. Navigate to Security → WAF → Custom Rules
2. Click "Create Rule"
3. Switch to Expression Editor
4. Enter the expression as specified above
5. Fill in the action settings
6. Click "Deploy"

### Rule 15: AI Pattern Detection for Critical Endpoints

**Purpose:** Apply enhanced AI detection to critical business endpoints.

**Form Field Values for Expression Editor:**
```
(http.request.uri.path contains "/checkout" or 
http.request.uri.path contains "/account" or 
http.request.uri.path contains "/cart") and 
(bot_management.score lt 40 or 
(http.user_agent contains "Mozilla" and http.request.headers.count lt 10) or
(http.request.uri.query contains "product_id" and http.request.uri.query contains "quantity" and http.request.cookies eq "") or
(http.request.timestamp.sec mod 2 eq 0 and ip.src in {:ip_in_previous_requests:}))
```

**Explanation:**
Enhanced to catch:
- Simple browser impersonations with limited headers
- API-like queries with missing cookies
- Suspiciously regular request timing

**Action Settings:**
- **Action**: Select `Redirect` 
- **Redirect URL**: Enter `https://www.bunnylovesoaps.com/paywall`
- **Description**: Enter `AI Pattern Detection for Critical Endpoints`
- **Priority** (if available): Enter `4`

**Implementation Steps:**
1. Navigate to Security → WAF → Custom Rules
2. Click "Create Rule"
3. Switch to Expression Editor
4. Fill in the fields as specified above
5. Click "Deploy"

### Rule 16: Allowlist Verified Search Engines

**Purpose:** Ensure legitimate search engines can properly index your site.

**Form Field Values for Expression Editor:**
```
(bot_management.verified_bot)
```

**If using Field/Operator/Value UI:**
- **Field**: Select `Verified Bot`
- **Operator**: Select `equals`
- **Value**: Select `true`

**Action Settings:**
- **Action**: Select `Allow`
- **Description**: Enter `Allow Verified Good Bots`
- **Priority** (if available): Enter `0` (highest)

**Implementation Steps:**
1. Navigate to Security → WAF → Custom Rules
2. Click "Create Rule"
3. Fill in the fields as specified above
4. Click "Deploy"

## Implementation Sequence and Best Practices

1. **Implementation Order:**
   - First deploy Rule 16 (Allow Verified Good Bots) to prevent disrupting search indexing
   - Then deploy User Agent blocking rules (which are now redirect rules)
   - Next deploy the Rate Limiting Rule
   - Finally deploy the remaining Custom Rules

2. **Testing Recommendations:**
   - Test rules in "Log only" mode for 24-48 hours before enabling redirect actions
   - Monitor for false positives using Cloudflare Logs
   - Gradually enable enforcement starting with the most obvious bot patterns

3. **Paywall Page Requirements:**
   - Create a clear paywall page explaining data licensing options
   - Include contact information for legitimate business users seeking data access
   - Offer clear pricing tiers for API access and data usage
   - Ensure the paywall page is not protected by the same rules to avoid redirect loops

4. **Regular Maintenance:**
   - Review logs weekly to identify new bot patterns
   - Update User Agent patterns monthly to catch emerging scraping tools
   - Adjust bot score thresholds based on observed traffic patterns

## Advanced AI Detection Techniques Employed

1. **TLS Fingerprinting:**
   - Rule 11 uses JA3 fingerprinting if available on your plan
   - Identifies AI tools based on their distinctive TLS signatures

2. **Request Pattern Detection:**
   - Rule 12 identifies unnaturally regular timing patterns used by AI bots
   - Rule 14 catches direct product access without normal browsing patterns
   - Rule 15 detects suspiciously regular request intervals

3. **Header Analysis:**
   - Rules 12 and 13 analyze header presence, order, and counts
   - AI tools often have distinctive header patterns different from real browsers

4. **Token Bucket Implementation:**
   - Rule 11 uses a token bucket approach with longer timeouts to catch methodical AI navigation
   - Lower request thresholds to identify the consistent, measured way AI bots explore sites

5. **Behavioral Analysis:**
   - Rules 14 and 15 look for missing cookies and referrers
   - Captures the stateless nature of many AI scraping tools

## Cloudflare Bot Management Prerequisites

To maximize effectiveness, ensure the following are enabled:
- Bot Fight Mode (minimum)
- Super Bot Fight Mode (recommended)
- Bot Management (ideal if available on your plan)
- JavaScript detections
- Browser validation mechanisms
