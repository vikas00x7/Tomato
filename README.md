# Tomato Restaurant Website

This project is a modern multi-page website for Tomato, a Silicon Valley-style food chain company. The website features a comprehensive user experience with Home, Menu, About, Blog, and Contact pages. It also includes integrated bot detection capabilities that identify and manage bot traffic while allowing legitimate search engines to crawl the site.

## Features

### Website Features
- **Modern Multi-Page Website**: Home, Menu, About, Blog, and Contact pages
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Dynamic Content**: Blog posts, menu items, testimonials with filtering options
- **Interactive Elements**: Contact forms, maps, and social media integration
- **Performance Optimized**: Fast load times and excellent SEO

### Security Features
- **Advanced Bot Detection**: FingerprintJS integration for client-side fingerprinting
- **Comprehensive Logging**: Records bot visits with IP, user agent, path, and more
- **Admin Dashboard**: View and analyze bot activity through a secure admin interface
- **Dual-Storage System**: Logs stored in both database and flat JSON files

## Getting Started

### Prerequisites

- Node.js 18+ (20+ recommended)
- NPM or Yarn package manager
- PostgreSQL database

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/tomato-restaurant.git
   cd tomato-restaurant
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up the database connection:
   - Create a PostgreSQL database
   - Update the connection details in `.env` file (see `.env.example`)

4. Run database migrations:
   ```
   npm run db:push
   ```

### Running Locally

There are two ways to run the application:

#### Option 1: Express Server (Recommended)
1. Start the Express server which serves both the API and frontend:
   ```
   npx tsx server/index.ts
   ```

2. The application will be available at:
   - Main Website: http://localhost:5000
   - Admin Dashboard: http://localhost:5000/admin
   - API Endpoints: http://localhost:5000/api/...

#### Option 2: Development Mode with Vite
1. Start the Vite development server:
   ```
   npm run dev
   ```

2. In a separate terminal, start the Express API:
   ```
   npx tsx server/index.ts
   ```

3. Access the application:
   - Frontend (Vite): http://localhost:3001
   - API and Admin: http://localhost:5000

### Replit Workflows

The project includes two configured workflows in Replit:

1. **Start Express Server** (Recommended)
   - Command: `npx tsx server/index.ts`
   - This workflow runs the Express server that handles both the API and serves the frontend
   - Access at: http://[replit-url]:5000

2. **Start application**
   - Command: `npm run dev`
   - This workflow runs only the Vite development server on port 3001
   - Note: This workflow requires the Express server to be running separately for API functionality

### API Authentication

The API endpoints are protected with an API key. Use the following key for development:

```
tomato-api-key-9c8b7a6d5e4f3g2h1i
```

When calling API endpoints, provide the key as a query parameter:
```
http://localhost:5000/api/logs?key=tomato-api-key-9c8b7a6d5e4f3g2h1i
```

Or as an HTTP header:
```
X-API-Key: tomato-api-key-9c8b7a6d5e4f3g2h1i
```

### Available API Endpoints

- `GET /api/logs` - Get all bot logs
- `GET /api/logs/ip/:ip` - Get logs for specific IP address
- `GET /api/logs/export` - Export logs as JSON file
- `GET /api/add-test-log` - Add a test log entry (development only)
- `POST /api/log` - Log a new bot visit

## Security and Bot Detection

The website implements a comprehensive security system to protect against unwanted bot traffic while allowing legitimate search engines and users.

### Bot Detection System

The bot detection system operates on two levels:

1. **Client-Side Detection**: Using FingerprintJS to identify browser fingerprints
2. **Server-Side Validation**: Express middleware to validate requests

### Bot Bypass Mechanism

The system allows certain users to bypass bot detection:

1. **Search Engines**: Common search engine user agents (Google, Bing, etc.) are automatically allowed
2. **Bypass Token**: Users with the correct bypass token cookie can access the site
   - Cookie Name: `bot_bypass_token`
   - Token Value: `tomato-restaurant-bypass-8675309` (change in production)

### Bot Logging

All bot activity is logged for analysis:

1. **Database Storage**: All bot visits are recorded in the PostgreSQL database
2. **Flat File Backup**: Logs are also written to `logs.json` for redundancy
3. **Admin Dashboard**: View and analyze bot logs at `/admin`

## Architecture

The project follows a modern web application pattern:

- **Frontend**: React with Vite for fast development
- **Backend**: Express.js API 
- **Database**: PostgreSQL with Drizzle ORM
- **Bot Detection**: Combination of client-side (FingerprintJS) and server-side techniques

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.