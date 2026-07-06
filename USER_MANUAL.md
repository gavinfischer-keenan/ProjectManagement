# Hawaii Project Manager - User Manual

Welcome to the Hawaii Project Manager! This application is designed to help you organize, schedule, and track tasks for your projects, with a special focus on maintenance and construction workflows.

---

## 1. Navigating the App

The application features a main sidebar on the left side of the screen. This allows you to quickly jump between the core views of the application:

*   **Dashboard:** Your high-level overview.
*   **Project Tracker:** The main workspace for adding and organizing tasks.
*   **Gantt Timeline:** A visual representation of your schedule.
*   **Daily Tasks:** A focused list for day-to-day execution.
*   **Completed:** An archive of finished tasks.
*   **Maintenance Log:** Dedicated tracking for repairs and upkeep.
*   **Import Data:** Bring in tasks from existing Excel spreadsheets.

---

## 2. Managing Tasks (Project Tracker)

The **Project Tracker** is where you will spend most of your time organizing work.

### Adding Sections and Tasks
At the top of the Project Tracker, you will find two primary buttons:
*   **§ Add Section:** Creates a bold, top-level header to group related tasks.
*   **+ Add Task:** Creates a standard task. 

*Tip: When you create a task or section, it is added to the top of the list for easy access.*

### Organizing (Drag and Drop)
You can reorganize tasks and sections by clicking and dragging them up and down the list.

### Indenting (Sub-tasks)
To make a task a "child" of the task above it (or of a Section header), hover over the task row and click the **Indent (→)** button on the right side. You can click **Outdent (←)** to move it back out.

### Editing a Task
To edit a task's details (Name, Target Dates, Percent Complete, Dependencies), simply click on the task row. This opens the **Task Edit Modal**. 
- Changes are not saved until you click the **Save Changes** button. 
- You can add prerequisite tasks directly from the edit modal.

---

## 3. The Gantt Timeline

The **Gantt Timeline** provides a visual schedule of your project based on the "Target Start" and "Target Finish" dates you set for your tasks.
- Tasks that are "In Progress" appear in blue.
- "Completed" tasks appear in green.
- Tasks that are past their Target Finish date but are not yet completed will appear in **red** (Late).

---

## 4. Maintenance Logs

If a task involves repairing or replacing equipment, you may want to log it. When marking a task as 100% complete, the system may prompt you to optionally add a Maintenance Log entry. 

You can view, edit, and manually add all maintenance records from the **Maintenance Log** tab in the sidebar.

---

## 5. Exporting Data (Report Generator)

At the top right of the application header, you will see a **Report Generator** panel. This is available from any screen.

1.  Click **Export Reports**.
2.  Choose your desired format:
    *   **Excel (.xlsx):** The most comprehensive format. You can choose to include the standard Tasks list, the Maintenance Log, and a generated Gantt Chart sheet.
    *   **Tab-Delimited Text (.tsv):** Useful for importing into specialized database tools.
    *   **CSV (.csv):** A universal format.
    *   **Google Sheets:** Downloads a file optimized for upload to Google Drive.
3.  Check or uncheck the specific sheets you want included (if selecting Excel).
4.  Click **Generate & Download**.

---

## 6. Importing Data

If you have an existing project plan in Excel, you can import it into Hawaii PM.
1. Navigate to the **Import Data** tab.
2. Select your `.xlsx` file.
3. Review the preview to ensure the columns mapped correctly.
4. Complete the import. The system will automatically detect sections based on formulas, and place newly created tasks appropriately.
