import http from 'http';

const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/v1/food/delivery/orders/current',
  method: 'GET',
  headers: {
    // I need an auth token for delivery partner. Wait, I can't easily get it.
    // Instead I'll mock the function.
  }
});
req.end();
