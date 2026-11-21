/* ========================================================
   CarePill - Accessible Medication Schedule Manager (app.js)
   Engineered for seniors: Voice assistance, high contrast,
   sound synthesis (Web Audio API), and persistence.
   ======================================================== */

// Default medications tailored for seniors
const DEFAULT_MEDICATIONS = [
  {
    id: "med-1",
    name: "Metformin",
    dosage: "500 mg (1 tablet)",
    slot: "morning",
    time: "08:00",
    food: "With or after food",
    purpose: "Blood Sugar / Diabetes",
    color: "#2563eb",
    isTaken: false,
    takenAt: null
  },
  {
    id: "med-2",
    name: "Lisinopril",
    dosage: "10 mg (1 tablet)",
    slot: "morning",
    time: "08:30",
    food: "With a full glass of water",
    purpose: "Blood Pressure",
    color: "#dc2626",
    isTaken: false,
    takenAt: null
  },
  {
    id: "med-3",
    name: "Calcium + Vitamin D3",
    dosage: "600 mg (1 tablet)",
    slot: "afternoon",
    time: "13:00",
    food: "Take with or after food",
    purpose: "Bone Strength",
    color: "#16a34a",
    isTaken: false,
    takenAt: null
  },
  {
    id: "med-4",
    name: "Atorvastatin",
    dosage: "20 mg (1 tablet)",
    slot: "bedtime",
    time: "21:30",
    food: "Anytime before sleep",
    purpose: "Cholesterol / Heart",
    color: "#7c3aed",
    isTaken: false,
    takenAt: null
  }
];

// State
let medications = [];
let audioCtx = null;

// Initialization
document.addEventListener("DOMContentLoaded", () => {
  loadPreferences();
  loadMedications();
  initClock();
  initEventListeners();
  renderSchedule();
  checkDrugInteractions();
});

// Load medications from localStorage or defaults
function loadMedications() {
  const saved = localStorage.getItem("carepill_meds");
  if (saved) {
    try {
      medications = JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse saved medications, falling back to defaults", e);
      medications = [...DEFAULT_MEDICATIONS];
    }
  } else {
    medications = [...DEFAULT_MEDICATIONS];
    saveMedications();
  }
}

// Save medications to localStorage
function saveMedications() {
  localStorage.setItem("carepill_meds", JSON.stringify(medications));
}

// Render schedule cards into slots
function renderSchedule() {
  const slots = ["morning", "afternoon", "evening", "bedtime"];
  let totalMeds = medications.length;
  let takenCount = 0;

  slots.forEach(slot => {
    const container = document.getElementById(`cards-${slot}`);
    const countBadge = document.getElementById(`count-${slot}`);
    if (!container) return;

    const slotMeds = medications.filter(m => m.slot === slot);
    countBadge.textContent = `${slotMeds.length} ${slotMeds.length === 1 ? 'Pill' : 'Pills'}`;

    if (slotMeds.length === 0) {
      container.innerHTML = `<div class="empty-slot-msg">No medications scheduled for this slot.</div>`;
      return;
    }

    container.innerHTML = "";
    slotMeds.forEach(med => {
      if (med.isTaken) takenCount++;
      const card = createMedCardElement(med);
      container.appendChild(card);
    });
  });

  // Update progress bar
  updateProgress(takenCount, totalMeds);
}

