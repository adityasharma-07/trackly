# Restaurant Seating Management System

_Started 2026-06-06 07:42 UTC_

---

## User

<system-info comment="Only acknowledge these if relevant">
Project title is now "Trackly"
Project is currently empty (no files)
Current date is now June 6, 2026
</system-info>

<default aesthetic_system_instructions>
The user has not attached a design system. If they have ALSO not attached references or art direction, and the project is empty, you must ASK the user what visual aesthetic they want. Use the questions_v2 tool to ask about preferred vibe, audience, colors, type, mood, etc. Do NOT just pick your own visual aesthetic without getting the user's aesthetic input -- this is how you get slop!

Once answered, use this guidance when creating designs:
- Choose a type pairing from web-safe set or Google Fonts. Helvetica is a good choice. Avoid hard-to-read or overly stylized fonts. Use 1-3 fonts only.
- Foreground and background: choose a color tone (warm, cool, neutral, something in-between). Use subtly-toned whites and blacks; avoid saturations above 0.02 for whites.
- Accents: choose 0-2 additional accent colors using oklch. All accents should share same chroma and lightness; vary hue.
- NEVER write out an SVG yourself that's more complicated than a square, circle, diamond, etc.
- For imagery, never hand-draw SVGs; use subtly-striped SVG placeholders instead with monospace explainers for what should be dropped there (e.g. “product shot”)

CRITICAL: ignore default aesthetic entirely if given other aesthetic instructions like reference images, design systems or guidance, or if there are files in the project already.
</default aesthetic_system_instructions>

<pasted_text name="Pasted text (671 lines)">
# Product Specification: Table Occupancy Tracking Software

## Product Name

**TableTrack**
Alternative names: **SeatSense**, **OpenTableView**, **TableVision**, **Sitely**, **SeatMap AI**

## Product Vision

TableTrack is a real-time table occupancy tracking platform for businesses and institutions that need to help customers, students, guests, or visitors quickly find available seating.

The software connects to existing or dedicated camera feeds, analyzes table areas using computer vision, and displays a simple live seating availability interface. The goal is to reduce the time people spend walking around looking for a seat and help venues manage seating flow more efficiently.

This product should be designed as a professional B2B software platform that can be marketed to restaurants, cafes, university dining halls, libraries, food courts, coworking spaces, airport lounges, hotel dining areas, and other shared seating environments.

---

# Core Problem

Many businesses and public venues have seating areas where customers often struggle to find an open table, especially during busy hours.

Examples:

* University students walking around dining halls searching for seats
* Cafe customers unsure if there is seating before ordering
* Food court visitors trying to find tables during lunch rush
* Library visitors looking for open study tables
* Restaurant staff trying to understand table usage and turnover
* Event venues needing real-time seating awareness

The current process is manual and inefficient. People physically scan the room, walk between tables, ask others if seats are taken, or leave because they assume there is no space.

TableTrack solves this by turning camera feeds into anonymous, real-time table availability data.

---

# Product Goal

The goal is to build a software platform that allows a venue to:

1. Connect a webcam, IP camera, or video feed.
2. Define table zones within the camera view.
3. Automatically classify each table as:

   * Available
   * Occupied
   * Partially occupied
   * Unknown / needs review
4. Display the results on a clean live seating map.
5. Provide a customer-facing interface showing where seating is available.
6. Provide an admin-facing interface for setup, calibration, analytics, and monitoring.

The product should feel like a serious commercial tool, not just a computer vision demo.

---

# Target Customers

The software should be usable by many types of organizations.

## Primary Customers

* Restaurants
* Cafes
* University dining halls
* Campus food courts
* Libraries
* Coworking spaces
* Corporate cafeterias
* Airport lounges
* Hotel breakfast areas
* Shopping mall food courts

## End Users

The end users are the people trying to find a place to sit.

Examples:

* Students
* Customers
* Guests
* Employees
* Visitors
* Staff members

