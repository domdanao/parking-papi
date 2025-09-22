import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useParkingStore } from '../store/parkingStore';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type ParkingDetailRouteProp = RouteProp<RootStackParamList, 'ParkingDetail'>;
type ParkingDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ParkingDetail'>;

const { width } = Dimensions.get('window');

export default function ParkingDetailScreen() {
  const navigation = useNavigation<ParkingDetailNavigationProp>();
  const route = useRoute<ParkingDetailRouteProp>();
  const { selectedSlot } = useParkingStore();

  if (!selectedSlot) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Slot Not Found</Text>
          <Text style={styles.errorText}>
            The parking slot you're looking for could not be found.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const formatDistance = (meters?: number) => {
    if (!meters) return 'Distance unknown';
    if (meters < 1000) {
      return `${Math.round(meters)}m away`;
    }
    return `${(meters / 1000).toFixed(1)}km away`;
  };

  const formatWalkTime = (minutes?: number) => {
    if (!minutes) return '';
    return `${Math.round(minutes)} min walk`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return '#10B981';
      case 'occupied':
        return '#EF4444';
      case 'reserved':
        return '#F59E0B';
      case 'maintenance':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'occupied':
        return 'Occupied';
      case 'reserved':
        return 'Reserved';
      case 'maintenance':
        return 'Under Maintenance';
      default:
        return status;
    }
  };

  const handleBookNow = () => {
    if (selectedSlot.status !== 'available') {
      Alert.alert('Unavailable', 'This parking slot is currently not available for booking.');
      return;
    }

    Alert.alert(
      'Book Parking Slot',
      'To book this parking slot, please scan the QR code located at the parking spot.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Scan QR Code',
          onPress: () => {
            navigation.navigate('Main', { screen: 'Scanner' });
          },
        },
      ]
    );
  };

  const handleGetDirections = () => {
    Alert.alert(
      'Navigation',
      'Open directions in your preferred map app?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Maps',
          onPress: () => {
            // In a real app, you would open the device's map app with coordinates
            Alert.alert('Coming Soon', 'Navigation integration will be available soon.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.slotInfo}>
            <Text style={styles.slotNumber}>#{selectedSlot.slot_number}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedSlot.status) }]}>
              <Text style={styles.statusText}>{getStatusText(selectedSlot.status)}</Text>
            </View>
          </View>
          <Text style={styles.slotAddress}>{selectedSlot.address}</Text>
        </View>

        <View style={styles.priceCard}>
          <View style={styles.priceInfo}>
            <Text style={styles.priceAmount}>${selectedSlot.base_hourly_rate}</Text>
            <Text style={styles.priceUnit}>per hour</Text>
          </View>
          <View style={styles.distanceInfo}>
            <Ionicons name="walk-outline" size={16} color="#6B7280" />
            <Text style={styles.distanceText}>
              {formatDistance(selectedSlot.distance_meters)}
            </Text>
            {selectedSlot.estimated_walk_time_minutes && (
              <Text style={styles.walkTimeText}>
                • {formatWalkTime(selectedSlot.estimated_walk_time_minutes)}
              </Text>
            )}
          </View>
        </View>

        {selectedSlot.amenities && selectedSlot.amenities.length > 0 && (
          <View style={styles.amenitiesCard}>
            <Text style={styles.cardTitle}>Amenities</Text>
            <View style={styles.amenitiesList}>
              {selectedSlot.amenities.map((amenity, index) => (
                <View key={index} style={styles.amenityItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.amenityText}>{amenity}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {selectedSlot.vehicle_compatibility && selectedSlot.vehicle_compatibility.length > 0 && (
          <View style={styles.compatibilityCard}>
            <Text style={styles.cardTitle}>Vehicle Compatibility</Text>
            <View style={styles.compatibilityList}>
              {selectedSlot.vehicle_compatibility.map((type, index) => (
                <View key={index} style={styles.compatibilityTag}>
                  <Text style={styles.compatibilityText}>{type}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {selectedSlot.owner && (
          <View style={styles.ownerCard}>
            <Text style={styles.cardTitle}>Slot Owner</Text>
            <View style={styles.ownerInfo}>
              <View style={styles.ownerIcon}>
                <Text style={styles.ownerInitial}>
                  {(selectedSlot.owner.first_name || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.ownerDetails}>
                <Text style={styles.ownerName}>
                  {selectedSlot.owner.first_name} {selectedSlot.owner.last_name}
                </Text>
                <Text style={styles.ownerLabel}>Slot Owner</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Important Information</Text>
          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={16} color="#6B7280" />
              <Text style={styles.infoText}>
                Booking confirmation required within 5 minutes of QR scan
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="card-outline" size={16} color="#6B7280" />
              <Text style={styles.infoText}>
                Payment will be charged automatically upon session start
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="notifications-outline" size={16} color="#6B7280" />
              <Text style={styles.infoText}>
                You'll receive notifications 15 and 5 minutes before expiry
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.directionsButton}
          onPress={handleGetDirections}
        >
          <Ionicons name="navigate-outline" size={20} color="#3B82F6" />
          <Text style={styles.directionsButtonText}>Directions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.bookButton,
            selectedSlot.status !== 'available' && styles.bookButtonDisabled,
          ]}
          onPress={handleBookNow}
          disabled={selectedSlot.status !== 'available'}
        >
          <Text style={styles.bookButtonText}>
            {selectedSlot.status === 'available' ? 'Book Now' : 'Unavailable'}
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  slotInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  slotNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  slotAddress: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  priceCard: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  priceInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  priceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#059669',
  },
  priceUnit: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 8,
  },
  distanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
  },
  walkTimeText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  amenitiesCard: {
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
  amenitiesList: {
    gap: 8,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amenityText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  compatibilityCard: {
    backgroundColor: '#FFFFFF',
    marginTop: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  compatibilityList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  compatibilityTag: {
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  compatibilityText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
  },
  ownerCard: {
    backgroundColor: '#FFFFFF',
    marginTop: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  ownerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ownerInitial: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ownerDetails: {
    flex: 1,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  ownerLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 16,
  },
  infoList: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
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
  directionsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF8FF',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  directionsButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  bookButton: {
    flex: 2,
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  bookButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  backButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});