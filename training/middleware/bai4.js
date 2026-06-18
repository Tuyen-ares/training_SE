const express = require('express');
const app = express();

app.use(express.json());

const applyDiscount = ((req,res,next) => {
    const magiamgia = req.query.voucher;
    const nameUser = req.query.name;
    if(magiamgia === 'VIP'){
        req.discount = 0.5;
    }else{
      req.discount = 0;
    }
    next();
})

app.get('/api/checkout', applyDiscount, (req, res) => {
  const originalPrice = req.query.price;
  const finalPrice = originalPrice * (1 - req.discount);
  res.status(200).json({message:`originalPrice": ${originalPrice}, "discountApplied": ${req.discount}, "finalPrice": ${finalPrice}`});
}
);
app.listen(3000, () => {
    console.log('Server is running on port 3000 : http://localhost:3000');
});