---

# Product Value Proposition

TableTrack helps venues improve seating visibility, reduce congestion, and create a smoother customer experience by showing real-time table availability.

## For Customers

* Find open tables faster
* Avoid walking around crowded spaces
* Know whether seating is available before entering
* Find seating suitable for individuals or groups

## For Businesses

* Improve customer experience
* Reduce crowding and confusion
* Increase seating efficiency
* Help staff understand table turnover
* Collect anonymous occupancy analytics
* Reduce customer frustration during peak hours

---

# Main Product Concept

The venue installs or connects a camera facing a seating area. The admin opens the setup dashboard and draws table zones over the camera view. Each zone represents a table or seating area.

The computer vision system analyzes the video feed and checks whether people are present inside or near each table zone. The software then updates the table’s live status.

The customer-facing interface shows a simplified map, not the raw camera feed.

Example:

* Green table = Available
* Yellow table = Partially occupied
* Red table = Occupied
* Gray table = Unknown / camera blocked

The customer should never need to see live video footage. They only need to see seating availability.

---

# Key Features

## 1. Camera Connection

The software should support:

* Built-in webcam
* USB webcam
* IP camera feed
* RTSP camera stream
* Uploaded test video for demo mode

For the first version, webcam and uploaded video support are enough. Later versions can support IP camera streams.

---

## 2. Table Zone Setup

Admins should be able to define table areas manually.

The interface should allow the admin to:

* Open the camera feed
* Draw a rectangle or polygon around each table
* Name each table, such as “Table 1” or “Window Table”
* Set table capacity, such as 2 seats, 4 seats, or 6 seats
* Save the table layout
* Edit or delete table zones later

This avoids needing the AI to automatically detect tables at first. Manual table setup is more reliable and easier to launch.

---

## 3. Occupancy Detection

The system should detect people in the camera feed using a computer vision model such as YOLO.

Basic logic:

* If a person overlaps with a table zone, the table is occupied.
* If no person overlaps with the table zone, the table is available.
* If detection confidence is low, mark the table as unknown.
* If someone passes by briefly, do not immediately mark the table occupied.

The software should use a time threshold to avoid false positives.

Example:

* Person appears in table zone for less than 2 seconds → ignore
* Person remains in table zone for 3+ seconds → mark occupied
* No person detected for 5+ seconds → mark available

---

## 4. Table Status Categories

Each table should have one of these states:

### Available

No person is detected in the table zone.

### Occupied

One or more people are detected at the table.

### Partially Occupied

The table has a known capacity and fewer people are detected than the total number of seats.

Example:

A 4-seat table with 1 detected person could be marked partially occupied.

### Unknown

The software is unsure because:

* Camera view is blocked
* Detection confidence is low
* Lighting is poor
* Table zone is partially out of frame

---

## 5. Customer-Facing Seating Map

The customer-facing interface should be simple and clean.

It should show:

* Venue name
* Seating area name
* Live seating map
* Table statuses
* Last updated time
* Legend explaining colors
* Optional filter for group size

Example:

```text
Main Dining Area

Green = Available
Yellow = Partially Occupied
Red = Occupied
Gray = Unknown

[Live visual floor map]
```

Customers should be able to quickly answer:

“Where can I sit right now?”

---

## 6. Admin Dashboard

The admin dashboard should include:

* Camera feed preview
* Table zone editor
* Live detection status
* Table status list
* Detection confidence
* Ability to pause/resume detection
* Ability to recalibrate table zones
* Basic analytics

Admin table list example:

```text
Table 1 | Available | Confidence: 94%
Table 2 | Occupied | Confidence: 89%
Table 3 | Partially Occupied | Confidence: 76%
Table 4 | Unknown | Confidence: 41%
```

---

## 7. Analytics Dashboard

Later versions should include analytics for the business.

Useful analytics:

