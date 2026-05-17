const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const webpush = require('web-push');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const vapidKeys = {
  publicKey: 'BK0q32LTa54LR1JiU7Su3no6udu9FRpMkyCroAj4OO-QOHe-UkdSlxfKLAkIx5K9EtEaFL9LUBwlr1FOviWtckk',
  privateKey: 'hAD3DHGhyZnIdwvPhtLHY6iihvQ4nhnJf-WGHI4JmwQ'
};

webpush.setVapidDetails(
  'mailto:tatiana.limonova1@gmail.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, './')));

let subscriptions = [];

// Хранилище активных таймеров напоминаний: key = reminderId, value = { timeoutId, text, reminderTime }
const reminders = new Map();

const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

function sendPushToAll(payload) {
  const json = JSON.stringify(payload);
  subscriptions.forEach(sub => {
    webpush.sendNotification(sub, json).catch(err => {
      console.error('Push error:', err.statusCode, err.body);
    });
  });
}

io.on('connection', (socket) => {
  console.log('Клиент подключён:', socket.id);

  // Обычная задача (без напоминания) — рассылаем WebSocket + push сразу
  socket.on('newTask', (task) => {
    io.emit('taskAdded', task);
    sendPushToAll({ title: 'Новая задача', body: task.text });
  });

  // Задача с напоминанием — планируем отложенный push
  socket.on('newReminder', (reminder) => {
    const { id, text, reminderTime } = reminder;
    const delay = reminderTime - Date.now();
    if (delay <= 0) {
      console.log('Время напоминания уже прошло:', id);
      return;
    }

    const timeoutId = setTimeout(() => {
      sendPushToAll({ title: '🔔 Напоминание', body: text, reminderId: id });
      reminders.delete(id);
    }, delay);

    reminders.set(id, { timeoutId, text, reminderTime });
    console.log(`Напоминание ${id} запланировано через ${Math.round(delay / 1000)} сек.`);
  });

  socket.on('disconnect', () => {
    console.log('Клиент отключён:', socket.id);
  });
});

// Push-подписки
app.post('/subscribe', (req, res) => {
  const sub = req.body;
  if (!subscriptions.some(s => s.endpoint === sub.endpoint)) subscriptions.push(sub);
  res.status(201).json({ message: 'Подписка сохранена' });
});

app.post('/unsubscribe', (req, res) => {
  subscriptions = subscriptions.filter(s => s.endpoint !== req.body.endpoint);
  res.status(200).json({ message: 'Подписка удалена' });
});

// Отложить напоминание на 5 минут
app.post('/snooze', (req, res) => {
  const reminderId = parseInt(req.query.reminderId, 10);
  if (!reminderId || !reminders.has(reminderId)) {
    return res.status(404).json({ error: 'Напоминание не найдено' });
  }

  const reminder = reminders.get(reminderId);
  clearTimeout(reminder.timeoutId);

  const snoozeDelay = 5 * 60 * 1000; // 5 минут
  const newTimeoutId = setTimeout(() => {
    sendPushToAll({ title: '🔔 Отложенное напоминание', body: reminder.text, reminderId });
    reminders.delete(reminderId);
  }, snoozeDelay);

  reminders.set(reminderId, {
    ...reminder,
    timeoutId: newTimeoutId,
    reminderTime: Date.now() + snoozeDelay
  });

  console.log(`Напоминание ${reminderId} отложено на 5 минут`);
  res.status(200).json({ message: 'Напоминание отложено на 5 минут' });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});
