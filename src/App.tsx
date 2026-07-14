import React from 'react';
import { useApplePay } from './useApplePay';

function App() {
  // Gọi Custom Hook và truyền các tham số cần thiết vào
  useApplePay({
    isLoadingCart: false, // Set false để kích hoạt ngay lập tức
    applePayJsUrl: 'https://applepay.cdn-apple.com/jsapi/1.latest/apple-pay-sdk.js',
    magentoWebsiteCode: 'US'
  });

  return (
    <div style={{
      padding: '50px 20px',
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center',
      maxWidth: '400px',
      margin: '0 auto'
    }}>
      <h2>Dự Án Thử Nghiệm Apple Pay</h2>
      <p style={{ color: '#666', fontSize: '14px', marginBottom: '30px' }}>
        Nút bấm sẽ tự động xuất hiện bên dưới nếu bạn truy cập bằng Safari trên iPhone/Mac.
      </p>

      {/* Đây là vùng placeholder mà hook sẽ tìm để chèn nút bấm Apple Pay vào */}
      <div id="applepay-kec-placeholder" style={{ width: '100%', minHeight: '48px' }}></div>
    </div>
  );
}

export default App;