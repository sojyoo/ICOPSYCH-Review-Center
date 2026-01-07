# Study Plan Responsiveness to User Answers

## Summary

**Study Habits**: ❌ **NO gradual changes** - Binary thresholds only
**Daily Availability**: ✅ **YES gradual changes** - Exact hours used
**Weekly Study Goal**: ✅ **YES gradual changes** - Exact hours used

---

## 1. Study Habits - Binary Thresholds Only ❌

### Current Implementation:
The system converts study habit scores to **boolean flags** using fixed thresholds:

```javascript
const usesActiveLearning = activeLearning > 0.5  // Threshold: 0.5
const hasGoodPlanning = planning > 0.67          // Threshold: 0.67
const hasGoodDiscipline = discipline > 0.67       // Threshold: 0.67
const isConfident = confidence > 0.67             // Threshold: 0.67
```

### What This Means:

**Active Learning:**
- **0.0 - 0.5**: Same effect (lecture type, no active techniques)
- **0.51 - 1.0**: Same effect (practice type, active techniques)
- **No difference between 0.51 and 1.0** - both get the same plan

**Planning:**
- **0.0 - 0.67**: Same effect (later start times: 9:00 AM or 10:00 AM)
- **0.68 - 1.0**: Same effect (earlier start times: 8:00 AM or 9:00 AM)
- **No difference between 0.68 and 1.0** - both get the same plan

**Discipline:**
- **0.0 - 0.67**: Same effect (90 min sessions, no extra reviews)
- **0.68 - 1.0**: Same effect (120 min sessions, extra reviews)
- **No difference between 0.68 and 1.0** - both get the same plan

**Confidence:**
- **0.0 - 0.67**: Same effect (90 min Wednesday, "challenging areas")
- **0.68 - 1.0**: Same effect (120 min Wednesday, "advanced topics")
- **No difference between 0.68 and 1.0** - both get the same plan

### Example:
- User A: Active Learning = 0.51 → Gets practice tasks
- User B: Active Learning = 0.99 → Gets **exact same** practice tasks
- User C: Active Learning = 0.49 → Gets lecture tasks (different from A & B)

---

## 2. Daily Availability - Gradual Changes ✅

### Current Implementation:
The system uses the **exact hours** you specify for each day:

```javascript
// Line 432: Uses exact hours from dailyAvailability
dayHours.push(parseFloat(dailyAvailability[dayKey]) || 0)

// Line 458: Uses exact value for that day
dayHoursAvailable = dayHours[day]
```

### What This Means:

**Monday:**
- **0 hours**: No study tasks on Monday
- **1 hour**: 1 hour of study tasks
- **2 hours**: 2 hours of study tasks
- **4 hours**: 4 hours of study tasks
- **Gradual scaling** - each hour you add increases the study time

**All Days:**
- Each day's hours are used **independently**
- If you set Monday = 2h, Tuesday = 4h, Wednesday = 1h:
  - Monday gets 2 hours of tasks
  - Tuesday gets 4 hours of tasks
  - Wednesday gets 1 hour of tasks

### Example:
- User A: Monday = 1.5h → Gets 1.5 hours of tasks on Monday
- User B: Monday = 3.0h → Gets 3.0 hours of tasks on Monday (double!)
- User C: Monday = 0.5h → Gets 0.5 hours of tasks on Monday

---

## 3. Weekly Study Goal - Gradual Changes ✅

### Current Implementation:
The system uses the **exact goal** you specify:

```javascript
// Line 159-164: Uses exact weeklyStudyGoal value
if (totalAvailableHours >= weeklyStudyGoal) {
  recommendedHours = weeklyStudyGoal  // Uses exact value
} else {
  recommendedHours = totalAvailableHours
}
```

### What This Means:

**Total Weekly Hours:**
- **10 hours goal**: System allocates up to 10 hours/week
- **15 hours goal**: System allocates up to 15 hours/week
- **20 hours goal**: System allocates up to 20 hours/week
- **Gradual scaling** - each hour you add increases total weekly hours

**Caveat:**
- If your **Total Available Hours** < **Weekly Study Goal**:
  - System uses **Total Available Hours** instead (and warns you)
- Example: Goal = 15h, Available = 12h → System uses 12h

### Example:
- User A: Goal = 10h, Available = 15h → Gets 10 hours/week
- User B: Goal = 15h, Available = 15h → Gets 15 hours/week (50% more!)
- User C: Goal = 20h, Available = 12h → Gets 12 hours/week (limited by availability)

---

## Visual Comparison

### Study Habits (Binary):
```
Active Learning Score → Plan Changes
0.0 ────────────────────┐
0.1 ────────────────────┤
0.2 ────────────────────┤  Same Plan A
0.3 ────────────────────┤
0.4 ────────────────────┤
0.5 ────────────────────┤
0.51 ───────────────────┼─┐
0.6 ────────────────────┤ │
0.7 ────────────────────┤ │  Same Plan B
0.8 ────────────────────┤ │
0.9 ────────────────────┤ │
1.0 ────────────────────┘ │
```

### Daily Availability (Gradual):
```
Monday Hours → Plan Changes
0.0h ──────── Plan A (0 tasks)
0.5h ──────── Plan B (0.5h tasks)
1.0h ──────── Plan C (1h tasks)
1.5h ──────── Plan D (1.5h tasks)
2.0h ──────── Plan E (2h tasks)
... (continuous scaling)
```

### Weekly Study Goal (Gradual):
```
Weekly Goal → Plan Changes
5h ───────── Plan A (5h/week)
10h ──────── Plan B (10h/week)
15h ──────── Plan C (15h/week)
20h ──────── Plan D (20h/week)
... (continuous scaling)
```

---

## Code References

**Study Habits (Binary):**
- File: `web-app/src/app/api/study-plan/weekly/route.ts`
- Lines: 473-487
- Logic: Converts to boolean flags

**Daily Availability (Gradual):**
- File: `web-app/src/app/api/study-plan/weekly/route.ts`
- Lines: 428-433, 458
- Logic: Uses exact hours per day

**Weekly Study Goal (Gradual):**
- File: `web-app/src/app/api/study-plan/weekly/route.ts`
- Lines: 152-172
- Logic: Uses exact goal value

---

## Recommendations

If you want **gradual effects** for study habits, you would need to:

1. **Remove binary thresholds** - Use the actual score values
2. **Scale effects proportionally** - e.g., `sessionDuration = 90 + (discipline * 30)` instead of `hasGoodDiscipline ? 120 : 90`
3. **Use score ranges** - e.g., `if (activeLearning > 0.8) { ... } else if (activeLearning > 0.5) { ... } else { ... }`

Currently, the system only has **gradual responsiveness** for time-related preferences (availability and goals), not for study habit preferences.


