import { useEffect, useState, useCallback } from 'react';

interface ApplePayResult {
  token: any;
  shippingContact?: any;
  billingContact?: any;
}

interface UseApplePayProps {
  isLoadingCart: boolean;
  applePayJsUrl: string;
  magentoWebsiteCode: string;
}

export const useApplePay = ({ isLoadingCart, applePayJsUrl, magentoWebsiteCode }: UseApplePayProps) => {
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const storeUrl = document.body.dataset.graphql || '';

  const loadApplePayScript = useCallback((): Promise<void> => {
    if ((window as any).ApplePaySession) return Promise.resolve();
    
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = applePayJsUrl;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Apple Pay script'));
      document.head.appendChild(script);
    });
  }, [applePayJsUrl]);

  const handleApplePayClick = useCallback(() => {
    if (!(window as any).ApplePaySession) {
      alert('Apple Pay is not supported on this device/browser.');
      return;
    }

    const input = {
      use_existing_quote: '1',
      country_id: magentoWebsiteCode,
    };

    // Đảm bảo request có yêu cầu thông tin giao hàng nếu bạn muốn trigger onshippingcontactselected
    const paymentRequest = {
      countryCode: magentoWebsiteCode,
      currencyCode: "USD",
      supportedNetworks: ['visa', 'masterCard', 'amex'],
      merchantCapabilities: ['supports3DS'],
      requiredShippingContactFields: ['postalAddress', 'name', 'phone', 'email'], // Thêm dòng này để lấy thông tin giao hàng
      total: {
        label: 'Magento Store',
        amount: '10.00' // Nên set giá trị khởi điểm thực tế ở đây thay vì '0.00'
      }
    };

    const session = new (window as any).ApplePaySession(3, paymentRequest);

    // 1. CHỈ XỬ LÝ XÁC THỰC MERCHANT TẠI ĐÂY
    session.onvalidatemerchant = async (event: any) => {
      try {
        console.log(event.validationURL);

        // MOCK MERCHANT SESSION ĐỂ BẬT ĐƯỢC BẢNG TRÊN LINK HTTPS TEST
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

        // Thực tế deploy:
        /*
        const validationForm = new FormData();
        validationForm.set('validation_url', event.validationURL);
        const mockMerchantSession = await fetch(`${storeUrl}/checkout/applepay/validateMerchant`, {
          method: 'POST',
          body: validationForm
        }).then(res => res.json());
        */

        session.completeMerchantValidation(mockMerchantSession);

      } catch (error) {
        console.error(error);
        session.abort();
      }
    };

    // 2. DI CHUYỂN HÀM completeShippingContactSelection VỀ ĐÚNG SỰ KIỆN NÀY
    session.onshippingcontactselected = async (event: any) => {
      try {
        const form = new FormData();
        form.set('additional_input', JSON.stringify(input));
        form.set('shipping_address', JSON.stringify(event.shippingContact));

        // Mock dữ liệu giỏ hàng sau khi tính toán phí vận chuyển mới
        const cartData = { grand_total: '12.50' }; 

        /* Thực tế deploy:
        const cartData = await fetch(`${storeUrl}/checkout/applepay/getPayLoad`, {
          method: 'POST',
          body: form
        }).then(res => res.json());
        */

        // Các tham số truyền vào: Status, Shipping Methods, New Total, Line Items
        session.completeShippingContactSelection(
          (window as any).ApplePaySession.STATUS_SUCCESS,
          [], // Các phương thức vận chuyển khả dụng (nếu có)
          { label: 'Magento Store', amount: cartData.grand_total }, 
          []  // Các dòng chi tiết hóa đơn (Line items)
        );
      } catch (error) {
        console.error(error);
        session.completeShippingContactSelection(
          (window as any).ApplePaySession.STATUS_FAILURE,
          [],
          { label: 'Magento Store', amount: '0.00' },
          []
        );
      }
    };

    // 3. XÁC NHẬN THANH TOÁN
    session.onpaymentauthorized = (event: any) => {
      const result: ApplePayResult = { token: event.payment.token };
      console.log('Token từ Apple:', result.token);
      
      // Giả lập xử lý backend thành công
      session.completePayment((window as any).ApplePaySession.STATUS_SUCCESS);
      alert('Thanh toán thành công (Môi trường Test)!');
    };

    session.begin();
  }, [storeUrl, magentoWebsiteCode]);

  useEffect(() => {    
    if (isLoadingCart || isInitialized) return;

    const initializeApplePay = async () => {
      try {
        await loadApplePayScript();
        
        if (!(window as any).ApplePaySession || !(window as any).ApplePaySession.canMakePayments()) {
          return;
        }

        const applePayPlaceholder = document.querySelector("#applepay-kec-placeholder");
        if (!applePayPlaceholder) return;

        setIsInitialized(true);

        const btn = document.createElement('button');
        btn.style.appearance = '-apple-pay-button';
        btn.style.width = '100%';
        btn.style.height = '48px';
        btn.style.cursor = 'pointer';
        btn.onclick = handleApplePayClick;

        applePayPlaceholder.appendChild(btn);

      } catch (error) {
        console.error('Failed to initialize Apple Pay:', error);
        setIsInitialized(false);
      }
    };

    initializeApplePay();
  }, [isLoadingCart, isInitialized, loadApplePayScript, handleApplePayClick]);
};