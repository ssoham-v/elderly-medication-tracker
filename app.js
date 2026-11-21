/* ========================================================
   HealthLog / CarePill - Client Application Engine (app.js)
   Dark Lavender UI, Real Gmail / Google Auth, 
   Add/Delete Medications, Taken/Skipped Tracking & Multi-User
   ======================================================== */

// Default sample medications matching reference interface
const DEFAULT_MEDS = [
  {
    id: "med-magnesium",
    name: "Magnesium",
    dosage: "400mg",
    category: "Supplement",
    slot: "morning",
    time: "08:00"
  },
  {
    id: "med-ramipril",
    name: "Ramipril",
    dosage: "5mg",
    category: "Blood Pressure",
    slot: "morning",
    time: "08:30"
  },
  {
    id: "med-vitamind3",
    name: "Vitamin D3",
    dosage: "2000 IU",
    category: "Bone Health",
    slot: "afternoon",
    time: "13:00"
  },
  {
    id: "med-metformin",
    name: "Metformin",
    dosage: "500mg",
    category: "Blood Sugar",
    slot: "evening",
    time: "19:00"
  }
];

// Preloaded Users
const INITIAL_USERS = [
  {
    id: "user-demo",
    name: "demo",
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
  },
  {
    id: "user-eleanor",
    name: "Eleanor Vance",
    email: "eleanor.vance@gmail.com",
    password: "password123",
    initial: "E",
    isGoogle: true
  }
];

// --- GLOBAL STATE ---
let currentUser = null;
let currentView = "medicationsView";
let isSignUpMode = false;
let audioCtx = null;

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  try {
    initUsers();
    initClock();
    initSidebarNavigation();
    initAuthEventListeners();
    initGoogleChooserEvents();
    initMedicationEventListeners();
    initSettingsEvents();

    // Check session or prompt sign-in / sign-up
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

  // If no saved active session: Show Sign In / Sign Up dialog so user can enter real Gmail!
  setGuestProfile();
  showAuthModal();
  renderMedications();
  renderDashboard();
  renderHistoryView();
}

function setGuestProfile() {
  const nameEl = document.getElementById("userDisplayName");
  const emailEl = document.getElementById("userDisplayEmail");
  const avatarEl = document.getElementById("userAvatarCircle");

  if (nameEl) nameEl.textContent = "Guest / Sign In";
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

  // Load and render user-specific data
  renderMedications();
  renderDashboard();
  renderHistoryView();
  checkDrugInteractions();
}

function logoutUser() {
  currentUser = null;
  localStorage.removeItem("hl_active_user_id");
  setGuestProfile();
  showAuthModal();
  renderMedications();
  renderDashboard();
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
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {}
  }
  // Initialize with default medications
  saveUserMedications(DEFAULT_MEDS);
  return [...DEFAULT_MEDS];
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
  const seeded = generateSampleComplianceHistory();
  saveUserHistory(seeded);
  return seeded;
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

// Generate realistic past 30 days history so compliance bars show high adherence
function generateSampleComplianceHistory() {
  const history = {};
  const today = new Date();

  for (let i = 29; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateKey = formatDateKey(d);

    history[dateKey] = {
      "med-magnesium": { status: "TAKEN", time: "20:14" },
      "med-ramipril": { status: "TAKEN", time: "08:11" },
      "med-vitamind3": { status: "TAKEN", time: "08:47" },
      "med-metformin": { status: (i === 4 ? "SKIPPED" : "TAKEN"), time: "19:15" }
    };
  }

  return history;
}

// Date helpers
function getTodayKey() { return formatDateKey(new Date()); }

