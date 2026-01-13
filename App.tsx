import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Text, Animated, Platform, TouchableOpacity, Modal } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CoinSystem } from './app/utils/CoinSystem';

import PomodoroScreen from './app/screens/PomodoroScreen';
import HomeworkScreen from './app/screens/HomeworkScreen';
import StoreScreen from './app/screens/StoreScreen';
import SettingsScreen from './app/screens/SettingsScreen';
import WelcomeScreen from './app/screens/WelcomeScreen';
import AiAssistantScreen from './app/screens/AiAssistantScreen';
import PlannerScreen from './app/screens/PlannerScreen';
import StudyRoomScreen from './app/screens/StudyRoomScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  const [coins, setCoins] = useState(0);
  const [showCoinInfo, setShowCoinInfo] = useState(false);
  const [showWelcome, setShowWelcome] = useState<boolean | null>(null);

  useEffect(() => {
    checkFirstLaunch();
    loadCoins();
    
    // Hide navigation bar on Android
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
      NavigationBar.setBehaviorAsync('overlay-swipe');
    }
    
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
              let iconName: keyof typeof Ionicons.glyphMap = 'home';

              if (route.name === 'Pomodoro') {
                iconName = focused ? 'timer' : 'timer-outline';
              } else if (route.name === 'Homework') {
                iconName = focused ? 'book' : 'book-outline';
            } else if (route.name === 'Planner') {
              iconName = focused ? 'calendar' : 'calendar-outline';
            } else if (route.name === 'AI Assistant') {
              iconName = focused ? 'sparkles' : 'sparkles-outline';
            } else if (route.name === 'Study Room') {
              iconName = focused ? 'people' : 'people-outline';
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
          <Tab.Screen name="Planner" component={PlannerScreen} />
          <Tab.Screen name="AI Assistant" component={AiAssistantScreen} />
          <Tab.Screen name="Study Room" component={StudyRoomScreen} />
          <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
      
      {/* Coin Display */}
      <TouchableOpacity 
        style={styles.coinDisplay} 
        onPress={() => setShowCoinInfo(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="cash" size={24} color="#FFD700" />
        <Text style={styles.coinText}>{coins}</Text>
      </TouchableOpacity>

      {/* Coin Info Overlay */}
      <Modal
        visible={showCoinInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCoinInfo(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCoinInfo(false)}
        >
          <View style={styles.coinInfoContainer}>
            <BlurView intensity={90} style={styles.coinInfoBlur}>
              <LinearGradient
                colors={['rgba(233, 69, 96, 0.3)', 'rgba(138, 35, 135, 0.3)']}
                style={styles.coinInfoGradient}
              >
                <View style={styles.coinInfoHeader}>
                  <Ionicons name="information-circle" size={28} color="#FFD700" />
                  <Text style={styles.coinInfoTitle}>Study Coins</Text>
                </View>
                
                <View style={styles.coinInfoContent}>
                  <View style={styles.infoSection}>
                    <Ionicons name="trophy" size={20} color="#4CAF50" />
                    <Text style={styles.infoText}>Earn coins by:</Text>
                  </View>
                  <Text style={styles.bulletText}>• Completing Pomodoro sessions</Text>
                  <Text style={styles.bulletText}>• Finishing homework tasks</Text>
                  
                  <View style={[styles.infoSection, { marginTop: 16 }]}>
                    <Ionicons name="cart" size={20} color="#2196F3" />
                    <Text style={styles.infoText}>Use coins in:</Text>
                  </View>
                  <Text style={styles.bulletText}>• Shop (Coming Soon! 🚧)</Text>
                  
                  <Text style={styles.tipText}>Tip: Keep studying to earn more coins!</Text>
                </View>
                
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setShowCoinInfo(false)}
                >
                  <Text style={styles.closeButtonText}>Got it!</Text>
                </TouchableOpacity>
              </LinearGradient>
            </BlurView>
          </View>
        </TouchableOpacity>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-start',
    paddingTop: 100,
    paddingHorizontal: 20,
  },
  coinInfoContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  coinInfoBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  coinInfoGradient: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  coinInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  coinInfoTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  coinInfoContent: {
    marginBottom: 20,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bulletText: {
    color: '#ddd',
    fontSize: 14,
    marginLeft: 28,
    marginBottom: 4,
  },
  tipText: {
    color: '#FFD700',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 16,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#e94560',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
