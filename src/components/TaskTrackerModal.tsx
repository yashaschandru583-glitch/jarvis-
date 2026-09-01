import React, { useState } from 'react';
import { X, Plus, CheckCircle2, Circle, Trash2, ListTodo, Calendar, AlertCircle } from 'lucide-react';
import { StarkTask } from '../types';

interface TaskTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: StarkTask[];
  onAddTask: (task: { title: string; due?: string; priority: 'low' | 'medium' | 'high' }) => void;
  onToggleTask: (id: string, completed: boolean) => void;
  onDeleteTask: (id: string) => void;
}

export const TaskTrackerModal: React.FC<TaskTrackerModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [newDue, setNewDue] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [isAdding, setIsAdding] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddTask({
      title: newTitle.trim(),
      due: newDue.trim() || 'Upcoming',
      priority: newPriority,
    });
    setNewTitle('');
    setNewDue('');
    setIsAdding(false);
  };

  const priorityColors = {
    high: 'text-red-400 border-red-500/40 bg-red-950/30',
    medium: 'text-amber-400 border-amber-500/40 bg-amber-950/30',
    low: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/30',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="hud-panel w-full max-w-xl max-h-[85vh] rounded-xl border border-cyan-500/40 flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-cyan-800/40 flex items-center justify-between bg-cyan-950/30">
          <div className="flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-cyan-400" />
            <span className="font-orbitron font-bold text-sm sm:text-base text-cyan-200 tracking-wider">
              STARK TASK & REMINDER HUB
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-cyan-400 hover:text-white hover:bg-cyan-900/40 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task Creation Form */}
        <div className="p-3 border-b border-cyan-900/40 bg-slate-950/60">
          {!isAdding ? (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full py-2 px-3 rounded bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-700/50 text-cyan-300 text-xs font-orbitron flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> ADD NEW MISSION DIRECTIVE
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-2 text-xs font-rajdhani">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Directive description (e.g. Calibrate Arc Reactor output)..."
                className="w-full p-2 rounded bg-black/60 border border-cyan-800 text-cyan-200 placeholder-cyan-600 focus:outline-none focus:border-cyan-400"
                autoFocus
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDue}
                  onChange={(e) => setNewDue(e.target.value)}
                  placeholder="Target schedule (e.g. Today 18:00)..."
                  className="flex-1 p-2 rounded bg-black/60 border border-cyan-800 text-cyan-200 placeholder-cyan-600 focus:outline-none focus:border-cyan-400"
                />
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="p-2 rounded bg-black/60 border border-cyan-800 text-cyan-200 focus:outline-none font-mono-tech"
                >
                  <option value="low">LOW PRIORITY</option>
                  <option value="medium">MED PRIORITY</option>
                  <option value="high">HIGH PRIORITY</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1 text-cyan-500 hover:text-cyan-300 font-mono-tech cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="px-4 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-400 text-cyan-200 font-orbitron cursor-pointer disabled:opacity-40"
                >
                  SAVE TASK
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {tasks.length === 0 ? (
            <div className="py-12 text-center text-cyan-600 font-mono-tech text-xs">
              NO ACTIVE DIRECTIVES LOGGED
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className={`p-3 rounded-lg border flex items-center justify-between gap-3 transition-all ${
                  task.completed
                    ? 'bg-black/30 border-cyan-950/60 opacity-60'
                    : 'bg-slate-900/60 border-cyan-800/50 hover:border-cyan-500/40'
                }`}
              >
                <button
                  onClick={() => onToggleTask(task.id, !task.completed)}
                  className="text-cyan-400 hover:text-cyan-200 transition-colors cursor-pointer"
                  title={task.completed ? 'Mark pending' : 'Mark completed'}
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Circle className="w-5 h-5 text-cyan-500" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div
                    className={`font-semibold text-xs sm:text-sm truncate ${
                      task.completed ? 'line-through text-cyan-600' : 'text-cyan-100'
                    }`}
                  >
                    {task.title}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono-tech text-cyan-400/60">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-cyan-500" />
                      {task.due || 'Scheduled'}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded border uppercase font-bold text-[9px] ${
                        priorityColors[task.priority]
                      }`}
                    >
                      {task.priority}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onDeleteTask(task.id)}
                  className="p-1 text-red-400/60 hover:text-red-300 hover:bg-red-950/30 rounded transition-colors cursor-pointer"
                  title="Delete task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-cyan-900/40 flex items-center justify-between text-xs font-mono-tech text-cyan-500 bg-black/40">
          <span>
            {tasks.filter((t) => t.completed).length} OF {tasks.length} COMPLETED
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 font-orbitron text-xs cursor-pointer"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
