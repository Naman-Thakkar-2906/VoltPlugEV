import api from '../api/axios';
import { logger } from '../utils/logger';

declare global {
  interface Window {
    Razorpay: any;
  }
}

class PaymentService {
  private scriptLoaded = false;

  loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.scriptLoaded) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        this.scriptLoaded = true;
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.body.appendChild(script);
    });
  }

  async processPayment(bookingId: string, onSuccess: () => void, onError: (msg: string) => void) {
    try {
      logger.log('--- Payment Process Started ---');
      const isScriptLoaded = await this.loadRazorpayScript();
      logger.log('Razorpay Script Loaded:', isScriptLoaded);
      logger.log('window.Razorpay:', window.Razorpay);

      if (!isScriptLoaded || !window.Razorpay) {
        onError('Razorpay SDK failed to load. Please check your connection.');
        return;
      }

      // 1. Create Order First
      logger.log('Creating order for booking:', bookingId);
      const orderResponse: any = await api.post('/payments/create-order', { bookingId });
      
      logger.log('Order Response:', orderResponse);

      if (!orderResponse.success) {
        onError(orderResponse.message || 'Failed to create payment order');
        return;
      }

      const { orderId, amount, currency, user } = orderResponse.data;

      // 2. Open Razorpay Checkout Modal
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID, // Use frontend env key
        amount: amount,
        currency: currency,
        name: 'VoltPlugEV',
        description: 'EV Charging Booking Payment',
        image: 'https://cdn-icons-png.flaticon.com/512/3104/3104856.png',
        order_id: orderId,
        handler: async (response: any) => {
          logger.log('Razorpay Success Callback:', response);
          try {
            // 3. Verify Payment ONLY after success callback
            const verifyResponse: any = await api.post('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bookingId,
            });

            logger.log('Verification Response:', verifyResponse);

            if (verifyResponse.success) {
              onSuccess();
            } else {
              onError('Payment verification failed. Please contact support.');
            }
          } catch (error: any) {
            logger.error('Verification Error:', error);
            onError('Error during payment verification');
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#38bdf8',
        },
        modal: {
          ondismiss: () => {
            logger.log('Payment modal dismissed by user');
            onError('Payment cancelled');
          },
        },
      };

      logger.log('Opening Razorpay Modal with options:', options);
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error: any) {
      logger.error('Payment Process Error:', error);
      onError('An error occurred while initializing payment');
    }
  }
}

export const paymentService = new PaymentService();
