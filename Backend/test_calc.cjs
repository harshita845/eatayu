const axios = require('axios');
async function test() {
  try {
    const res = await axios.post('http://localhost:5002/api/v1/food/orders/calculate', {
      items: [
        {
          itemId: "6a8d677cb5142e32a0a68f8a",
          name: "Indori Poha",
          price: 40,
          quantity: 1
        }
      ],
      restaurantId: "6a8490d0a04d116a4feea0c4",
      deliveryAddress: {
        location: {
          coordinates: [75.910182, 22.767956]
        }
      },
      pricing: {
        deliveryTip: 10
      }
    });
    console.log(res.data.data.pricing);
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
}
test();
