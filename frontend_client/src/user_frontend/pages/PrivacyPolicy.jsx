import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Shield, Lock, Eye, UserCheck, Database, Mail, AlertTriangle } from 'lucide-react';
import '../styles/PrivacyPolicy.css';

const PrivacyPolicy = () => {
  return (
    <div className="policy-page">
      <div className="policy-container">

        {/* Header */}
        <div className="policy-header">
          <div className="policy-header-icon">
            <Shield size={48} />
          </div>
          <h1>Chính Sách Bảo Mật</h1>
          <p>Cập nhật lần cuối: 16 tháng 07, 2026</p>
          <div className="policy-header-line"></div>
        </div>

        {/* Breadcrumb */}
        <div className="policy-breadcrumb">
          <Link to="/">Trang chủ</Link>
          <ChevronRight size={14} />
          <span>Hỗ trợ</span>
          <ChevronRight size={14} />
          <span className="current">Chính sách bảo mật</span>
        </div>

        {/* Nội dung */}
        <div className="policy-content">

          <section className="policy-section">
            <h2><Lock size={24} /> 1. Giới thiệu chung</h2>
            <p>
              CineStar cam kết bảo vệ quyền riêng tư và thông tin cá nhân của bạn. Chính sách bảo mật này giải thích cách chúng tôi thu thập, sử dụng, lưu trữ và bảo vệ dữ liệu của bạn khi bạn sử dụng dịch vụ đặt vé xem phim trực tuyến của CineStar, bao gồm website <strong>cinemastar.vn</strong> và ứng dụng di động (gọi chung là "Nền tảng").
            </p>
            <p>
              Chúng tôi tuân thủ các quy định bảo vệ dữ liệu hiện hành tại Việt Nam và các tiêu chuẩn quốc tế về bảo mật thông tin. Bằng việc sử dụng Nền tảng của chúng tôi, bạn đồng ý với các điều khoản trong chính sách này. Nếu bạn không đồng ý, vui lòng không sử dụng dịch vụ của chúng tôi.
            </p>
          </section>

          <section className="policy-section">
            <h2><Database size={24} /> 2. Thông tin chúng tôi thu thập</h2>
            <p>Chúng tôi thu thập các loại thông tin sau để phục vụ việc đặt vé, thanh toán, và cải thiện trải nghiệm của bạn:</p>

            <h3>2.1. Thông tin bạn cung cấp trực tiếp</h3>
            <ul>
              <li><strong>Thông tin tài khoản:</strong> Họ tên, email, số điện thoại, mật khẩu (được mã hóa), ngày sinh (tùy chọn).</li>
              <li><strong>Thông tin đặt vé:</strong> Phim, suất chiếu, rạp, vị trí ghế, số lượng vé, giá tiền.</li>
              <li><strong>Thông tin thanh toán:</strong> Số thẻ tín dụng/ghi nợ (mã hóa), thông tin ví điện tử, lịch sử giao dịch.</li>
              <li><strong>Thông tin liên hệ:</strong> Khi bạn gửi yêu cầu hỗ trợ qua email, hotline, hoặc chat.</li>
            </ul>

            <h3>2.2. Thông tin thu thập tự động</h3>
            <ul>
              <li><strong>Dữ liệu thiết bị:</strong> Loại thiết bị, hệ điều hành, trình duyệt, địa chỉ IP, cài đặt ngôn ngữ.</li>
              <li><strong>Dữ liệu sử dụng:</strong> Lịch sử xem phim, thời gian truy cập, các trang bạn đã xem, hành vi nhấp chuột.</li>
              <li><strong>Dữ liệu vị trí:</strong> Vị trí địa lý gần đúng (để đề xuất rạp gần bạn).</li>
              <li><strong>Cookie và công nghệ tương tự:</strong> Chúng tôi sử dụng cookie để ghi nhớ phiên đăng nhập, tùy chọn ngôn ngữ và phân tích hành vi.</li>
            </ul>
          </section>

          <section className="policy-section">
            <h2><Eye size={24} /> 3. Mục đích sử dụng thông tin</h2>
            <p>Chúng tôi sử dụng thông tin của bạn cho các mục đích sau:</p>
            <ul>
              <li><strong>Xử lý đặt vé và thanh toán:</strong> Để xác nhận đặt vé, thanh toán, và gửi mã vé điện tử.</li>
              <li><strong>Quản lý tài khoản:</strong> Để duy trì tài khoản của bạn, lịch sử đặt vé, và tích lũy điểm thưởng.</li>
              <li><strong>Hỗ trợ khách hàng:</strong> Để phản hồi các yêu cầu hỗ trợ, khiếu nại, và giải đáp thắc mắc.</li>
              <li><strong>Cải thiện dịch vụ:</strong> Để phân tích dữ liệu sử dụng, tối ưu hóa trải nghiệm người dùng, và phát triển tính năng mới.</li>
              <li><strong>Tiếp thị và khuyến mãi:</strong> Gửi thông tin về các chương trình ưu đãi, phim mới, và sự kiện đặc biệt (chỉ khi bạn đồng ý nhận).</li>
              <li><strong>Bảo mật và phòng chống gian lận:</strong> Để phát hiện và ngăn chặn các hành vi gian lận, truy cập trái phép, hoặc vi phạm điều khoản.</li>
            </ul>
          </section>

          <section className="policy-section">
            <h2><UserCheck size={24} /> 4. Chia sẻ thông tin với bên thứ ba</h2>
            <p>
              Chúng tôi <strong>không bán, cho thuê hoặc chia sẻ</strong> thông tin cá nhân của bạn với bên thứ ba vì mục đích tiếp thị. Tuy nhiên, chúng tôi có thể chia sẻ thông tin của bạn trong các trường hợp sau:
            </p>
            <ul>
              <li><strong>Đối tác thanh toán:</strong> Chúng tôi chia sẻ thông tin thanh toán với các đối tác thanh toán (ví điện tử, ngân hàng, cổng thanh toán) để xử lý giao dịch. Các đối tác này tuân thủ các tiêu chuẩn bảo mật PCI DSS.</li>
              <li><strong>Đối tác vận chuyển / cung cấp dịch vụ:</strong> Trong trường hợp có giao dịch liên quan đến voucher hoặc quà tặng, chúng tôi có thể chia sẻ thông tin giao hàng với đơn vị vận chuyển.</li>
              <li><strong>Yêu cầu pháp lý:</strong> Nếu pháp luật yêu cầu hoặc để bảo vệ quyền lợi của CineStar, chúng tôi có thể tiết lộ thông tin cho cơ quan có thẩm quyền.</li>
              <li><strong>Nhà cung cấp dịch vụ kỹ thuật:</strong> Chúng tôi có thể thuê các nhà cung cấp dịch vụ (lưu trữ, phân tích dữ liệu, email marketing) để hỗ trợ hoạt động. Các nhà cung cấp này chỉ được phép sử dụng thông tin của bạn để thực hiện các dịch vụ được chỉ định và không được sử dụng cho mục đích khác.</li>
            </ul>
          </section>

          <section className="policy-section">
            <h2><Lock size={24} /> 5. Bảo mật thông tin</h2>
            <p>
              Chúng tôi áp dụng các biện pháp bảo mật tiên tiến để bảo vệ thông tin của bạn khỏi truy cập trái phép, thay đổi, tiết lộ hoặc phá hủy:
            </p>
            <ul>
              <li><strong>Mã hóa SSL 256-bit:</strong> Toàn bộ dữ liệu truyền giữa bạn và máy chủ của chúng tôi được mã hóa bằng SSL/TLS.</li>
              <li><strong>Mã hóa dữ liệu nhạy cảm:</strong> Thông tin thanh toán và mật khẩu được mã hóa khi lưu trữ.</li>
              <li><strong>Kiểm soát truy cập nội bộ:</strong> Chỉ nhân viên được ủy quyền mới có thể truy cập thông tin cá nhân, và họ phải tuân thủ các quy định bảo mật nghiêm ngặt.</li>
              <li><strong>Giám sát và phát hiện xâm nhập:</strong> Chúng tôi sử dụng các công cụ giám sát để phát hiện và ngăn chặn các hoạt động đáng ngờ.</li>
              <li><strong>Đào tạo nhân viên:</strong> Tất cả nhân viên của CineStar đều được đào tạo về bảo mật thông tin và quyền riêng tư.</li>
            </ul>
          </section>

          <section className="policy-section">
            <h2><AlertTriangle size={24} /> 6. Quyền của bạn</h2>
            <p>Bạn có các quyền sau đối với thông tin cá nhân của mình:</p>
            <ul>
              <li><strong>Quyền truy cập:</strong> Bạn có thể yêu cầu xem bản sao thông tin cá nhân mà chúng tôi đang lưu giữ.</li>
              <li><strong>Quyền sửa đổi:</strong> Bạn có thể cập nhật hoặc chỉnh sửa thông tin của mình bất cứ lúc nào thông qua tài khoản.</li>
              <li><strong>Quyền xóa:</strong> Bạn có thể yêu cầu xóa tài khoản và thông tin cá nhân của mình. Lưu ý rằng một số dữ liệu có thể được giữ lại để tuân thủ pháp luật hoặc giải quyết tranh chấp.</li>
              <li><strong>Quyền từ chối tiếp thị:</strong> Bạn có thể hủy đăng ký nhận email tiếp thị bất cứ lúc nào bằng cách nhấp vào liên kết "Hủy đăng ký" trong email.</li>
              <li><strong>Quyền khiếu nại:</strong> Bạn có quyền khiếu nại với cơ quan quản lý dữ liệu nếu bạn cho rằng quyền của mình bị vi phạm.</li>
            </ul>
            <p>Để thực hiện các quyền này, vui lòng liên hệ với chúng tôi qua email <strong>support@cinemastar.vn</strong> hoặc hotline <strong>1900 1234</strong>.</p>
          </section>

          <section className="policy-section">
            <h2><Mail size={24} /> 7. Cookie và công nghệ tương tự</h2>
            <p>
              CineStar sử dụng cookie và các công nghệ tương tự để cải thiện trải nghiệm của bạn. Cookie là các tệp nhỏ được lưu trên thiết bị của bạn để ghi nhớ sở thích và hành vi.
            </p>
            <ul>
              <li><strong>Cookie cần thiết:</strong> Giúp trang web hoạt động cơ bản (đăng nhập, giỏ hàng).</li>
              <li><strong>Cookie phân tích:</strong> Thu thập dữ liệu ẩn danh về cách bạn sử dụng trang web để chúng tôi cải thiện dịch vụ.</li>
              <li><strong>Cookie chức năng:</strong> Ghi nhớ tùy chọn của bạn (ngôn ngữ, rạp yêu thích).</li>
              <li><strong>Cookie tiếp thị:</strong> Được sử dụng để hiển thị quảng cáo phù hợp với bạn.</li>
            </ul>
            <p>Bạn có thể kiểm soát cookie thông qua cài đặt trình duyệt. Tuy nhiên, việc tắt cookie có thể ảnh hưởng đến một số chức năng của Nền tảng.</p>
          </section>

          <section className="policy-section">
            <h2>8. Thời gian lưu trữ dữ liệu</h2>
            <p>
              Chúng tôi lưu trữ thông tin của bạn trong thời gian cần thiết để cung cấp dịch vụ và tuân thủ các nghĩa vụ pháp lý. Thông thường:
            </p>
            <ul>
              <li><strong>Dữ liệu tài khoản:</strong> Lưu trữ cho đến khi bạn yêu cầu xóa tài khoản.</li>
              <li><strong>Lịch sử đặt vé:</strong> Được lưu trữ để phục vụ các yêu cầu hỗ trợ và đối chiếu trong vòng 5 năm.</li>
              <li><strong>Dữ liệu thanh toán:</strong> Được lưu trữ theo yêu cầu của pháp luật về kế toán và thuế (tối thiểu 5 năm).</li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>9. Thay đổi chính sách</h2>
            <p>
              Chúng tôi có thể cập nhật chính sách bảo mật này theo thời gian. Khi có thay đổi quan trọng, chúng tôi sẽ thông báo cho bạn qua email hoặc thông báo trên Nền tảng. Chúng tôi khuyến khích bạn thường xuyên xem lại chính sách này để cập nhật.
            </p>
            <p>
              <strong>Phiên bản hiện tại:</strong> 16 tháng 07, 2026.
            </p>
          </section>

          <section className="policy-section">
            <h2>10. Liên hệ với chúng tôi</h2>
            <p>
              Nếu bạn có bất kỳ câu hỏi hoặc yêu cầu nào liên quan đến chính sách bảo mật, vui lòng liên hệ với chúng tôi qua:
            </p>
            <ul>
              <li><strong>Email:</strong> support@cinemastar.vn</li>
              <li><strong>Hotline:</strong> 1900 1234 (hoạt động 24/7)</li>
              <li><strong>Địa chỉ:</strong> 123 Đường Số 7, Bình Tân, TP. Hồ Chí Minh</li>
            </ul>
            <p>
              Chúng tôi luôn sẵn sàng hỗ trợ bạn!
            </p>
          </section>

        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;