* Peak occupancy times
* Average table turnover time
* Most-used tables
* Least-used seating zones
* Average availability by hour
* Occupancy heat map
* Busiest days of week
* Estimated wait pressure

This helps businesses understand how their seating areas are being used.

---

# Privacy Requirements

Privacy is a central part of this product.

The software should not identify individual people.

The system should not use:

* Facial recognition
* Name identification
* Student or customer tracking
* Biometric identity matching
* Personal profiles

The customer-facing interface should not show live camera footage by default.

The system should only output anonymous table status data.

Example stored data:

```json
{
  "table_id": "table_4",
  "status": "occupied",
  "timestamp": "2026-06-06T12:30:00"
}
```

The product should be marketed as privacy-conscious occupancy detection, not surveillance.

---

# Recommended MVP Scope

The first working version should focus on a single camera and a small number of tables.

## MVP Features

* Connect to webcam
* Display live video feed in admin view
* Allow admin to draw table zones
* Save table zones locally
* Detect people using YOLO
* Classify tables as available or occupied
* Display status on a simple customer-facing map
* Show status updates in real time
* Include start/stop detection controls
* Include demo mode using uploaded video

## MVP Does Not Need

* User accounts
* Payments
* Cloud deployment
* Multiple locations
* Multi-camera syncing
* Automatic table detection
* Facial recognition
* Mobile app
* Advanced analytics

---

# Suggested Technical Stack

## Frontend

Use a modern web interface.

Recommended:

* React
* Next.js
* Tailwind CSS
* Shadcn/UI
* Canvas or SVG for table map visualization

## Backend

Recommended:

* Python
* FastAPI
* OpenCV
* Ultralytics YOLO
* WebSockets for real-time status updates

## Database

For MVP:

* SQLite or local JSON file

For production:

* PostgreSQL

## Computer Vision

Recommended:

* YOLOv8 or YOLOv11 for person detection
* OpenCV for camera handling
* Polygon overlap logic for matching detected people to table zones

---

# Suggested System Architecture

```text
Camera / Webcam
        ↓
Video Processing Service
        ↓
Person Detection Model
        ↓
Table Zone Overlap Logic
        ↓
Occupancy Classification
        ↓
Backend API
        ↓
Customer Seating Map + Admin Dashboard
```

---

# User Roles

## Admin User

The admin configures the venue.

Admin can:

* Connect camera
* Draw table zones
* Set table names
* Set table capacity
* View live detection
* Review table status
* Adjust detection settings

## Customer User

The customer only sees the simplified seating map.

Customer can:

* View available tables
* Check current seating status
* Filter by group size
* See last updated time

---

# Interface Design Requirements

The software should have two main views.

## Admin View

Purpose: Setup and monitoring.

Should include:

* Sidebar navigation
* Camera preview
* Table zone drawing tool
* Table status panel
* Detection confidence
* Settings panel
* Save layout button

Suggested pages:

1. Dashboard
2. Camera Setup
3. Table Layout
4. Live Monitor
5. Analytics
6. Settings

## Customer View

Purpose: Let people find seating quickly.

Should include:

* Clean venue map
* Large readable table status colors
* Simple legend
* No technical details
* Mobile-friendly layout
* Refresh/live update indicator

---

# Visual Design Direction

The interface should look professional, modern, and clean.

Style:

* SaaS dashboard aesthetic
* Minimal clutter
* Rounded cards
* Clear status colors
* Easy-to-read labels
* Responsive design
* Business-friendly look

Color suggestion:

* Green: Available
* Red: Occupied
* Yellow: Partially occupied
* Gray: Unknown
* Blue or dark neutral: Admin controls

The product should feel like software a restaurant, university, or company would actually purchase.

---

# Important Detection Logic

The software should not instantly change table status from one frame.

It should use smoothing.

Example:

```text
If person detected in table zone for 3 consecutive seconds:
    mark table occupied

If no person detected for 5 consecutive seconds:
    mark table available
```

This prevents flickering when detection briefly fails.

---

