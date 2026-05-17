# Контрольная работа №3 — Фронтенд и бэкенд разработка

**Дисциплина:** Фронтенд и бэкенд разработка  
**Семестр:** 4 семестр, 2025/2026 уч. год  
**Практики:** №13–18

**Выполнил:** Лимонов Никита, группа ЭФБО-08-24


---

## Обзор

Шесть практик посвящены разработке **прогрессивного веб-приложения (PWA)** — менеджера заметок. Каждая практика расширяет предыдущую, добавляя новый слой технологий: от базового Service Worker до Push-уведомлений с напоминаниями и кнопкой «Отложить». Практика 18 — итоговая: тестирование и подготовка к сдаче.

```
app_front_kr3/
├── practice-13/   Service Worker — офлайн-режим
├── practice-14/   Web App Manifest — установка как приложение
├── practice-15/   App Shell + HTTPS — мгновенная загрузка
├── practice-16/   WebSocket + Push — реальное время
├── practice-17/   Напоминания + Snooze — детальные уведомления
└── practice-18/   Подготовка к контрольной работе №3
```

---

## Практика 13 — Service Worker

### Что реализовано

Базовое приложение заметок с офлайн-доступом через **Service Worker**.

```
practice-13/
├── index.html   — форма добавления и список заметок
├── app.js       — логика заметок + регистрация SW
└── sw.js        — Service Worker
```

### Ключевые решения

**Service Worker** — скрипт, работающий в фоновом потоке браузера отдельно от страницы. Жизненный цикл:

- `install` — при первой установке открывает кэш `notes-cache-v1` и сохраняет в него все статические файлы (`/`, `index.html`, `app.js`). `skipWaiting()` позволяет новому SW сразу взять управление.
- `activate` — удаляет устаревшие кэши с другими именами. `clients.claim()` немедленно берёт под контроль открытые вкладки.
- `fetch` — перехватывает все сетевые запросы. Стратегия **Cache First**: сначала кэш, при промахе — сеть.

**Заметки** хранятся в `localStorage` — данные доступны офлайн и не теряются при перезагрузке.

Баннер «Вы офлайн» отображается через события `online` / `offline` объекта `window`.

### Как запустить

```bash
cd practice-13
npx http-server -p 8080
# Открыть: http://localhost:8080
```

---

## Практика 14 — Web App Manifest

### Что реализовано

Приложение получает **Web App Manifest** — JSON-файл с метаданными, благодаря которому браузер предлагает установить сайт как нативное приложение.

```
practice-14/
├── index.html      — HTML с мета-тегами PWA
├── app.js
├── sw.js           — кэширует иконки и манифест
├── manifest.json   — описание PWA
└── icons/          — PNG-иконки 7 размеров (16–512px)
```

### Ключевые решения

**`manifest.json`** — основные поля:

| Поле | Значение | Назначение |
|------|----------|------------|
| `name` / `short_name` | Мои заметки / Заметки | Полное и короткое имя |
| `start_url` | `/` | Страница при запуске |
| `display` | `standalone` | Без интерфейса браузера |
| `theme_color` | `#4285f4` | Цвет адресной строки |
| `background_color` | `#ffffff` | Фон Splash Screen |
| `icons` | 7 размеров PNG | От 16×16 до 512×512 |

Иконка 512×512 имеет `"purpose": "maskable any"` — используется для Splash Screen на Android.

**Мета-теги** в `<head>`:
- `<link rel="manifest">` — подключает манифест.
- `<meta name="theme-color">` — цвет адресной строки Chrome/Edge.
- `<link rel="apple-touch-icon">` — иконка для iOS домашнего экрана.
- `<meta name="apple-mobile-web-app-status-bar-style">` — стиль статус-бара iOS.

**Service Worker** обновлён до версии `notes-cache-v2` и кэширует иконки и `manifest.json`.

### Как запустить

```bash
cd practice-14
npx http-server -p 8080
# Открыть: http://localhost:8080
# В адресной строке Chrome появится кнопка «Установить»
```

