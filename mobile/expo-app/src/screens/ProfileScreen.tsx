import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
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

  const formatRole = (role: string) => {
    return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const menuSections = [
    {
      title: 'Account',
      items: [
        {
          id: 'edit-profile',
          title: 'Edit Profile',
          subtitle: 'Update your personal information',
          icon: 'person-outline',
          onPress: () => {
            Alert.alert('Coming Soon', 'Profile editing will be available in a future update.');
          },
        },
        {
          id: 'payment-methods',
          title: 'Payment Methods',
          subtitle: 'Manage your cards and payment options',
          icon: 'card-outline',
          onPress: () => {
            Alert.alert('Coming Soon', 'Payment method management will be available soon.');
          },
        },
        {
          id: 'wallet',
          title: 'Digital Wallet',
          subtitle: 'View balance and transaction history',
          icon: 'wallet-outline',
          onPress: () => {
            Alert.alert('Coming Soon', 'Digital wallet features coming soon.');
          },
        },
      ],
    },
    {
      title: 'Parking',
      items: [
        {
          id: 'parking-history',
          title: 'Parking History',
          subtitle: 'View your past parking sessions',
          icon: 'time-outline',
          onPress: () => {
            Alert.alert('Coming Soon', 'Parking history will be available soon.');
          },
        },
        {
          id: 'favorite-locations',
          title: 'Favorite Locations',
          subtitle: 'Manage your saved parking spots',
          icon: 'heart-outline',
          onPress: () => {
            Alert.alert('Coming Soon', 'Favorite locations feature coming soon.');
          },
        },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          id: 'notification-settings',
          title: 'Notification Settings',
          subtitle: 'Manage your notification preferences',
          icon: 'notifications-outline',
          onPress: () => {
            Alert.alert('Coming Soon', 'Notification settings will be available soon.');
          },
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          id: 'help-center',
          title: 'Help Center',
          subtitle: 'Get help and support',
          icon: 'help-circle-outline',
          onPress: () => {
            Alert.alert('Help Center', 'For support, please contact us at support@parkingpapi.com');
          },
        },
        {
          id: 'about',
          title: 'About',
          subtitle: 'App version and legal information',
          icon: 'information-circle-outline',
          onPress: () => {
            Alert.alert('About Parking Papi', 'Version 1.0.0\n\nA modern parking platform for vehicle owners and slot operators.');
          },
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.profileIcon}>
            <Text style={styles.profileInitial}>
              {formatUserName().charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName}>{formatUserName()}</Text>
          <Text style={styles.userEmail}>{user?.email || user?.mobile_number || 'No email'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{formatRole(user?.role || 'user')}</Text>
          </View>
        </View>

        <View style={styles.verificationStatus}>
          <View style={styles.verificationItem}>
            <Ionicons
              name={user?.email_verified_at ? 'checkmark-circle' : 'alert-circle-outline'}
              size={20}
              color={user?.email_verified_at ? '#10B981' : '#F59E0B'}
            />
            <Text style={styles.verificationText}>
              Email {user?.email_verified_at ? 'Verified' : 'Not Verified'}
            </Text>
          </View>
          <View style={styles.verificationItem}>
            <Ionicons
              name={user?.mobile_verified_at ? 'checkmark-circle' : 'alert-circle-outline'}
              size={20}
              color={user?.mobile_verified_at ? '#10B981' : '#F59E0B'}
            />
            <Text style={styles.verificationText}>
              Mobile {user?.mobile_verified_at ? 'Verified' : 'Not Verified'}
            </Text>
          </View>
        </View>

        {menuSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.menuSection}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.menuItems}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.menuItem,
                    itemIndex === section.items.length - 1 && styles.lastMenuItem,
                  ]}
                  onPress={item.onPress}
                >
                  <View style={styles.menuItemLeft}>
                    <View style={styles.menuItemIcon}>
                      <Ionicons name={item.icon as any} size={20} color="#6B7280" />
                    </View>
                    <View style={styles.menuItemText}>
                      <Text style={styles.menuItemTitle}>{item.title}</Text>
                      <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Joined {new Date(user?.created_at || '').toLocaleDateString()}
          </Text>
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
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  profileIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileInitial: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  roleText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  verificationStatus: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  verificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  verificationText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  menuSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  menuItems: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  logoutSection: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});