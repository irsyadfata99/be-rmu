// ============================================
// ecosystem.config.js
// PM2 Configuration for Process Management
// ============================================

module.exports = {
  apps: [
    {
      // ===== APPLICATION CONFIG =====
      name: "koperasi-pos-api",
      script: "./src/server.js",

      // ===== INSTANCES & CLUSTERING =====
      instances: 1, // Number of instances (1 for single, "max" for CPU cores)
      exec_mode: "fork", // "fork" or "cluster"

      // ===== ENVIRONMENT =====
      env: {
        NODE_ENV: "development",
        PORT: 8000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 8000,
      },

      // ===== LOGGING =====
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "./logs/error.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
      merge_logs: true,

      // ===== AUTO RESTART =====
      watch: false, // Set true for development auto-reload
      watch_delay: 1000,
      ignore_watch: ["node_modules", "logs", ".git"],

      // ===== RESTART STRATEGIES =====
      max_memory_restart: "500M", // Restart if memory exceeds 500MB
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",

      // ===== GRACEFUL SHUTDOWN =====
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 3000,

      // ===== CRON (Optional - for scheduled tasks) =====
      cron_restart: "0 3 * * *", // Restart every day at 3 AM (optional)

      // ===== ERROR HANDLING =====
      exp_backoff_restart_delay: 100,
    },
  ],

  // ===== DEPLOYMENT (Optional) =====
  deploy: {
    production: {
      user: "nodejs",
      host: "your-server.com",
      ref: "origin/main",
      repo: "git@github.com:username/koperasi-pos-backend.git",
      path: "/var/www/koperasi-pos",
      "post-deploy": "npm install && pm2 reload ecosystem.config.js --env production",
      env: {
        NODE_ENV: "production",
      },
    },
  },
};
