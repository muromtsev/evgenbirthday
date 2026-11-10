// ============================================================
// НАСТРОЙКИ
// ============================================================
const BIRTHDAY_MONTH = 10;          // ноябрь (0 = январь)
const BIRTHDAY_DAY = 17;
const CELEBRATION_HOURS = 24;       // длительность праздника
const MOSCOW_OFFSET_MIN = 3 * 60;   // UTC+3

// let __nowOverride = null;         // фиксированное значение (мс) или null
// let __nowShift = 0;               // сдвиг в мс (живой, прибавляется к Date.now())

// function _now() {
//   if (__nowOverride !== null) return __nowOverride;
//   return Date.now() + __nowShift;
// }

// window.__setNow = function (dateOrTs) {
//   if (dateOrTs === null || dateOrTs === undefined) {
//     __nowOverride = null;
//     __nowShift = 0;
//     console.log('⏱ Время сброшено на реальное');
//   } else {
//     __nowOverride = (dateOrTs instanceof Date) ? dateOrTs.getTime() : dateOrTs;
//     console.log('⏱ Время зафиксировано:', new Date(__nowOverride).toISOString());
//   }
//   tick();
// };

// // Живой сдвиг: время продолжает идти от указанной точки
// window.__shiftNow = function (dateOrTs) {
//   __nowOverride = null;
//   const target = (dateOrTs instanceof Date) ? dateOrTs.getTime() : dateOrTs;
//   __nowShift = target - Date.now();
//   console.log('⏱ Сдвиг установлен. «Сейчас» =', new Date(_now()).toISOString());
//   tick();
// };

// ============================================================
// ЭЛЕМЕНТЫ
// ============================================================
const els = {
  days:     document.getElementById('days'),
  hours:    document.getElementById('hours'),
  minutes:  document.getElementById('minutes'),
  seconds:  document.getElementById('seconds'),
  timer:    document.getElementById('timer'),
  congrats: document.getElementById('congrats'),
  title:    document.querySelector('.title'),
  subtitle: document.querySelector('.subtitle'),
};

// ============================================================
// УТИЛИТЫ
// ============================================================
function pad(n) {
  return String(n).padStart(2, '0');
}

/**
 * Текущее время по Москве (UTC+3) в виде Date,
 * но методы getUTC* которого дают «московские» компоненты.
 */
function getMoscowNow() {
  const now = new Date();
  return new Date(
    now.getTime() + (MOSCOW_OFFSET_MIN + now.getTimezoneOffset()) * 60 * 1000
  );
}

/**
 * Timestamp (мс, UTC) для московской даты: 17 ноября year, 00:00.
 */
function getBirthdayTimestamp(year) {
  return Date.UTC(year, BIRTHDAY_MONTH, BIRTHDAY_DAY, 0, 0, 0)
    - MOSCOW_OFFSET_MIN * 60 * 1000;
}

/**
 * Состояние: праздник или отсчёт до ближайшего ДР.
 */
function getState(nowTs) {
  const mskYear = getMoscowNow().getUTCFullYear();

  // 1. Проверяем, не идёт ли праздничное окно (24 часа от 00:00 МСК 17.11)
  for (const year of [mskYear - 1, mskYear]) {
    const start = getBirthdayTimestamp(year);
    const end = start + CELEBRATION_HOURS * 60 * 60 * 1000;
    if (nowTs >= start && nowTs < end) {
      return { mode: 'celebration' };
    }
  }

  // 2. Ищем ближайший ДР в будущем
  let target = getBirthdayTimestamp(mskYear);
  if (nowTs >= target + CELEBRATION_HOURS * 60 * 60 * 1000) {
    target = getBirthdayTimestamp(mskYear + 1);
  }
  return { mode: 'countdown', target };
}

/**
 * Отрисовка.
 */
function render(state, nowTs) {
  if (state.mode === 'celebration') {
    els.timer.classList.add('hidden');
    els.subtitle.classList.add('hidden');
    els.congrats.classList.remove('hidden');
    els.title.textContent = '🎂 Ура! Праздник наступил! 🎂';
    return;
  }

  els.timer.classList.remove('hidden');
  els.subtitle.classList.remove('hidden');
  els.congrats.classList.add('hidden');
  els.title.textContent = 'Скоро день рождения! 🎂';

  const diff = state.target - nowTs;
  const totalSeconds = Math.max(0, Math.floor(diff / 1000));

  const days    = Math.floor(totalSeconds / 86400);
  const hours   = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  els.days.textContent    = pad(days);
  els.hours.textContent   = pad(hours);
  els.minutes.textContent = pad(minutes);
  els.seconds.textContent = pad(seconds);
}

// ============================================================
// КОНФЕТТИ (canvas)
// ============================================================
(function initConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');

  let particles = [];
  let animationId = null;
  let stopAt = 0;

  const COLORS = [
    '#ff6b9d', '#c44dff', '#ffd93d', '#4dd0ff',
    '#6bff9d', '#ff8c42', '#ffffff'
  ];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function spawn(count) {
    const w = canvas.width;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: -20 - Math.random() * canvas.height * 0.3,
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 8,
        vx: -1.5 + Math.random() * 3,
        vy: 2 + Math.random() * 3.5,
        rot: Math.random() * Math.PI * 2,
        vrot: -0.2 + Math.random() * 0.4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        shape: Math.random() > 0.3 ? 'rect' : 'circle',
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.05 + Math.random() * 0.05,
      });
    }
  }

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles = particles.filter(p => p.y < canvas.height + 40);

    for (const p of particles) {
      p.wobble += p.wobbleSpeed;
      p.x += p.vx + Math.sin(p.wobble) * 0.8;
      p.y += p.vy;
      p.rot += p.vrot;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx.restore();
    }

    if (particles.length > 0 || Date.now() < stopAt) {
      if (Date.now() < stopAt && Math.random() < 0.35) {
        spawn(4);
      }
      animationId = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(animationId);
      animationId = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function fire(durationMs = 3000, initialBurst = 120) {
    stopAt = Date.now() + durationMs;
    spawn(initialBurst);
    if (!animationId) {
      animationId = requestAnimationFrame(tick);
    }
  }

  // Экспортируем наружу
  window.__fireConfetti = fire;

  // Приветственная волна при загрузке
  window.addEventListener('load', () => fire(2500, 80));

  // Клик по блоку поздравления — ещё одна волна
  const congratsEl = document.getElementById('congrats');
  if (congratsEl) {
    congratsEl.style.cursor = 'pointer';
    congratsEl.addEventListener('click', () => fire(3000, 150));
  }
})();