---

## Практика 15 — HTTPS + App Shell

### Что реализовано

Архитектура **App Shell** для мгновенной загрузки каркаса интерфейса и настройка локального **HTTPS** через `mkcert`.

```
practice-15/
├── index.html        — App Shell (шапка + навигация)
├── app.js            — динамическая загрузка страниц + заметки
├── sw.js             — Cache First + Network First
├── manifest.json
├── icons/
└── content/
    ├── home.html     — форма и список заметок
    └── about.html    — о приложении
```

### Ключевые решения

**App Shell** — минимальный каркас (`<header>` + `<nav>`), кэшируемый при первом посещении. Загружается мгновенно даже при медленном соединении. Контент подгружается динамически:

```js
async function loadContent(page) {
  const html = await fetch(`/content/${page}.html`).then(r => r.text());
  document.getElementById('app-content').innerHTML = html;
}
```

**Две стратегии кэширования** в SW:

| Ресурс | Стратегия | Логика |
|--------|-----------|--------|
| Статика (`/`, `app.js`, иконки) | Cache First | Из кэша мгновенно, при промахе — сеть |
| Динамический контент (`/content/*.html`) | Network First | Сначала сеть (актуально), при ошибке — кэш |

Два отдельных кэша: `app-shell-v1` (заполняется при `install`) и `dynamic-content-v1` (заполняется при первом обращении).

**Страница «О приложении»** — добавлена `content/about.html`, доступна офлайн.

**Настройка HTTPS** с `mkcert`:

```bash
brew install mkcert
mkcert -install
mkcert localhost 127.0.0.1 ::1
npx http-server --ssl --cert localhost.pem --key localhost-key.pem -p 3000
```

### Как запустить

```bash
cd practice-15
npx http-server -p 8080
# Открыть: http://localhost:8080
```

---

## Практика 16 — WebSocket + Push-уведомления

### Что реализовано

Двусторонняя связь в реальном времени через **WebSocket** (Socket.IO) и **Push-уведомления** через Web Push API + VAPID. Добавлен Node.js сервер.

```
practice-16/
├── server.js       — Express + Socket.IO + web-push
├── package.json
├── index.html      — App Shell + кнопки уведомлений
├── app.js          — WebSocket-клиент + push-подписка
├── sw.js           — обработчик push-событий
├── manifest.json
├── icons/
└── content/
    ├── home.html
    └── about.html
```

### Ключевые решения

**Серверная часть (`server.js`)** выполняет три задачи:
1. Раздаёт статику через `express.static()`.
2. Через Socket.IO принимает событие `newTask` и рассылает `taskAdded` всем подключённым клиентам.
3. При получении `newTask` отправляет push всем сохранённым подпискам через `webpush.sendNotification()`.

Эндпоинты: `POST /subscribe` — сохраняет подписку, `POST /unsubscribe` — удаляет.

**VAPID-ключи** — механизм идентификации сервера при отправке push. Генерируются командой:
```bash
npx web-push generate-vapid-keys
```
Публичный ключ используется и на сервере, и на клиенте (при создании подписки).

**WebSocket на клиенте (`app.js`)**:
- Подключение: `const socket = io('http://localhost:3001')`.
- Отправка при добавлении заметки: `socket.emit('newTask', { text, timestamp })`.
- При получении `taskAdded` от сервера показывается всплывающий toast другим вкладкам.

**Push-подписка**:
- `subscribeToPush()` — запрашивает разрешение, создаёт подписку через `PushManager.subscribe()`, отправляет на `POST /subscribe`.
- `unsubscribeFromPush()` — отписывается локально и удаляет с сервера.

**Service Worker** — добавлен обработчик `push`, который показывает системное уведомление даже при закрытом приложении:

```js
self.addEventListener('push', event => {
  const data = event.data.json();
  self.registration.showNotification(data.title, { body: data.body, icon: '...' });
});
```

### Как запустить

```bash
cd practice-16
npm install
npm start
# Открыть: http://localhost:3001
```

---

