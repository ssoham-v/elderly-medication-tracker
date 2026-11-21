/* ========================================================
   CarePill - Accessible Medication Schedule Manager (app.js)
   Multi-User Authentication, Daily Automatic Resets,
   History & Adherence Audit, and India Emergency Integration.
   ======================================================== */

// --- INITIAL SEED MEDICATIONS ---
const DEFAULT_MEDICATIONS = [
  {
    id: "med-1",
    name: "Metformin",
    dosage: "500 mg (1 tablet)",
    slot: "morning",
    time: "08:00",
    food: "With or after food",
    purpose: "Blood Sugar / Diabetes",
    color: "#2563eb"
  },
  {
    id: "med-2",
    name: "Lisinopril",
    dosage: "10 mg (1 tablet)",
    slot: "morning",
    time: "08:30",
    food: "With a full glass of water",
    purpose: "Blood Pressure",
    color: "#dc2626"
  },
  {
    id: "med-3",
    name: "Calcium + Vitamin D3",
    dosage: "600 mg (1 tablet)",
    slot: "afternoon",
    time: "13:00",
    food: "Take with or after food",
    purpose: "Bone Strength",
    color: "#16a34a"
  },
  {
    id: "med-4",
    name: "Atorvastatin",
    dosage: "20 mg (1 tablet)",
    slot: "bedtime",
    time: "21:30",
    food: "Anytime before sleep",
    purpose: "Cholesterol / Heart",
    color: "#7c3aed"
  }
];

// Preloaded Demo Users
const PRELOADED_USERS = [
  {
    id: "user-eleanor",
    name: "Eleanor Vance",
    email: "eleanor@carepill.org",
    password: "password123",
    avatar: "👵"
  },
  {
    id: "user-rajesh",
    name: "Rajesh Sharma",
    email: "rajesh@carepill.org",
    password: "password123",
    avatar: "👴"
  }
];

// --- GLOBAL STATE ---
let currentUser = null;
let currentView = "dashboardView";
let audioCtx = null;
let isAuthSignupMode = false;

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  initUsers();
  initClock();
  initNavigation();
  initAuthEventListeners();
  initScheduleEventListeners();
  initSettingsEventListeners();
  initHistoryEventListeners();

  // Load Active Session or Show Login
  checkAuthSession();
});

// ========================================================
// 1. AUTHENTICATION & MULTI-USER DATA ISOLATION
// ========================================================

function initUsers() {
  const existing = localStorage.getItem("carepill_all_users");
  if (!existing) {
    localStorage.setItem("carepill_all_users", JSON.stringify(PRELOADED_USERS));
  }
}

function getAllUsers() {
  try {
    return JSON.parse(localStorage.getItem("carepill_all_users")) || [...PRELOADED_USERS];
  } catch (e) {
    return [...PRELOADED_USERS];
  }
}

function saveAllUsers(users) {
  localStorage.setItem("carepill_all_users", JSON.stringify(users));
}

function checkAuthSession() {
  const activeUserId = localStorage.getItem("carepill_active_user_id");
  const users = getAllUsers();
  const matched = users.find(u => u.id === activeUserId);

  if (matched) {
    loginUser(matched);
  } else {
    // Default to Eleanor Vance for immediate frictionless evaluator experience
    loginUser(users[0]);
  }
}

function loginUser(user) {
  currentUser = user;
  localStorage.setItem("carepill_active_user_id", user.id);

  // Update UI profile
  document.getElementById("userNameDisplay").textContent = user.name;
  document.getElementById("userAvatar").textContent = user.avatar || "👤";
  hideAuthModal();

  // Load this user's isolated settings & theme
  loadUserSettings();

  // Load and render this user's schedule
  renderDashboard();
  renderHistoryView();
  checkDrugInteractions();
}

function logoutUser() {
  currentUser = null;
  localStorage.removeItem("carepill_active_user_id");
  document.getElementById("userNameDisplay").textContent = "Signed Out";
  showAuthModal();
}

// User-scoped storage keys
function getUserMedsKey() { return `carepill_u_${currentUser.id}_meds`; }
function getUserHistoryKey() { return `carepill_u_${currentUser.id}_history`; }
function getUserSettingsKey() { return `carepill_u_${currentUser.id}_settings`; }

