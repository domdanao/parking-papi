import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useParkingStore } from '../store/parkingStore';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type BookingFlowRouteProp = RouteProp<RootStackParamList, 'BookingFlow'>;
type BookingFlowNavigationProp = NativeStackNavigationProp<RootStackParamList, 'BookingFlow'>;

export default function BookingFlowScreen() {
  const navigation = useNavigation<BookingFlowNavigationProp>();
  const route = useRoute<BookingFlowRouteProp>();
  const { scanResult } = route.params;

  const [selectedDuration, setSelectedDuration] = useState(60); // Default 1 hour
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('wallet');
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes in seconds

  const { activateBooking, isLoading, error, clearError } = useParkingStore();

  useEffect(() => {
    // Countdown timer for scan session expiry
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          Alert.alert(
            'Session Expired',
            'Your QR scan session has expired. Please scan the QR code again.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigation]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const durationOptions = [
    { minutes: 30, label: '30 minutes', price: (scanResult.slot_info.hourly_rate * 0.5) },
    { minutes: 60, label: '1 hour', price: scanResult.slot_info.hourly_rate },
    { minutes: 120, label: '2 hours', price: (scanResult.slot_info.hourly_rate * 2) },
    { minutes: 180, label: '3 hours', price: (scanResult.slot_info.hourly_rate * 3) },
    { minutes: 240, label: '4 hours', price: (scanResult.slot_info.hourly_rate * 4) },
  ];

  const paymentMethods = [
    {
      id: 'wallet',
      title: 'Digital Wallet',
      subtitle: 'Pay with your digital wallet balance',
      icon: 'wallet-outline',
    },
    {
      id: 'credit_card',
      title: 'Credit Card',
      subtitle: 'Pay with your saved credit card',
      icon: 'card-outline',
    },
  ];

  const calculateTotal = () => {
    const selectedOption = durationOptions.find(option => option.minutes === selectedDuration);
    return selectedOption ? selectedOption.price : 0;
  };

  const handleConfirmBooking = async () => {
    if (timeRemaining <= 0) {
      Alert.alert('Session Expired', 'Please scan the QR code again.');
      return;
    }

    clearError();

    const success = await activateBooking(
      scanResult.scan_id,
      scanResult.session_token,
      selectedDuration,
      selectedPaymentMethod
    );

    if (success) {
      Alert.alert(
        'Booking Confirmed!',
        'Your parking session has been activated successfully.',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Main' }],
              });
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Booking Failed',
        error || 'Failed to activate your parking session. Please try again.'
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.timerContainer}>
            <Ionicons name="time-outline" size={20} color="#EF4444" />
            <Text style={styles.timerText}>
              Session expires in {formatTime(timeRemaining)}
            </Text>
          </View>
        </View>

        <View style={styles.slotInfoCard}>
          <Text style={styles.cardTitle}>Parking Slot Details</Text>
          <View style={styles.slotInfo}>
            <Text style={styles.slotNumber}>#{scanResult.slot_info.slot_number}</Text>
            <View style={styles.slotMeta}>
              <Text style={styles.slotRate}>
                ${scanResult.slot_info.hourly_rate}/hour
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: '#10B981' }]}>
                <Text style={styles.statusText}>{scanResult.slot_info.status}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.durationCard}>
          <Text style={styles.cardTitle}>Select Duration</Text>
          <View style={styles.durationOptions}>
            {durationOptions.map((option) => (
              <TouchableOpacity
                key={option.minutes}
                style={[
                  styles.durationOption,
                  selectedDuration === option.minutes && styles.selectedDurationOption,
                ]}
                onPress={() => setSelectedDuration(option.minutes)}
              >
                <View style={styles.durationInfo}>
                  <Text style={[
                    styles.durationLabel,
                    selectedDuration === option.minutes && styles.selectedDurationLabel,
                  ]}>
                    {option.label}
                  </Text>
                  <Text style={[
                    styles.durationPrice,
                    selectedDuration === option.minutes && styles.selectedDurationPrice,
                  ]}>
                    ${option.price.toFixed(2)}
                  </Text>
                </View>
                {selectedDuration === option.minutes && (
                  <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.paymentCard}>
          <Text style={styles.cardTitle}>Payment Method</Text>
          <View style={styles.paymentMethods}>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentMethod,
                  selectedPaymentMethod === method.id && styles.selectedPaymentMethod,
                ]}
                onPress={() => setSelectedPaymentMethod(method.id)}
              >
                <View style={styles.paymentMethodInfo}>
                  <View style={styles.paymentMethodIcon}>
                    <Ionicons name={method.icon as any} size={20} color="#6B7280" />
                  </View>
                  <View style={styles.paymentMethodText}>
                    <Text style={[
                      styles.paymentMethodTitle,
                      selectedPaymentMethod === method.id && styles.selectedPaymentMethodTitle,
                    ]}>
                      {method.title}
                    </Text>
                    <Text style={styles.paymentMethodSubtitle}>
                      {method.subtitle}
                    </Text>
                  </View>
                </View>
                {selectedPaymentMethod === method.id && (
                  <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Booking Summary</Text>
          <View style={styles.summaryItems}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Duration</Text>
              <Text style={styles.summaryValue}>
                {durationOptions.find(opt => opt.minutes === selectedDuration)?.label}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Hourly Rate</Text>
              <Text style={styles.summaryValue}>
                ${scanResult.slot_info.hourly_rate}/hour
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Payment Method</Text>
              <Text style={styles.summaryValue}>
                {paymentMethods.find(method => method.id === selectedPaymentMethod)?.title}
              </Text>
            </View>
            <View style={[styles.summaryItem, styles.totalItem]}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>${calculateTotal().toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.warningCard}>
          <Ionicons name="warning-outline" size={20} color="#F59E0B" />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>Important</Text>
            <Text style={styles.warningText}>
              Your parking session will start immediately after confirmation.
              Make sure you're at the parking spot before proceeding.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmButton, isLoading && styles.confirmButtonDisabled]}
          onPress={handleConfirmBooking}
          disabled={isLoading || timeRemaining <= 0}
        >
          <Text style={styles.confirmButtonText}>
            {isLoading ? 'Processing...' : `Confirm • $${calculateTotal().toFixed(2)}`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
  },
  header: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    marginLeft: 8,
  },
  slotInfoCard: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  slotInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slotNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  slotMeta: {
    alignItems: 'flex-end',
  },
  slotRate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  durationCard: {
    backgroundColor: '#FFFFFF',
    marginTop: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  durationOptions: {
    gap: 8,
  },
  durationOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  selectedDurationOption: {
    borderColor: '#3B82F6',
    backgroundColor: '#EBF8FF',
  },
  durationInfo: {
    flex: 1,
  },
  durationLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 2,
  },
  selectedDurationLabel: {
    color: '#1F2937',
    fontWeight: '600',
  },
  durationPrice: {
    fontSize: 14,
    color: '#6B7280',
  },
  selectedDurationPrice: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  paymentCard: {
    backgroundColor: '#FFFFFF',
    marginTop: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  paymentMethods: {
    gap: 8,
  },
  paymentMethod: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  selectedPaymentMethod: {
    borderColor: '#3B82F6',
    backgroundColor: '#EBF8FF',
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentMethodText: {
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 2,
  },
  selectedPaymentMethodTitle: {
    color: '#1F2937',
    fontWeight: '600',
  },
  paymentMethodSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    marginTop: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  summaryItems: {
    gap: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  totalItem: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    marginTop: 16,
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  warningContent: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  bottomActions: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 2,
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});