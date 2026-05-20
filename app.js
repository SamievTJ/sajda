/**
 * ⚡ SAJDA ISLAMIC PORTAL - CORE LOGIC SCRIPT
 * Manages Tabs, Geolocation, Regional Prayer Offsets, Compass, 40 Hadiths,
 * Tasbih (with Vibration), 99 Names of Allah, and Interactive Calendar.
 */

// 1. STATE MANAGEMENT
const state = {
  currentTab: 'home',
  selectedCity: 'Dushanbe',
  selectedGender: 'male', // 'male' or 'female'
  selectedPrayerGuide: 'fajr',
  userCoords: null,
  qiblaAngle: 266.3, // Default angle for Dushanbe relative to North
  tasbihCount: 0,
  tasbihTotal: 0,
  tasbihGoal: 33,
  calendarMonth: new Date().getMonth(), // 0-11
  calendarYear: new Date().getFullYear(),
  selectedCalendarDay: new Date().getDate()
};

// 2. REGIONAL OFFSETS DATA (in minutes)
const cityOffsets = {
  Dushanbe: 0,
  // Before Dushanbe (-)
  Murghob: -20,
  Khorugh: -11,
  Isfara: -7,
  Rasht: -6,
  Konibodom: -6,
  Asht: -6,
  ShShohin: -5,
  Muminobod: -5,
  Kulob: -4,
  Hamadoni: -3,
  Khujand: -3,
  Istaravshan: -1,
  // After Dushanbe (+)
  Ayni: 1,
  Shahritus: 3,
  Tursunzoda: 3,
  Bokhtar: 4,
  NKhusrav: 4,
  Penjakent: 5
};

// Helper function to add minutes to "HH:MM"
function addMinutes(timeStr, mins) {
  const [hrs, mns] = timeStr.split(':').map(Number);
  let totalMns = hrs * 60 + mns + mins;
  totalMns = (totalMns + 14400) % 1440; // Prevent negative/overflow
  const newHrs = Math.floor(totalMns / 60).toString().padStart(2, '0');
  const newMns = (totalMns % 60).toString().padStart(2, '0');
  return `${newHrs}:${newMns}`;
}

// Helper function to subtract minutes
function subtractMinutes(timeStr, mins) {
  return addMinutes(timeStr, -mins);
}

// Applies offset to a single prayer time string
function applyOffsetToTimeStr(timeStr, offset) {
  if (offset === 0) return timeStr;
  return addMinutes(timeStr, offset);
}

// Get final regional times for a specific date
const getRegionalTimes = (month, day, city) => {
  // Ensure we have data for the month/day (fallback to a safe day if out of bounds)
  const safeMonth = Math.max(1, Math.min(12, month));
  let safeDay = Math.max(1, Math.min(31, day));
  
  // Leap year safety check: if February 29th, fallback to February 28th
  if (safeMonth === 2 && safeDay === 29 && (!prayers2026[2] || !prayers2026[2][29])) {
    safeDay = 28;
  }
  
  const base = (prayers2026[safeMonth] && prayers2026[safeMonth][safeDay]) 
               ? prayers2026[safeMonth][safeDay] 
               : (prayers2026[5] && prayers2026[5][19] ? prayers2026[5][19] : { bomdod: '05:00', oftob: '06:30', peshin: '12:30', asr: '16:00', shom: '19:30', khuftan: '21:00' });
               
  const offset = cityOffsets[city] || 0;
  
  return {
    bomdod: applyOffsetToTimeStr(base.bomdod, offset),
    oftob: applyOffsetToTimeStr(base.oftob, offset),
    peshin: applyOffsetToTimeStr(base.peshin, offset),
    asr: applyOffsetToTimeStr(base.asr, offset),
    shom: applyOffsetToTimeStr(base.shom, offset),
    khuftan: applyOffsetToTimeStr(base.khuftan, offset)
  };
};

// 4. INITIALIZE APP
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initTheme();
  initHome();
  initHeroStars();
  initPrayersGuide();
  initQibla();
  initHadiths();
  initDuas();
  initNamesOfAllah();
  initTasbih();
  initCalendar();
  initVerseOfDay();
  initGoToCalendarBtn();
  initScrollReveal();
  
  // Geolocate user's city
  geolocateUserCity();
});