# Data Model

Example venue:

```json
{
  "venue_id": "venue_001",
  "name": "Demo Cafe",
  "areas": [
    {
      "area_id": "main_area",
      "name": "Main Seating Area",
      "camera_id": "camera_001",
      "tables": [
        {
          "table_id": "table_1",
          "name": "Table 1",
          "capacity": 4,
          "zone": [[120, 200], [300, 200], [300, 350], [120, 350]],
          "status": "available"
        }
      ]
    }
  ]
}
```

Example status update:

```json
{
  "table_id": "table_1",
  "status": "occupied",
  "people_count": 2,
  "confidence": 0.91,
  "last_updated": "2026-06-06T12:30:00"
}
```

---

# Success Criteria for MVP

The MVP is successful if:

1. A webcam feed can be opened in the app.
2. An admin can draw a table zone.
3. The system detects a person near the table.
4. The table status changes to occupied.
5. When the person leaves, the table status changes to available.
6. The customer-facing map updates automatically.
7. The interface is understandable without using the terminal.

---

# Future Features

## Multi-Table Support

Track many tables from one camera.

## Multi-Camera Support

Support large venues with several cameras.

## Group Size Recommendations

Suggest tables based on number of people.

## QR Code Access

Businesses can place a QR code near the entrance so customers can scan and view live seating.

## Public Display Mode

Show live seating availability on a TV screen near the entrance.

## Reservation/Waitlist Integration

Integrate with restaurant systems.

## Staff Alerts

Notify staff when tables are open, dirty, or occupied too long.

## Belongings Detection

Detect bags, laptops, trays, or plates to understand if a table is still being held.

## Cleaning Status

Allow staff to mark a table as “needs cleaning” before it becomes available.

## Predictive Availability

Estimate when tables are likely to open based on usage patterns.

---

# Long-Term Product Vision

The long-term vision is to create a general-purpose real-time seating intelligence platform.

Instead of being limited to one dining hall or one restaurant, the software should be flexible enough for many environments.

The product could eventually serve:

* Restaurants
* Cafes
* University campuses
* Libraries
* Food courts
* Corporate offices
* Airports
* Hotels
* Event venues

The bigger idea is to make physical seating availability searchable and visible in the same way online inventory is visible.

Customers should not have to guess whether seating is available. Businesses should be able to show it clearly and automatically.

---

# Final Product Description

TableTrack is a professional computer-vision-powered table occupancy platform that helps businesses and institutions show real-time seating availability to their customers. The software connects to a webcam or camera feed, allows admins to define table zones, detects whether people are present near each table, and displays a live seating map showing which tables are available, occupied, partially occupied, or unknown.

The first version focuses on proving the core workflow with a single camera and manually defined table zones. Future versions can expand to multiple cameras, analytics, staff tools, public displays, customer QR codes, and enterprise deployment.

The product is designed to be privacy-conscious, business-friendly, and useful across any environment where table availability matters.

---

# One-Sentence Pitch

TableTrack is a real-time table occupancy platform that uses computer vision to help restaurants, cafes, dining halls, libraries, and other venues show customers exactly where seating is available.

</pasted_text>

<!-- The user explicitly selected the following skills for this project, as attachments to their message. These are not optional context — they define how you work. Use them. -->
<attached-skill name="Hi-fi design">
Create a high-fidelity, polished design.

Follow this general design process (use the todo list to remember):
(1) ask questions, (2) find existing UI kits and collect design context — copy ALL relevant components and read ALL relevant examples; ask the user if you can't find them, (3) start your file with assumptions + context + design reasoning (as if you are a junior designer and the user is your manager), with placeholders for the designs, and show it to the user early, (4) build out the designs and show the user again ASAP; append some next steps, (5) use your tools to check, verify and iterate on the design.

