const { PrismaClient } = require('@prisma/client');

// Need public Railway proxy URL - using the internal one won't work from outside Railway
// Let's just check what env DATABASE_URL looks like in .env
const fs = require('fs');
const path = require('path');

// Read .env file
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf8');
  console.log('ENV:', env.substring(0, 500));
} else {
  console.log('No .env file');
}
