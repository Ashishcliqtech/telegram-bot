require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const Razorpay = require("razorpay");
const db = require("./db");
const store = require("./store");

// ╔══════════════════════════════════════════════════════╗
// ║          🏪 GOLU OFFERS — TELEGRAM BOT              ║
// ╚══════════════════════════════════════════════════════╝

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

const SHOP_NAME = "🏪 Golu Offers";
const TAGLINE = "India's #1 Discount Coupon Store";
const SUPPORT_USERNAME = "@GoLuOffersSupport";

function formatPrice(paise) {
  return `₹${paise / 100}`;
}

function statusBadge(status) {
  const badges = {
    pending: "🕐 Pending Payment",
    paid: "✅ Paid",
    delivered: "🎁 Delivered",
    failed: "❌ Failed",
  };
  return badges[status] || status;
}

/** Safe wrapper — logs errors and sends a user-friendly message */
async function safeExec(chatId, fn) {
  try {
    await fn();
  } catch (err) {
    console.error(`[BOT ERROR] chatId=${chatId}`, err.message || err);
    await bot.sendMessage(
      chatId,
      "⚠️ Something went wrong. Please try again in a moment.\nIf this keeps happening, contact " +
        SUPPORT_USERNAME
    );
  }
}

// ─────────────────────────────────────────────────────────
// MAIN MENU KEYBOARD
// ─────────────────────────────────────────────────────────

function mainMenuKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        ["🛒 Browse Coupons", "📦 My Orders"],
        ["💬 Support", "❓ Help"],
      ],
      resize_keyboard: true,
      one_time_keyboard: false,
    },
  };
}

