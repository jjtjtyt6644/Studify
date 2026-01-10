import AsyncStorage from '@react-native-async-storage/async-storage';

export class CoinSystem {
  private static COIN_STORAGE_KEY = 'gameCoins';
  private static COIN_HISTORY_KEY = 'coinHistory';

  // Coin rewards
  static readonly REWARDS = {
    POMODORO_COMPLETE: 10,
    HOMEWORK_COMPLETE: 15,
    DAILY_STREAK: 20,
    LEVEL_UP: 50,
  };

  static async getCoins(): Promise<number> {
    try {
      const coins = await AsyncStorage.getItem(this.COIN_STORAGE_KEY);
      return coins ? parseInt(coins) : 0;
    } catch (error) {
      console.error('Error getting coins:', error);
      return 0;
    }
  }

  static async addCoins(amount: number, reason: string): Promise<number> {
    try {
      const currentCoins = await this.getCoins();
      const newTotal = currentCoins + amount;
      await AsyncStorage.setItem(this.COIN_STORAGE_KEY, newTotal.toString());
      
      // Log the transaction
      await this.logTransaction(amount, reason);
      
      return newTotal;
    } catch (error) {
      console.error('Error adding coins:', error);
      return 0;
    }
  }

  static async spendCoins(amount: number, reason: string): Promise<boolean> {
    try {
      const currentCoins = await this.getCoins();
      if (currentCoins >= amount) {
        const newTotal = currentCoins - amount;
        await AsyncStorage.setItem(this.COIN_STORAGE_KEY, newTotal.toString());
        await this.logTransaction(-amount, reason);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error spending coins:', error);
      return false;
    }
  }

  private static async logTransaction(amount: number, reason: string): Promise<void> {
    try {
      const historyData = await AsyncStorage.getItem(this.COIN_HISTORY_KEY);
      const history = historyData ? JSON.parse(historyData) : [];
      
      history.unshift({
        amount,
        reason,
        timestamp: new Date().toISOString(),
      });

      // Keep only last 50 transactions
      if (history.length > 50) {
        history.splice(50);
      }

      await AsyncStorage.setItem(this.COIN_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error logging transaction:', error);
    }
  }

  static async getCoinHistory(): Promise<Array<{ amount: number; reason: string; timestamp: string }>> {
    try {
      const historyData = await AsyncStorage.getItem(this.COIN_HISTORY_KEY);
      return historyData ? JSON.parse(historyData) : [];
    } catch (error) {
      console.error('Error getting coin history:', error);
      return [];
    }
  }
}