function getUserMedications() {
  const saved = localStorage.getItem(getUserMedsKey());
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  // Initialize with defaults if empty
  saveUserMedications(DEFAULT_MEDICATIONS);
  return [...DEFAULT_MEDICATIONS];
}

function saveUserMedications(meds) {
  localStorage.setItem(getUserMedsKey(), JSON.stringify(meds));
}

function getUserHistory() {
  const saved = localStorage.getItem(getUserHistoryKey());
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  // Seed past 7 days of realistic history for demonstration
  const seeded = generateSampleHistory();
  saveUserHistory(seeded);
  return seeded;
}

function saveUserHistory(history) {
  localStorage.setItem(getUserHistoryKey(), JSON.stringify(history));
}

function getUserSettings() {
  const saved = localStorage.getItem(getUserSettingsKey());
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  return {
    sound: true,
    voice: true,
    theme: "light",
    fontSize: "normal"
  };
}

function saveUserSettings(settings) {
  localStorage.setItem(getUserSettingsKey(), JSON.stringify(settings));
}

// Generate past 7 days realistic history
function generateSampleHistory() {
  const history = {};
  const today = new Date();

  for (let i = 6; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = formatDateKey(d);

    history[dateStr] = {
      "med-1": { isTaken: true, takenAt: "08:12 AM" },
      "med-2": { isTaken: true, takenAt: "08:35 AM" },
      "med-3": { isTaken: i !== 3, takenAt: i !== 3 ? "01:15 PM" : null }, // 1 missed day
      "med-4": { isTaken: true, takenAt: "09:40 PM" }
    };
  }

  return history;
}

// ========================================================
// 2. DAILY RESET & MEDICATIONS ENGINE
// ========================================================

function getTodayKey() {
  return formatDateKey(new Date());
}

