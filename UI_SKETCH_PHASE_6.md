/**
 * UI SKETCH: Phase 6 — Student Views
 *
 * These are visual layouts for the student-facing features.
 * Render at: /student/dashboard, /:username/:course, /:username/:course/join
 */

// ──────────────────────────────────────────────────────────────────────────
// PAGE: /student/dashboard
// ──────────────────────────────────────────────────────────────────────────

/*
┌─────────────────────────────────────────────────────────────────────────────┐
│ Tripos Press                                              Dashboard | Sign out │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│ My Courses                                              [+ Browse courses]   │
│                                                                               │
│ ┌─────────────────────────────┐  ┌─────────────────────────────┐            │
│ │ Part II Methods            │  │ Part III Analysis           │            │
│ │ Dr. Jane Smith             │  │ Prof. David Jones           │            │
│ │ 24 posts • 3 new           │  │ 18 posts • 0 new            │            │
│ │ [View course]              │  │ [View course]               │            │
│ └─────────────────────────────┘  └─────────────────────────────┘            │
│                                                                               │
│ Recent Updates                                                               │
│ ├─ [NEW] "Lecture 12: Measure Theory" — Part II Methods                     │
│ │        Slides • 2 days ago                                                │
│ │                                                                           │
│ ├─ [NEW] "Problem Sheet 5" — Part III Analysis                              │
│ │        Post • 5 days ago                                                 │
│ │                                                                           │
│ └─ "Fourier Transforms Review" — Part II Methods                            │
│        Post • 2 weeks ago                                                   │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘

Components:
- Course cards (3-column grid): title, instructor, post count, new badge
- Recent posts feed: title, type badge, course name, date, link
*/

// ──────────────────────────────────────────────────────────────────────────
// PAGE: /:username/:course (course landing page)
// ──────────────────────────────────────────────────────────────────────────

/*
┌─────────────────────────────────────────────────────────────────────────────┐
│ Tripos Press                                              Dashboard | Sign out │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│ Part II Methods                                    [Enrolled] [Unenroll]    │
│ Dr. Jane Smith                                                               │
│                                                                               │
│ Advanced calculus, PDEs, and Fourier analysis. This course covers...         │
│                                                                               │
│ ───────────────────────────────────────────────────────────────────────      │
│                                                                               │
│ Unit 1: Fourier Series                                                       │
│ ├─ 1. Lecture 1: Introduction                          [View]  Published     │
│ ├─ 2. Lecture 2: Convergence                           [View]  Published     │
│ ├─ 3. Lecture 3: Fourier Series                        [Slides] Published    │
│ └─ 4. Problem Sheet 1                                  [View]  Published     │
│                                                                               │
│ Unit 2: Fourier Transforms                                                   │
│ ├─ 5. Lecture 4: From Series to Integrals              [View]  Published     │
│ ├─ 6. Lecture 5: Properties                            [View]  Published     │
│ ├─ 7. Problem Sheet 2                                  [View]  Published     │
│ └─ 8. Lecture 6: Applications                          [Slides] Draft*       │
│                                                                               │
│ * Draft posts visible only to professor                                     │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘

Components:
- Header: course title, instructor, description
- Enrollment button: "Enroll" or "Unenroll" (if already enrolled)
- Syllabus with sections, ordered by Post.order
- Each post shows type badge (Post/Slides), status (Published/Draft)
*/

// ──────────────────────────────────────────────────────────────────────────
// PAGE: /:username/:course/join?token=abc123... (enrollment confirmation)
// ──────────────────────────────────────────────────────────────────────────

/*
┌─────────────────────────────────────────────────────────────────────────────┐
│ Tripos Press                                              Dashboard | Sign out │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│ Join Course                                                                  │
│                                                                               │
│ Part II Methods                                                              │
│ Dr. Jane Smith                                                               │
│                                                                               │
│ Advanced calculus, PDEs, and Fourier analysis...                             │
│                                                                               │
│ ┌─────────────────────────────────────────┐                                │
│ │                                         │                                │
│ │      [Confirm enrollment]               │                                │
│ │                                         │                                │
│ └─────────────────────────────────────────┘                                │
│                                                                               │
│ By confirming, you'll have access to all posts in this course and see      │
│ updates in your dashboard.                                                   │
│                                                                               │
│ [Cancel]                                                                     │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘

Flow:
- Unauthenticated user clicks join link → redirect to sign in
- After sign in, redirect back to join page with token
- Authenticated user clicks [Confirm enrollment] → POST /api/enroll with token
- On success, redirect to course page
- User now sees course in their dashboard
*/

// ──────────────────────────────────────────────────────────────────────────
// PROFESSOR UI: Generate enrollment token (on course settings or dashboard)
// ──────────────────────────────────────────────────────────────────────────

/*
┌─────────────────────────────────────────────────────────────────────────────┐
│ Dashboard › Part II Methods › Enrollment                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│ Share this link with students:                                              │
│                                                                               │
│ https://tripos.press/austen/part-ii-methods/join?token=eyJ0eXA...Qg    ✓  │
│ [Copy]                                                                       │
│                                                                               │
│ Token expires: 7 days (March 30)                                            │
│ Enrolled students: 42                                                        │
│                                                                               │
│ ┌─────────────────────────────────┐                                        │
│ │ [Regenerate new token]          │                                        │
│ └─────────────────────────────────┘                                        │
│                                                                               │
│ Visibility: ENROLLED (only enrolled students see this course)               │
│ [Change to PUBLIC]                                                           │
│                                                                               │
│ Enrolled students:                                                           │
│ • alice@example.com (enrolled 2 weeks ago)                                  │
│ • bob@example.com (enrolled 1 week ago)                                     │
│ ...                                                                          │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
*/

export default {}
