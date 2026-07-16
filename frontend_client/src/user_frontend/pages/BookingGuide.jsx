import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Ticket, CreditCard, Smartphone, MapPin, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import '../styles/BookingGuide.css';

const BookingGuide = () => {
  return (
    <div className="guide-page">
      <div className="guide-container">

        {/* Header */}
        <div className="guide-header">
          <div className="guide-header-icon">
            <Ticket size={48} />
          </div>
          <h1>Hướng Dẫn Đặt Vé</h1>
          <p>Đặt vé xem phim tại CineStar chưa bao giờ dễ dàng hơn!</p>
          <div className="guide-header-line"></div>
        </div>

        {/* Breadcrumb */}
        <div className="guide-breadcrumb">
          <Link to="/">Trang chủ</Link>
          <ChevronRight size={14} />
          <span>Hỗ trợ</span>
          <ChevronRight size={14} />
          <span className="current">Hướng dẫn đặt vé</span>
        </div>

        {/* Nội dung */}
        <div className="guide-content">

          <section className="guide-intro">
            <p>
              Chào mừng bạn đến với hướng dẫn đặt vé trực tuyến của CineStar! Chúng tôi hướng dẫn bạn từng bước chi tiết để bạn có thể đặt vé xem phim một cách nhanh chóng, thuận tiện và an toàn nhất.
            </p>
            <div className="guide-highlight">
              <span className="guide-highlight-icon">✨</span>
              <span>Thời gian đặt vé trung bình: chỉ <strong>2 phút</strong></span>
            </div>
          </section>

          <section className="guide-step">
            <div className="guide-step-number">1</div>
            <div className="guide-step-content">
              <h2>Chọn phim bạn muốn xem</h2>
              <p>
                Truy cập trang chủ hoặc danh sách phim đang chiếu. Bạn có thể lọc phim theo thể loại, ngày chiếu, hoặc rạp gần bạn.
              </p>
              <ul>
                <li>Xem trailer và thông tin chi tiết về phim (nội dung, đạo diễn, diễn viên, thời lượng).</li>
                <li>Chọn phim yêu thích và nhấn nút <strong>"Đặt vé"</strong>.</li>
              </ul>
              <div className="guide-tip">
                <span>💡 Mẹo:</span> Bạn có thể đặt vé trước tối đa <strong>7 ngày</strong> để có nhiều lựa chọn ghế ngồi.
              </div>
            </div>
          </section>

          <section className="guide-step">
            <div className="guide-step-number">2</div>
            <div className="guide-step-content">
              <h2>Chọn suất chiếu và rạp</h2>
              <p>
                Sau khi chọn phim, hệ thống sẽ hiển thị các suất chiếu có sẵn tại các rạp của CineStar.
              </p>
              <ul>
                <li><strong>Chọn rạp:</strong> Xem danh sách các rạp và chọn rạp gần bạn nhất hoặc thuận tiện nhất.</li>
                <li><strong>Chọn ngày chiếu:</strong> Chọn ngày bạn muốn xem trong lịch.</li>
                <li><strong>Chọn giờ chiếu:</strong> Xem các suất chiếu trong ngày và chọn thời gian phù hợp.</li>
              </ul>
              <div className="guide-tip">
                <span>💡 Mẹo:</span> Sử dụng bộ lọc <strong>"Rạp gần tôi"</strong> để tìm rạp gần vị trí của bạn.
              </div>
            </div>
          </section>

          <section className="guide-step">
            <div className="guide-step-number">3</div>
            <div className="guide-step-content">
              <h2>Chọn ghế ngồi</h2>
              <p>
                Sơ đồ phòng chiếu sẽ hiển thị các vị trí ghế có sẵn (màu xanh) và ghế đã được đặt (màu đỏ).
              </p>
              <ul>
                <li>Nhấp vào vị trí ghế bạn muốn chọn. Bạn có thể chọn nhiều ghế cùng lúc.</li>
                <li>Ghế VIP, ghế đôi, hoặc khu vực đặc biệt sẽ được đánh dấu rõ ràng.</li>
                <li>Khi đã chọn xong, nhấn nút <strong>"Xác nhận ghế"</strong> để tiếp tục.</li>
              </ul>
              <div className="guide-tip">
                <span>💡 Mẹo:</span> Chọn ghế ở trung tâm hoặc hàng giữa để có trải nghiệm xem tốt nhất.
              </div>
            </div>
          </section>

          <section className="guide-step">
            <div className="guide-step-number">4</div>
            <div className="guide-step-content">
              <h2>Thanh toán</h2>
              <p>
                Kiểm tra lại thông tin đặt vé (phim, suất chiếu, rạp, ghế, số lượng vé và tổng tiền).
              </p>
              <ul>
                <li><strong>Chọn phương thức thanh toán:</strong> Thẻ tín dụng/ghi nợ, ví điện tử (MoMo, ZaloPay, VNPay), hoặc chuyển khoản ngân hàng.</li>
                <li><strong>Nhập mã giảm giá (nếu có):</strong> Áp dụng mã voucher hoặc điểm thưởng để giảm giá.</li>
                <li><strong>Xác nhận thanh toán:</strong> Nhấn nút <strong>"Thanh toán"</strong> và hoàn tất giao dịch.</li>
              </ul>
              <div className="guide-tip">
                <span>💡 Mẹo:</span> Nếu bạn là thành viên VIP, bạn sẽ được giảm giá lên đến <strong>20%</strong>.
              </div>
            </div>
          </section>

          <section className="guide-step">
            <div className="guide-step-number">5</div>
            <div className="guide-step-content">
              <h2>Nhận mã vé và đến rạp</h2>
              <p>
                Sau khi thanh toán thành công, bạn sẽ nhận được mã vé điện tử qua <strong>email</strong> và <strong>SMS</strong>.
              </p>
              <ul>
                <li><strong>Kiểm tra hộp thư:</strong> Nếu không thấy email, hãy kiểm tra thư mục Spam hoặc Junk.</li>
                <li><strong>Đến rạp:</strong> Xuất trình mã vé điện tử (hoặc mã QR) tại quầy soát vé hoặc máy tự động để vào rạp.</li>
                <li><strong>Thời gian:</strong> Nên đến rạp trước giờ chiếu ít nhất <strong>15 phút</strong> để nhận vé và chuẩn bị.</li>
              </ul>
              <div className="guide-tip">
                <span>💡 Mẹo:</span> Lưu mã vé vào điện thoại để tránh mất kết nối Internet khi đến rạp.
              </div>
            </div>
          </section>

          <section className="guide-extra">
            <h3><AlertCircle size={22} /> Lưu ý quan trọng</h3>
            <ul>
              <li><strong>Hủy vé:</strong> Bạn có thể hủy vé trước 2 giờ so với suất chiếu để được hoàn 100% tiền. Chi tiết xem tại <Link to="/booking-policy">Chính sách đặt vé</Link>.</li>
              <li><strong>Vé điện tử:</strong> Không làm hỏng hoặc chia sẻ mã vé với người khác vì mã vé chỉ có giá trị một lần.</li>
              <li><strong>Đổi vé:</strong> Không hỗ trợ đổi vé sang suất chiếu khác sau khi đã thanh toán.</li>
              <li><strong>Trẻ em:</strong> Vé trẻ em (dưới 1,2m) được giảm giá 50% so với vé người lớn.</li>
            </ul>
          </section>

          <section className="guide-support">
            <h3>Bạn cần hỗ trợ thêm?</h3>
            <p>
              Nếu bạn gặp bất kỳ vấn đề nào trong quá trình đặt vé, đừng ngần ngại liên hệ với chúng tôi qua:
            </p>
            <div className="guide-support-links">
              <Link to="/contact" className="guide-support-btn">
                <span>📞</span> Gọi ngay 1900 1234
              </Link>
              <Link to="/contact" className="guide-support-btn outline">
                <span>✉️</span> Gửi email hỗ trợ
              </Link>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default BookingGuide;