// 5. NAVIGATION / TABS
function initNavigation() {
  const links = document.querySelectorAll('.nav-link');
  const panels = document.querySelectorAll('.tab-panel');
  
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = link.getAttribute('data-tab');
      
      // Update links
      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      
      // Update panels
      panels.forEach(p => p.classList.remove('active'));
      document.getElementById(`${tab}-tab`).classList.add('active');
      
      state.currentTab = tab;
      
      // Additional triggers when entering a tab
      if (tab === 'qibla') {
        calculateQiblaNoGPS();
      }
    });
  });
  
  // Footer nav links delegate to header nav links
  const footerLinks = document.querySelectorAll('.footer-nav-link');
  footerLinks.forEach(fLink => {
    fLink.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = fLink.getAttribute('data-tab');
      const headerLink = document.querySelector(`.nav-links .nav-link[data-tab="${tab}"]`);
      if (headerLink) headerLink.click();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

// 6. THEME TOGGLE
function initTheme() {
  const toggle = document.getElementById('theme-toggle');
  
  toggle.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark-theme');
    toggle.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
  
  // Load saved theme
  const saved = localStorage.getItem('theme');
  if (saved === 'light') {
    document.body.classList.remove('dark-theme');
    toggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
  }
}

// 7. GEOLOCATION FOR CITIES
function geolocateUserCity() {
  const status = document.getElementById('geo-status');
  
  fetch('https://ipapi.co/json/')
    .then(res => res.json())
    .then(data => {
      if (data && data.city) {
        const cityMap = {
          'Dushanbe': 'Dushanbe',
          'Khujand': 'Khujand',
          'Bokhtar': 'Bokhtar',
          'Kurganteppa': 'Bokhtar',
          'Kulob': 'Kulob',
          'Khorugh': 'Khorugh',
          'Isfara': 'Isfara',
          'Istaravshan': 'Istaravshan',
          'Konibodom': 'Konibodom',
          'Tursunzoda': 'Tursunzoda'
        };
        
        const targetCity = cityMap[data.city] || 'Dushanbe';
        state.selectedCity = targetCity;
        document.getElementById('city-selector').value = targetCity;
        
        status.innerHTML = `<i class="fa-solid fa-location-arrow"></i> ${t('geo_detected')} ${data.city}`;
        status.style.background = 'rgba(16, 185, 129, 0.2)';
        status.style.color = '#10b981';
        
        updateHomePrayerTimes();
      }
    })
    .catch(() => {
      status.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${t('geo_manual')}`;
      status.style.background = 'rgba(239, 68, 68, 0.15)';
      status.style.color = '#ef4444';
    });
}

// 8. HOME PAGE LOGIC
function initHome() {
  const selector = document.getElementById('city-selector');
  selector.addEventListener('change', (e) => {
    state.selectedCity = e.target.value;
    updateHomePrayerTimes();
  });
  
  updateHomePrayerTimes();
  
  // Run countdown timer every second
  setInterval(updateCountdown, 1000);
}

function updateHomePrayerTimes() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const times = getRegionalTimes(month, day, state.selectedCity);
  
  document.getElementById('time-bomdod').innerText = times.bomdod;
  document.getElementById('time-oftob').innerText = times.oftob;
  document.getElementById('time-peshin').innerText = times.peshin;
  document.getElementById('time-asr').innerText = times.asr;
  document.getElementById('time-shom').innerText = times.shom;
  document.getElementById('time-khuftan').innerText = times.khuftan;
}

function updateCountdown() {
  const now = new Date();
  const hrs = now.getHours();
  const mns = now.getMinutes();
  const scs = now.getSeconds();
  
  // Update Live Clock
  const clockEl = document.getElementById('live-clock');
  if (clockEl) {
    const hh = hrs.toString().padStart(2, '0');
    const mm = mns.toString().padStart(2, '0');
    const ss = scs.toString().padStart(2, '0');
    clockEl.innerText = `${hh}:${mm}:${ss}`;
  }
  
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const times = getRegionalTimes(month, day, state.selectedCity);
  
  // Helper to parse start time
  const getHrsMns = (timeStr) => {
    return timeStr.split(':').map(Number);
  };
  
  // Parse prayer start times
  const bomdodTime = getHrsMns(times.bomdod);
  const oftobTime = getHrsMns(times.oftob);
  const peshinTime = getHrsMns(times.peshin);
  const asrTime = getHrsMns(times.asr);
  const shomTime = getHrsMns(times.shom);
  const khuftanTime = getHrsMns(times.khuftan);
  
  const prayers = [
    { name: t('prayer_bomdod'),  hr: bomdodTime[0],  mn: bomdodTime[1],  cardId: "card-bomdod"  },
    { name: t('prayer_oftob'),   hr: oftobTime[0],   mn: oftobTime[1],   cardId: "card-oftob"   },
    { name: t('prayer_peshin'),  hr: peshinTime[0],  mn: peshinTime[1],  cardId: "card-peshin"  },
    { name: t('prayer_asr'),     hr: asrTime[0],     mn: asrTime[1],     cardId: "card-asr"     },
    { name: t('prayer_shom'),    hr: shomTime[0],    mn: shomTime[1],    cardId: "card-shom"    },
    { name: t('prayer_khuftan'),hr: khuftanTime[0], mn: khuftanTime[1], cardId: "card-khuftan" }
  ];
  
  // Find current and next prayer
  let currentPrayerIdx = 5;
  let nextPrayerIdx = 0;
  
  const totalSecsNow = hrs * 3600 + mns * 60 + scs;
  
  for (let i = 0; i < prayers.length; i++) {
    const pSecs = prayers[i].hr * 3600 + prayers[i].mn * 60;
    if (totalSecsNow >= pSecs) {
      currentPrayerIdx = i;
      nextPrayerIdx = (i + 1) % 6;
    }
  }
  
  // Highlight current prayer card
  prayers.forEach((p, idx) => {
    const el = document.getElementById(p.cardId);
    if (idx === currentPrayerIdx) {
      el.classList.add('current');
    } else {
      el.classList.remove('current');
    }
  });
  
  // Calculate countdown to next prayer
  const nextP = prayers[nextPrayerIdx];
  let targetSecs = nextP.hr * 3600 + nextP.mn * 60;
  
  if (nextPrayerIdx === 0 && totalSecsNow > targetSecs) {
    // Next prayer is tomorrow's Fajr
    targetSecs += 24 * 3600;
  }
  
  let diffSecs = targetSecs - totalSecsNow;
  
  const diffHrs = Math.floor(diffSecs / 3600).toString().padStart(2, '0');
  const diffMns = Math.floor((diffSecs % 3600) / 60).toString().padStart(2, '0');
  const diffScs = (diffSecs % 60).toString().padStart(2, '0');
  
  document.getElementById('next-prayer-name').innerText = `${t('next_prayer')} ${nextP.name}`;
  document.getElementById('countdown-timer').innerText = `${diffHrs}:${diffMns}:${diffScs}`;
  
  // Optional silent browser notification trigger exactly at prayer time
  if (diffSecs === 0) {
    triggerSilentNotification(nextP.name);
  }
}

function triggerSilentNotification(prayerName) {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission === "granted") {
    const notifTitle = currentLang === 'ru' ? 'Время Намаза!' : 'Вақти Намоз Омад!';
    const notifBody  = currentLang === 'ru' ? `Наступило время намаза ${prayerName}.` : `Вақти намози ${prayerName} фаро расид.`;
    new Notification(notifTitle, {
      body: notifBody,
      silent: true,
      icon: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/svgs/solid/mosque.svg"
    });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission();
  }
}

// 9. PRAYERS GUIDE LOGIC (Hanafi, male & female, loaded from prayer_guide_data.js)

// ─────────────────────────────────────────────────────────────────
// ✨ HERO STARS ANIMATION
// ─────────────────────────────────────────────────────────────────
function initHeroStars() {
  const container = document.getElementById('hero-stars-container');
  if (!container) return;

  // Generate twinkling stars
  for (let i = 0; i < 55; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    const size = Math.random() * 3 + 1;
    star.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      top: ${Math.random() * 100}%;
      left: ${Math.random() * 100}%;
      --dur: ${(Math.random() * 3 + 2).toFixed(1)}s;
      --delay: ${(Math.random() * 4).toFixed(1)}s;
      --max-op: ${(Math.random() * 0.5 + 0.3).toFixed(2)};
    `;
    container.appendChild(star);
  }

  // Generate shooting stars
  for (let j = 0; j < 3; j++) {
    const shoot = document.createElement('div');
    shoot.className = 'shooting-star';
    const width = Math.random() * 80 + 60;
    shoot.style.cssText = `
      width: ${width}px;
      top: ${Math.random() * 60}%;
      left: ${Math.random() * 50}%;
      --sdur: ${(Math.random() * 5 + 5).toFixed(1)}s;
      --sdelay: ${(Math.random() * 6).toFixed(1)}s;
    `;
    container.appendChild(shoot);
  }
}


// ─────────────────────────────────────────────────────────────────
// 📖 VERSE OF THE DAY
// ─────────────────────────────────────────────────────────────────
const dailyVerses = [
  {
    surah_tj: "Ал-Бақара — 2:286",
    surah_ru: "Аль-Бакара — 2:286",
    arabic: "لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا",
    translit: "Lā yukallifullaahu nafsan illā wus'ahā",
    translation_tj: "Аллоҳ ҳеч касро зиёда аз тавонаш вазифадор намекунад.",
    translation_ru: "Аллах не возлагает на человека сверх его возможностей."
  },
  {
    surah_tj: "Ал-Имрон — 3:173",
    surah_ru: "Аль-Имран — 3:173",
    arabic: "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ",
    translit: "Hasbunallaahu wa ni'mal-wakeel",
    translation_tj: "Аллоҳ моро кифоя аст ва Ӯ беҳтарин корсоз аст.",
    translation_ru: "Нам достаточно Аллаха, и Он — лучший Покровитель."
  },
  {
    surah_tj: "Аз-Зумар — 39:53",
    surah_ru: "Аз-Зумар — 39:53",
    arabic: "إِنَّ اللَّهَ يَغْفِرُ الذُّنُوبَ جَمِيعًا",
    translit: "Innallaaha yaghfirudh-dhunooba jamee'aa",
    translation_tj: "Бешак Аллоҳ ҳамаи гуноҳонро мебахшад.",
    translation_ru: "Поистине, Аллах прощает все грехи."
  },
  {
    surah_tj: "Ал-Фотиҳа — 1:5",
    surah_ru: "Аль-Фатиха — 1:5",
    arabic: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
    translit: "Iyyāka na'budu wa iyyāka nasta'een",
    translation_tj: "Танҳо Туро мепарастем ва танҳо аз Ту ёрӣ мехоҳем.",
    translation_ru: "Тебе одному мы поклоняемся и Тебя одного просим о помощи."
  },
  {
    surah_tj: "Ал-Бақара — 2:152",
    surah_ru: "Аль-Бакара — 2:152",
    arabic: "فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ",
    translit: "Fathkuronee athkurkum washkuroo lee wa laa takfuroon",
    translation_tj: "Маро ёд кунед, Ман ҳам шуморо ёд мекунам. Ва шукргузорам бошед, нокуфр набошед.",
    translation_ru: "Помните Меня — Я буду помнить вас. Благодарите Меня и не будьте неверными."
  },
  {
    surah_tj: "Ат-Талоқ — 65:3",
    surah_ru: "Ат-Таляк — 65:3",
    arabic: "وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ",
    translit: "Wa man yatawakkal 'alallāhi fahuwa hasbuh",
    translation_tj: "Ҳар ки бар Аллоҳ таваккул кунад, Ӯ барояш кифоя аст.",
    translation_ru: "Кто уповает на Аллаха, Тот будет ему достаточен."
  },
  {
    surah_tj: "Ал-Анъом — 6:162",
    surah_ru: "Аль-Ан'ам — 6:162",
    arabic: "قُلْ إِنَّ صَلَاتِي وَنُسُكِي وَمَحْيَايَ وَمَمَاتِي لِلَّهِ رَبِّ الْعَالَمِينَ",
    translit: "Qul inna salaatee wa nusukee wa mahyaaya wa mamaatee lillaahi rabbil-'aalameen",
    translation_tj: "Бигӯ: «Намоз, парастиш, зиндагӣ ва маргам ҳама барои Аллоҳ — Парвардигори ҷаҳониён аст.»",
    translation_ru: "Скажи: «Поистине, моя молитва, жертвоприношение, жизнь и смерть — всё для Аллаха, Господа миров.»"
  },
  {
    surah_tj: "Аш-Шарҳ — 94:5-6",
    surah_ru: "Аш-Шарх — 94:5-6",
    arabic: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا • إِنَّ مَعَ الْعُسْرِ يُسْرًا",
    translit: "Fa inna ma'al-'usri yusraa • Inna ma'al-'usri yusraa",
    translation_tj: "Бешак, пас аз душворӣ осонӣ мояд. • Бешак, пас аз душворӣ осонӣ мояд.",
    translation_ru: "Поистине, вместе с трудностью — облегчение. • Поистине, вместе с трудностью — облегчение."
  },
  {
    surah_tj: "Ал-Балад — 90:10",
    surah_ru: "Аль-Балад — 90:10",
    arabic: "وَهَدَيْنَاهُ النَّجْدَيْنِ",
    translit: "Wa hadaynaahun-najdayn",
    translation_tj: "Ва Мо ба ӯ ду роҳро нишон додем (роҳи некӣ ва бадӣ).",
    translation_ru: "И Мы указали ему оба пути (добра и зла)."
  },
  {
    surah_tj: "Ал-Ҳашр — 59:18",
    surah_ru: "Аль-Хашр — 59:18",
    arabic: "يَا أَيُّهَا الَّذِينَ آمَنُوا اتَّقُوا اللَّهَ وَلْتَنظُرْ نَفْسٌ مَّا قَدَّمَتْ لِغَدٍ",
    translit: "Yaa ayyuhal-ladheena aamanuttaqullaaha waltanthur nafsun maa qaddamat lighad",
    translation_tj: "Эй мӯъминон! Аз Аллоҳ битарсед ва ҳар кас нигаред, ки барои фардо (охират) чӣ фиристодааст.",
    translation_ru: "О верующие! Бойтесь Аллаха и пусть каждый посмотрит, что он приготовил для завтрашнего дня (ахирата)."
  }
];

function initVerseOfDay() {
  // Rotate verse by day of year
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now - startOfYear;
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const verse = dailyVerses[dayOfYear % dailyVerses.length];

  const lang = (typeof currentLang !== 'undefined') ? currentLang : 'tj';

  const surahLabel = document.getElementById('verse-surah-label');
  const arabicEl   = document.getElementById('verse-arabic');
  const translitEl = document.getElementById('verse-translit');
  const transEl    = document.getElementById('verse-translation');
  const sourceEl   = document.getElementById('verse-source');

  if (!surahLabel) return;

  surahLabel.textContent  = lang === 'ru' ? verse.surah_ru : verse.surah_tj;
  arabicEl.textContent    = verse.arabic;
  translitEl.textContent  = verse.translit;
  transEl.textContent     = lang === 'ru' ? verse.translation_ru : verse.translation_tj;
  sourceEl.textContent    = lang === 'ru' ? verse.surah_ru : verse.surah_tj;
}

// ─────────────────────────────────────────────────────────────────
// 🔗 GO TO CALENDAR BUTTON
// ─────────────────────────────────────────────────────────────────
function initGoToCalendarBtn() {
  const btn = document.getElementById('btn-go-to-calendar');
  if (!btn) return;
  btn.addEventListener('click', () => {
    // Simulate clicking the calendar nav link
    const calendarLink = document.querySelector('.nav-link[data-tab="calendar"]');
    if (calendarLink) calendarLink.click();
  });
}


function initPrayersGuide() {
  const maleBtn = document.getElementById('gender-male');
  const femaleBtn = document.getElementById('gender-female');
  
  maleBtn.addEventListener('click', () => {
    maleBtn.classList.add('active');
    femaleBtn.classList.remove('active');
    state.selectedGender = 'male';
    renderPrayerGuide();
  });
  
  femaleBtn.addEventListener('click', () => {
    femaleBtn.classList.add('active');
    maleBtn.classList.remove('active');
    state.selectedGender = 'female';
    renderPrayerGuide();
  });
  
  const sidebarBtns = document.querySelectorAll('.guide-btn');
  sidebarBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      sidebarBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedPrayerGuide = btn.getAttribute('data-prayer');
      renderPrayerGuide();
    });
  });
  
  renderPrayerGuide();
}

