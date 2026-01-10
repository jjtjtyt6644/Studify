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
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
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
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
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
      
      Alert.alert(
        '✅ Homework Complete!',
        `Great job finishing "${homework.title}"!\n\n💰 +${CoinSystem.REWARDS.HOMEWORK_COMPLETE} coins earned!\nTotal: ${coinsEarned} coins`
      );
    }
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📚 Homework</Text>
        <Text style={styles.subtitle}>
          {completedCount}/{totalCount} completed
        </Text>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, !filterCompleted && styles.filterButtonActive]}
          onPress={() => setFilterCompleted(false)}
        >
          <Text style={[styles.filterText, !filterCompleted && styles.filterTextActive]}>
            To Do ({totalCount - completedCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filterCompleted && styles.filterButtonActive]}
          onPress={() => setFilterCompleted(true)}
        >
          <Text style={[styles.filterText, filterCompleted && styles.filterTextActive]}>
            Completed ({completedCount})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.listContainer}>
        {filteredHomeworks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {filterCompleted ? 'No completed homework yet' : 'No homework to do! 🎉'}
            </Text>
          </View>
        ) : (
          filteredHomeworks.map(hw => (
            <View
              key={hw.id}
              style={[
                styles.homeworkCard,
                hw.completed && styles.homeworkCardCompleted,
                isOverdue(hw.dueDate, hw.completed) && styles.homeworkCardOverdue,
              ]}
            >
              <View style={styles.homeworkHeader}>
                <TouchableOpacity
                  onPress={() => toggleComplete(hw.id)}
                  style={styles.checkbox}
                >
                  <Ionicons
                    name={hw.completed ? 'checkbox' : 'square-outline'}
                    size={28}
                    color={hw.completed ? '#4CAF50' : '#e94560'}
                  />
                </TouchableOpacity>
                <View style={styles.homeworkInfo}>
                  <Text style={[styles.homeworkTitle, hw.completed && styles.completedText]}>
                    {hw.title}
                  </Text>
                  <Text style={styles.homeworkSubject}>{hw.subject}</Text>
                </View>
                <View style={styles.priorityBadge}>
                  <Ionicons
                    name={getPriorityIcon(hw.priority) as any}
                    size={20}
                    color={getPriorityColor(hw.priority)}
                  />
                </View>
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
                >
                  <Ionicons name="pencil" size={20} color="#2196F3" />
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => deleteHomework(hw.id)}
                >
                  <Ionicons name="trash" size={20} color="#f44336" />
                  <Text style={[styles.actionButtonText, { color: '#f44336' }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingHomework ? 'Edit Homework' : 'Add Homework'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Math Chapter 5 Problems"
                placeholderTextColor="#666"
              />

              <Text style={styles.label}>Subject *</Text>
              <TextInput
                style={styles.input}
                value={subject}
                onChangeText={setSubject}
                placeholder="e.g., Mathematics"
                placeholderTextColor="#666"
              />

              <Text style={styles.label}>Due Date *</Text>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar" size={20} color="#e94560" />
                <Text style={styles.dateButtonText}>
                  {formatDate(dueDate)}
                </Text>
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
                    style={[
                      styles.priorityButton,
                      priority === p && { 
                        backgroundColor: getPriorityColor(p),
                        transform: [{ scale: 1.05 }]
                      }
                    ]}
                    onPress={() => setPriority(p)}
                  >
                    <Ionicons 
                      name={getPriorityIcon(p) as any} 
                      size={20} 
                      color={priority === p ? '#fff' : getPriorityColor(p)} 
                    />
                    <Text style={[
                      styles.priorityButtonText,
                      priority === p && styles.priorityButtonTextActive
                    ]}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add any additional notes..."
                placeholderTextColor="#666"
                multiline
                numberOfLines={4}
              />

              <TouchableOpacity style={styles.saveButton} onPress={saveHomework}>
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.saveButtonText}>
                  {editingHomework ? 'Update' : 'Add'} Homework
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 15,
    gap: 10,
  },
  filterButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#16213e',
    borderRadius: 8,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#e94560',
  },
  filterText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#666',
    fontSize: 18,
    textAlign: 'center',
  },
  homeworkCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#e94560',
  },
  homeworkCardCompleted: {
    opacity: 0.7,
    borderLeftColor: '#4CAF50',
  },
  homeworkCardOverdue: {
    borderLeftColor: '#f44336',
    backgroundColor: '#2d1f1f',
  },
  homeworkHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  checkbox: {
    marginRight: 12,
  },
  homeworkInfo: {
    flex: 1,
  },
  homeworkTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
  homeworkSubject: {
    fontSize: 14,
    color: '#e94560',
    fontWeight: '600',
  },
  priorityBadge: {
    marginLeft: 10,
  },
  homeworkDetails: {
    marginLeft: 40,
    marginBottom: 10,
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dueDate: {
    color: '#aaa',
    fontSize: 14,
    marginLeft: 6,
  },
  overdueText: {
    color: '#f44336',
    fontWeight: '600',
  },
  notes: {
    color: '#999',
    fontSize: 13,
    fontStyle: 'italic',
  },
  homeworkActions: {
    flexDirection: 'row',
    marginLeft: 40,
    gap: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e94560',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
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
  modalForm: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 8,
    marginTop: 12,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#16213e',
    color: '#fff',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#2a3a5e',
  },
  dateButton: {
    backgroundColor: '#16213e',
    padding: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e94560',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  prioritySelector: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityButton: {
    flex: 1,
    padding: 14,
    backgroundColor: '#16213e',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2a3a5e',
    gap: 6,
  },
  priorityButtonText: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '600',
  },
  priorityButtonTextActive: {
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    elevation: 4,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
