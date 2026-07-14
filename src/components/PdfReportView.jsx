import React from 'react';
import SummaryDashboard from './SummaryDashboard.jsx';
import TaskTable from './TaskTable.jsx';
import DailyTaskList from './DailyTaskList.jsx';
import MaintenanceLog from './MaintenanceLog.jsx';
import VendorPanel from './VendorPanel.jsx';

export default function PdfReportView({ tasks, maintenanceEntries, vendors, owners }) {
  return (
    <div id="pdf-report-hidden-parent" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
      <div id="pdf-report-container" style={{ width: '1200px', backgroundColor: 'var(--bg-deep)', color: 'var(--text-primary)' }}>
        {/* 1) Dashboard */}
      <div className="pdf-section" style={{ padding: '20px' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '20px', fontSize: '2em' }}>Information Send</h1>
        <h2 style={{ marginBottom: '10px' }}>Project Dashboard</h2>
        <SummaryDashboard tasks={tasks} maintenanceEntries={maintenanceEntries} owners={owners} />
      </div>

      <div className="html2pdf__page-break"></div>

      {/* 2) Project tracker rolled up to section level */}
      <div className="pdf-section" style={{ padding: '20px' }}>
        <h2 style={{ marginBottom: '10px' }}>Project Tracker (Sections Only)</h2>
        <TaskTable 
          tasks={tasks} 
          vendors={vendors} 
          readOnly={true} 
          forceCollapseSections={true} 
        />
      </div>

      <div className="html2pdf__page-break"></div>

      {/* 2.5) Daily Tasks / Action Items */}
      <div className="pdf-section" style={{ padding: '20px' }}>
        <h2 style={{ marginBottom: '10px' }}>Action Items (Daily Tasks)</h2>
        <DailyTaskList 
          tasks={tasks}
          owners={owners}
        />
      </div>

      <div className="html2pdf__page-break"></div>

      {/* 3) Project tracker fully expanded showing all rows */}
      <div className="pdf-section" style={{ padding: '20px' }}>
        <h2 style={{ marginBottom: '10px' }}>Project Tracker (Full Detail)</h2>
        <TaskTable 
          tasks={tasks} 
          vendors={vendors} 
          readOnly={true} 
          forceExpandAll={true} 
        />
      </div>

      <div className="html2pdf__page-break"></div>

      {/* 4) Event log */}
      <div className="pdf-section" style={{ padding: '20px' }}>
        <MaintenanceLog 
          maintenanceEntries={maintenanceEntries} 
          tasks={tasks} 
          readOnly={true}
        />
      </div>

      <div className="html2pdf__page-break"></div>

      {/* 5) Vendors */}
      <div className="pdf-section" style={{ padding: '20px' }}>
        <h2 style={{ marginBottom: '10px' }}>Vendors</h2>
        <VendorPanel 
          vendors={vendors} 
          tasks={tasks} 
          readOnly={true}
        />
      </div>
    </div>
    </div>
  );
}