Good hi-fi designs do not start from scratch — they are rooted in existing design context. Ask the user to Import their codebase, or find a suitable UI kit / design resources, or ask for screenshots of existing UI. You MUST spend time trying to acquire design context, including components. If you cannot find them, ask the user for them. In the Import menu, they can link a local codebase, provide screenshots or Figma links; they can also link another project. Mocking a full product from scratch is a LAST RESORT and will lead to poor design. If stuck, try listing design assets and ls'ing design system files — be proactive! Some designs may need multiple design systems — get them all. Use the starter components (device frames and the like) to get high-quality scaffolding for free.

When presenting several options or explorations side-by-side, lay them out clearly: give the page a neutral gray background, put each option in its own labeled frame (a small heading + a white rounded card sized to its content), and group related options into sections.

When designing, asking many good questions is ESSENTIAL.

Give options: try to give 3+ variations across several dimensions. Mix by-the-book designs that match existing patterns with new and novel interactions, including interesting layouts, metaphors, and visual styles. Have some options that use color or advanced CSS; some with iconography and some without. Start your variations basic and get more advanced and creative as you go! Try remixing the brand assets and visual DNA in interesting ways — play with scale, fills, texture, visual rhythm, layering, novel layouts, type treatments. The goal is not the perfect option; it's exploring atomic variations the user can mix and match.

CSS, HTML, JS and SVG are amazing. Users often don't know what they can do. Surprise the user.

If you do not have an icon, asset or component, draw a placeholder: in hi-fi design, a placeholder is better than a bad attempt at the real thing.
</attached-skill>

<attached-skill name="Interactive prototype">
Create a fully interactive prototype with realistic state management and transitions. Use React useState/useEffect for dynamic behavior. Include hover states, click interactions, form validation, animated transitions, and multi-step navigation flows. It should feel like a real working app, not a static mockup.
</attached-skill>


<system-reminder>Auto-injected reminder (ignore if not relevant): do not recreate copyrighted or branded UI unless the user's email domain matches that company. Create original designs instead.</system-reminder>

## Assistant

_[tool: questions_v2]_

This is a meaty spec — a real B2B computer-vision seating platform. Before I design anything, I want to lock down scope, visual direction, and where you want options. Let me ask a focused round.

## User

Questions answered:
- design_context: No — design it from scratch (I'll establish a system)
- primary_view: Both — full end-to-end flow
- screens: Admin Dashboard (overview), Camera Setup + Table Zone Editor, Public Display / TV mode, Live Monitor (real-time status), Customer Seating Map
- interactivity: Decide for me
- color_feel: 3
- aesthetic: Decide for me
- type_vibe: Decide for me
- venue: Decide for me
- variations: Decide for me
- seating_viz: 4

## Assistant

_[tool: update_todos]_

Great — I have what I need. Let me lock the system and build the full end-to-end interactive prototype.

**Design system I'm committing to** (since you said "decide for me"):
- **Aesthetic:** warm "paper" operations tool — calm, professional, *not* surveillance-y (reinforces the privacy positioning). Warm stone neutrals, hairline borders, soft shadows.
- **Color world:** your pick #3 — warm stone/paper. Brand chrome is ink-led (near-black) so the green/yellow/red/gray **status** colors never compete with brand color.
- **Seating viz:** your pick #4 — a true spatial **floor plan** (overhead map), shared live across every screen.
- **Type:** Hanken Grotesk (UI) + JetBrains Mono (CV data: confidence %, IDs, timestamps).
- **Venue demo:** university dining hall — "Briar Hall Commons."
- **Interactivity:** fully simulated live detection — statuses drift over time with smoothing, confidence fluctuates, zones are drawable. One shared store drives Admin + Customer + Public Display so they stay consistent.

Let me set up the build.Starting with the design tokens and base CSS.

_[tool: write_file]_

_[tool: list_files]_

_[tool: write_file]_

_[tool: write_file]_

Foundation CSS is in. Now the data + live simulation store (plain JS so it loads before the React layer).

_[tool: write_file]_

Now shared UI atoms — icons, the `useStore` hook, and the centerpiece **FloorPlan** SVG (shared by customer, public display, and dashboard).

_[tool: str_replace_edit]_

I left a garbled `fill` expression in the serving counter text. Let me fix that.

_[tool: grep]_

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: write_file]_

