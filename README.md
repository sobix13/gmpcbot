# GMPC World - Telegram Bot Lounge 🌂

A high-performance, anonymous Telegram lounge bot built with Node.js and SQLite.

## 🚀 Features
- **Anonymous Chat**: No commands needed to chat after joining.
- **Identity Management**: Mandatory nicknames and secure Tripcodes.
- **Karma System**: Weighted reactions based on user ranks (Admin/Mod/User).
- **Interactive Polls**: Create, vote, and end polls anonymously.
- **Staff Tools**: Ban, Promote, MOTD, and User management.
- **24/7 Ready**: Built with Express and SQLite for persistence.

## 🛠️ Setup Instructions

1. **Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   TELEGRAM_BOT_TOKEN=your_token_here
   ADMIN_USER_ID=your_telegram_id_here
   ```

2. **Installation**:
   ```bash
   npm install
   ```

3. **Running the Bot**:
   ```bash
   npm start
   ```

## 📖 Commands
- `/gmpc` - Join the lounge
- `/stop` - Leave the lounge
- `/nick [name]` - Set your nickname
- `/tripcode` - Toggle digital signature
- `/info` - View your stats
- `/poll Q | O1 | O2` - Create a poll
- `/help` - Show all commands

## 🛡️ Admin Commands
- `/motd [text]` - Set Message of the Day
- `/ban [ID]` - Ban a user
- `/promote [ID]` - Promote to Moderator
- `/users` - See online count
