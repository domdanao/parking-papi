import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test-utils';
import { PaymentForm } from '../VehicleOwner/PaymentForm';
import { mockFetch } from '@/test-utils';

// Mock Inertia router
const mockPost = jest.fn();
jest.mock('@inertiajs/react', () => ({
  ...jest.requireActual('@inertiajs/react'),
  router: {
    post: mockPost,
  },
}));

describe('PaymentForm Component', () => {
  const mockProps = {
    sessionId: 'session-123',
    amount: 100.0,
    duration: 120,
    slotInfo: {
      id: 'slot-1',
      slot_number: 'A001',
      address: '123 Test Street, Manila',
      hourly_rate: 50.0,
    },
    walletBalance: 250.0,
    onSuccess: jest.fn(),
    onError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders payment form with correct details', () => {
    render(<PaymentForm {...mockProps} />);

    expect(screen.getByText('Payment Details')).toBeInTheDocument();
    expect(screen.getByText('Slot A001')).toBeInTheDocument();
    expect(screen.getByText('₱100.00')).toBeInTheDocument();
    expect(screen.getByText('2 hours')).toBeInTheDocument();
    expect(screen.getByText('Wallet Balance: ₱250.00')).toBeInTheDocument();
  });

  it('shows wallet as default payment method when sufficient balance', () => {
    render(<PaymentForm {...mockProps} />);

    const walletOption = screen.getByLabelText('Digital Wallet');
    expect(walletOption).toBeChecked();
    expect(screen.getByText('Available: ₱250.00')).toBeInTheDocument();
  });

  it('disables wallet option when insufficient balance', () => {
    render(<PaymentForm {...mockProps} walletBalance={50.0} />);

    const walletOption = screen.getByLabelText('Digital Wallet');
    expect(walletOption).toBeDisabled();
    expect(screen.getByText('Insufficient balance')).toBeInTheDocument();

    // Should default to credit card
    const creditCardOption = screen.getByLabelText('Credit Card');
    expect(creditCardOption).toBeChecked();
  });

  it('handles payment method selection', () => {
    render(<PaymentForm {...mockProps} />);

    const creditCardOption = screen.getByLabelText('Credit Card');
    fireEvent.click(creditCardOption);

    expect(creditCardOption).toBeChecked();
    expect(screen.getByPlaceholderText('Card Number')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('MM/YY')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('CVV')).toBeInTheDocument();
  });

  it('validates credit card form fields', async () => {
    render(<PaymentForm {...mockProps} />);

    const creditCardOption = screen.getByLabelText('Credit Card');
    fireEvent.click(creditCardOption);

    const payButton = screen.getByRole('button', { name: /pay now/i });
    fireEvent.click(payButton);

    await waitFor(() => {
      expect(screen.getByText('Card number is required')).toBeInTheDocument();
      expect(screen.getByText('Expiry date is required')).toBeInTheDocument();
      expect(screen.getByText('CVV is required')).toBeInTheDocument();
    });
  });

  it('processes wallet payment successfully', async () => {
    mockFetch.success({
      transaction_id: 'txn-123',
      session_id: 'session-123',
      amount_paid: 100.0,
      remaining_balance: 150.0,
    });

    render(<PaymentForm {...mockProps} />);

    const payButton = screen.getByRole('button', { name: /pay now/i });
    fireEvent.click(payButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/api/payments/sessions/session-123/pay',
        {
          payment_method: 'wallet',
        },
        expect.any(Object)
      );
    });
  });

  it('processes credit card payment successfully', async () => {
    mockFetch.success({
      transaction_id: 'txn-123',
      session_id: 'session-123',
      amount_paid: 100.0,
      payment_gateway_reference: 'pg-ref-123',
    });

    render(<PaymentForm {...mockProps} />);

    const creditCardOption = screen.getByLabelText('Credit Card');
    fireEvent.click(creditCardOption);

    // Fill credit card form
    fireEvent.change(screen.getByPlaceholderText('Card Number'), {
      target: { value: '4111111111111111' },
    });
    fireEvent.change(screen.getByPlaceholderText('MM/YY'), {
      target: { value: '12/25' },
    });
    fireEvent.change(screen.getByPlaceholderText('CVV'), {
      target: { value: '123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Cardholder Name'), {
      target: { value: 'John Doe' },
    });

    const payButton = screen.getByRole('button', { name: /pay now/i });
    fireEvent.click(payButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/api/payments/sessions/session-123/pay',
        {
          payment_method: 'credit_card',
          payment_details: {
            card_number: '4111111111111111',
            expiry_date: '12/25',
            cvv: '123',
            cardholder_name: 'John Doe',
          },
        },
        expect.any(Object)
      );
    });
  });

  it('handles payment failure gracefully', async () => {
    mockFetch.error(400, 'Payment processing failed');

    render(<PaymentForm {...mockProps} />);

    const payButton = screen.getByRole('button', { name: /pay now/i });
    fireEvent.click(payButton);

    await waitFor(() => {
      expect(mockProps.onError).toHaveBeenCalledWith('Payment processing failed');
    });
  });

  it('shows loading state during payment processing', async () => {
    render(<PaymentForm {...mockProps} />);

    const payButton = screen.getByRole('button', { name: /pay now/i });
    fireEvent.click(payButton);

    expect(payButton).toHaveTextContent('Processing...');
    expect(payButton).toBeDisabled();
  });

  it('formats card number input correctly', () => {
    render(<PaymentForm {...mockProps} />);

    const creditCardOption = screen.getByLabelText('Credit Card');
    fireEvent.click(creditCardOption);

    const cardNumberInput = screen.getByPlaceholderText('Card Number');
    fireEvent.change(cardNumberInput, {
      target: { value: '4111111111111111' },
    });

    expect(cardNumberInput).toHaveValue('4111 1111 1111 1111');
  });

  it('validates card number using Luhn algorithm', async () => {
    render(<PaymentForm {...mockProps} />);

    const creditCardOption = screen.getByLabelText('Credit Card');
    fireEvent.click(creditCardOption);

    const cardNumberInput = screen.getByPlaceholderText('Card Number');
    fireEvent.change(cardNumberInput, {
      target: { value: '4111111111111112' }, // Invalid card number
    });

    const payButton = screen.getByRole('button', { name: /pay now/i });
    fireEvent.click(payButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid card number')).toBeInTheDocument();
    });
  });

  it('shows loyalty points earned after successful payment', async () => {
    mockFetch.success({
      transaction_id: 'txn-123',
      session_id: 'session-123',
      amount_paid: 100.0,
      loyalty_points_earned: 10,
    });

    render(<PaymentForm {...mockProps} />);

    const payButton = screen.getByRole('button', { name: /pay now/i });
    fireEvent.click(payButton);

    await waitFor(() => {
      expect(screen.getByText('You earned 10 loyalty points!')).toBeInTheDocument();
    });
  });

  it('handles saved payment methods', () => {
    const propsWithSavedMethods = {
      ...mockProps,
      savedPaymentMethods: [
        {
          id: 'pm-1',
          type: 'credit_card',
          display_name: 'Visa ending in 1111',
          is_default: true,
        },
        {
          id: 'pm-2',
          type: 'credit_card',
          display_name: 'Mastercard ending in 4444',
          is_default: false,
        },
      ],
    };

    render(<PaymentForm {...propsWithSavedMethods} />);

    expect(screen.getByText('Saved Payment Methods')).toBeInTheDocument();
    expect(screen.getByText('Visa ending in 1111')).toBeInTheDocument();
    expect(screen.getByText('Mastercard ending in 4444')).toBeInTheDocument();
  });

  it('calculates total with service fee correctly', () => {
    const propsWithServiceFee = {
      ...mockProps,
      serviceFee: 5.0,
    };

    render(<PaymentForm {...propsWithServiceFee} />);

    expect(screen.getByText('Parking Fee: ₱100.00')).toBeInTheDocument();
    expect(screen.getByText('Service Fee: ₱5.00')).toBeInTheDocument();
    expect(screen.getByText('Total: ₱105.00')).toBeInTheDocument();
  });

  it('applies discount codes correctly', async () => {
    render(<PaymentForm {...mockProps} />);

    const discountInput = screen.getByPlaceholderText('Enter discount code');
    fireEvent.change(discountInput, {
      target: { value: 'SAVE10' },
    });

    const applyButton = screen.getByRole('button', { name: /apply/i });
    fireEvent.click(applyButton);

    // Mock successful discount application
    mockFetch.success({
      discount_amount: 10.0,
      final_amount: 90.0,
    });

    await waitFor(() => {
      expect(screen.getByText('Discount: -₱10.00')).toBeInTheDocument();
      expect(screen.getByText('Total: ₱90.00')).toBeInTheDocument();
    });
  });

  it('handles invalid discount codes', async () => {
    render(<PaymentForm {...mockProps} />);

    const discountInput = screen.getByPlaceholderText('Enter discount code');
    fireEvent.change(discountInput, {
      target: { value: 'INVALID' },
    });

    const applyButton = screen.getByRole('button', { name: /apply/i });
    fireEvent.click(applyButton);

    mockFetch.error(400, 'Invalid discount code');

    await waitFor(() => {
      expect(screen.getByText('Invalid discount code')).toBeInTheDocument();
    });
  });

  it('shows payment terms and conditions', () => {
    render(<PaymentForm {...mockProps} />);

    expect(screen.getByLabelText(/I agree to the terms and conditions/i)).toBeInTheDocument();
    expect(screen.getByText('Terms and Conditions')).toBeInTheDocument();
  });

  it('requires terms acceptance before payment', async () => {
    render(<PaymentForm {...mockProps} />);

    const payButton = screen.getByRole('button', { name: /pay now/i });
    fireEvent.click(payButton);

    await waitFor(() => {
      expect(screen.getByText('Please accept the terms and conditions')).toBeInTheDocument();
    });
  });

  it('handles network errors gracefully', async () => {
    mockFetch.networkError();

    render(<PaymentForm {...mockProps} />);

    const payButton = screen.getByRole('button', { name: /pay now/i });
    fireEvent.click(payButton);

    await waitFor(() => {
      expect(mockProps.onError).toHaveBeenCalledWith(
        'Network error. Please check your connection and try again.'
      );
    });
  });
});