import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '../store/authStore';
import { RootStackParamList, TabParamList } from '../types';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import ParkingSearchScreen from '../screens/ParkingSearchScreen';
import QRScannerScreen from '../screens/QRScannerScreen';
import ActiveSessionsScreen from '../screens/ActiveSessionsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ParkingDetailScreen from '../screens/ParkingDetailScreen';
import BookingFlowScreen from '../screens/BookingFlowScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function TabNavigator() {
  const { user } = useAuthStore();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Scanner') {
            iconName = focused ? 'qr-code' : 'qr-code-outline';
          } else if (route.name === 'Sessions') {
            iconName = focused ? 'car' : 'car-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={ParkingSearchScreen} />
      <Tab.Screen name="Scanner" component={QRScannerScreen} />
      <Tab.Screen name="Sessions" component={ActiveSessionsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated } = useAuthStore();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen
              name="ParkingDetail"
              component={ParkingDetailScreen}
              options={{
                headerShown: true,
                title: 'Parking Details',
                presentation: 'modal'
              }}
            />
            <Stack.Screen
              name="BookingFlow"
              component={BookingFlowScreen}
              options={{
                headerShown: true,
                title: 'Book Parking',
                presentation: 'modal'
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}