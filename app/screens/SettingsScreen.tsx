import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  AppState,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CoinSystem } from '../utils/CoinSystem';

export default function SettingsScreen() {
  const [workTime, setWorkTime] = useState('25');
  const [breakTime, setBreakTime] = useState('5');
  const [longBreakTime, setLongBreakTime] = useState('15');
  const [completedSessions, setCompletedSessions] = useState(0);
  const [showAppInfo, setShowAppInfo] = useState(false);
  const [showBuildLog, setShowBuildLog] = useState(false);
  
  // Statistics
  const [totalStudyTime, setTotalStudyTime] = useState(0); // in minutes
  const [totalBreakTime, setTotalBreakTime] = useState(0); // in minutes
  const [currentStreak, setCurrentStreak] = useState(0);
  const [totalCoins, setTotalCoins] = useState(0);
  const [todayTime, setTodayTime] = useState(0); // in seconds
  const [todayBaseTime, setTodayBaseTime] = useState(0); // base time from previous sessions today
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  useEffect(() => {
    loadSettings();
    loadStatistics();
    
    // Update statistics every 5 seconds
    const interval = setInterval(() => {
      loadStatistics();
    }, 5000);
    
    // Track app session time
    const appSessionStart = Date.now();
    setSessionStartTime(appSessionStart);
    
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Save session time when app goes to background
        saveSessionTime(appSessionStart);
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
      // Save session time when component unmounts
      if (sessionStartTime) {
        saveSessionTime(sessionStartTime);
      }
    };
  }, []);

  useEffect(() => {
    // Update today's time every second
    const interval = setInterval(() => {
      if (sessionStartTime) {
        const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
        setTodayTime(todayBaseTime + elapsed);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionStartTime, todayBaseTime]);

  const saveSessionTime = async (startTime: number) => {
    try {
      const sessionDuration = Math.floor((Date.now() - startTime) / 1000 / 60); // in minutes
      const today = new Date().toISOString().split('T')[0];
      
      const sessionsData = await AsyncStorage.getItem('dailyAppTime');
      const sessions = sessionsData ? JSON.parse(sessionsData) : {};
      sessions[today] = (sessions[today] || 0) + sessionDuration;
      await AsyncStorage.setItem('dailyAppTime', JSON.stringify(sessions));
    } catch (error) {
      console.error('Error saving session time:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      // Load completed sessions
      const sessions = await AsyncStorage.getItem('completedSessions');
      if (sessions) {
        setCompletedSessions(parseInt(sessions));
      }

      // Load total coins
      const coins = await CoinSystem.getCoins();
      setTotalCoins(coins);

      // Calculate total study time from calendar sessions
      const calendarData = await AsyncStorage.getItem('calendarSessions');
      if (calendarData) {
        const calendar = JSON.parse(calendarData);
        const workTimePerSession = parseInt(await AsyncStorage.getItem('workTime') || '25');
        const totalSessions = Object.values(calendar).reduce((sum: number, count) => sum + (count as number), 0);
        setTotalStudyTime(totalSessions * workTimePerSession);
      }

      // Calculate total break time
      const breakTimePerSession = parseInt(await AsyncStorage.getItem('breakTime') || '5');
      setTotalBreakTime(completedSessions * breakTimePerSession);

      // Calculate current streak
      const streak = await calculateStreak();
      setCurrentStreak(streak);

      // Load today's base app time (only if not already loaded)
      if (todayBaseTime === 0) {
        const today = new Date().toISOString().split('T')[0];
        const dailyTimeData = await AsyncStorage.getItem('dailyAppTime');
        if (dailyTimeData) {
          const dailyTime = JSON.parse(dailyTimeData);
          const todayMinutes = dailyTime[today] || 0;
          setTodayBaseTime(todayMinutes * 60);
        }
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const calculateStreak = async (): Promise<number> => {
    try {
      const calendarData = await AsyncStorage.getItem('calendarSessions');
      if (!calendarData) return 0;

      const calendar = JSON.parse(calendarData);
      const dates = Object.keys(calendar).sort().reverse();
      
      if (dates.length === 0) return 0;

      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < dates.length; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        const dateString = checkDate.toISOString().split('T')[0];
        
        if (calendar[dateString]) {
          streak++;
        } else {
          break;
        }
      }

      return streak;
    } catch (error) {
      console.error('Error calculating streak:', error);
      return 0;
    }
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatSeconds = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const loadSettings = async () => {
    try {
      const savedWorkTime = await AsyncStorage.getItem('workTime');
      const savedBreakTime = await AsyncStorage.getItem('breakTime');
      const savedLongBreakTime = await AsyncStorage.getItem('longBreakTime');
      const sessions = await AsyncStorage.getItem('completedSessions');

      if (savedWorkTime) setWorkTime(savedWorkTime);
      if (savedBreakTime) setBreakTime(savedBreakTime);
      if (savedLongBreakTime) setLongBreakTime(savedLongBreakTime);
      if (sessions) setCompletedSessions(parseInt(sessions));
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      const work = parseInt(workTime);
      const shortBreak = parseInt(breakTime);
      const longBreak = parseInt(longBreakTime);

      if (isNaN(work) || work <= 0 || work > 120) {
        Alert.alert('Invalid Input', 'Work time must be between 1 and 120 minutes');
        return;
      }
      if (isNaN(shortBreak) || shortBreak <= 0 || shortBreak > 60) {
        Alert.alert('Invalid Input', 'Break time must be between 1 and 60 minutes');
        return;
      }
      if (isNaN(longBreak) || longBreak <= 0 || longBreak > 60) {
        Alert.alert('Invalid Input', 'Long break time must be between 1 and 60 minutes');
        return;
      }

      await AsyncStorage.setItem('workTime', workTime);
      await AsyncStorage.setItem('breakTime', breakTime);
      await AsyncStorage.setItem('longBreakTime', longBreakTime);

      Alert.alert('Success', 'Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const resetSettings = async () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          onPress: async () => {
            setWorkTime('25');
            setBreakTime('5');
            setLongBreakTime('15');
            await AsyncStorage.setItem('workTime', '25');
            await AsyncStorage.setItem('breakTime', '5');
            await AsyncStorage.setItem('longBreakTime', '15');
            Alert.alert('Success', 'Settings reset to default values');
          },
          style: 'destructive',
        },
      ]
    );
  };

  const clearAllData = async () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all your sessions and calendar data. This action cannot be undone!',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete All',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              setCompletedSessions(0);
              await loadSettings();
              Alert.alert('Success', 'All data has been cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <LinearGradient
      colors={['#0f0c29', '#1a1a2e', '#24243e']}
      style={styles.container}
    >
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <LinearGradient
            colors={['rgba(233, 69, 96, 0.2)', 'rgba(233, 69, 96, 0.1)']}
            style={styles.subtitleContainer}
          >
            <Text style={styles.subtitle}>Customize your Studify experience</Text>
          </LinearGradient>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timer Settings</Text>
          
          <BlurView intensity={20} tint="dark" style={styles.settingsCard}>
            <LinearGradient
              colors={['rgba(233, 69, 96, 0.1)', 'rgba(233, 69, 96, 0.05)']}
              style={styles.cardGradient}
            >
              <View style={styles.settingItem}>
                <View style={styles.settingLabelContainer}>
                  <Ionicons name="briefcase" size={22} color="#e94560" />
                  <Text style={styles.settingLabel}>Work Duration</Text>
                </View>
                <BlurView intensity={15} tint="dark" style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={workTime}
                    onChangeText={setWorkTime}
                    keyboardType="numeric"
                    maxLength={3}
                    placeholderTextColor="#666"
                  />
                  <Text style={styles.inputUnit}>min</Text>
                </BlurView>
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingLabelContainer}>
                  <Ionicons name="cafe" size={22} color="#4CAF50" />
                  <Text style={styles.settingLabel}>Short Break</Text>
                </View>
                <BlurView intensity={15} tint="dark" style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={breakTime}
                    onChangeText={setBreakTime}
                    keyboardType="numeric"
                    maxLength={2}
                    placeholderTextColor="#666"
                  />
                  <Text style={styles.inputUnit}>min</Text>
                </BlurView>
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingLabelContainer}>
                  <Ionicons name="time" size={22} color="#2196F3" />
                  <Text style={styles.settingLabel}>Long Break</Text>
                </View>
                <BlurView intensity={15} tint="dark" style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={longBreakTime}
                    onChangeText={setLongBreakTime}
                    keyboardType="numeric"
                    maxLength={2}
                    placeholderTextColor="#666"
                  />
                  <Text style={styles.inputUnit}>min</Text>
                </BlurView>
              </View>

              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={saveSettings}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#4CAF50', '#45a049']}
                  style={styles.saveGradient}
                >
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                  <Text style={styles.buttonText}>Save Settings</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </BlurView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          
          <View style={styles.statsGrid}>
            <BlurView intensity={20} tint="dark" style={styles.statCard}>
              <LinearGradient
                colors={['rgba(76, 175, 80, 0.2)', 'rgba(76, 175, 80, 0.1)']}
                style={styles.statGradient}
              >
                <Ionicons name="timer" size={36} color="#4CAF50" />
                <Text style={styles.statNumber}>{completedSessions}</Text>
                <Text style={styles.statLabel}>Sessions</Text>
              </LinearGradient>
            </BlurView>
            
            <BlurView intensity={20} tint="dark" style={styles.statCard}>
              <LinearGradient
                colors={['rgba(255, 152, 0, 0.2)', 'rgba(255, 152, 0, 0.1)']}
                style={styles.statGradient}
              >
                <Ionicons name="flame" size={36} color="#FF9800" />
                <Text style={styles.statNumber}>{currentStreak}</Text>
                <Text style={styles.statLabel}>Day Streak</Text>
              </LinearGradient>
            </BlurView>
            
            <BlurView intensity={20} tint="dark" style={styles.statCard}>
              <LinearGradient
                colors={['rgba(255, 215, 0, 0.2)', 'rgba(255, 215, 0, 0.1)']}
                style={styles.statGradient}
              >
                <Ionicons name="cash" size={36} color="#FFD700" />
                <Text style={styles.statNumber}>{totalCoins}</Text>
                <Text style={styles.statLabel}>Total Coins</Text>
              </LinearGradient>
            </BlurView>
            
            <BlurView intensity={20} tint="dark" style={styles.statCard}>
              <LinearGradient
                colors={['rgba(33, 150, 243, 0.2)', 'rgba(33, 150, 243, 0.1)']}
                style={styles.statGradient}
              >
                <Ionicons name="time" size={36} color="#2196F3" />
                <Text style={styles.statNumber}>{formatTime(totalStudyTime)}</Text>
                <Text style={styles.statLabel}>Study Time</Text>
              </LinearGradient>
            </BlurView>
            
            <BlurView intensity={20} tint="dark" style={styles.statCard}>
              <LinearGradient
                colors={['rgba(156, 39, 176, 0.2)', 'rgba(156, 39, 176, 0.1)']}
                style={styles.statGradient}
              >
                <Ionicons name="cafe" size={36} color="#9C27B0" />
                <Text style={styles.statNumber}>{formatTime(totalBreakTime)}</Text>
                <Text style={styles.statLabel}>Break Time</Text>
              </LinearGradient>
            </BlurView>
          
          <BlurView intensity={20} tint="dark" style={[styles.statCard, styles.highlightCard]}>
            <LinearGradient
              colors={['rgba(233, 69, 96, 0.25)', 'rgba(233, 69, 96, 0.15)']}
              style={styles.statGradient}
            >
              <Ionicons name="phone-portrait" size={36} color="#e94560" />
              <Text style={styles.statNumber}>{formatSeconds(todayTime)}</Text>
              <Text style={styles.statLabel}>Today's Time</Text>
            </LinearGradient>
          </BlurView>
        </View>
      </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ App Info</Text>
          
          <TouchableOpacity 
            style={styles.appInfoButton} 
            onPress={() => setShowAppInfo(true)}
            activeOpacity={0.7}
          >
            <BlurView intensity={20} tint="dark" style={styles.appInfoBlur}>
              <LinearGradient
                colors={['rgba(233, 69, 96, 0.15)', 'rgba(233, 69, 96, 0.05)']}
                style={styles.appInfoGradient}
              >
                <Ionicons name="information-circle" size={28} color="#e94560" />
                <View style={styles.appInfoButtonText}>
                  <Text style={styles.appInfoTitle}>About Studify</Text>
                  <Text style={styles.appInfoSubtitle}>Tap to view app details</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#888" />
              </LinearGradient>
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.appInfoButton, { marginTop: 12 }]} 
            onPress={() => setShowBuildLog(true)}
            activeOpacity={0.7}
          >
            <BlurView intensity={20} tint="dark" style={styles.appInfoBlur}>
              <LinearGradient
                colors={['rgba(33, 150, 243, 0.15)', 'rgba(33, 150, 243, 0.05)']}
                style={styles.appInfoGradient}
              >
                <Ionicons name="construct" size={28} color="#2196F3" />
                <View style={styles.appInfoButtonText}>
                  <Text style={styles.appInfoTitle}>Build Log</Text>
                  <Text style={styles.appInfoSubtitle}>View development changelog</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#888" />
              </LinearGradient>
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.appInfoButton, { marginTop: 12 }]} 
            onPress={() => Alert.alert('Report Bug', 'Bug reporting feature coming soon!\n\nFor now, please contact:\n2023_yao_junyu@fhss.edu.sg', [{ text: 'OK' }])}
            activeOpacity={0.7}
          >
            <BlurView intensity={20} tint="dark" style={styles.appInfoBlur}>
              <LinearGradient
                colors={['rgba(255, 152, 0, 0.15)', 'rgba(255, 152, 0, 0.05)']}
                style={styles.appInfoGradient}
              >
                <Ionicons name="bug" size={28} color="#FF9800" />
                <View style={styles.appInfoButtonText}>
                  <Text style={styles.appInfoTitle}>Report Bug</Text>
                  <Text style={styles.appInfoSubtitle}>Help us improve Studify</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#888" />
              </LinearGradient>
            </BlurView>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Advanced</Text>
          
          <TouchableOpacity 
            style={styles.resetButton} 
            onPress={resetSettings}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(33, 150, 243, 0.3)', 'rgba(33, 150, 243, 0.2)']}
              style={styles.resetGradient}
            >
              <Ionicons name="refresh-circle" size={24} color="#2196F3" />
              <Text style={styles.buttonText}>Reset to Default</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.dangerButton} 
            onPress={clearAllData}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(244, 67, 54, 0.4)', 'rgba(244, 67, 54, 0.3)']}
              style={styles.dangerGradient}
            >
              <Ionicons name="trash" size={24} color="#f44336" />
              <Text style={styles.buttonText}>Clear All Data</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 Studify</Text>
          <Text style={styles.footerText}>Made by Junyu</Text>
        </View>

        {/* App Info Modal */}
        <Modal
          visible={showAppInfo}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowAppInfo(false)}
        >
          <View style={styles.modalOverlay}>
            <BlurView intensity={40} tint="dark" style={styles.modalBlur}>
              <LinearGradient
                colors={['#1a1a2e', '#24243e', '#2d2d4a']}
                style={styles.modalContent}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>ℹ️ About Studify</Text>
                  <TouchableOpacity 
                    onPress={() => setShowAppInfo(false)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close-circle" size={32} color="#e94560" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.logoSection}>
                    <LinearGradient
                      colors={['rgba(233, 69, 96, 0.2)', 'rgba(233, 69, 96, 0.1)']}
                      style={styles.logoContainer}
                    >
                      <Ionicons name="book" size={64} color="#e94560" />
                    </LinearGradient>
                    <Text style={styles.appName}>Studify</Text>
                    <Text style={styles.appTagline}>Your Ultimate Study Companion</Text>
                  </View>

                  <BlurView intensity={15} tint="dark" style={styles.infoCard}>
                    <LinearGradient
                      colors={['rgba(233, 69, 96, 0.1)', 'rgba(233, 69, 96, 0.05)']}
                      style={styles.infoGradient}
                    >
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Version</Text>
                        <Text style={styles.infoValue}>1.2.1</Text>
                      </View>
                      
                      <View style={styles.infoDivider} />
                      <View style={styles.infoDivider} />
                      
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Developer</Text>
                        <Text style={styles.infoValue}>Junyu</Text>
                      </View>
                      
                      <View style={styles.infoDivider} />
                      
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Built with</Text>
                        <Text style={styles.infoValue}>React Native & Expo</Text>
                      </View>
                      
                      <View style={styles.infoDivider} />
                      
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Purpose</Text>
                        <Text style={styles.infoValue}>Productive Studying</Text>
                      </View>
                    </LinearGradient>
                  </BlurView>

                  <View style={styles.featuresSection}>
                    <Text style={styles.featuresSectionTitle}>✨ Features</Text>
                    <BlurView intensity={15} tint="dark" style={styles.featureContainer}>
                      <View style={styles.featureItem}>
                        <LinearGradient
                          colors={['rgba(76, 175, 80, 0.2)', 'rgba(76, 175, 80, 0.1)']}
                          style={styles.featureIconContainer}
                        >
                          <Ionicons name="timer" size={22} color="#4CAF50" />
                        </LinearGradient>
                        <Text style={styles.featureText}>Pomodoro Timer</Text>
                      </View>
                      <View style={styles.featureItem}>
                        <LinearGradient
                          colors={['rgba(33, 150, 243, 0.2)', 'rgba(33, 150, 243, 0.1)']}
                          style={styles.featureIconContainer}
                        >
                          <Ionicons name="book" size={22} color="#2196F3" />
                        </LinearGradient>
                        <Text style={styles.featureText}>Homework Tracker</Text>
                      </View>
                      <View style={styles.featureItem}>
                        <LinearGradient
                          colors={['rgba(255, 152, 0, 0.2)', 'rgba(255, 152, 0, 0.1)']}
                          style={styles.featureIconContainer}
                        >
                          <Ionicons name="notifications" size={22} color="#FF9800" />
                        </LinearGradient>
                        <Text style={styles.featureText}>Smart Notifications</Text>
                      </View>
                      <View style={styles.featureItem}>
                        <LinearGradient
                          colors={['rgba(255, 215, 0, 0.2)', 'rgba(255, 215, 0, 0.1)']}
                          style={styles.featureIconContainer}
                        >
                          <Ionicons name="cash" size={22} color="#FFD700" />
                        </LinearGradient>
                        <Text style={styles.featureText}>Coin Rewards System</Text>
                      </View>
                      <View style={styles.featureItem}>
                        <LinearGradient
                          colors={['rgba(156, 39, 176, 0.2)', 'rgba(156, 39, 176, 0.1)']}
                          style={styles.featureIconContainer}
                        >
                          <Ionicons name="paw" size={22} color="#9C27B0" />
                        </LinearGradient>
                        <Text style={styles.featureText}>Study Companion</Text>
                      </View>
                      <View style={styles.featureItem}>
                        <LinearGradient
                          colors={['rgba(233, 69, 96, 0.2)', 'rgba(233, 69, 96, 0.1)']}
                          style={styles.featureIconContainer}
                        >
                          <Ionicons name="sparkles" size={22} color="#e94560" />
                        </LinearGradient>
                        <Text style={styles.featureText}>AI Study Assistant</Text>
                      </View>
                      <View style={styles.featureItem}>
                        <LinearGradient
                          colors={['rgba(138, 35, 135, 0.2)', 'rgba(138, 35, 135, 0.1)']}
                          style={styles.featureIconContainer}
                        >
                          <Ionicons name="calendar" size={22} color="#8A2387" />
                        </LinearGradient>
                        <Text style={styles.featureText}>Study Planner</Text>
                      </View>
                      <View style={styles.featureItem}>
                        <LinearGradient
                          colors={['rgba(76, 175, 80, 0.2)', 'rgba(76, 175, 80, 0.1)']}
                          style={styles.featureIconContainer}
                        >
                          <Ionicons name="people" size={22} color="#4CAF50" />
                        </LinearGradient>
                        <Text style={styles.featureText}>Study Rooms</Text>
                      </View>
                    </BlurView>
                  </View>

                  <View style={styles.modalFooter}>
                    <Text style={styles.modalFooterText}>© 2026 Studify</Text>
                    <Text style={styles.modalFooterText}>Made by Junyu</Text>
                  </View>
                </ScrollView>
              </LinearGradient>
            </BlurView>
          </View>
        </Modal>

        {/* Build Log Modal */}
        <Modal
          visible={showBuildLog}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowBuildLog(false)}
        >
          <View style={styles.modalOverlay}>
            <BlurView intensity={40} tint="dark" style={styles.modalBlur}>
              <LinearGradient
                colors={['#1a1a2e', '#24243e', '#2d2d4a']}
                style={styles.modalContent}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>🔨 Build Log</Text>
                  <TouchableOpacity 
                    onPress={() => setShowBuildLog(false)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close-circle" size={32} color="#e94560" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <BlurView intensity={15} tint="dark" style={styles.buildLogCard}>
                    <LinearGradient
                      colors={['rgba(76, 175, 80, 0.15)', 'rgba(76, 175, 80, 0.05)']}
                      style={styles.buildLogGradient}
                    >
                      <View style={styles.buildLogHeader}>
                        <View style={styles.buildVersionBadge}>
                          <Text style={styles.buildVersionText}>v1.2.1</Text>
                        </View>
                        <Text style={styles.buildDate}>January 13, 2026</Text>
                      </View>
                      <View style={styles.buildLogContent}>
                        <View style={styles.logItem}>
                          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                          <Text style={styles.logText}>Added Study Rooms with real-time Firebase sync</Text>
                        </View>
                        <View style={styles.logItem}>
                          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                          <Text style={styles.logText}>Study/Break/Pause controls with status indicators</Text>
                        
                        </View>
                        <View style={styles.logItem}>
                          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                          <Text style={styles.logText}>Room sharing with 6-digit codes for cross-device joining</Text>
                        </View>
                        <View style={styles.logItem}>
                          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                          <Text style={styles.logText}>Real-time member tracking and study time sync</Text>
                        </View>
                        <View style={styles.logItem}>
                          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                          <Text style={styles.logText}>Added AI Study Assistant</Text>
                        </View>
                        <View style={styles.logItem}>
                          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                          <Text style={styles.logText}>Added Study Planner with calendar view</Text>
                        </View>
                        <View style={styles.logItem}>
                          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                          <Text style={styles.logText}>Added coin info overlay with earning/usage details</Text>
                        </View>
                        <View style={styles.logItem}>
                          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                          <Text style={styles.logText}>Fixed nav bar auto-hiding after permissions</Text>
                        </View>
                        <View style={styles.logItem}>
                          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                          <Text style={styles.logText}>Made Pomodoro screen fully scrollable</Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </BlurView>

                  <BlurView intensity={15} tint="dark" style={styles.buildLogCard}>
                    <LinearGradient
                      colors={['rgba(156, 39, 176, 0.15)', 'rgba(156, 39, 176, 0.05)']}
                      style={styles.buildLogGradient}
                    >
                      <View style={styles.buildLogHeader}>
                        <View style={[styles.buildVersionBadge, { backgroundColor: 'rgba(156, 39, 176, 0.3)' }]}>
                          <Text style={styles.buildVersionText}>v1.2.0</Text>
                        </View>
                        <Text style={styles.buildDate}>January 12, 2026</Text>
                      </View>
                      <View style={styles.buildLogContent}>
                        <View style={styles.logItem}>
                          <Ionicons name="checkmark-circle" size={20} color="#9C27B0" />
                          <Text style={styles.logText}>Added completion overlay for homework</Text>
                        </View>
                        <View style={styles.logItem}>
                          <Ionicons name="checkmark-circle" size={20} color="#9C27B0" />
                          <Text style={styles.logText}>Implemented navigation bar hiding</Text>
                        </View>
                        <View style={styles.logItem}>
                          <Ionicons name="checkmark-circle" size={20} color="#9C27B0" />
                          <Text style={styles.logText}>Added floating cat animation to Pomodoro</Text>
                        </View>
                        <View style={styles.logItem}>
                          <Ionicons name="checkmark-circle" size={20} color="#9C27B0" />
                          <Text style={styles.logText}>Enhanced UI with gradients and blur effects</Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </BlurView>

                  <BlurView intensity={15} tint="dark" style={styles.buildLogCard}>
                    <LinearGradient
                      colors={['rgba(33, 150, 243, 0.15)', 'rgba(33, 150, 243, 0.05)']}
                      style={styles.buildLogGradient}
                    >
                      <View style={styles.buildLogHeader}>
                        <View style={[styles.buildVersionBadge, { backgroundColor: 'rgba(33, 150, 243, 0.3)' }]}>
                          <Text style={styles.buildVersionText}>v1.1.0</Text>
                        </View>
                        <Text style={styles.buildDate}>January 8, 2026</Text>
                      </View>
                      <View style={styles.buildLogContent}>
                        <View style={styles.logItem}>
                          <Ionicons name="checkmark-circle" size={20} color="#2196F3" />
                          <Text style={styles.logText}>Added coin rewards system</Text>
                        </View>
                        <View style={styles.logItem}>
                          <Ionicons name="checkmark-circle" size={20} color="#2196F3" />
                          <Text style={styles.logText}>Implemented homework notifications</Text>
                        </View>
                        <View style={styles.logItem}>
                          <Ionicons name="checkmark-circle" size={20} color="#2196F3" />
                          <Text style={styles.logText}>Added statistics tracking</Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </BlurView>

                  <BlurView intensity={15} tint="dark" style={styles.buildLogCard}>
                    <LinearGradient
                      colors={['rgba(255, 152, 0, 0.15)', 'rgba(255, 152, 0, 0.05)']}
                      style={styles.buildLogGradient}
                    >
                      <View style={styles.buildLogHeader}>
                        <View style={[styles.buildVersionBadge, { backgroundColor: 'rgba(255, 152, 0, 0.3)' }]}>
                          <Text style={styles.buildVersionText}>v1.0.0</Text>
                        </View>
                        <Text style={styles.buildDate}>January 1, 2026</Text>
                      </View>
                      <View style={styles.buildLogContent}>
                        <View style={styles.logItem}>
                          <Ionicons name="checkmark-circle" size={20} color="#FF9800" />
                          <Text style={styles.logText}>Initial release</Text>
                        </View>
                        <View style={styles.logItem}>
                          <Ionicons name="checkmark-circle" size={20} color="#FF9800" />
                          <Text style={styles.logText}>Pomodoro timer with customizable durations</Text>
                        </View>
                        <View style={styles.logItem}>
                          <Ionicons name="checkmark-circle" size={20} color="#FF9800" />
                          <Text style={styles.logText}>Homework tracking with priorities</Text>
                        </View>
                        <View style={styles.logItem}>
                          <Ionicons name="checkmark-circle" size={20} color="#FF9800" />
                          <Text style={styles.logText}>Settings and customization options</Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </BlurView>

                  <View style={styles.modalFooter}>
                    <Text style={styles.modalFooterText}>Built by Junyu</Text>
                  </View>
                </ScrollView>
              </LinearGradient>
            </BlurView>
          </View>
        </Modal>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitleContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  settingsCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 6,
  },
  cardGradient: {
    padding: 20,
  },
  settingItem: {
    marginBottom: 20,
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  settingLabel: {
    fontSize: 17,
    color: '#fff',
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(233, 69, 96, 0.3)',
    paddingHorizontal: 16,
  },
  input: {
    backgroundColor: 'transparent',
    color: '#fff',
    padding: 14,
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  inputUnit: {
    color: '#aaa',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 12,
  },
  saveGradient: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  resetButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  resetGradient: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  dangerButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  dangerGradient: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  statCard: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '48%',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
  },
  statGradient: {
    padding: 20,
    alignItems: 'center',
  },
  highlightCard: {
    width: '100%',
    elevation: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
    letterSpacing: 0.5,
  },
  statLabel: {
    fontSize: 14,
    color: '#ddd',
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    padding: 20,
    marginBottom: 30,
  },
  footerText: {
    color: '#777',
    fontSize: 14,
    marginVertical: 2,
  },
  appInfoButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  appInfoBlur: {
    overflow: 'hidden',
    borderRadius: 16,
  },
  appInfoGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },
  appInfoButtonText: {
    flex: 1,
    marginLeft: 14,
  },
  appInfoTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  appInfoSubtitle: {
    fontSize: 15,
    color: '#aaa',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalBlur: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  modalBody: {
    padding: 24,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoContainer: {
    padding: 24,
    borderRadius: 24,
    overflow: 'hidden',
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    letterSpacing: 0.5,
  },
  appTagline: {
    fontSize: 17,
    color: '#aaa',
    marginTop: 8,
    textAlign: 'center',
  },
  infoCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 4,
  },
  infoGradient: {
    padding: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  infoLabel: {
    fontSize: 17,
    color: '#bbb',
    fontWeight: '600',
    flex: 1,
  },
  infoValue: {
    fontSize: 17,
    color: '#fff',
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
    letterSpacing: 0.3,
  },
  infoDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  featuresSection: {
    marginTop: 8,
  },
  featuresSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  featureContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    padding: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  featureIconContainer: {
    padding: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  featureText: {
    fontSize: 17,
    color: '#fff',
    marginLeft: 14,
    fontWeight: '600',
  },
  modalFooter: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  modalFooterText: {
    color: '#777',
    fontSize: 14,
    marginVertical: 2,
  },
  buildLogCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 4,
  },
  buildLogGradient: {
    padding: 18,
  },
  buildLogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  buildVersionBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  buildVersionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  buildDate: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
  },
  buildLogContent: {
    gap: 12,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logText: {
    color: '#fff',
    fontSize: 15,
    flex: 1,
    lineHeight: 22,
  },
});