## Практика 17 — Детализация Push (напоминания + snooze)

### Что реализовано

Напоминания с указанием даты/времени и возможность **отложить уведомление на 5 минут** прямо из системного уведомления.

```
practice-17/
├── server.js       — планировщик напоминаний + эндпоинт /snooze
├── package.json
├── index.html
├── app.js          — форма с datetime-local + логика напоминаний
├── sw.js           — push + notificationclick (snooze)
├── manifest.json
├── icons/
└── content/
    ├── home.html   — две формы: обычная заметка + с напоминанием
    └── about.html
```

### Ключевые решения

**Форма напоминания** (`content/home.html`) — добавлена вторая форма с полями `<input type="text">` и `<input type="datetime-local">`.

**Структура заметки** расширена:
```js
{ id: Date.now(), text: "купить молоко", reminder: 1748123456789 }
```
Заметки с напоминанием отображаются с зелёным бейджем даты/времени.

**Планирование на сервере (`server.js`)**:
- При получении события `newReminder` вычисляется `delay = reminderTime - Date.now()`.
- Создаётся `setTimeout` — по истечении отправляет push с `reminderId`.
- `reminders` (Map) хранит `{ timeoutId, text, reminderTime }` для возможности откладывания.

**Откладывание — эндпоинт `POST /snooze?reminderId=<id>`**:
1. Находит напоминание в Map.
2. `clearTimeout()` — отменяет текущий таймер.
3. Создаёт новый `setTimeout` на 5 минут.
4. Обновляет запись в Map.

**Кнопки в уведомлении** (Notification Actions):
```js
options.actions = [
  { action: 'snooze', title: 'Отложить на 5 минут' },
  { action: 'dismiss', title: 'Закрыть' }
];
```

**Обработчик `notificationclick` в SW**:
- `snooze` → `fetch('/snooze?reminderId=...')` → напоминание переносится.
- `dismiss` → уведомление закрывается.
- Клик на само уведомление → открывает/фокусирует вкладку приложения.

### Как запустить

```bash
cd practice-17
npm install
npm start
# Открыть: http://localhost:3001
```

---

---

## Практика 18 — Подготовка к контрольной работе №3

### Что реализовано

Итоговое занятие без нового кода. Задача — протестировать всё реализованное в Практиках 13–17, убедиться в работоспособности и подготовить документацию.

```
practice-18/
└── README.md   — чеклист тестирования всех практик
```

### Содержание

**Чеклист тестирования** охватывает каждую практику и включает проверки:
- корректной работы Service Worker (установка, активация, кэширование, офлайн-режим);
- отображения Web App Manifest в DevTools и возможности установки как PWA;
- работы App Shell — мгновенной загрузки каркаса и переключения страниц офлайн;
- WebSocket-синхронизации между вкладками и доставки push-уведомлений;
- создания заметок с напоминаниями, срабатывания уведомления в назначенное время и функции «Отложить на 5 минут».

Подробный чеклист: [`practice-18/README.md`](practice-18/README.md).

---

## Сводная таблица технологий

| Практика | Новые технологии | Файлы |
|----------|-----------------|-------|
| 13 | Service Worker, Cache API, localStorage | `sw.js`, `app.js` |
| 14 | Web App Manifest, PWA-иконки | `manifest.json`, `icons/` |
| 15 | App Shell Architecture, Network First / Cache First, HTTPS (mkcert) | `content/`, переработан `sw.js` |
| 16 | Node.js, Express, Socket.IO (WebSocket), Web Push API, VAPID | `server.js`, `package.json` |
| 17 | Notification Actions, setTimeout-планировщик, Snooze | расширены `server.js`, `sw.js`, `app.js` |
| 18 | Тестирование, документирование, сдача КР №3 | `README.md` |

## Зависимости (практики 16–17)

```json
{
  "express": "^4.18.2",
  "socket.io": "^4.7.2",
  "web-push": "^3.6.7",
  "body-parser": "^1.20.2",
  "cors": "^2.8.5"
}
```
