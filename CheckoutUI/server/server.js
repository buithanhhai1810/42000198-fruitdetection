const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// Cấu hình Google Sheets
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyYqkF3nuNt8NZ55j3ft-Klh0evqZBxY-mWJGQ7UXdn6jaUB2Eu7EIOsAKdoRmK2d7kdg/exec";
const SECRET_KEY = process.env.SECRET_KEY; // Lấy từ biến môi trường

let products = [];
let orders = [];

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Root check
app.get('/', (req, res) => {
    res.send("API deployment successful");
});

// Thêm sản phẩm
app.post('/product', (req, res) => {
    const product = req.body;
    products.push(product);
    res.send('Product is added to the database');
});

// Lấy danh sách sản phẩm
app.get('/product', (req, res) => {
    res.json(products);
});

// Xoá sản phẩm theo ID
app.delete('/product/:id', (req, res) => {
    const id = req.params.id;
    products = products.filter(p => p.id !== id);
    res.send('Product is deleted');
});

// Lưu đơn hàng và gửi đến Google Sheets
app.post('/checkout', async (req, res) => {
    const order = req.body;
    orders.push(order);

    try {
        // Gửi dữ liệu đến Google Sheets
        const response = await axios.post(
            GOOGLE_SCRIPT_URL,
            order,
            {
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SECRET_KEY}`
                }
            }
        );
        
        console.log('Google Sheets response:', response.data);
    } catch (error) {
        console.error('Google Sheets error:', {
            message: error.message,
            response: error.response?.data
        });
    }

    res.send('Order saved');
});

// Lấy lịch sử giao dịch
app.get('/checkout', (req, res) => {
    res.json(orders);
});

// Khởi động server
app.listen(port, () => console.log(`Server listening on port ${port}!`));
