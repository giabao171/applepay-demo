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

  const handleApplePayApproval = useCallback((applePayResult: ApplePayResult, input: any, session: any) => {
    const parameter = new FormData();
    parameter.set('additional_input', JSON.stringify(input));
    parameter.set('apple_pay_token', JSON.stringify(applePayResult.token));
    
    fetch(`${storeUrl}/kec/applepay/updateQuoteAddress`, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: parameter,
      cache: 'no-cache'
    })
    .then(response => response.json())
    .then(data => {
      if (data.status !== 200) {
        alert('Failure processing Apple Pay payment.');
        session.completePayment((window as any).ApplePaySession.STATUS_FAILURE);
      } else {
        session.completePayment((window as any).ApplePaySession.STATUS_SUCCESS);
        window.location.replace(`${storeUrl}/checkout/onepage/success`);
      }
    })
    .catch(() => {
      alert('Error processing Apple Pay payment.');
      session.completePayment((window as any).ApplePaySession.STATUS_FAILURE);
    });
  }, [storeUrl]);

  const handleApplePayClick = useCallback(() => {
    if (!(window as any).ApplePaySession) {
      alert('Apple Pay is not supported on this device/browser.');
      return;
    }

    const input = {
      use_existing_quote: '1',
      country_id: magentoWebsiteCode,
    };

    const paymentRequest = {
      countryCode: magentoWebsiteCode,
      currencyCode: "USD",
      supportedNetworks: ['visa', 'masterCard', 'amex'],
      merchantCapabilities: ['supports3DS'],
      total: {
        label: 'Magento Store',
        amount: '0.00' // Giá trị tạm, sẽ update thực tế tại onvalidatemerchant
      }
    };

    const session = new (window as any).ApplePaySession(3, paymentRequest);

    session.onvalidatemerchant = async (event: any) => {
      try {
        const form = new FormData();
        form.set('additional_input', JSON.stringify(input));
        
        // MOCK GIÁ TRỊ KHI TEST TRÊN GITHUB/VERCEL KHÔNG CÓ SERVER MAGENTO
        // Khi deploy thực tế, bạn mở comment dòng fetch này ra
        /*
        const cartData = await fetch(`${storeUrl}/checkout/applepay/getPayLoad`, {
          method: 'POST',
          body: form
        }).then(res => res.json());
        */
        const cartData = { grand_total: '10.00' }; // Giá trị giả lập để test

        session.completeShippingContactSelection(
          (window as any).ApplePaySession.STATUS_SUCCESS,
          [], 
          { label: 'Magento Store', amount: cartData.grand_total }, 
          []
        );

        // MOCK MERCHANT SESSION ĐỂ BẬT ĐƯỢC BẢNG QUÉT VÂN TAY TRÊN LINK HTTPS TEST
        /*
        const validationForm = new FormData();
        validationForm.set('validation_url', event.validationURL);
        const merchantSession = await fetch(`${storeUrl}/checkout/applepay/validateMerchant`, {
          method: 'POST',
          body: validationForm
        }).then(res => res.json());
        */
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

      } catch (error) {
        console.error(error);
        session.abort();
      }
    };

    session.onpaymentauthorized = (event: any) => {
      const result: ApplePayResult = { token: event.payment.token };
      // Giả lập xử lý backend khi test trên Vercel
      console.log('Token từ Apple:', result.token);
      session.completePayment((window as any).ApplePaySession.STATUS_SUCCESS);
      alert('Thanh toán thành công (Môi trường Test)!');
    };

    session.begin();
  }, [storeUrl, magentoWebsiteCode]);

  useEffect(() => {    
    if (isLoadingCart || isInitialized) return;

    const initializeApplePay = async () => {
      try {
        // const isAppleDevice = /Macintosh|iPhone|iPad|iPod/.test(navigator.userAgent);
        // if (!isAppleDevice) return;

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
        btn.style.height = '48px'; // Tăng lên 48px chuẩn Apple
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