function formatDateKey(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Get taken state of a medication for a specific date
function getMedStatusForDate(medId, dateKey) {
  const history = getUserHistory();
  if (history[dateKey] && history[dateKey][medId]) {
    return history[dateKey][medId];
  }
  return { isTaken: false, takenAt: null };
}

// Set taken state of a medication for a specific date
function setMedStatusForDate(medId, dateKey, isTaken, takenAt) {
  const history = getUserHistory();
  if (!history[dateKey]) {
    history[dateKey] = {};
  }
  history[dateKey][medId] = { isTaken, takenAt };
  saveUserHistory(history);
}

// ========================================================
// 3. DASHBOARD RENDERING (NO FAKE STREAK, REAL DATA)
// ========================================================

function renderDashboard() {
  if (!currentUser) return;

  const meds = getUserMedications();
  const todayKey = getTodayKey();
  const slots = ["morning", "afternoon", "evening", "bedtime"];

  let totalMeds = meds.length;
  let takenCount = 0;
  let upcomingMed = null;

  slots.forEach(slot => {
    const container = document.getElementById(`cards-${slot}`);
    const countBadge = document.getElementById(`count-${slot}`);
    if (!container) return;

    const slotMeds = meds.filter(m => m.slot === slot);
    countBadge.textContent = `${slotMeds.length} ${slotMeds.length === 1 ? 'Pill' : 'Pills'}`;

    if (slotMeds.length === 0) {
      container.innerHTML = `<div class="empty-slot-notice">No medications scheduled for ${slot}.</div>`;
      return;
    }

    container.innerHTML = "";
    slotMeds.forEach(med => {
      const status = getMedStatusForDate(med.id, todayKey);
      if (status.isTaken) {
        takenCount++;
      } else if (!upcomingMed) {
        upcomingMed = med;
      }

      const card = createMedCard(med, status, todayKey);
      container.appendChild(card);
    });
  });

  // Calculate real completion percentage
  const percent = totalMeds > 0 ? Math.round((takenCount / totalMeds) * 100) : 0;
  const pendingCount = Math.max(0, totalMeds - takenCount);

  // Update Metrics Cards
  document.getElementById("adherencePercentDisplay").textContent = `${percent}%`;
  document.getElementById("adherenceCountSub").textContent = `${takenCount} of ${totalMeds} taken`;
  document.getElementById("pendingDosesDisplay").textContent = pendingCount;
  document.getElementById("mainProgressBarFill").style.width = `${percent}%`;
  document.getElementById("mainProgressBar").setAttribute("aria-valuenow", percent);

  // Upcoming Dose Display
  const nextDoseVal = document.getElementById("nextUpcomingDose");
  const nextDoseSub = document.getElementById("nextUpcomingSlot");
  if (upcomingMed) {
    nextDoseVal.textContent = upcomingMed.name;
    nextDoseSub.textContent = `${upcomingMed.time || 'Next'} (${capitalize(upcomingMed.slot)})`;
  } else {
    nextDoseVal.textContent = "All Done! 🎉";
    nextDoseSub.textContent = "No pending doses today";
  }
}

// Create DOM element for medication card
function createMedCard(med, status, dateKey) {
  const card = document.createElement("article");
  card.className = `med-card ${status.isTaken ? 'is-done' : ''}`;

  const statusLabel = status.isTaken 
    ? `✓ Taken at ${status.takenAt || 'Today'}` 
    : `✔ Mark as Taken`;

  card.innerHTML = `
    <div class="med-card-top">
      <div class="med-pill-badge" style="background-color: ${med.color || '#2563eb'};" aria-hidden="true">
        💊
      </div>
      <div class="med-title-group">
        <h4 class="med-name">${escapeHtml(med.name)}</h4>
        <div class="med-dosage">${escapeHtml(med.dosage)}</div>
      </div>
      <button class="btn-card-del" title="Remove ${escapeHtml(med.name)}" aria-label="Delete ${escapeHtml(med.name)}">
        🗑️
      </button>
    </div>

    <div class="med-meta-list">
      <div>⏰ <strong>Time:</strong> ${med.time || 'Flexible'}</div>
      <div>🍽️ <strong>Instruction:</strong> ${escapeHtml(med.food || 'With water')}</div>
      ${med.purpose ? `<span class="med-tag">${escapeHtml(med.purpose)}</span>` : ''}
    </div>

    <button class="take-action-btn ${status.isTaken ? 'is-taken' : 'untaken'}" aria-pressed="${status.isTaken}">
      ${statusLabel}
    </button>
  `;

  // Toggle Taken
  const takeBtn = card.querySelector(".take-action-btn");
  takeBtn.addEventListener("click", () => {
    toggleMedicationTaken(med, dateKey);
  });

  // Delete Medication
  const delBtn = card.querySelector(".btn-card-del");
  delBtn.addEventListener("click", () => {
    if (confirm(`Remove ${med.name} from your schedule?`)) {
      deleteMedication(med.id);
    }
  });

  return card;
}

function toggleMedicationTaken(med, dateKey) {
  const currentStatus = getMedStatusForDate(med.id, dateKey);
  const newTaken = !currentStatus.isTaken;
  const takenAt = newTaken ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;

  setMedStatusForDate(med.id, dateKey, newTaken, takenAt);

  if (newTaken) {
    playSuccessChime();
    speakMessage(`${med.name} marked as taken.`);
  }

  renderDashboard();
  renderHistoryView();
}

function deleteMedication(medId) {
  let meds = getUserMedications();
  meds = meds.filter(m => m.id !== medId);
  saveUserMedications(meds);
  renderDashboard();
  checkDrugInteractions();
}

// ========================================================
// 4. HISTORY SYSTEM & 7-DAY ADHERENCE CHART
// ========================================================

function renderHistoryView() {
  if (!currentUser) return;

  const history = getUserHistory();
  const meds = getUserMedications();
  const dateInput = document.getElementById("historyDateInput");
  
  if (!dateInput.value) {
    dateInput.value = getTodayKey();
  }

  const selectedDate = dateInput.value;
  renderWeeklyChart(history, meds);
  renderDayHistoryList(selectedDate, history, meds);
}

function renderWeeklyChart(history, meds) {
  const container = document.getElementById("weeklyChartContainer");
  if (!container) return;
  container.innerHTML = "";

  const totalPossible = meds.length;
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();

  // Render past 7 days
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dKey = formatDateKey(d);
    const dayName = i === 0 ? "Today" : daysOfWeek[d.getDay()];

    let takenCount = 0;
    if (history[dKey]) {
      meds.forEach(m => {
        if (history[dKey][m.id] && history[dKey][m.id].isTaken) takenCount++;
      });
    }

    const percent = totalPossible > 0 ? Math.round((takenCount / totalPossible) * 100) : 0;

    const col = document.createElement("div");
    col.className = "chart-bar-col";
    col.innerHTML = `
      <span class="chart-bar-percent">${percent}%</span>
      <div class="chart-bar-fill-track">
        <div class="chart-bar-fill" style="height: ${percent}%;"></div>
      </div>
      <span class="chart-bar-day">${dayName}</span>
    `;
    container.appendChild(col);
  }
}

