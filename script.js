/* ARIMIR — новый самостоятельный MVP.
   Озвучка воспроизводится только из assets/audio/*.mp3.
   Если MP3 не добавлен, приложение показывает предупреждение и НЕ включает голос браузера. */
"use strict";

const AUDIO = {
  day_welcome: "assets/audio/day_welcome.mp3",
  day_morning: "assets/audio/day_morning.mp3",
  day_teeth: "assets/audio/day_teeth.mp3",
  day_tea: "assets/audio/day_tea.mp3",
  day_breakfast: "assets/audio/day_breakfast.mp3",
  day_saturday: "assets/audio/day_saturday.mp3",
  day_question: "assets/audio/day_question.mp3",
  day_correct: "assets/audio/day_correct.mp3",
  day_try_again: "assets/audio/day_try_again.mp3",
  birthday_welcome: "assets/audio/birthday_welcome.mp3",
  birthday_pop: "assets/audio/birthday_pop.mp3",
  birthday_wait: "assets/audio/birthday_wait.mp3",
  birthday_repeat: "assets/audio/birthday_repeat.mp3",
  balloon_pop: "assets/audio/balloon_pop.mp3"
};

const AUDIO_TEXT = {
  day_welcome: "Привет, Ари! Меня зовут Рэйя! Чем займёмся сегодня? Если хочешь провести немного времени со мной, нажми на солнышко. А если хочешь посмотреть сколько дней осталось до твоего день рождения, нажми на тортик.",
  day_morning: "Уже утро! Что мы делаем каждое утро? Нажми на картинку, чтобы узнать.",
  day_teeth: "Умничка! Каждое утро мы чистим зубы.",
  day_tea: "А что ещё мы делаем каждое утро? Нажми на картинку, чтобы узнать.",
  day_breakfast: "Верно! Ты пьёшь чай и завтракаешь. Так начинается твоё утро.",
  day_saturday: "А знаешь, какой сегодня день? Сегодня суббота! Обычно в субботу утром приходит Тами.",
  day_question: "Давай вспомним. Сегодня суббота. Обычно Тами приходит по субботам. Когда он придёт — сегодня или завтра? Нажми на сердеко, если Тами придёт сегодня. Нажми на звёздочку, если Тами придёт завтра.",
  day_correct: "Да! Сегодня суббота.",
  day_try_again: "Давай вспомним вместе. Сегодня суббота. Обычно Тами приходит по субботам утром. Значит, сегодня — день когда он придёт. Давай попробуем ещё раз.",
  birthday_welcome: "Ари, смотри, какая красивая праздничная гирлянда! До твоего дня рождения осталось поспасть 74 раза. Каждое утро мы будем лопать по одному шарику. Нажми на красный шарик, чтобы его лопнуть!",
  birthday_pop: "Оп! Шарик лопнул! Один раз ты уже спала. Теперь осталось поспать 73 раза, и мы зажжём свечи на торте!",
  birthday_wait: "Этот шарик пока подождёт. Давай сначала лопнём красный шарик!",
  birthday_repeat: "Каждое утро мы будем лопать только один красный шарик. Нажми на него, и мы станем на один сон ближе к твоему дню рождения!"
};

