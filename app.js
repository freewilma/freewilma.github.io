/* ============================================================
   FreeWilma — app.js
   ============================================================ */

'use strict';

// ── Constants ──────────────────────────────────────────────
const START_DATE = new Date('2026-06-06T00:00:00');
const END_DATE = new Date('2027-06-17T00:00:00');
const TOTAL_DAYS = 347;
const LS_KEY = 'freewilma_freedom';
const LS_COUNT_KEY = 'freewilma_last_count';

// ── DOM refs ───────────────────────────────────────────────
const dayCountEl = document.getElementById('day-count');
const vapauteenWrap = document.getElementById('vapauteen-wrap');
const btnVapauteen = document.getElementById('btn-vapauteen');
const btnReroll = document.getElementById('btn-reroll');
const d20Svg = document.querySelector('.d20-svg');
const wotdText = document.getElementById('wotd-text');
const diceRainEl = document.getElementById('dice-rain');
const emojiBurstEl = document.getElementById('emoji-burst');
const audioFreedom = document.getElementById('audio-freedom');
const audioDice = document.getElementById('audio-dice');
const audioRifle = document.getElementById('audio-rifle');

// ── State ──────────────────────────────────────────────────
let wordlist = [];   // [{fi, es}]
let celebrationActive = false;
let celebrationTimers = [];
let rerollLocked = false;

// ── Day calculation ────────────────────────────────────────
function getDaysRemaining() {
    const now = new Date();
    // Midnight today (local)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(END_DATE.getFullYear(), END_DATE.getMonth(), END_DATE.getDate());
    const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    return Math.max(0, Math.min(diff, TOTAL_DAYS));
}

// ── Render counter ─────────────────────────────────────────
function renderCounter(days) {
    // Wrap each digit in its own span for per-numeral animation
    dayCountEl.innerHTML = String(days)
        .split('')
        .map(ch => `<span class="digit">${ch}</span>`)
        .join('');

    if (days === 0) {
        dayCountEl.classList.add('is-zero');
        vapauteenWrap.classList.remove('hidden');
    } else {
        dayCountEl.classList.remove('is-zero');
        vapauteenWrap.classList.add('hidden');
    }
}

// ── Word of the Day ────────────────────────────────────────
async function loadWordlist() {
    try {
        const res = await fetch('wordlist_spanish.txt');
        const text = await res.text();
        wordlist = text
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => {
                const tab = line.indexOf('\t');
                if (tab === -1) return null;
                return { fi: line.slice(0, tab).trim(), es: line.slice(tab + 1).trim() };
            })
            .filter(Boolean);
    } catch (e) {
        console.warn('Could not load wordlist:', e);
        wordlist = [{ fi: 'vapaus', es: 'libertad' }];
    }
}

function pickDailyWord() {
    if (wordlist.length === 0) return { fi: 'wapaus', es: 'libertad' };
    // Seed by date so it's the same all day
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const idx = seed % wordlist.length;
    return wordlist[idx];
}

function pickRandomWord(excludeIdx) {
    if (wordlist.length === 0) return { fi: 'wapaus', es: 'libertad' };
    let idx;
    do {
        idx = Math.floor(Math.random() * wordlist.length);
    } while (idx === excludeIdx && wordlist.length > 1);
    return wordlist[idx];
}

let currentWordIdx = -1;

function renderWord(word) {
    wotdText.innerHTML =
        `<span class="wotd-finnish">Wilman ${escapeHtml(word.fi)}</span>` +
        `&nbsp;<span class="wotd-spanish">(${escapeHtml(word.es)})</span>`;
}

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function initWordOfDay() {
    const word = pickDailyWord();
    // Find its index
    currentWordIdx = wordlist.findIndex(w => w.fi === word.fi);
    renderWord(word);
}

// ── Reroll ─────────────────────────────────────────────────
function doReroll() {
    if (rerollLocked) return;
    rerollLocked = true;

    // Play dice sound
    playDiceSound();

    // Animate d20
    d20Svg.classList.remove('rolling');
    // Force reflow to restart animation
    void d20Svg.offsetWidth;
    d20Svg.classList.add('rolling');

    d20Svg.addEventListener('animationend', () => {
        d20Svg.classList.remove('rolling');
        const word = pickRandomWord(currentWordIdx);
        currentWordIdx = wordlist.findIndex(w => w.fi === word.fi);
        renderWord(word);
        rerollLocked = false;
    }, { once: true });
}

// ── Audio ──────────────────────────────────────────────────
function playDiceSound() {
    try {
        audioDice.currentTime = 0;
        audioDice.play().catch(() => { });
    } catch (e) { }
}

function playFreedomSound() {
    try {
        audioFreedom.currentTime = 0;
        audioFreedom.play().catch(() => { });
    } catch (e) { }
}

function stopFreedomSound() {
    try {
        audioFreedom.pause();
        audioFreedom.currentTime = 0;
    } catch (e) { }
}

function playRifleSound() {
    try {
        audioRifle.currentTime = 0;
        audioRifle.play().catch(() => { });
    } catch (e) { }

    // Animate each digit with a slight stagger
    const digits = dayCountEl.querySelectorAll('.digit');
    digits.forEach((span, i) => {
        span.style.animationDelay = `${i * 35}ms`;
        span.classList.remove('digit-press');
        // Force reflow so the animation restarts cleanly
        void span.offsetWidth;
        span.classList.add('digit-press');
        span.addEventListener('animationend', () => {
            span.classList.remove('digit-press');
            span.style.animationDelay = '';
        }, { once: true });
    });
}

// ── Celebration ────────────────────────────────────────────
const CELEBRATION_EMOJIS = ['🎉', '🫡', '🎉', '🫡', '🎉', '🫡', '🎊', '⭐', '🏆', '🎖️'];
const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

