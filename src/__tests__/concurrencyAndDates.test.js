import {it,expect} from 'vitest';
import 'fake-indexeddb/auto';
import * as XLSX from 'xlsx';
import {dbCreateTask,dbUpdateTask,dbFetchTasks} from '../storage/db.js';
import {parseExcelTasks} from '../storage/excelImporter.js';
it('preserves simultaneous task edits',async()=>{const a=await dbCreateTask({name:'A'}),b=await dbCreateTask({name:'B'});await Promise.all([dbUpdateTask(a.id,{name:'A edited'}),dbUpdateTask(b.id,{name:'B edited'})]);const tasks=await dbFetchTasks();expect(tasks.find(x=>x.id===a.id).name).toBe('A edited');expect(tasks.find(x=>x.id===b.id).name).toBe('B edited');});
it('imports Excel date cells as ISO calendar dates',async()=>{const rows=Array.from({length:18},()=>[]);rows[17]=[null,'Synthetic dated task',null,null,new Date(2026,9,26),new Date(2026,9,27)];const sheet=XLSX.utils.aoa_to_sheet(rows);const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet,'Renovation Tracker');const bytes=XLSX.write(book,{type:'array',bookType:'xlsx'});const tasks=await parseExcelTasks({arrayBuffer:async()=>bytes});expect(tasks[0].targetDateStart).toBe('2026-10-26');expect(tasks[0].targetDateFinish).toBe('2026-10-27');});

it('rejects an aborted invalid write and keeps the prior record',async()=>{const a=await dbCreateTask({name:'Kept after failed write'});await expect(dbUpdateTask(a.id,{id:undefined,name:'Must not save'})).rejects.toThrow();expect((await dbFetchTasks()).find(x=>x.id===a.id).name).toBe('Kept after failed write');});
