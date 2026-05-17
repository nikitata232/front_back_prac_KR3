# Практика 14 — Web App Manifest

## Что это

Расширение приложения заметок из Практики 13: добавлен **Web App Manifest**, благодаря которому приложение становится устанавливаемым PWA (Progressive Web App).

## Структура проекта

```
practice-14/
├── index.html        — разметка с мета-тегами для PWA
├── app.js            — логика заметок и регистрация SW
├── sw.js             — Service Worker (кэширует иконки и манифест)
├── manifest.json     — описание PWA-приложения
├── icons/            — иконки разных размеров (PNG)
│   ├── favicon.ico
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── favicon-48x48.png
│   ├── favicon-64x64.png
│   ├── favicon-128x128.png
│   ├── favicon-256x256.png
│   └── favicon-512x512.png
└── README.md
```

## Что добавлено по сравнению с Практикой 13

### `manifest.json`

Файл содержит метаданные приложения:

| Поле | Значение | Назначение |
|------|----------|------------|
| `name` | Мои заметки | Полное имя приложения |
| `short_name` | Заметки | Имя под иконкой |
| `start_url` | `/` | Стартовая страница |
| `display` | `standalone` | Запуск без интерфейса браузера |
| `background_color` | `#ffffff` | Цвет фона при запуске |
| `theme_color` | `#4285f4` | Цвет адресной строки / панели задач |
| `orientation` | `portrait-primary` | Ориентация экрана |
| `icons` | 7 размеров | Иконки от 16×16 до 512×512 |

Иконка 512×512 имеет `"purpose": "maskable any"` — она используется для **Splash Screen** на Android.

### Мета-теги в `index.html`

- `<link rel="manifest">` — подключает манифест.
- `<meta name="theme-color">` — цвет адресной строки Chrome/Edge.
- `<meta name="mobile-web-app-capable">` — режим полного экрана на Android.
- `<link rel="apple-touch-icon">` — иконка при добавлении на домашний экран iOS.
- `<meta name="apple-mobile-web-app-status-bar-style">` — стиль статус-бара iOS.

### Service Worker (`sw.js`)

Версия кэша обновлена до `notes-cache-v2`. В список кэшируемых ресурсов добавлены:
- `manifest.json`
- все иконки из папки `icons/`

## Как запустить

```bash
npx http-server -p 8080
```

Открыть: `http://localhost:8080`

## Как протестировать установку

1. Открыть DevTools → **Application** → **Manifest** — убедиться, что манифест загружен без ошибок, все поля и иконки отображаются.
2. В Chrome в правой части адресной строки должна появиться кнопка **«Установить»** (значок со стрелкой вверх или плюс в круге).
3. После установки приложение откроется в отдельном окне без панели браузера.
4. В **Cache Storage** должен появиться кэш `notes-cache-v2` со всеми файлами включая иконки.
