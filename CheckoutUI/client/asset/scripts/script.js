// =============================================
// BIẾN TOÀN CỤC
// =============================================
var InitialCount = -1; // Theo dõi số lượng sản phẩm trong lần kiểm tra trước
var orderCounter = parseInt(localStorage.getItem('orderCounter')) || 0; // Lấy số đơn hàng từ localStorage hoặc bắt đầu từ 0

// =============================================
// HÀM XÓA SẢN PHẨM
// =============================================
const deleteProducts = async () => {
    const url = 'https://four2000198-fruitdetection.onrender.com/product';

    try {
        // Lấy danh sách sản phẩm hiện tại từ server
        let res = await axios.get(url);
        const products = res.data;

        // Xóa từng sản phẩm trên server
        for (let product of products) {
            await axios.delete(`${url}/${product.id}`);
        }

        // Tải lại trang và cuộn lên đầu trang
        location.reload();
        window.scroll({
            top: 0,
            left: 0,
            behavior: 'smooth' // Hiệu ứng cuộn mượt
        });
    } catch (error) {
        console.error("Lỗi khi xóa sản phẩm:", error);
    }
};

// =============================================
// HÀM TẢI VÀ HIỂN THỊ SẢN PHẨM
// =============================================
const loadProducts = async () => {
    const url = 'https://four2000198-fruitdetection.onrender.com/product';

    try {
        // Gọi API để lấy danh sách sản phẩm
        let res = await axios.get(url);
        const products = res.data;
        const len = products.length;

        // Kiểm tra nếu có sản phẩm mới được thêm vào
        if (len > InitialCount + 1) {
            // Ẩn màn hình chờ và hiển thị khu vực sản phẩm
            $("#1").css("display", "none");
            $("#home").css("display", "grid");
            $("#2").css("display", "grid");

            // Tính tổng tiền và tổng khối lượng
            let payable = 0;
            let totalWeight = 0;

            for (let product of products) {
                payable += parseFloat(product.payable);
                totalWeight += parseFloat(product.total_weight || 0);
            }

            // Lấy sản phẩm mới nhất (phần tử cuối mảng)
            const product = products.pop();
            
            // Tạo HTML để hiển thị sản phẩm
            const productHTML = `
            <section>
                <div class="card the-trai-cay animated fadeInUp once">
                    <img src="asset/img/${product.id}.jpg" class="anh-trai-cay">
                    <div class="nhan-ten">Tên trái cây</div>
                    <div class="ten-trai-cay">
                        <span>${product.name}</span>
                    </div>
                    <div class="nhan-gia">Giá mỗi trái</div>
                    <div class="gia-trai-cay">
                        <span>${product.price} Đ</span>
                    </div>
                    <div class="nhan-so-luong">Số lượng</div>
                    <div class="so-luong">
                        <span>${product.taken}</span>
                    </div>
                    <div class="nhan-thanh-tien">Thành tiền</div>
                    <div class="thanh-tien">
                        <span>${product.payable} Đ</span>
                    </div>
                </div>
            </section>
            `;

            // Thêm sản phẩm vào giao diện
            document.getElementById('home').innerHTML += productHTML;
            
            // Cập nhật nút thanh toán và thông tin khối lượng
            document.getElementById('2').innerHTML = `THANH TOÁN: ${payable} Đ`;
            document.getElementById('weight').innerHTML = `TỔNG KHỐI LƯỢNG: ${totalWeight} G`;
            document.getElementById('weight').style.display = "block";
            
            // Cập nhật số lượng sản phẩm đã xử lý
            InitialCount += 1;
        }
    } catch (error) {
        console.error("Lỗi khi tải sản phẩm:", error);
    }
};

// =============================================
// HÀM XỬ LÝ THANH TOÁN
// =============================================
const checkout = async () => {
    // Hiển thị biểu tượng loading trên nút thanh toán
    document.getElementById('2').innerHTML = "<span class='loader-16' style='margin-left: 44%;'></span>";
    const url = 'https://four2000198-fruitdetection.onrender.com/product';

    try {
        // Lấy danh sách sản phẩm hiện tại
        let res = await axios.get(url);
        const products = res.data;

        // Tính tổng số tiền cần thanh toán
        let payable = 0;
        for (let product of products) {
            payable += parseFloat(product.payable);
        }

        // Tăng số đơn hàng và lưu vào localStorage
        orderCounter++;
        localStorage.setItem('orderCounter', orderCounter);
        
        // Tạo nội dung cho QR code với số đơn hàng tăng dần
        const qrData = `ĐƠN HÀNG ${orderCounter} - TỔNG SỐ TIỀN: ${payable} VND`;
        
        // Tạo URL QR code từ tổng số tiền và số đơn hàng
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
        
        // Gửi đơn hàng đến server để lưu lịch sử
        await axios.post('https://four2000198-fruitdetection.onrender.com/checkout', {
            products,
            timestamp: new Date().toISOString(),
            orderNumber: orderCounter,
            totalAmount: payable
        });

        // Ẩn các phần không cần thiết và cuộn lên đầu trang
        $("#home").css("display", "none");
        $("#final").css("display", "none");
        $("#weight").css("display", "none");
        window.scroll({ top: 0, left: 0, behavior: 'smooth' });

        // Hiển thị QR code
        $('#image').attr('src', qrUrl);
        $("#qr").css("display", "grid");
        
        // Hiển thị số đơn hàng trên giao diện - CHỈNH SỬA Ở ĐÂY: THÊM THẺ <strong>
        document.getElementById('qr').innerHTML = `
            <h2>ĐƠN HÀNG ${orderCounter}</h2>
            <p>Quét mã QR để thanh toán!</p>
            <img id="image" src="${qrUrl}" />
            <br><br>
            <p>Tổng thanh toán: ${payable} VND</p>
        `;

        // Sau 10 giây, ẩn QR code và hiển thị thông báo thành công
        setTimeout(() => {
            $("#qr").css("display", "none");
            $("#success").css("display", "grid");
            
            // Xóa sản phẩm khỏi giỏ hàng
            deleteProducts();
        }, 10000);
    } catch (error) {
        console.error("Lỗi trong quá trình thanh toán:", error);
        
        // Khôi phục nút thanh toán nếu có lỗi
        document.getElementById('2').innerHTML = "THANH TOÁN";
    }
};

// =============================================
// KHỞI ĐỘNG HỆ THỐNG
// =============================================
window.onload = () => {
    // Thiết lập cập nhật sản phẩm tự động mỗi 100ms
    setInterval(function () {
        loadProducts();
    }, 100);
    
    // Hiển thị số đơn hàng tiếp theo
    const nextOrder = orderCounter + 1;
    document.getElementById('next-order').innerText = `Số đơn hàng tiếp theo: ${nextOrder}`;
};
