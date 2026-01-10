import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { CoinSystem } from '../utils/CoinSystem';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';

interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: keyof typeof Ionicons.glyphMap;
  category: 'theme' | 'boost' | 'decoration' | 'avatar';
  color: string;
}

const STORE_ITEMS: StoreItem[] = [
  {
    id: 'theme_ocean',
    name: 'Ocean Theme',
    description: 'Cool blue color scheme',
    price: 100,
    icon: 'water',
    category: 'theme',
    color: '#2196F3',
  },
  {
    id: 'theme_forest',
    name: 'Forest Theme',
    description: 'Calming green aesthetic',
    price: 100,
    icon: 'leaf',
    category: 'theme',
    color: '#4CAF50',
  },
  {
    id: 'theme_sunset',
    name: 'Sunset Theme',
    description: 'Warm orange and pink',
    price: 150,
    icon: 'sunny',
    category: 'theme',
    color: '#FF9800',
  },
  {
    id: 'boost_2x_coins',
    name: '2x Coin Boost',
    description: 'Double coins for 24 hours',
    price: 200,
    icon: 'flash',
    category: 'boost',
    color: '#FFD700',
  },
  {
    id: 'boost_focus',
    name: 'Focus Boost',
    description: 'Extended timer by 5 minutes',
    price: 150,
    icon: 'time',
    category: 'boost',
    color: '#9C27B0',
  },
  {
    id: 'deco_plants',
    name: 'Study Plants',
    description: 'Decorative plants for your space',
    price: 80,
    icon: 'flower',
    category: 'decoration',
    color: '#4CAF50',
  },
  {
    id: 'deco_books',
    name: 'Book Stack',
    description: 'Decorative book collection',
    price: 60,
    icon: 'library',
    category: 'decoration',
    color: '#795548',
  },
  {
    id: 'avatar_hat',
    name: 'Cool Hat',
    description: 'Stylish hat for your cat',
    price: 120,
    icon: 'shield',
    category: 'avatar',
    color: '#e94560',
  },
  {
    id: 'avatar_glasses',
    name: 'Study Glasses',
    description: 'Smart glasses for your cat',
    price: 100,
    icon: 'glasses',
    category: 'avatar',
    color: '#2196F3',
  },
  {
    id: 'avatar_bow',
    name: 'Cute Bow',
    description: 'Adorable bow accessory',
    price: 80,
    icon: 'ribbon',
    category: 'avatar',
    color: '#E91E63',
  },
];

