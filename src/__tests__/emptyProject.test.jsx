import React from 'react';
import {it,expect} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import TaskTable from '../components/TaskTable.jsx';
it('opens task creation on a new empty project',()=>{render(<TaskTable tasks={[]} />);fireEvent.click(screen.getByRole('button',{name:'+ Add Task'}));expect(screen.getByPlaceholderText(/Install Condenser Unit/i)).toBeInTheDocument();});
