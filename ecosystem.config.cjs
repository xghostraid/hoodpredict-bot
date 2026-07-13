/** PM2 process config — keeps bot alive 24/7 on VPS/Mac */
module.exports = {
  apps: [
    {
      name: 'hoodpredict-bot',
      script: 'npm',
      args: 'start',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};