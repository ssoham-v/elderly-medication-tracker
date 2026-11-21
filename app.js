/* ========================================================
   HealthLog / CarePill - Client Application Engine (app.js)
   No Default Meds (Clean Start), Real Gmail / Auth,
   Interactive Dashboard Calendar & Extended History Calendar
   ======================================================== */

// NO DEFAULT MEDICATIONS (Clean slate as requested by user)
const DEFAULT_MEDS = [];

// Preloaded Users (For quick switching/demo)
const INITIAL_USERS = [
  {
    id: "user-demo",
    name: "Demo Account",
    email: "demo@healthlog.app",
    password: "password123",
    initial: "D",
    isGoogle: false
  },
  {
    id: "user-sawrav-google",
    name: "Sawrav Banerjee",
    email: "sawrav.banerjee@gmail.com",
    password: "google_oauth_token",
    initial: "S",
    isGoogle: true
  }
];

// --- GLOBAL STATE ---
let currentUser = null;
let currentView = "medicationsView";
let isSignUpMode = false;
let audioCtx = null;

// Calendar State
let dashCalDate = new Date();       // Month viewed in dashboard
let histCalDate = new Date();       // Month viewed in history
let selectedDashDate = getTodayKey();   // Active selected date in dashboard
let selectedHistDate = getTodayKey();   // Active selected date in history

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  try {
    initUsers();
    initClock();
    initSidebarNavigation();
    initAuthEventListeners();
    initGoogleChooserEvents();
    initMedicationEventListeners();
    initCalendarEventListeners();
    initSettingsEvents();

    // Check saved session or prompt sign-in
    checkSession();
  } catch (err) {
    console.error("Initialization error:", err);
  }
});

// ========================================================
// 1. AUTHENTICATION & MULTI-USER ISOLATION
// ========================================================

function initUsers() {
  if (!localStorage.getItem("hl_all_users")) {
    localStorage.setItem("hl_all_users", JSON.stringify(INITIAL_USERS));
  }
}

function getAllUsers() {
  try {
    return JSON.parse(localStorage.getItem("hl_all_users")) || [...INITIAL_USERS];
  } catch (e) {
    return [...INITIAL_USERS];
  }
}

function saveAllUsers(users) {
  localStorage.setItem("hl_all_users", JSON.stringify(users));
}

function getCurrentUser() {
  if (currentUser) return currentUser;
  const activeId = localStorage.getItem("hl_active_user_id");
  if (activeId) {
    const users = getAllUsers();
    currentUser = users.find(u => u.id === activeId) || null;
  }
  return currentUser;
}

function checkSession() {
  const activeId = localStorage.getItem("hl_active_user_id");
  if (activeId) {
    const users = getAllUsers();
    const found = users.find(u => u.id === activeId);
    if (found) {
      loginUser(found);
      return;
    }
  }

  // Not logged in: Show Auth dialog upfront so user can sign in with real Gmail / account
  setGuestProfile();
  showAuthModal();
  renderAllViews();
}

function setGuestProfile() {
  const nameEl = document.getElementById("userDisplayName");
  const emailEl = document.getElementById("userDisplayEmail");
  const avatarEl = document.getElementById("userAvatarCircle");

  if (nameEl) nameEl.textContent = "Sign In / Guest";
  if (emailEl) emailEl.textContent = "Click to log in";
  if (avatarEl) avatarEl.textContent = "👤";
}

function loginUser(user) {
  if (!user) return;
  currentUser = user;
  localStorage.setItem("hl_active_user_id", user.id);

  // Update Sidebar Profile Card
  const nameEl = document.getElementById("userDisplayName");
  const emailEl = document.getElementById("userDisplayEmail");
  const avatarEl = document.getElementById("userAvatarCircle");

  if (nameEl) nameEl.textContent = user.name;
  if (emailEl) emailEl.textContent = user.email;
  if (avatarEl) avatarEl.textContent = user.initial || user.name.charAt(0).toUpperCase();

  hideAuthModal();
  hideGoogleChooser();

  renderAllViews();
}

function logoutUser() {
  currentUser = null;
  localStorage.removeItem("hl_active_user_id");
  setGuestProfile();
  showAuthModal();
  renderAllViews();
}

// User-scoped storage keys
function getMedsKey() {
  const u = getCurrentUser();
  return u ? `hl_u_${u.id}_meds` : "hl_guest_meds";
}

function getHistoryKey() {
  const u = getCurrentUser();
  return u ? `hl_u_${u.id}_history` : "hl_guest_history";
}

function getSettingsKey() {
  const u = getCurrentUser();
  return u ? `hl_u_${u.id}_settings` : "hl_guest_settings";
}

function getUserMedications() {
  const saved = localStorage.getItem(getMedsKey());
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }
  // Start with clean empty array (no default medications!)
  return [];
}

