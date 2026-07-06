# Hawaii Project Manager (v1.0.0)

Hawaii PM is a lightweight, modern project management and task tracking application designed for construction and maintenance projects. It features an intuitive, fast React-based user interface designed for efficiency.

## Features

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
