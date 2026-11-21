/**
 * CarePill Enterprise Medication Scheduler (Java 17)
 * Domain: Senior Medication Adherence & Caregiver Notification Dispatch
 * 
 * Implements object-oriented scheduling models, adherence state transitions,
 * and automated escalation alerts to emergency caregivers for overdue doses.
 */

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

public class MedicationScheduler {

    public enum TimeSlot {
        MORNING("07:00 - 10:00", "Breakfast"),
        AFTERNOON("12:00 - 14:00", "Lunch"),
        EVENING("18:00 - 20:00", "Dinner"),
        BEDTIME("21:00 - 23:00", "Before Sleep");

        private final String window;
        private final String mealContext;

        TimeSlot(String window, String mealContext) {
            this.window = window;
            this.mealContext = mealContext;
        }

        public String getWindow() { return window; }
        public String getMealContext() { return mealContext; }
    }

    public static class MedicationItem {
        private final String id;
        private final String name;
        private final String dosage;
        private final TimeSlot slot;
        private final LocalTime scheduledTime;
        private final String dietaryInstruction;
        private boolean isTaken;
        private LocalTime takenAt;

        public MedicationItem(String id, String name, String dosage, TimeSlot slot, LocalTime scheduledTime, String dietaryInstruction) {
            this.id = id;
            this.name = name;
            this.dosage = dosage;
            this.slot = slot;
            this.scheduledTime = scheduledTime;
            this.dietaryInstruction = dietaryInstruction;
            this.isTaken = false;
            this.takenAt = null;
        }

        public void markAsTaken(LocalTime time) {
            this.isTaken = true;
            this.takenAt = time;
        }

        public boolean isOverdue(LocalTime currentTime, int gracePeriodMinutes) {
            if (isTaken) return false;
            LocalTime deadline = scheduledTime.plusMinutes(gracePeriodMinutes);
            return currentTime.isAfter(deadline);
        }

        public String getId() { return id; }
        public String getName() { return name; }
        public String getDosage() { return dosage; }
        public TimeSlot getSlot() { return slot; }
        public LocalTime getScheduledTime() { return scheduledTime; }
        public String getDietaryInstruction() { return dietaryInstruction; }
        public boolean isTaken() { return isTaken; }
        public LocalTime getTakenAt() { return takenAt; }
    }

    public static class CaregiverNotificationService {
        public static void dispatchMissedDoseAlert(String caregiverName, String patientName, MedicationItem med) {
            System.out.println("[CAREGIVER ALERT DISPATCHED]");
            System.out.println("  -> Target: " + caregiverName + " (+91 98765 43210)");
            System.out.println("  -> Urgent Notice: Patient " + patientName + " has not taken " 
                               + med.getName() + " (" + med.getDosage() + ") scheduled for " 
                               + med.getScheduledTime().format(DateTimeFormatter.ofPattern("hh:mm a")) + ".");
            System.out.println("  -> Escalation Support: National Emergency 112 / Ambulance 108 / Elderline 14567");
        }
    }

    public static void main(String[] args) {
        System.out.println("============================================================");
        System.out.println("  CarePill Enterprise Medication Scheduler (Java Service)   ");
        System.out.println("============================================================");

        List<MedicationItem> seniorSchedule = new ArrayList<>();
        seniorSchedule.add(new MedicationItem("m1", "Metformin", "500 mg", TimeSlot.MORNING, LocalTime.of(8, 0), "With breakfast"));
        seniorSchedule.add(new MedicationItem("m2", "Lisinopril", "10 mg", TimeSlot.MORNING, LocalTime.of(8, 30), "With water"));
        seniorSchedule.add(new MedicationItem("m3", "Calcium + D3", "600 mg", TimeSlot.AFTERNOON, LocalTime.of(13, 0), "With lunch"));
        seniorSchedule.add(new MedicationItem("m4", "Atorvastatin", "20 mg", TimeSlot.BEDTIME, LocalTime.of(21, 30), "Before sleep"));

        // Simulate patient taking Morning meds
        seniorSchedule.get(0).markAsTaken(LocalTime.of(8, 15));
        seniorSchedule.get(1).markAsTaken(LocalTime.of(8, 35));

        // Simulate check at 2:30 PM (14:30)
        LocalTime currentSimulatedTime = LocalTime.of(14, 30);
        int gracePeriodMinutes = 60; // 1 hour grace period

        System.out.println("Current Time: " + currentSimulatedTime.format(DateTimeFormatter.ofPattern("hh:mm a")));
        System.out.println("Checking adherence across " + seniorSchedule.size() + " scheduled medications...\n");

        for (MedicationItem med : seniorSchedule) {
            String status = med.isTaken() 
                ? "[TAKEN at " + med.getTakenAt().format(DateTimeFormatter.ofPattern("hh:mm a")) + "]"
                : "[PENDING]";

            System.out.println(String.format(" - %-18s %-10s Slot: %-10s %s", 
                med.getName(), med.getDosage(), med.getSlot(), status));

            if (med.isOverdue(currentSimulatedTime, gracePeriodMinutes)) {
                System.out.println("   >>> STATUS: OVERDUE by >" + gracePeriodMinutes + " minutes!");
                CaregiverNotificationService.dispatchMissedDoseAlert(
                    "Alex (Family Caregiver)", "Eleanor Vance", med
                );
            }
        }

        System.out.println("\n============================================================");
        System.out.println("All scheduler rules evaluated successfully.");
        System.out.println("============================================================");
    }
}
