'use client'

import { useState } from 'react'

export default function AddTaskModal({ onAdd, onClose }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tier: 2,
    status: 'todo',
    deadline: '',
    target_date: '',
    waiting_for: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.title.trim()) return
    onAdd(formData)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">新しいタスク</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">タイトル *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">詳細</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 h-20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">重要度</label>
              <select
                value={formData.tier}
                onChange={(e) => setFormData({ ...formData, tier: parseInt(e.target.value) })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
              >
                <option value={1}>T1 - 最重要</option>
                <option value={2}>T2 - 通常</option>
                <option value={3}>T3 - 低め</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">ステータス</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
              >
                <option value="todo">未着手</option>
                <option value="in_progress">進行中</option>
                <option value="waiting">待ち</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">DEADLINE</label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">目標日</label>
              <input
                type="date"
                value={formData.target_date}
                onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 py-2 rounded-lg font-bold"
            >
              追加
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-700 hover:bg-slate-600 px-6 py-2 rounded-lg"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}