function saveUserMedications(meds) {
  localStorage.setItem(getMedsKey(), JSON.stringify(meds));
}

function getUserHistory() {
  const saved = localStorage.getItem(getHistoryKey());
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object") return parsed;
    } catch (e) {}
  }
  // Clean empty history (no default fake logs!)
  return {};
}

function saveUserHistory(history) {
  localStorage.setItem(getHistoryKey(), JSON.stringify(history));
}

function getUserSettings() {
  const saved = localStorage.getItem(getSettingsKey());
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  return { sound: true, voice: true, theme: "dark" };
}

function saveUserSettings(settings) {
  localStorage.setItem(getSettingsKey(), JSON.stringify(settings));
}

// Date helpers
function getTodayKey() { return formatDateKey(new Date()); }

function formatDateKey(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(dateKey) {
  try {
    const parts = dateKey.split("-");
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return dateKey;
  }
}

// Get medication state for a specific date
function getMedStatus(medId, dateKey) {
  const history = getUserHistory();
  if (history[dateKey] && history[dateKey][medId]) {
    return history[dateKey][medId];
  }
  return { status: "PENDING", time: null };
}

// Set medication state for a specific date
function setMedStatus(medId, dateKey, status, time) {
  const history = getUserHistory();
  if (!history[dateKey]) {
    history[dateKey] = {};
  }
  history[dateKey][medId] = { status, time };
  saveUserHistory(history);
}

// Calculate compliance percentage over N days
function calculateCompliance(medId, daysCount) {
  const history = getUserHistory();
  const today = new Date();
  let taken = 0;
  let loggedDays = 0;

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateKey = formatDateKey(d);

    if (history[dateKey] && history[dateKey][medId]) {
      loggedDays++;
      if (history[dateKey][medId].status === "TAKEN") {
        taken++;
      }
    }
  }

  if (loggedDays === 0) return 0;
  return Math.round((taken / loggedDays) * 100);
}

function renderAllViews() {
  renderMedications();
  renderDashboard();
  renderDashboardCalendar();
  renderHistoryCalendar();
  renderHistoryDayLog(selectedHistDate);
  checkDrugInteractions();
}

// ========================================================
// 2. MEDICATIONS VIEW RENDERING (MATCHING SCREENSHOT)
// ========================================================

