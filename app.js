(() => {
  'use strict';

  const STORAGE = {
    tasks: 'focusV4_tasks',
    logic: 'focusV4_logic',
    chat: 'focusV4_chat',
    profile: 'focusV4_profile',
    spotify: 'focusV4_spotify',
    gameHighScore: 'focusV4_game_high_score'
  };

  const logicHabits = [
    ['Break large tasks into smaller steps', 'Turn a vague mission into the next visible action.'],
    ['Use active recall', 'Close the book and retrieve the idea from memory.'],
    ['Explain concepts simply', 'Teach the concept as if explaining it to a younger student.'],
    ['Review mistakes', 'Record what went wrong and what you will change next time.'],
    ['Protect a focused block', 'Put the phone away and work on one target at a time.']
  ];

  let tasks = loadJSON(STORAGE.tasks, []);
  let logicState = loadJSON(STORAGE.logic, Array(logicHabits.length).fill(false));
  let chatHistory = loadJSON(STORAGE.chat, []);
  let profile = loadJSON(STORAGE.profile, null);
  let spotifyEmbedUrl = loadJSON(STORAGE.spotify, 'https://open.spotify.com/embed/playlist/37i9dQZF1DX8Uebhn9wzrS?utm_source=generator&theme=0');

  // Defensive normalization: malformed localStorage data should never break the app.
  if (!Array.isArray(tasks)) tasks = [];
  if (!Array.isArray(logicState) || logicState.length !== logicHabits.length) logicState = Array(logicHabits.length).fill(false);
  if (!Array.isArray(chatHistory)) chatHistory = [];
  if (!profile || typeof profile.username !== 'string' || !profile.username.trim()) profile = null;
  if (typeof spotifyEmbedUrl !== 'string' || !spotifyEmbedUrl.startsWith('https://open.spotify.com/embed/')) spotifyEmbedUrl = 'https://open.spotify.com/embed/playlist/37i9dQZF1DX8Uebhn9wzrS?utm_source=generator&theme=0';
  let calendarDate = new Date();
  let selectedDate = dateKey(new Date());
  let timerSeconds = 25 * 60;
  let timerInterval = null;
  let timerRunning = false;
  let gameHighScore = Math.max(0, Number(loadJSON(STORAGE.gameHighScore, 0)) || 0);
  let gameScore = 0;
  let gameCombo = 0;
  let gameLives = 3;
  let gameTime = 30;
  let gameRunning = false;
  let gameInterval = null;
  let gameMissTimer = null;

  const $ = (id) => document.getElementById(id);
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { showToast('Local storage is unavailable in this browser.'); }
  }

  function dateKey(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  }

  function formatDate(key, options = { weekday:'short', month:'short', day:'numeric' }) {
    const [y,m,d] = key.split('-').map(Number);
    return new Date(y, m-1, d).toLocaleDateString(undefined, options);
  }

  function todayGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  function setupHeader() {
    $('greeting').textContent = todayGreeting();
    const username = profile?.username?.trim() || 'shinobi';
    $('greetingName').textContent = username;
    $('profileName').textContent = username;
    $('profileAvatar').textContent = username.charAt(0).toUpperCase();
    $('todayLabel').textContent = new Date().toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric' }).toUpperCase();
  }

  function renderDashboard() {
    const today = dateKey(new Date());
    const todayTasks = tasks.filter(t => t.dueDate === today);
    const completed = todayTasks.filter(t => t.completed).length;
    const remaining = todayTasks.length - completed;
    const rate = todayTasks.length ? Math.round((completed / todayTasks.length) * 100) : 0;
    $('completedCount').textContent = completed;
    $('remainingCount').textContent = remaining;
    $('completionRate').textContent = `${rate}%`;
    $('completionBar').style.width = `${rate}%`;
    renderTaskList($('todayMissions'), todayTasks, 'No missions for today. Add one to begin your route.');
  }

  function renderTaskList(container, list, emptyMessage) {
    if (!list.length) {
      container.innerHTML = `<div class="empty-state">${escapeHTML(emptyMessage)}</div>`;
      return;
    }
    container.innerHTML = list.map(task => `
      <article class="mission-item ${task.completed ? 'completed' : ''}">
        <input class="mission-check" type="checkbox" ${task.completed ? 'checked' : ''} data-task-toggle="${task.id}" aria-label="Complete ${escapeHTML(task.title)}" />
        <div><div class="mission-title">${escapeHTML(task.title)}</div><div class="mission-meta">${escapeHTML(task.subject || 'General')} · Due ${formatDate(task.dueDate)}</div></div>
        <div class="mission-actions"><button class="mini-button" data-task-delete="${task.id}" aria-label="Delete ${escapeHTML(task.title)}">×</button></div>
      </article>`).join('');
  }

  function renderCalendar() {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    $('calendarTitle').textContent = calendarDate.toLocaleDateString(undefined, { month:'long', year:'numeric' });
    const first = new Date(year, month, 1);
    const start = new Date(year, month, 1 - first.getDay());
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const key = dateKey(d);
      const dayTasks = tasks.filter(t => t.dueDate === key);
      cells.push(`<button class="calendar-cell ${d.getMonth() !== month ? 'muted-day' : ''} ${key === dateKey(new Date()) ? 'today' : ''} ${key === selectedDate ? 'selected' : ''}" data-calendar-date="${key}">
        <span class="day-number">${d.getDate()}</span><span class="day-dots">${dayTasks.slice(0,5).map(t => `<i class="day-dot ${t.completed ? 'done' : ''}"></i>`).join('')}</span></button>`);
    }
    $('calendarGrid').innerHTML = cells.join('');
    renderSelectedDay();
  }

  function renderSelectedDay() {
    $('selectedDateTitle').textContent = formatDate(selectedDate, { weekday:'long', month:'long', day:'numeric' });
    const selectedTasks = tasks.filter(t => t.dueDate === selectedDate);
    renderTaskList($('selectedDayMissions'), selectedTasks, 'No missions on this day.');
  }

  function renderLogic() {
    $('logicChecklist').innerHTML = logicHabits.map((habit, index) => `
      <label class="logic-item ${logicState[index] ? 'checked' : ''}">
        <input type="checkbox" data-logic="${index}" ${logicState[index] ? 'checked' : ''} />
        <span><strong>${escapeHTML(habit[0])}</strong><p>${escapeHTML(habit[1])}</p></span>
      </label>`).join('');
    const done = logicState.filter(Boolean).length;
    $('logicProgress').textContent = `${done} / ${logicHabits.length}`;
  }

  function renderChat() {
    if (!chatHistory.length) {
      chatHistory = [{ role:'sensei', text:'Welcome back. I can help with simple study planning, revision routines, focus blocks, and using the planner. I am an offline demo, so I cannot reliably answer arbitrary academic questions.' }];
      saveJSON(STORAGE.chat, chatHistory);
    }
    $('chatMessages').innerHTML = chatHistory.map(m => `<div class="chat-bubble ${m.role}">${escapeHTML(m.text)}</div>`).join('');
    $('chatMessages').scrollTop = $('chatMessages').scrollHeight;
  }

  function showLogin() {
    $('loginScreen').classList.remove('hidden');
    document.body.classList.add('login-locked');
    setTimeout(() => $('loginUsername').focus(), 0);
  }

  function hideLogin() {
    $('loginScreen').classList.add('hidden');
    document.body.classList.remove('login-locked');
  }

  function handleLogin(event) {
    event.preventDefault();
    const username = $('loginUsername').value.trim();
    const password = $('loginPassword').value;
    if (!username || password.length < 4) {
      showToast('Use a username and a password with at least 4 characters.');
      return;
    }
    // Frontend-only demo: never store the password.
    profile = { username };
    saveJSON(STORAGE.profile, profile);
    setupHeader();
    hideLogin();
    showToast(`Welcome to the village, ${username}.`);
    $('loginForm').reset();
  }

  function logout() {
    profile = null;
    try { localStorage.removeItem(STORAGE.profile); } catch {}
    setupHeader();
    showLogin();
    showToast('Local session ended.');
  }

  function addTask(title, subject, dueDate) {
    tasks.push({ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, title, subject, dueDate, completed:false });
    saveJSON(STORAGE.tasks, tasks);
    renderAll();
    showToast('Mission added to your route.');
  }

  function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    task.completed = !task.completed;
    saveJSON(STORAGE.tasks, tasks);
    renderAll();
  }

  function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveJSON(STORAGE.tasks, tasks);
    renderAll();
    showToast('Mission removed.');
  }

  function renderAll() {
    renderDashboard();
    renderCalendar();
    renderLogic();
  }

  function showView(viewName) {
    qsa('.view').forEach(v => v.classList.toggle('active', v.id === `${viewName}View`));
    qsa('.nav-link').forEach(btn => btn.classList.toggle('active', btn.dataset.view === viewName));
    $('sidebar').classList.remove('open');
    window.scrollTo({ top:0, behavior:'smooth' });
  }

  function openModal(defaultDate = dateKey(new Date())) {
    $('taskDate').value = defaultDate;
    $('taskModal').hidden = false;
    setTimeout(() => $('taskTitle').focus(), 0);
  }
  function closeModal() { $('taskModal').hidden = true; $('taskForm').reset(); $('taskDate').value = dateKey(new Date()); }

  function generateStrategy(event) {
    event.preventDefault();
    const raw = $('subjects').value.split('\n').map(s => s.trim()).filter(Boolean);
    const hours = Number($('studyHours').value);
    const block = Number($('sessionLength').value);
    const mode = qs('input[name="priorityMode"]:checked').value;
    if (!raw.length || !hours || hours <= 0) { $('strategyOutput').innerHTML = '<div class="empty-state">Add at least one subject and some available time.</div>'; return; }
    const subjects = raw.map((line, index) => { const [name, priority = 'normal'] = line.split('|').map(x => x.trim()); return { name, priority: priority.toLowerCase(), index }; });
    if (mode === 'high') subjects.sort((a,b) => (b.priority === 'high') - (a.priority === 'high'));
    const totalMinutes = Math.floor(hours * 60);
    const breakMinutes = 5;
    const maxBlocks = Math.max(1, Math.floor((totalMinutes + breakMinutes) / (block + breakMinutes)));
    const route = [];
    let cursor = new Date(); cursor.setMinutes(Math.ceil(cursor.getMinutes()/5)*5, 0, 0);
    for (let i = 0; i < maxBlocks; i++) {
      const subject = subjects[i % subjects.length];
      const start = cursor.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
      cursor = new Date(cursor.getTime() + block*60000);
      const end = cursor.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
      route.push({ start, end, subject, kind:'focus' });
      if (i < maxBlocks - 1) {
        const breakStart = cursor.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        cursor = new Date(cursor.getTime() + breakMinutes*60000);
        const breakEnd = cursor.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        route.push({ start:breakStart, end:breakEnd, kind:'break' });
      }
    }
    $('strategyOutput').innerHTML = route.map(item => item.kind === 'break'
      ? `<div class="schedule-item break"><span class="schedule-time">${item.start}</span><div><strong>Short reset</strong><small>Walk, water, breathe.</small></div><span>${item.end}</span></div>`
      : `<div class="schedule-item"><span class="schedule-time">${item.start}</span><div><strong>${escapeHTML(item.subject.name)}</strong><small>${item.subject.priority === 'high' ? 'High priority · ' : ''}Active focus block</small></div><span>${item.end}</span></div>`).join('');
  }

  function senseiReply(input) {
    const text = input.toLowerCase();
    if (/(plan|schedule|timetable|routine)/.test(text)) return 'Start with 2–3 subjects, assign the hardest one to your freshest block, then alternate focused blocks with short breaks. Use the Study Strategy tab to generate a route.';
    if (/(revision|revise|review)/.test(text)) return 'For revision, try: recall from memory → check notes → solve a few questions → write down mistakes. Repeat the weak areas later.';
    if (/(focus|concentrate|distract|phone)/.test(text)) return 'Try one 25–50 minute focus block: one target, phone away, notifications off, and a visible finish line. Rest briefly before the next block.';
    if (/(biology|bio)/.test(text)) return 'For Biology, use active recall: diagrams from memory, key processes in your own words, then short question practice. I cannot verify detailed Biology answers in this offline demo.';
    if (/(chemistry|chem)/.test(text)) return 'For Chemistry, split the session into concept recall, equations/reactions, and problem practice. I cannot reliably verify arbitrary Chemistry answers here.';
    if (/(physics|phy)/.test(text)) return 'For Physics, write the given values, choose the formula, track units, then solve step by step and check the result.';
    if (/(hello|hi|hey)/.test(text)) return 'Welcome, shinobi. Tell me whether you need a plan, revision routine, focus reset, or help using Focus V4.';
    return 'I am a small offline study-planning demo. I can help with planning, revision, focus routines, and using this app, but I should not pretend to know arbitrary academic answers.';
  }

  function submitChat(event) {
    event.preventDefault();
    const input = $('chatText').value.trim();
    if (!input) return;
    chatHistory.push({ role:'user', text:input }, { role:'sensei', text:senseiReply(input) });
    saveJSON(STORAGE.chat, chatHistory);
    $('chatText').value = '';
    renderChat();
  renderTimer();
  }


  function spotifyToEmbedUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;

    // Accept normal Spotify share links such as /track/ID, /playlist/ID, /album/ID,
    // /show/ID and /episode/ID. Also accept an existing Spotify embed URL.
    try {
      const url = new URL(raw);
      const host = url.hostname.toLowerCase();
      if (host !== 'open.spotify.com' && host !== 'spotify.com' && !host.endsWith('.spotify.com')) return null;
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts[0] === 'embed' && ['track','playlist','album','show','episode'].includes(parts[1]) && parts[2]) {
        return `https://open.spotify.com/embed/${parts[1]}/${parts[2]}?utm_source=generator&theme=0`;
      }
      if (['track','playlist','album','show','episode'].includes(parts[0]) && parts[1]) {
        return `https://open.spotify.com/embed/${parts[0]}/${parts[1]}?utm_source=generator&theme=0`;
      }
    } catch {}

    // Also accept Spotify URIs copied from some desktop/mobile contexts.
    const uriMatch = raw.match(/^spotify:(track|playlist|album|show|episode):([A-Za-z0-9]+)$/i);
    if (uriMatch) return `https://open.spotify.com/embed/${uriMatch[1].toLowerCase()}/${uriMatch[2]}?utm_source=generator&theme=0`;
    return null;
  }

  function setupSpotify() {
    $('spotifyFrame').src = spotifyEmbedUrl;
    $('spotifyUrl').value = '';
    $('spotifyForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const embedUrl = spotifyToEmbedUrl($('spotifyUrl').value);
      if (!embedUrl) {
        showToast('Please paste a valid Spotify song or playlist link.');
        return;
      }
      spotifyEmbedUrl = embedUrl;
      saveJSON(STORAGE.spotify, spotifyEmbedUrl);
      $('spotifyFrame').src = spotifyEmbedUrl;
      $('spotifyUrl').value = '';
      showToast('Spotify player updated.');
    });
  }

  function updateGameHUD() {
    $('gameScore').textContent = String(gameScore);
    $('gameCombo').textContent = `${gameCombo}×`;
    $('gameLives').textContent = `${'♥ '.repeat(Math.max(0, gameLives)).trim()}${gameLives < 3 ? `${gameLives ? ' ' : ''}${'♡ '.repeat(3 - gameLives).trim()}` : ''}`;
    $('gameTime').textContent = String(gameTime);
    $('gameHighScore').textContent = String(gameHighScore);
  }

  function placeReflexTarget() {
    const arena = $('reflexArena');
    const target = $('reflexTarget');
    if (!arena || !target) return;
    const rect = arena.getBoundingClientRect();
    const size = Math.max(48, Math.min(68, rect.width * 0.105));
    const maxX = Math.max(8, rect.width - size - 8);
    const maxY = Math.max(8, rect.height - size - 8);
    target.style.width = `${size}px`;
    target.style.height = `${size}px`;
    target.style.left = `${8 + Math.random() * (maxX - 8)}px`;
    target.style.top = `${8 + Math.random() * (maxY - 8)}px`;
    target.hidden = false;
  }

  function clearGameTimers() {
    if (gameInterval) clearInterval(gameInterval);
    if (gameMissTimer) clearTimeout(gameMissTimer);
    gameInterval = null;
    gameMissTimer = null;
  }

  function finishGame(message = 'Mission complete!') {
    clearGameTimers();
    gameRunning = false;
    $('reflexTarget').hidden = true;
    $('gameStartPanel').hidden = false;
    $('gameStart').textContent = 'Play again';
    $('gameMessage').textContent = `${message} Score: ${gameScore}`;
    if (gameScore > gameHighScore) {
      gameHighScore = gameScore;
      saveJSON(STORAGE.gameHighScore, gameHighScore);
      $('gameMessage').textContent = `New high score! ${gameScore} points.`;
    }
    updateGameHUD();
  }

  function scheduleGameMiss() {
    if (!gameRunning) return;
    clearTimeout(gameMissTimer);
    gameMissTimer = setTimeout(() => {
      if (!gameRunning) return;
      gameLives -= 1;
      gameCombo = 0;
      $('gameMessage').textContent = 'Too slow! Your combo reset.';
      updateGameHUD();
      if (gameLives <= 0) {
        finishGame('Out of lives.');
        return;
      }
      placeReflexTarget();
      scheduleGameMiss();
    }, 1600);
  }

  function startGame() {
    clearGameTimers();
    gameScore = 0;
    gameCombo = 0;
    gameLives = 3;
    gameTime = 30;
    gameRunning = true;
    $('gameStartPanel').hidden = true;
    $('gameMessage').textContent = 'Go! Hit the target.';
    updateGameHUD();
    placeReflexTarget();
    scheduleGameMiss();

    gameInterval = setInterval(() => {
      if (!gameRunning) return;
      gameTime -= 1;
      updateGameHUD();
      if (gameTime <= 0) finishGame('Time up!');
    }, 1000);
  }

  function hitReflexTarget() {
    if (!gameRunning) return;
    gameCombo += 1;
    gameScore += 10 + Math.min(40, (gameCombo - 1) * 2);
    $('gameMessage').textContent = gameCombo >= 5 ? '🔥 Combo! Keep going!' : 'Nice hit!';
    placeReflexTarget();
    scheduleGameMiss();
    updateGameHUD();
  }

  function resetGameHighScore() {
    gameHighScore = 0;
    saveJSON(STORAGE.gameHighScore, 0);
    updateGameHUD();
    $('gameMessage').textContent = 'High score reset.';
  }

  function setupGame() {
    updateGameHUD();
    $('gameStart').addEventListener('click', startGame);
    $('reflexTarget').addEventListener('click', hitReflexTarget);
    $('gameReset').addEventListener('click', resetGameHighScore);
    window.addEventListener('resize', () => {
      if (gameRunning) placeReflexTarget();
    });
  }

  function showToast(message) {
    const toast = $('toast'); toast.textContent = message; toast.classList.add('show');
    clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function formatTimer(seconds) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }

  function renderTimer() {
    $('timerDisplay').textContent = formatTimer(timerSeconds);
    $('startTimer').textContent = timerRunning ? 'Pause' : (timerSeconds === 0 ? 'Start again' : 'Start focus');
    $('timerStatus').textContent = timerRunning ? 'Focus block in progress. Stay with one mission.' : (timerSeconds === 0 ? 'Focus block complete. Take a short break.' : 'Ready for a focused study block.');
    qsa('.timer-preset').forEach(btn => btn.classList.toggle('active', Number(btn.dataset.minutes) * 60 === timerSeconds && !timerRunning));
  }

  function stopTimerInterval() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    timerRunning = false;
  }

  function startOrPauseTimer() {
    if (timerRunning) {
      stopTimerInterval();
      renderTimer();
      return;
    }
    if (timerSeconds <= 0) return;
    timerRunning = true;
    renderTimer();
    timerInterval = setInterval(() => {
      timerSeconds -= 1;
      if (timerSeconds <= 0) {
        timerSeconds = 0;
        stopTimerInterval();
        renderTimer();
        showToast('Focus block complete. Take a short break.');
        try { document.title = 'Focus V4 · Break time'; } catch {}
        return;
      }
      renderTimer();
    }, 1000);
  }

  function setTimerMinutes(minutes) {
    const value = Math.max(1, Math.min(180, Number(minutes) || 25));
    stopTimerInterval();
    timerSeconds = Math.round(value * 60);
    $('customMinutes').value = value;
    renderTimer();
  }

  function openTimerModal() {
    $('timerModal').hidden = false;
    renderTimer();
  }

  function closeTimerModal() {
    $('timerModal').hidden = true;
  }

  function openSpotifyModal() {
    $('spotifyModal').hidden = false;
  }

  function closeSpotifyModal() {
    $('spotifyModal').hidden = true;
  }

  function bindEvents() {
    $('loginForm').addEventListener('submit', handleLogin);
    $('logoutButton').addEventListener('click', logout);
    qsa('.nav-link').forEach(btn => btn.addEventListener('click', () => showView(btn.dataset.view)));
    qsa('[data-view-target]').forEach(btn => btn.addEventListener('click', () => showView(btn.dataset.viewTarget)));
    $('openTaskModal').addEventListener('click', () => openModal());
    $('spotifyButton').addEventListener('click', openSpotifyModal);
    $('heroSpotifyButton').addEventListener('click', openSpotifyModal);
    $('closeSpotify').addEventListener('click', closeSpotifyModal);
    $('spotifyModal').addEventListener('click', e => { if (e.target === $('spotifyModal')) closeSpotifyModal(); });
    $('openTimer').addEventListener('click', openTimerModal);
    $('mobileTimer').addEventListener('click', openTimerModal);
    $('closeTimer').addEventListener('click', closeTimerModal);
    $('timerModal').addEventListener('click', e => { if (e.target === $('timerModal')) closeTimerModal(); });
    $('startTimer').addEventListener('click', startOrPauseTimer);
    $('resetTimer').addEventListener('click', () => setTimerMinutes(Number($('customMinutes').value) || 25));
    qsa('.timer-preset').forEach(btn => btn.addEventListener('click', () => setTimerMinutes(Number(btn.dataset.minutes))));
    $('customMinutes').addEventListener('change', () => setTimerMinutes($('customMinutes').value));
    $('calendarAdd').addEventListener('click', () => openModal(selectedDate));
    $('mobileAdd').addEventListener('click', () => openModal());
    $('closeTaskModal').addEventListener('click', closeModal);
    $('cancelTask').addEventListener('click', closeModal);
    $('taskModal').addEventListener('click', e => { if (e.target === $('taskModal')) closeModal(); });
    $('taskForm').addEventListener('submit', e => { e.preventDefault(); addTask($('taskTitle').value.trim(), $('taskSubject').value.trim(), $('taskDate').value); closeModal(); });
    $('prevMonth').addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth()-1); renderCalendar(); });
    $('nextMonth').addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth()+1); renderCalendar(); });
    $('calendarGrid').addEventListener('click', e => { const cell = e.target.closest('[data-calendar-date]'); if (!cell) return; selectedDate = cell.dataset.calendarDate; renderCalendar(); });
    document.addEventListener('click', e => {
      const toggle = e.target.closest('[data-task-toggle]'); if (toggle) toggleTask(toggle.dataset.taskToggle);
      const del = e.target.closest('[data-task-delete]'); if (del) deleteTask(del.dataset.taskDelete);
      const logic = e.target.closest('[data-logic]'); if (logic) { logicState[Number(logic.dataset.logic)] = logic.checked; saveJSON(STORAGE.logic, logicState); renderLogic(); }
    });
    $('strategyForm').addEventListener('submit', generateStrategy);
    $('chatForm').addEventListener('submit', submitChat);
    $('clearChat').addEventListener('click', () => { chatHistory = []; saveJSON(STORAGE.chat, chatHistory); renderChat(); showToast('Chat history cleared.'); });
    $('menuToggle').addEventListener('click', () => $('sidebar').classList.toggle('open'));
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (!$('taskModal').hidden) closeModal();
      if (!$('spotifyModal').hidden) closeSpotifyModal();
      if (!$('timerModal').hidden) closeTimerModal();
    });
  }

  setupHeader();
  setupSpotify();
  setupGame();
  bindEvents();
  renderAll();
  renderChat();
  renderTimer();
  $('taskDate').value = dateKey(new Date());
  if (profile) hideLogin(); else showLogin();
})();