// Create DOM element for a medication card
function createMedCardElement(med) {
  const card = document.createElement("article");
  card.className = `med-card ${med.isTaken ? 'taken' : ''}`;
  card.setAttribute("aria-label", `${med.name}, ${med.dosage}, scheduled for ${med.time}`);

  const statusLabel = med.isTaken 
    ? `✓ Taken at ${med.takenAt || 'today'}` 
    : `✔ Mark as Taken`;

  card.innerHTML = `
    <div class="med-card-top">
      <div class="med-badge-circle" style="background-color: ${med.color || '#2563eb'};" aria-hidden="true">
        💊
      </div>
      <div class="med-title-area">
        <h4 class="med-name">${escapeHtml(med.name)}</h4>
        <div class="med-dosage">${escapeHtml(med.dosage)}</div>
      </div>
      <button class="med-delete-btn" title="Remove ${escapeHtml(med.name)}" aria-label="Delete ${escapeHtml(med.name)}">
        🗑️
      </button>
    </div>

    <div class="med-meta-list">
      <div class="med-meta-item">
        <span>⏰ <strong>Time:</strong> ${med.time || 'Flexible'}</span>
      </div>
      <div class="med-meta-item">
        <span>🍽️ <strong>Instruction:</strong> ${escapeHtml(med.food || 'With water')}</span>
      </div>
      ${med.purpose ? `<div class="med-meta-item"><span class="med-tag">${escapeHtml(med.purpose)}</span></div>` : ''}
    </div>

    <button class="take-action-btn ${med.isTaken ? 'is-taken' : 'untaken'}" aria-pressed="${med.isTaken}">
      ${statusLabel}
    </button>
  `;

  // Event: Toggle taken
  const takeBtn = card.querySelector(".take-action-btn");
  takeBtn.addEventListener("click", () => {
    toggleMedTaken(med.id);
  });

  // Event: Delete
  const delBtn = card.querySelector(".med-delete-btn");
  delBtn.addEventListener("click", () => {
    if (confirm(`Are you sure you want to remove ${med.name} from your schedule?`)) {
      deleteMedication(med.id);
    }
  });

  return card;
}

// Toggle medication taken status
function toggleMedTaken(medId) {
  const med = medications.find(m => m.id === medId);
  if (!med) return;

  med.isTaken = !med.isTaken;
  if (med.isTaken) {
    const now = new Date();
    med.takenAt = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    playSuccessChime();
    speakMessage(`${med.name} marked as taken. Well done!`);
  } else {
    med.takenAt = null;
  }

  saveMedications();
  renderSchedule();
}

// Delete a medication
function deleteMedication(medId) {
  medications = medications.filter(m => m.id !== medId);
  saveMedications();
  renderSchedule();
  checkDrugInteractions();
}

// Update progress bar & stats
function updateProgress(taken, total) {
  const percent = total > 0 ? Math.round((taken / total) * 100) : 0;
  const bar = document.getElementById("progressBarFill");
  const adherenceText = document.getElementById("adherenceText");
  const adherencePercent = document.getElementById("adherencePercent");
  const progressBarBg = document.getElementById("progressBar");

  if (bar) bar.style.width = `${percent}%`;
  if (progressBarBg) progressBarBg.setAttribute("aria-valuenow", percent);
  if (adherenceText) adherenceText.textContent = `${taken} of ${total} medications taken`;
  if (adherencePercent) adherencePercent.textContent = `${percent}% Completed`;
}

// Web Audio API harmonic chime (Synthesized bell, zero MP3 files needed!)
function playSuccessChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // Harmonic two-tone chord (C5 -> E5)
    [523.25, 659.25].forEach((freq, index) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + index * 0.12);

      gain.gain.setValueAtTime(0.001, now + index * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.2, now + index * 0.12 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.12 + 0.6);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now + index * 0.12);
      osc.stop(now + index * 0.12 + 0.65);
    });
  } catch (e) {
    console.warn("Web Audio not supported or blocked", e);
  }
}

// Text-to-Speech (Web Speech API)
function speakMessage(text) {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel(); // cancel any active speaking
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9; // Slightly slower, clear voice for seniors
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn("Speech synthesis error", e);
  }
}

