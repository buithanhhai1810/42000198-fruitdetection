// Import các thư viện cần thiết
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

// Khởi tạo ứng dụng Express
const app = express();
const port = process.env.PORT || 3000; // Sử dụng port từ biến môi trường hoặc mặc định 3000

// Khởi tạo mảng lưu trữ sản phẩm và đơn hàng
let products = []; // Mảng lưu trữ danh sách sản phẩm
let orders = [];   // Mảng lưu trữ lịch sử đơn hàng

// Cấu hình middleware
app.use(cors()); // Cho phép truy cập từ các domain khác (Cross-Origin Resource Sharing)
app.use(bodyParser.urlencoded({ extended: false })); // Xử lý dữ liệu form URL-encoded
app.use(bodyParser.json()); // Xử lý dữ liệu JSON

// =============================================
// ROUTE: KIỂM TRA HOẠT ĐỘNG CỦA SERVER
// =============================================
app.get('/', (req, res) => {
    res.send("API deployment successful"); // Trả về thông báo khi truy cập root
});

// =============================================
// ROUTE: QUẢN LÝ SẢN PHẨM
// =============================================

// Thêm sản phẩm mới
app.post('/product', (req, res) => {
    const product = req.body; // Lấy dữ liệu sản phẩm từ request body
    console.log(product);     // Ghi log sản phẩm ra console (debug)
    products.push(product);   // Thêm sản phẩm vào mảng
    res.send('Product is added to the database'); // Gửi phản hồi thành công
});

// Lấy danh sách tất cả sản phẩm
app.get('/product', (req, res) => {
    res.json(products); // Trả về toàn bộ danh sách sản phẩm dưới dạng JSON
});

// Lấy thông tin sản phẩm theo ID
app.get('/product/:id', (req, res) => {
    const id = req.params.id; // Lấy ID từ URL parameter
    // Tìm sản phẩm trong mảng
    for (let product of products) {
        if (product.id === id) {
            return res.json(product); // Trả về sản phẩm nếu tìm thấy
        }
    }
    res.status(404).send('Product not found'); // Trả về lỗi 404 nếu không tìm thấy
});

// Xóa sản phẩm theo ID
app.delete('/product/:id', (req, res) => {
    const id = req.params.id; // Lấy ID từ URL parameter
    // Lọc ra các sản phẩm không trùng ID
    products = products.filter(p => p.id !== id);
    res.send('Product is deleted'); // Gửi phản hồi thành công
});

// Cập nhật sản phẩm theo ID
app.post('/product/:id', (req, res) => {
    const id = req.params.id; // Lấy ID từ URL parameter
    const newProduct = req.body; // Lấy dữ liệu sản phẩm mới từ request body
    // Tìm và cập nhật sản phẩm
    for (let i = 0; i < products.length; i++) {
        if (products[i].id === id) {
            products[i] = newProduct; // Thay thế sản phẩm cũ bằng sản phẩm mới
        }
    }
    res.send('Product is edited'); // Gửi phản hồi thành công
});

// =============================================
// ROUTE: QUẢN LÝ ĐƠN HÀNG
// =============================================

// Lưu thông tin đơn hàng (checkout)
app.post('/checkout', (req, res) => {
    const order = req.body; // Lấy dữ liệu đơn hàng từ request body
    orders.push(order);     // Thêm đơn hàng vào mảng lịch sử
    res.send('Order saved'); // Gửi phản hồi thành công
});

// Lấy lịch sử tất cả đơn hàng
app.get('/checkout', (req, res) => {
    res.json(orders); // Trả về toàn bộ lịch sử đơn hàng dưới dạng JSON
});

// =============================================
// KHỞI ĐỘNG SERVER
// =============================================
app.listen(port, () => console.log(`Server listening on port ${port}!`));