function renderPrayerGuide() {
  const key = state.selectedPrayerGuide;
  const data = getPrayersGuideData();
  const guide = data[key] || data['fajr'];
  
  const container = document.getElementById('guide-content-display');
  
  // Smoothly scroll to the top of the guide body when prayer changes
  const guideTab = document.getElementById('prayers-tab');
  if (guideTab) {
    window.scrollTo({
      top: guideTab.offsetTop - 90,
      behavior: 'smooth'
    });
  }
  
  let stepsHtml = '';
  
  guide.steps.forEach(step => {
    const isGenderAdjusted = state.selectedGender === 'female' && (step.name.includes("Ният") || step.name.includes("Намерение"));
    const femaleDesc = currentLang === 'ru'
      ? "Женщины поднимают руки до уровня плеч и в сердце делают намерение: «Намереваюсь совершить...»"
      : "Занон дастҳоро то баробари китфҳо бардошта, дар дил ният мекунанд: «Ният кардам бигузорам...»";
    const desc = isGenderAdjusted ? femaleDesc : step.desc;
    const lblTranslit  = currentLang === 'ru' ? 'Произношение:' : 'Талаффуз:';
    const lblMeaning   = currentLang === 'ru' ? 'Значение:'      : 'Маъно:';

    stepsHtml += `
      <div class="step-card">
        <div class="step-visual">
          ${step.visual}
        </div>
        <div class="step-details">
          <span class="step-num">${step.num}</span>
          <h3 class="step-name">${step.name}</h3>
          <p class="step-desc">${desc}</p>
          ${step.arabic ? `
            <div class="dua-box">
              <div class="arabic-text">${step.arabic}</div>
              <div class="translit-text"><strong>${lblTranslit}</strong> ${step.translit}</div>
              <div class="translation-text"><strong>${lblMeaning}</strong> ${step.translation}</div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  });
  
  container.innerHTML = `
    <h2 class="guide-title">${guide.name}</h2>
    <div class="guide-meta">${guide.rakats} • ${t('guide_meta_suffix')}</div>
    <div class="steps-list">
      ${stepsHtml}
    </div>
  `;
}