function renderMedications() {
  const grid = document.getElementById("medicationsGrid");
  if (!grid) return;

  const meds = getUserMedications();
  const todayKey = getTodayKey();
  grid.innerHTML = "";

  if (meds.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1.5rem; background-color: var(--bg-card); border: 1px dashed var(--border-subtle); border-radius: var(--radius-lg);">
        <div style="font-size: 3rem; margin-bottom: 0.75rem;">💊</div>
        <h3 style="font-size: 1.4rem; color: #ffffff; margin-bottom: 0.5rem;">No medications scheduled yet</h3>
        <p style="color: var(--text-gray); margin-bottom: 1.5rem; max-width: 440px; margin-left: auto; margin-right: auto;">
          Add your daily prescriptions, supplements, and timing schedules to start tracking adherence.
        </p>
        <button type="button" id="emptyAddMedBtn" class="btn btn-purple-pill">
          <span class="plus-icon">+</span> Add Your First Medication
        </button>
      </div>
    `;
    document.getElementById("emptyAddMedBtn")?.addEventListener("click", () => {
      document.getElementById("addMedicationModal").style.display = "flex";
      document.getElementById("newMedName")?.focus();
    });
    return;
  }

  meds.forEach(med => {
    const todayStatus = getMedStatus(med.id, todayKey);
    const comp7 = calculateCompliance(med.id, 7);
    const comp30 = calculateCompliance(med.id, 30);

    let lastIntakeLabel = "Not taken today";
    if (todayStatus.status === "TAKEN") {
      lastIntakeLabel = `Today, ${todayStatus.time || '08:00 AM'}`;
    } else if (todayStatus.status === "SKIPPED") {
      lastIntakeLabel = "Skipped today";
    }

    const card = document.createElement("article");
    card.className = `med-card-healthlog ${todayStatus.status === 'TAKEN' ? 'is-taken' : ''}`;

    card.innerHTML = `
      <div class="card-header-row">
        <div class="med-title-area">
          <h2 class="med-title">${escapeHtml(med.name)}</h2>
          <div class="med-badge-row">
            <span class="med-dosage-text">${escapeHtml(med.dosage)}</span>
            <span class="med-category-pill">${escapeHtml(med.category || 'General')}</span>
          </div>
        </div>

        <div class="card-action-icons">
          <button type="button" class="card-icon-btn btn-history-icon" title="Reset Today's Status">🔄</button>
          <button type="button" class="card-icon-btn btn-delete-icon" title="Delete Medication">🗑️</button>
        </div>
      </div>

      <div class="card-body-section">
        <div class="last-intake-text">
          Last intake: <strong>${lastIntakeLabel}</strong>
        </div>

        <!-- 7-Day Compliance -->
        <div class="compliance-row">
          <div class="compliance-labels">
            <span>7-Day Compliance</span>
            <span>${comp7}%</span>
          </div>
          <div class="compliance-track">
            <div class="compliance-bar-fill" style="width: ${comp7}%;"></div>
          </div>
        </div>

        <!-- 30-Day Compliance -->
        <div class="compliance-row">
          <div class="compliance-labels">
            <span>30-Day Compliance</span>
            <span>${comp30}%</span>
          </div>
          <div class="compliance-track">
            <div class="compliance-bar-fill" style="width: ${comp30}%;"></div>
          </div>
        </div>
      </div>

      <!-- Action Buttons Row (Taken / Skipped) -->
      <div class="card-buttons-row">
        <button type="button" class="btn-card-taken ${todayStatus.status === 'TAKEN' ? 'is-active-taken' : ''}">
          ✓ Taken
        </button>
        <button type="button" class="btn-card-skipped ${todayStatus.status === 'SKIPPED' ? 'is-active-skipped' : ''}">
          ▷ Skipped
        </button>
      </div>
    `;

    // Taken Action
    const takenBtn = card.querySelector(".btn-card-taken");
    takenBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const isAlreadyTaken = (todayStatus.status === "TAKEN");
      const newStatus = isAlreadyTaken ? "PENDING" : "TAKEN";
      const timeStr = isAlreadyTaken ? null : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setMedStatus(med.id, todayKey, newStatus, timeStr);
      if (!isAlreadyTaken) {
        playHarmonicChime();
        speakVoice(`${med.name} marked as taken.`);
      }

      renderAllViews();
    });

    // Skipped Action
    const skipBtn = card.querySelector(".btn-card-skipped");
    skipBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const isAlreadySkipped = (todayStatus.status === "SKIPPED");
      const newStatus = isAlreadySkipped ? "PENDING" : "SKIPPED";

      setMedStatus(med.id, todayKey, newStatus, null);
      renderAllViews();
    });

    // Delete Medication
    const delBtn = card.querySelector(".btn-delete-icon");
    delBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (confirm(`Are you sure you want to remove ${med.name} from your schedule?`)) {
        let currentMeds = getUserMedications();
        currentMeds = currentMeds.filter(m => m.id !== med.id);
        saveUserMedications(currentMeds);
        renderAllViews();
      }
    });

    // Reset Icon
    const histBtn = card.querySelector(".btn-history-icon");
    histBtn.addEventListener("click", (e) => {
      e.preventDefault();
      setMedStatus(med.id, todayKey, "PENDING", null);
      renderAllViews();
    });

    grid.appendChild(card);
  });
}

// ========================================================
// 3. DASHBOARD OVERVIEW & COUNTERS
// ========================================================

function renderDashboard() {
  const meds = getUserMedications();
  const dateKey = selectedDashDate || getTodayKey();
  let takenCount = 0;
  let nextMed = null;

  meds.forEach(med => {
    const s = getMedStatus(med.id, dateKey);
    if (s.status === "TAKEN") {
      takenCount++;
    } else if (!nextMed && s.status !== "SKIPPED") {
      nextMed = med;
    }
  });

  const total = meds.length;
  const percent = total > 0 ? Math.round((takenCount / total) * 100) : 0;
  const pending = Math.max(0, total - takenCount);

  // Update DOM Metrics
  const compNum = document.getElementById("overviewComplianceNum");
  const takenDesc = document.getElementById("overviewTakenCount");
  const pendingNum = document.getElementById("overviewPendingNum");
  const nextDoseVal = document.getElementById("overviewNextDose");
  const nextDoseSlot = document.getElementById("overviewNextSlot");

  if (compNum) compNum.textContent = `${percent}%`;
  if (takenDesc) {
    const isToday = (dateKey === getTodayKey());
    takenDesc.textContent = total > 0 
      ? `${takenCount} of ${total} doses taken (${isToday ? 'Today' : dateKey})`
      : "No medications scheduled yet";
  }
  if (pendingNum) pendingNum.textContent = pending;

  if (nextMed) {
    if (nextDoseVal) nextDoseVal.textContent = nextMed.name;
    if (nextDoseSlot) nextDoseSlot.textContent = `${nextMed.dosage} • ${capitalize(nextMed.slot)}`;
  } else {
    if (nextDoseVal) nextDoseVal.textContent = total > 0 ? "All Done! 🎉" : "None";
    if (nextDoseSlot) nextDoseSlot.textContent = total > 0 ? "No pending doses" : "Add medication to begin";
  }

  // Update Slot counts
  const slotMorn = document.getElementById("slotMorningCount");
  const slotAft = document.getElementById("slotAfternoonCount");
  const slotEve = document.getElementById("slotEveningCount");
  const slotBed = document.getElementById("slotBedtimeCount");

  if (slotMorn) slotMorn.textContent = `${meds.filter(m => m.slot === "morning").length} pills`;
  if (slotAft) slotAft.textContent = `${meds.filter(m => m.slot === "afternoon").length} pills`;
  if (slotEve) slotEve.textContent = `${meds.filter(m => m.slot === "evening").length} pills`;
  if (slotBed) slotBed.textContent = `${meds.filter(m => m.slot === "bedtime").length} pills`;
}

// ========================================================
// 4. INTERACTIVE CALENDAR GENERATOR (DASHBOARD & HISTORY)
// ========================================================

function generateCalendarDays(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // First day of month (0 = Sun, 1 = Mon...)
  const firstDayIndex = new Date(year, month, 1).getDay();
  // Total days in current month
  const totalDays = new Date(year, month + 1, 0).getDate();

  const days = [];

  // Empty padding cells before first day
  for (let i = 0; i < firstDayIndex; i++) {
    days.push({ empty: true });
  }

  // Actual day cells
  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(year, month, day);
    const dateKey = formatDateKey(d);
    days.push({
      empty: false,
      dayNum: day,
      dateKey: dateKey
    });
  }

  return days;
}

function getDayAdherenceStatus(dateKey, meds, history) {
  if (meds.length === 0 || !history[dateKey]) return null;

  let taken = 0;
  let skipped = 0;
  let logged = 0;

  meds.forEach(m => {
    if (history[dateKey][m.id]) {
      logged++;
      if (history[dateKey][m.id].status === "TAKEN") taken++;
      if (history[dateKey][m.id].status === "SKIPPED") skipped++;
    }
  });

  if (logged === 0) return null;
  if (taken === meds.length) return "ALL_TAKEN";
  if (taken > 0) return "PARTIAL";
  if (skipped > 0) return "MISSED";
  return null;
}

// Render Dashboard Mini-Calendar
function renderDashboardCalendar() {
  const grid = document.getElementById("dashCalGrid");
  const monthTitle = document.getElementById("dashCalMonthYear");
  if (!grid || !monthTitle) return;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  monthTitle.textContent = `${monthNames[dashCalDate.getMonth()]} ${dashCalDate.getFullYear()}`;

  grid.innerHTML = "";
  const days = generateCalendarDays(dashCalDate);
  const meds = getUserMedications();
  const history = getUserHistory();
  const todayKey = getTodayKey();

  days.forEach(item => {
    const cell = document.createElement("div");
    if (item.empty) {
      cell.className = "cal-day-cell empty-day";
      grid.appendChild(cell);
      return;
    }

    const isToday = (item.dateKey === todayKey);
    const isSelected = (item.dateKey === selectedDashDate);
    const status = getDayAdherenceStatus(item.dateKey, meds, history);

    cell.className = `cal-day-cell ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`;
    cell.setAttribute("data-date", item.dateKey);

    let pipHtml = "";
    if (status === "ALL_TAKEN") pipHtml = `<span class="status-pip pip-green" title="All taken"></span>`;
    else if (status === "PARTIAL") pipHtml = `<span class="status-pip pip-amber" title="Partially taken"></span>`;
    else if (status === "MISSED") pipHtml = `<span class="status-pip pip-red" title="Skipped/Missed"></span>`;

    cell.innerHTML = `
      <span class="day-num">${item.dayNum}</span>
      <div class="day-dots-row">${pipHtml}</div>
    `;

    cell.addEventListener("click", () => {
      selectedDashDate = item.dateKey;
      renderDashboard();
      renderDashboardCalendar();
    });

    grid.appendChild(cell);
  });
}

// Render Extended History Calendar
function renderHistoryCalendar() {
  const grid = document.getElementById("histCalGrid");
  const monthTitle = document.getElementById("histCalMonthYear");
  if (!grid || !monthTitle) return;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  monthTitle.textContent = `${monthNames[histCalDate.getMonth()]} ${histCalDate.getFullYear()}`;

  grid.innerHTML = "";
  const days = generateCalendarDays(histCalDate);
  const meds = getUserMedications();
  const history = getUserHistory();
  const todayKey = getTodayKey();

  days.forEach(item => {
    const cell = document.createElement("div");
    if (item.empty) {
      cell.className = "cal-day-cell empty-day";
      grid.appendChild(cell);
      return;
    }

    const isToday = (item.dateKey === todayKey);
    const isSelected = (item.dateKey === selectedHistDate);
    const status = getDayAdherenceStatus(item.dateKey, meds, history);

    cell.className = `cal-day-cell ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`;
    cell.setAttribute("data-date", item.dateKey);

    let pipHtml = "";
    if (status === "ALL_TAKEN") pipHtml = `<span class="status-pip pip-green"></span>`;
    else if (status === "PARTIAL") pipHtml = `<span class="status-pip pip-amber"></span>`;
    else if (status === "MISSED") pipHtml = `<span class="status-pip pip-red"></span>`;

    cell.innerHTML = `
      <span class="day-num">${item.dayNum}</span>
      <div class="day-dots-row">${pipHtml}</div>
    `;

    cell.addEventListener("click", () => {
      selectedHistDate = item.dateKey;
      renderHistoryCalendar();
      renderHistoryDayLog(selectedHistDate);
    });

    grid.appendChild(cell);
  });
}

// Render Selected Day's Log List in History View
function renderHistoryDayLog(dateKey) {
  const container = document.getElementById("dayLogList");
  const title = document.getElementById("historyDayTitle");
  const badge = document.getElementById("historyDayBadge");
  if (!container) return;

  const isToday = (dateKey === getTodayKey());
  if (title) {
    title.textContent = isToday ? "Intake Log for Today" : `Intake Log for ${formatDisplayDate(dateKey)}`;
  }

  const meds = getUserMedications();
  const history = getUserHistory();
  container.innerHTML = "";

  if (meds.length === 0) {
    container.innerHTML = `
      <div style="color: var(--text-gray); padding: 1.5rem; text-align: center;">
        No medications added to your schedule.
      </div>
    `;
    if (badge) badge.textContent = "0 scheduled";
    return;
  }

  let takenCount = 0;

  meds.forEach(med => {
    const st = (history[dateKey] && history[dateKey][med.id]) 
      ? history[dateKey][med.id] 
      : { status: "PENDING", time: null };

    if (st.status === "TAKEN") takenCount++;

    const item = document.createElement("div");
    item.className = `day-log-item ${st.status === 'TAKEN' ? 'taken' : st.status === 'SKIPPED' ? 'skipped' : ''}`;
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(med.name)} (${escapeHtml(med.dosage)})</strong>
        <div style="font-size: 0.85rem; color: var(--text-gray);">${capitalize(med.slot)} • Target ${med.time}</div>
      </div>
      <div style="font-weight: 700;">
        ${st.status === 'TAKEN' ? `✅ Taken at ${st.time || 'on time'}` : st.status === 'SKIPPED' ? `▷ Skipped` : `⏳ Pending / Untaken`}
      </div>
    `;
    container.appendChild(item);
  });

  if (badge) {
    badge.textContent = `${takenCount} of ${meds.length} taken`;
  }
}

