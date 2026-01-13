import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { database } from '../../firebase.config';
import { ref, set, onValue, update, push, remove, get } from 'firebase/database';

interface StudyMember {
  id: string;
  name: string;
  studyTime: number; // in minutes
  isOnBreak: boolean;
  isPaused: boolean;
  joinedAt: number;
}

interface StudyRoom {
  code: string;
  hostName: string;
  members: StudyMember[];
  createdAt: number;
  totalStudyTime: number;
}

export default function StudyRoomScreen() {
  const [currentRoom, setCurrentRoom] = useState<StudyRoom | null>(null);
  const [userName, setUserName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [userId, setUserId] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadUserName();
    generateUserId();
    
    // Update current time every second for timer display
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timeInterval);
  }, []);

  useEffect(() => {
    if (currentRoom && userId) {
      // Listen for room updates
      const roomRef = ref(database, `rooms/${currentRoom.code}`);
      const unsubscribe = onValue(roomRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setCurrentRoom(data);
        } else {
          // Room was deleted
          setCurrentRoom(null);
        }
      });

      // Update study time every minute
      const interval = setInterval(() => {
        updateStudyTime();
      }, 60000);

      return () => {
        unsubscribe();
        clearInterval(interval);
      };
    }
  }, [currentRoom?.code, userId]);

  const generateUserId = async () => {
    try {
      let id = await AsyncStorage.getItem('userId');
      if (!id) {
        id = Date.now().toString() + Math.random().toString(36).substring(2);
        await AsyncStorage.setItem('userId', id);
      }
      setUserId(id);
    } catch (error) {
      console.error('Error generating user ID:', error);
    }
  };

  const loadUserName = async () => {
    try {
      const savedName = await AsyncStorage.getItem('userName');
      if (savedName) {
        setUserName(savedName);
      } else {
        setUserName('Student');
      }
    } catch (error) {
      console.error('Error loading user name:', error);
    }
  };

  const generateRoomCode = (): string => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createRoom = async () => {
    if (!userName.trim()) {
      Alert.alert('Name Required', 'Please enter your name first');
      return;
    }

    const code = generateRoomCode();
    const newRoom: StudyRoom = {
      code,
      hostName: userName,
      members: [
        {
          id: userId,
          name: userName,
          studyTime: 0,
          isOnBreak: false,
          isPaused: false,
          joinedAt: Date.now(),
        },
      ],
      createdAt: Date.now(),
      totalStudyTime: 0,
    };

    try {
      // Create room in Firebase
      const roomRef = ref(database, `rooms/${code}`);
      await set(roomRef, newRoom);
      setCurrentRoom(newRoom);
      setShowCreateModal(false);
      Alert.alert('Room Created!', `Room code: ${code}\nShare this code with your friends!`);
    } catch (error) {
      console.error('Error creating room:', error);
      Alert.alert('Error', 'Failed to create room. Please try again.');
    }
  };

  const joinRoom = async () => {
    if (!userName.trim()) {
      Alert.alert('Name Required', 'Please enter your name first');
      return;
    }

    if (!roomCode.trim()) {
      Alert.alert('Code Required', 'Please enter a room code');
      return;
    }

    try {
      // Check if room exists
      const roomRef = ref(database, `rooms/${roomCode.toUpperCase()}`);
      const snapshot = await get(roomRef);

      if (!snapshot.exists()) {
        Alert.alert('Room Not Found', 'No room found with this code. Please check and try again.');
        return;
      }

      const room = snapshot.val() as StudyRoom;

      // Check if user already in room
      const alreadyJoined = room.members.some(m => m.id === userId);
      if (alreadyJoined) {
        setCurrentRoom(room);
        setShowJoinModal(false);
        Alert.alert('Rejoined Room', 'Welcome back!');
        return;
      }

      // Add user to room
      const newMember: StudyMember = {
        id: userId,
        name: userName,
        studyTime: 0,
        isOnBreak: false,
        isPaused: false,
        joinedAt: Date.now(),
      };

      const updatedMembers = [...room.members, newMember];
      await update(roomRef, { members: updatedMembers });

      setCurrentRoom({ ...room, members: updatedMembers });
      setShowJoinModal(false);
      setRoomCode('');
      Alert.alert('Joined Room!', `You've joined ${room.hostName}'s study room!`);
    } catch (error) {
      console.error('Error joining room:', error);
      Alert.alert('Error', 'Failed to join room. Please try again.');
    }
  };

  const leaveRoom = () => {
    Alert.alert(
      'Leave Room',
      'Are you sure you want to leave this study room?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            if (!currentRoom) return;

            try {
              const roomRef = ref(database, `rooms/${currentRoom.code}`);
              const updatedMembers = currentRoom.members.filter(m => m.id !== userId);

              if (updatedMembers.length === 0) {
                // Delete room if no members left
                await remove(roomRef);
              } else {
                // Remove member
                await update(roomRef, { members: updatedMembers });
              }

              setCurrentRoom(null);
            } catch (error) {
              console.error('Error leaving room:', error);
              setCurrentRoom(null);
            }
          },
        },
      ]
    );
  };

  const shareRoomCode = async () => {
    if (!currentRoom) return;

    try {
      await Share.share({
        message: `Join my study room on Studify!\nRoom Code: ${currentRoom.code}\n\nLet's study together! 📚`,
      });
    } catch (error) {
      console.error('Error sharing room code:', error);
    }
  };

  const updateStudyTime = async () => {
    if (!currentRoom || !userId) return;

    try {
      const updatedMembers = currentRoom.members.map(member => {
        if (member.id === userId) {
          return {
            ...member,
            studyTime: member.studyTime + (member.isOnBreak || member.isPaused ? 0 : 1),
          };
        }
        return member;
      });

      const totalTime = updatedMembers.reduce((sum, m) => sum + m.studyTime, 0);

      await update(ref(database, `rooms/${currentRoom.code}`), { 
        members: updatedMembers,
        totalStudyTime: totalTime
      });
    } catch (error) {
      console.error('Error updating study time:', error);
    }
  };

  const toggleBreak = async () => {
    if (!currentRoom || !userId) return;

    try {
      const updatedMembers = currentRoom.members.map(member =>
        member.id === userId ? { ...member, isOnBreak: !member.isOnBreak } : member
      );

      await update(ref(database, `rooms/${currentRoom.code}`), { members: updatedMembers });
    } catch (error) {
      console.error('Error toggling break:', error);
    }
  };

  const togglePause = async () => {
    if (!currentRoom || !userId) return;

    try {
      const updatedMembers = currentRoom.members.map(member =>
        member.id === userId ? { ...member, isPaused: !member.isPaused } : member
      );

      await update(ref(database, `rooms/${currentRoom.code}`), { members: updatedMembers });
    } catch (error) {
      console.error('Error toggling pause:', error);
    }
  };

  const startStudying = async () => {
    if (!currentRoom || !userId) return;

    try {
      const updatedMembers = currentRoom.members.map(member =>
        member.id === userId ? { ...member, isOnBreak: false, isPaused: false } : member
      );

      await update(ref(database, `rooms/${currentRoom.code}`), { members: updatedMembers });
    } catch (error) {
      console.error('Error starting study:', error);
    }
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getSuggestedBreakTime = (studyTime: number): number => {
    // Suggest 5 min break every 25 minutes
    return Math.floor(studyTime / 25) * 5;
  };

  const getCurrentUserMember = (): StudyMember | undefined => {
    return currentRoom?.members.find(m => m.id === userId);
  };

  const getRoomStats = () => {
    if (!currentRoom) return { total: 0, studying: 0, onBreak: 0 };
    
    return {
      total: currentRoom.totalStudyTime || 0,
      studying: currentRoom.members.filter(m => !m.isOnBreak && !m.isPaused).length,
      onBreak: currentRoom.members.filter(m => m.isOnBreak).length,
    };
  };

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Study Rooms</Text>
            <Text style={styles.headerSubtitle}>Study together with friends</Text>
          </View>
          <TouchableOpacity
            style={styles.userButton}
            onPress={() => {
              Alert.prompt('Your Name', 'Enter your name:', text => {
                if (text) {
                  setUserName(text);
                  AsyncStorage.setItem('userName', text);
                }
              });
            }}
          >
            <Ionicons name="person-circle" size={36} color="#FFD700" />
          </TouchableOpacity>
        </View>

        {currentRoom ? (
          // In Room View
          <>
            <BlurView intensity={30} tint="dark" style={styles.roomCard}>
              <LinearGradient
                colors={['rgba(76, 175, 80, 0.2)', 'rgba(76, 175, 80, 0.1)']}
                style={styles.roomGradient}
              >
                <View style={styles.roomHeader}>
                  <View style={styles.roomInfo}>
                    <Text style={styles.roomCodeLabel}>Room Code</Text>
                    <Text style={styles.roomCode}>{currentRoom.code}</Text>
                  </View>
                  <TouchableOpacity onPress={shareRoomCode} style={styles.shareButton}>
                    <Ionicons name="share-social" size={24} color="#4CAF50" />
                  </TouchableOpacity>
                </View>

                <View style={styles.roomStats}>
                  <View style={styles.statItem}>
                    <Ionicons name="people" size={20} color="#4CAF50" />
                    <Text style={styles.statText}>{currentRoom.members.length} Members</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="time" size={20} color="#FFD700" />
                    <Text style={styles.statText}>{formatTime(getRoomStats().total)}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="book" size={20} color="#e94560" />
                    <Text style={styles.statText}>{getRoomStats().studying} Studying</Text>
                  </View>
                </View>
              </LinearGradient>
            </BlurView>

            {/* My Study Controls */}
            {(() => {
              const currentUser = getCurrentUserMember();
              if (!currentUser) return null;

              return (
                <BlurView intensity={30} tint="dark" style={styles.controlCard}>
                  <LinearGradient
                    colors={
                      currentUser.isOnBreak
                        ? ['rgba(255, 152, 0, 0.3)', 'rgba(255, 152, 0, 0.1)']
                        : currentUser.isPaused
                        ? ['rgba(158, 158, 158, 0.3)', 'rgba(158, 158, 158, 0.1)']
                        : ['rgba(233, 69, 96, 0.3)', 'rgba(233, 69, 96, 0.1)']
                    }
                    style={styles.controlGradient}
                  >
                    <Text style={styles.controlTitle}>Your Session</Text>
                    
                    <View style={styles.timerDisplay}>
                      <Ionicons 
                        name={currentUser.isOnBreak ? 'cafe' : currentUser.isPaused ? 'pause-circle' : 'timer'} 
                        size={48} 
                        color={currentUser.isOnBreak ? '#FF9800' : currentUser.isPaused ? '#999' : '#e94560'} 
                      />
                      <Text style={styles.timerText}>{formatTime(currentUser.studyTime)}</Text>
                      <Text style={styles.timerStatus}>
                        {currentUser.isOnBreak ? '☕ On Break' : currentUser.isPaused ? '⏸️ Paused' : '📚 Studying'}
                      </Text>
                    </View>

                    <View style={styles.controlButtons}>
                      {currentUser.isOnBreak ? (
                        <TouchableOpacity
                          style={[styles.controlButton, styles.studyButton]}
                          onPress={startStudying}
                          activeOpacity={0.8}
                        >
                          <LinearGradient
                            colors={['#e94560', '#d63651']}
                            style={styles.controlButtonGradient}
                          >
                            <Ionicons name="book" size={24} color="#fff" />
                            <Text style={styles.controlButtonText}>Start Studying</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      ) : (
                        <>
                          <TouchableOpacity
                            style={[styles.controlButton, styles.halfButton]}
                            onPress={togglePause}
                            activeOpacity={0.8}
                          >
                            <LinearGradient
                              colors={currentUser.isPaused ? ['#4CAF50', '#45a049'] : ['#999', '#777']}
                              style={styles.controlButtonGradient}
                            >
                              <Ionicons 
                                name={currentUser.isPaused ? 'play' : 'pause'} 
                                size={24} 
                                color="#fff" 
                              />
                              <Text style={styles.controlButtonText}>
                                {currentUser.isPaused ? 'Resume' : 'Pause'}
                              </Text>
                            </LinearGradient>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.controlButton, styles.halfButton]}
                            onPress={toggleBreak}
                            activeOpacity={0.8}
                          >
                            <LinearGradient
                              colors={['#FF9800', '#F57C00']}
                              style={styles.controlButtonGradient}
                            >
                              <Ionicons name="cafe" size={24} color="#fff" />
                              <Text style={styles.controlButtonText}>Take Break</Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>

                    {currentUser.studyTime > 0 && currentUser.studyTime % 25 === 0 && !currentUser.isOnBreak && (
                      <View style={styles.breakReminder}>
                        <Ionicons name="notifications" size={20} color="#FFD700" />
                        <Text style={styles.breakReminderText}>
                          You've studied for {formatTime(currentUser.studyTime)}! Consider a {getSuggestedBreakTime(currentUser.studyTime)} min break.
                        </Text>
                      </View>
                    )}
                  </LinearGradient>
                </BlurView>
              );
            })()}

            {/* Members List */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Study Members</Text>

              {currentRoom.members.map(member => {
                const isCurrentUser = member.id === userId;

                return (
                  <BlurView key={member.id} intensity={30} tint="dark" style={styles.memberCard}>
                    <LinearGradient
                      colors={
                        member.isOnBreak
                          ? ['rgba(255, 152, 0, 0.2)', 'rgba(255, 152, 0, 0.1)']
                          : member.isPaused
                          ? ['rgba(158, 158, 158, 0.2)', 'rgba(158, 158, 158, 0.1)']
                          : ['rgba(233, 69, 96, 0.2)', 'rgba(233, 69, 96, 0.1)']
                      }
                      style={styles.memberGradient}
                    >
                      <View style={styles.memberHeader}>
                        <View style={styles.memberInfo}>
                          <Ionicons
                            name={member.isOnBreak ? 'cafe' : member.isPaused ? 'pause-circle' : 'book'}
                            size={24}
                            color={member.isOnBreak ? '#FF9800' : member.isPaused ? '#999' : '#e94560'}
                          />
                          <Text style={styles.memberName}>{member.name}</Text>
                          {isCurrentUser && (
                            <View style={styles.hostBadge}>
                              <Text style={styles.hostBadgeText}>YOU</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.memberStatus}>
                          <Text style={styles.memberTime}>{formatTime(member.studyTime)}</Text>
                          <Text style={styles.memberStatusText}>
                            {member.isOnBreak ? '☕ Break' : member.isPaused ? '⏸️ Paused' : '📚 Studying'}
                          </Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </BlurView>
                );
              })}
            </View>

            {/* Leave Room Button */}
            <TouchableOpacity style={styles.leaveButton} onPress={leaveRoom}>
              <Text style={styles.leaveButtonText}>Leave Room</Text>
            </TouchableOpacity>
          </>
        ) : (
          // No Room View
          <>
            <View style={styles.emptyState}>
              <Ionicons name="people-circle-outline" size={120} color="#666" />
              <Text style={styles.emptyTitle}>No Active Room</Text>
              <Text style={styles.emptySubtitle}>
                Create a room or join one with a code
              </Text>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => setShowCreateModal(true)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#4CAF50', '#45a049']}
                  style={styles.actionButtonGradient}
                >
                  <Ionicons name="add-circle" size={28} color="#fff" />
                  <Text style={styles.actionButtonText}>Create Room</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.joinButton}
                onPress={() => setShowJoinModal(true)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#2196F3', '#1976D2']}
                  style={styles.actionButtonGradient}
                >
                  <Ionicons name="enter" size={28} color="#fff" />
                  <Text style={styles.actionButtonText}>Join Room</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <BlurView intensity={20} tint="dark" style={styles.infoCard}>
              <LinearGradient
                colors={['rgba(255, 215, 0, 0.2)', 'rgba(255, 215, 0, 0.1)']}
                style={styles.infoGradient}
              >
                <Ionicons name="information-circle" size={32} color="#FFD700" />
                <Text style={styles.infoTitle}>How it works</Text>
                <Text style={styles.infoText}>
                  • Create a room and share the code with friends{'\n'}
                  • See everyone's study time in real-time{'\n'}
                  • Get break suggestions based on study duration{'\n'}
                  • Stay motivated by studying together!
                </Text>
              </LinearGradient>
            </BlurView>
          </>
        )}
      </ScrollView>

      {/* Create Room Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={90} style={styles.modalBlur}>
            <LinearGradient
              colors={['rgba(26, 26, 46, 0.95)', 'rgba(36, 36, 62, 0.95)']}
              style={styles.modalContent}
            >
              <Text style={styles.modalTitle}>Create Study Room</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Your Name</Text>
                <TextInput
                  style={styles.modalInput}
                  value={userName}
                  onChangeText={setUserName}
                  placeholder="Enter your name"
                  placeholderTextColor="#666"
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setShowCreateModal(false)}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={createRoom}
                >
                  <Text style={styles.modalButtonText}>Create</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </BlurView>
        </View>
      </Modal>

      {/* Join Room Modal */}
      <Modal
        visible={showJoinModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowJoinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={90} style={styles.modalBlur}>
            <LinearGradient
              colors={['rgba(26, 26, 46, 0.95)', 'rgba(36, 36, 62, 0.95)']}
              style={styles.modalContent}
            >
              <Text style={styles.modalTitle}>Join Study Room</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Your Name</Text>
                <TextInput
                  style={styles.modalInput}
                  value={userName}
                  onChangeText={setUserName}
                  placeholder="Enter your name"
                  placeholderTextColor="#666"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Room Code</Text>
                <TextInput
                  style={styles.modalInput}
                  value={roomCode}
                  onChangeText={text => setRoomCode(text.toUpperCase())}
                  placeholder="Enter 6-digit code"
                  placeholderTextColor="#666"
                  maxLength={6}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setShowJoinModal(false)}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={joinRoom}
                >
                  <Text style={styles.modalButtonText}>Join</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </BlurView>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  userButton: {
    padding: 4,
  },
  roomCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  roomGradient: {
    padding: 20,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  roomInfo: {
    flex: 1,
  },
  roomCodeLabel: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 4,
  },
  roomCode: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    letterSpacing: 2,
  },
  shareButton: {
    padding: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 12,
  },
  roomStats: {
    flexDirection: 'row',
    gap: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    color: '#fff',
    fontSize: 14,
  },
  controlCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  controlGradient: {
    padding: 20,
  },
  controlTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  timerDisplay: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  timerStatus: {
    fontSize: 16,
    color: '#aaa',
    marginTop: 8,
  },
  controlButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  halfButton: {
    flex: 1,
  },
  studyButton: {
    flex: 1,
  },
  controlButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  breakReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  breakReminderText: {
    color: '#FFD700',
    fontSize: 13,
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  memberCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  memberGradient: {
    padding: 16,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  memberName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  hostBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  hostBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  memberStatus: {
    alignItems: 'flex-end',
  },
  memberTime: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  memberStatusText: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 2,
  },
  breakSuggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  breakSuggestionText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  breakToggle: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  breakToggleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  leaveButton: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    borderRadius: 12,
    alignItems: 'center',
  },
  leaveButtonText: {
    color: '#f44336',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  actionButtons: {
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  createButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  joinButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  infoGradient: {
    padding: 24,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
    marginBottom: 12,
  },
  infoText: {
    color: '#ddd',
    fontSize: 15,
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalContent: {
    padding: 24,
    borderRadius: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalButtonPrimary: {
    backgroundColor: '#4CAF50',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalButtonTextCancel: {
    color: '#aaa',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
