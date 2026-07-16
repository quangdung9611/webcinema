import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, FileText, AlertCircle, CheckCircle, Scale, Users, CreditCard, Ticket } from 'lucide-react';
import '../styles/TermsOfService.css';

const TermsOfService = () => {
  return (
    <div className="terms-page">
      <div className="terms-container">

        {/* Header */}
        <div className="terms-header">
          <div className="terms-header-icon">
            <FileText size={48} />
          </div>
          <h1>Điều Khoản Sử Dụng</h1>
          <p>Cập nhật lần cuối: 16 tháng 07, 2026</p>
          <div className="terms-header-line"></div>
        </div>

        {/* Breadcrumb */}
        <div className="terms-breadcrumb">
          <Link to="/">Trang chủ</Link>
          <ChevronRight size={14} />
          <span>Hỗ trợ</span>
          <ChevronRight size={14} />
          <span className="current">Điều khoản sử dụng</span>
        </div>

        {/* Nội dung */}
        <div className="terms-content">

          <section className="terms-section">
            <h2><Scale size={24} /> 1. Giới thiệu và chấp nhận điều khoản</h2>
            <p>
              Chào mừng bạn đến với CineStar! Điều khoản sử dụng này ("Điều khoản") điều chỉnh việc bạn truy cập và sử dụng Nền tảng của CineStar, bao gồm website <strong>cinemastar.vn</strong>, ứng dụng di động, và các dịch vụ liên quan (gọi chung là "Dịch vụ").
            </p>
            <p>
              Bằng việc truy cập hoặc sử dụng Dịch vụ, bạn đồng ý tuân thủ các Điều khoản này. Nếu bạn không đồng ý, vui lòng không sử dụng Dịch vụ của chúng tôi. Chúng tôi có quyền thay đổi các Điều khoản này bất kỳ lúc nào. Việc tiếp tục sử dụng Dịch vụ sau khi có thay đổi được coi là bạn đã chấp nhận các điều khoản mới.
            </p>
          </section>

          <section className="terms-section">
            <h2><Users size={24} /> 2. Điều kiện sử dụng</h2>
            <p>Bạn đồng ý rằng:</p>
            <ul>
              <li>Bạn ít nhất 16 tuổi hoặc có sự đồng ý của phụ huynh/người giám hộ.</li>
              <li>Bạn cung cấp thông tin chính xác, đầy đủ và cập nhật khi đăng ký tài khoản.</li>
              <li>Bạn chịu trách nhiệm bảo mật mật khẩu và tất cả hoạt động trên tài khoản của mình.</li>
              <li>Bạn sử dụng Dịch vụ cho mục đích cá nhân, không thương mại, trừ khi được chúng tôi cho phép.</li>
              <li>Bạn không sử dụng Dịch vụ để thực hiện các hành vi bất hợp pháp, lừa đảo, hoặc gây hại đến CineStar hoặc người khác.</li>
              <li>Bạn không can thiệp vào hoạt động của Dịch vụ hoặc cố gắng truy cập trái phép vào hệ thống của chúng tôi.</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2><Ticket size={24} /> 3. Đặt vé và thanh toán</h2>
            <p><strong>3.1. Quy trình đặt vé:</strong></p>
            <ul>
              <li>Để đặt vé, bạn cần chọn phim, suất chiếu, rạp, vị trí ghế và tiến hành thanh toán.</li>
              <li>Sau khi thanh toán thành công, bạn sẽ nhận được mã vé điện tử qua email và SMS. Mã vé này là hợp lệ duy nhất.</li>
              <li>Vé đã đặt có thể được hủy theo chính sách hủy vé được quy định tại mục 6.</li>
            </ul>

            <p><strong>3.2. Thanh toán:</strong></p>
            <ul>
              <li>Chúng tôi hỗ trợ thanh toán qua thẻ tín dụng/ghi nợ (Visa, MasterCard, JCB), ví điện tử (MoMo, ZaloPay, VNPay), và chuyển khoản ngân hàng.</li>
              <li>Giá vé được niêm yết tại thời điểm đặt và có thể thay đổi theo chương trình khuyến mãi hoặc thời điểm chiếu.</li>
              <li>Mọi giao dịch thanh toán đều được bảo mật bằng công nghệ mã hóa SSL 256-bit.</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2><AlertCircle size={24} /> 4. Quyền sở hữu trí tuệ</h2>
            <p>
              Tất cả nội dung trên Nền tảng CineStar, bao gồm nhưng không giới hạn: văn bản, hình ảnh, đồ họa, logo, biểu trưng, giao diện, mã nguồn, phần mềm và các tài liệu khác, đều là tài sản của CineStar hoặc các đối tác cấp phép. Bạn không được phép sao chép, phân phối, sửa đổi, hoặc sử dụng bất kỳ nội dung nào cho mục đích thương mại mà không có sự đồng ý bằng văn bản từ CineStar.
            </p>
          </section>

          <section className="terms-section">
            <h2><CheckCircle size={24} /> 5. Trách nhiệm của CineStar</h2>
            <p>
              CineStar luôn nỗ lực cung cấp Dịch vụ với chất lượng tốt nhất và ổn định nhất. Tuy nhiên, chúng tôi không thể đảm bảo rằng Dịch vụ sẽ không bị gián đoạn, lỗi, hoặc virus. Chúng tôi không chịu trách nhiệm đối với các thiệt hại gián tiếp, ngẫu nhiên, hoặc hậu quả phát sinh từ việc sử dụng Dịch vụ.
            </p>
            <p>
              Trong trường hợp sự cố kỹ thuật hoặc hủy suất chiếu từ phía rạp, chúng tôi sẽ hoàn trả tiền vé hoặc bồi thường theo chính sách hủy vé và hoàn tiền.
            </p>
          </section>

          <section className="terms-section">
            <h2><AlertCircle size={24} /> 6. Chính sách hủy vé và hoàn tiền</h2>
            <p><strong>6.1. Hủy vé trước 2 giờ so với suất chiếu:</strong> Bạn sẽ được hoàn lại <strong>100%</strong> tiền vé. Vui lòng liên hệ bộ phận hỗ trợ để xử lý.</p>
            <p><strong>6.2. Hủy vé trong vòng 2 giờ trước suất chiếu:</strong> Bạn sẽ được hoàn lại <strong>50%</strong> tiền vé.</p>
            <p><strong>6.3. Không hủy vé sau khi đã vào rạp hoặc khi suất chiếu đã bắt đầu.</strong></p>
            <p><strong>6.4. Sự cố kỹ thuật hoặc hủy suất chiếu từ rạp:</strong> CineStar sẽ hoàn trả toàn bộ tiền vé và có thể tặng thêm 01 vé xem phim miễn phí.</p>
          </section>

          <section className="terms-section">
            <h2><AlertCircle size={24} /> 7. Đình chỉ và chấm dứt tài khoản</h2>
            <p>
              CineStar có quyền đình chỉ hoặc chấm dứt tài khoản của bạn bất kỳ lúc nào nếu chúng tôi phát hiện bạn vi phạm các Điều khoản này, thực hiện hành vi gian lận, hoặc gây ảnh hưởng đến lợi ích của CineStar hoặc người dùng khác.
            </p>
            <p>
              Bạn cũng có quyền yêu cầu xóa tài khoản của mình bất kỳ lúc nào bằng cách liên hệ với bộ phận hỗ trợ.
            </p>
          </section>

          <section className="terms-section">
            <h2><AlertCircle size={24} /> 8. Giải quyết tranh chấp</h2>
            <p>
              Mọi tranh chấp phát sinh từ việc sử dụng Dịch vụ sẽ được giải quyết thông qua thương lượng giữa hai bên. Nếu không thể giải quyết, tranh chấp sẽ được đưa ra Tòa án nhân dân có thẩm quyền tại TP. Hồ Chí Minh theo quy định pháp luật Việt Nam.
            </p>
          </section>

          <section className="terms-section">
            <h2>9. Liên hệ</h2>
            <p>
              Nếu bạn có bất kỳ thắc mắc hoặc yêu cầu nào liên quan đến Điều khoản này, vui lòng liên hệ:
            </p>
            <ul>
              <li><strong>Email:</strong> support@cinemastar.vn</li>
              <li><strong>Hotline:</strong> 1900 1234</li>
              <li><strong>Địa chỉ:</strong> 123 Đường Số 7, Bình Tân, TP. Hồ Chí Minh</li>
            </ul>
          </section>

        </div>
      </div>
    </div>
  );
};

export default TermsOfService;