# CarePill — Accessible Elderly Medication Schedule & Adherence Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Repository Size](https://img.shields.io/badge/Repository%20Size-%3C%201%20MB-brightgreen.svg)](#)
[![Deployment](https://img.shields.io/badge/Deployed%20on-GitHub%20Pages-success.svg)](#)
[![Multi-Language](https://img.shields.io/badge/Languages-HTML%20%7C%20CSS%20%7C%20JS%20%7C%20Python%20%7C%20C%2B%2B%20%7C%20Java-orange.svg)](#)

> **Live Website URL:** https://ssoham-v.github.io/elderly-medication-tracker/

---

## 🌟 Problem Statement & Domain: Healthcare

Many individuals, particularly elderly people, struggle to remember daily medication schedules due to cognitive decline, complex multi-drug regimens, or visual and motor impairments. Missed or double doses often lead to severe health complications and avoidable hospitalizations.

**CarePill** is an accessible, human-centered web platform specifically engineered to help senior citizens and their caregivers organize, manage, and track daily medication schedules with confidence, dignity, and ease.

---

## 🚀 Key Features Built for Seniors

1. **Large, High-Contrast Interface (WCAG AAA Compliant)**
   - One-click font scaling: **Normal (18px)**, **Large (22px)**, and **Extra Large (26px)**.
   - High-Contrast Mode for seniors with cataracts, glaucoma, or low vision.
2. **🔊 Text-to-Speech Voice Assistant (Web Speech API)**
   - Reads today's entire medication schedule aloud at a calm, elderly-friendly pace.
3. **🔔 Harmonic Audio Feedback (Web Audio API)**
   - Synthesizes an immediate harmonic two-tone chime when a medication is marked as taken (0 external MP3 files needed, 100% offline).
4. **🌅 Time-Slot Visual Organization**
   - Distinct, color-coded daytime slots: **Morning (Breakfast)**, **Afternoon (Lunch)**, **Evening (Dinner)**, and **Bedtime (Night)**.
5. **⚠️ Drug-Drug Interaction Safety Alert**
   - Built-in clinical alert system warning against dangerous common combinations (e.g., Aspirin + Warfarin, Ibuprofen + Aspirin).
6. **🚨 1-Click Emergency Contacts**
   - Direct telephone links for Ambulance (911/112), Primary Doctor, and Family Caregiver.
7. **💾 Persistent Local Storage**
   - Automatically saves and restores scheduled medicines and taken states across browser restarts.

---

## 🛠️ Multi-Language Architecture (HTML, CSS, JS, Python, C++, Java)

CarePill combines front-facing web ergonomics with robust backend clinical algorithms across 6 core technologies:

| Language | Layer / Component | Location | Role in CarePill |
| :--- | :--- | :--- | :--- |
| **HTML5** | Web Interface | `index.html` | Accessible semantic layout with ARIA landmarks and modals |
| **CSS3** | Visual Design | `style.css` | High-contrast senior theme, large touch targets (52px+), responsive |
| **JavaScript** | Client Engine | `app.js` | Interactive schedule, Web Speech TTS, Web Audio chime synthesis, LocalStorage |
| **Python** | Analytics Engine | `python/adherence_analytics.py` | 7-day adherence statistics, missed-dose clinical risk scoring, JSON report export |
| **C++** | Safety Optimizer | `cpp/schedule_optimizer.cpp` | High-performance drug interaction detector and minimum buffer spacing algorithm |
| **Java** | OOP Scheduler | `java/MedicationScheduler.java` | Object-oriented schedule domain models and automated caregiver alert triggers |

---

## 📁 Repository Structure

```text
carepill-medication-tracker/
│
├── index.html                   # Main Accessible Website (Runs on GitHub Pages)
├── style.css                    # Senior-friendly stylesheet (High contrast & font scaling)
├── app.js                       # Interactive engine, Voice synthesis, Web Audio & persistence
├── .gitignore                   # Excludes binaries to maintain tiny repository size (< 10 MB)
├── README.md                    # Project documentation & submission guide
│
├── python/
│   └── adherence_analytics.py   # Python adherence analytics & clinical reports
│
├── cpp/
│   └── schedule_optimizer.cpp   # C++ drug conflict detection & timeline optimizer
│
└── java/
    └── MedicationScheduler.java # Java enterprise domain models & notification dispatch
```

---

## 💻 How to Run the Backend Modules Locally

### 1. Web Application (Frontend)
Simply double click `index.html` or open it with any web browser (Chrome, Edge, Firefox, Safari).

### 2. Python Adherence Analytics
```bash
python python/adherence_analytics.py
```

### 3. C++ Schedule Optimizer
```bash
# Using g++ (MinGW on Windows or GCC on Linux/macOS)
g++ -std=c++17 cpp/schedule_optimizer.cpp -o optimizer
./optimizer
```

### 4. Java Enterprise Scheduler
```bash
# Compile and execute
javac java/MedicationScheduler.java
java -cp java MedicationScheduler
```

---

## ✅ Submission Rules Compliance Checklist

- [x] **Repository Size:** Under 10 MB (Total project size is ~120 KB, well under 2% of the limit).
- [x] **Public Visibility:** GitHub repository is set to **Public**.
- [x] **Single Branch:** Exactly one branch (`main`).
- [x] **Live URL (Not Localhost):** Hosted directly via **GitHub Pages**.
- [x] **Required Languages Included:** HTML, CSS, JavaScript, Python, C++, and Java.
