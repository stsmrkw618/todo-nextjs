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

const statusLabels: any = {
  'todo': '未着手',
  'in_progress': '進行中',
  'waiting': '待ち',
  'done': '完了',
}

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

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  // ログ記録関数
  const logAction = async (taskId: number | null, taskTitle: string, action: string, detail: string = '') => {
    if (!user) return
    await supabase.from('task_logs').insert([{
      user_id: user.id,
      task_id: taskId,
      task_title: taskTitle,
      action,
      detail,
    }])
  }

  const fetchData = async () => {
    if (!user) return
    
    setLoading(true)
    
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

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
      if (nextDate.getDate() !== recurrenceDay) {
        nextDate.setDate(0)
      }
    }

    return nextDate.toISOString().split('T')[0]
  }

  const addTask = async (task: any) => {
    if (!user) return
    const maxOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.sort_order || 0)) : 0
    const { data, error } = await supabase
      .from('tasks')
      .insert([{ ...task, user_id: user.id, sort_order: maxOrder + 1 }])
      .select()
    if (data) {
      setTasks([...tasks, data[0]])
      await logAction(data[0].id, data[0].title, 'created')
    }
  }

  const updateTask = async (id: number, updates: any) => {
    const currentTask = tasks.find(t => t.id === id)
    if (!currentTask) return

    // ログ記録用の変更検出
    const logs: { action: string, detail: string }[] = []

    // ステータス変更
    if (updates.status && updates.status !== currentTask.status) {
      if (updates.status === 'done') {
        logs.push({ action: 'completed', detail: '' })
      } else if (updates.status === 'waiting') {
        const waitingFor = updates.waiting_for || currentTask.waiting_for || ''
        logs.push({ action: 'status_change', detail: `${statusLabels[currentTask.status]} → 待ち${waitingFor ? `（${waitingFor}）` : ''}` })
      } else {
        logs.push({ action: 'status_change', detail: `${statusLabels[currentTask.status]} → ${statusLabels[updates.status]}` })
      }
    }

    // DEAD変更
    if (updates.deadline !== undefined && updates.deadline !== currentTask.deadline) {
      const oldDate = currentTask.deadline ? new Date(currentTask.deadline).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }) : 'なし'
      const newDate = updates.deadline ? new Date(updates.deadline).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }) : 'なし'
      logs.push({ action: 'updated', detail: `DEAD: ${oldDate} → ${newDate}` })
    }

    // 目標日変更
    if (updates.target_date !== undefined && updates.target_date !== currentTask.target_date) {
      const oldDate = currentTask.target_date ? new Date(currentTask.target_date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }) : 'なし'
      const newDate = updates.target_date ? new Date(updates.target_date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }) : 'なし'
      logs.push({ action: 'updated', detail: `目標日: ${oldDate} → ${newDate}` })
    }

    // Tier変更
    if (updates.tier !== undefined && updates.tier !== currentTask.tier) {
      logs.push({ action: 'updated', detail: `T${currentTask.tier || 2} → T${updates.tier}` })
    }

    // 詳細変更
    if (updates.description !== undefined && updates.description !== currentTask.description) {
      logs.push({ action: 'updated', detail: '詳細を更新' })
    }

    // タイトル変更
    if (updates.title !== undefined && updates.title !== currentTask.title) {
      logs.push({ action: 'updated', detail: `タイトル: ${currentTask.title} → ${updates.title}` })
    }

    // 完了処理
    if (updates.status === 'done') {
      updates.completed_at = new Date().toISOString()
      
      // 繰り返しタスク
      if (currentTask.recurrence_type && currentTask.recurrence_day !== null) {
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
          user_id: user!.id,
          sort_order: maxOrder + 1
        }
        
        const { data: newTaskData } = await supabase
          .from('tasks')
          .insert([newTask])
          .select()
        
        if (newTaskData) {
          setTasks(prev => [...prev, newTaskData[0]])
          await logAction(newTaskData[0].id, newTaskData[0].title, 'recurrence', `次回: ${nextDate}`)
        }
      }
    }

    if (currentTask.status === 'done' && updates.status && updates.status !== 'done') {
      updates.completed_at = null
    }

    if (updates.status && updates.status !== 'waiting') {
      updates.waiting_for = null
      updates.waiting_deadline = null
    }
    
    await supabase.from('tasks').update(updates).eq('id', id)
    setTasks(tasks.map(t => t.id === id ? { ...t, ...updates } : t))

    // ログを記録
    for (const log of logs) {
      await logAction(id, updates.title || currentTask.title, log.action, log.detail)
    }
  }

  const deleteTask = async (id: number) => {
    const task = tasks.find(t => t.id === id)
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(tasks.filter(t => t.id !== id))
    if (task) {
      await logAction(id, task.title, 'deleted')
    }
  }

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
      await logAction(originalTask.id, originalTask.title, 'split', `→ ${childTitles.join(', ')}`)
    }
  }

  const handleDragEndActive = async (event: any) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeList = tasks.filter(t => t.status !== 'done' && t.status !== 'waiting')
    const oldIndex = activeList.findIndex(t => t.id === active.id)
    const newIndex = activeList.findIndex(t => t.id === over.id)
    
    if (oldIndex === -1 || newIndex === -1) return
    
    const newActiveList = arrayMove(activeList, oldIndex, newIndex)

    const updates = newActiveList.map((task, index) => ({
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

  const handleDragEndWaiting = async (event: any) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const waitingList = tasks.filter(t => t.status === 'waiting')
    const oldIndex = waitingList.findIndex(t => t.id === active.id)
    const newIndex = waitingList.findIndex(t => t.id === over.id)
    
    if (oldIndex === -1 || newIndex === -1) return
    
    const newWaitingList = arrayMove(waitingList, oldIndex, newIndex)

    const updates = newWaitingList.map((task, index) => ({
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

  if (authLoading) {
    return <div className="flex items-center justify-center h-screen">読み込み中...</div>
  }

  if (!user) {
    return <Auth />
  }

  const activeTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'waiting')
  const waitingTasks = tasks.filter(t => t.status === 'waiting')
  const doneTasks = tasks.filter(t => t.status === 'done')

  const sortedWaitingTasks = [...waitingTasks].sort((a, b) => {
    if (a.waiting_sort_order !== null && a.waiting_sort_order !== undefined &&
        b.waiting_sort_order !== null && b.waiting_sort_order !== undefined) {
      return a.waiting_sort_order - b.waiting_sort_order
    }
    const dateA = a.waiting_deadline || '9999-12-31'
    const dateB = b.waiting_deadline || '9999-12-31'
    return dateA > dateB ? 1 : -1
  })

  const sortedDoneTasks = [...doneTasks].sort((a, b) => {
    const dateA = a.completed_at ? new Date(a.completed_at).getTime() : 0
    const dateB = b.completed_at ? new Date(b.completed_at).getTime() : 0
    return dateB - dateA
  })

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