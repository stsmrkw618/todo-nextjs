'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const passwordsMatch = password === passwordConfirm

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (isLogin) {
      // ログイン
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        setError(error.message)
      }
    } else {
      // 新規登録
      if (!passwordsMatch) {
        setError('パスワードが一致しません')
        setLoading(false)
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      if (error) {
        setError(error.message)
      } else if (data.user && data.user.identities && data.user.identities.length === 0) {
        setError('このメールアドレスは既に登録されています')
      } else {
        setMessage('確認メールを送信しました。メールのリンクをクリックしてください。')
      }
    }

    setLoading(false)
  }

  const switchMode = () => {
    setIsLogin(!isLogin)
    setError('')
    setMessage('')
    setPassword('')
    setPasswordConfirm('')
    setShowPassword(false)
    setShowPasswordConfirm(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="bg-slate-800 rounded-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-2">TODO Dashboard</h1>
        <p className="text-gray-400 text-center mb-6">
          {isLogin ? 'ログイン' : '新規登録'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">パスワード</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 pr-12"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white px-2 py-1"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* 新規登録時のみ確認用パスワード */}
          {!isLogin && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">パスワード（確認）</label>
              <div className="relative">
                <input
                  type={showPasswordConfirm ? 'text' : 'password'}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className={`w-full bg-slate-700 border rounded-lg px-3 py-2 pr-12 ${
                    passwordConfirm && !passwordsMatch 
                      ? 'border-red-500' 
                      : 'border-slate-600'
                  }`}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white px-2 py-1"
                >
                  {showPasswordConfirm ? '🙈' : '👁️'}
                </button>
              </div>
              {passwordConfirm && !passwordsMatch && (
                <p className="text-red-400 text-sm mt-1">⚠️ パスワードが一致しません</p>
              )}
              {passwordConfirm && passwordsMatch && (
                <p className="text-green-400 text-sm mt-1">✓ パスワードが一致しました</p>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-600/20 border border-red-500/50 text-red-400 rounded-lg px-3 py-2 text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-600/20 border border-green-500/50 text-green-400 rounded-lg px-3 py-2 text-sm">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (!isLogin && !passwordsMatch)}
            className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white py-2 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '処理中...' : isLogin ? 'ログイン' : '登録'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={switchMode}
            className="text-violet-400 hover:text-violet-300 text-sm"
          >
            {isLogin ? '新規登録はこちら' : 'ログインはこちら'}
          </button>
        </div>
      </div>
    </div>
  )
}