# 📚 Studify

Your ultimate study companion for productivity and success! Studify combines the Pomodoro Technique with homework tracking, smart notifications, and a rewarding coin system to help students stay focused and organized.

![Version](https://img.shields.io/badge/version-1.2.1-blue)
![Platform](https://img.shields.io/badge/platform-Android-green)
![React Native](https://img.shields.io/badge/React%20Native-Expo-purple)

## ✨ Features

### 🍅 Pomodoro Timer
- **Focus Mode & Break Time**: Customizable work and break sessions
- **Timer Persistence**: Timer continues running even if you close the app
- **Mode Switching**: Tap the header to easily switch between work and break modes
- **Visual Feedback**: Pulsing animations and progress indicators
- **Smart Notifications**: Get notified when your timer completes

### 📖 Homework Tracker
- **Task Management**: Add, edit, and delete homework assignments
- **Priority Levels**: Organize tasks by low, medium, or high priority
- **Due Date Tracking**: Never miss a deadline with visual due date indicators
- **Smart Reminders**: 
  - Notification on the due date at 9 AM
  - Reminder notification 1 day before at 9 AM
- **Progress Tracking**: See completed vs pending homework at a glance
- **Notes & Subjects**: Add detailed notes and categorize by subject

### 💰 Coin Reward System
- **Earn Coins**: 
  - +10 coins for completing a Pomodoro session
  - +15 coins for completing homework
- **Live Coin Display**: Always visible at the top of the app
- **Motivational**: Gamification encourages consistent studying

### 📊 Comprehensive Statistics
Real-time tracking of your productivity:
- **Sessions Completed**: Total Pomodoro sessions
- **Day Streak**: Consecutive days of completed sessions
- **Total Coins**: Your current coin balance
- **Study Time**: Total time spent in focus sessions
- **Break Time**: Total time spent in breaks
- **Today's Time**: Live tracking of app usage today (updates every second)

### 🐱 Study Companion
- Adorable floating cat animation keeps you company while studying
- Provides a friendly presence during long study sessions

### ⚙️ Settings & Customization
- **Timer Settings**: Customize work, short break, and long break durations
- **App Info**: Detailed information about Studify with an interactive modal
- **Data Management**: Reset settings or clear all data
- **Statistics Dashboard**: View all your productivity metrics in one place

### 🎉 Welcome Screen
- First-time user experience introducing all features
- Shows only once per installation
- Beautiful UI with feature highlights

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Expo CLI
- Android device or emulator

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/jjtjtyt6644/Studify.git
cd Studify
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the development server**
```bash
npx expo start
```

4. **Run on your device**
   - Scan the QR code with Expo Go app (Android)
   - Or press `a` to open in Android emulator

### Building APK

To build a production APK:

```bash
# Preview build (for testing)
npx eas build --platform android --profile preview

# Production build
npx eas build --platform android --profile production
```

For detailed build instructions, see [BUILD_ANDROID.md](BUILD_ANDROID.md)

## 📱 Screenshots

*(Coming soon)*

## 🛠️ Technologies Used

- **React Native**: Cross-platform mobile framework
- **Expo SDK 54**: Development toolchain and runtime
- **TypeScript**: Type-safe JavaScript
- **AsyncStorage**: Local data persistence
- **Expo Notifications**: Smart notification system
- **Lottie**: Smooth animations
- **React Navigation**: Navigation between screens

## 📂 Project Structure

```
studify/
├── app/
│   ├── screens/
│   │   ├── PomodoroScreen.tsx    # Timer functionality
│   │   ├── HomeworkScreen.tsx    # Task management
│   │   ├── StoreScreen.tsx       # Future store (coming soon)
│   │   ├── SettingsScreen.tsx    # App settings & stats
│   │   └── WelcomeScreen.tsx     # Onboarding
│   └── utils/
│       └── CoinSystem.ts         # Coin management logic
├── assets/
│   ├── animations/               # Lottie animations
│   └── studify.png              # App icon
├── App.tsx                      # Main app component
├── app.json                     # Expo configuration
└── eas.json                     # Build configuration
```

## 🎯 How to Use

### Starting a Study Session
1. Open the app and navigate to the **Pomodoro** tab
2. Tap the mode indicator to switch between Focus Mode and Break Time
3. Press the **Play** button to start the timer
4. Stay focused until the timer completes
5. Earn coins and start your break!

### Managing Homework
1. Navigate to the **Homework** tab
2. Tap the **+** button to add new homework
3. Fill in title, subject, due date, priority, and notes
4. Tap the checkbox to mark homework as complete
5. Earn coins for completing tasks!

### Viewing Progress
1. Navigate to the **Settings** tab
2. View your real-time statistics:
   - Sessions completed
   - Current streak
   - Total coins earned
   - Study and break time
   - Today's app usage

## 🔔 Notification Features

Studify uses smart notifications to keep you on track:

- **Timer Notifications**: Alerts when Pomodoro sessions complete
- **Homework Reminders**: 
  - On due date at 9 AM
  - One day before at 9 AM
- **Auto-cancellation**: Notifications are automatically cancelled when tasks are completed or timers are reset

## 🔒 Privacy

All your data is stored locally on your device using AsyncStorage. Studify does not collect, transmit, or store any personal information on external servers.

## 🐛 Known Issues

- TypeScript configuration warning in expo-notifications (non-blocking, doesn't affect functionality)

## 🚧 Coming Soon

- **In-App Store**: Spend coins on themes, pet customization, and rewards
- **More Study Companions**: Additional animated characters
- **Dark/Light Themes**: Customizable color schemes
- **Cloud Sync**: Backup and sync data across devices
- **Study Groups**: Collaborate with friends
- **Advanced Analytics**: Detailed productivity insights

## 👨‍💻 Developer

Junyu

Built for students everywhere

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Cat animation from Lottie Files
- Icons from Expo Vector Icons
- Built with Expo and React Native
- Inspired by the Pomodoro Technique

## 📮 Support

If you encounter any issues or have suggestions, please open an issue on GitHub.

---

**Made for productive studying** 📚✨
- [ ] Pet assets with animations (Checklist #3)
- [ ] Gamification with coins and rewards (Checklist #4)
- [ ] In-app store (Checklist #5)

## Color Scheme

- Background: `#1a1a2e` (Dark Blue)
- Secondary: `#16213e` (Navy)
- Accent: `#e94560` (Red/Pink)
- Success: `#4CAF50` (Green)
- Warning: `#FF9800` (Orange)

## Usage Tips

1. **First Time Setup**: Go to Settings to customize your timer durations
2. **Start Studying**: Use the Pomodoro timer to focus on your work
3. **Track Progress**: Check the Calendar to see your study history
4. **Stay Consistent**: Aim for 4+ sessions per day to mark it as a productive day!

## Development

Built with for productive studying

Version: 1.2.1
