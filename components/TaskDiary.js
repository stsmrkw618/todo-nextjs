'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const actionIcons = {
  'created': '➕',
  'completed': '✅',
  'status_change': '📝',
  'updated': '✏️',
  'deleted': '🗑️',
  'split': '✂️',
  'recurrence': '🔄',
}

const actionLabels = {
  'created': '追加',
  'completed': '完了',
  'status_change': 'ステータス変更',
  'updated': '更新',
  'deleted': '削除',
  'split': '分割',
  'recurrence': '繰り返し生成',
}

export default function TaskDiary({ user, onClose }) {
  const [logs, setLogs] = useState([])
  const [notes, setNotes] = useState([])
  const [newNote, setNewNote] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDiary()
  }, [])

  const fetchDiary = async () => {
    setLoading(true)

    const [logsRes, notesRes] = await Promise.all([
      supabase
        .from('task_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('daily_notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(500),
    ])

    if (logsRes.data) setLogs(logsRes.data)
    if (notesRes.data) setNotes(notesRes.data)
    setLoading(false)
  }

  const addNote = async () => {
    if (!newNote.trim()) return

    const { data } = await supabase
      .from('daily_notes')
      .insert([{ user_id: user.id, note: newNote.trim() }])
      .select()

    if (data) {
      setNotes([data[0], ...notes])
      setNewNote('')
    }
  }

  const deleteNote = async (id) => {
    await supabase.from('daily_notes').delete().eq('id', id)
    setNotes(notes.filter(n => n.id !== id))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      addNote()
    }
  }

  // ログとメモを日付ごとにグルーピング
  const groupByDate = () => {
    const groups = {}

    logs.forEach(log => {
      const date = new Date(log.created_at).toLocaleDateString('ja-JP', {
        year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short'
      })
      if (!groups[date]) groups[date] = { logs: [], notes: [] }
      groups[date].logs.push(log)
    })

    notes.forEach(note => {
      const date = new Date(note.created_at).toLocaleDateString('ja-JP', {
        year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short'
      })
      if (!groups[date]) groups[date] = { logs: [], notes: [] }
      groups[date].notes.push(note)
    })

    // 日付の降順でソート
    const sortedDates = Object.keys(groups).sort((a, b) => {
      const dateA = new Date(groups[a].logs[0]?.created_at || groups[a].notes[0]?.created_at)
      const dateB = new Date(groups[b].logs[0]?.created_at || groups[b].notes[0]?.created_at)
      return dateB - dateA
    })

    return { groups, sortedDates }
  }

  const { groups, sortedDates } = groupByDate()

  const formatTime = (dateStr) => {
    const d = new Date(dateStr)
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  // 今日の日付文字列
  const todayStr = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short'
  })

  // 今日のサマリーを計算
  const todayData = groups[todayStr] || { logs: [], notes: [] }
  const todayCompleted = todayData.logs.filter(l => l.action === 'completed').length
  const todayCreated = todayData.logs.filter(l => l.action === 'created').length
  const todayChanges = todayData.logs.filter(l => l.action === 'status_change' || l.action === 'updated').length

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">📖 タスク日記</h2>
          <button
            onClick={onClose}
            className="bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        {/* 今日のサマリー */}
        <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
          <div className="text-sm text-gray-400 mb-2">📊 今日のサマリー</div>
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{todayCompleted}</div>
              <div className="text-xs text-gray-400">完了</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{todayCreated}</div>
              <div className="text-xs text-gray-400">追加</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-400">{todayChanges}</div>
              <div className="text-xs text-gray-400">変更</div>
            </div>
          </div>
        </div>

        {/* メモ入力 */}
        <div className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="💬 ひとことメモを追加（Enter で送信）"
              className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={addNote}
              disabled={!newNote.trim()}
              className="bg-violet-600 hover:bg-violet-700 px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              送信
            </button>
          </div>
        </div>

        {/* 日付ごとのタイムライン */}
        {loading ? (
          <div className="text-center py-8 text-gray-400">読み込み中...</div>
        ) : sortedDates.length === 0 ? (
          <div className="text-center py-8 text-gray-400">まだ記録がありません</div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map(date => {
              const data = groups[date]
              const isToday = date === todayStr

              // ログとメモを時間順に統合
              const timeline = [
                ...data.logs.map(l => ({ ...l, type: 'log', time: new Date(l.created_at) })),
                ...data.notes.map(n => ({ ...n, type: 'note', time: new Date(n.created_at) })),
              ].sort((a, b) => b.time - a.time)

              return (
                <div key={date}>
                  <div className={`text-sm font-bold mb-3 flex items-center gap-2 ${isToday ? 'text-violet-400' : 'text-gray-400'}`}>
                    📅 {date}
                    {isToday && <span className="bg-violet-600 text-white text-xs px-2 py-0.5 rounded">今日</span>}
                  </div>

                  <div className="space-y-2 pl-4 border-l-2 border-slate-700">
                    {timeline.map((item, index) => {
                      if (item.type === 'note') {
                        return (
                          <div key={`note-${item.id}`} className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="text-xs text-gray-400 mr-2">{formatTime(item.created_at)}</span>
                                <span className="text-amber-400 text-sm">💬 {item.note}</span>
                              </div>
                              <button
                                onClick={() => deleteNote(item.id)}
                                className="text-gray-500 hover:text-red-400 text-xs ml-2 flex-shrink-0"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        )
                      }

                      return (
                        <div key={`log-${item.id}`} className="text-sm py-1">
                          <span className="text-xs text-gray-400 mr-2">{formatTime(item.created_at)}</span>
                          <span className="mr-1">{actionIcons[item.action] || '📝'}</span>
                          <span className="text-gray-300">{item.task_title}</span>
                          {item.detail && (
                            <span className="text-gray-500 ml-2">{item.detail}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}