function clearCelebration() {
    celebrationTimers.forEach(t => clearTimeout(t));
    celebrationTimers = [];
    diceRainEl.innerHTML = '';
    emojiBurstEl.innerHTML = '';
    // Reset opacity for next celebration
    diceRainEl.style.transition = '';
    emojiBurstEl.style.transition = '';
    diceRainEl.style.opacity = '1';
    emojiBurstEl.style.opacity = '1';
    celebrationActive = false;
}

function spawnFallingDice() {
    const el = document.createElement('img');
    el.src = 'd20.png';
    el.alt = '';
    el.className = 'falling-dice';
    el.style.left = Math.random() * 100 + 'vw';
    const dur = 2.5 + Math.random() * 3;
    el.style.animationDuration = dur + 's';
    const size = (2 + Math.random() * 2.5);
    el.style.width = size + 'rem';
    el.style.height = size + 'rem';
    diceRainEl.appendChild(el);
    const t = setTimeout(() => el.remove(), dur * 1000 + 200);
    celebrationTimers.push(t);
}

function spawnFloatingEmoji() {
    const el = document.createElement('span');
    el.className = 'float-emoji';
    el.textContent = CELEBRATION_EMOJIS[Math.floor(Math.random() * CELEBRATION_EMOJIS.length)];
    el.style.left = (5 + Math.random() * 90) + 'vw';
    el.style.bottom = '-10px';
    const dur = 2 + Math.random() * 2.5;
    el.style.animationDuration = dur + 's';
    el.style.fontSize = (1.8 + Math.random() * 2) + 'rem';
    emojiBurstEl.appendChild(el);
    const t = setTimeout(() => el.remove(), dur * 1000 + 200);
    celebrationTimers.push(t);
}

function launchConfetti() {
    if (typeof confetti === 'undefined') return;

    const colors = ['#c9a84c', '#7aaa45', '#ffe066', '#ff6b6b', '#f0d080', '#ffffff'];

    // Big burst
    confetti({
        particleCount: 120,
        spread: 100,
        origin: { y: 0.5 },
        colors,
        scalar: 1.2,
    });

    // Side cannons
    setTimeout(() => {
        confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors });
        confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors });
    }, 300);

    // Continuous rain for a while
    let count = 0;
    const rain = setInterval(() => {
        confetti({
            particleCount: 15,
            spread: 80,
            origin: { x: Math.random(), y: 0 },
            colors,
            gravity: 0.8,
        });
        count++;
        if (count > 20) clearInterval(rain);
    }, 250);
}

function startCelebration() {
    clearCelebration();
    celebrationActive = true;

    // Sound
    playFreedomSound();

    // Confetti
    launchConfetti();

    // Dice rain — spawn continuously for ~5 seconds
    let diceCount = 0;
    const diceInterval = setInterval(() => {
        spawnFallingDice();
        diceCount++;
        if (diceCount > 25) clearInterval(diceInterval);
    }, 180);

    // Emoji bursts — spawn continuously for ~5 seconds
    let emojiCount = 0;
    const emojiInterval = setInterval(() => {
        spawnFloatingEmoji();
        emojiCount++;
        if (emojiCount > 20) clearInterval(emojiInterval);
    }, 250);

    // Fade out after 6.5s, then clear at 8s
    const fadeTimer = setTimeout(() => {
        diceRainEl.style.transition = 'opacity 1.5s ease';
        emojiBurstEl.style.transition = 'opacity 1.5s ease';
        diceRainEl.style.opacity = '0';
        emojiBurstEl.style.opacity = '0';
    }, 6500);
    celebrationTimers.push(fadeTimer);

    // Auto-clear after 8 seconds
    const clearTimer = setTimeout(() => {
        clearCelebration();
    }, 8000);
    celebrationTimers.push(clearTimer);
}

// ── Freedom button ─────────────────────────────────────────
function handleVapauteen() {
    // Mark freedom achieved in localStorage
    localStorage.setItem(LS_KEY, '1');
    startCelebration();
}

// ── PWA Service Worker ─────────────────────────────────────
function registerSW() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(err => {
            console.warn('SW registration failed:', err);
        });
    }
}

// ── Init ───────────────────────────────────────────────────
async function init() {
    // Register PWA
    registerSW();

    // Load wordlist then show word
    await loadWordlist();
    initWordOfDay();

    // Calculate days
    const days = getDaysRemaining();

    // Show the last saved count (so it only updates when the user taps it).
    // On first visit there's no saved value, so fall back to the real count.
    const savedCount = localStorage.getItem(LS_COUNT_KEY);
    const displayDays = savedCount !== null ? parseInt(savedCount, 10) : days;
    renderCounter(displayDays);

    // Event listeners
    btnVapauteen.addEventListener('click', handleVapauteen);
    btnReroll.addEventListener('click', doReroll);
    dayCountEl.addEventListener('click', handleCounterClick);

    // Keep the stored count fresh at midnight (no visual update — that's for the tap)
    scheduleNextDayUpdate();
}

function handleCounterClick() {
    const days = getDaysRemaining();
    // Save the real current count so the next page load remembers it
    localStorage.setItem(LS_COUNT_KEY, String(days));
    // Re-render with the updated number
    renderCounter(days);
    // Play sound + digit animation
    playRifleSound();
}

function scheduleNextDayUpdate() {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const msUntil = tomorrow - now;
    setTimeout(() => {
        // Silently update the stored count at midnight — no visual change.
        // The display will update the next time the user taps the counter.
        const days = getDaysRemaining();
        localStorage.setItem(LS_COUNT_KEY, String(days));
        initWordOfDay();
        scheduleNextDayUpdate();
    }, msUntil + 500); // +500ms buffer
}

// ── Boot ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