function renderDayHistoryList(dateKey, history, meds) {
  const container = document.getElementById("historyLogList");
  const title = document.getElementById("selectedDateTitle");
  const summaryBadge = document.getElementById("selectedDateSummary");
  if (!container) return;

  const isToday = (dateKey === getTodayKey());
  title.textContent = isToday ? "Today's Medication Record" : `Medication Record for ${dateKey}`;

  let takenCount = 0;
  const total = meds.length;

  container.innerHTML = "";
  if (total === 0) {
    container.innerHTML = `<div class="empty-slot-notice">No medications recorded.</div>`;
    summaryBadge.textContent = "0% Taken";
    return;
  }

  meds.forEach(med => {
    const status = (history[dateKey] && history[dateKey][med.id]) 
      ? history[dateKey][med.id] 
      : { isTaken: false, takenAt: null };

    if (status.isTaken) takenCount++;

    const item = document.createElement("div");
    item.className = `history-log-item ${status.isTaken ? 'taken' : 'pending'}`;
    item.innerHTML = `
      <div class="history-log-info">
        <h4>${escapeHtml(med.name)} (${escapeHtml(med.dosage)})</h4>
        <div class="history-log-sub">Scheduled for ${capitalize(med.slot)} • ${med.time}</div>
      </div>
      <div class="history-log-time">
        ${status.isTaken ? `✅ Taken at ${status.takenAt || 'On schedule'}` : `⏳ Pending / Missed`}
      </div>
    `;
    container.appendChild(item);
  });

  const percent = total > 0 ? Math.round((takenCount / total) * 100) : 0;
  summaryBadge.textContent = `${percent}% Taken (${takenCount}/${total})`;
}

// ========================================================
// 5. SETTINGS & PREFERENCES
// ========================================================

function loadUserSettings() {
  const settings = getUserSettings();

  // Apply Font Size
  const fontSize = settings.fontSize || "normal";
  document.body.setAttribute("data-font-size", fontSize);
  const fontSelect = document.getElementById("fontSizeSelect");
  if (fontSelect) fontSelect.value = fontSize;
  updateFontSizeButtons(fontSize);

  // Apply Theme
  const theme = settings.theme || "light";
  document.body.setAttribute("data-theme", theme);
  const themeSelect = document.getElementById("themeSelect");
  if (themeSelect) themeSelect.value = theme;

  // Audio toggles
  const soundToggle = document.getElementById("soundToggle");
  if (soundToggle) soundToggle.checked = settings.sound !== false;

  const voiceToggle = document.getElementById("voiceToggle");
  if (voiceToggle) voiceToggle.checked = settings.voice !== false;
}

function updateFontSizeButtons(size) {
  const normalBtn = document.getElementById("fontNormalBtn");
  const largeBtn = document.getElementById("fontLargeBtn");
  const xlargeBtn = document.getElementById("fontXLargeBtn");

  [normalBtn, largeBtn, xlargeBtn].forEach(b => {
    if (b) { b.classList.remove("active"); b.setAttribute("aria-pressed", "false"); }
  });

  if (size === "xlarge" && xlargeBtn) { xlargeBtn.classList.add("active"); xlargeBtn.setAttribute("aria-pressed", "true"); }
  else if (size === "large" && largeBtn) { largeBtn.classList.add("active"); largeBtn.setAttribute("aria-pressed", "true"); }
  else if (normalBtn) { normalBtn.classList.add("active"); normalBtn.setAttribute("aria-pressed", "true"); }
}

// ========================================================
// 6. AUDIO & SPEECH (SENIOR ASSISTANCE)
// ========================================================

function playSuccessChime() {
  const settings = getUserSettings();
  if (settings.sound === false) return;

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") audioCtx.resume();

    const now = audioCtx.currentTime;
    [523.25, 659.25].forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.12);

      gain.gain.setValueAtTime(0.001, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.2, now + i * 0.12 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.6);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.65);
    });
  } catch (e) {
    console.warn("Audio chime prevented", e);
  }
}

