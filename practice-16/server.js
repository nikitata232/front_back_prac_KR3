const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const webpush = require('web-push');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// VAPID-ключи (сгенерированы через npx web-push generate-vapid-keys)
// В production замените на свои ключи!
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

// Хранилище push-подписок (в памяти, сбрасывается при рестарте сервера)
let subscriptions = [];

const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

io.on('connection', (socket) => {
  console.log('Клиент подключён:', socket.id);

  // Получаем событие от клиента о новой задаче
  socket.on('newTask', (task) => {
    // Рассылаем всем подключённым клиентам (включая отправителя)
    io.emit('taskAdded', task);

    // Отправляем push-уведомление всем подписанным клиентам
    const payload = JSON.stringify({
      title: 'Новая задача',
      body: task.text
    });
    subscriptions.forEach(sub => {
      webpush.sendNotification(sub, payload).catch(err => {
        console.error('Push error:', err.statusCode, err.body);
      });
    });
  });

  socket.on('disconnect', () => {
    console.log('Клиент отключён:', socket.id);
  });
});

// Сохранить push-подписку
app.post('/subscribe', (req, res) => {
  const subscription = req.body;
  const exists = subscriptions.some(s => s.endpoint === subscription.endpoint);
  if (!exists) subscriptions.push(subscription);
  res.status(201).json({ message: 'Подписка сохранена' });
});

// Удалить push-подписку
app.post('/unsubscribe', (req, res) => {
  const { endpoint } = req.body;
  subscriptions = subscriptions.filter(sub => sub.endpoint !== endpoint);
  res.status(200).json({ message: 'Подписка удалена' });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});
