const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, 'server', 'data', 'tasks.json');
const tasks = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

// Find all tasks that are taskType === 'section'
const sectionIds = new Set(tasks.filter(t => t.taskType === 'section').map(t => t.id));

let modified = false;

// If a task has a parentId that is NOT a section, we need to fix it.
for (const task of tasks) {
  if (task.parentId && !sectionIds.has(task.parentId)) {
    console.log(`Fixing task ${task.name} (${task.id}). Its parentId ${task.parentId} is not a section.`);
    
    // Find the bad parent
    const badParent = tasks.find(t => t.id === task.parentId);
    if (badParent) {
      // Set the task's parentId to the badParent's parentId (make them siblings)
      task.parentId = badParent.parentId;
    } else {
      // Parent doesn't exist at all, set to null
      task.parentId = null;
    }
    modified = true;
  }
}

if (modified) {
  fs.writeFileSync(dataFile, JSON.stringify(tasks, null, 2));
  console.log('Fixed tasks.json');
} else {
  console.log('No bad parent assignments found.');
}
