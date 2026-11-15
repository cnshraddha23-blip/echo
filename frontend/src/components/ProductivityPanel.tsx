import React, { useState } from 'react';
import { 
  FileText, 
  CheckSquare, 
  Bell, 
  Plus, 
  Trash2, 
  Pin, 
  Check, 
  Search,
  Calendar,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Note, Task, Reminder } from '../types';

interface ProductivityProps {
  type: 'notes' | 'tasks' | 'reminders';
  notes: Note[];
  tasks: Task[];
  reminders: Reminder[];
  onCreateNote: (title: string, content: string, category: string, is_pinned: boolean) => void;
  onDeleteNote: (id: number) => void;
  onCreateTask: (title: string, description: string, due_date: string | null, priority: 'low' | 'medium' | 'high') => void;
  onUpdateTask: (id: number, data: Partial<Task>) => void;
  onDeleteTask: (id: number) => void;
  onCreateReminder: (title: string, remind_at: string) => void;
  onDeleteReminder: (id: number) => void;
}

export const ProductivityPanel: React.FC<ProductivityProps> = ({
  type,
  notes,
  tasks,
  reminders,
  onCreateNote,
  onDeleteNote,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onCreateReminder,
  onDeleteReminder
}) => {
  // Notes state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteSearch, setNoteSearch] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);

  // Tasks state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);

  // Reminders state
  const [remTitle, setRemTitle] = useState('');
  const [remDateTime, setRemDateTime] = useState('');
  const [showRemModal, setShowRemModal] = useState(false);

  return (
    <div className="h-full flex flex-col p-8 bg-[#FFFDF9] overflow-y-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-6 border-b border-[#E8DCCD] mb-6">
        <div>
          <h2 className="font-serif-display text-2xl font-bold text-[#29241F] capitalize">
            {type === 'notes' ? 'Personal Notes & Memos' : type === 'tasks' ? 'Task Manager' : 'Automated Reminders'}
          </h2>
          <p className="text-xs text-[#81766B]">
            {type === 'notes' 
              ? 'Synchronized with SQLite database & voice capture' 
              : type === 'tasks' 
              ? 'Organize priorities and schedule deadlines' 
              : 'Background scheduler alerts you on time'}
          </p>
        </div>

        <button
          onClick={() => {
            if (type === 'notes') setShowNoteModal(true);
            if (type === 'tasks') setShowTaskModal(true);
            if (type === 'reminders') setShowRemModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#D97745] hover:bg-[#C26535] text-white rounded-xl text-sm font-medium transition-all shadow-xs"
        >
          <Plus size={16} />
          <span>Add {type === 'notes' ? 'Note' : type === 'tasks' ? 'Task' : 'Reminder'}</span>
        </button>
      </div>

      {/* NOTES VIEW */}
      {type === 'notes' && (
        <div className="space-y-6">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3.5 top-3 text-[#81766B]" />
            <input
              type="text"
              value={noteSearch}
              onChange={(e) => setNoteSearch(e.target.value)}
              placeholder="Search saved notes..."
              className="w-full bg-[#F8F1E7] border border-[#E8DCCD] rounded-xl pl-10 pr-4 py-2 text-sm text-[#29241F] placeholder-[#81766B] focus:outline-none focus:border-[#D97745]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {notes
              .filter(n => n.title.toLowerCase().includes(noteSearch.toLowerCase()) || n.content.toLowerCase().includes(noteSearch.toLowerCase()))
              .map((note) => (
                <div key={note.id} className="p-5 bg-[#F8F1E7] border border-[#E8DCCD] rounded-2xl flex flex-col justify-between hover:border-[#D97745] transition-all group">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#D97745] bg-[#F4E1D2] px-2 py-0.5 rounded-md">
                        {note.category}
                      </span>
                      {note.is_pinned === 1 && <Pin size={14} className="text-[#D97745] fill-current" />}
                    </div>
                    <h4 className="font-serif-display text-base font-bold text-[#29241F] mb-1">{note.title}</h4>
                    <p className="text-xs text-[#81766B] whitespace-pre-wrap line-clamp-4 leading-relaxed">{note.content}</p>
                  </div>
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#E8DCCD] text-[11px] text-[#81766B]">
                    <span>{note.created_at}</span>
                    <button onClick={() => onDeleteNote(note.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-600 transition-opacity">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TASKS VIEW */}
      {type === 'tasks' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tasks.map((task) => {
              const isCompleted = task.status === 'completed';
              return (
                <div key={task.id} className="p-4 bg-[#F8F1E7] border border-[#E8DCCD] rounded-2xl flex items-start justify-between gap-3 group">
                  <div className="flex items-start gap-3 flex-1">
                    <button
                      onClick={() => onUpdateTask(task.id, { status: isCompleted ? 'pending' : 'completed' })}
                      className={`mt-1 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                        isCompleted ? 'bg-[#D97745] border-[#D97745] text-white' : 'border-[#E8DCCD] hover:border-[#D97745]'
                      }`}
                    >
                      {isCompleted && <Check size={14} />}
                    </button>
                    <div>
                      <h4 className={`text-sm font-semibold text-[#29241F] ${isCompleted ? 'line-through opacity-50' : ''}`}>
                        {task.title}
                      </h4>
                      {task.description && <p className="text-xs text-[#81766B] mt-0.5">{task.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-[11px]">
                        <span className={`font-semibold uppercase tracking-wider ${
                          task.priority === 'high' ? 'text-red-600' : task.priority === 'medium' ? 'text-[#D97745]' : 'text-green-600'
                        }`}>
                          {task.priority} Priority
                        </span>
                        {task.due_date && (
                          <span className="text-[#81766B] flex items-center gap-1">
                            <Clock size={12} /> {task.due_date}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => onDeleteTask(task.id)} className="opacity-0 group-hover:opacity-100 p-1 text-[#81766B] hover:text-red-600 transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* REMINDERS VIEW */}
      {type === 'reminders' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reminders.map((rem) => (
              <div key={rem.id} className="p-4 bg-[#F8F1E7] border border-[#E8DCCD] rounded-2xl flex items-center justify-between gap-3 group">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${rem.status === 'triggered' ? 'bg-orange-100 text-orange-600' : 'bg-[#F4E1D2] text-[#D97745]'}`}>
                    <Bell size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#29241F]">{rem.title}</h4>
                    <p className="text-xs text-[#81766B] flex items-center gap-1 mt-0.5">
                      <Calendar size={12} /> {rem.remind_at}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    rem.status === 'triggered' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {rem.status}
                  </span>
                  <button onClick={() => onDeleteReminder(rem.id)} className="opacity-0 group-hover:opacity-100 p-1 text-[#81766B] hover:text-red-600 transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE NOTE MODAL */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#FFFDF9] border border-[#E8DCCD] rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-serif-display text-xl font-bold text-[#29241F] mb-4">Create New Note</h3>
            <input
              type="text"
              placeholder="Title"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="w-full bg-[#F8F1E7] border border-[#E8DCCD] rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:border-[#D97745]"
            />
            <textarea
              placeholder="Content..."
              rows={4}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="w-full bg-[#F8F1E7] border border-[#E8DCCD] rounded-xl px-4 py-2.5 text-sm mb-4 focus:outline-none focus:border-[#D97745]"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNoteModal(false)} className="px-4 py-2 text-sm text-[#81766B] hover:text-[#29241F]">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (noteTitle.trim()) {
                    onCreateNote(noteTitle.trim(), noteContent.trim(), 'general', false);
                    setNoteTitle('');
                    setNoteContent('');
                    setShowNoteModal(false);
                  }
                }}
                className="px-5 py-2 bg-[#D97745] hover:bg-[#C26535] text-white rounded-xl text-sm font-medium"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#FFFDF9] border border-[#E8DCCD] rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-serif-display text-xl font-bold text-[#29241F] mb-4">Create New Task</h3>
            <input
              type="text"
              placeholder="Task Title"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="w-full bg-[#F8F1E7] border border-[#E8DCCD] rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:border-[#D97745]"
            />
            <div className="flex gap-2 mb-4">
              {(['low', 'medium', 'high'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setTaskPriority(p)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize border ${
                    taskPriority === p ? 'bg-[#D97745] text-white border-[#D97745]' : 'bg-[#F8F1E7] text-[#81766B] border-[#E8DCCD]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowTaskModal(false)} className="px-4 py-2 text-sm text-[#81766B] hover:text-[#29241F]">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (taskTitle.trim()) {
                    onCreateTask(taskTitle.trim(), '', taskDueDate || null, taskPriority);
                    setTaskTitle('');
                    setShowTaskModal(false);
                  }
                }}
                className="px-5 py-2 bg-[#D97745] hover:bg-[#C26535] text-white rounded-xl text-sm font-medium"
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE REMINDER MODAL */}
      {showRemModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#FFFDF9] border border-[#E8DCCD] rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-serif-display text-xl font-bold text-[#29241F] mb-4">Set Reminder</h3>
            <input
              type="text"
              placeholder="Reminder Title"
              value={remTitle}
              onChange={(e) => setRemTitle(e.target.value)}
              className="w-full bg-[#F8F1E7] border border-[#E8DCCD] rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:border-[#D97745]"
            />
            <input
              type="datetime-local"
              value={remDateTime}
              onChange={(e) => setRemDateTime(e.target.value)}
              className="w-full bg-[#F8F1E7] border border-[#E8DCCD] rounded-xl px-4 py-2.5 text-sm mb-4 focus:outline-none focus:border-[#D97745]"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowRemModal(false)} className="px-4 py-2 text-sm text-[#81766B] hover:text-[#29241F]">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (remTitle.trim() && remDateTime) {
                    onCreateReminder(remTitle.trim(), remDateTime);
                    setRemTitle('');
                    setRemDateTime('');
                    setShowRemModal(false);
                  }
                }}
                className="px-5 py-2 bg-[#D97745] hover:bg-[#C26535] text-white rounded-xl text-sm font-medium"
              >
                Set Reminder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
