# Hawaii Project Manager (v1.0.1)

> ⚠️ **v1.0.1 — NEEDS BUG CHECKING**
> The Vendor Contact and Shopping List features added in this release are new and have not yet been through a full QA pass. Core 1.0.0 functionality is stable. Please report any issues.

Hawaii PM is a lightweight, modern project management and task tracking application designed for construction and maintenance projects. It features an intuitive, fast React-based user interface designed for efficiency.

## What's New in v1.0.1

### 📇 Vendor / Contact Management
A full CRM-lite vendor contact system integrated directly into the app.

- **Vendors view** (left sidebar) — Browse all vendor contacts in switchable **List view** (Company | Name | Phone table) or **Tile view** (business-card grid). Sorted alphabetically by company.
- **Vendor Detail page** — Full-screen editable contact card with Name, Company, Phone, Address, Account Number, and a large free-text Notes field.
- **CRM Interaction Log** — On each vendor's detail page, log every phone call, text, or email with a date, contact type badge, and free-text notes. Edit or delete any entry. **"Create Task"** button in the log entry form creates a new project task pre-populated with *"Follow up with [Company]"* and the vendor already linked.
- **Vendor tab on Task Details** — Each task can have one vendor assigned to it via a new **📇 Vendor** tab in the task edit modal. Includes a searchable dropdown and an inline **"+ New Vendor"** button to create a vendor stub (Company, Name, Phone) without leaving the task — returns you directly to the task after creation. Full vendor details can be fleshed out later via the Vendors page.
- **Import Data** moved to the bottom of the sidebar to make room.

### 🛒 Shopping List
A dynamic, aggregated shopping list across all active tasks.

- **Supplies tab on Task Details** — Add supply items (Name, Qty, Cost) to any task via a new **🛒 Supplies** tab in the task edit modal. Items can be added/removed at any time.
- **Shopping List view** (left sidebar) — Aggregates all supply items from all incomplete tasks, grouped by task with the task name and due date shown. Live item count badge.
- **Smart check-off logic:**
  - Checking off an item prompts: *"Mark [Task Name] complete?"*
  - **Yes** → task is marked complete; entire task group disappears from the list automatically.
  - **No** → the item is individually dismissed from the shopping list (flagged `checkedOff: true`) and will not re-appear — even though the task remains open.
- Completed tasks are automatically excluded from the shopping list.

## Features (v1.0.0 Core)

- **Summary Dashboard:** Provides an at-a-glance view of project progress, complete with a visual overall progress ring, section-level completion stats, and a feed of recently completed tasks. Section labels and status counts are fully interactive; clicking them takes you directly to that section on the Project Tracker, and clicking status counts with a single task will open that task's details modal immediately.
- **Project Tracker:** A robust, hierarchical table view of your tasks. Features include dependency tracking (pre-requisites), drag-and-drop ordering, indentation (sub-tasks), and inline editing.
- **Gantt Timeline:** A dedicated, full-screen interactive Gantt chart that visualizes the schedule, dependencies, and timeline of your tasks. Features CSS-sticky frozen date headers and task label columns for smooth scrolling. Includes an interactive color-coded legend, enhanced vertical week/month dividers, and clickable left-side labels that open task details immediately.
- **Daily Tasks:** A focused list for day-to-day execution. Automatically bubbles up Delayed tasks, groups tasks by Section, flags Urgent tasks (due within 5 days), and warns of Critical-Blocked bottlenecks.
- **Completed Archive:** An archive of everything accomplished, tracking days ahead/behind schedule and total duration.
- **Maintenance Log:** Integrated tracking for maintenance entries, keeping work orders, new hardware installations, and repairs tied to your project data. Displays entries in a super-compact, single-line format starting with the date to maximize screen space.
- **Milestones:** Mark major sections or tasks as milestones; auto-logging them to the maintenance timeline upon completion. If a task has both milestone and hardware installation elements, the system automatically splits them into distinct entries in the Maintenance Log.
- **Report Generator:** Export your project data and Gantt timeline to an Excel workbook (.xlsx), CSV, or Tab-Delimited text.
- **Data Import:** Import existing project tasks from an Excel spreadsheet to get up and running quickly.

## Architecture

- **Frontend:** React, Vite, standard CSS.
- **Backend:** Node.js, Express (providing simple API routes to persist data locally via JSON).
- **Styling:** Custom CSS implementing a "glassmorphism" aesthetic for a premium, modern feel.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository_url>
   cd ProjectManagement
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the application:
   ```bash
   npm run dev
   ```
   This will start both the backend Express server and the Vite development server concurrently.
   The application will be accessible at `http://localhost:5173`.

## Testing

The project uses Vitest for testing. The suite covers critical date logic, UI rendering heuristics, and tree rollups.
To run the test suite:

```bash
npm test
```

## Built With

- [React](https://reactjs.org/)
- [Vite](https://vitejs.org/)
- [Express](https://expressjs.com/)
- [SheetJS (xlsx)](https://sheetjs.com/) - For Excel import/export

## License

Private / Proprietary
