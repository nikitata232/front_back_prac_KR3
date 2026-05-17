# Практика 16 — WebSocket + Push-уведомления

## Что это

Расширение приложения из Практики 15: добавлена двусторонняя связь в реальном времени через **WebSocket** (Socket.IO) и **Push-уведомления** через Web Push API + VAPID.

## Структура проекта

```
practice-16/
├── server.js           — Node.js сервер (Express + Socket.IO + web-push)
├── package.json        — зависимости
├── index.html          — App Shell с кнопками управления уведомлениями
├── app.js              — клиент: навигация, заметки, WebSocket, push-подписка
├── sw.js               — Service Worker с обработчиком push-событий
├── manifest.json       — Web App Manifest
├── icons/              — иконки PWA
├── content/
│   ├── home.html       — форма и список заметок
│   └── about.html      — о приложении
└── README.md
```

## Что добавлено по сравнению с Практикой 15

### Серверная часть (`server.js`)

Node.js сервер выполняет три задачи:
1. **Раздаёт статику** — `express.static()` отдаёт все файлы фронтенда.
2. **WebSocket** — через Socket.IO обрабатывает событие `newTask` от клиента и рассылает `taskAdded` всем подключённым клиентам.
3. **Push-уведомления** — при получении `newTask` отправляет push всем сохранённым подпискам через `web-push`.

Эндпоинты:
- `POST /subscribe` — сохраняет push-подписку клиента
- `POST /unsubscribe` — удаляет подписку по `endpoint`

### VAPID-ключи

VAPID (Voluntary Application Server Identification) — механизм идентификации сервера при отправке push. Ключи сгенерированы командой:

```bash
npx web-push generate-vapid-keys
```

Публичный ключ прописан и в `server.js`, и в `app.js` (клиент использует его при подписке).

### WebSocket (`app.js`)

- При старте создаётся соединение: `const socket = io('http://localhost:3001')`.
- При добавлении заметки отправляется событие: `socket.emit('newTask', { text, timestamp })`.
- При получении `taskAdded` от сервера показывается всплывающий toast с текстом задачи.

### Push-уведомления (`app.js`)

- `subscribeToPush()` — запрашивает разрешение у пользователя, создаёт подписку через `PushManager.subscribe()`, отправляет её на `POST /subscribe`.
- `unsubscribeFromPush()` — отписывается через `PushManager.getSubscription().unsubscribe()` и удаляет с сервера.
- Кнопки **«Включить уведомления»** / **«Отключить уведомления»** переключают состояние.

### Service Worker (`sw.js`)

Добавлен обработчик события `push`:
```js
self.addEventListener('push', event => {
  const data = event.data.json();
  self.registration.showNotification(data.title, { body: data.body, icon: '...' });
});
```
Показывает системное уведомление даже когда вкладка закрыта.

## Как запустить

```bash
# 1. Установить зависимости
npm install

# 2. Запустить сервер
npm start
# или: node server.js
```

Открыть: `http://localhost:3001`

## Как протестировать

1. Открыть две вкладки по адресу `http://localhost:3001`.
2. В одной вкладке нажать **«Включить уведомления»** и разрешить.
3. Добавить заметку в первой вкладке.
4. Во второй вкладке появится toast-сообщение (WebSocket).
5. Если вторая вкладка неактивна или свёрнута — придёт системное push-уведомление.
6. Нажать **«Отключить уведомления»** — push перестанут приходить, toast продолжат.

> **Примечание**: Push-уведомления работают только по HTTPS (или `localhost`). В production необходимо сгенерировать собственные VAPID-ключи через `npx web-push generate-vapid-keys` и заменить их в `server.js` и `app.js`.
