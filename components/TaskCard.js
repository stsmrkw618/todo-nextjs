'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export default function TaskCard({ task, compact, onUpdate, onDelete }) {
  const [showEdit, setShowEdit] = useState(false)
  const [editData, setEditData] = useState(task)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const tierColors = {
    1: 'border-l-red-500',
    2: 'border-l-violet-500',
    3: 'border-l-blue-500'
  }

  const tierBadgeColors = {
    1: 'bg-red-500',
    2: 'bg-violet-500',
    3: 'bg-blue-500'
  }

  const statusLabels = {
    'todo': '未着手',
    'in_progress': '進行中',
    'waiting': '待ち',
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

  const handleSave = () => {
    onUpdate(task.id, editData)
    setShowEdit(false)
  }

  // 待ちタスク・完了タスク用のコンパクト表示（ドラッグなし）
  if (task.status === 'waiting' || task.status === 'done') {
    return (
      <div className={`bg-slate-800 rounded-lg p-3 border-l-4 ${tierColors[task.tier || 2]}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className={`${tierBadgeColors[task.tier || 2]} text-white text-xs px-1.5 py-0.5 rounded flex-shrink-0`}>
              T{task.tier || 2}
            </span>
            <span className={`truncate ${task.status === 'done' ? 'line-through text-gray-400' : ''}`}>
              {task.title}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            {task.status === 'waiting' && (
              <button
                onClick={() => onUpdate(task.id, { status: 'todo' })}
                className="text-sm bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded"
              >
                ↩️
              </button>
            )}
            {task.status === 'done' && (
              <button
                onClick={() => onDelete(task.id)}
                className="text-sm bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded"
              >
                🗑️
              </button>
            )}
          </div>
        </div>
        {task.deadline && (
          <div className={`text-xs mt-1 ${isOverdue(task.deadline) ? 'text-red-400' : 'text-gray-400'}`}>
            ⚠️ DEAD: {formatDate(task.deadline)}
          </div>
        )}
      </div>
    )
  }

  // コンパクト表示（アクティブタスク）
  if (compact) {
    return (
      <>
        <div
          ref={setNodeRef}
          style={style}
          className={`bg-slate-800 rounded-lg px-3 py-2 border-l-4 ${tierColors[task.tier || 2]} cursor-grab active:cursor-grabbing`}
          {...attributes}
          {...listeners}
        >
          <div className="flex items-center gap-2">
            {/* Tier */}
            <span className={`${tierBadgeColors[task.tier || 2]} text-white text-xs px-1.5 py-0.5 rounded flex-shrink-0`}>
              T{task.tier || 2}
            </span>
            
            {/* タイトル */}
            <span className="font-medium flex-1 truncate">{task.title}</span>
            
            {/* 日付 */}
            <div className="flex items-center gap-2 text-xs flex-shrink-0">
              {task.deadline && (
                <span className={isOverdue(task.deadline) ? 'text-red-400' : 'text-yellow-400'}>
                  ⚠️{formatDate(task.deadline)}
                </span>
              )}
              {task.target_date && (
                <span className="text-pink-400">
                  🎯{formatDate(task.target_date)}
                </span>
              )}
            </div>
            
            {/* ステータス */}
            <select
              value={task.status}
              onChange={(e) => { e.stopPropagation(); onUpdate(task.id, { status: e.target.value }); }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs flex-shrink-0"
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            
            {/* 編集 */}
            <button
              onClick={(e) => { e.stopPropagation(); setShowEdit(true); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="bg-slate-700 hover:bg-slate-600 p-1.5 rounded text-xs flex-shrink-0"
            >
              ✏️
            </button>
            
            {/* 完了 */}
            <button
              onClick={(e) => { e.stopPropagation(); onUpdate(task.id, { status: 'done' }); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="bg-green-600/30 hover:bg-green-600/50 border border-green-500/50 p-1.5 rounded text-xs flex-shrink-0"
            >
              ✓
            </button>
          </div>
        </div>

        {/* 編集モーダル */}
        {showEdit && <EditModal task={task} editData={editData} setEditData={setEditData} handleSave={handleSave} onDelete={onDelete} setShowEdit={setShowEdit} statusOptions={statusOptions} />}
      </>
    )
  }

  // 通常表示（アクティブタスク）
  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`bg-slate-800 rounded-lg p-4 border-l-4 ${tierColors[task.tier || 2]} cursor-grab active:cursor-grabbing`}
        {...attributes}
        {...listeners}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`${tierBadgeColors[task.tier || 2]} text-white text-xs px-2 py-0.5 rounded`}>
                T{task.tier || 2}
              </span>
              <span className="bg-slate-700 text-gray-300 text-xs px-2 py-0.5 rounded">
                {statusLabels[task.status] || '未着手'}
              </span>
            </div>
            <h3 className="font-bold text-lg mb-1">{task.title}</h3>
            {task.description && (
              <p className="text-gray-400 text-sm mb-2">{task.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm">
              {task.deadline && (
                <span className={isOverdue(task.deadline) ? 'text-red-400' : 'text-yellow-400'}>
                  ⚠️ DEAD: {formatDate(task.deadline)}
                </span>
              )}
              {task.target_date && (
                <span className="text-pink-400">
                  🎯 目標: {formatDate(task.target_date)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <select
              value={task.status}
              onChange={(e) => onUpdate(task.id, { status: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-sm"
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              onClick={(e) => { e.stopPropagation(); setShowEdit(true); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="bg-slate-700 hover:bg-slate-600 p-2 rounded-lg"
            >
              ✏️
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onUpdate(task.id, { status: 'done' }); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="bg-green-600/30 hover:bg-green-600/50 border border-green-500/50 p-2 rounded-lg"
            >
              ✓
            </button>
          </div>
        </div>
      </div>

      {/* 編集モーダル */}
      {showEdit && <EditModal task={task} editData={editData} setEditData={setEditData} handleSave={handleSave} onDelete={onDelete} setShowEdit={setShowEdit} statusOptions={statusOptions} />}
    </>
  )
}

// 編集モーダルコンポーネント
function EditModal({ task, editData, setEditData, handleSave, onDelete, setShowEdit, statusOptions }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowEdit(false)}>
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
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
            削除
          </button>
          <button
            onClick={() => setShowEdit(false)}
            className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  )
}