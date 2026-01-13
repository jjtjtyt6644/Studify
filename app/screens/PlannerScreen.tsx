import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Homework {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
}

interface DaySession {
  date: string;
  sessions: number;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function PlannerScreen() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [upcomingHomework, setUpcomingHomework] = useState<Homework[]>([]);
  const [calendarSessions, setCalendarSessions] = useState<{ [key: string]: number }>({});
  const [todaySessions, setTodaySessions] = useState(0);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      // Load homework
      const homeworkData = await AsyncStorage.getItem('homeworks');
      if (homeworkData) {
        const allHomework: Homework[] = JSON.parse(homeworkData);
        const upcoming = allHomework
          .filter(hw => !hw.completed)
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
          .slice(0, 5);
        setUpcomingHomework(upcoming);
      }

      // Load calendar sessions
      const sessionsData = await AsyncStorage.getItem('calendarSessions');
      if (sessionsData) {
        const sessions = JSON.parse(sessionsData);
        setCalendarSessions(sessions);
        
        const today = new Date().toISOString().split('T')[0];
        setTodaySessions(sessions[today] || 0);
      }
    } catch (error) {
      console.error('Error loading planner data:', error);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];
    
    // Add empty slots for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };

  const getDateKey = (day: number) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return new Date(year, month, day).toISOString().split('T')[0];
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    return (
      day === selectedDate.getDate() &&
      currentDate.getMonth() === selectedDate.getMonth() &&
      currentDate.getFullYear() === selectedDate.getFullYear()
    );
  };

  const changeMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#e74c3c';
      case 'medium': return '#f39c12';
      case 'low': return '#3498db';
      default: return '#666';
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `${diffDays} days`;
  };

  const days = getDaysInMonth(currentDate);

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Study Planner</Text>
            <Text style={styles.headerSubtitle}>Plan your success</Text>
          </View>
          <View style={styles.todayStats}>
            <Ionicons name="flame" size={24} color="#FF6B35" />
            <Text style={styles.todayStatsText}>{todaySessions}</Text>
          </View>
        </View>

        {/* Calendar */}
        <BlurView intensity={30} tint="dark" style={styles.calendarCard}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
            style={styles.calendarGradient}
          >
            {/* Month Header */}
            <View style={styles.monthHeader}>
              <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthButton}>
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.monthText}>
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </Text>
              <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthButton}>
                <Ionicons name="chevron-forward" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Day Names */}
            <View style={styles.dayNamesRow}>
              {DAYS.map(day => (
                <View key={day} style={styles.dayNameCell}>
                  <Text style={styles.dayNameText}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {days.map((day, index) => {
                const dateKey = day ? getDateKey(day) : '';
                const sessionCount = day ? (calendarSessions[dateKey] || 0) : 0;
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayCell,
                      day && isToday(day) ? styles.todayCell : undefined,
                      day && isSelected(day) ? styles.selectedCell : undefined,
                    ]}
                    onPress={() => {
                      if (day) {
                        const year = currentDate.getFullYear();
                        const month = currentDate.getMonth();
                        setSelectedDate(new Date(year, month, day));
                      }
                    }}
                    disabled={!day}
                  >
                    {day && (
                      <>
                        <Text style={[
                          styles.dayText,
                          isToday(day) ? styles.todayText : undefined,
                          isSelected(day) ? styles.selectedText : undefined,
                        ]}>
                          {day}
                        </Text>
                        {sessionCount > 0 && (
                          <View style={styles.sessionDot}>
                            <Text style={styles.sessionDotText}>{sessionCount}</Text>
                          </View>
                        )}
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </LinearGradient>
        </BlurView>

        {/* Upcoming Homework */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="list" size={24} color="#FFD700" />
            <Text style={styles.sectionTitle}>Upcoming Tasks</Text>
          </View>

          {upcomingHomework.length === 0 ? (
            <BlurView intensity={30} tint="dark" style={styles.emptyCard}>
              <LinearGradient
                colors={['rgba(76, 175, 80, 0.2)', 'rgba(76, 175, 80, 0.1)']}
                style={styles.emptyGradient}
              >
                <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
                <Text style={styles.emptyText}>All caught up!</Text>
                <Text style={styles.emptySubtext}>No upcoming homework</Text>
              </LinearGradient>
            </BlurView>
          ) : (
            upcomingHomework.map(homework => (
              <BlurView key={homework.id} intensity={30} tint="dark" style={styles.homeworkCard}>
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                  style={styles.homeworkGradient}
                >
                  <View style={styles.homeworkHeader}>
                    <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(homework.priority) }]} />
                    <Text style={styles.homeworkTitle} numberOfLines={1}>
                      {homework.title}
                    </Text>
                  </View>
                  <Text style={styles.homeworkSubject}>{homework.subject}</Text>
                  <View style={styles.homeworkFooter}>
                    <Ionicons name="calendar-outline" size={16} color="#666" />
                    <Text style={styles.homeworkDue}>
                      {getDaysUntilDue(homework.dueDate)}
                    </Text>
                  </View>
                </LinearGradient>
              </BlurView>
            ))
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="stats-chart" size={24} color="#FFD700" />
            <Text style={styles.sectionTitle}>This Week</Text>
          </View>

          <View style={styles.statsRow}>
            <BlurView intensity={30} tint="dark" style={styles.statCard}>
              <LinearGradient
                colors={['rgba(233, 69, 96, 0.2)', 'rgba(233, 69, 96, 0.1)']}
                style={styles.statGradient}
              >
                <Ionicons name="timer" size={32} color="#e94560" />
                <Text style={styles.statValue}>{todaySessions * 25}</Text>
                <Text style={styles.statLabel}>Minutes Today</Text>
              </LinearGradient>
            </BlurView>

            <BlurView intensity={30} tint="dark" style={styles.statCard}>
              <LinearGradient
                colors={['rgba(76, 175, 80, 0.2)', 'rgba(76, 175, 80, 0.1)']}
                style={styles.statGradient}
              >
                <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
                <Text style={styles.statValue}>{upcomingHomework.length}</Text>
                <Text style={styles.statLabel}>Tasks Pending</Text>
              </LinearGradient>
            </BlurView>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const { width } = Dimensions.get('window');
const cellSize = (width - 80) / 7;

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
  todayStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  todayStatsText: {
    color: '#FF6B35',
    fontSize: 18,
    fontWeight: 'bold',
  },
  calendarCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  calendarGradient: {
    padding: 16,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthButton: {
    padding: 8,
  },
  monthText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayNameCell: {
    width: cellSize,
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayNameText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: cellSize,
    height: cellSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginBottom: 4,
  },
  todayCell: {
    backgroundColor: 'rgba(233, 69, 96, 0.2)',
  },
  selectedCell: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  dayText: {
    color: '#fff',
    fontSize: 14,
  },
  todayText: {
    color: '#e94560',
    fontWeight: 'bold',
  },
  selectedText: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  sessionDot: {
    position: 'absolute',
    bottom: 2,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  sessionDotText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  emptyCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  emptyGradient: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 4,
  },
  homeworkCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  homeworkGradient: {
    padding: 16,
  },
  homeworkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  homeworkTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  homeworkSubject: {
    color: '#666',
    fontSize: 14,
    marginBottom: 8,
  },
  homeworkFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  homeworkDue: {
    color: '#666',
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statGradient: {
    padding: 20,
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});
