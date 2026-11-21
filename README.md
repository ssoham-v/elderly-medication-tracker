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

## 🚀 Key Modules & Capabilities

### A. Redesigned Dashboard
- **Real-Time Adherence Tracking:** Accurate completion percentage and counter (no fake streaks).
- **Pending Doses Counter:** Immediate visual count of remaining pills for today.
- **Next Upcoming Dose:** Proactively highlights the next due medicine and time slot.
- **Time-Slot Organization:** Color-coded slots (**Morning**, **Afternoon**, **Evening**, **Bedtime**).
- **Daily Status Reset:** Automatically resets taken states each calendar day (`YYYY-MM-DD`) while preserving full historical records.

### B. Comprehensive History & Adherence System
- **7-Day Visual Adherence Graph:** Interactive bar chart displaying on-time compliance percentages for the past week.
- **Calendar & Date Selector:** Browse any past day to audit taken vs. pending doses.
- **Timestamped Audit Logs:** Records the exact time each medication was marked as taken.

### C. Multi-User Authentication & Data Privacy
- **User-Isolated Storage:** Different users sign in with their own credentials and access strictly isolated schedules and logs.
- **Authentication Options:** Continue with Google, email sign-in, password recovery, or quick 1-click Demo Profiles.
- **Account Data Control:** Reset or reconfigure schedules anytime per user.

### D. Settings & Senior Accessibility
- **Audio & Sound Controls:** Manage harmonic Web Audio chimes on/off.
- **Voice Assistance:** Toggle Web Speech API voice guidance on/off.
- **Color Themes:** Light Clean Theme, Dark Mode, and High Contrast (WCAG AAA Senior Mode).
- **Typography Scaling:** Standard (18px), Large (22px), and Extra Large (26px) with automatic persistence.
- **🇮🇳 India Emergency Helplines:** Integrated 1-click calls for **112** (National Emergency), **108** (Ambulance), and **14567** (Elderline - Senior Citizen Helpline).

---

## 🛠️ Multi-Language Architecture (HTML, CSS, JS, Python, C++, Java)

CarePill combines front-facing web ergonomics with robust backend clinical algorithms across 6 core technologies:

| Language | Layer / Component | Location | Role in CarePill |
| :--- | :--- | :--- | :--- |
| **HTML5** | Web Interface | `index.html` | Accessible semantic layout with ARIA landmarks, views, and modals |
| **CSS3** | Visual Design | `style.css` | Senior ergonomic styling, WCAG AAA contrast, responsive grid |
| **JavaScript** | Client Engine | `app.js` | Multi-user isolation, daily auto-reset, speech/audio synthesis |
| **Python** | Analytics Engine | `python/adherence_analytics.py` | 7-day adherence statistics, clinical risk scoring, JSON report export |
| **C++** | Safety Optimizer | `cpp/schedule_optimizer.cpp` | High-performance drug interaction conflict checker and time buffer spacing |
| **Java** | OOP Scheduler | `java/MedicationScheduler.java` | Object-oriented schedule domain models and emergency alert triggers |

---

## 📁 Repository Structure

```text
elderly-medication-tracker/
│
├── index.html                   # Main Accessible Website (Runs on GitHub Pages)
├── style.css                    # Senior-friendly stylesheet (High contrast & font scaling)
├── app.js                       # Multi-user isolation, daily reset, voice & audio engine
├── .gitignore                   # Excludes binaries to maintain tiny repository size (< 10 MB)
├── README.md                    # Project documentation & live submission link
│
├── python/
│   └── adherence_analytics.py   # Python adherence analytics & clinical reports
│
├── cpp/
│   └── schedule_optimizer.cpp   # C++ drug conflict detection & timeline optimizer
│
└── java/
    └── MedicationScheduler.java # Java enterprise domain models & caregiver alerts
```

---

## 💻 How to Run the Backend Modules Locally

### 1. Web Application (Frontend)
Simply double click `index.html` or open it with any web browser (Chrome, Edge, Firefox, Brave, Safari).

### 2. Python Adherence Analytics
```bash
python python/adherence_analytics.py
```

### 3. C++ Schedule Optimizer
```bash
g++ -std=c++17 cpp/schedule_optimizer.cpp -o optimizer
./optimizer
```

### 4. Java Enterprise Scheduler
```bash
javac java/MedicationScheduler.java
java -cp java MedicationScheduler
```

---

## ✅ Submission Rules Compliance Checklist

- [x] **Repository Size:** Under 10 MB (Total project size is ~85 KB, under 1% of the limit).
- [x] **Public Visibility:** GitHub repository is set to **Public**.
- [x] **Single Branch:** Exactly one branch (`main`).
- [x] **Live URL (Not Localhost):** Hosted directly via **GitHub Pages**.
- [x] **Required Languages Included:** HTML, CSS, JavaScript, Python, C++, and Java.
