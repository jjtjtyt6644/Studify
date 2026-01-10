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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CoinSystem } from '../utils/CoinSystem';

export default function SettingsScreen() {
  const [workTime, setWorkTime] = useState('25');
  const [breakTime, setBreakTime] = useState('5');
  const [longBreakTime, setLongBreakTime] = useState('15');
  const [completedSessions, setCompletedSessions] = useState(0);
  const [showAppInfo, setShowAppInfo] = useState(false);
  
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Customize your Studify experience</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Timer Settings</Text>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Work Duration (minutes)</Text>
          <TextInput
            style={styles.input}
            value={workTime}
            onChangeText={setWorkTime}
            keyboardType="numeric"
            maxLength={3}
            placeholderTextColor="#666"
          />
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Short Break (minutes)</Text>
          <TextInput
            style={styles.input}
            value={breakTime}
            onChangeText={setBreakTime}
            keyboardType="numeric"
            maxLength={2}
            placeholderTextColor="#666"
          />
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Long Break (minutes)</Text>
          <TextInput
            style={styles.input}
            value={longBreakTime}
            onChangeText={setLongBreakTime}
            keyboardType="numeric"
            maxLength={2}
            placeholderTextColor="#666"
          />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
          <Text style={styles.buttonText}>Save Settings</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Statistics</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="timer" size={32} color="#4CAF50" />
            <Text style={styles.statNumber}>{completedSessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="flame" size={32} color="#FF9800" />
            <Text style={styles.statNumber}>{currentStreak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="cash" size={32} color="#FFD700" />
            <Text style={styles.statNumber}>{totalCoins}</Text>
            <Text style={styles.statLabel}>Total Coins</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="time" size={32} color="#2196F3" />
            <Text style={styles.statNumber}>{formatTime(totalStudyTime)}</Text>
            <Text style={styles.statLabel}>Study Time</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="cafe" size={32} color="#9C27B0" />
            <Text style={styles.statNumber}>{formatTime(totalBreakTime)}</Text>
            <Text style={styles.statLabel}>Break Time</Text>
          </View>
          
          <View style={[styles.statCard, styles.highlightCard]}>
            <Ionicons name="phone-portrait" size={32} color="#e94560" />
            <Text style={styles.statNumber}>{formatSeconds(todayTime)}</Text>
            <Text style={styles.statLabel}>Today's Time</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Info</Text>
        
        <TouchableOpacity 
          style={styles.appInfoButton} 
          onPress={() => setShowAppInfo(true)}
          activeOpacity={0.7}
        >
          <View style={styles.appInfoButtonContent}>
            <Ionicons name="information-circle" size={24} color="#e94560" />
            <View style={styles.appInfoButtonText}>
              <Text style={styles.appInfoTitle}>About Studify</Text>
              <Text style={styles.appInfoSubtitle}>Tap to view app details</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Advanced</Text>
        
        <TouchableOpacity style={styles.resetButton} onPress={resetSettings}>
          <Text style={styles.buttonText}>Reset to Default</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dangerButton} onPress={clearAllData}>
          <Text style={styles.buttonText}>Clear All Data</Text>
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>About Studify</Text>
              <TouchableOpacity onPress={() => setShowAppInfo(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.logoSection}>
                <Ionicons name="book" size={60} color="#e94560" />
                <Text style={styles.appName}>Studify</Text>
                <Text style={styles.appTagline}>Your Ultimate Study Companion</Text>
              </View>

              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Version</Text>
                  <Text style={styles.infoValue}>1.2.0</Text>
                </View>
                
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
              </View>

              <View style={styles.featuresSection}>
                <Text style={styles.featuresSectionTitle}>Features</Text>
                <View style={styles.featureItem}>
                  <Ionicons name="timer" size={20} color="#4CAF50" />
                  <Text style={styles.featureText}>Pomodoro Timer</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="book" size={20} color="#2196F3" />
                  <Text style={styles.featureText}>Homework Tracker</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="notifications" size={20} color="#FF9800" />
                  <Text style={styles.featureText}>Smart Notifications</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="cash" size={20} color="#FFD700" />
                  <Text style={styles.featureText}>Coin Rewards System</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="paw" size={20} color="#9C27B0" />
                  <Text style={styles.featureText}>Study Companion</Text>
                </View>
              </View>

              <View style={styles.modalFooter}>
                <Text style={styles.modalFooterText}>© 2026 Studify</Text>
                <Text style={styles.modalFooterText}>Made by Junyu</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
  },
  section: {
    margin: 20,
    padding: 20,
    backgroundColor: '#16213e',
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  settingItem: {
    marginBottom: 20,
  },
  settingLabel: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a2e',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e94560',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  resetButton: {
    backgroundColor: '#FF9800',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  dangerButton: {
    backgroundColor: '#f44336',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    width: '48%',
    borderWidth: 2,
    borderColor: '#2a3a5e',
  },
  highlightCard: {
    borderColor: '#e94560',
    backgroundColor: '#2a1a2e',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 4,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    padding: 20,
    marginBottom: 30,
  },
  footerText: {
    color: '#666',
    fontSize: 14,
    marginVertical: 2,
  },
  infoCard: {
    backgroundColor: '#1a1a2e',
    padding: 20,
    borderRadius: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 16,
    color: '#aaa',
    fontWeight: '600',
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
  },
  infoValueSmall: {
    fontSize: 14,
    color: '#fff',
    flex: 1,
    textAlign: 'right',
    lineHeight: 22,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#2a3a5e',
  },
  appInfoButton: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    overflow: 'hidden',
  },
  appInfoButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  appInfoButtonText: {
    flex: 1,
    marginLeft: 12,
  },
  appInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  appInfoSubtitle: {
    fontSize: 14,
    color: '#aaa',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#16213e',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalBody: {
    padding: 20,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 15,
  },
  appTagline: {
    fontSize: 16,
    color: '#aaa',
    marginTop: 8,
    textAlign: 'center',
  },
  featuresSection: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#16213e',
    borderRadius: 8,
  },
  featuresSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  featureText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 12,
  },
  modalFooter: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  modalFooterText: {
    color: '#666',
    fontSize: 14,
    marginVertical: 2,
  },
});
