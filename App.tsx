import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Text, Animated } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CoinSystem } from './app/utils/CoinSystem';

import PomodoroScreen from './app/screens/PomodoroScreen';
import HomeworkScreen from './app/screens/HomeworkScreen';
import StoreScreen from './app/screens/StoreScreen';
import SettingsScreen from './app/screens/SettingsScreen';
import WelcomeScreen from './app/screens/WelcomeScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  const [coins, setCoins] = useState(0);
  const [showWelcome, setShowWelcome] = useState<boolean | null>(null);

  useEffect(() => {
    checkFirstLaunch();
    loadCoins();
    
    // Check for coin updates every 2 seconds
    const interval = setInterval(() => {
      loadCoins();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const checkFirstLaunch = async () => {
    try {
      const hasSeenWelcome = await AsyncStorage.getItem('hasSeenWelcome');
      setShowWelcome(hasSeenWelcome !== 'true');
    } catch (error) {
      console.error('Error checking first launch:', error);
      setShowWelcome(false);
    }
  };

  const loadCoins = async () => {
    const currentCoins = await CoinSystem.getCoins();
    if (currentCoins !== coins) {
      setCoins(currentCoins);
    }
  };

  const handleWelcomeComplete = () => {
    setShowWelcome(false);
  };

  // Show loading while checking first launch
  if (showWelcome === null) {
    return (
      <View style={[styles.container, { backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar style="light" />
        <LottieView
          source={require('./assets/animations/cat.json')}
          autoPlay
          loop
          style={{ width: 200, height: 200 }}
        />
      </View>
    );
  }

  // Show welcome screen if first launch
  if (showWelcome) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <WelcomeScreen onComplete={handleWelcomeComplete} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NavigationContainer>
        <StatusBar style="light" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName: keyof typeof Ionicons.glyphMap;

              if (route.name === 'Pomodoro') {
                iconName = focused ? 'timer' : 'timer-outline';
              } else if (route.name === 'Homework') {
                iconName = focused ? 'book' : 'book-outline';
            } else if (route.name === 'Store') {
              iconName = focused ? 'storefront' : 'storefront-outline';
              } else if (route.name === 'Settings') {
                iconName = focused ? 'settings' : 'settings-outline';
              }

              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#e94560',
            tabBarInactiveTintColor: '#666',
            tabBarStyle: {
              backgroundColor: '#16213e',
              borderTopColor: '#1a1a2e',
              paddingBottom: 5,
              height: 60,
            },
            headerStyle: {
              backgroundColor: '#16213e',
            },
            headerTintColor: '#fff',
            headerShown: false,
          })}
        >
          <Tab.Screen name="Pomodoro" component={PomodoroScreen} />
          <Tab.Screen name="Homework" component={HomeworkScreen} />
          <Tab.Screen name="Store" component={StoreScreen} />
          <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
      
      {/* Coin Display */}
      <View style={styles.coinDisplay} pointerEvents="none">
        <Ionicons name="cash" size={24} color="#FFD700" />
        <Text style={styles.coinText}>{coins}</Text>
      </View>
      
      {/* Floating Cat Animation */}
      <View style={styles.floatingCat} pointerEvents="none">
        <LottieView
          source={require('./assets/animations/cat.json')}
          autoPlay
          loop
          style={styles.lottie}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  coinDisplay: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
    zIndex: 999,
    borderWidth: 2,
    borderColor: '#FFD700',
    elevation: 8,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  coinText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  floatingCat: {
    position: 'absolute',
    right: 5,
    bottom: 180,
    width: 220,
    height: 220,
    zIndex: 999,
  },
  lottie: {
    width: '100%',
    height: '100%',
  },
});