// ─────────────────────────────────────────────────────────
// /start — WELCOME
// ─────────────────────────────────────────────────────────

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  await store.upsertUser(msg);

  const name = msg.from.first_name || "there";
  const userOrders = await store.getUserOrders(chatId);
  const isReturning = userOrders.length > 0;

  const greeting = isReturning
    ? `👋 Welcome back, *${name}*! Great to see you again.`
    : `🎉 Hello, *${name}*! Welcome to *${SHOP_NAME}*!`;

  const welcomeText =
    `${greeting}\n\n` +
    `✨ *${TAGLINE}*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔥 *What we offer:*\n` +
    `👗 Myntra coupons — Up to ₹200 off\n` +
    `📦 Amazon deals — ₹150 off Fresh & more\n` +
    `🍔 Swiggy codes — ₹60 off your meals\n` +
    `🍕 Zomato vouchers — ₹75 off orders\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `⚡ *Instant delivery after payment*\n` +
    `🔒 *100% Secure — Powered by Razorpay*\n\n` +
    `Use the menu below to get started! ⬇️`;

  await bot.sendMessage(chatId, welcomeText, {
    parse_mode: "Markdown",
    ...mainMenuKeyboard(),
  });
});

// ─────────────────────────────────────────────────────────
// /help
// ─────────────────────────────────────────────────────────

bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  await sendHelp(chatId);
});

async function sendHelp(chatId) {
  const helpText =
    `❓ *How ${SHOP_NAME} Works*\n\n` +
    `*Step 1 —* Tap 🛒 *Browse Coupons*\n` +
    `*Step 2 —* Pick a category (Myntra, Amazon…)\n` +
    `*Step 3 —* Select the coupon you want\n` +
    `*Step 4 —* Pay securely via Razorpay\n` +
    `*Step 5 —* Your coupon arrives *instantly* 🎉\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📦 *My Orders* — See all your past purchases\n` +
    `💬 *Support* — Get help from our team\n\n` +
    `Need help? Contact ${SUPPORT_USERNAME}`;

  await bot.sendMessage(chatId, helpText, {
    parse_mode: "Markdown",
    ...mainMenuKeyboard(),
  });
}

// ─────────────────────────────────────────────────────────
// MESSAGE ROUTER
// ─────────────────────────────────────────────────────────

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || text.startsWith("/")) return;

  await store.upsertUser(msg);

  switch (text) {
    case "🛒 Browse Coupons":
      return safeExec(chatId, () => sendCategoryMenu(chatId));

    case "📦 My Orders":
      return safeExec(chatId, () => sendMyOrders(chatId));

    case "💬 Support":
      return safeExec(chatId, () => sendSupport(chatId));

    case "❓ Help":
      return safeExec(chatId, () => sendHelp(chatId));

    default:
      return bot.sendMessage(
        chatId,
        "Use the menu buttons below to navigate the store 👇",
        mainMenuKeyboard()
      );
  }
});

// ─────────────────────────────────────────────────────────
// INLINE CALLBACK ROUTER
// ─────────────────────────────────────────────────────────

bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const messageId = query.message.message_id;

  await bot.answerCallbackQuery(query.id);

  if (data.startsWith("CAT:")) {
    const categoryKey = data.split(":")[1];
    return safeExec(chatId, () =>
      sendProductList(chatId, categoryKey, messageId)
    );
  }

  if (data.startsWith("BUY:")) {
    const productId = data.split(":")[1];
    return safeExec(chatId, () => handleBuyProduct(chatId, productId));
  }

  if (data === "BACK_CATALOG") {
    return safeExec(chatId, () => sendCategoryMenu(chatId, messageId));
  }
});

// ─────────────────────────────────────────────────────────
// CATEGORY MENU
// ─────────────────────────────────────────────────────────

async function sendCategoryMenu(chatId, editMessageId = null) {
  const catalog = await store.getCatalog();

  const buttons = Object.entries(catalog).map(([key, cat]) => [
    {
      text: `${cat.label} (${cat.products.length} deals)`,
      callback_data: `CAT:${key}`,
    },
  ]);

  const opts = {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: buttons },
  };

  const text =
    `🛒 *Browse Our Coupon Catalog*\n\n` +
    `Select a category to see available deals:\n`;

  if (editMessageId) {
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: editMessageId,
      ...opts,
    });
  } else {
    await bot.sendMessage(chatId, text, opts);
  }
}

// ─────────────────────────────────────────────────────────
// PRODUCT LIST
// ─────────────────────────────────────────────────────────

async function sendProductList(chatId, categoryKey, editMessageId = null) {
  const catalog = await store.getCatalog();
  const category = catalog[categoryKey];

  if (!category) {
    return bot.sendMessage(chatId, "❌ Category not found.");
  }

  const lines = [`${category.label} *Deals*\n`];
  const buttons = [];

  for (const product of category.products) {
    const available = product.pool.length;
    const stockLabel =
      available === 0
        ? "❌ Sold Out"
        : available <= 2
        ? `⚠️ Only ${available} left!`
        : `✅ ${available} in stock`;

    lines.push(
      `${product.emoji} *${product.name}*\n` +
        `   ${product.description}\n` +
        `   💰 Price: *${formatPrice(product.price)}*   ${stockLabel}\n`
    );

    buttons.push([
      {
        text:
          available === 0
            ? `❌ ${product.name} — Sold Out`
            : `${product.emoji} Buy for ${formatPrice(product.price)}`,
        callback_data: available === 0 ? "NOOP" : `BUY:${product.id}`,
      },
    ]);
  }

  buttons.push([{ text: "⬅️ Back to Categories", callback_data: "BACK_CATALOG" }]);

  const text = lines.join("\n");
  const opts = {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: buttons },
  };

  if (editMessageId) {
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: editMessageId,
      ...opts,
    });
  } else {
    await bot.sendMessage(chatId, text, opts);
  }
}

// ─────────────────────────────────────────────────────────
// BUY PRODUCT — Create Razorpay Payment Link
// ─────────────────────────────────────────────────────────

async function handleBuyProduct(chatId, productId) {
  const product = await store.getProduct(productId);

  if (!product) {
    return bot.sendMessage(chatId, "❌ Product not found. Please try again.");
  }

  if (product.pool.length === 0) {
    return bot.sendMessage(
      chatId,
      `😔 Sorry! *${product.name}* is currently out of stock.\n\n` +
        `We restock regularly. Check back soon or contact ${SUPPORT_USERNAME} to be notified!`,
      { parse_mode: "Markdown" }
    );
  }

  if (await store.hasPendingOrder(chatId, productId)) {
    return bot.sendMessage(
      chatId,
      `⚠️ You already have a *pending payment* for *${product.name}*.\n\n` +
        `Please complete or wait for it to expire before purchasing again.`,
      { parse_mode: "Markdown" }
    );
  }

  const processingMsg = await bot.sendMessage(
    chatId,
    `⏳ Generating your secure payment link for *${product.name}*…`,
    { parse_mode: "Markdown" }
  );

  try {
    const paymentLink = await razorpay.paymentLink.create({
      amount: product.price,
      currency: "INR",
      accept_partial: false,
      description: product.name,
      notes: {
        telegramId: String(chatId),
        productId: product.id,
      },
      reminder_enable: false,
      notify: { sms: false, email: false },
    });

    const order = await store.createOrder({
      userId: chatId,
      productId: product.id,
      paymentLinkId: paymentLink.id,
    });

    await bot.deleteMessage(chatId, processingMsg.message_id).catch(() => {});

    const payText =
      `🛒 *Order Ready!*\n\n` +
      `${product.emoji} *${product.name}*\n` +
      `${product.description}\n\n` +
      `💰 *Amount to Pay: ${formatPrice(product.price)}*\n` +
      `🔖 Order ID: \`${order.orderId}\`\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👇 Tap the button below to pay securely:\n`;

    await bot.sendMessage(chatId, payText, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: `💳 Pay ${formatPrice(product.price)} Securely`, url: paymentLink.short_url }],
          [{ text: "❌ Cancel", callback_data: `CANCEL:${order.orderId}` }],
        ],
      },
    });
  } catch (err) {
    await bot.deleteMessage(chatId, processingMsg.message_id).catch(() => {});
    console.error("[RAZORPAY ERROR]", err.message || err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────
// MY ORDERS
// ─────────────────────────────────────────────────────────

async function sendMyOrders(chatId) {
  const userOrders = await store.getUserOrders(chatId);

  if (!userOrders.length) {
    return bot.sendMessage(
      chatId,
      `📦 *My Orders*\n\n` +
        `You haven't placed any orders yet.\n\n` +
        `Tap 🛒 *Browse Coupons* to explore deals!`,
      { parse_mode: "Markdown", ...mainMenuKeyboard() }
    );
  }

  const lines = [`📦 *Your Orders* (${userOrders.length} total)\n`];

  const displayOrders = userOrders.slice(0, 5);
  for (let i = 0; i < displayOrders.length; i++) {
    const order = displayOrders[i];
    const product = await store.getProduct(order.productId);
    const productName = product ? product.name : order.productId;
    const date = new Date(order.createdAt).toLocaleDateString("en-IN");

    lines.push(
      `*${i + 1}. ${productName}*\n` +
        `   📅 ${date}   ${statusBadge(order.status)}\n` +
        (order.coupon ? `   🎁 Coupon: \`${order.coupon}\`\n` : "") +
        `   🔖 \`${order.orderId}\``
    );
  }

  if (userOrders.length > 5) {
    lines.push(`\n_Showing latest 5 of ${userOrders.length} orders._`);
  }

  await bot.sendMessage(chatId, lines.join("\n\n"), {
    parse_mode: "Markdown",
    ...mainMenuKeyboard(),
  });
}

// ─────────────────────────────────────────────────────────
// SUPPORT
// ─────────────────────────────────────────────────────────

async function sendSupport(chatId) {
  const supportText =
    `💬 *Contact & Support*\n\n` +
    `Have a question or issue? We're here to help!\n\n` +
    `👤 Support: ${SUPPORT_USERNAME}\n` +
    `⏰ Response time: Usually within 1-2 hours\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `*Common Issues:*\n` +
    `• Payment done but no coupon? → Message us with your Order ID\n` +
    `• Coupon not working? → We'll replace it free!\n` +
    `• Wrong product? → Let us know within 24 hours`;

  await bot.sendMessage(chatId, supportText, {
    parse_mode: "Markdown",
    ...mainMenuKeyboard(),
  });
}

// ─────────────────────────────────────────────────────────
// BOT ERROR HANDLING
// ─────────────────────────────────────────────────────────

bot.on("polling_error", (err) => {
  console.error("[POLLING ERROR]", err.code, err.message);
});

bot.on("error", (err) => {
  console.error("[BOT ERROR]", err.message);
});

// ─────────────────────────────────────────────────────────
// STARTUP — Connect DB then start bot
// ─────────────────────────────────────────────────────────

(async () => {
  await db.connect();
  await store.initCatalog();

  console.log(`\n╔══════════════════════════════════╗`);
  console.log(`║  ${SHOP_NAME} Bot is LIVE! 🚀   ║`);
  console.log(`╚══════════════════════════════════╝\n`);
})();