// ============================================================
// ГЛАВНЫЙ ЦИКЛ + переключение режимов
// ============================================================
let celebrationFired = false;

function tick() {
  const nowTs = Date.now();
  const state = getState(nowTs);

  if (state.mode === 'celebration' && !celebrationFired) {
    celebrationFired = true;
    // Большой салют на 8 секунд — ровно один раз в момент входа в праздник
    if (typeof window.__fireConfetti === 'function') {
      window.__fireConfetti(8000, 250);
    }
  } else if (state.mode === 'countdown') {
    // Сброс, чтобы в следующем году салют сработал снова
    celebrationFired = false;
  }

  render(state, nowTs);
}

tick();
setInterval(tick, 1000);

// ============================================================
// КНОПКА «ПОДЕЛИТЬСЯ»
// ============================================================
(function initShare() {
  const btn = document.getElementById('share-btn');
  if (!btn) return;

  const textEl = btn.querySelector('.share-text');
  const iconEl = btn.querySelector('.share-icon');
  const defaultText = textEl.textContent;

  function copyToClipboard(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (e) {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }

  btn.addEventListener('click', function () {
    const url = window.location.href;
    const ok = copyToClipboard(url);
    if (ok) {
      textEl.textContent = 'Скопировано!';
      iconEl.textContent = '✅';
      btn.classList.add('copied');
      setTimeout(() => {
        textEl.textContent = defaultText;
        iconEl.textContent = '🔗';
        btn.classList.remove('copied');
      }, 2200);
    } else {
      // крайний случай — показываем ссылку вручную
      window.prompt('Скопируйте ссылку:', url);
    }
  });
})();

// ============================================================
// МУЗЫКА
// ============================================================
(function initMusic() {
  const btn = document.getElementById('music-btn');
  const audio = document.getElementById('bg-music');
  if (!btn || !audio) return;

  const textEl = btn.querySelector('.music-text');
  const iconEl = btn.querySelector('.music-icon');
  const defaultText = textEl.textContent;

  // Тихо стартуем (10% громкости), чтобы не долбило
  audio.volume = 0.25;

  async function toggleMusic() {
    if (audio.paused) {
      try {
        await audio.play();
        btn.classList.add('playing');
        textEl.textContent = 'Пауза';
        iconEl.textContent = '⏸️';
      } catch (err) {
        console.warn('Не удалось запустить музыку:', err);
        textEl.textContent = 'Нет аудио';
        setTimeout(() => { textEl.textContent = defaultText; }, 2000);
      }
    } else {
      audio.pause();
      btn.classList.remove('playing');
      textEl.textContent = defaultText;
      iconEl.textContent = '🎵';
    }
  }

  btn.addEventListener('click', toggleMusic);
})();

// ============================================================
// ФОНОВЫЕ ИСКРЫ
// ============================================================
(function initSparkles() {
  const canvas = document.getElementById('sparkles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let sparkles = [];
  let animationId = null;

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function createSparkle() {
    return {
      x: Math.random() * canvas.width,
      y: canvas.height + 10,
      r: 0.8 + Math.random() * 1.8,
      speed: 0.2 + Math.random() * 0.6,
      drift: -0.4 + Math.random() * 0.8,
      alpha: 0.3 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      phaseSpeed: 0.01 + Math.random() * 0.02,
      color: Math.random() > 0.5 ? '#ffd93d' : '#c44dff',
    };
  }

  function ensureCount() {
    // Держим ~1 искру на 25 000 px² — примерно 30-60 штук на экран
    const target = Math.round((canvas.width * canvas.height) / 25000);
    while (sparkles.length < target) {
      const s = createSparkle();
      s.y = Math.random() * canvas.height; // при старте — по всему экрану
      sparkles.push(s);
    }
    while (sparkles.length > target) sparkles.pop();
  }

  // Уважаем настройку «уменьшить движение»
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    ensureCount();
    // рисуем один статичный кадр
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of sparkles) {
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    return;
  }

  ensureCount();

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const s of sparkles) {
      s.y -= s.speed;
      s.x += s.drift;
      s.phase += s.phaseSpeed;

      // мерцание
      const flicker = 0.6 + 0.4 * Math.sin(s.phase);

      ctx.globalAlpha = s.alpha * flicker;
      ctx.fillStyle = s.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();

      // если ушла вверх за экран — перезапускаем снизу
      if (s.y < -10) {
        Object.assign(s, createSparkle());
        s.y = canvas.height + 10;
      }

      // легкий wrap по горизонтали
      if (s.x < -10) s.x = canvas.width + 10;
      if (s.x > canvas.width + 10) s.x = -10;
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    animationId = requestAnimationFrame(tick);
  }

  tick();

  // Пауза, когда вкладка неактивна — экономия батареи
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animationId);
      animationId = null;
    } else if (!animationId) {
      tick();
    }
  });
})();