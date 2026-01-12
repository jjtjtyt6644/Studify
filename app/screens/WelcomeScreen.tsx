import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WelcomeScreenProps {
  onComplete: () => void;
}

export default function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const handleGetStarted = async () => {
    try {
      await AsyncStorage.setItem('hasSeenWelcome', 'true');
      onComplete();
    } catch (error) {
      console.error('Error saving welcome flag:', error);
    }
  };

  const features = [
    {
      icon: 'timer',
      color: '#4CAF50',
      title: 'Pomodoro Timer',
      description: 'Stay focused with customizable work and break sessions',
    },
    {
      icon: 'book',
      color: '#2196F3',
      title: 'Homework Tracker',
      description: 'Manage assignments with due dates and priorities',
    },
    {
      icon: 'notifications',
      color: '#FF9800',
      title: 'Smart Reminders',
      description: 'Get notified about homework and timer completions',
    },
    {
      icon: 'cash',
      color: '#FFD700',
      title: 'Coin System',
      description: 'Earn coins by completing tasks and staying productive',
    },
    {
      icon: 'storefront',
      color: '#e94560',
      title: 'In-App Store',
      description: 'Spend your earned coins on themes and rewards (Coming Soon)',
    },
    {
      icon: 'paw',
      color: '#9C27B0',
      title: 'Study Companion',
      description: 'A cute animated cat keeps you company while studying',
    },
  ];

  return (
    <LinearGradient
      colors={['#0f0c29', '#1a1a2e', '#24243e']}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <BlurView intensity={20} tint="dark" style={styles.logoBlur}>
            <LinearGradient
              colors={['rgba(233, 69, 96, 0.3)', 'rgba(233, 69, 96, 0.15)']}
              style={styles.logoContainer}
            >
              <Ionicons name="book" size={68} color="#e94560" />
            </LinearGradient>
          </BlurView>
          <Text style={styles.title}>Welcome to Studify! 📚</Text>
          <Text style={styles.subtitle}>
            Your ultimate study companion for productivity and success
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <Text style={styles.sectionTitle}>✨ Features & Tools</Text>
          {features.map((feature, index) => (
            <BlurView key={index} intensity={20} tint="dark" style={styles.featureCard}>
              <LinearGradient
                colors={[
                  `${feature.color}30`,
                  `${feature.color}15`,
                ]}
                style={styles.featureGradient}
              >
                <View style={[styles.featureIcon, { backgroundColor: `${feature.color}40` }]}>
                  <Ionicons name={feature.icon as any} size={36} color={feature.color} />
                </View>
                <View style={styles.featureInfo}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              </LinearGradient>
            </BlurView>
          ))}
        </View>

        {/* Credits */}
        <BlurView intensity={20} tint="dark" style={styles.creditsContainer}>
          <LinearGradient
            colors={['rgba(233, 69, 96, 0.15)', 'rgba(233, 69, 96, 0.05)']}
            style={styles.creditsGradient}
          >
            <Text style={styles.creditsTitle}>Created By</Text>
            <Text style={styles.creditsText}>Junyu</Text>
            <Text style={styles.creditsSubtext}>
              Built to help students achieve their goals
            </Text>
            <View style={styles.versionContainer}>
              <Text style={styles.versionText}>Version 1.2.0</Text>
            </View>
          </LinearGradient>
        </BlurView>

        {/* Get Started Button */}
        <TouchableOpacity 
          style={styles.getStartedButton} 
          onPress={handleGetStarted}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#e94560', '#d63251']}
            style={styles.buttonGradient}
          >
            <Text style={styles.getStartedText}>Get Started</Text>
            <Ionicons name="arrow-forward-circle" size={28} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.spacer} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  logoBlur: {
    borderRadius: 70,
    overflow: 'hidden',
    marginBottom: 24,
    elevation: 8,
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 17,
    color: '#bbb',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 20,
    fontWeight: '500',
  },
  featuresContainer: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    letterSpacing: 0.3,
  },
  featureCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
  },
  featureGradient: {
    flexDirection: 'row',
    padding: 18,
  },
  featureIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  featureDescription: {
    fontSize: 15,
    color: '#bbb',
    lineHeight: 22,
  },
  creditsContainer: {
    marginTop: 30,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 6,
  },
  creditsGradient: {
    alignItems: 'center',
    padding: 24,
  },
  creditsTitle: {
    fontSize: 17,
    color: '#bbb',
    marginBottom: 10,
    fontWeight: '600',
  },
  creditsText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  creditsSubtext: {
    fontSize: 15,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 18,
  },
  versionContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  versionText: {
    fontSize: 13,
    color: '#888',
    fontWeight: '600',
  },
  getStartedButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 30,
    elevation: 10,
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  buttonGradient: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  getStartedText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  spacer: {
    height: 30,
  },
});
