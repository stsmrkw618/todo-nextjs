'use client'

import { useState } from 'react'

export default function MatrixView({ tasks, onUpdate, onDelete, onSplit }) {
  // 緊急度の判定（3日以内 or 過ぎている）
  const isUrgent = (deadline) => {
    if (!deadline) return false
    const daysUntil = (new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24)
    return daysUntil <= 3
  }

  // タスクを6セルに振り分け
  const categorize = () => {
    const cells = {
      urgentT1: [],
      urgentT2: [],
      urgentT3: [],
      notUrgentT1: [],
      notUrgentT2: [],
      notUrgentT3: [],
    }

    tasks.forEach(task => {
      const tier = task.tier || 2
      const urgent = isUrgent(task.deadline)

      if (tier === 1 && urgent) cells.urgentT1.push(task)
      else if (tier === 1 && !urgent) cells.notUrgentT1.push(task)
      else if (tier === 2 && urgent) cells.urgentT2.push(task)
      else if (tier === 2 && !urgent) cells.notUrgentT2.push(task)
      else if (tier === 3 && urgent) cells.urgentT3.push(task)
      else if (tier === 3 && !urgent) cells.notUrgentT3.push(task)
    })

    return cells
  }

  const cells = categorize()

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* ヘッダー */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="text-center py-2 bg-slate-800 rounded-lg">
            <span className="text-red-400 font-bold">🔥 緊急</span>
            <span className="text-gray-400 text-xs ml-2">（DEAD 3日以内）</span>
          </div>
          <div className="text-center py-2 bg-slate-800 rounded-lg">
            <span className="text-blue-400 font-bold">📅 緊急でない</span>
            <span className="text-gray-400 text-xs ml-2">（DEAD 4日以上）</span>
          </div>
        </div>

        {/* T1行 */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <MatrixCell
            label="T1"
            color="red"
            tasks={cells.urgentT1}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onSplit={onSplit}
          />
          <MatrixCell
            label="T1"
            color="yellow"
            tasks={cells.notUrgentT1}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onSplit={onSplit}
          />
        </div>

        {/* T2行 */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <MatrixCell
            label="T2"
            color="orange"
            tasks={cells.urgentT2}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onSplit={onSplit}
          />
          <MatrixCell
            label="T2"
            color="green"
            tasks={cells.notUrgentT2}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onSplit={onSplit}
          />
        </div>

        {/* T3行 */}
        <div className="grid grid-cols-2 gap-2">
          <MatrixCell
            label="T3"
            color="orange"
            tasks={cells.urgentT3}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onSplit={onSplit}
          />
          <MatrixCell
            label="T3"
            color="green"
            tasks={cells.notUrgentT3}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onSplit={onSplit}
          />
        </div>
      </div>
    </div>
  )
}

// 各セルコンポーネント
function MatrixCell({ label, color, tasks, onUpdate, onDelete, onSplit }) {
  const colorStyles = {
    red: 'bg-red-500/10 border-red-500/30',
    yellow: 'bg-yellow-500/10 border-yellow-500/30',
    orange: 'bg-orange-500/10 border-orange-500/30',
    green: 'bg-green-500/10 border-green-500/30',
  }

  const labelColors = {
    red: 'text-red-400',
    yellow: 'text-yellow-400',
    orange: 'text-orange-400',
    green: 'text-green-400',
  }

  const tierBadgeColors = {
    1: 'bg-red-500',
    2: 'bg-violet-500',
    3: 'bg-blue-500'
  }

  const statusOptions = [
    { value: 'todo', label: '未着手' },
    { value: 'in_progress', label: '進行中' },
    { value: 'waiting', label: '待ち' },
  ]

  const formatDate = (dateStr) => {
    if (!dateStr) return null
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  const isOverdue = (dateStr) => {
    if (!dateStr) return false
    return new Date(dateStr) < new Date()
  }

  return (
    <div className={`${colorStyles[color]} border rounded-lg p-3 min-h-[120px]`}>
      <div className={`${labelColors[color]} font-bold text-sm mb-2 flex items-center justify-between`}>
        <span>{label}</span>
        <span className="bg-slate-700 text-white text-xs px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      <div className="space-y-2">
        {tasks.map(task => (
          <MatrixTaskCard
            key={task.id}
            task={task}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onSplit={onSplit}
            tierBadgeColors={tierBadgeColors}
            statusOptions={statusOptions}
            formatDate={formatDate}
            isOverdue={isOverdue}
          />
        ))}

        {tasks.length === 0 && (
          <div className="text-gray-500 text-xs text-center py-4">
            タスクなし
          </div>
        )}
      </div>
    </div>
  )
}

// マトリクス用タスクカード
function MatrixTaskCard({ task, onUpdate, onDelete, onSplit, tierBadgeColors, statusOptions, formatDate, isOverdue }) {
  const [showEdit, setShowEdit] = useState(false)
  const [editData, setEditData] = useState(task)

  const handleSave = () => {
    onUpdate(task.id, editData)
    setShowEdit(false)
  }

  return (
    <>
      <div className="bg-slate-800 rounded-lg p-2">
        <div className="flex items-start gap-2">
          <span className={`${tierBadgeColors[task.tier || 2]} text-white text-xs px-1.5 py-0.5 rounded flex-shrink-0`}>
            T{task.tier || 2}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{task.title}</div>
            <div className="flex items-center gap-2 mt-1">
              {task.deadline && (
                <span className={`text-xs ${isOverdue(task.deadline) ? 'text-red-400' : 'text-yellow-400'}`}>
                  ⚠️{formatDate(task.deadline)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 mt-2">
          <select
            value={task.status}
            onChange={(e) => onUpdate(task.id, { status: e.target.value })}
            className="flex-1 bg-slate-700 border border-slate-600 rounded px-1 py-1 text-xs"
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={() => setShowEdit(true)}
            className="bg-slate-700 hover:bg-slate-600 p-1 rounded text-xs"
          >
            ✏️
          </button>
          <button
            onClick={() => onUpdate(task.id, { status: 'done' })}
            className="bg-green-600/30 hover:bg-green-600/50 border border-green-500/50 p-1 rounded text-xs"
          >
            ✓
          </button>
        </div>
      </div>

      {/* 編集モーダル */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-20 overflow-y-auto" onClick={() => setShowEdit(false)}>
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-lg mb-10" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">タスクを編集</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">タイトル</label>
                <input
                  type="text"
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">詳細</label>
                <textarea
                  value={editData.description || ''}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">重要度</label>
                  <select
                    value={editData.tier || 2}
                    onChange={(e) => setEditData({ ...editData, tier: parseInt(e.target.value) })}
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
                    value={editData.status || 'todo'}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
                  >
                    {statusOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">DEADLINE</label>
                  <input
                    type="date"
                    value={editData.deadline || ''}
                    onChange={(e) => setEditData({ ...editData, deadline: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">目標日</label>
                  <input
                    type="date"
                    value={editData.target_date || ''}
                    onChange={(e) => setEditData({ ...editData, target_date: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSave}
                className="flex-1 bg-violet-600 hover:bg-violet-700 py-2 rounded-lg font-bold"
              >
                保存
              </button>
              <button
                onClick={() => { onDelete(task.id); setShowEdit(false); }}
                className="bg-red-600/30 hover:bg-red-600/50 px-4 py-2 rounded-lg"
              >
                🗑️
              </button>
              <button
                onClick={() => setShowEdit(false)}
                className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}