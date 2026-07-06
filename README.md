# Hawaii Project Manager (v0.4)

Hawaii PM is a lightweight, modern project management and task tracking application designed for construction and maintenance projects. It features an intuitive, fast React-based user interface designed for efficiency.

## Features

- **Summary Dashboard:** Provides an at-a-glance view of project progress, complete with a visual overall progress ring, section-level completion stats, and a feed of recently completed tasks.
- **Project Tracker:** A robust, hierarchical table view of your tasks. Features include dependency tracking (pre-requisites), drag-and-drop ordering, indentation (sub-tasks), and inline editing.
- **Gantt Timeline:** A dedicated, full-screen interactive Gantt chart that visualizes the schedule, dependencies, and timeline of your tasks.
- **Daily Tasks & Completed Views:** Focused views that filter tasks by what needs attention today, or provide an archive of everything accomplished.
- **Maintenance Log:** Integrated tracking for maintenance entries, keeping work orders and repairs tied to your project data.
- **Report Generator:** Export your project data and Gantt timeline to an Excel workbook (.xlsx), CSV, or Tab-Delimited text.
- **Data Import:** Import existing project tasks from an Excel spreadsheet to get up and running quickly.

## Architecture

- **Frontend:** React, Vite, standard CSS.
- **Backend:** Node.js, Express (providing simple API routes to persist data locally).
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

The project uses Vitest for testing. To run the test suite:

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