// 10. QIBLA COMPASS LOGIC
function initQibla() {
  const btn = document.getElementById('btn-get-qibla');
  btn.addEventListener('click', () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => {
        state.userCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        calculateQiblaAndDistance();
        
        // Listen to compass orientation if mobile device
        if (window.DeviceOrientationEvent) {
          window.addEventListener('deviceorientationabsolute', handleOrientation, true);
          window.addEventListener('deviceorientation', handleOrientation, true);
        }
      }, () => {
        alert(currentLang === 'ru' ? 'GPS не разрешён. Направление показано по Душанбе.' : 'Иҷозати GPS рад шуд. Самт аз рӯи Душанбе нишон дода мешавад.');
        calculateQiblaNoGPS();
      });
    }
  });
}

function handleOrientation(e) {
  const heading = e.alpha || e.webkitCompassHeading || 0;
  const compassPlate = document.getElementById('compass-plate');
  
  // Rotate compass plate relative to heading
  compassPlate.style.transform = `rotate(${-heading}deg)`;
  
  // Needle always points to Qibla relative to compass plate
  const needle = document.getElementById('kaaba-needle');
  needle.style.transform = `rotate(${state.qiblaAngle}deg)`;
}

function calculateQiblaAndDistance() {
  if (!state.userCoords) return;
  
  // Kaaba coordinates
  const kaabaLat = 21.4225;
  const kaabaLng = 39.8262;
  
  const userLat = state.userCoords.lat;
  const userLng = state.userCoords.lng;
  
  // Calculate Qibla Bearing
  const y = Math.sin(toRadians(kaabaLng - userLng)) * Math.cos(toRadians(kaabaLat));
  const x = Math.cos(toRadians(userLat)) * Math.sin(toRadians(kaabaLat)) -
            Math.sin(toRadians(userLat)) * Math.cos(toRadians(kaabaLat)) * Math.cos(toRadians(kaabaLng - userLng));
  
  let bearing = toDegrees(Math.atan2(y, x));
  bearing = (bearing + 360) % 360;
  
  state.qiblaAngle = bearing;
  
  document.getElementById('qibla-angle').innerText = `${bearing.toFixed(1)}°`;
  
  // Calculate Distance (Haversine Formula)
  const R = 6371; // Earth radius in km
  const dLat = toRadians(kaabaLat - userLat);
  const dLng = toRadians(kaabaLng - userLng);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(userLat)) * Math.cos(toRadians(kaabaLat)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const dist = R * c;
  
  document.getElementById('user-dist').innerText = `${Math.round(dist)} км`;
  
  // Position Needle
  const needle = document.getElementById('kaaba-needle');
  needle.style.transform = `rotate(${bearing}deg)`;
}

function calculateQiblaNoGPS() {
  // Fallback for Dushanbe coords
  state.userCoords = { lat: 38.56, lng: 68.79 };
  calculateQiblaAndDistance();
}

function toRadians(deg) { return deg * (Math.PI / 180); }
function toDegrees(rad) { return rad * (180 / Math.PI); }

// 11. HADITHS LOGIC (SPLIT PANE / RESPONSIVE)
function initHadiths() {
  const listContainer = document.getElementById('hadiths-list-container');
  
  let listHtml = '';
  hadithsData.forEach(h => {
    const title = (typeof currentLang !== 'undefined' && currentLang === 'ru') ? h.title_ru : h.title_tj;
    listHtml += `
      <div class="hadith-list-card" data-id="${h.id}">
        <div class="hadith-num-badge">${h.id}</div>
        <div class="hadith-list-title">${title.split(': ')[1] || title}</div>
      </div>
    `;
  });
  
  listContainer.innerHTML = listHtml;
  
  const cards = document.querySelectorAll('.hadith-list-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      cards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const id = Number(card.getAttribute('data-id'));
      renderHadithDetail(id);
    });
  });
  
  // Open first hadith by default on desktop
  if (window.innerWidth > 1024 && hadithsData.length > 0) {
    cards[0].classList.add('active');
    renderHadithDetail(1);
  }
}

