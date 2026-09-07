module.exports = {
  apps: [
    {
      name: 'preview-server-cluster',
      script: './server.js',
      instances: process.env.PM2_INSTANCES || 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000,
        SILENT_LOGS: 'true'
      }
    }
  ]
};