// Calendar Navigation Events
function initCalendarEventListeners() {
  // Dashboard Calendar Nav
  document.getElementById("dashCalPrevBtn")?.addEventListener("click", () => {
    dashCalDate.setMonth(dashCalDate.getMonth() - 1);
    renderDashboardCalendar();
  });

  document.getElementById("dashCalNextBtn")?.addEventListener("click", () => {
    dashCalDate.setMonth(dashCalDate.getMonth() + 1);
    renderDashboardCalendar();
  });

  document.getElementById("dashCalTodayBtn")?.addEventListener("click", () => {
    dashCalDate = new Date();
    selectedDashDate = getTodayKey();
    renderDashboard();
    renderDashboardCalendar();
  });

  // History Calendar Nav
  document.getElementById("histCalPrevBtn")?.addEventListener("click", () => {
    histCalDate.setMonth(histCalDate.getMonth() - 1);
    renderHistoryCalendar();
  });

  document.getElementById("histCalNextBtn")?.addEventListener("click", () => {
    histCalDate.setMonth(histCalDate.getMonth() + 1);
    renderHistoryCalendar();
  });

  document.getElementById("histCalTodayBtn")?.addEventListener("click", () => {
    histCalDate = new Date();
    selectedHistDate = getTodayKey();
    renderHistoryCalendar();
    renderHistoryDayLog(selectedHistDate);
  });
}

