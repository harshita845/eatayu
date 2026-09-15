const path = require('path');
const backendDir = path.resolve(__dirname, '../Backend');

module.exports = {
  apps: [
    {
      name: 'EatAyu-api',
      cwd: backendDir,
      script: 'server.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        SOCKET_PORT: 5001,
        SERVER_BACKGROUND_JOBS_ENABLED: 'false',
        SERVER_QUEUE_BOOTSTRAP_ENABLED: 'false'
      }
    },
    {
      name: 'EatAyu-socket',
      cwd: backendDir,
      script: 'socket-server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '350M',
      env: {
        NODE_ENV: 'production',
        SOCKET_PORT: 5001
      }
    },
    {
      name: 'EatAyu-scheduler',
      cwd: backendDir,
      script: 'scripts/run-scheduled-jobs.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'EatAyu-worker-otp',
      cwd: backendDir,
      script: 'src/queues/workers/otp.worker.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '250M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'EatAyu-worker-notification',
      cwd: backendDir,
      script: 'src/queues/workers/notification.worker.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '250M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'EatAyu-worker-order',
      cwd: backendDir,
      script: 'src/queues/workers/order.worker.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '350M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'EatAyu-worker-tracking',
      cwd: backendDir,
      script: 'src/queues/workers/tracking.worker.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '350M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'EatAyu-worker-payment',
      cwd: backendDir,
      script: 'src/queues/workers/payment.worker.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '250M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'EatAyu-worker-maintenance',
      cwd: backendDir,
      script: 'src/queues/workers/maintenance.worker.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '250M',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