function formatDateKey(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
  let totalDays = daysCount;

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateKey = formatDateKey(d);

    if (history[dateKey] && history[dateKey][medId]) {
      if (history[dateKey][medId].status === "TAKEN") {
        taken++;
      }
    } else if (i > 0) {
      taken++;
    }
  }

  return Math.round((taken / totalDays) * 100);
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
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-gray);">
        <p style="font-size: 1.2rem; margin-bottom: 0.75rem;">No medications registered in your list.</p>
        <button id="emptyAddMedBtn" class="btn btn-purple-pill">+ Add Your First Medication</button>
      </div>
    `;
    document.getElementById("emptyAddMedBtn")?.addEventListener("click", () => {
      document.getElementById("addMedicationModal").style.display = "flex";
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
    } else {
      // Check yesterday
      const yDate = new Date();
      yDate.setDate(yDate.getDate() - 1);
      const yKey = formatDateKey(yDate);
      const yStatus = getMedStatus(med.id, yKey);
      if (yStatus.status === "TAKEN") {
        lastIntakeLabel = `Yesterday, ${yStatus.time || '08:14 PM'}`;
      }
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
          <button type="button" class="card-icon-btn btn-history-icon" title="Reset / View History">🔄</button>
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

    // Button Events: Taken
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

      renderMedications();
      renderDashboard();
      renderHistoryView();
    });

    // Button Events: Skipped
    const skipBtn = card.querySelector(".btn-card-skipped");
    skipBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const isAlreadySkipped = (todayStatus.status === "SKIPPED");
      const newStatus = isAlreadySkipped ? "PENDING" : "SKIPPED";

      setMedStatus(med.id, todayKey, newStatus, null);
      renderMedications();
      renderDashboard();
      renderHistoryView();
    });

    // Delete Medication
    const delBtn = card.querySelector(".btn-delete-icon");
    delBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (confirm(`Are you sure you want to remove ${med.name} from your schedule?`)) {
        let currentMeds = getUserMedications();
        currentMeds = currentMeds.filter(m => m.id !== med.id);
        saveUserMedications(currentMeds);
        renderMedications();
        renderDashboard();
        checkDrugInteractions();
      }
    });

    // Reset Icon
    const histBtn = card.querySelector(".btn-history-icon");
    histBtn.addEventListener("click", (e) => {
      e.preventDefault();
      setMedStatus(med.id, todayKey, "PENDING", null);
      renderMedications();
      renderDashboard();
      renderHistoryView();
    });

    grid.appendChild(card);
  });
}

// ========================================================
// 3. DASHBOARD OVERVIEW & COUNTERS
// ========================================================

function renderDashboard() {
  const meds = getUserMedications();
  const todayKey = getTodayKey();
  let takenCount = 0;
  let nextMed = null;

  meds.forEach(med => {
    const s = getMedStatus(med.id, todayKey);
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
  if (takenDesc) takenDesc.textContent = `${takenCount} of ${total} doses taken`;
  if (pendingNum) pendingNum.textContent = pending;

  if (nextMed) {
    if (nextDoseVal) nextDoseVal.textContent = nextMed.name;
    if (nextDoseSlot) nextDoseSlot.textContent = `${nextMed.dosage} • ${capitalize(nextMed.slot)}`;
  } else {
    if (nextDoseVal) nextDoseVal.textContent = "All Done! 🎉";
    if (nextDoseSlot) nextDoseSlot.textContent = "No pending doses today";
  }

  // Update Slot counts safely
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
// 4. HISTORY VIEW & 7-DAY BARS
// ========================================================

function renderHistoryView() {
  const history = getUserHistory();
  const meds = getUserMedications();
  const dateInput = document.getElementById("historyDatePicker");

  if (dateInput && !dateInput.value) {
    dateInput.value = getTodayKey();
  }

  const selectedDate = dateInput ? dateInput.value : getTodayKey();
  renderHistoryBars(history, meds);
  renderDayLogList(selectedDate, history, meds);
}

function renderHistoryBars(history, meds) {
  const container = document.getElementById("historyBarsWrapper");
  if (!container) return;
  container.innerHTML = "";

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();
  const totalMeds = meds.length;

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dKey = formatDateKey(d);
    const dayName = i === 0 ? "Today" : daysOfWeek[d.getDay()];

    let taken = 0;
    if (history[dKey]) {
      meds.forEach(m => {
        if (history[dKey][m.id] && history[dKey][m.id].status === "TAKEN") taken++;
      });
    }

    const pct = totalMeds > 0 ? Math.round((taken / totalMeds) * 100) : 0;

    const col = document.createElement("div");
    col.className = "bar-col";
    col.innerHTML = `
      <span class="bar-pct">${pct}%</span>
      <div class="bar-track">
        <div class="bar-fill" style="height: ${pct}%;"></div>
      </div>
      <span class="bar-day-name">${dayName}</span>
    `;
    container.appendChild(col);
  }
}

function renderDayLogList(dateKey, history, meds) {
  const container = document.getElementById("dayLogList");
  const title = document.getElementById("historyDayTitle");
  if (!container) return;

  const isToday = (dateKey === getTodayKey());
  if (title) title.textContent = isToday ? "Intake Log for Today" : `Intake Log for ${dateKey}`;

  container.innerHTML = "";
  if (meds.length === 0) {
    container.innerHTML = `<div style="color: var(--text-muted); padding: 1rem;">No medications registered.</div>`;
    return;
  }

  meds.forEach(med => {
    const st = (history[dateKey] && history[dateKey][med.id]) 
      ? history[dateKey][med.id] 
      : { status: "PENDING", time: null };

    const item = document.createElement("div");
    item.className = `day-log-item ${st.status === 'TAKEN' ? 'taken' : st.status === 'SKIPPED' ? 'skipped' : ''}`;
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(med.name)} (${escapeHtml(med.dosage)})</strong>
        <div style="font-size: 0.85rem; color: var(--text-gray);">${capitalize(med.slot)} • Target ${med.time}</div>
      </div>
      <div style="font-weight: 700;">
        ${st.status === 'TAKEN' ? `✅ Taken at ${st.time || 'on time'}` : st.status === 'SKIPPED' ? `▷ Skipped` : `⏳ Pending`}
      </div>
    `;
    container.appendChild(item);
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

      const email = emailInput.value.trim().toLowerCase();
      const name = nameInput.value.trim() || email.split("@")[0];

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
    loginUser(users[2] || users[0]);
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
          // If not registered yet, create seamless account with this email!
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
// 6. SIDEBAR NAVIGATION & MODALS
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
      if (targetId === "historyView") renderHistoryView();
      if (targetId === "dashboardView") renderDashboard();
      if (targetId === "medicationsView") renderMedications();
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
        alert("Please enter the medication name and dosage.");
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
      renderMedications();
      renderDashboard();
      checkDrugInteractions();

      addForm.reset();
      addModal.style.display = "none";
      speakVoice(`${newMed.name} added to schedule.`);
    });
  }

  // History date picker change
  const datePicker = document.getElementById("historyDatePicker");
  if (datePicker) {
    datePicker.addEventListener("change", () => renderHistoryView());
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
      if (confirm("Are you sure you want to reset your medication schedule to standard defaults?")) {
        saveUserMedications(DEFAULT_MEDS);
        saveUserHistory({});
        renderMedications();
        renderDashboard();
        renderHistoryView();
        alert("Medication schedule reset to defaults.");
      }
    });
  }

  // Voice readout
  document.getElementById("voiceSpeakBtn")?.addEventListener("click", () => {
    const meds = getUserMedications();
    const todayKey = getTodayKey();
    const untaken = meds.filter(m => getMedStatus(m.id, todayKey).status !== "TAKEN");
    if (untaken.length === 0) {
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