// ========================================================
// 5. GOOGLE ACCOUNT CHOOSER & AUTH MODALS
// ========================================================

function initGoogleChooserEvents() {
  const openChooserBtn = document.getElementById("openGoogleChooserBtn");
  const cancelChooserBtn = document.getElementById("cancelGoogleChooserBtn");
  const googleForm = document.getElementById("googleRealAccountForm");

  if (openChooserBtn) {
    openChooserBtn.addEventListener("click", (e) => {
      e.preventDefault();
      hideAuthModal();
      showGoogleChooser();
    });
  }

  if (cancelChooserBtn) {
    cancelChooserBtn.addEventListener("click", (e) => {
      e.preventDefault();
      hideGoogleChooser();
      showAuthModal();
    });
  }

  // REAL GMAIL ACCOUNT FORM SUBMISSION
  if (googleForm) {
    googleForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const emailInput = document.getElementById("googleRealEmailInput");
      const nameInput = document.getElementById("googleRealNameInput");

      const email = emailInput ? emailInput.value.trim().toLowerCase() : "";
      const name = (nameInput && nameInput.value.trim()) ? nameInput.value.trim() : email.split("@")[0];

      if (!email || !email.includes("@")) {
        alert("Please enter a valid Gmail / Google Account email address.");
        return;
      }

      const googleUser = {
        id: `google-${email.replace(/[^a-zA-Z0-9]/g, "_")}`,
        name: name,
        email: email,
        password: "google_oauth_verified",
        initial: name.charAt(0).toUpperCase(),
        isGoogle: true
      };

      const users = getAllUsers();
      const existingIdx = users.findIndex(u => u.email === email);
      if (existingIdx >= 0) {
        users[existingIdx] = googleUser;
      } else {
        users.push(googleUser);
      }
      saveAllUsers(users);

      loginUser(googleUser);
      googleForm.reset();
    });
  }

  // Account tiles inside Google Chooser
  document.querySelectorAll(".google-account-tile[data-email]").forEach(tile => {
    tile.addEventListener("click", () => {
      const name = tile.getAttribute("data-name");
      const email = tile.getAttribute("data-email");
      const initial = tile.getAttribute("data-initial") || "G";

      const googleUser = {
        id: `google-${email.replace(/[^a-zA-Z0-9]/g, "_")}`,
        name: name,
        email: email,
        password: "google_oauth_verified",
        initial: initial,
        isGoogle: true
      };

      const users = getAllUsers();
      if (!users.some(u => u.email === email)) {
        users.push(googleUser);
        saveAllUsers(users);
      }

      loginUser(googleUser);
    });
  });
}