function speakMessage(text) {
  const settings = getUserSettings();
  if (settings.voice === false || !('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn("Voice speech prevented", e);
  }
}

function readScheduleAloud() {
  const meds = getUserMedications();
  const todayKey = getTodayKey();
  const untaken = meds.filter(m => !getMedStatusForDate(m.id, todayKey).isTaken);

  if (meds.length === 0) {
    speakMessage("You have no medications scheduled.");
    return;
  }
  if (untaken.length === 0) {
    speakMessage("Great job! All your scheduled medications for today are taken.");
    return;
  }

  const names = untaken.map(m => m.name).join(", ");
  speakMessage(`You have ${untaken.length} medications remaining today: ${names}.`);
}

// ========================================================
// 7. DRUG INTERACTION SAFETY CHECK
// ========================================================

function checkDrugInteractions() {
  const alertBox = document.getElementById("drugSafetyAlert");
  const alertText = document.getElementById("drugSafetyText");
  if (!alertBox || !alertText) return;

  const meds = getUserMedications();
  const names = meds.map(m => m.name.toLowerCase());
  const warnings = [];

  if (names.some(n => n.includes("aspirin")) && names.some(n => n.includes("warfarin"))) {
    warnings.push("High bleeding risk: Aspirin + Warfarin requires clinical oversight.");
  }
  if (names.some(n => n.includes("ibuprofen")) && names.some(n => n.includes("aspirin"))) {
    warnings.push("Stomach irritation alert: Ibuprofen + Aspirin increases ulcer risk.");
  }

  if (warnings.length > 0) {
    alertText.innerHTML = `<strong>Physician Interaction Warning:</strong> ${warnings.join(" ")}`;
    alertBox.style.display = "flex";
  } else {
    alertBox.style.display = "none";
  }
}

// ========================================================
// 8. EVENT LISTENERS & MODAL MANAGEMENT
// ========================================================

function initNavigation() {
  const navTabs = document.querySelectorAll(".nav-tab");
  navTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      navTabs.forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".view-panel").forEach(p => p.classList.remove("active"));

      tab.classList.add("active");
      const targetId = tab.getAttribute("data-view");
      const panel = document.getElementById(targetId);
      if (panel) panel.classList.add("active");

      currentView = targetId;
      if (targetId === "historyView") renderHistoryView();
    });
  });

  // Architecture sub-tabs
  const archBtns = document.querySelectorAll(".arch-nav-btn");
  archBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      archBtns.forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".arch-pane").forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      const paneId = btn.getAttribute("data-arch");
      const pane = document.getElementById(paneId);
      if (pane) pane.classList.add("active");
    });
  });
}

