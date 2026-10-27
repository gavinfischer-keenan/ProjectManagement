import { describe,it,expect } from 'vitest';
import 'fake-indexeddb/auto';
import {dbCreateTask,dbFetchTasks,dbCreateVendor,dbFetchVendors,dbImportAllData} from '../storage/db.js';
describe('public local project storage',()=>{
 it('starts empty without repository project records',async()=>{expect(await dbFetchTasks()).toEqual([]);expect(await dbFetchVendors()).toEqual([]);});
 it('preserves unrelated stores on task-only import',async()=>{await dbCreateVendor({name:'Synthetic vendor'});await dbImportAllData({tasks:[{id:'synthetic',name:'Test task'}]});expect((await dbFetchVendors()).length).toBe(1);});
 it('rejects malformed imports without changing stored tasks',async()=>{await expect(dbImportAllData({tasks:[{name:'Missing id'}]})).rejects.toThrow();expect((await dbFetchTasks())[0].id).toBe('synthetic');});
 it('commits local task changes',async()=>{const task=await dbCreateTask({name:'Synthetic persisted task'});expect((await dbFetchTasks()).some(x=>x.id===task.id)).toBe(true);});
});
