// Script to push schema changes to the database
require('dotenv').config();
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { migrate } = require('drizzle-orm/postgres-js/migrator');
const path = require('path');

async function main() {
  try {
    console.log('Initializing database connection...');
    
    // Check for DATABASE_URL
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL environment variable is not set');
      process.exit(1);
    }
    
    // Setup database connection
    const client = postgres(process.env.DATABASE_URL, { ssl: 'prefer' });
    const db = drizzle(client);
    
    console.log('Running migrations...');
    
    // We typically would use a migrations folder, but for now, we'll push the schema directly
    // In a production environment, you would use proper migrations
    await migrate(db, { migrationsFolder: path.join(__dirname, 'drizzle') });
    
    console.log('Schema push completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error pushing schema:', error);
    process.exit(1);
  }
}

main();