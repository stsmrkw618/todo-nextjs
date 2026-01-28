'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function Header({ topTask, activeCount, waitingCount, settings, setSettings, onAddClick, user, onLogout }) {
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
    await supabase.from('settings').update(updates).eq('user_id', user.id)
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

  const isCompact = settings.view_mode === 'compact'

  return (
    <>
      <div className="flex items-center gap-4 flex-wrap">
        {/* アバター */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center overflow-hidden border-2 border-violet-400 shadow-lg shadow-violet-500/30 flex-shrink-0">
          {settings.avatar ? (
            <img src={settings.avatar} className="w-full h-full object-cover" alt="" />
          ) : (
            <span className="text-2xl">📷</span>
          )}
        </div>

        {/* 吹き出し */}
        <div className="flex-1 min-w-[180px] max-w-md bg-slate-700/50 rounded-2xl p-3 relative">
          <div className="absolute left-[-8px] top-5 w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent border-r-slate-700/50"></div>
          {topTask ? (
            <>
              <div className="text-xs text-gray-400 mb-1">最重要タスクだよ！</div>
              <div className="font-bold text-sm">{topTask.title}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`${tierColors[topTask.tier || 2]} text-white text-xs px-1.5 py-0.5 rounded`}>
                  T{topTask.tier || 2}
                </span>
                {topTask.deadline && (
                  <span className="text-red-400 text-xs">⚠️ {formatDate(topTask.deadline)}</span>
                )}
                {topTask.target_date && (
                  <span className="text-pink-400 text-xs">🎯 {formatDate(topTask.target_date)}</span>
                )}
              </div>
            </>
          ) : (
            <div className="text-gray-400 text-sm">タスクがないよ！ゆっくり休んでね 🎉</div>
          )}
        </div>

        {/* ステータス */}
        <div className="flex gap-2">
          <div className="bg-slate-800 rounded-lg px-3 py-1.5 text-center min-w-[60px]">
            <div className="text-xs text-gray-400">Active</div>
            <div className="text-xl font-bold">{activeCount}</div>
          </div>
          <div className="bg-slate-800 rounded-lg px-3 py-1.5 text-center min-w-[60px]">
            <div className="text-xs text-gray-400">Wait</div>
            <div className="text-xl font-bold text-amber-400">{waitingCount}</div>
          </div>
        </div>

        {/* ソート */}
        <select
          value={settings.sort_by}
          onChange={(e) => updateSettings({ sort_by: e.target.value })}
          className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-sm"
        >
          <option value="tier">Tier順</option>
          <option value="deadline">DEAD順</option>
          <option value="target">目標日順</option>
          <option value="manual">手動</option>
        </select>

        {/* 表示切り替え */}
        <div className="flex bg-slate-800 rounded-lg overflow-hidden border border-slate-600">
          <button
            onClick={() => updateSettings({ view_mode: 'normal' })}
            className={`px-3 py-1.5 text-sm transition-all ${!isCompact ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}
            title="通常表示"
          >
            ≡
          </button>
          <button
            onClick={() => updateSettings({ view_mode: 'compact' })}
            className={`px-3 py-1.5 text-sm transition-all ${isCompact ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}
            title="コンパクト表示"
          >
            ☰
          </button>
        </div>

        {/* 追加ボタン */}
        <button
          onClick={onAddClick}
          className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white px-4 py-1.5 rounded-lg font-bold transition-all text-sm"
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
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-20 overflow-y-auto" onClick={() => setShowSettings(false)}>
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md mb-10" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">⚙️ 設定</h2>

            {/* ユーザー情報 */}
            <div className="mb-4 p-3 bg-slate-700/50 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">ログイン中</div>
              <div className="text-sm truncate">{user?.email}</div>
            </div>
            
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

            <div className="flex gap-2">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg"
              >
                閉じる
              </button>
              <button
                onClick={() => { setShowSettings(false); onLogout(); }}
                className="bg-red-600/30 hover:bg-red-600/50 text-red-400 px-4 py-2 rounded-lg"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}