import http from 'http';

function makeReq() {
  return new Promise(resolve => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/food/delivery/orders/FOD-9434714599/collect/qr',
      method: 'POST'
    }, res => {
      let data = '';
      res.on('data', c => data+=c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.end();
  })
}

async function run() {
  for (let i = 0; i < 5; i++) {
    const res = await makeReq();
    console.log(`[${i}] Status: ${res.status}, Body: ${res.data.slice(0, 50)}`);
  }
}
run();
