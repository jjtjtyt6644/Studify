import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Animated,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import LottieView from 'lottie-react-native';
import { CoinSystem } from '../utils/CoinSystem';

const { width } = Dimensions.get('window');

export default function PomodoroScreen() {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [completedSessions, setCompletedSessions] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const hasRestored = useRef(false);

  useEffect(() => {
    const initialize = async () => {
      await setupNotificationChannel();
      await loadSettings();
      await loadCompletedSessions();
      if (!hasRestored.current) {
        await restoreTimerState();
        hasRestored.current = true;
      }
    };
    initialize();
  }, []);

  useEffect(() => {
    // Listen for settings changes
    const interval = setInterval(async () => {
      if (!isActive) {
        await loadSettings();
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isActive]);

  useEffect(() => {
    if (isActive && !isPaused) {
      saveTimerState(); // Save state whenever timer is running
      
      intervalRef.current = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            handleTimerComplete();
          } else {
            setMinutes(minutes - 1);
            setSeconds(59);
          }
        } else {
          setSeconds(seconds - 1);
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, isPaused, minutes, seconds]);

  const loadSettings = async () => {
    try {
      if (mode === 'work') {
        const workTime = await AsyncStorage.getItem('workTime');
        if (workTime) {
          setMinutes(parseInt(workTime));
          setSeconds(0);
        }
      } else {
        const breakTime = await AsyncStorage.getItem('breakTime');
        if (breakTime) {
          setMinutes(parseInt(breakTime));
          setSeconds(0);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadCompletedSessions = async () => {
    try {
      const sessions = await AsyncStorage.getItem('completedSessions');
      if (sessions) {
        setCompletedSessions(parseInt(sessions));
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const setupNotificationChannel = async () => {
    try {
      await Notifications.setNotificationChannelAsync('pomodoro', {
        name: 'Pomodoro Timer',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#e94560',
      });
    } catch (error) {
      console.error('Error setting up notification channel:', error);
    }
  };

  const saveCompletedSessions = async (count: number) => {
    try {
      await AsyncStorage.setItem('completedSessions', count.toString());
    } catch (error) {
      console.error('Error saving sessions:', error);
    }
  };

  const scheduleTimerNotification = async (totalSeconds: number, currentMode: 'work' | 'break') => {
    try {
      // First, cancel any existing notifications to prevent duplicates
      await cancelTimerNotification();
      
      const triggerTime = new Date();
      triggerTime.setSeconds(triggerTime.getSeconds() + totalSeconds);
      
      // Only schedule if the time is in the future
      if (triggerTime > new Date()) {
        await Notifications.scheduleNotificationAsync({
          identifier: 'pomodoro_timer',
          content: {
            title: currentMode === 'work' ? '🎉 Work Session Complete!' : '✅ Break Complete!',
            body: currentMode === 'work' 
              ? 'Great job! Time for a break. +10 coins earned!' 
              : 'Break is over! Ready to get back to work?',
            data: { mode: currentMode },
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: {
            date: triggerTime,
            channelId: 'pomodoro',
          },
        });
      }
    } catch (error) {
      console.error('Error scheduling timer notification:', error);
    }
  };

  const cancelTimerNotification = async () => {
    try {
      // Get all scheduled notifications
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      
      // Cancel only pomodoro timer notifications
      for (const notification of scheduled) {
        if (notification.identifier === 'pomodoro_timer') {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  };

  const saveTimerState = async () => {
    try {
      const timerState = {
        startTime: Date.now(),
        endTime: Date.now() + (minutes * 60 + seconds) * 1000,
        mode,
        isActive,
        isPaused,
      };
      await AsyncStorage.setItem('timerState', JSON.stringify(timerState));
    } catch (error) {
      console.error('Error saving timer state:', error);
    }
  };

  const restoreTimerState = async () => {
    try {
      const stateStr = await AsyncStorage.getItem('timerState');
      if (!stateStr) return;

      const state = JSON.parse(stateStr);
      if (!state.isActive || state.isPaused) {
        await AsyncStorage.removeItem('timerState');
        return;
      }

      const now = Date.now();
      const timeRemaining = Math.max(0, state.endTime - now);

      if (timeRemaining === 0) {
        // Timer completed while app was closed
        await AsyncStorage.removeItem('timerState');
        setMode(state.mode);
        await handleTimerComplete();
      } else {
        // Timer still running
        const remainingMinutes = Math.floor(timeRemaining / 60000);
        const remainingSeconds = Math.floor((timeRemaining % 60000) / 1000);
        
        setMode(state.mode);
        setMinutes(remainingMinutes);
        setSeconds(remainingSeconds);
        setIsActive(true);
        setIsPaused(false);
        
        // Start pulse animation
        Animated.spring(scaleAnim, {
          toValue: 1.05,
          useNativeDriver: true,
        }).start();
        
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }
    } catch (error) {
      console.error('Error restoring timer state:', error);
    }
  };

  const clearTimerState = async () => {
    try {
      await AsyncStorage.removeItem('timerState');
    } catch (error) {
      console.error('Error clearing timer state:', error);
    }
  };

  const handleTimerComplete = async () => {
    setIsActive(false);
    setIsPaused(false);
    await clearTimerState(); // Clear saved timer state
    await cancelTimerNotification(); // Cancel notification since timer completed

    if (mode === 'work') {
      const newCount = completedSessions + 1;
      setCompletedSessions(newCount);
      await saveCompletedSessions(newCount);
      
      // Save session to today's date
      const today = new Date().toISOString().split('T')[0];
      await saveSessionToDate(today);
      
      // Award coins!
      const coinsEarned = await CoinSystem.addCoins(
        CoinSystem.REWARDS.POMODORO_COMPLETE,
        'Completed Pomodoro session'
      );
      
      Alert.alert(
        '🎉 Work Session Complete!', 
        `Time for a break!\n\n💰 +${CoinSystem.REWARDS.POMODORO_COMPLETE} coins earned!\nTotal: ${coinsEarned} coins`,
        [
          {
            text: 'Start Break',
            onPress: () => {
              setMode('break');
              setMinutes(5);
              setSeconds(0);
            },
          },
        ]
      );
    } else {
      Alert.alert('Break Complete!', 'Ready to get back to work?', [
        {
          text: 'Start Work',
          onPress: async () => {
            setMode('work');
            const workTime = await AsyncStorage.getItem('workTime');
            setMinutes(workTime ? parseInt(workTime) : 25);
            setSeconds(0);
          },
        },
      ]);
    }
  };

  const saveSessionToDate = async (date: string) => {
    try {
      const sessionsData = await AsyncStorage.getItem('calendarSessions');
      const sessions = sessionsData ? JSON.parse(sessionsData) : {};
      sessions[date] = (sessions[date] || 0) + 1;
      await AsyncStorage.setItem('calendarSessions', JSON.stringify(sessions));
    } catch (error) {
      console.error('Error saving session to date:', error);
    }
  };

  const handleStart = async () => {
    setIsActive(true);
    setIsPaused(false);
    
    // Schedule notification for when timer completes
    const totalSeconds = minutes * 60 + seconds;
    await scheduleTimerNotification(totalSeconds, mode);
    
    Animated.spring(scaleAnim, {
      toValue: 1.05,
      useNativeDriver: true,
    }).start();
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const handlePause = async () => {
    setIsPaused(true);
    await clearTimerState(); // Clear state when paused
    await cancelTimerNotification(); // Cancel scheduled notification
  };

  const handleResume = async () => {
    setIsPaused(false);
    
    // Reschedule notification for remaining time
    const totalSeconds = minutes * 60 + seconds;
    await scheduleTimerNotification(totalSeconds, mode);
  };

  const handleReset = async () => {
    setIsActive(false);
    setIsPaused(false);
    await clearTimerState(); // Clear saved state
    await cancelTimerNotification(); // Cancel scheduled notification
    if (mode === 'work') {
      const workTime = await AsyncStorage.getItem('workTime');
      setMinutes(workTime ? parseInt(workTime) : 25);
    } else {
      const breakTime = await AsyncStorage.getItem('breakTime');
      setMinutes(breakTime ? parseInt(breakTime) : 5);
    }
    setSeconds(0);
    
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  const handleModeSwitch = async () => {
    if (isActive) {
      Alert.alert(
        'Timer Running',
        'Stop the timer before switching modes.',
        [{ text: 'OK' }]
      );
      return;
    }

    const newMode = mode === 'work' ? 'break' : 'work';
    setMode(newMode);
    
    if (newMode === 'work') {
      const workTime = await AsyncStorage.getItem('workTime');
      setMinutes(workTime ? parseInt(workTime) : 25);
    } else {
      const breakTime = await AsyncStorage.getItem('breakTime');
      setMinutes(breakTime ? parseInt(breakTime) : 5);
    }
    setSeconds(0);
  };

  const formatTime = (mins: number, secs: number) => {
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((minutes * 60 + seconds) / ((mode === 'work' ? 25 : 5) * 60)) * 100;
  const totalMinutes = mode === 'work' ? 25 : 5;
  
  return (
    <LinearGradient
      colors={['#0f0c29', '#1a1a2e', '#24243e']}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.modeIndicator}
          onPress={handleModeSwitch}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={mode === 'work' ? ['#e94560', '#d63251'] : ['#4CAF50', '#45a049']}
            style={styles.modeGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons 
              name={mode === 'work' ? 'book' : 'cafe'} 
              size={24} 
              color="#fff" 
            />
            <Text style={styles.modeText}>
              {mode === 'work' ? 'Focus Mode' : 'Break Time'}
            </Text>
            <Ionicons 
              name="swap-horizontal" 
              size={20} 
              color="rgba(255, 255, 255, 0.7)" 
              style={{ marginLeft: 8 }}
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Timer Circle with Gradient Border */}
      <Animated.View 
        style={[
          styles.timerWrapper,
          { transform: [{ scale: isActive && !isPaused ? pulseAnim : 1 }] }
        ]}
      >
        <LinearGradient
          colors={mode === 'work' ? ['#e94560', '#ff6b81', '#e94560'] : ['#4CAF50', '#66bb6a', '#4CAF50']}
          style={styles.timerGradientBorder}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.timerCircle}>
            <View style={styles.progressRing}>
              <Text style={styles.timer}>{formatTime(minutes, seconds)}</Text>
              <View style={styles.timerLabelContainer}>
                <View style={styles.statusDot} />
                <Text style={styles.timerLabel}>
                  {isActive && !isPaused ? 'Running' : isPaused ? 'Paused' : 'Ready'}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Control Buttons */}
      <View style={styles.controlsContainer}>
        {!isActive ? (
          <TouchableOpacity 
            style={[styles.mainButton, styles.startButton]} 
            onPress={handleStart}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#4CAF50', '#45a049']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="play" size={36} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        ) : isPaused ? (
          <>
            <TouchableOpacity 
              style={styles.mainButton} 
              onPress={handleResume}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#2196F3', '#1976D2']}
                style={styles.buttonGradientSmall}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="play" size={28} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.mainButton} 
              onPress={handleReset}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#9E9E9E', '#757575']}
                style={styles.buttonGradientSmall}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="refresh" size={28} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity 
              style={styles.mainButton} 
              onPress={handlePause}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#FF9800', '#F57C00']}
                style={styles.buttonGradientSmall}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="pause" size={28} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.mainButton} 
              onPress={handleReset}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#9E9E9E', '#757575']}
                style={styles.buttonGradientSmall}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="refresh" size={28} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Stats with Glass Effect */}
      <View style={styles.statsRow}>
        <BlurView intensity={20} style={styles.statCard} tint="dark">
          <LinearGradient
            colors={['rgba(255, 215, 0, 0.1)', 'rgba(255, 215, 0, 0.05)']}
            style={styles.statGradient}
          >
            <View style={styles.statIconContainer}>
              <Ionicons name="trophy" size={32} color="#FFD700" />
            </View>
            <Text style={styles.statNumber}>{completedSessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </LinearGradient>
        </BlurView>
        
        <BlurView intensity={20} style={styles.statCard} tint="dark">
          <LinearGradient
            colors={['rgba(233, 69, 96, 0.1)', 'rgba(233, 69, 96, 0.05)']}
            style={styles.statGradient}
          >
            <View style={styles.statIconContainer}>
              <Ionicons name="flame" size={32} color="#e94560" />
            </View>
            <Text style={styles.statNumber}>{Math.floor(completedSessions * 25 / 60)}h</Text>
            <Text style={styles.statLabel}>Focus Time</Text>
          </LinearGradient>
        </BlurView>
      </View>
      </ScrollView>
      
      {/* Floating Cat Animation */}
      <View style={styles.floatingCat} pointerEvents="none">
        <LottieView
          source={require('../../assets/animations/cat.json')}
          autoPlay
          loop
          style={styles.lottie}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 40,
  },
  modeIndicator: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  modeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  modeText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timerWrapper: {
    marginVertical: 40,
  },
  timerGradientBorder: {
    width: width * 0.78,
    height: width * 0.78,
    borderRadius: width * 0.39,
    padding: 4,
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 25,
    elevation: 12,
  },
  timerCircle: {
    width: '100%',
    height: '100%',
    borderRadius: width * 0.375,
    backgroundColor: 'rgba(22, 33, 62, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timer: {
    fontSize: 68,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'monospace',
    letterSpacing: 6,
    textShadowColor: 'rgba(233, 69, 96, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  timerLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  timerLabel: {
    fontSize: 14,
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: 3,
    fontWeight: '600',
  },
  controlsContainer: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 20,
  },
  mainButton: {
    borderRadius: 40,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  buttonGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonGradientSmall: {
    width: 75,
    height: 75,
    borderRadius: 37.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButton: {
    transform: [{ scale: 1 }],
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 50,
    paddingHorizontal: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statGradient: {
    padding: 24,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: '600',
  },
  floatingCat: {
    position: 'absolute',
    right: -30,
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
