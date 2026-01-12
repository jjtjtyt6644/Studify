import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import * as NavigationBar from 'expo-navigation-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { CoinSystem } from '../utils/CoinSystem';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
interface Homework {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  notes: string;
}

export default function HomeworkScreen() {
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingHomework, setEditingHomework] = useState<Homework | null>(null);
  const [filterCompleted, setFilterCompleted] = useState(false);
  
  // Completion overlay
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false);
  const [completedHomeworkData, setCompletedHomeworkData] = useState<{ title: string; coins: number } | null>(null);
  const overlayScale = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  
  // Form fields
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadHomeworks();
    requestNotificationPermissions();
    setupNotificationChannel();
  }, []);

  const requestNotificationPermissions = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Notifications Disabled',
          'Enable notifications to get homework reminders.'
        );
      }
      
      // Re-hide navigation bar after permission dialog
      if (Platform.OS === 'android') {
        setTimeout(() => {
          NavigationBar.setVisibilityAsync('hidden');
        }, 100);
      }
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      
      // Still try to hide nav bar even if there's an error
      if (Platform.OS === 'android') {
        setTimeout(() => {
          NavigationBar.setVisibilityAsync('hidden');
        }, 100);
      }
    }
  };

  const setupNotificationChannel = async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('homework', {
        name: 'Homework Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#e94560',
      });
    }
  };

  const loadHomeworks = async () => {
    try {
      const data = await AsyncStorage.getItem('homeworks');
      if (data) {
        const parsed = JSON.parse(data);
        setHomeworks(parsed.sort((a: Homework, b: Homework) => 
          new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        ));
      }
    } catch (error) {
      console.error('Error loading homeworks:', error);
    }
  };

  const saveHomeworks = async (data: Homework[]) => {
    try {
      await AsyncStorage.setItem('homeworks', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving homeworks:', error);
    }
  };

  const openAddModal = () => {
    setEditingHomework(null);
    setTitle('');
    setSubject('');
    setDueDate(new Date());
    setPriority('medium');
    setNotes('');
    setModalVisible(true);
  };

  const openEditModal = (homework: Homework) => {
    setEditingHomework(homework);
    setTitle(homework.title);
    setSubject(homework.subject);
    setDueDate(new Date(homework.dueDate));
    setPriority(homework.priority);
    setNotes(homework.notes);
    setModalVisible(true);
  };

  const saveHomework = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a homework title');
      return;
    }
    if (!subject.trim()) {
      Alert.alert('Error', 'Please enter a subject');
      return;
    }

    const newHomework: Homework = {
      id: editingHomework?.id || Date.now().toString(),
      title: title.trim(),
      subject: subject.trim(),
      dueDate: dueDate.toISOString().split('T')[0],
      priority,
      notes: notes.trim(),
      completed: editingHomework?.completed || false,
    };

    let updatedHomeworks: Homework[];
    if (editingHomework) {
      updatedHomeworks = homeworks.map(hw => 
        hw.id === editingHomework.id ? newHomework : hw
      );
    } else {
      updatedHomeworks = [...homeworks, newHomework];
    }

    updatedHomeworks.sort((a, b) => 
      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );

    setHomeworks(updatedHomeworks);
    await saveHomeworks(updatedHomeworks);
    
    // Schedule notification for new homework
    if (!editingHomework) {
      await scheduleHomeworkNotification(newHomework);
    } else {
      // Cancel old notification and schedule new one if editing
      await Notifications.cancelScheduledNotificationAsync(editingHomework.id);
      await scheduleHomeworkNotification(newHomework);
    }
    
    setModalVisible(false);
  };

  const scheduleHomeworkNotification = async (homework: Homework) => {
    try {
      const dueDateTime = new Date(homework.dueDate);
      // Set notification for 9 AM on the due date
      dueDateTime.setHours(9, 0, 0, 0);
      
      const now = new Date();
      if (dueDateTime > now) {
        await Notifications.scheduleNotificationAsync({
          identifier: homework.id,
          content: {
            title: '📚 Homework Due Today!',
            body: `${homework.subject}: ${homework.title}`,
            data: { homeworkId: homework.id },
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: {
            date: dueDateTime,
            channelId: 'homework',
          },
        });

        // Also schedule a reminder 1 day before
        const reminderDate = new Date(dueDateTime);
        reminderDate.setDate(reminderDate.getDate() - 1);
        
        if (reminderDate > now) {
          await Notifications.scheduleNotificationAsync({
            identifier: `${homework.id}_reminder`,
            content: {
              title: '⏰ Homework Due Tomorrow!',
              body: `${homework.subject}: ${homework.title}`,
              data: { homeworkId: homework.id },
              sound: true,
              priority: Notifications.AndroidNotificationPriority.DEFAULT,
            },
            trigger: {
              date: reminderDate,
              channelId: 'homework',
            },
          });
        }
      }
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  };

  const toggleComplete = async (id: string) => {
    const homework = homeworks.find(hw => hw.id === id);
    if (!homework) return;

    const wasCompleted = homework.completed;
    const updatedHomeworks = homeworks.map(hw =>
      hw.id === id ? { ...hw, completed: !hw.completed } : hw
    );
    setHomeworks(updatedHomeworks);
    await saveHomeworks(updatedHomeworks);

    // Award coins if homework is being marked as complete
    if (!wasCompleted) {
      // Cancel notifications when completed
      await Notifications.cancelScheduledNotificationAsync(id);
      await Notifications.cancelScheduledNotificationAsync(`${id}_reminder`);
      
      const coinsEarned = await CoinSystem.addCoins(
        CoinSystem.REWARDS.HOMEWORK_COMPLETE,
        `Completed: ${homework.title}`
      );
      
      // Show custom completion overlay
      setCompletedHomeworkData({
        title: homework.title,
        coins: coinsEarned
      });
      setShowCompletionOverlay(true);
      
      // Animate overlay in
      Animated.parallel([
        Animated.spring(overlayScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const closeCompletionOverlay = () => {
    Animated.parallel([
      Animated.timing(overlayScale, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowCompletionOverlay(false);
      setCompletedHomeworkData(null);
    });
  };

  const deleteHomework = async (id: string) => {
    Alert.alert(
      'Delete Homework',
      'Are you sure you want to delete this homework?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Cancel notifications before deleting
            await Notifications.cancelScheduledNotificationAsync(id);
            await Notifications.cancelScheduledNotificationAsync(`${id}_reminder`);
            
            const updatedHomeworks = homeworks.filter(hw => hw.id !== id);
            setHomeworks(updatedHomeworks);
            await saveHomeworks(updatedHomeworks);
          },
        },
      ]
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#f44336';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#666';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return 'alert-circle';
      case 'medium': return 'warning';
      case 'low': return 'checkmark-circle';
      default: return 'help-circle';
    }
  };

  const isOverdue = (dueDate: string, completed: boolean) => {
    if (completed) return false;
    const today = new Date();
    const due = new Date(dueDate);
    return due < today;
  };

  const getDaysUntil = (dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diff = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diff < 0) return `${Math.abs(diff)} days overdue`;
    if (diff === 0) return 'Due today';
    if (diff === 1) return 'Due tomorrow';
    return `${diff} days left`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric' 
    });
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  const filteredHomeworks = filterCompleted
    ? homeworks.filter(hw => hw.completed)
    : homeworks.filter(hw => !hw.completed);

  const completedCount = homeworks.filter(hw => hw.completed).length;
  const totalCount = homeworks.length;

  return (
    <LinearGradient
      colors={['#0f0c29', '#1a1a2e', '#24243e']}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>📚 Homework</Text>
        <LinearGradient
          colors={['rgba(233, 69, 96, 0.2)', 'rgba(233, 69, 96, 0.1)']}
          style={styles.subtitleContainer}
        >
          <Text style={styles.subtitle}>
            {completedCount}/{totalCount} completed
          </Text>
        </LinearGradient>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, !filterCompleted && styles.filterButtonActive]}
          onPress={() => setFilterCompleted(false)}
          activeOpacity={0.8}
        >
          {!filterCompleted ? (
            <LinearGradient
              colors={['#e94560', '#d63251']}
              style={styles.filterGradient}
            >
              <Text style={styles.filterTextActive}>
                To Do ({totalCount - completedCount})
              </Text>
            </LinearGradient>
          ) : (
            <Text style={styles.filterText}>
              To Do ({totalCount - completedCount})
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filterCompleted && styles.filterButtonActive]}
          onPress={() => setFilterCompleted(true)}
          activeOpacity={0.8}
        >
          {filterCompleted ? (
            <LinearGradient
              colors={['#4CAF50', '#45a049']}
              style={styles.filterGradient}
            >
              <Text style={styles.filterTextActive}>
                Completed ({completedCount})
              </Text>
            </LinearGradient>
          ) : (
            <Text style={styles.filterText}>
              Completed ({completedCount})
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.listContainer}>
        {filteredHomeworks.length === 0 ? (
          <BlurView intensity={30} tint="dark" style={styles.emptyContainer}>
            <LinearGradient
              colors={['rgba(233, 69, 96, 0.15)', 'rgba(233, 69, 96, 0.05)']}
              style={styles.emptyGradient}
            >
              <Text style={styles.emptyText}>
                {filterCompleted ? 'No completed homework yet' : 'No homework to do! 🎉'}
              </Text>
            </LinearGradient>
          </BlurView>
        ) : (
          filteredHomeworks.map(hw => (
            <BlurView
              key={hw.id}
              intensity={20}
              tint="dark"
              style={[
                styles.homeworkCard,
                isOverdue(hw.dueDate, hw.completed) && styles.homeworkCardOverdue,
              ]}
            >
              <LinearGradient
                colors={
                  hw.completed 
                    ? ['rgba(76, 175, 80, 0.15)', 'rgba(76, 175, 80, 0.05)']
                    : isOverdue(hw.dueDate, hw.completed)
                    ? ['rgba(244, 67, 54, 0.2)', 'rgba(244, 67, 54, 0.1)']
                    : ['rgba(233, 69, 96, 0.1)', 'rgba(233, 69, 96, 0.05)']
                }
                style={styles.cardGradient}
              >
                <View style={styles.homeworkHeader}>
                  <TouchableOpacity
                    onPress={() => toggleComplete(hw.id)}
                    style={styles.checkbox}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={hw.completed ? 'checkbox' : 'square-outline'}
                      size={32}
                      color={hw.completed ? '#4CAF50' : '#e94560'}
                    />
                  </TouchableOpacity>
                  <View style={styles.homeworkInfo}>
                    <Text style={[styles.homeworkTitle, hw.completed && styles.completedText]}>
                      {hw.title}
                    </Text>
                    <Text style={styles.homeworkSubject}>{hw.subject}</Text>
                  </View>
                  <LinearGradient
                    colors={[
                      getPriorityColor(hw.priority) + '40',
                      getPriorityColor(hw.priority) + '20'
                    ]}
                    style={styles.priorityBadge}
                  >
                    <Ionicons
                      name={getPriorityIcon(hw.priority) as any}
                      size={24}
                      color={getPriorityColor(hw.priority)}
                    />
                  </LinearGradient>
                </View>

              <View style={styles.homeworkDetails}>
                <View style={styles.dueDateContainer}>
                  <Ionicons name="calendar-outline" size={16} color="#aaa" />
                  <Text style={[
                    styles.dueDate,
                    isOverdue(hw.dueDate, hw.completed) && styles.overdueText
                  ]}>
                    {hw.dueDate} • {getDaysUntil(hw.dueDate)}
                  </Text>
                </View>
                {hw.notes && (
                  <Text style={styles.notes} numberOfLines={2}>
                    {hw.notes}
                  </Text>
                )}
              </View>

                <View style={styles.homeworkActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => openEditModal(hw)}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={['rgba(33, 150, 243, 0.3)', 'rgba(33, 150, 243, 0.15)']}
                      style={styles.actionGradient}
                    >
                      <Ionicons name="pencil" size={20} color="#2196F3" />
                      <Text style={styles.actionButtonText}>Edit</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => deleteHomework(hw.id)}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={['rgba(244, 67, 54, 0.3)', 'rgba(244, 67, 54, 0.15)']}
                      style={styles.actionGradient}
                    >
                      <Ionicons name="trash" size={20} color="#f44336" />
                      <Text style={[styles.actionButtonText, { color: '#f44336' }]}>Delete</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </BlurView>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={openAddModal}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#e94560', '#d63251']}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={36} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={40} tint="dark" style={styles.modalBlur}>
            <LinearGradient
              colors={['#1a1a2e', '#24243e', '#2d2d4a']}
              style={styles.modalContent}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingHomework ? '✏️ Edit Homework' : '➕ Add Homework'}
                </Text>
                <TouchableOpacity 
                  onPress={() => setModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle" size={32} color="#e94560" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm}>
                <Text style={styles.label}>Title *</Text>
                <BlurView intensity={15} tint="dark" style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="e.g., Math Chapter 5 Problems"
                    placeholderTextColor="#666"
                  />
                </BlurView>

                <Text style={styles.label}>Subject *</Text>
                <BlurView intensity={15} tint="dark" style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={subject}
                    onChangeText={setSubject}
                    placeholder="e.g., Mathematics"
                    placeholderTextColor="#666"
                  />
                </BlurView>

                <Text style={styles.label}>Due Date *</Text>
                <TouchableOpacity 
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.7}
                >
                  <BlurView intensity={15} tint="dark" style={styles.dateBlur}>
                    <Ionicons name="calendar" size={22} color="#e94560" />
                    <Text style={styles.dateButtonText}>
                      {formatDate(dueDate)}
                    </Text>
                  </BlurView>
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={dueDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onDateChange}
                    minimumDate={new Date()}
                    themeVariant="dark"
                  />
                )}

                <Text style={styles.label}>Priority</Text>
                <View style={styles.prioritySelector}>
                  {(['low', 'medium', 'high'] as const).map(p => (
                    <TouchableOpacity
                      key={p}
                      style={styles.priorityButton}
                      onPress={() => setPriority(p)}
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={
                          priority === p
                            ? [getPriorityColor(p), getPriorityColor(p) + 'cc']
                            : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']
                        }
                        style={styles.priorityGradient}
                      >
                        <Ionicons 
                          name={getPriorityIcon(p) as any} 
                          size={24} 
                          color={priority === p ? '#fff' : getPriorityColor(p)} 
                        />
                        <Text style={[
                          styles.priorityButtonText,
                          priority === p && styles.priorityButtonTextActive
                        ]}>
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Notes (Optional)</Text>
                <BlurView intensity={15} tint="dark" style={styles.inputContainer}>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Add any additional notes..."
                    placeholderTextColor="#666"
                    multiline
                    numberOfLines={4}
                  />
                </BlurView>

                <TouchableOpacity 
                  style={styles.saveButton} 
                  onPress={saveHomework}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#4CAF50', '#45a049']}
                    style={styles.saveGradient}
                  >
                    <Ionicons name="checkmark-circle" size={28} color="#fff" />
                    <Text style={styles.saveButtonText}>
                      {editingHomework ? 'Update' : 'Add'} Homework
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            </LinearGradient>
          </BlurView>
        </View>
      </Modal>

      {/* Completion Overlay */}
      <Modal
        visible={showCompletionOverlay}
        animationType="none"
        transparent={true}
        onRequestClose={closeCompletionOverlay}
      >
        <View style={styles.completionOverlay}>
          <BlurView intensity={80} tint="dark" style={styles.completionBlur}>
            <Animated.View 
              style={[
                styles.completionContent,
                {
                  transform: [{ scale: overlayScale }],
                  opacity: overlayOpacity,
                }
              ]}
            >
              <LinearGradient
                colors={['#4CAF50', '#45a049', '#66bb6a']}
                style={styles.completionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.completionIconContainer}>
                  <View style={styles.completionIconCircle}>
                    <Ionicons name="checkmark-circle" size={70} color="#fff" />
                  </View>
                </View>
                
                <Text style={styles.completionTitle}>Homework Complete!</Text>
                <Text style={styles.completionSubtitle}>Great job finishing</Text>
                <Text style={styles.completionHomeworkTitle} numberOfLines={2}>
                  "{completedHomeworkData?.title}"
                </Text>

                <View style={styles.coinsEarnedContainer}>
                  <LinearGradient
                    colors={['rgba(255, 215, 0, 0.3)', 'rgba(255, 215, 0, 0.15)']}
                    style={styles.coinsGradient}
                  >
                    <Ionicons name="cash" size={36} color="#FFD700" />
                    <Text style={styles.coinsAmount}>+{CoinSystem.REWARDS.HOMEWORK_COMPLETE}</Text>
                    <Text style={styles.coinsLabel}>Coins Earned!</Text>
                  </LinearGradient>
                </View>

                <View style={styles.totalCoinsContainer}>
                  <Text style={styles.totalCoinsText}>
                    Total: {completedHomeworkData?.coins} coins
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.completionButton}
                  onPress={closeCompletionOverlay}
                  activeOpacity={0.8}
                >
                  <View style={styles.completionButtonGradient}>
                    <Text style={styles.completionButtonText}>Continue the grind</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                  </View>
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>
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
  header: {
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 15,
    gap: 12,
  },
  filterButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  filterGradient: {
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    elevation: 8,
  },
  filterText: {
    color: '#aaa',
    fontSize: 15,
    fontWeight: '600',
    padding: 14,
    textAlign: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  filterTextActive: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyContainer: {
    borderRadius: 16,
    marginTop: 40,
    overflow: 'hidden',
    elevation: 4,
  },
  emptyGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '600',
  },
  homeworkCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
  },
  cardGradient: {
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#e94560',
  },
  homeworkCardOverdue: {
    elevation: 8,
  },
  homeworkHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checkbox: {
    marginRight: 12,
    padding: 4,
  },
  homeworkInfo: {
    flex: 1,
  },
  homeworkTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
  homeworkSubject: {
    fontSize: 15,
    color: '#e94560',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  priorityBadge: {
    marginLeft: 10,
    padding: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  homeworkDetails: {
    marginLeft: 44,
    marginBottom: 12,
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dueDate: {
    color: '#bbb',
    fontSize: 15,
    marginLeft: 8,
    fontWeight: '500',
  },
  overdueText: {
    color: '#f44336',
    fontWeight: '700',
  },
  notes: {
    color: '#aaa',
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  homeworkActions: {
    flexDirection: 'row',
    marginLeft: 44,
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 3,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  actionButtonText: {
    color: '#2196F3',
    fontSize: 15,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    borderRadius: 32,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
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
  modalForm: {
    padding: 24,
  },
  label: {
    fontSize: 17,
    color: '#bbb',
    marginBottom: 10,
    marginTop: 16,
    fontWeight: '600',
  },
  inputContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(233, 69, 96, 0.3)',
  },
  input: {
    backgroundColor: 'transparent',
    color: '#fff',
    padding: 16,
    fontSize: 16,
  },
  dateButton: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(233, 69, 96, 0.4)',
    elevation: 2,
  },
  dateBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  dateButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  prioritySelector: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
  },
  priorityGradient: {
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  priorityButtonText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
  },
  priorityButtonTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  saveButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 24,
    marginBottom: 20,
    elevation: 6,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  saveGradient: {
    flexDirection: 'row',
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 19,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  completionOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  completionBlur: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  completionContent: {
    width: '80%',
    maxWidth: 320,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  completionGradient: {
    padding: 28,
    alignItems: 'center',
  },
  completionIconContainer: {
    marginBottom: 16,
  },
  completionIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  completionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  completionSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 6,
  },
  completionHomeworkTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  coinsEarnedContainer: {
    width: '100%',
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  coinsGradient: {
    padding: 18,
    alignItems: 'center',
    gap: 6,
  },
  coinsAmount: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#FFD700',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  coinsLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    letterSpacing: 1,
  },
  totalCoinsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 20,
  },
  totalCoinsText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },
  completionButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  completionButtonGradient: {
    flexDirection: 'row',
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  completionButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
