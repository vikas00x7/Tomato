# Tomato Restaurant Website with Bot Detection

This project is a modern multi-page website for Tomato, a Silicon Valley-style food chain company. The website includes integrated bot detection capabilities that identify and manage bot traffic while allowing legitimate search engines to crawl the site.

## Features

- **Modern Multi-Page Website**: Home, Menu, About, Blog, and Contact pages
- **Advanced Bot Detection**: FingerprintJS integration for client-side fingerprinting
- **Comprehensive Logging**: Records bot visits with IP, user agent, path, and more
- **Cloudflare Integration**: Custom worker for traffic filtering at the CDN level
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

1. Start the development server:
   ```
   npm run dev
   ```

2. The application will be available at:
   - Express API: http://localhost:5000
   - Admin Dashboard: http://localhost:5000/admin

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

## Cloudflare Integration

### Worker Setup

1. Copy the worker code from `cloudflare/worker.js`
2. Create a new Cloudflare Worker in your Cloudflare dashboard
3. Paste the code and deploy the worker
4. Set up a route pattern to match your domain

### Deployment

The project includes a deployment script for Cloudflare:

```
./deploy-to-cloudflare.sh
```

Or use the direct upload script:

```
node cloudflare-direct-upload.js
```

## Architecture

The project follows a modern web application pattern:

- **Frontend**: React with Vite for fast development
- **Backend**: Express.js API 
- **Database**: PostgreSQL with Drizzle ORM
- **Bot Detection**: Combination of client-side (FingerprintJS) and server-side techniques
- **Caching/CDN**: Cloudflare integration for edge caching and bot filtering

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.