export default function StoreScreen() {
  const navigation = useNavigation();
  const [coins, setCoins] = useState(0);
  const [ownedItems, setOwnedItems] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showComingSoon, setShowComingSoon] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      setShowComingSoon(true);
      return () => {};
    }, [])
  );

  const handleGotIt = () => {
    setShowComingSoon(false);
    navigation.navigate('Pomodoro' as never);
  };

  const loadData = async () => {
    const currentCoins = await CoinSystem.getCoins();
    setCoins(currentCoins);

    const owned = await AsyncStorage.getItem('ownedItems');
    if (owned) {
      setOwnedItems(JSON.parse(owned));
    }
  };

  const purchaseItem = async (item: StoreItem) => {
    if (ownedItems.includes(item.id)) {
      Alert.alert('Already Owned', 'You already own this item!');
      return;
    }

    if (coins < item.price) {
      Alert.alert(
        'Not Enough Coins',
        `You need ${item.price - coins} more coins to purchase this item.`
      );
      return;
    }

    Alert.alert(
      'Confirm Purchase',
      `Purchase "${item.name}" for ${item.price} coins?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy',
          onPress: async () => {
            const success = await CoinSystem.spendCoins(item.price, `Purchased: ${item.name}`);
            if (success) {
              const newOwned = [...ownedItems, item.id];
              setOwnedItems(newOwned);
              await AsyncStorage.setItem('ownedItems', JSON.stringify(newOwned));
              
              const newCoins = await CoinSystem.getCoins();
              setCoins(newCoins);

              Alert.alert(
                '🎉 Purchase Complete!',
                `You now own "${item.name}"!\n\nRemaining coins: ${newCoins}`
              );
            }
          },
        },
      ]
    );
  };

  const categories = [
    { key: 'all', label: 'All', icon: 'apps' },
    { key: 'theme', label: 'Themes', icon: 'color-palette' },
    { key: 'boost', label: 'Boosts', icon: 'rocket' },
    { key: 'decoration', label: 'Decor', icon: 'sparkles' },
    { key: 'avatar', label: 'Avatar', icon: 'paw' },
  ];

  const filteredItems =
    selectedCategory === 'all'
      ? STORE_ITEMS
      : STORE_ITEMS.filter(item => item.category === selectedCategory);

  return (
    <View style={styles.container}>
      {/* Blurred Store Content */}
      <View intensity={150} tint="dark" style={StyleSheet.absoluteFill}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🏪 Store</Text>
          <View style={styles.coinDisplay}>
            <Ionicons name="cash" size={24} color="#FFD700" />
            <Text style={styles.coinText}>{coins}</Text>
          </View>
        </View>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContainer}
        >
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categoryButton,
                selectedCategory === cat.key && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory(cat.key)}
            >
              <Ionicons
                name={cat.icon as keyof typeof Ionicons.glyphMap}
                size={20}
                color={selectedCategory === cat.key ? '#fff' : '#aaa'}
              />
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === cat.key && styles.categoryTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Items Grid */}
        <ScrollView style={styles.itemsContainer}>
          <View style={styles.itemsGrid}>
            {filteredItems.map(item => {
              const isOwned = ownedItems.includes(item.id);
              const canAfford = coins >= item.price;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.itemCard,
                    isOwned && styles.itemCardOwned,
                    !canAfford && !isOwned && styles.itemCardLocked,
                  ]}
                  onPress={() => purchaseItem(item)}
                  disabled={isOwned}
                >
                  {isOwned && (
                    <View style={styles.ownedBadge}>
                      <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                    </View>
                  )}
                  
                  <View style={[styles.itemIcon, { backgroundColor: item.color }]}>
                    <Ionicons name={item.icon} size={36} color="#fff" />
                  </View>

                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemDescription}>{item.description}</Text>
                    <View style={styles.itemPrice}>
                      <Ionicons
                        name="cash"
                        size={18}
                        color={isOwned ? '#4CAF50' : !canAfford ? '#666' : '#FFD700'}
                      />
                      <Text
                        style={[
                          styles.priceText,
                          isOwned && styles.priceTextOwned,
                          !canAfford && !isOwned && styles.priceTextLocked,
                        ]}
                      >
                        {isOwned ? 'Owned' : item.price}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Coming Soon Modal */}
      <Modal
        visible={showComingSoon}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="construct" size={80} color="#e94560" />
            <Text style={styles.modalTitle}>🚧 Coming Soon! 🚧</Text>
            <Text style={styles.modalText}>
              The store is still under construction.{'\n'}
              Check back later for awesome items to buy!
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleGotIt}
            >
              <Text style={styles.modalButtonText}>Got it!</Text>
            </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  coinDisplay: {
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
  coinText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  categoryScroll: {
    maxHeight: 60,
    marginBottom: 10,
  },
  categoryContainer: {
    paddingHorizontal: 20,
    gap: 10,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#16213e',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#2a3a5e',
  },
  categoryButtonActive: {
    backgroundColor: '#e94560',
    borderColor: '#e94560',
  },
  categoryText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#fff',
  },
  itemsContainer: {
    flex: 1,
    padding: 20,
  },
  itemsGrid: {
    gap: 15,
  },
  itemCard: {
    backgroundColor: '#16213e',
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    borderWidth: 2,
    borderColor: '#2a3a5e',
  },
  itemCardOwned: {
    borderColor: '#4CAF50',
    opacity: 0.7,
  },
  itemCardLocked: {
    opacity: 0.5,
  },
  ownedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  itemIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 8,
  },
  itemPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  priceTextOwned: {
    color: '#4CAF50',
  },
  priceTextLocked: {
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#16213e',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    marginHorizontal: 30,
    borderWidth: 3,
    borderColor: '#e94560',
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 15,
  },
  modalText: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  modalButton: {
    backgroundColor: '#e94560',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 10,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
