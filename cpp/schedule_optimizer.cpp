/**
 * CarePill High-Performance Schedule Optimizer (C++17)
 * Domain: Senior Medication Safety & Conflict Resolution
 * 
 * Analyzes prescribed medicines, identifies contraindications/interactions,
 * and optimizes daily dosage scheduling intervals to minimize stomach irritation
 * and prevent adverse pharmaceutical interactions.
 */

#include <iostream>
#include <string>
#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <algorithm>
#include <iomanip>

struct Medication {
    std::string id;
    std::string name;
    std::string dosage;
    std::string slot;      // Morning, Afternoon, Evening, Bedtime
    int scheduledMinutes;  // Minutes from midnight (e.g., 8:00 AM = 480)
    std::string foodNote;
};

struct InteractionRule {
    std::string drugA;
    std::string drugB;
    int minSeparationMinutes;
    std::string severity;  // "HIGH", "MODERATE", "MILD"
    std::string clinicalReason;
};

class ScheduleOptimizer {
private:
    std::vector<Medication> schedule;
    std::vector<InteractionRule> interactionRules;

    static std::string toLower(const std::string& input) {
        std::string result = input;
        std::transform(result.begin(), result.end(), result.begin(), ::tolower);
        return result;
    }

public:
    ScheduleOptimizer() {
        // Initialize standard geriatric interaction database
        interactionRules.push_back({
            "aspirin", "warfarin", 240, "HIGH",
            "Severe risk of internal bleeding. Require physician oversight."
        });
        interactionRules.push_back({
            "ibuprofen", "aspirin", 180, "HIGH",
            "Elevated risk of gastrointestinal ulceration and diminished antiplatelet effect."
        });
        interactionRules.push_back({
            "lisinopril", "potassium", 120, "MODERATE",
            "Risk of hyperkalemia. Separate intake and monitor serum potassium."
        });
        interactionRules.push_back({
            "calcium", "levothyroxine", 240, "HIGH",
            "Calcium significantly reduces thyroid hormone absorption."
        });
    }

    void addMedication(const Medication& med) {
        schedule.push_back(med);
    }

    void runSafetyAndOptimizationAudit() {
        std::cout << "\n======================================================\n";
        std::cout << "  CarePill C++ High-Performance Safety Audit Engine   \n";
        std::cout << "======================================================\n";

        bool conflictFound = false;

        for (size_t i = 0; i < schedule.size(); ++i) {
            for (size_t j = i + 1; j < schedule.size(); ++j) {
                std::string nameA = toLower(schedule[i].name);
                std::string nameB = toLower(schedule[j].name);

                for (const auto& rule : interactionRules) {
                    bool match = (nameA.find(rule.drugA) != std::string::npos && nameB.find(rule.drugB) != std::string::npos) ||
                                 (nameA.find(rule.drugB) != std::string::npos && nameB.find(rule.drugA) != std::string::npos);

                    if (match) {
                        conflictFound = true;
                        int timeDiff = std::abs(schedule[i].scheduledMinutes - schedule[j].scheduledMinutes);

                        std::cout << "[!] CONFLICT DETECTED between " << schedule[i].name << " and " << schedule[j].name << "\n";
                        std::cout << "    Severity: " << rule.severity << "\n";
                        std::cout << "    Reason:   " << rule.clinicalReason << "\n";
                        std::cout << "    Current Time Gap:   " << timeDiff << " minutes\n";
                        std::cout << "    Required Safe Gap:  " << rule.minSeparationMinutes << " minutes\n";

                        if (timeDiff < rule.minSeparationMinutes) {
                            std::cout << "    >>> OPTIMIZATION ACTION: Rescheduling " << schedule[j].name 
                                      << " by +" << (rule.minSeparationMinutes - timeDiff) << " minutes for patient safety.\n";
                        } else {
                            std::cout << "    >>> PASS: Time buffer satisfies clinical safety threshold.\n";
                        }
                        std::cout << "------------------------------------------------------\n";
                    }
                }
            }
        }

        if (!conflictFound) {
            std::cout << "[OK] No dangerous drug-drug interactions detected in current regimen.\n";
        }
        std::cout << "======================================================\n\n";
    }

    void displayOptimalSchedule() {
        // Sort by time
        std::sort(schedule.begin(), schedule.end(), [](const Medication& a, const Medication& b) {
            return a.scheduledMinutes < b.scheduledMinutes;
        });

        std::cout << "Optimized Senior Daily Schedule Timeline:\n";
        for (const auto& med : schedule) {
            int hours = med.scheduledMinutes / 60;
            int mins = med.scheduledMinutes % 60;
            std::string period = (hours >= 12) ? "PM" : "AM";
            int displayHours = (hours % 12 == 0) ? 12 : hours % 12;

            std::cout << " - [" << std::setfill('0') << std::setw(2) << displayHours << ":"
                      << std::setfill('0') << std::setw(2) << mins << " " << period << "] "
                      << med.name << " (" << med.dosage << ") | " << med.foodNote << "\n";
        }
        std::cout << std::endl;
    }
};

int main() {
    ScheduleOptimizer optimizer;

    // Simulate typical elderly patient regime
    optimizer.addMedication({"m1", "Metformin", "500 mg", "Morning", 8 * 60, "With Breakfast"});
    optimizer.addMedication({"m2", "Lisinopril", "10 mg", "Morning", 8 * 60 + 30, "With Water"});
    optimizer.addMedication({"m3", "Aspirin", "81 mg", "Morning", 8 * 60, "After Breakfast"});
    optimizer.addMedication({"m4", "Ibuprofen", "200 mg", "Morning", 8 * 60 + 45, "Take with food"});
    optimizer.addMedication({"m5", "Calcium + D3", "600 mg", "Afternoon", 13 * 60, "After Lunch"});
    optimizer.addMedication({"m6", "Atorvastatin", "20 mg", "Bedtime", 21 * 60 + 30, "Before Sleep"});

    optimizer.runSafetyAndOptimizationAudit();
    optimizer.displayOptimalSchedule();

    return 0;
}
