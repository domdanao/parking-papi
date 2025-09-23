import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useParkingStore } from '../store/parkingStore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user } = useAuthStore();
  const { activeSessions, isLoading, refreshActiveSessions } = useParkingStore();

  useEffect(() => {
    refreshActiveSessions();
  }, []);

  const handleRefresh = () => {
    refreshActiveSessions();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatUserName = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    if (user?.first_name) {
      return user.first_name;
    }
    return user?.name || 'User';
  };

  const quickActions = [
    {
      id: 'find-parking',
      title: 'Find Parking',
      subtitle: 'Search nearby slots',
      icon: 'search',
      color: '#3B82F6',
      onPress: () => navigation.navigate('Main', { screen: 'Search' }),
    },
    {
      id: 'scan-qr',
      title: 'Scan QR Code',
      subtitle: 'Quick parking access',
      icon: 'qr-code',
      color: '#10B981',
      onPress: () => navigation.navigate('Main', { screen: 'Scanner' }),
    },
    {
      id: 'my-sessions',
      title: 'My Sessions',
      subtitle: 'View active parking',
      icon: 'car',
      color: '#F59E0B',
      onPress: () => navigation.navigate('Main', { screen: 'Sessions' }),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{formatUserName()}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Main', { screen: 'Profile' })}
          >
            <View style={styles.profileIcon}>
              <Text style={styles.profileInitial}>
                {formatUserName().charAt(0).toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {activeSessions.length > 0 && (
          <View style={styles.activeSessionCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="car" size={24} color="#10B981" />
              <Text style={styles.cardTitle}>Active Parking</Text>
            </View>
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionAddress}>
                Session #{activeSessions[0].id.slice(0, 8)}
              </Text>
              <Text style={styles.sessionStatus}>Currently Active</Text>
            </View>
          </View>
        )}

        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.quickActionCard}
                onPress={action.onPress}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: action.color }]}>
                  <Ionicons name={action.icon as any} size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.quickActionTitle}>{action.title}</Text>
                <Text style={styles.quickActionSubtitle}>{action.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.tipsContainer}>
          <Text style={styles.sectionTitle}>Tips & Reminders</Text>
          <View style={styles.tipCard}>
            <Ionicons name="lightbulb-outline" size={20} color="#F59E0B" />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Save time with QR scanning</Text>
              <Text style={styles.tipText}>
                Scan QR codes directly for instant parking access without searching
              </Text>
            </View>
          </View>
          <View style={styles.tipCard}>
            <Ionicons name="time-outline" size={20} color="#3B82F6" />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Set parking reminders</Text>
              <Text style={styles.tipText}>
                Get notified 15 minutes before your parking session expires
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  profileButton: {
    padding: 4,
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  activeSessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  sessionInfo: {
    paddingLeft: 32,
  },
  sessionAddress: {
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 4,
  },
  sessionStatus: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  quickActionsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: '30%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  tipsContainer: {
    marginBottom: 32,
  },
  tipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tipContent: {
    flex: 1,
    marginLeft: 12,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
});