// Read whole today's schedule aloud
function readScheduleAloud() {
  if (medications.length === 0) {
    speakMessage("You have no medications scheduled in your CarePill list.");
    return;
  }

  const untaken = medications.filter(m => !m.isTaken);
  if (untaken.length === 0) {
    speakMessage("Wonderful! You have taken all your scheduled medications for today. Stay healthy!");
    return;
  }

  let text = `Here is your medication reminder. You have ${untaken.length} pills pending today. `;
  
  const morningUntaken = untaken.filter(m => m.slot === "morning");
  if (morningUntaken.length > 0) {
    text += `In the morning: ${morningUntaken.map(m => m.name).join(", ")}. `;
  }

  const afternoonUntaken = untaken.filter(m => m.slot === "afternoon");
  if (afternoonUntaken.length > 0) {
    text += `In the afternoon: ${afternoonUntaken.map(m => m.name).join(", ")}. `;
  }

  const eveningUntaken = untaken.filter(m => m.slot === "evening");
  if (eveningUntaken.length > 0) {
    text += `In the evening: ${eveningUntaken.map(m => m.name).join(", ")}. `;
  }

  const bedtimeUntaken = untaken.filter(m => m.slot === "bedtime");
  if (bedtimeUntaken.length > 0) {
    text += `At bedtime: ${bedtimeUntaken.map(m => m.name).join(", ")}. `;
  }

  speakMessage(text);
}

// Check for drug interactions (Safety Rule Engine)
function checkDrugInteractions() {
  const alertBox = document.getElementById("safetyAlertBox");
  const alertText = document.getElementById("safetyAlertText");
  if (!alertBox || !alertText) return;

  const names = medications.map(m => m.name.toLowerCase().trim());
  
  const warnings = [];

  // Common high-risk interactions
  if (names.some(n => n.includes("aspirin")) && names.some(n => n.includes("warfarin"))) {
    warnings.push("High bleeding risk detected: Aspirin and Warfarin combination should be closely monitored by your physician.");
  }
  if (names.some(n => n.includes("ibuprofen")) && names.some(n => n.includes("aspirin"))) {
    warnings.push("Stomach irritation alert: Taking Ibuprofen with Aspirin increases gastrointestinal ulcer risk.");
  }
  if (names.some(n => n.includes("lisinopril")) && names.some(n => n.includes("potassium"))) {
    warnings.push("Potassium alert: Lisinopril may elevate blood potassium levels when taken with potassium supplements.");
  }

  if (warnings.length > 0) {
    alertText.innerHTML = `<strong>Physician Interaction Advisory:</strong> ${warnings.join(" ")}`;
    alertBox.style.display = "flex";
  } else {
    alertBox.style.display = "none";
  }
}