function renderHadithDetail(id) {
  const h = hadithsData.find(item => item.id === id);
  if (!h) return;
  
  const detailContainer = document.getElementById('hadith-detail-container');
  
  const lang = (typeof currentLang !== 'undefined') ? currentLang : 'tj';
  const title = lang === 'ru' ? h.title_ru : h.title_tj;
  const translation = lang === 'ru' ? h.translation_ru : h.translation_tj;
  const meaning = lang === 'ru' ? h.meaning_ru : h.meaning_tj;
  
  const translitLabel = t('label_translit');
  const transLabel    = t('label_trans_tj');
  const meaningLabel  = t('label_meaning_hd');
  
  detailContainer.innerHTML = `
    <h2 class="hadith-header-title">${title}</h2>
    
    <div class="arabic-block">${h.arabic}</div>
    
    <div class="translation-block">
      <div class="translit-section">
        <h4 class="block-title"><i class="fa-solid fa-language"></i> ${translitLabel}</h4>
        <p class="block-body translit-body">${h.transliteration}</p>
      </div>
      
      <div class="translation-section">
        <h4 class="block-title"><i class="fa-solid fa-align-left"></i> ${transLabel}</h4>
        <p class="block-body">${translation}</p>
      </div>
      
      <div class="meaning-section">
        <h4 class="block-title"><i class="fa-solid fa-circle-info"></i> ${meaningLabel}</h4>
        <p class="block-body">${meaning}</p>
      </div>
    </div>
  `;
}

// 12. DUAS LOGIC
function initDuas() {
  renderDuas('all');
  
  // Search
  const searchInput = document.getElementById('duas-search');
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    filterDuas(query);
  });
  
  // Category buttons
  const catBtns = document.querySelectorAll('.cat-btn');
  catBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      catBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.getAttribute('data-category');
      renderDuas(cat);
    });
  });
}

function renderDuas(category) {
  const container = document.getElementById('duas-container');
  let filtered = duasData;
  
  if (category !== 'all') {
    // Filter by category_tj matching, plus group misc categories under "Дигарҳо"
    const miscCats = ["Истиғфор", "Мусибат", "Бозор", "Боронӣ", "Раъд", "Никоҳ", "Қабристон", "Дигарҳо", "Субҳ", "Шом", "Беморӣ", "Либос"];
    if (category === "Дигарҳо") {
      filtered = duasData.filter(d => miscCats.includes(d.category_tj));
    } else {
      filtered = duasData.filter(d => d.category_tj === category);
    }
  }
  
  const lang = (typeof currentLang !== 'undefined') ? currentLang : 'tj';
  
  let cardsHtml = '';
  filtered.forEach(d => {
    const cat = lang === 'ru' ? d.category_ru : d.category_tj;
    const title = lang === 'ru' ? d.title_ru : d.title_tj;
    const translation = lang === 'ru' ? d.translation_ru : d.translation_tj;
    
    cardsHtml += `
      <div class="dua-card card-glass">
        <div class="dua-card-header">
          <span class="dua-badge" data-cat="${d.category_tj}">${cat}</span>
          <button class="btn-icon favorited"><i class="fa-regular fa-star"></i></button>
        </div>
        <h3 class="dua-title">${title}</h3>
        <div class="dua-arabic arabic-text">${d.arabic}</div>
        <p class="dua-translit">${d.transliteration}</p>
        <p class="dua-translation">${translation}</p>
      </div>
    `;
  });
  
  container.innerHTML = cardsHtml || `<div class="empty-state">${t('duas_empty')}</div>`;
}

