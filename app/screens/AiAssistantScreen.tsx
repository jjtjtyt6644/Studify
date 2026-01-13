import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AiAssistantScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI study assistant. How can I help you today?',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

  useEffect(() => {
    // Scroll to bottom when messages change
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful study assistant. Help students with their homework, explain concepts, and provide study tips. Keep responses concise and clear.',
            },
            ...messages.map(msg => ({
              role: msg.role,
              content: msg.content,
            })),
            {
              role: 'user',
              content: userMessage.content,
            },
          ],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from AI');
      }

      const data = await response.json();
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.choices[0].message.content,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error calling Groq API:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please make sure your API key is configured correctly.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: 'Chat cleared! How can I help you?',
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Ionicons name="sparkles" size={28} color="#FFD700" />
            <Text style={styles.headerTitle}>AI Study Assistant</Text>
          </View>
          <TouchableOpacity onPress={clearChat} style={styles.clearButton}>
            <Ionicons name="trash-outline" size={24} color="#e94560" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map(message => (
            <View
              key={message.id}
              style={[
                styles.messageWrapper,
                message.role === 'user' ? styles.userMessageWrapper : styles.assistantMessageWrapper,
              ]}
            >
              <BlurView intensity={40} style={styles.messageBlur}>
                <LinearGradient
                  colors={
                    message.role === 'user'
                      ? ['rgba(233, 69, 96, 0.3)', 'rgba(138, 35, 135, 0.3)']
                      : ['rgba(76, 175, 80, 0.2)', 'rgba(76, 175, 80, 0.1)']
                  }
                  style={[
                    styles.messageBubble,
                    message.role === 'user' ? styles.userMessage : styles.assistantMessage,
                  ]}
                >
                  {message.role === 'assistant' && (
                    <Ionicons
                      name="sparkles"
                      size={16}
                      color="#4CAF50"
                      style={styles.messageIcon}
                    />
                  )}
                  <Text style={styles.messageText}>{message.content}</Text>
                </LinearGradient>
              </BlurView>
            </View>
          ))}
          {isLoading && (
            <View style={styles.loadingWrapper}>
              <BlurView intensity={40} style={styles.loadingBlur}>
                <LinearGradient
                  colors={['rgba(76, 175, 80, 0.2)', 'rgba(76, 175, 80, 0.1)']}
                  style={styles.loadingBubble}
                >
                  <ActivityIndicator color="#4CAF50" />
                  <Text style={styles.loadingText}>Thinking...</Text>
                </LinearGradient>
              </BlurView>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <BlurView intensity={80} style={styles.inputBlur}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
              style={styles.inputGradient}
            >
              <TextInput
                style={styles.input}
                placeholder="Ask me anything..."
                placeholderTextColor="#666"
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={sendMessage}
                disabled={!inputText.trim() || isLoading}
                style={[
                  styles.sendButton,
                  (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
                ]}
              >
                <Ionicons
                  name="send"
                  size={24}
                  color={!inputText.trim() || isLoading ? '#666' : '#FFD700'}
                />
              </TouchableOpacity>
            </LinearGradient>
          </BlurView>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  clearButton: {
    padding: 8,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  messagesContent: {
    paddingBottom: 20,
  },
  messageWrapper: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  userMessageWrapper: {
    alignSelf: 'flex-end',
  },
  assistantMessageWrapper: {
    alignSelf: 'flex-start',
  },
  messageBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  userMessage: {
    borderBottomRightRadius: 4,
  },
  assistantMessage: {
    borderBottomLeftRadius: 4,
  },
  messageIcon: {
    marginBottom: 4,
  },
  messageText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 20,
  },
  loadingWrapper: {
    alignSelf: 'flex-start',
    maxWidth: '80%',
    marginBottom: 12,
  },
  loadingBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  loadingBubble: {
    padding: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#4CAF50',
    fontSize: 14,
  },
  inputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  inputBlur: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  inputGradient: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    padding: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
