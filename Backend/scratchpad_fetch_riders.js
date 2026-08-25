import http from 'http';

const req = http.request('http://localhost:5000/api/v1/food/admin/delivery-partners?isActive=true', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});
req.on('error', console.error);
req.end();