function filterDuas(query) {
  const cards = document.querySelectorAll('.dua-card');
  cards.forEach(card => {
    const title = card.querySelector('.dua-title').innerText.toLowerCase();
    const trans = card.querySelector('.dua-translation').innerText.toLowerCase();
    
    if (title.includes(query) || trans.includes(query)) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}

// 13. 99 NAMES OF ALLAH LOGIC
const namesOfAllah = [
  { ar: "الرَّحْمَنُ", tr: "Ар-Раҳмон", mn_tj: "Бахшоянда", mn_ru: "Милостивый" },
  { ar: "الرَّحِيمُ", tr: "Ар-Раҳим", mn_tj: "Меҳрубон", mn_ru: "Милосердный" },
  { ar: "الْمَلِكُ", tr: "Ал-Малик", mn_tj: "Подшоҳ", mn_ru: "Царь" },
  { ar: "الْقُدُّوسُ", tr: "Ал-Қуддус", mn_tj: "Пок", mn_ru: "Святой" },
  { ar: "السَّلاَمُ", tr: "Ас-Салом", mn_tj: "Амонӣ диҳанда", mn_ru: "Миротворец" },
  { ar: "الْمُؤْمِنُ", tr: "Ал-Мӯъмин", mn_tj: "Имонбахш", mn_ru: "Оберегающий" },
  { ar: "الْمُهَيْمِنُ", tr: "Ал-Муҳаймин", mn_tj: "Ҳоким ва Нигаҳбон", mn_ru: "Хранитель" },
  { ar: "الْعَزِيزُ", tr: "Ал-Азиз", mn_tj: "Ғолиб ва Боиқтидор", mn_ru: "Могущественный" },
  { ar: "الْجَبَّارُ", tr: "Ал-Ҷаббор", mn_tj: "Тавоно", mn_ru: "Подчиняющий" },
  { ar: "الْمُتَكَبِّرُ", tr: "Ал-Мутакаббир", mn_tj: "Бузургвор", mn_ru: "Превосходящий" },
  { ar: "الْخَالِقُ", tr: "Ал-Холиқ", mn_tj: "Офаридгор", mn_ru: "Творец" },
  { ar: "الْبَارِئُ", tr: "Ал-Бориъ", mn_tj: "Пайдокунанда", mn_ru: "Создатель" },
  { ar: "الْمُصَوِّرُ", tr: "Ал-Мусаввир", mn_tj: "Суратбахш", mn_ru: "Формирующий" },
  { ar: "الْغَفَّارُ", tr: "Ал-Ғаффор", mn_tj: "Ниҳоят бахшанда", mn_ru: "Прощающий" },
  { ar: "الْقَهَّارُ", tr: "Ал-Қаҳҳор", mn_tj: "Ғолиби мутлақ", mn_ru: "Господствующий" },
  { ar: "الْوَهَّابُ", tr: "Ал-Ваҳҳоб", mn_tj: "Бисёр бахшанда", mn_ru: "Дарующий" },
  { ar: "الرَّزَّاقُ", tr: "Ар-Раззоқ", mn_tj: "Ризқдиҳанда", mn_ru: "Наделяющий уделом" },
  { ar: "الْفَتَّاحُ", tr: "Ал-Фаттоҳ", mn_tj: "Кушоянда", mn_ru: "Открывающий" },
  { ar: "الْعَلِيمُ", tr: "Ал-Алим", mn_tj: "Доно", mn_ru: "Знающий" },
  { ar: "الْقَابِضُ", tr: "Ал-Қобиз", mn_tj: "Тангкунанда", mn_ru: "Удерживающий" },
  { ar: "الْبَاسِطُ", tr: "Ал-Босит", mn_tj: "Кушодакунанда", mn_ru: "Расстилающий" },
  { ar: "الْخَافِضُ", tr: "Ал-Хофиз", mn_tj: "Пасткунанда", mn_ru: "Принижающий" },
  { ar: "الرَّافِعُ", tr: "Ар-Рофеъ", mn_tj: "Баландкунанда", mn_ru: "Возвышающий" },
  { ar: "الْمُعِزُّ", tr: "Ал-Муъизз", mn_tj: "Иззатбахш", mn_ru: "Дающий величие" },
  { ar: "الْمُذِلُّ", tr: "Ал-Музил", mn_tj: "Хоркунанда", mn_ru: "Принижающий" },
  { ar: "السَّمِيعُ", tr: "Ас-Самиъ", mn_tj: "Шунаво", mn_ru: "Слышащий" },
  { ar: "الْبَصِيرُ", tr: "Ал-Басир", mn_tj: "Бино", mn_ru: "Видящий" },
  { ar: "الْحَكَمُ", tr: "Ал-Ҳакам", mn_tj: "Довар", mn_ru: "Судья" },
  { ar: "الْعَدْلُ", tr: "Ал-Адл", mn_tj: "Одил", mn_ru: "Справедливый" },
  { ar: "اللَّطِيفُ", tr: "Ал-Латиф", mn_tj: "Борикбин ва Меҳрубон", mn_ru: "Проницательный" },
  { ar: "الْخَبِيرُ", tr: "Ал-Хабир", mn_tj: "Огоҳ", mn_ru: "Осведомленный" },
  { ar: "الْحَلِيمُ", tr: "Ал-Ҳалим", mn_tj: "Бурдбор", mn_ru: "Снисходительный" },
  { ar: "الْعَظِيمُ", tr: "Ал-Азим", mn_tj: "Бузург", mn_ru: "Величайший" },
  { ar: "الْغَفُورُ", tr: "Ал-Ғафур", mn_tj: "Омурзанда", mn_ru: "Прощающий" },
  { ar: "الشَّكُورُ", tr: "Аш-Шакур", mn_tj: "Қадрдон", mn_ru: "Благодарный" },
  { ar: "الْعَلِيُّ", tr: "Ал-Али", mn_tj: "Баландмартаба", mn_ru: "Высочайший" },
  { ar: "الْكَبِيرُ", tr: "Ал-Кабир", mn_tj: "Бузургвор", mn_ru: "Великий" },
  { ar: "الْحَفِيظُ", tr: "Ал-Ҳафиз", mn_tj: "Нигаҳбон", mn_ru: "Оберегающий" },
  { ar: "الْمُقِيتُ", tr: "Ал-Муқит", mn_tj: "Ризқдиҳанда ва Тавоно", mn_ru: "Дарующий пропитание" },
  { ar: "الْحَسِيبُ", tr: "Ал-Ҳасиб", mn_tj: "Ҳисобгир", mn_ru: "Требующий отчета" },
  { ar: "الْجَلِيلُ", tr: "Ал-Ҷалил", mn_tj: "Бошукӯҳ", mn_ru: "Величественный" },
  { ar: "الْكَرِيمُ", tr: "Ал-Карим", mn_tj: "Бахшанда ва Карим", mn_ru: "Щедрый" },
  { ar: "الرَّقِيبُ", tr: "Ар-Рақиб", mn_tj: "Муроқиб", mn_ru: "Наблюдающий" },
  { ar: "الْمُجِيبُ", tr: "Ал-Муҷиб", mn_tj: "Иҷобаткунанда", mn_ru: "Отвечающий" },
  { ar: "الْوَاسِعُ", tr: "Ал-Восиъ", mn_tj: "Фаррох ва Кушода", mn_ru: "Всеобъемлющий" },
  { ar: "الْحَكِيمُ", tr: "Ал-Ҳаким", mn_tj: "Боҳикмат", mn_ru: "Мудрый" },
  { ar: "الْوَدُودُ", tr: "Ал-Вадуд", mn_tj: "Дӯстдор", mn_ru: "Любящий" },
  { ar: "الْمَجِيدُ", tr: "Ал-Маҷид", mn_tj: "Бомаҷд ва Шарафманд", mn_ru: "Славный" },
  { ar: "الْبَاعِثُ", tr: "Ал-Боис", mn_tj: "Барангезанда", mn_ru: "Воскрешающий" },
  { ar: "الشَّهِيدُ", tr: "Аш-Шаҳид", mn_tj: "Гувоҳ", mn_ru: "Свидетель" },
  { ar: "الْحَقُّ", tr: "Ал-Ҳақ", mn_tj: "Рост ва Барҳақ", mn_ru: "Истинный" },
  { ar: "الْوَكِيلُ", tr: "Ал-Вакил", mn_tj: "Корсоз", mn_ru: "Покровитель" },
  { ar: "الْقَوِيُّ", tr: "Ал-Қавӣ", mn_tj: "Нерӯманд", mn_ru: "Сильный" },
  { ar: "الْمَتِينُ", tr: "Ал-Матин", mn_tj: "Устувор", mn_ru: "Несокрушимый" },
  { ar: "الْوَلِيُّ", tr: "Ал-Вали", mn_tj: "Ёвар ва Сарпараст", mn_ru: "Покровитель" },
  { ar: "الْحَمِيدُ", tr: "Ал-Ҳамид", mn_tj: "Сутуда", mn_ru: "Достойный хвалы" },
  { ar: "الْمُحْصِي", tr: "Ал-Муҳсӣ", mn_tj: "Шуморанда", mn_ru: "Считающий" },
  { ar: "الْمُبْدِئُ", tr: "Ал-Мубдиъ", mn_tj: "Оғозкунанда", mn_ru: "Начинающий" },
  { ar: "الْمُعِيدُ", tr: "Ал-Муъид", mn_tj: "Бозгардонанда", mn_ru: "Возвращающий" },
  { ar: "الْمُحْيِي", tr: "Ал-Муҳйи", mn_tj: "Зиндакунанда", mn_ru: "Оживляющий" },
  { ar: "الْمُمِيتُ", tr: "Ал-Мумит", mn_tj: "Миронанда", mn_ru: "Умерщвляющий" },
  { ar: "الْحَيُّ", tr: "Ал-Ҳайй", mn_tj: "Зинда", mn_ru: "Живой" },
  { ar: "الْقَيُّومُ", tr: "Ал-Қайюм", mn_tj: "Поянда", mn_ru: "Самостоятельный" },
  { ar: "الْوَاجِدُ", tr: "Ал-Воҷид", mn_tj: "Ёбанда", mn_ru: "Богатый" },
  { ar: "الْمَاجِدُ", tr: "Ал-Моҷид", mn_tj: "Бузургвор", mn_ru: "Славный" },
  { ar: "الْوَاحِدُ", tr: "Ал-Воҳид", mn_tj: "Ягона", mn_ru: "Единый" },
  { ar: "الأَحَد", tr: "Ал-Аҳад", mn_tj: "Якто", mn_ru: "Единственный" },
  { ar: "الصَّمَدُ", tr: "Ас-Самад", mn_tj: "Бениёз", mn_ru: "Самодостаточный" },
  { ar: "الْقَادِرُ", tr: "Ал-Қодир", mn_tj: "Тавоно", mn_ru: "Могучий" },
  { ar: "الْمُقْتَدِرُ", tr: "Ал-Муқтадир", mn_tj: "Соҳибқудрат", mn_ru: "Всемогущий" },
  { ar: "الْمُقَدِّمُ", tr: "Ал-Муқаддим", mn_tj: "Пешбаранда", mn_ru: "Приближающий" },
  { ar: "الْمُؤَخِّرُ", tr: "Ал-Муаххир", mn_tj: "Пасандозанда", mn_ru: "Отдаляющий" },
  { ar: "الأَوَّلُ", tr: "Ал-Аввал", mn_tj: "Аввал", mn_ru: "Первый" },
  { ar: "الآخِرُ", tr: "Ал-Охир", mn_tj: "Охир", mn_ru: "Последний" },
  { ar: "الظَّاهِرُ", tr: "Аз-Зоҳир", mn_tj: "Пайдо", mn_ru: "Явный" },
  { ar: "الْبَاطِنُ", tr: "Ал-Ботин", mn_tj: "Пинҳон", mn_ru: "Скрытый" },
  { ar: "الْوَالِي", tr: "Ал-Волӣ", mn_tj: "Корсоз", mn_ru: "Правящий" },
  { ar: "الْمُتَعَالِي", tr: "Ал-Мутаъоли", mn_tj: "Баландмартаба", mn_ru: "Превознесенный" },
  { ar: "الْبَرُّ", tr: "Ал-Барр", mn_tj: "Некӯкор", mn_ru: "Благостный" },
  { ar: "التَّوَّابُ", tr: "Ат-Таввоб", mn_tj: "Пазирандаи тавба", mn_ru: "Принимающий покаяние" },
  { ar: "الْمُنْتَقِمُ", tr: "Ал-Мунтақим", mn_tj: "Интиқомгиранда", mn_ru: "Мстящий" },
  { ar: "العَفُوُّ", tr: "Ал-Афувв", mn_tj: "Афвкунанда", mn_ru: "Снисходительный" },
  { ar: "الرَّؤُوفُ", tr: "Ар-Рауф", mn_tj: "Меҳрубон", mn_ru: "Сострадательный" },
  { ar: "مَالِكُ الْمُلْكِ", tr: "Моликул-Мулк", mn_tj: "Молики мулк", mn_ru: "Властелин царства" },
  { ar: "ذُو الْجَلالِ وَالإِكْرَامِ", tr: "Зул-Ҷалоли вал-Икром", mn_tj: "Соҳиби ҷалол ва икром", mn_ru: "Обладатель величия" },
  { ar: "الْمُقْسِطُ", tr: "Ал-Муқсит", mn_tj: "Одил", mn_ru: "Справедливый" },
  { ar: "الْجَامِعُ", tr: "Ал-Ҷомиъ", mn_tj: "Ҷамъкунанда", mn_ru: "Собирающий" },
  { ar: "الْغَنِيُّ", tr: "Ал-Ғани", mn_tj: "Тавонгар", mn_ru: "Богатый" },
  { ar: "الْمُغْنِي", tr: "Ал-Муғни", mn_tj: "Бениёз кунанда", mn_ru: "Обогащающий" },
  { ar: "الْمَانِعُ", tr: "Ал-Монеъ", mn_tj: "Манъкунанда", mn_ru: "Удерживающий" },
  { ar: "الضَّارُّ", tr: "Аз-Зорр", mn_tj: "Зиёновар", mn_ru: "Способный послать бедствие" },
  { ar: "النَّافِعُ", tr: "Ан-Нофеъ", mn_tj: "Нафърасон", mn_ru: "Благотворитель" },
  { ar: "النُّورُ", tr: "Ан-Нур", mn_tj: "Нурбахш", mn_ru: "Свет" },
  { ar: "الْهَادِي", tr: "Ал-Ҳоди", mn_tj: "Ҳидояткунанда", mn_ru: "Ведущий" },
  { ar: "الْبَدِيعُ", tr: "Ал-Бадиъ", mn_tj: "Офаринандаи нав", mn_ru: "Творец-Новатор" },
  { ar: "اَلْبَاقِي", tr: "Ал-Боқи", mn_tj: "Боқӣ ва Ҳамешагӣ", mn_ru: "Вечный" },
  { ar: "الْوَارِثُ", tr: "Ал-Ворис", mn_tj: "Ворис", mn_ru: "Наследник" },
  { ar: "الرَّشِيدُ", tr: "Ар-Рашид", mn_tj: "Ҳидоятёфта", mn_ru: "Направляющий" },
  { ar: "الصَّبُورُ", tr: "Ас-Сабур", mn_tj: "Бурдбор", mn_ru: "Терпеливый" }
];

function initNamesOfAllah() {
  const container = document.getElementById('names-container');
  let cardsHtml = '';
  const lang = (typeof currentLang !== 'undefined') ? currentLang : 'tj';
  
  namesOfAllah.forEach((n, idx) => {
    const meaning = lang === 'ru' ? n.mn_ru : n.mn_tj;
    cardsHtml += `
      <div class="name-card card-glass">
        <span class="name-num">${(idx + 1).toString().padStart(2, '0')}</span>
        <div class="name-arabic">${n.ar}</div>
        <div class="name-translit">${n.tr}</div>
        <div class="name-meaning">${meaning}</div>
      </div>
    `;
  });
  
  container.innerHTML = cardsHtml;
}

// 13.1 ADD EVENT LISTENER FOR LANGUAGE SWITCH
window.addEventListener('languageChanged', () => {
  initHadiths();
  initDuas();
  initNamesOfAllah();
  renderPrayerGuide();
  renderCalendar();
  initVerseOfDay();
  updateHomePrayerTimes();
  // Update tasbih translation text
  const activeBtn = document.querySelector('.dhikr-select-btn.active');
  if (activeBtn) {
    const keyTr = activeBtn.getAttribute('data-key-tr');
    if (keyTr) document.getElementById('active-dhikr-translation').innerText = t(keyTr);
  }
});

// 14. TASBIH COUNTER LOGIC
function initTasbih() {
  const tapArea = document.getElementById('tasbih-tap-area');
  const countEl = document.getElementById('tasbih-current-count');
  const totalEl = document.getElementById('tasbih-total-count');
  const goalEl = document.getElementById('tasbih-goal');
  const resetBtn = document.getElementById('tasbih-reset');
  const minusBtn = document.getElementById('tasbih-minus');
  
  // Selection
  const selectBtns = document.querySelectorAll('.dhikr-select-btn');
  selectBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      selectBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const ar    = btn.getAttribute('data-arabic');
      const keyTr = btn.getAttribute('data-key-tr');
      const goal  = Number(btn.getAttribute('data-max'));
      document.getElementById('active-dhikr-arabic').innerText      = ar;
      document.getElementById('active-dhikr-translation').innerText = t(keyTr);
      goalEl.innerText    = goal;
      state.tasbihGoal    = goal;
      state.tasbihCount   = 0;
      countEl.innerText   = 0;
    });
  });
  
  // Tap to count
  tapArea.addEventListener('click', () => {
    state.tasbihCount++;
    state.tasbihTotal++;
    
    // Play subtle haptic vibration on phones
    if (navigator.vibrate) {
      if (state.tasbihCount === state.tasbihGoal) {
        navigator.vibrate([100, 50, 100]);
      } else {
        navigator.vibrate(40);
      }
    }
    
    // Goal threshold
    if (state.tasbihCount > state.tasbihGoal) {
      state.tasbihCount = 1;
    }
    
    countEl.innerText = state.tasbihCount;
    totalEl.innerText = state.tasbihTotal;
    
    // Bounce animation
    countEl.classList.remove('bounce');
    void countEl.offsetWidth;
    countEl.classList.add('bounce');
    
    // Ripple effect
    const ripple = document.createElement('div');
    ripple.className = 'tasbih-ripple';
    tapArea.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);
    
    // SVG Progress ring
    updateTasbihProgress();
    
    // Goal reached flash
    if (state.tasbihCount === state.tasbihGoal) {
      const circle = document.querySelector('.counter-circle');
      circle.classList.add('goal-reached');
      setTimeout(() => circle.classList.remove('goal-reached'), 700);
    }
  });
  
  // Controls
  resetBtn.addEventListener('click', () => {
    state.tasbihCount = 0;
    state.tasbihTotal = 0;
    countEl.innerText = 0;
    totalEl.innerText = 0;
    updateTasbihProgress();
  });
  
  minusBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Avoid tap area trigger
    if (state.tasbihCount > 0) {
      state.tasbihCount--;
      state.tasbihTotal = Math.max(0, state.tasbihTotal - 1);
      countEl.innerText = state.tasbihCount;
      totalEl.innerText = state.tasbihTotal;
      updateTasbihProgress();
    }
  });
}

