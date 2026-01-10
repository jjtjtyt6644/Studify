import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="book" size={60} color="#e94560" />
          </View>
          <Text style={styles.title}>Welcome to Studify! 📚</Text>
          <Text style={styles.subtitle}>
            Your ultimate study companion for productivity and success
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <Text style={styles.sectionTitle}>Features & Tools</Text>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureCard}>
              <View style={[styles.featureIcon, { backgroundColor: `${feature.color}20` }]}>
                <Ionicons name={feature.icon as any} size={32} color={feature.color} />
              </View>
              <View style={styles.featureInfo}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Credits */}
        <View style={styles.creditsContainer}>
          <Text style={styles.creditsTitle}>Created By</Text>
          <Text style={styles.creditsText}>Junyu</Text>
          <Text style={styles.creditsSubtext}>
            Built to help students achieve their goals
          </Text>
          <View style={styles.versionContainer}>
            <Text style={styles.versionText}>Version 1.2.0</Text>
          </View>
        </View>

        {/* Get Started Button */}
        <TouchableOpacity style={styles.getStartedButton} onPress={handleGetStarted}>
          <Text style={styles.getStartedText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#16213e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 4,
    borderColor: '#e94560',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  featuresContainer: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: '#16213e',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#2a3a5e',
  },
  featureIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  featureInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  featureDescription: {
    fontSize: 14,
    color: '#aaa',
    lineHeight: 20,
  },
  creditsContainer: {
    alignItems: 'center',
    marginTop: 30,
    padding: 20,
    backgroundColor: '#16213e',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#e94560',
  },
  creditsTitle: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 8,
  },
  creditsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  creditsSubtext: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 15,
  },
  versionContainer: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
  },
  versionText: {
    fontSize: 12,
    color: '#666',
  },
  getStartedButton: {
    flexDirection: 'row',
    backgroundColor: '#e94560',
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    gap: 10,
    elevation: 8,
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  getStartedText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  spacer: {
    height: 20,
  },
});
