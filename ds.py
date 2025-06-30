#!/usr/bin/env python3

import time
import json
import cv2
import requests
import RPi.GPIO as GPIO
from collections import Counter
from hx711v0_5_1 import HX711
from picamera2 import Picamera2
from ultralytics import YOLO

# =============================================
# CẤU HÌNH HỆ THỐNG
# =============================================

# Cấu hình mô hình YOLO
YOLO_MODEL_PATH = "./my_model_ncnn_model"  # Đường dẫn đến model YOLO
YOLO_CONF_TH = 0.5  # Ngưỡng tin cậy cho phát hiện vật thể

# Cấu hình cảm biến trọng lượng HX711
HX_DT, HX_SCK = 5, 6       # Chân GPIO kết nối cảm biến
REFERENCE_UNIT = -414.493   # Hệ số hiệu chỉnh trọng lượng

# Cấu hình camera
CAMERA_RESOLUTION = (1280, 720)
CAMERA_FORMAT = 'RGB888'

# Giá bán và ánh xạ ID sản phẩm
UNIT_PRICE = {
    "apple": 10,
    "banana": 20,
    "guava": 15,
    "mango": 25,
    "orange": 12,
    "pear": 18
}

LABEL_TO_ID = {
    "apple": "1",
    "banana": "2",
    "guava": "3",
    "mango": "4",
    "orange": "5",
    "pear": "6"
}

# Cấu hình server
SERVER_URL = "https://four2000198.onrender.com/product"
HEADERS = {"Content-Type": "application/json"}

# =============================================
# KHỞI TẠO HỆ THỐNG
# =============================================

# Khởi tạo mô hình YOLO
model = YOLO(YOLO_MODEL_PATH, task="detect")

# Khởi tạo cảm biến trọng lượng
hx = HX711(HX_DT, HX_SCK)
hx.setReadingFormat("MSB", "MSB")
hx.autosetOffset()
hx.setReferenceUnit(REFERENCE_UNIT)

# Khởi tạo camera
picam = Picamera2()
picam.configure(picam.create_video_configuration(
    main={"format": CAMERA_FORMAT, "size": CAMERA_RESOLUTION}))
picam.start()
time.sleep(1)  # Chờ camera khởi động

# Biến toàn cục theo dõi trạng thái sản phẩm
prev_labels = {}  # Lưu trạng thái đã gửi của từng loại trái cây

# =============================================
# HÀM TIỆN ÍCH
# =============================================

def read_weight(samples=15):
    """Đọc trọng lượng trung bình từ cảm biến HX711"""
    weights = [hx.getWeight() for _ in range(samples)]
    avg_weight = sum(weights) / len(weights)
    return 0 if avg_weight < 0 else round(avg_weight)

def post_product(id, name, price, taken, payable, total_weight):
    """Gửi dữ liệu sản phẩm lên server"""
    payload = {
        "id": id,
        "name": name,
        "price": price,
        "taken": taken,
        "payable": payable,
        "total_weight": total_weight
    }
    try:
        resp = requests.post(SERVER_URL, headers=HEADERS, data=json.dumps(payload))
        print(f"POST {resp.status_code}: {payload}")
    except Exception as e:
        print("Error sending to server:", e)

# =============================================
# HÀM CHÍNH
# =============================================

def main():
    global prev_labels
    print("Khoi dong")

    try:
        while True:
            start_time = time.time()
            DETECT_WINDOW = 5  # Thời gian cửa sổ phát hiện (giây)
            detection_stats = {}  # Thống kê phát hiện theo thời gian
            frame_count = 0
            fps_sum = 0

            # Vòng lặp phát hiện trong khoảng thời gian DETECT_WINDOW
            while time.time() - start_time < DETECT_WINDOW:
                frame_start = time.time()
                
                # Bắt hình ảnh từ camera và phát hiện vật thể
                frame = picam.capture_array()
                results = model(frame, conf=YOLO_CONF_TH, verbose=False)
                frame_counts = {}  # Đếm vật thể trong frame hiện tại
                frame_count += 1

                # Đếm số lượng từng loại trái cây trong frame
                for box in results[0].boxes:
                    cls_idx = int(box.cls.item())
                    label = model.names[cls_idx].lower()
                    if label in UNIT_PRICE:  # Chỉ xử lý các loại trái cây được định nghĩa
                        frame_counts[label] = frame_counts.get(label, 0) + 1

                # Cập nhật thống kê tổng
                for label, count in frame_counts.items():
                    detection_stats.setdefault(label, []).append(count)

                # Tính toán và hiển thị thông tin FPS
                fps = 1.0 / (time.time() - frame_start)
                fps_sum += fps

                # Tính trung bình số lượng vật thể phát hiện được
                avg_counts = {
                    label: sum(counts) // len(counts) 
                    for label, counts in detection_stats.items()
                }
                total_items = sum(avg_counts.values())
                
                # Hiển thị thông tin lên console
                print(f"FPS: {fps:.2f}, Total: {total_items}, Details: {avg_counts if avg_counts else {}}, Weight: {read_weight()}g")

                # Hiển thị hình ảnh với bounding boxes
                cv2.imshow("Detect", results[0].plot())
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    raise KeyboardInterrupt

            # Nếu không phát hiện gì, reset trạng thái
            if not detection_stats:
                prev_labels = {}
                continue

            # Đọc trọng lượng (chỉ để log, không dùng để quyết định)
            weight = read_weight()

            # Xử lý từng loại trái cây đã phát hiện
            for label in detection_stats:
                counts = detection_stats[label]
                taken = round(sum(counts) / len(counts))  # Số lượng trung bình
                
                if taken == 0:  # Bỏ qua nếu không có vật thể
                    continue
                
                # Kiểm tra nếu đã gửi thông tin và chưa được gỡ bỏ
                if prev_labels.get(label, True) is False:
                    continue
                
                # Đánh dấu đã gửi thông tin
                prev_labels[label] = False
                
                # Tính toán thông tin thanh toán
                price = UNIT_PRICE.get(label, 0)
                product_id = LABEL_TO_ID.get(label, str(int(time.time())))
                payable = round(taken * price, 2)
                
                # Hiển thị và gửi thông tin
                print(f"{label.title()} x {taken} → {payable}k ({weight}g)")
                post_product(product_id, label.title(), price, taken, payable, weight)
                time.sleep(2)  # Chờ giữa các lần gửi

    except KeyboardInterrupt:
        print("\nDa dung chuong trinh.")
    finally:
        # Dọn dẹp tài nguyên
        picam.stop()
        GPIO.cleanup()
        cv2.destroyAllWindows()

if __name__ == "__main__":
    main()