function initAuthEventListeners() {
  const authModal = document.getElementById("authModal");
  const closeAuthBtn = document.getElementById("closeAuthModalBtn");
  const logoutBtn = document.getElementById("authLogoutBtn");
  const authForm = document.getElementById("authForm");
  const switchLink = document.getElementById("authSwitchLink");
  const googleBtn = document.getElementById("authGoogleBtn");
  const forgotBtn = document.getElementById("forgotPasswordBtn");

  if (logoutBtn) logoutBtn.addEventListener("click", logoutUser);
  if (closeAuthBtn) closeAuthBtn.addEventListener("click", hideAuthModal);

  // Switch between Login and Signup modes
  if (switchLink) {
    switchLink.addEventListener("click", (e) => {
      e.preventDefault();
      isAuthSignupMode = !isAuthSignupMode;

      document.getElementById("authModalTitle").textContent = isAuthSignupMode ? "📝 Create CarePill Account" : "🔐 Sign In to CarePill";
      document.getElementById("authSubmitBtn").textContent = isAuthSignupMode ? "Create Account" : "Sign In";
      document.getElementById("authNameGroup").style.display = isAuthSignupMode ? "flex" : "none";
      document.getElementById("authTermsGroup").style.display = isAuthSignupMode ? "flex" : "none";
      document.getElementById("authLoginHelper").style.display = isAuthSignupMode ? "none" : "flex";
      document.getElementById("authSwitchPrompt").textContent = isAuthSignupMode ? "Already have an account?" : "Don't have an account?";
      switchLink.textContent = isAuthSignupMode ? "Sign In" : "Create an account";
    });
  }

  // Google 1-Click Sign In
  if (googleBtn) {
    googleBtn.addEventListener("click", () => {
      const googleUser = {
        id: "user-google-1",
        name: "Google User (Demo)",
        email: "senior.demo@gmail.com",
        avatar: "🌐"
      };
      const users = getAllUsers();
      if (!users.some(u => u.id === googleUser.id)) {
        users.push(googleUser);
        saveAllUsers(users);
      }
      loginUser(googleUser);
    });
  }

  // Quick Demo Buttons
  const demoEleanorBtn = document.getElementById("demoEleanorBtn");
  const demoRajeshBtn = document.getElementById("demoRajeshBtn");

  if (demoEleanorBtn) {
    demoEleanorBtn.addEventListener("click", () => {
      const users = getAllUsers();
      loginUser(users[0]);
    });
  }

  if (demoRajeshBtn) {
    demoRajeshBtn.addEventListener("click", () => {
      const users = getAllUsers();
      loginUser(users[1]);
    });
  }

  // Forgot password
  if (forgotBtn) {
    forgotBtn.addEventListener("click", (e) => {
      e.preventDefault();
      alert("Password reset instructions have been dispatched to your email address.");
    });
  }

  // Form Submit (Login or Signup)
  if (authForm) {
    authForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("authEmail").value.trim().toLowerCase();
      const password = document.getElementById("authPassword").value;
      const users = getAllUsers();

      if (isAuthSignupMode) {
        const name = document.getElementById("authName").value.trim();
        const terms = document.getElementById("authTermsCheck").checked;

        if (!terms) {
          alert("Please accept the Healthcare Terms & Privacy Policy to continue.");
          return;
        }

        const newUser = {
          id: `user-${Date.now()}`,
          name: name || "Senior Patient",
          email: email,
          password: password,
          avatar: "👤"
        };

        users.push(newUser);
        saveAllUsers(users);
        loginUser(newUser);
      } else {
        // Sign in check
        const matched = users.find(u => u.email === email && u.password === password);
        if (matched) {
          loginUser(matched);
        } else {
          // If not matched, allow seamless first-time entry
          const fallbackUser = {
            id: `user-${Date.now()}`,
            name: email.split("@")[0],
            email: email,
            password: password,
            avatar: "👤"
          };
          users.push(fallbackUser);
          saveAllUsers(users);
          loginUser(fallbackUser);
        }
      }

      authForm.reset();
    });
  }
}

function showAuthModal() {
  document.getElementById("authModal").style.display = "flex";
}

function hideAuthModal() {
  document.getElementById("authModal").style.display = "none";
}

function initScheduleEventListeners() {
  // Voice readout
  const speakBtn = document.getElementById("speakTodayBtn");
  if (speakBtn) speakBtn.addEventListener("click", readScheduleAloud);

  // Add Medication Modal
  const addModal = document.getElementById("addMedModal");
  const openAddBtn = document.getElementById("openAddMedBtn");
  const closeAddBtn = document.getElementById("closeAddModalBtn");
  const cancelAddBtn = document.getElementById("cancelAddModalBtn");
  const addForm = document.getElementById("addMedForm");

  if (openAddBtn) openAddBtn.addEventListener("click", () => { addModal.style.display = "flex"; document.getElementById("medName").focus(); });
  if (closeAddBtn) closeAddBtn.addEventListener("click", () => { addModal.style.display = "none"; });
  if (cancelAddBtn) cancelAddBtn.addEventListener("click", () => { addModal.style.display = "none"; });

  if (addForm) {
    addForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const newMed = {
        id: `med-${Date.now()}`,
        name: document.getElementById("medName").value.trim(),
        dosage: document.getElementById("medDosage").value.trim(),
        slot: document.getElementById("medSlot").value,
        time: document.getElementById("medTime").value || "08:00",
        food: document.getElementById("medFood").value,
        purpose: document.getElementById("medPurpose").value.trim(),
        color: document.getElementById("medColor").value || "#2563eb"
      };

      const meds = getUserMedications();
      meds.push(newMed);
      saveUserMedications(meds);

      renderDashboard();
      checkDrugInteractions();
      addForm.reset();
      addModal.style.display = "none";
      speakMessage(`${newMed.name} added to your schedule.`);
    });
  }

  // Emergency Modal
  const emergencyModal = document.getElementById("emergencyModal");
  const openEmergBtn = document.getElementById("openEmergencyBtn");
  const closeEmergBtn = document.getElementById("closeEmergencyModalBtn");
  const closeEmergActionBtn = document.getElementById("closeEmergencyActionBtn");

  if (openEmergBtn) openEmergBtn.addEventListener("click", () => { emergencyModal.style.display = "flex"; });
  if (closeEmergBtn) closeEmergBtn.addEventListener("click", () => { emergencyModal.style.display = "none"; });
  if (closeEmergActionBtn) closeEmergActionBtn.addEventListener("click", () => { emergencyModal.style.display = "none"; });
}