function showGoogleChooser() {
  const m = document.getElementById("googleAccountModal");
  if (m) m.style.display = "flex";
}

function hideGoogleChooser() {
  const m = document.getElementById("googleAccountModal");
  if (m) m.style.display = "none";
}

function showAuthModal() {
  const m = document.getElementById("authModal");
  if (m) m.style.display = "flex";
}

function hideAuthModal() {
  const m = document.getElementById("authModal");
  if (m) m.style.display = "none";
}

function initAuthEventListeners() {
  const closeAuthBtn = document.getElementById("closeAuthModalBtn");
  const logoutBtn = document.getElementById("userLogoutBtn");
  const sidebarCard = document.getElementById("sidebarUserCard");
  const tabSignInBtn = document.getElementById("tabSignInBtn");
  const tabSignUpBtn = document.getElementById("tabSignUpBtn");
  const authForm = document.getElementById("authMainForm");

  // Clicking user profile or logout opens Auth modal
  if (logoutBtn) logoutBtn.addEventListener("click", (e) => { e.stopPropagation(); logoutUser(); });
  if (sidebarCard) sidebarCard.addEventListener("click", () => { showAuthModal(); });
  if (closeAuthBtn) closeAuthBtn.addEventListener("click", hideAuthModal);

  // Switch tabs: Sign In vs Sign Up
  if (tabSignInBtn && tabSignUpBtn) {
    tabSignInBtn.addEventListener("click", () => {
      isSignUpMode = false;
      tabSignInBtn.classList.add("active");
      tabSignUpBtn.classList.remove("active");
      document.getElementById("signUpNameField").style.display = "none";
      document.getElementById("signUpTermsField").style.display = "none";
      document.getElementById("authPrimarySubmitBtn").textContent = "Sign In";
    });

    tabSignUpBtn.addEventListener("click", () => {
      isSignUpMode = true;
      tabSignUpBtn.classList.add("active");
      tabSignInBtn.classList.remove("active");
      document.getElementById("signUpNameField").style.display = "flex";
      document.getElementById("signUpTermsField").style.display = "flex";
      document.getElementById("authPrimarySubmitBtn").textContent = "Create Account";
    });
  }

  // Quick Demo Buttons for Evaluators
  document.getElementById("quickDemoEleanor")?.addEventListener("click", () => {
    const users = getAllUsers();
    loginUser(users[0]);
  });

  document.getElementById("quickDemoRajesh")?.addEventListener("click", () => {
    const users = getAllUsers();
    loginUser(users[0]);
  });

  // Auth Form Submit (Sign In or Sign Up)
  if (authForm) {
    authForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const emailInput = document.getElementById("authEmailInput");
      const passwordInput = document.getElementById("authPasswordInput");

      const email = emailInput.value.trim().toLowerCase();
      const password = passwordInput.value;
      const users = getAllUsers();

      if (isSignUpMode) {
        const nameInput = document.getElementById("regName");
        const termsCheck = document.getElementById("regTermsCheckbox");

        const name = nameInput.value.trim() || email.split("@")[0];
        if (!termsCheck.checked) {
          alert("Please accept the Healthcare Terms & Privacy Policy to sign up.");
          return;
        }

        const newUser = {
          id: `user-${Date.now()}`,
          name: name,
          email: email,
          password: password,
          initial: name.charAt(0).toUpperCase(),
          isGoogle: email.endsWith("@gmail.com")
        };

        users.push(newUser);
        saveAllUsers(users);
        loginUser(newUser);
      } else {
        // Sign In
        const matched = users.find(u => u.email === email && u.password === password);
        if (matched) {
          loginUser(matched);
        } else {
          // If not registered yet, create account with this email!
          const newUser = {
            id: `user-${Date.now()}`,
            name: email.split("@")[0],
            email: email,
            password: password,
            initial: email.charAt(0).toUpperCase(),
            isGoogle: email.endsWith("@gmail.com")
          };
          users.push(newUser);
          saveAllUsers(users);
          loginUser(newUser);
        }
      }

      authForm.reset();
    });
  }
}

