import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

type CatMood = 'happy' | 'idle' | 'excited' | 'sleeping' | 'sad';

interface PetData {
  name: string;
  level: number;
  xp: number;
  mood: CatMood;
  lastFed: string;
  totalSessions: number;
}

export default function PetScreen() {
  const [petData, setPetData] = useState<PetData>({
    name: 'Mochi',
    level: 1,
    xp: 0,
    mood: 'idle',
    lastFed: new Date().toISOString(),
    totalSessions: 0,
  });

  const [currentAnimation, setCurrentAnimation] = useState<CatMood>('idle');
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadPetData();
    startIdleAnimation();
    
    // Check for new sessions
    const interval = setInterval(() => {
      checkForNewSessions();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const loadPetData = async () => {
    try {
      const data = await AsyncStorage.getItem('petData');
      if (data) {
        setPetData(JSON.parse(data));
      }
    } catch (error) {
      console.error('Error loading pet data:', error);
    }
  };

  const savePetData = async (data: PetData) => {
    try {
      await AsyncStorage.setItem('petData', JSON.stringify(data));
      setPetData(data);
    } catch (error) {
      console.error('Error saving pet data:', error);
    }
  };

  const checkForNewSessions = async () => {
    try {
      const sessions = await AsyncStorage.getItem('completedSessions');
      const sessionCount = sessions ? parseInt(sessions) : 0;

      if (sessionCount > petData.totalSessions) {
        // New session completed!
        const sessionsGained = sessionCount - petData.totalSessions;
        const xpGained = sessionsGained * 10;
        
        let newXp = petData.xp + xpGained;
        let newLevel = petData.level;
        
        // Level up check (100 XP per level)
        while (newXp >= 100) {
          newXp -= 100;
          newLevel += 1;
        }

        const updatedPet = {
          ...petData,
          totalSessions: sessionCount,
          xp: newXp,
          level: newLevel,
          mood: 'excited' as CatMood,
        };

        await savePetData(updatedPet);
        celebrateAnimation();
        
        // Return to idle after celebration
        setTimeout(() => {
          setPetData(prev => ({ ...prev, mood: 'happy' }));
          setCurrentAnimation('happy');
        }, 3000);
      }
    } catch (error) {
      console.error('Error checking sessions:', error);
    }
  };

  const startIdleAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -10,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const celebrateAnimation = () => {
    setCurrentAnimation('excited');
    
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1.3,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const petCat = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.1,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();

    setPetData(prev => ({ ...prev, mood: 'happy' }));
    setCurrentAnimation('happy');
    
    setTimeout(() => {
      setPetData(prev => ({ ...prev, mood: 'idle' }));
      setCurrentAnimation('idle');
    }, 3000);
  };

  const getCatEmoji = () => {
    switch (currentAnimation) {
      case 'happy':
        return '😺';
      case 'excited':
        return '😸';
      case 'sleeping':
        return '😴';
      case 'sad':
        return '😿';
      default:
        return '🐱';
    }
  };

  const getMoodColor = () => {
    switch (currentAnimation) {
      case 'happy':
      case 'excited':
        return '#4CAF50';
      case 'sleeping':
        return '#2196F3';
      case 'sad':
        return '#FF9800';
      default:
        return '#e94560';
    }
  };

  const xpPercentage = (petData.xp / 100) * 100;
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '15deg'],
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🐾 {petData.name}</Text>
        <View style={styles.levelBadge}>
          <Ionicons name="star" size={20} color="#FFD700" />
          <Text style={styles.levelText}>Level {petData.level}</Text>
        </View>
      </View>

      {/* XP Bar */}
      <View style={styles.xpContainer}>
        <Text style={styles.xpLabel}>Experience</Text>
        <View style={styles.xpBar}>
          <View style={[styles.xpFill, { width: `${xpPercentage}%` }]} />
        </View>
        <Text style={styles.xpText}>{petData.xp} / 100 XP</Text>
      </View>

      {/* Cat Display */}
      <View style={styles.catContainer}>
        <Animated.View
          style={[
            styles.catWrapper,
            {
              transform: [
                { translateY: bounceAnim },
                { scale: scaleAnim },
                { rotate: rotate },
              ],
            },
          ]}
        >
          <TouchableOpacity onPress={petCat} activeOpacity={0.8}>
            <Text style={styles.cat}>{getCatEmoji()}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Mood Indicator */}
        <View style={[styles.moodBubble, { borderColor: getMoodColor() }]}>
          <Text style={styles.moodText}>
            {currentAnimation === 'happy' && '❤️ Happy'}
            {currentAnimation === 'excited' && '🎉 Excited!'}
            {currentAnimation === 'idle' && '💭 Idle'}
            {currentAnimation === 'sleeping' && '💤 Sleeping'}
            {currentAnimation === 'sad' && '😢 Sad'}
          </Text>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="trophy" size={32} color="#FFD700" />
          <Text style={styles.statNumber}>{petData.totalSessions}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="heart" size={32} color="#e94560" />
          <Text style={styles.statNumber}>{petData.level * 10}</Text>
          <Text style={styles.statLabel}>Love Points</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="flame" size={32} color="#FF9800" />
          <Text style={styles.statNumber}>{Math.floor(petData.totalSessions / 4)}</Text>
          <Text style={styles.statLabel}>Streak Days</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={petCat}>
          <Ionicons name="hand-left" size={24} color="#fff" />
          <Text style={styles.actionText}>Pet</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.feedButton]}
          onPress={() => {
            setCurrentAnimation('happy');
            setTimeout(() => setCurrentAnimation('idle'), 2000);
          }}
        >
          <Ionicons name="restaurant" size={24} color="#fff" />
          <Text style={styles.actionText}>Feed</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.playButton]}
          onPress={() => {
            celebrateAnimation();
            setTimeout(() => setCurrentAnimation('idle'), 3000);
          }}
        >
          <Ionicons name="game-controller" size={24} color="#fff" />
          <Text style={styles.actionText}>Play</Text>
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color="#aaa" />
        <Text style={styles.infoText}>
          Complete Pomodoro sessions and homework to earn XP and level up your pet!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#16213e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  levelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  xpContainer: {
    marginBottom: 30,
  },
  xpLabel: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  xpBar: {
    height: 20,
    backgroundColor: '#16213e',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#2a3a5e',
  },
  xpFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  xpText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
  catContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  catWrapper: {
    marginBottom: 20,
  },
  cat: {
    fontSize: 150,
  },
  moodBubble: {
    backgroundColor: '#16213e',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 3,
  },
  moodText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#16213e',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2a3a5e',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#e94560',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  feedButton: {
    backgroundColor: '#4CAF50',
  },
  playButton: {
    backgroundColor: '#2196F3',
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#16213e',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    gap: 10,
    alignItems: 'center',
  },
  infoText: {
    color: '#aaa',
    fontSize: 13,
    flex: 1,
  },
});
