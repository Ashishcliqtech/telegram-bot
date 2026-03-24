# 🏪 Golu Offers — Telegram Coupon Store

India's #1 digital coupon marketplace, powered by a Telegram Bot and a professional Admin Dashboard. Built with Node.js and MongoDB.

## ✨ Features

- **Telegram Bot**: Full catalog browsing, secure payments via Razorpay, and instant coupon delivery.
- **Admin Dashboard**: Real-time stats (revenue, orders, stock), inventory management, and manual fulfillment.
- **Persistent Database**: Powered by MongoDB Atlas for order and user tracking.
- **Secure Webhooks**: Integrity-verified Razorpay payment automation.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js v16+
- MongoDB Atlas (or local MongoDB)
- Telegram Bot Token (from @BotFather)
- Razorpay API Keys

### 2. Setup
Clone the repo and install dependencies:
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file (see `.env.example`):
```env
BOT_TOKEN=your_telegram_bot_token
RAZORPAY_KEY_ID=your_razorpay_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
MONGODB_URI=your_mongodb_atlas_uri
DASHBOARD_SECRET=your_admin_password
```

### 4. Run
Start both the bot and the dashboard with one command:
```bash
npm start
```

---

## 📊 Administration
Access the dashboard at `http://localhost:3000/dashboard.html` using your `DASHBOARD_SECRET`.

---

## 🛠️ Tech Stack
- **Bot**: `node-telegram-bot-api`
- **Database**: `MongoDB` + `Mongoose`
- **Payments**: `Razorpay`
- **Server**: `Express.js`
- **Frontend**: `Vanilla JS` + `CSS3` (Inter Font)