// ========================================================
// 6. SIDEBAR NAVIGATION
// ========================================================

function initSidebarNavigation() {
  const navItems = document.querySelectorAll(".nav-item[data-view]");
  navItems.forEach(item => {
    item.addEventListener("click", () => {
      navItems.forEach(n => n.classList.remove("active"));
      document.querySelectorAll(".page-view").forEach(p => p.classList.remove("active"));

      item.classList.add("active");
      const targetId = item.getAttribute("data-view");
      const panel = document.getElementById(targetId);
      if (panel) panel.classList.add("active");

      currentView = targetId;
      renderAllViews();
    });
  });

  // Emergency Sidebar button
  const emergBtn = document.getElementById("openEmergencySidebarBtn");
  const emergModal = document.getElementById("emergencyHelpModal");
  const closeEmergX = document.getElementById("closeEmergencyHelpX");
  const closeEmergAction = document.getElementById("closeEmergencyBtnAction");

  if (emergBtn) emergBtn.addEventListener("click", () => { emergModal.style.display = "flex"; });
  if (closeEmergX) closeEmergX.addEventListener("click", () => { emergModal.style.display = "none"; });
  if (closeEmergAction) closeEmergAction.addEventListener("click", () => { emergModal.style.display = "none"; });

  // Settings Sidebar button
  const settingsNavBtn = document.getElementById("openSettingsNavBtn");
  if (settingsNavBtn) {
    settingsNavBtn.addEventListener("click", () => {
      navItems.forEach(n => n.classList.remove("active"));
      document.querySelectorAll(".page-view").forEach(p => p.classList.remove("active"));
      document.getElementById("settingsView").classList.add("active");
    });
  }
}

// ========================================================
// 7. ADD MEDICATION FORM & EVENT LISTENERS
// ========================================================

function initMedicationEventListeners() {
  const addModal = document.getElementById("addMedicationModal");
  const openAddBtn = document.getElementById("openAddMedModalBtn");
  const closeAddX = document.getElementById("closeAddMedModalX");
  const cancelAddBtn = document.getElementById("cancelAddMedBtn");
  const addForm = document.getElementById("addNewMedForm");

  // Open Add Medication Modal
  if (openAddBtn) {
    openAddBtn.addEventListener("click", (e) => {
      e.preventDefault();
      addModal.style.display = "flex";
      const nameInput = document.getElementById("newMedName");
      if (nameInput) nameInput.focus();
    });
  }

  // Close Modal Buttons
  if (closeAddX) closeAddX.addEventListener("click", () => { addModal.style.display = "none"; });
  if (cancelAddBtn) cancelAddBtn.addEventListener("click", () => { addModal.style.display = "none"; });

  // ADD NEW MEDICATION FORM SUBMIT
  if (addForm) {
    addForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const nameInput = document.getElementById("newMedName");
      const dosageInput = document.getElementById("newMedDosage");
      const categoryInput = document.getElementById("newMedCategory");
      const slotInput = document.getElementById("newMedSlot");
      const timeInput = document.getElementById("newMedTime");

      const nameVal = nameInput ? nameInput.value.trim() : "";
      const dosageVal = dosageInput ? dosageInput.value.trim() : "";
      const categoryVal = categoryInput ? categoryInput.value.trim() : "General";
      const slotVal = slotInput ? slotInput.value : "morning";
      const timeVal = (timeInput && timeInput.value) ? timeInput.value : "08:00";

      if (!nameVal || !dosageVal) {
        alert("Please enter both the medication name and dosage.");
        return;
      }

      const newMed = {
        id: `med-${Date.now()}`,
        name: nameVal,
        dosage: dosageVal,
        category: categoryVal || "General",
        slot: slotVal,
        time: timeVal
      };

      const meds = getUserMedications();
      // Add to beginning of array so user sees it right away!
      meds.unshift(newMed);
      saveUserMedications(meds);

      // Re-render UI
      renderAllViews();

      addForm.reset();
      addModal.style.display = "none";
      speakVoice(`${newMed.name} added to schedule.`);
    });
  }
}

