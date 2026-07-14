import React, { useEffect, useState, useCallback } from 'react';

// Định nghĩa kiểu dữ liệu cho TypeScript
interface ApplePayResult {
  token: any;
}

export const ApplePayTest = () => {
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('Checking device...');

  // 1. Hàm nạp SDK chính thức từ CDN của Apple
  const loadApplePayScript = useCallback((): Promise<void> => {
    if ((window as any).ApplePaySession) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = "https://applepay.cdn-apple.com/jsapi/1.latest/apple-pay-sdk.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Can not load SDK Apple Pay'));
      document.head.appendChild(script);
    });
  }, []);

  // 2. Giả lập hàm gửi Token về Backend xử lý thanh toán
  const mockBackendCharge = (applePayResult: ApplePayResult, session: any) => {
    setStatusMessage('Đang gửi token thẻ về server giả lập...');
    console.log('Token nhận được từ Apple:', applePayResult.token);

    // Giả lập thời gian server xử lý mất 2 giây
    setTimeout(() => {
      const isSuccess = true; // Bạn có thể đổi thành false để test case thất bại

      if (isSuccess) {
        setStatusMessage('🎉 Thanh toán thành công! Server đã nhận tiền.');
        // Hiện dấu tick xanh (✓) trên màn hình Apple Pay của iPhone
        session.completePayment((window as any).ApplePaySession.STATUS_SUCCESS);
      } else {
        setStatusMessage('❌ Server từ chối thanh toán (Thẻ lỗi hoặc hết tiền).');
        // Hiện dấu X báo lỗi trên màn hình Apple Pay
        session.completePayment((window as any).ApplePaySession.STATUS_FAILURE);
      }
    }, 2000);
  };

  // 3. Hàm xử lý khi khách hàng click vào nút Apple Pay
  const handleApplePayClick = useCallback(() => {
    if (!(window as any).ApplePaySession) {
      alert('Trình duyệt/Thiết bị này không hỗ trợ Apple Pay thực tế.');
      return;
    }

    // Cấu hình số tiền hiển thị trên Pop-up Apple Pay
    const paymentRequest = {
      countryCode: 'US', // Mã quốc gia thử nghiệm
      currencyCode: 'USD',
      supportedNetworks: ['visa', 'masterCard', 'amex'],
      merchantCapabilities: ['supports3DS'],
      total: {
        label: 'CỬA HÀNG DEMO GITHUB',
        amount: '10.00' // Số tiền test: $10.00
      }
    };

    // Khởi tạo phiên giao dịch (Môi trường test cần chạy ApplePaySession phiên bản 3)
    const session = new (window as any).ApplePaySession(3, paymentRequest);

    // Sự kiện 1: Xác thực Tên miền (Khi hiện pop-up)
    session.onvalidatemerchant = (event: any) => {
      setStatusMessage('Đang xác thực Merchant Domain ngầm...');
      
      // LƯU Ý QUAN TRỌNG: Vì chạy trên môi trường test GitHub/Vercel không có server thật ký số, 
      // Apple Pay thật sẽ bị chặn ở đây. Nhưng trong môi trường ví "Sandbox" của Apple, 
      // bạn có thể truyền một Object giả lập để đi tiếp sang bước quét vân tay.
      const mockMerchantSession = {
        epochTimestamp: Date.now(),
        expiresAt: Date.now() + 3600000,
        merchantSessionIdentifier: "mock_id",
        nonce: "mock_nonce",
        merchantIdentifier: "mock_merchant",
        domainName: window.location.hostname,
        displayName: "Demo Shop",
        signature: "mock_signature"
      };
      
      session.completeMerchantValidation(mockMerchantSession);
    };

    // Sự kiện 2: Người dùng quét FaceID/Vân tay thành công trên điện thoại
    session.onpaymentauthorized = (event: any) => {
      const result: ApplePayResult = {
        token: event.payment.token
      };
      // Gọi hàm đẩy dữ liệu lên "server"
      mockBackendCharge(result, session);
    };

    // Sự kiện khi người dùng chủ động tắt pop-up Apple Pay đi
    session.oncancel = () => {
      setStatusMessage('Người dùng đã hủy phiên thanh toán.');
    };

    // Bắt đầu bật Pop-up/Bảng quét vân tay lên
    session.begin();
  }, []);

  // 4. Hook tự động kiểm tra thiết bị và render nút bấm ra màn hình
  useEffect(() => {
    if (isInitialized) return;

    const initializeApplePay = async () => {
      try {
        // Kiểm tra xem có đúng là thiết bị họ nhà Apple không
        // const isAppleDevice = /Macintosh|iPhone|iPad|iPod/.test(navigator.userAgent);
        // if (!isAppleDevice) {
        //   setStatusMessage('⚠️ Vui lòng sử dụng iPhone, iPad hoặc máy Mac (Safari) để thấy nút Apple Pay.');
        //   return;
        // }

        // Nạp file JS SDK của Apple
        await loadApplePayScript();

        // Tìm thẻ div placeholder
        const placeholder = document.querySelector("#applepay-button-container");
        if (!placeholder) return;

        setIsInitialized(true);
        setStatusMessage('📱 Thiết bị hợp lệ. Sẵn sàng thanh toán!');

        // Khởi tạo Custom Element độc quyền của Apple
        const appleBtn = document.createElement('apple-pay-button');
        appleBtn.setAttribute('buttonstyle', 'black');
        appleBtn.setAttribute('type', 'buy');
        appleBtn.setAttribute('locale', 'en-US');
        
        (appleBtn as any).style.display = 'block';
        (appleBtn as any).style.width = '100%';
        (appleBtn as any).style.height = '50px';
        (appleBtn as any).style.cursor = 'pointer';

        appleBtn.onclick = handleApplePayClick;

        placeholder.appendChild(appleBtn);

      } catch (error) {
        console.error(error);
        setStatusMessage('❌ Lỗi không thể khởi tạo cấu hình Apple Pay.');
      }
    };

    initializeApplePay();
  }, [isInitialized, loadApplePayScript, handleApplePayClick]);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', textAlign: 'center', maxWidth: '400px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '10px' }}>Test Apple Pay Https</h2>
      <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>Trạng thái hệ thống: <b>{statusMessage}</b></p>
      
      {/* Nơi chứa nút Apple Pay sẽ được chèn vào */}
      <div id="applepay-button-container" style={{ width: '100%', minHeight: '50px' }}></div>
      
      <div style={{ marginTop: '30px', fontSize: '12px', color: '#999', textAlign: 'left', borderTop: '1px solid #eee', paddingTop: '15px' }}>
        <p>💡 <b>Mẹo Test:</b></p>
        <ul>
          <li>Mở trang này bằng <b>Safari trên iPhone</b>.</li>
          <li>Để pop-up hiện lên mà không lỗi xác thực thật, tài khoản iCloud trên iPhone của bạn nên là tài khoản <b>Apple Developer Sandbox</b>.</li>
        </ul>
      </div>
    </div>
  );
};