'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function Header({ topTask, activeCount, waitingCount, settings, setSettings, onAddClick }) {
  const [showSettings, setShowSettings] = useState(false)
  const fileInputRef = useRef(null)

  const formatDate = (dateStr) => {
    if (!dateStr) return null
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  const updateSettings = async (updates) => {
    const newSettings = { ...settings, ...updates }
    setSettings(newSettings)
    await supabase.from('settings').update(updates).eq('id', 1)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      updateSettings({ avatar: reader.result })
    }
    reader.readAsDataURL(file)
  }

  const handleDeleteAvatar = () => {
    updateSettings({ avatar: '' })
  }

  const tierColors = {
    1: 'bg-red-500',
    2: 'bg-violet-500',
    3: 'bg-blue-500'
  }

  return (
    <>
      <div className="flex items-center gap-4 flex-wrap">
        {/* アバター */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center overflow-hidden border-2 border-violet-400 shadow-lg shadow-violet-500/30">
          {settings.avatar ? (
            <img src={settings.avatar} className="w-full h-full object-cover" alt="" />
          ) : (
            <span className="text-3xl">📷</span>
          )}
        </div>

        {/* 吹き出し */}
        <div className="flex-1 min-w-[200px] max-w-xl bg-slate-700/50 rounded-2xl p-4 relative">
          <div className="absolute left-[-8px] top-6 w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent border-r-slate-700/50"></div>
          {topTask ? (
            <>
              <div className="text-sm text-gray-400 mb-1">最重要タスクだよ！</div>
              <div className="font-bold">{topTask.title}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`${tierColors[topTask.tier || 2]} text-white text-xs px-2 py-0.5 rounded`}>
                  T{topTask.tier || 2}
                </span>
                {topTask.deadline && (
                  <span className="text-red-400 text-sm">⚠️ {formatDate(topTask.deadline)}</span>
                )}
                {topTask.target_date && (
                  <span className="text-pink-400 text-sm">🎯 {formatDate(topTask.target_date)}</span>
                )}
              </div>
            </>
          ) : (
            <div className="text-gray-400">タスクがないよ！ゆっくり休んでね 🎉</div>
          )}
        </div>

        {/* ステータス */}
        <div className="flex gap-2">
          <div className="bg-slate-800 rounded-lg px-4 py-2 text-center min-w-[80px]">
            <div className="text-xs text-gray-400">Active</div>
            <div className="text-2xl font-bold">{activeCount}</div>
          </div>
          <div className="bg-slate-800 rounded-lg px-4 py-2 text-center min-w-[80px]">
            <div className="text-xs text-gray-400">Wait</div>
            <div className="text-2xl font-bold text-amber-400">{waitingCount}</div>
          </div>
        </div>

        {/* ソート */}
        <select
          value={settings.sort_by}
          onChange={(e) => updateSettings({ sort_by: e.target.value })}
          className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm"
        >
          <option value="tier">Tier順</option>
          <option value="deadline">DEAD順</option>
          <option value="target">目標日順</option>
          <option value="manual">手動</option>
        </select>

        {/* 追加ボタン */}
        <button
          onClick={onAddClick}
          className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white px-6 py-2 rounded-lg font-bold transition-all"
        >
          ＋ 追加
        </button>

        {/* 設定ボタン */}
        <button
          onClick={() => setShowSettings(true)}
          className="bg-slate-700 hover:bg-slate-600 p-2 rounded-lg transition-all"
        >
          ⚙️
        </button>
      </div>

      {/* 設定モーダル */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSettings(false)}>
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">⚙️ 設定</h2>
            
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">🎭 アバター</label>
              
              {/* プレビュー */}
              <div className="flex items-center gap-4 mb-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center overflow-hidden border-2 border-violet-400">
                  {settings.avatar ? (
                    <img src={settings.avatar} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <span className="text-2xl">📷</span>
                  )}
                </div>
                
                {settings.avatar && (
                  <button
                    onClick={handleDeleteAvatar}
                    className="bg-red-600/30 hover:bg-red-600/50 text-red-400 px-3 py-1 rounded-lg text-sm"
                  >
                    🗑️ 削除
                  </button>
                )}
              </div>
              
              {/* ファイル選択 */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-slate-700 hover:bg-slate-600 border border-slate-600 border-dashed rounded-lg px-3 py-3 text-sm text-gray-400"
              >
                📁 画像をアップロード
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">🎨 テーマカラー</label>
              <select
                value={settings.theme_color}
                onChange={(e) => updateSettings({ theme_color: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
              >
                <option value="violet">💜 バイオレット</option>
                <option value="blue">💙 ブルー</option>
                <option value="emerald">💚 エメラルド</option>
                <option value="rose">❤️ ローズ</option>
                <option value="amber">🧡 アンバー</option>
              </select>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="w-full bg-slate-700 hover:bg-slate-600 py-2 rounded-lg"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  )
}