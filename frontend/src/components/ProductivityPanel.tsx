import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Pin, 
  Check, 
  Search,
  Calendar,
  Clock,
  Bell
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
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteSearch, setNoteSearch] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);

  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);

  const [remTitle, setRemTitle] = useState('');
  const [remDateTime, setRemDateTime] = useState('');
  const [showRemModal, setShowRemModal] = useState(false);

  return (
    <div className="h-full flex flex-col p-8 bg-[#14110E] overflow-y-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-6 border-b border-[#2F2822] mb-6">
        <div>
          <h2 className="font-serif-display text-2xl font-bold text-[#FDFBF7] capitalize">
            {type === 'notes' ? 'Personal Notes & Memos' : type === 'tasks' ? 'Task Manager' : 'Automated Reminders'}
          </h2>
          <p className="text-xs text-[#A89C90]">
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
          className="flex items-center gap-2 px-4 py-2.5 bg-[#E07A44] hover:bg-[#D06935] text-white rounded-xl text-sm font-medium transition-all shadow-md cursor-pointer"
        >
          <Plus size={16} />
          <span>Add {type === 'notes' ? 'Note' : type === 'tasks' ? 'Task' : 'Reminder'}</span>
        </button>
      </div>

      {/* NOTES VIEW */}
      {type === 'notes' && (
        <div className="space-y-6">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3.5 top-3 text-[#A89C90]" />
            <input
              type="text"
              value={noteSearch}
              onChange={(e) => setNoteSearch(e.target.value)}
              placeholder="Search saved notes..."
              className="w-full bg-[#1C1815] border border-[#2F2822] rounded-xl pl-10 pr-4 py-2 text-sm text-[#FDFBF7] placeholder-[#A89C90] focus:outline-none focus:border-[#E07A44]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {notes
              .filter(n => n.title.toLowerCase().includes(noteSearch.toLowerCase()) || n.content.toLowerCase().includes(noteSearch.toLowerCase()))
              .map((note) => (
                <div key={note.id} className="p-5 bg-[#1C1815] border border-[#2F2822] rounded-2xl flex flex-col justify-between hover:border-[#E07A44]/50 transition-all group shadow-md">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#E07A44] bg-[#E07A44]/15 px-2 py-0.5 rounded-md">
                        {note.category}
                      </span>
                      {note.is_pinned === 1 && <Pin size={14} className="text-[#E07A44] fill-current" />}
                    </div>
                    <h4 className="font-serif-display text-base font-bold text-[#FDFBF7] mb-1">{note.title}</h4>
                    <p className="text-xs text-[#A89C90] whitespace-pre-wrap line-clamp-4 leading-relaxed">{note.content}</p>
                  </div>
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#2F2822] text-[11px] text-[#A89C90]">
                    <span>{note.created_at}</span>
                    <button onClick={() => onDeleteNote(note.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity cursor-pointer">
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
                <div key={task.id} className="p-4 bg-[#1C1815] border border-[#2F2822] rounded-2xl flex items-start justify-between gap-3 group shadow-md">
                  <div className="flex items-start gap-3 flex-1">
                    <button
                      onClick={() => onUpdateTask(task.id, { status: isCompleted ? 'pending' : 'completed' })}
                      className={`mt-1 w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                        isCompleted ? 'bg-[#E07A44] border-[#E07A44] text-white' : 'border-[#383029] hover:border-[#E07A44]'
                      }`}
                    >
                      {isCompleted && <Check size={14} />}
                    </button>
                    <div>
                      <h4 className={`text-sm font-semibold text-[#FDFBF7] ${isCompleted ? 'line-through opacity-50' : ''}`}>
                        {task.title}
                      </h4>
                      {task.description && <p className="text-xs text-[#A89C90] mt-0.5">{task.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-[11px]">
                        <span className={`font-semibold uppercase tracking-wider ${
                          task.priority === 'high' ? 'text-red-400' : task.priority === 'medium' ? 'text-[#E07A44]' : 'text-emerald-400'
                        }`}>
                          {task.priority} Priority
                        </span>
                        {task.due_date && (
                          <span className="text-[#A89C90] flex items-center gap-1">
                            <Clock size={12} /> {task.due_date}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => onDeleteTask(task.id)} className="opacity-0 group-hover:opacity-100 p-1 text-[#A89C90] hover:text-red-400 transition-all cursor-pointer">
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
              <div key={rem.id} className="p-4 bg-[#1C1815] border border-[#2F2822] rounded-2xl flex items-center justify-between gap-3 group shadow-md">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${rem.status === 'triggered' ? 'bg-orange-950/40 text-orange-400' : 'bg-[#E07A44]/15 text-[#E07A44]'}`}>
                    <Bell size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#FDFBF7]">{rem.title}</h4>
                    <p className="text-xs text-[#A89C90] flex items-center gap-1 mt-0.5">
                      <Calendar size={12} /> {rem.remind_at}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    rem.status === 'triggered' ? 'bg-amber-950/40 text-amber-300' : 'bg-emerald-950/40 text-emerald-400'
                  }`}>
                    {rem.status}
                  </span>
                  <button onClick={() => onDeleteReminder(rem.id)} className="opacity-0 group-hover:opacity-100 p-1 text-[#A89C90] hover:text-red-400 transition-all cursor-pointer">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#1C1815] border border-[#2F2822] rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-serif-display text-xl font-bold text-[#FDFBF7] mb-4">Create New Note</h3>
            <input
              type="text"
              placeholder="Title"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="w-full bg-[#14110E] border border-[#2F2822] rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:border-[#E07A44] text-[#FDFBF7]"
            />
            <textarea
              placeholder="Content..."
              rows={4}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="w-full bg-[#14110E] border border-[#2F2822] rounded-xl px-4 py-2.5 text-sm mb-4 focus:outline-none focus:border-[#E07A44] text-[#FDFBF7]"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNoteModal(false)} className="px-4 py-2 text-sm text-[#A89C90] hover:text-[#FDFBF7] cursor-pointer">
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
                className="px-5 py-2 bg-[#E07A44] hover:bg-[#D06935] text-white rounded-xl text-sm font-medium cursor-pointer"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {showTaskModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#1C1815] border border-[#2F2822] rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-serif-display text-xl font-bold text-[#FDFBF7] mb-4">Create New Task</h3>
            <input
              type="text"
              placeholder="Task Title"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="w-full bg-[#14110E] border border-[#2F2822] rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:border-[#E07A44] text-[#FDFBF7]"
            />
            <div className="flex gap-2 mb-4">
              {(['low', 'medium', 'high'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setTaskPriority(p)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize border cursor-pointer ${
                    taskPriority === p ? 'bg-[#E07A44] text-white border-[#E07A44]' : 'bg-[#14110E] text-[#A89C90] border-[#2F2822]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowTaskModal(false)} className="px-4 py-2 text-sm text-[#A89C90] hover:text-[#FDFBF7] cursor-pointer">
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
                className="px-5 py-2 bg-[#E07A44] hover:bg-[#D06935] text-white rounded-xl text-sm font-medium cursor-pointer"
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}

      {showRemModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#1C1815] border border-[#2F2822] rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-serif-display text-xl font-bold text-[#FDFBF7] mb-4">Set Reminder</h3>
            <input
              type="text"
              placeholder="Reminder Title"
              value={remTitle}
              onChange={(e) => setRemTitle(e.target.value)}
              className="w-full bg-[#14110E] border border-[#2F2822] rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:border-[#E07A44] text-[#FDFBF7]"
            />
            <input
              type="datetime-local"
              value={remDateTime}
              onChange={(e) => setRemDateTime(e.target.value)}
              className="w-full bg-[#14110E] border border-[#2F2822] rounded-xl px-4 py-2.5 text-sm mb-4 focus:outline-none focus:border-[#E07A44] text-[#FDFBF7]"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowRemModal(false)} className="px-4 py-2 text-sm text-[#A89C90] hover:text-[#FDFBF7] cursor-pointer">
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
                className="px-5 py-2 bg-[#E07A44] hover:bg-[#D06935] text-white rounded-xl text-sm font-medium cursor-pointer"
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
