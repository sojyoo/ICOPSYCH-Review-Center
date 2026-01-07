# Study Habit Effects on Review Plan (Current Implementation)

This document explains what **actually happens** in the current code when users answer the study habit questions.

## How Study Habits Are Processed

The system reads the 4 composite scores and converts them to boolean flags:
- `usesActiveLearning` = `habitActiveLearning > 0.5` (or legacy `habitActiveTechniques > 0.67`)
- `hasGoodPlanning` = `habitPlanning > 0.67`
- `hasGoodDiscipline` = `habitDiscipline > 0.67`
- `isConfident` = `habitConfidence > 0.67`

**Note**: The system uses **thresholds**, not gradual effects. Values below thresholds have no effect.

---

## 1. Active Learning Score (`habitActiveLearning`)

### Threshold: > 0.5 (50%)

### What It Actually Does:

#### ✅ If Active Learning > 0.5:

**Monday:**
- **Task Type**: Changes from `'lecture'` to `'practice'`
- **Description**: Adds "Use active learning techniques (summarizing, highlighting, concept mapping)"
- **Afternoon Slot**: 
  - Duration: 90 minutes (vs 60 minutes if low)
  - Type: `'practice'` (vs `'review'`)
  - Description: "Complete practice questions **and create concept maps**"

**Tuesday:**
- **Quick Review Session** (if discipline is also high):
  - Type: `'practice'` (vs `'review'`)
  - Description: "Quick active review: **summarize key concepts**"

**Wednesday:**
- **Task Type**: `'practice'` (vs `'lecture'`)
- **Description**: Adds "with active learning techniques" if confident

**Thursday:**
- **Practice Test** (if available hours > 1.5):
  - Description: "Quick practice test **with active review techniques**"

#### ❌ If Active Learning ≤ 0.5:
- All tasks default to `'lecture'` or `'review'` types
- No mention of active techniques in descriptions
- Shorter practice sessions (60 min vs 90 min)

---

## 2. Planning Score (`habitPlanning`)

### Threshold: > 0.67 (67%)

### What It Actually Does:

#### ✅ If Planning > 0.67:

**Monday:**
- **Morning Start**: 8:00 AM (vs 9:00 AM)
- **Afternoon Start**: 1:00 PM (vs 2:00 PM)

**Wednesday:**
- **Start Time**: 9:00 AM (vs 10:00 AM)
- **End Time**: 11:00 AM (vs 11:30 AM)

**Thursday:**
- **Practice Test Start**: 2:00 PM (vs 3:00 PM)
- **Practice Test End**: 2:30 PM (vs 3:20 PM)

#### ❌ If Planning ≤ 0.67:
- Later start times (9:00 AM or 10:00 AM)
- More flexible/flexible scheduling
- No structured time slots

**Note**: Planning only affects **timing**, not content or duration.

---

## 3. Discipline Score (`habitDiscipline`)

### Threshold: > 0.67 (67%)

### What It Actually Does:

#### ✅ If Discipline > 0.67:

**Monday:**
- **Morning Session Duration**: 120 minutes (vs 90 minutes)
- **End Time**: 11:00 AM (vs 10:30 AM)
- **Afternoon End Time**: 3:30 PM (vs 3:00 PM)

**Tuesday:**
- **Extra Review Session**: Adds a 30-minute quick review at 3:00 PM
  - Only if available hours > 1.5
  - Type depends on active learning score

**Thursday:**
- **Practice Test Duration**: 30 minutes (vs 20 minutes)

#### ❌ If Discipline ≤ 0.67:
- Shorter sessions (90 min morning, 20 min practice test)
- No extra review sessions on Tuesday
- Less frequent study blocks

**Note**: Discipline affects **session length and frequency**, not content.

---

## 4. Confidence Score (`habitConfidence`)

### Threshold: > 0.67 (67%)

### What It Actually Does:

#### ✅ If Confidence > 0.67:

**Wednesday:**
- **Session Duration**: 120 minutes (vs 90 minutes)
- **Description**: "Deep dive into [subject] **advanced topics**"
  - Adds "with active learning techniques" if active learning is also high

#### ❌ If Confidence ≤ 0.67:
- **Session Duration**: 90 minutes
- **Description**: "Review [subject] concepts with **focus on challenging areas**"
  - More cautious, less advanced

**Note**: Confidence only affects **Wednesday's session** - no other days.

---

## Combined Effects

### Multiple High Scores:

**Active Learning + Planning:**
- Thursday practice test is added (either one can trigger it)

**Active Learning + Discipline:**
- Tuesday gets extra active review session (both must be high)

**Active Learning + Confidence:**
- Wednesday description mentions "advanced topics with active learning techniques"

**Planning + Discipline:**
- Earlier, longer sessions throughout the week

---

## What Does NOT Happen

❌ **No gradual effects**: Values between 0.5-0.67 for active learning have no effect (threshold is 0.5)
❌ **No ML model integration**: These habits are NOT sent to the ML model for risk prediction (only used for study plan generation)
❌ **No adaptive difficulty**: Confidence doesn't change question difficulty, only Wednesday's description
❌ **No personalized topics**: All users get the same topics, just different descriptions/types
❌ **No scheduling flexibility**: Planning only changes times, not which days you study

---

## Summary Table

| Habit | Threshold | Main Effect | Where Applied |
|-------|-----------|-------------|---------------|
| **Active Learning** | > 0.5 | Task type: practice vs lecture | Monday, Tuesday, Wednesday, Thursday |
| **Planning** | > 0.67 | Earlier start times | Monday, Wednesday, Thursday |
| **Discipline** | > 0.67 | Longer sessions, extra reviews | Monday, Tuesday, Thursday |
| **Confidence** | > 0.67 | Longer Wednesday session, "advanced" description | Wednesday only |

---

## Code Location

All logic is in: `web-app/src/app/api/study-plan/weekly/route.ts`
- Function: `generateDailyPlan()` (lines 384-722)
- Study habit extraction: lines 473-493
- Day-specific logic: lines 495-722