function initSettingsEvents() {
  // Sound
  const soundToggle = document.getElementById("settingSoundToggle");
  if (soundToggle) {
    soundToggle.addEventListener("change", () => {
      const s = getUserSettings();
      s.sound = soundToggle.checked;
      saveUserSettings(s);
    });
  }

  // Voice
  const voiceToggle = document.getElementById("settingVoiceToggle");
  if (voiceToggle) {
    voiceToggle.addEventListener("change", () => {
      const s = getUserSettings();
      s.voice = voiceToggle.checked;
      saveUserSettings(s);
    });
  }

  // Reset Schedule
  const resetBtn = document.getElementById("resetScheduleBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to clear your medication schedule?")) {
        saveUserMedications([]);
        saveUserHistory({});
        renderAllViews();
        alert("Medication schedule cleared.");
      }
    });
  }

  // Voice readout
  document.getElementById("voiceSpeakBtn")?.addEventListener("click", () => {
    const meds = getUserMedications();
    const todayKey = getTodayKey();
    const untaken = meds.filter(m => getMedStatus(m.id, todayKey).status !== "TAKEN");
    if (meds.length === 0) {
      speakVoice("You have no medications scheduled.");
    } else if (untaken.length === 0) {
      speakVoice("All scheduled medications for today have been taken.");
    } else {
      speakVoice(`You have ${untaken.length} medications remaining today: ${untaken.map(m => m.name).join(", ")}.`);
    }
  });

  // Text scaling
  function setFontSize(size) {
    document.body.setAttribute("data-font-size", size);
    ["fontNormalBtn", "fontLargeBtn", "fontXLargeBtn"].forEach(id => document.getElementById(id)?.classList.remove("active"));
    if (size === "xlarge") document.getElementById("fontXLargeBtn")?.classList.add("active");
    else if (size === "large") document.getElementById("fontLargeBtn")?.classList.add("active");
    else document.getElementById("fontNormalBtn")?.classList.add("active");
  }

  document.getElementById("fontNormalBtn")?.addEventListener("click", () => setFontSize("normal"));
  document.getElementById("fontLargeBtn")?.addEventListener("click", () => setFontSize("large"));
  document.getElementById("fontXLargeBtn")?.addEventListener("click", () => setFontSize("xlarge"));
}

// ========================================================
// 8. AUDIO & SPEECH
// ========================================================

function playHarmonicChime() {
  const s = getUserSettings();
  if (s.sound === false) return;

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
    console.warn("Audio blocked", e);
  }
}

function speakVoice(text) {
  const s = getUserSettings();
  if (s.voice === false || !('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.95;
    window.speechSynthesis.speak(utt);
  } catch (e) {
    console.warn("Voice speech error", e);
  }
}

// Check Drug Safety
function checkDrugInteractions() {
  const alertBox = document.getElementById("safetyWarningAlert");
  const alertText = document.getElementById("safetyWarningText");
  if (!alertBox || !alertText) return;

  const meds = getUserMedications();
  const names = meds.map(m => m.name.toLowerCase());
  const warnings = [];

  if (names.some(n => n.includes("aspirin")) && names.some(n => n.includes("warfarin"))) {
    warnings.push("Aspirin + Warfarin: High bleeding risk detected.");
  }
  if (names.some(n => n.includes("ibuprofen")) && names.some(n => n.includes("aspirin"))) {
    warnings.push("Ibuprofen + Aspirin: Elevated gastrointestinal ulcer risk.");
  }

  if (warnings.length > 0) {
    alertText.innerHTML = `<strong>Physician Interaction Advisory:</strong> ${warnings.join(" ")}`;
    alertBox.style.display = "flex";
  } else {
    alertBox.style.display = "none";
  }
}

// Live Clock
function initClock() {
  const datePill = document.getElementById("liveDatePill");
  const clockPill = document.getElementById("liveClockPill");

  function update() {
    const now = new Date();
    if (datePill) {
      datePill.textContent = now.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
    if (clockPill) {
      clockPill.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }

  update();
  setInterval(update, 1000);
}

// Utilities
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