Customer Seating Map + Public Display (TV mode).

## Assistant

_[tool: write_file]_

Admin Dashboard + Live Monitor.

## Assistant

## Assistant

## Assistant

## Assistant

## Assistant

_[tool: write_file]_

Camera Setup + drawable Table Zone Editor.

_[tool: write_file]_

Now the app shell + routing, then the HTML entry.

_[tool: write_file]_

_[tool: str_replace_edit]_

Let me fix the font request to use variable ranges (so weights like 550/650/750 actually resolve).

## Assistant

Now let me load it and check for errors.

_[tool: show_html]_

_[tool: show_html]_

_[tool: get_webview_logs]_

Sidebar renders but the Dashboard content is blank — likely a JS error. Let me check logs.

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: save_screenshot]_

It is rendering (height 1088, 4 children) — the first screenshot was just mid-load. Let me re-capture.

_[tool: save_screenshot]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: str_replace_edit]_

Found it: the `.fadein` entrance animation starts at `opacity:0`, and in a backgrounded iframe the animation timeline is paused at frame 0 — so content stays invisible. That's exactly the hazard the guidelines warn about. I'll make the keyframe never hide content.

_[tool: str_replace_edit]_

_[tool: show_html]_

The Dashboard renders beautifully now. Let me check the other screens quickly — Live Monitor, Camera Setup, Customer, and Public Display.

_[tool: save_screenshot]_

_[tool: str_replace_edit]_

All five screens work and look sharp. I see text-wrapping collisions at narrow widths (Public Display header, legend labels, the customer "Any size" pill and live chip). Let me fix those.

_[tool: str_replace_edit]_

_[tool: save_screenshot]_

_[tool: show_html]_

The preview is still running the old code — `save_screenshot` doesn't reload. Let me reload and re-check.

_[tool: save_screenshot]_

_[tool: update_todos]_

Everything resolved — Public Display header, legend, customer chip, and filter pills all clean now. The floor plan with seat pips reads beautifully. Let me mark the work complete and hand off.

_[tool: done]_

_[tool: fork_verifier_agent]_

Built **TableTrack** — a full end-to-end interactive prototype for your computer-vision seating platform. It's live in your preview; switch roles with the **Admin / Customer / Public Display** control top-right.

**The system I committed to:** a warm "paper" operations aesthetic (Hanken Grotesk + JetBrains Mono for CV data), ink-led brand chrome so the green/amber/red/gray *status* colors never compete, and one **spatial floor plan** shared live across every screen. A single simulation store drifts occupancy over time with smoothing — so the customer map, monitor, and TV display all stay in sync, confidence values fluctuate, and "updated Xs ago" ticks.

**Five working screens:**
- **Admin Dashboard** — live metrics, occupancy-by-hour, status breakdown, anonymous activity feed, pause/resume detection.
- **Camera Setup** — *drawable* table zones (click "Add table zone", drag on the feed), name + capacity editing, camera-source picker.
- **Live Monitor** — simulated detection feed with zone polygons + "person 0.91" bounding boxes, filterable status list with confidence bars.
- **Customer Map** — clean floor plan, group-size filter, open-table suggestions, privacy note.
- **Public Display** — lobby-TV mode with a giant open-table count.

Privacy positioning is woven throughout (zones-only, "no footage stored", on-device).

**Worth noting / next steps:**
- Status drift is simulated for the demo; real detection would feed the same store.
- I kept Analytics and Settings out of the build (you didn't select them) — easy to add if you want them.
- Want me to explore **variations** now (e.g. a dark control-room admin theme, or a list/grid alternative to the floor plan as Tweaks)? That's the natural next move.

