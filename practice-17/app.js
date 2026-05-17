const contentDiv = document.getElementById('app-content');
const homeBtn = document.getElementById('home-btn');
const aboutBtn = document.getElementById('about-btn');
const offlineBanner = document.getElementById('offline-banner');

const VAPID_PUBLIC_KEY = 'BK0q32LTa54LR1JiU7Su3no6udu9FRpMkyCroAj4OO-QOHe-UkdSlxfKLAkIx5K9EtEaFL9LUBwlr1FOviWtckk';

const socket = io('http://localhost:3001');

// ── Навигация ─────────────────────────────────────────────────────────────

function setActiveButton(activeId) {
  [homeBtn, aboutBtn].forEach(btn => btn.classList.remove('active'));
  document.getElementById(activeId).classList.add('active');
}

async function loadContent(page) {
  try {
    const response = await fetch(`/content/${page}.html`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    contentDiv.innerHTML = await response.text();
    if (page === 'home') initNotes();
  } catch (err) {
    contentDiv.innerHTML = `<p style="color:#e74c3c">Ошибка загрузки страницы.</p>`;
  }
}

homeBtn.addEventListener('click', () => { setActiveButton('home-btn'); loadContent('home'); });
aboutBtn.addEventListener('click', () => { setActiveButton('about-btn'); loadContent('about'); });
loadContent('home');

// ── Заметки ───────────────────────────────────────────────────────────────

function initNotes() {
  const form = document.getElementById('note-form');
  const input = document.getElementById('note-input');
  const reminderForm = document.getElementById('reminder-form');
  const reminderText = document.getElementById('reminder-text');
  const reminderTime = document.getElementById('reminder-time');
  const list = document.getElementById('notes-list');

  function loadNotes() {
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    list.innerHTML = notes.map(note => {
      let reminderBadge = '';
      if (note.reminder) {
        const date = new Date(note.reminder);
        reminderBadge = `<span class="reminder-badge">⏰ ${date.toLocaleString('ru-RU')}</span>`;
      }
      return `<li class="card" style="margin-bottom:0.5rem;padding:0.6rem 1rem;">
        ${note.text}${reminderBadge}
      </li>`;
    }).join('');
  }

  function addNote(text, reminderTimestamp = null) {
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    const newNote = { id: Date.now(), text, reminder: reminderTimestamp };
    notes.push(newNote);
    localStorage.setItem('notes', JSON.stringify(notes));
    loadNotes();

    if (reminderTimestamp) {
      // Отправляем напоминание на сервер для планирования push
      socket.emit('newReminder', {
        id: newNote.id,
        text,
        reminderTime: reminderTimestamp
      });
    } else {
      socket.emit('newTask', { text, timestamp: Date.now() });
    }
  }

  // Обычная заметка
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (text) { addNote(text); input.value = ''; }
  });

  // Заметка с напоминанием
  reminderForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = reminderText.value.trim();
    const datetime = reminderTime.value;
    if (text && datetime) {
      const timestamp = new Date(datetime).getTime();
      if (timestamp > Date.now()) {
        addNote(text, timestamp);
        reminderText.value = '';
        reminderTime.value = '';
      } else {
        alert('Дата и время напоминания должны быть в будущем');
      }
    }
  });

  loadNotes();
}

// ── WebSocket: события от сервера ─────────────────────────────────────────

socket.on('taskAdded', (task) => {
  showToast(`Новая задача: ${task.text}`);
});

function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed; top: 16px; right: 16px;
    background: #4285f4; color: #fff; padding: 0.8rem 1.2rem;
    border-radius: 6px; z-index: 9999; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    font-size: 0.95rem; max-width: 300px;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ── Push-уведомления ──────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
    await fetch('http://localhost:3001/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    });
    console.log('Push-подписка активирована');
  } catch (err) {
    console.error('Ошибка подписки на push:', err);
  }
}

async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await fetch('http://localhost:3001/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint })
    });
    await subscription.unsubscribe();
  }
}

// ── Service Worker + кнопки ───────────────────────────────────────────────

window.addEventListener('online', () => { offlineBanner.style.display = 'none'; });
window.addEventListener('offline', () => { offlineBanner.style.display = 'block'; });
if (!navigator.onLine) offlineBanner.style.display = 'block';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered:', reg.scope);

      const enableBtn = document.getElementById('enable-push');
      const disableBtn = document.getElementById('disable-push');

      if (enableBtn && disableBtn) {
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          enableBtn.style.display = 'none';
          disableBtn.style.display = 'inline-block';
        }

        enableBtn.addEventListener('click', async () => {
          if (Notification.permission === 'denied') {
            alert('Уведомления запрещены. Разрешите их в настройках браузера.');
            return;
          }
          if (Notification.permission === 'default') {
            const perm = await Notification.requestPermission();
            if (perm !== 'granted') { alert('Необходимо разрешить уведомления.'); return; }
          }
          await subscribeToPush();
          enableBtn.style.display = 'none';
          disableBtn.style.display = 'inline-block';
        });

        disableBtn.addEventListener('click', async () => {
          await unsubscribeFromPush();
          disableBtn.style.display = 'none';
          enableBtn.style.display = 'inline-block';
        });
      }
    } catch (err) {
      console.error('SW registration failed:', err);
    }
  });
}
