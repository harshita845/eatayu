import http from 'http';

const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/v1/food/admin/orders/6a8d7f63ce5282fafbe83ff0/assign',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY:', data));
});
req.on('error', console.error);
req.write(JSON.stringify({ deliveryPartnerId: '64b1f63ce5282fafbe83ff0' })); // arbitrary valid format ID
req.end();
