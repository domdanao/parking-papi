import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useParkingStore } from '../store/parkingStore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, ParkingSlot } from '../types';

type ParkingSearchNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ParkingSearchScreen() {
  const navigation = useNavigation<ParkingSearchNavigationProp>();
  const [searchRadius, setSearchRadius] = useState('1000');
  const [maxPrice, setMaxPrice] = useState('');
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);

  const {
    searchResults,
    currentLocation,
    isLoading,
    error,
    setCurrentLocation,
    searchNearbySlots,
    selectSlot,
    clearError,
  } = useParkingStore();

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationPermission(false);
        Alert.alert(
          'Location Permission Required',
          'Please enable location access to find nearby parking slots.',
          [{ text: 'OK' }]
        );
        return;
      }

      setLocationPermission(true);
      getCurrentLocation();
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setLocationPermission(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      };

      setCurrentLocation(coords);
      handleSearch(coords);
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Failed to get your current location. Please try again.');
    }
  };

  const handleSearch = async (location = currentLocation) => {
    if (!location) {
      Alert.alert('Error', 'Location is required to search for parking slots');
      return;
    }

    clearError();

    const searchParams = {
      latitude: location.latitude,
      longitude: location.longitude,
      radius: parseInt(searchRadius) || 1000,
      max_price: maxPrice ? parseFloat(maxPrice) : undefined,
    };

    await searchNearbySlots(searchParams);
  };

  const handleSlotPress = (slot: ParkingSlot) => {
    selectSlot(slot);
    navigation.navigate('ParkingDetail', { slotId: slot.id });
  };

  const formatDistance = (meters?: number) => {
    if (!meters) return '';
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatWalkTime = (minutes?: number) => {
    if (!minutes) return '';
    return `${Math.round(minutes)}min walk`;
  };

  const renderSlotItem = ({ item }: { item: ParkingSlot }) => (
    <TouchableOpacity
      style={styles.slotCard}
      onPress={() => handleSlotPress(item)}
    >
      <View style={styles.slotHeader}>
        <View style={styles.slotInfo}>
          <Text style={styles.slotNumber}>#{item.slot_number}</Text>
          <Text style={styles.slotAddress} numberOfLines={2}>
            {item.address}
          </Text>
        </View>
        <View style={styles.slotPrice}>
          <Text style={styles.priceAmount}>${item.base_hourly_rate}</Text>
          <Text style={styles.priceUnit}>per hour</Text>
        </View>
      </View>

      <View style={styles.slotDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="walk-outline" size={16} color="#6B7280" />
          <Text style={styles.detailText}>
            {formatDistance(item.distance_meters)} • {formatWalkTime(item.estimated_walk_time_minutes)}
          </Text>
        </View>

        <View style={styles.slotTags}>
          <View style={[styles.statusTag, { backgroundColor: '#10B981' }]}>
            <Text style={styles.statusText}>Available</Text>
          </View>
          {item.amenities && item.amenities.length > 0 && (
            <View style={styles.amenityTag}>
              <Text style={styles.amenityText}>
                {item.amenities.slice(0, 2).join(', ')}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="car-outline" size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No parking slots found</Text>
      <Text style={styles.emptySubtitle}>
        Try adjusting your search radius or price range
      </Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => handleSearch()}
      >
        <Text style={styles.retryButtonText}>Search Again</Text>
      </TouchableOpacity>
    </View>
  );

  if (locationPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="location-outline" size={64} color="#D1D5DB" />
          <Text style={styles.permissionTitle}>Location Access Required</Text>
          <Text style={styles.permissionText}>
            Please enable location access to find nearby parking slots
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestLocationPermission}
          >
            <Text style={styles.permissionButtonText}>Enable Location</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Find Parking</Text>
        <TouchableOpacity
          style={styles.locationButton}
          onPress={getCurrentLocation}
        >
          <Ionicons name="location" size={20} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchFilters}>
        <View style={styles.filterRow}>
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Radius</Text>
            <View style={styles.filterInput}>
              <TextInput
                style={styles.input}
                value={searchRadius}
                onChangeText={setSearchRadius}
                keyboardType="numeric"
                placeholder="1000"
              />
              <Text style={styles.inputUnit}>m</Text>
            </View>
          </View>

          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Max Price</Text>
            <View style={styles.filterInput}>
              <Text style={styles.inputPrefix}>$</Text>
              <TextInput
                style={styles.input}
                value={maxPrice}
                onChangeText={setMaxPrice}
                keyboardType="decimal-pad"
                placeholder="Any"
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => handleSearch()}
          >
            <Ionicons name="search" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={clearError}>
            <Ionicons name="close" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={searchResults}
        renderItem={renderSlotItem}
        keyExtractor={(item) => item.id}
        style={styles.slotsList}
        contentContainerStyle={styles.slotsListContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => handleSearch()}
          />
        }
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  locationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchFilters: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  filterItem: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  filterInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    textAlign: 'center',
  },
  inputUnit: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  inputPrefix: {
    fontSize: 16,
    color: '#6B7280',
    marginRight: 4,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#DC2626',
  },
  slotsList: {
    flex: 1,
  },
  slotsListContent: {
    padding: 20,
    paddingBottom: 32,
  },
  slotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  slotInfo: {
    flex: 1,
    marginRight: 12,
  },
  slotNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  slotAddress: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  slotPrice: {
    alignItems: 'flex-end',
  },
  priceAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#059669',
  },
  priceUnit: {
    fontSize: 12,
    color: '#6B7280',
  },
  slotDetails: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
  },
  slotTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  amenityTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  amenityText: {
    fontSize: 12,
    color: '#374151',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});