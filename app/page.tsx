'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import TaskCard from '@/components/TaskCard'
import AddTaskModal from '@/components/AddTaskModal'
import Header from '@/components/Header'
import MatrixView from '@/components/MatrixView'
import Auth from '@/components/Auth'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [tasks, setTasks] = useState<any[]>([])
  const [settings, setSettings] = useState<any>({ avatar: '', theme_color: 'violet', sort_by: 'tier', view_mode: 'normal' })
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showAllCompleted, setShowAllCompleted] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // 認証状態の監視
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // データ読み込み
  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    if (!user) return
    
    setLoading(true)
    
    // 1週間以上前に完了したタスクを削除
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    await supabase
      .from('tasks')
      .delete()
      .eq('user_id', user.id)
      .eq('status', 'done')
      .lt('completed_at', oneWeekAgo.toISOString())
    
    const [tasksRes, settingsRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('user_id', user.id).order('sort_order', { ascending: true }),
      supabase.from('settings').select('*').eq('user_id', user.id).single()
    ])
    
    if (tasksRes.data) setTasks(tasksRes.data)
    
    if (settingsRes.data) {
      setSettings(settingsRes.data)
    } else {
      const { data } = await supabase
        .from('settings')
        .insert([{ user_id: user.id, avatar: '', theme_color: 'violet', sort_by: 'tier', view_mode: 'normal' }])
        .select()
        .single()
      if (data) setSettings(data)
    }
    
    setLoading(false)
  }

  // ログアウト
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  // 次回日付を計算
  const calculateNextDate = (recurrenceType: string, recurrenceDay: number) => {
    const today = new Date()
    let nextDate = new Date()

    if (recurrenceType === 'daily') {
      nextDate.setDate(today.getDate() + 1)
    } else if (recurrenceType === 'weekly') {
      const currentDay = today.getDay()
      let daysUntil = recurrenceDay - currentDay
      if (daysUntil <= 0) daysUntil += 7
      nextDate.setDate(today.getDate() + daysUntil)
    } else if (recurrenceType === 'biweekly') {
      const currentDay = today.getDay()
      let daysUntil = recurrenceDay - currentDay
      if (daysUntil <= 0) daysUntil += 7
      nextDate.setDate(today.getDate() + daysUntil + 7)
    } else if (recurrenceType === 'monthly') {
      nextDate.setMonth(today.getMonth() + 1)
      nextDate.setDate(recurrenceDay)
      // 日付が存在しない場合（例：31日がない月）は月末に調整
      if (nextDate.getDate() !== recurrenceDay) {
        nextDate.setDate(0)
      }
    }

    return nextDate.toISOString().split('T')[0]
  }

  // タスク追加
  const addTask = async (task: any) => {
    if (!user) return
    const maxOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.sort_order || 0)) : 0
    const { data, error } = await supabase
      .from('tasks')
      .insert([{ ...task, user_id: user.id, sort_order: maxOrder + 1 }])
      .select()
    if (data) setTasks([...tasks, data[0]])
  }

  // タスク更新
  const updateTask = async (id: number, updates: any) => {
    const currentTask = tasks.find(t => t.id === id)
    
    // 完了にする場合
    if (updates.status === 'done') {
      updates.completed_at = new Date().toISOString()
      
      // 繰り返しタスクの場合、次回タスクを生成
      if (currentTask?.recurrence_type && currentTask?.recurrence_day !== null) {
        const nextDate = calculateNextDate(currentTask.recurrence_type, currentTask.recurrence_day)
        const maxOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.sort_order || 0)) : 0
        
        const newTask = {
          title: currentTask.title,
          description: currentTask.description,
          tier: currentTask.tier,
          status: 'todo',
          deadline: nextDate,
          target_date: nextDate,
          recurrence_type: currentTask.recurrence_type,
          recurrence_day: currentTask.recurrence_day,
          user_id: user.id,
          sort_order: maxOrder + 1
        }
        
        const { data: newTaskData } = await supabase
          .from('tasks')
          .insert([newTask])
          .select()
        
        if (newTaskData) {
          setTasks(prev => [...prev, newTaskData[0]])
        }
      }
    }
    
    // 完了から別のステータスに戻す場合
    if (currentTask?.status === 'done' && updates.status && updates.status !== 'done') {
      updates.completed_at = null
    }
    
    // 待ち以外に変更した場合、待ち関連フィールドをクリア
    if (updates.status && updates.status !== 'waiting') {
      updates.waiting_for = null
      updates.waiting_deadline = null
    }
    
    await supabase.from('tasks').update(updates).eq('id', id)
    setTasks(tasks.map(t => t.id === id ? { ...t, ...updates } : t))
  }

  // タスク削除
  const deleteTask = async (id: number) => {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(tasks.filter(t => t.id !== id))
  }

  // タスク分割
  const splitTask = async (originalTask: any, childTitles: string[]) => {
    if (!user) return
    const maxOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.sort_order || 0)) : 0
    
    const childTasks = childTitles.map((title, index) => ({
      title,
      description: '',
      tier: originalTask.tier,
      status: 'todo',
      deadline: originalTask.deadline,
      target_date: originalTask.target_date,
      waiting_for: '',
      sort_order: maxOrder + index + 1,
      user_id: user.id
    }))
    
    const { data, error } = await supabase
      .from('tasks')
      .insert(childTasks)
      .select()
    
    if (data) {
      await supabase.from('tasks').delete().eq('id', originalTask.id)
      setTasks([...tasks.filter(t => t.id !== originalTask.id), ...data])
    }
  }

  // ドラッグ&ドロップ（アクティブタスク用）
  const handleDragEndActive = async (event: any) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'waiting')
    const oldIndex = activeTasks.findIndex(t => t.id === active.id)
    const newIndex = activeTasks.findIndex(t => t.id === over.id)
    
    if (oldIndex === -1 || newIndex === -1) return
    
    const newActiveTasks = arrayMove(activeTasks, oldIndex, newIndex)

    const updates = newActiveTasks.map((task, index) => ({
      id: task.id,
      sort_order: index
    }))

    const newTasks = tasks.map(t => {
      const update = updates.find(u => u.id === t.id)
      return update ? { ...t, sort_order: update.sort_order } : t
    })

    setTasks(newTasks)

    for (const u of updates) {
      await supabase.from('tasks').update({ sort_order: u.sort_order }).eq('id', u.id)
    }
  }

  // ドラッグ&ドロップ（待ちタスク用）
  const handleDragEndWaiting = async (event: any) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const waitingTasks = tasks.filter(t => t.status === 'waiting')
    const oldIndex = waitingTasks.findIndex(t => t.id === active.id)
    const newIndex = waitingTasks.findIndex(t => t.id === over.id)
    
    if (oldIndex === -1 || newIndex === -1) return
    
    const newWaitingTasks = arrayMove(waitingTasks, oldIndex, newIndex)

    const updates = newWaitingTasks.map((task, index) => ({
      id: task.id,
      waiting_sort_order: index
    }))

    const newTasks = tasks.map(t => {
      const update = updates.find(u => u.id === t.id)
      return update ? { ...t, waiting_sort_order: update.waiting_sort_order } : t
    })

    setTasks(newTasks)

    for (const u of updates) {
      await supabase.from('tasks').update({ waiting_sort_order: u.waiting_sort_order }).eq('id', u.id)
    }
  }

  // 認証ロード中
  if (authLoading) {
    return <div className="flex items-center justify-center h-screen">読み込み中...</div>
  }

  // 未ログイン
  if (!user) {
    return <Auth />
  }

  // タスクの分類
  const activeTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'waiting')
  const waitingTasks = tasks.filter(t => t.status === 'waiting')
  const doneTasks = tasks.filter(t => t.status === 'done')

  // 待ちタスクを返事期限順にソート
  const sortedWaitingTasks = [...waitingTasks].sort((a, b) => {
    if (a.waiting_sort_order !== null && a.waiting_sort_order !== undefined &&
        b.waiting_sort_order !== null && b.waiting_sort_order !== undefined) {
      return a.waiting_sort_order - b.waiting_sort_order
    }
    const dateA = a.waiting_deadline || '9999-12-31'
    const dateB = b.waiting_deadline || '9999-12-31'
    return dateA > dateB ? 1 : -1
  })

  // 完了タスクを新しい順にソート
  const sortedDoneTasks = [...doneTasks].sort((a, b) => {
    const dateA = a.completed_at ? new Date(a.completed_at).getTime() : 0
    const dateB = b.completed_at ? new Date(b.completed_at).getTime() : 0
    return dateB - dateA
  })

  // ソート
  const sortTasks = (taskList: any[]) => {
    return [...taskList].sort((a, b) => {
      if (settings.sort_by === 'tier') return (a.tier || 2) - (b.tier || 2)
      if (settings.sort_by === 'deadline') return (a.deadline || '9999') > (b.deadline || '9999') ? 1 : -1
      if (settings.sort_by === 'target') return (a.target_date || '9999') > (b.target_date || '9999') ? 1 : -1
      return (a.sort_order || 0) - (b.sort_order || 0)
    })
  }

  const sortedActiveTasks = sortTasks(activeTasks)
  const topTask = sortedActiveTasks[0]

  const isCompact = settings.view_mode === 'compact'
  const isMatrix = settings.view_mode === 'matrix'

  if (loading) {
    return <div className="flex items-center justify-center h-screen">読み込み中...</div>
  }

  return (
    <div className="min-h-screen">
      {/* 固定ヘッダー */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 p-4">
        <Header
          topTask={topTask}
          activeCount={activeTasks.length}
          waitingCount={waitingTasks.length}
          settings={settings}
          setSettings={setSettings}
          onAddClick={() => setShowAddModal(true)}
          user={user}
          onLogout={handleLogout}
        />
      </div>

      {/* メインコンテンツ */}
      <div className="pt-56 sm:pt-40 lg:pt-32 p-4">
        {isMatrix ? (
          <MatrixView
            tasks={activeTasks}
            onUpdate={updateTask}
            onDelete={deleteTask}
            onSplit={splitTask}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* アクティブタスク */}
            <div className="lg:col-span-2">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                アクティブ
                <span className="bg-violet-500 text-white text-sm px-2 py-0.5 rounded-full">
                  {activeTasks.length}
                </span>
              </h2>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndActive}>
                <SortableContext items={sortedActiveTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <div className={isCompact ? "space-y-1" : "space-y-3"}>
                    {sortedActiveTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        compact={isCompact}
                        onUpdate={updateTask}
                        onDelete={deleteTask}
                        onSplit={splitTask}
                        draggable={true}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {activeTasks.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  ✨ アクティブなタスクはありません
                </div>
              )}
            </div>

            {/* 待ち & 完了 */}
            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                👤 待ちタスク
                <span className="bg-amber-500 text-white text-sm px-2 py-0.5 rounded-full">
                  {waitingTasks.length}
                </span>
              </h2>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndWaiting}>
                <SortableContext items={sortedWaitingTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <div className={isCompact ? "space-y-1 mb-6" : "space-y-2 mb-6"}>
                    {sortedWaitingTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        compact={isCompact}
                        onUpdate={updateTask}
                        onDelete={deleteTask}
                        onSplit={splitTask}
                        showWaitingDetails={!isCompact}
                        draggable={true}
                      />
                    ))}
                    {waitingTasks.length === 0 && (
                      <div className="text-center py-8 text-gray-400 bg-slate-800/50 rounded-lg">
                        👍 待ちタスクなし
                      </div>
                    )}
                  </div>
                </SortableContext>
              </DndContext>

              {sortedDoneTasks.length > 0 && (
                <>
                  <h2 className="text-lg font-bold mb-4 text-gray-400">
                    完了 ({sortedDoneTasks.length})
                  </h2>
                  <div className={isCompact ? "space-y-1 opacity-60" : "space-y-2 opacity-60"}>
                    {(showAllCompleted ? sortedDoneTasks : sortedDoneTasks.slice(0, 5)).map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        compact={true}
                        onUpdate={updateTask}
                        onDelete={deleteTask}
                        onSplit={splitTask}
                        showRestoreButton={true}
                      />
                    ))}
                  </div>
                  {sortedDoneTasks.length > 5 && (
                    <button
                      onClick={() => setShowAllCompleted(!showAllCompleted)}
                      className="w-full mt-2 py-2 text-sm text-gray-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition-all"
                    >
                      {showAllCompleted 
                        ? '▲ 折りたたむ' 
                        : `▼ もっと見る（残り${sortedDoneTasks.length - 5}件）`}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddTaskModal
          onAdd={addTask}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  )
}