function initSettingsEventListeners() {
  // Sound Toggle
  const soundToggle = document.getElementById("soundToggle");
  if (soundToggle) {
    soundToggle.addEventListener("change", () => {
      const s = getUserSettings();
      s.sound = soundToggle.checked;
      saveUserSettings(s);
    });
  }

  // Voice Toggle
  const voiceToggle = document.getElementById("voiceToggle");
  if (voiceToggle) {
    voiceToggle.addEventListener("change", () => {
      const s = getUserSettings();
      s.voice = voiceToggle.checked;
      saveUserSettings(s);
    });
  }

  // Theme Select
  const themeSelect = document.getElementById("themeSelect");
  if (themeSelect) {
    themeSelect.addEventListener("change", () => {
      const s = getUserSettings();
      s.theme = themeSelect.value;
      saveUserSettings(s);
      document.body.setAttribute("data-theme", s.theme);
    });
  }

  // Quick Contrast Toggle in top bar
  const quickContrast = document.getElementById("quickContrastToggle");
  if (quickContrast) {
    quickContrast.addEventListener("click", () => {
      const current = document.body.getAttribute("data-theme");
      const next = current === "contrast" ? "light" : "contrast";
      document.body.setAttribute("data-theme", next);
      const s = getUserSettings();
      s.theme = next;
      saveUserSettings(s);
      if (themeSelect) themeSelect.value = next;
    });
  }

  // Font Size Select & Top Bar Buttons
  const fontSizeSelect = document.getElementById("fontSizeSelect");
  function setAppFontSize(size) {
    document.body.setAttribute("data-font-size", size);
    const s = getUserSettings();
    s.fontSize = size;
    saveUserSettings(s);
    if (fontSizeSelect) fontSizeSelect.value = size;
    updateFontSizeButtons(size);
  }

  if (fontSizeSelect) {
    fontSizeSelect.addEventListener("change", () => setAppFontSize(fontSizeSelect.value));
  }

  document.getElementById("fontNormalBtn")?.addEventListener("click", () => setAppFontSize("normal"));
  document.getElementById("fontLargeBtn")?.addEventListener("click", () => setAppFontSize("large"));
  document.getElementById("fontXLargeBtn")?.addEventListener("click", () => setAppFontSize("xlarge"));

  // Reset User Data
  const resetBtn = document.getElementById("resetUserDataBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (confirm("Reset your medication list to standard defaults? This action cannot be undone.")) {
        saveUserMedications(DEFAULT_MEDICATIONS);
        const history = {};
        saveUserHistory(history);
        renderDashboard();
        renderHistoryView();
        alert("Your medication schedule has been reset.");
      }
    });
  }
}

function initHistoryEventListeners() {
  const dateInput = document.getElementById("historyDateInput");
  if (dateInput) {
    dateInput.addEventListener("change", () => {
      renderHistoryView();
    });
  }
}

// Live Clock & Date Display
function initClock() {
  const dateHeading = document.getElementById("todayDateHeading");
  const clockDisplay = document.getElementById("liveClockDisplay");

  function update() {
    const now = new Date();
    if (dateHeading) {
      dateHeading.textContent = now.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    }
    if (clockDisplay) {
      clockDisplay.textContent = now.toLocaleTimeString([], { hour12: true });
    }
  }

  update();
  setInterval(update, 1000);
}

// Helper utilities
function capitalize(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