// 15. INTERACTIVE CALENDAR LOGIC (Gregorian & Hijri)
function initCalendar() {
  const prevBtn = document.getElementById('cal-prev');
  const nextBtn = document.getElementById('cal-next');
  
  prevBtn.addEventListener('click', () => {
    state.calendarMonth--;
    if (state.calendarMonth < 0) {
      state.calendarMonth = 11;
      state.calendarYear--;
    }
    renderCalendar();
  });
  
  nextBtn.addEventListener('click', () => {
    state.calendarMonth++;
    if (state.calendarMonth > 11) {
      state.calendarMonth = 0;
      state.calendarYear++;
    }
    renderCalendar();
  });
  
  renderCalendar();
}

function renderCalendar() {
  const monthNames = t('cal_months');
  document.getElementById('calendar-month-year').innerText = `${monthNames[state.calendarMonth]} ${state.calendarYear}`;
  
  const tbody = document.getElementById('calendar-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  // Calculate total days in the selected month
  const totalDays = new Date(state.calendarYear, state.calendarMonth + 1, 0).getDate();
  const now = new Date();
  
  const monthIndex = state.calendarMonth + 1;
  
  for (let d = 1; d <= totalDays; d++) {
    const times = getRegionalTimes(monthIndex, d, state.selectedCity);
    
    // Calculate Makruh time (17 minutes before Shom)
    const makruhStart = subtractMinutes(times.shom, 17);
    const makruhRange = `${makruhStart} - ${times.shom}`;
    
    const isToday = now.getDate() === d && now.getMonth() === state.calendarMonth && now.getFullYear() === state.calendarYear;
    
    const tr = document.createElement('tr');
    if (isToday) tr.className = 'today-row';
    
    tr.innerHTML = `
      <td><strong>${d}</strong></td>
      <td>${times.bomdod}</td>
      <td>${times.oftob}</td>
      <td>${times.peshin}</td>
      <td>${times.asr}</td>
      <td class="makruh-time">${makruhRange}</td>
      <td><strong>${times.shom}</strong></td>
      <td>${times.khuftan}</td>
    `;
    tbody.appendChild(tr);
  }
}

// ─────────────────────────────────────────────────────────────────
// ✨ SCROLL REVEAL ANIMATIONS (IntersectionObserver)
// ─────────────────────────────────────────────────────────────────
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });

  // Stagger delay for grid items
  const selectors = '.prayer-card, .dua-card, .name-card, .verse-card, .section-container, .mini-calendar-section, .hadith-list-card';
  document.querySelectorAll(selectors).forEach((el, idx) => {
    el.classList.add('scroll-reveal');
    el.style.transitionDelay = `${(idx % 8) * 0.06}s`;
    observer.observe(el);
  });
}

// ─────────────────────────────────────────────────────────────────
// 🔵 TASBIH SVG PROGRESS RING UPDATE
// ─────────────────────────────────────────────────────────────────
function updateTasbihProgress() {
  const circle = document.getElementById('tasbih-progress');
  if (!circle) return;
  const circumference = 2 * Math.PI * 100; // 628.32
  const progress = Math.min(state.tasbihCount / state.tasbihGoal, 1);
  const offset = circumference * (1 - progress);
  circle.style.strokeDashoffset = offset;
  
  if (state.tasbihCount >= state.tasbihGoal) {
    circle.classList.add('completed');
  } else {
    circle.classList.remove('completed');
  }
}