// Live Clock & Date
function initClock() {
  const dateElem = document.getElementById("liveDate");
  const clockElem = document.getElementById("liveClock");

  function update() {
    const now = new Date();
    if (dateElem) {
      dateElem.textContent = now.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    if (clockElem) {
      clockElem.textContent = now.toLocaleTimeString([], { hour12: true });
    }
  }

  update();
  setInterval(update, 1000);
}

// Event Listeners & Modals
function initEventListeners() {
  // Read schedule aloud
  const readBtn = document.getElementById("readScheduleBtn");
  if (readBtn) {
    readBtn.addEventListener("click", readScheduleAloud);
  }

  // Accessibility: Font Size
  const fontNormal = document.getElementById("fontNormalBtn");
  const fontLarge = document.getElementById("fontLargeBtn");
  const fontXLarge = document.getElementById("fontXLargeBtn");

  function setFontSize(size) {
    document.body.setAttribute("data-font-size", size);
    localStorage.setItem("carepill_font_size", size);
    [fontNormal, fontLarge, fontXLarge].forEach(b => {
      if (b) {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      }
    });
    if (size === "normal" && fontNormal) { fontNormal.classList.add("active"); fontNormal.setAttribute("aria-pressed", "true"); }
    if (size === "large" && fontLarge) { fontLarge.classList.add("active"); fontLarge.setAttribute("aria-pressed", "true"); }
    if (size === "xlarge" && fontXLarge) { fontXLarge.classList.add("active"); fontXLarge.setAttribute("aria-pressed", "true"); }
  }

  if (fontNormal) fontNormal.addEventListener("click", () => setFontSize("normal"));
  if (fontLarge) fontLarge.addEventListener("click", () => setFontSize("large"));
  if (fontXLarge) fontXLarge.addEventListener("click", () => setFontSize("xlarge"));

  // Accessibility: Contrast Mode
  const contrastBtn = document.getElementById("contrastToggle");
  if (contrastBtn) {
    contrastBtn.addEventListener("click", () => {
      const current = document.body.getAttribute("data-theme");
      const next = current === "contrast" ? "light" : "contrast";
      document.body.setAttribute("data-theme", next);
      localStorage.setItem("carepill_theme", next);
      contrastBtn.setAttribute("aria-pressed", next === "contrast");
    });
  }

  // Add Medication Modal
  const addModal = document.getElementById("addMedModal");
  const openAddBtn = document.getElementById("openAddModalBtn");
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
        color: document.getElementById("medColor").value || "#2563eb",
        isTaken: false,
        takenAt: null
      };

      medications.push(newMed);
      saveMedications();
      renderSchedule();
      checkDrugInteractions();

      addForm.reset();
      addModal.style.display = "none";
      speakMessage(`${newMed.name} added to your schedule.`);
    });
  }

  // Emergency Contacts Modal
  const emergencyModal = document.getElementById("emergencyModal");
  const openEmergencyBtn = document.getElementById("openEmergencyBtn");
  const closeEmergencyBtn = document.getElementById("closeEmergencyBtn");
  const closeEmergencyActionBtn = document.getElementById("closeEmergencyActionBtn");

  if (openEmergencyBtn) openEmergencyBtn.addEventListener("click", () => { emergencyModal.style.display = "flex"; });
  if (closeEmergencyBtn) closeEmergencyBtn.addEventListener("click", () => { emergencyModal.style.display = "none"; });
  if (closeEmergencyActionBtn) closeEmergencyActionBtn.addEventListener("click", () => { emergencyModal.style.display = "none"; });

  // Multi-Language Architecture Modal
  const multiLangModal = document.getElementById("multiLangModal");
  const openMultiLangBtn = document.getElementById("openMultiLangBtn");
  const closeMultiLangBtn = document.getElementById("closeMultiLangBtn");
  const closeMultiLangActionBtn = document.getElementById("closeMultiLangActionBtn");

  if (openMultiLangBtn) openMultiLangBtn.addEventListener("click", () => { multiLangModal.style.display = "flex"; });
  if (closeMultiLangBtn) closeMultiLangBtn.addEventListener("click", () => { multiLangModal.style.display = "none"; });
  if (closeMultiLangActionBtn) closeMultiLangActionBtn.addEventListener("click", () => { multiLangModal.style.display = "none"; });

  // Tab switching in Architecture Modal
  const tabs = document.querySelectorAll(".lang-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      const targetId = tab.getAttribute("data-tab");
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add("active");
    });
  });

  // Close modals when clicking backdrop
  window.addEventListener("click", (e) => {
    if (e.target === addModal) addModal.style.display = "none";
    if (e.target === emergencyModal) emergencyModal.style.display = "none";
    if (e.target === multiLangModal) multiLangModal.style.display = "none";
  });
}

// Load saved accessibility preferences
function loadPreferences() {
  const savedSize = localStorage.getItem("carepill_font_size");
  if (savedSize) {
    document.body.setAttribute("data-font-size", savedSize);
    const activeBtn = document.getElementById(
      savedSize === "xlarge" ? "fontXLargeBtn" : savedSize === "large" ? "fontLargeBtn" : "fontNormalBtn"
    );
    if (activeBtn) {
      document.querySelectorAll(".font-controls .a11y-btn").forEach(b => b.classList.remove("active"));
      activeBtn.classList.add("active");
    }
  }

  const savedTheme = localStorage.getItem("carepill_theme");
  if (savedTheme) {
    document.body.setAttribute("data-theme", savedTheme);
    const contrastBtn = document.getElementById("contrastToggle");
    if (contrastBtn) contrastBtn.setAttribute("aria-pressed", savedTheme === "contrast");
  }
}

// Helper: Escape HTML string to avoid injection
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
