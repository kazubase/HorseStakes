module.exports = {
  apps: [{
    name: 'odds-collector',
    script: './node_modules/.bin/ts-node',
    args: 'server/daily-odds-collector.ts',
    env: {
      NODE_ENV: 'production',
      DATABASE_URL: process.env.DATABASE_URL,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY
    }
  }]
}; 