const $ = (selector) => document.querySelector(selector);
const screens = { home: $("#homeScreen"), day: $("#dayScreen"), birthday: $("#birthdayScreen") };
let currentAudio = null;
let audioUnlocked = false;
let lessonStep = 0;
let lessonBusy = false;
let birthdayIntroPlayed = false;
let demoMode = true; // true: демонстрация 24.10.2026; false: календарный режим
const DEMO_DATE = "2026-10-24";
const DEMO_COUNT = 74;
const BIRTHDAY_MONTH = 0; // январь
const BIRTHDAY_DAY = 6;
const STORAGE_KEY = "arimir_birthday_state_v2";
const DEMO_STORAGE_KEY = "arimir_birthday_demo_v2";

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove("active"));
  screens[name].classList.add("active");
  $("#homeBtn").style.visibility = name === "home" ? "hidden" : "visible";
}
function stopAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}
function playAudio(key, onEnded) {
  stopAudio();
  const path = AUDIO[key];
  const audio = new Audio(path);
  currentAudio = audio;
  audio.preload = "auto";
  audio.addEventListener("ended", () => {
    if (currentAudio === audio) currentAudio = null;
    if (onEnded) onEnded();
  }, { once: true });
  audio.addEventListener("error", () => {
    if (currentAudio === audio) currentAudio = null;
    const notice = $("#audioNotice");
    if (notice) notice.textContent = `Не найден файл озвучки: ${path}. Добавьте MP3 с этим точным именем в assets/audio/.`;
    const status = $("#birthdayStatus");
    if (status && screens.birthday.classList.contains("active")) status.textContent = `Не найден аудиофайл: ${path}`;
    if (onEnded) onEnded();
  }, { once: true });
  audio.play().catch(() => {
    const notice = $("#audioNotice");
    if (notice) notice.textContent = `Браузер не смог воспроизвести ${path}. Проверьте файл и нажмите кнопку ещё раз.`;
    if (onEnded) onEnded();
  });
}
function playWhenReady(key, callback) {
  lessonBusy = true;
  updateLessonButtons();
  playAudio(key, () => {
    lessonBusy = false;
    updateLessonButtons();
    if (callback) callback();
  });
}
function updateLessonButtons() {
  $("#lessonChoices").querySelectorAll("button").forEach(b => b.disabled = lessonBusy);
}
function renderLesson() {
  const data = [
    {icon:"🪥",caption:"Что мы делаем каждое утро?",choices:[["🪥","Зубная щётка","teeth"]]},
    {icon:"🪥",caption:"Каждое утро мы чистим зубы.",choices:[["➡️","Продолжить","teaPrompt"]]},
    {
      icon: "☕",
      image: "assets/images/mug.jpg",
      alt: "Кружка",
      caption: "А что ещё мы делаем каждое утро?",
      choices: [["☕", "Чашка", "breakfast"]]
    },
    {icon:"🍵🥐",caption:"Ты пьёшь чай и завтракаешь. Так начинается твоё утро.",choices:[["➡️","Продолжить","saturday"]]},

    {
      icon: "📅🌞",
      image: "assets/images/tami_toys.jpg",
      alt: "Игрушки Тами",
      caption: "Сегодня суббота. Обычно утром приходит Тами.",
      choices: [["➡️", "Вспомнить вместе", "question"]]
    },

    {icon:"💗⭐",caption:"Когда придёт Тами?",choices:[["💗","Сегодня","correct"],["⭐","Завтра","wrong"]]},
    {icon:"🎉💗",caption:"Да! Сегодня суббота.",choices:[["🏠","На главный экран","home"]]}
  ];
  const step = data[lessonStep];

  const picture = $("#lessonPicture");
  picture.innerHTML = "";

  if (step.image) {
    const img = document.createElement("img");
    img.src = step.image;
    img.alt = step.alt || "";
    img.className = "lesson-photo";
    picture.appendChild(img);
  } else {
    picture.textContent = step.icon;
  }

  $("#lessonCaption").textContent = step.caption;
  $("#progressFill").style.width = `${Math.min(100, (lessonStep + 1) / data.length * 100)}%`;
  const choices = $("#lessonChoices");
  choices.innerHTML = "";
  step.choices.forEach(([icon,label,action]) => {
    const button = document.createElement("button");
    button.className = "choice";
    button.setAttribute("aria-label", label);
    button.innerHTML = `<span class="choice-icon" aria-hidden="true">${icon}</span><span>${label}</span>`;
    button.addEventListener("click", () => lessonAction(action));
    choices.appendChild(button);
  });
}
function lessonAction(action) {
  if (lessonBusy) return;
  if (action === "home") { stopAudio(); showScreen("home"); return; }
  if (action === "teeth") {
    lessonStep = 1; renderLesson(); playWhenReady("day_teeth"); return;
  }
  if (action === "teaPrompt") {
    lessonStep = 2; renderLesson(); playWhenReady("day_tea"); return;
  }
  if (action === "breakfast") {
    lessonStep = 3; renderLesson(); playWhenReady("day_breakfast"); return;
  }
  if (action === "saturday") {
    lessonStep = 4; renderLesson();
    playWhenReady("day_saturday", () => {
      lessonStep = 5; renderLesson(); playWhenReady("day_question");
    });
    return;
  }
  if (action === "question") {
    lessonStep = 5; renderLesson(); playWhenReady("day_question"); return;
  }
  if (action === "correct") {
    lessonStep = 6; renderLesson(); playWhenReady("day_correct"); return;
  }
  if (action === "wrong") {
    playWhenReady("day_try_again", () => playWhenReady("day_question")); return;
  }
}
function startDay() {
  stopAudio();
  lessonStep = 0;
  renderLesson();
  showScreen("day");
  playWhenReady("day_morning");
}
function birthdayDateInfo() {
  const today = new Date();
  today.setHours(0,0,0,0);
  if (demoMode) {
    const start = new Date(`${DEMO_DATE}T00:00:00`);
    const elapsed = Math.max(0, Math.floor((today - start) / 86400000));
    return {count: Math.max(0, DEMO_COUNT - elapsed), elapsed, key: DEMO_STORAGE_KEY, date: today};
  }
  let next = new Date(today.getFullYear(), BIRTHDAY_MONTH, BIRTHDAY_DAY);
  if (next < today) next = new Date(today.getFullYear() + 1, BIRTHDAY_MONTH, BIRTHDAY_DAY);
  const count = Math.max(0, Math.round((next - today) / 86400000));
  return {count, elapsed: null, key: STORAGE_KEY, date: today};
}
function getBirthdayState(info) {
  let state = {};
  try { state = JSON.parse(localStorage.getItem(info.key)) || {}; } catch {}
  const todayKey = info.date.toISOString().slice(0,10);
  state.poppedToday = state.lastPopDate === todayKey;
  return state;
}
function saveBirthdayState(info, state) {
  try { localStorage.setItem(info.key, JSON.stringify(state)); } catch (e) { console.warn("Не удалось сохранить прогресс", e); }
}
function renderGarland() {
  const info = birthdayDateInfo();
  const state = getBirthdayState(info);
  const count = Math.max(0, info.count - (state.poppedToday ? 1 : 0));
  $("#sleepCount").textContent = count;
  const garland = $("#garland");
  garland.innerHTML = "";
  const total = 74;
  for (let i = 0; i < total; i++) {
    const balloon = document.createElement("button");
    balloon.className = "balloon";
    balloon.setAttribute("aria-label", i === 0 && !state.poppedToday ? "Красный шарик — лопнуть" : `Шарик ${i + 1}`);
    const activeIndex = Math.max(0, total - count);
    if (i < activeIndex) balloon.classList.add("popped");
    if (i === activeIndex && count > 0 && !state.poppedToday) balloon.classList.add("active");
    if (i !== activeIndex || state.poppedToday || count <= 0) balloon.classList.add("locked");
    balloon.addEventListener("click", () => handleBalloon(i, activeIndex, info, state));
    garland.appendChild(balloon);
  }
  $("#birthdayCaption").textContent = count > 0
    ? `До твоего дня рождения осталось поспать ${count} ${count === 1 ? "раз" : "раза"}.`
    : "Сегодня твой день рождения! Ура!";
  $("#birthdayStatus").textContent = state.poppedToday ? "Сегодня шарик уже лопнули. Продолжим завтра!" : "Найди красный шарик и нажми на него.";
}
function handleBalloon(index, activeIndex, info, state) {
  if (index !== activeIndex || state.poppedToday || info.count <= 0) {
    playAudio("birthday_wait");
    return;
  }
  const todayKey = info.date.toISOString().slice(0,10);
  if (state.lastPopDate === todayKey) {
    state.poppedToday = true; saveBirthdayState(info, state); renderGarland(); return;
  }
  state.poppedToday = true;
  state.lastPopDate = todayKey;
  saveBirthdayState(info, state);
  playAudio("balloon_pop", () => {});
  const balloon = $("#garland").children[index];
  balloon.classList.add("popped");
  balloon.classList.remove("active");
  balloon.disabled = true;
  const nextCount = Math.max(0, info.count - 1);
  $("#sleepCount").textContent = nextCount;
  $("#birthdayCaption").textContent = `До твоего дня рождения осталось поспать ${nextCount} ${nextCount === 1 ? "раз" : "раза"}.`;
  $("#birthdayStatus").textContent = "Шарик лопнул! Следующий станет красным завтра.";
  if (demoMode && info.count === 74) {
    setTimeout(() => playAudio("birthday_pop"), 350);
  } else {
    setTimeout(() => playAudio("birthday_repeat"), 350);
  }
  renderGarland();
}
function openBirthday() {
  stopAudio();
  showScreen("birthday");
  renderGarland();
  if (!birthdayIntroPlayed) {
    birthdayIntroPlayed = true;
    playAudio("birthday_welcome");
  }
}
$("#openDay").addEventListener("click", startDay);
$("#openBirthday").addEventListener("click", openBirthday);

$("#repeatLesson").addEventListener("click", () => {
  const keyByStep = ["day_morning","day_teeth","day_tea","day_breakfast","day_saturday","day_question","day_correct"];
  playAudio(keyByStep[lessonStep] || "day_morning");
});
$("#backHomeFromDay").addEventListener("click", () => { stopAudio(); showScreen("home"); });
$("#homeBtn").addEventListener("click", () => { stopAudio(); showScreen("home"); });
$("#birthdayHome").addEventListener("click", () => { stopAudio(); showScreen("home"); });
$("#repeatBirthday").addEventListener("click", () => playAudio("birthday_repeat"));
showScreen("home");

const reyaWelcome = document.getElementById("reyaWelcome");

if (reyaWelcome) {
  reyaWelcome.addEventListener("click", () => {
    playAudio("day_welcome");
  });
}
