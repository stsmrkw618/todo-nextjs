'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import TaskCard from '@/components/TaskCard'
import AddTaskModal from '@/components/AddTaskModal'
import Header from '@/components/Header'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'

export default function Home() {
  const [tasks, setTasks] = useState<any[]>([])
  const [settings, setSettings] = useState<any>({ avatar: '', theme_color: 'violet', sort_by: 'tier', view_mode: 'normal' })
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(true)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // データ読み込み
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    
    // 1週間以上前に完了したタスクを削除
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    await supabase
      .from('tasks')
      .delete()
      .eq('status', 'done')
      .lt('completed_at', oneWeekAgo.toISOString())
    
    const [tasksRes, settingsRes] = await Promise.all([
      supabase.from('tasks').select('*').order('sort_order', { ascending: true }),
      supabase.from('settings').select('*').eq('id', 1).single()
    ])
    if (tasksRes.data) setTasks(tasksRes.data)
    if (settingsRes.data) setSettings(settingsRes.data)
    setLoading(false)
  }

  // タスク追加
  const addTask = async (task: any) => {
    const maxOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.sort_order || 0)) : 0
    const { data, error } = await supabase
      .from('tasks')
      .insert([{ ...task, sort_order: maxOrder + 1 }])
      .select()
    if (data) setTasks([...tasks, data[0]])
  }

  // タスク更新
  const updateTask = async (id: number, updates: any) => {
    // 完了にする場合は completed_at を記録
    if (updates.status === 'done') {
      updates.completed_at = new Date().toISOString()
    }
    // 完了から別のステータスに戻す場合は completed_at をクリア
    const currentTask = tasks.find(t => t.id === id)
    if (currentTask?.status === 'done' && updates.status && updates.status !== 'done') {
      updates.completed_at = null
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
    const maxOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.sort_order || 0)) : 0
    
    // 子タスクを作成
    const childTasks = childTitles.map((title, index) => ({
      title,
      description: '',
      tier: originalTask.tier,
      status: 'todo',
      deadline: originalTask.deadline,
      target_date: originalTask.target_date,
      waiting_for: '',
      sort_order: maxOrder + index + 1
    }))
    
    const { data, error } = await supabase
      .from('tasks')
      .insert(childTasks)
      .select()
    
    if (data) {
      // 元タスクを削除
      await supabase.from('tasks').delete().eq('id', originalTask.id)
      // ステートを更新
      setTasks([...tasks.filter(t => t.id !== originalTask.id), ...data])
    }
  }

  // ドラッグ&ドロップ
  const handleDragEnd = async (event: any) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = tasks.findIndex(t => t.id === active.id)
    const newIndex = tasks.findIndex(t => t.id === over.id)
    const newTasks = arrayMove(tasks, oldIndex, newIndex)

    // sort_orderを更新
    const updates = newTasks.map((task, index) => ({
      id: task.id,
      sort_order: index
    }))

    setTasks(newTasks)

    // DB更新
    for (const u of updates) {
      await supabase.from('tasks').update({ sort_order: u.sort_order }).eq('id', u.id)
    }
  }

  // タスクの分類
  const activeTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'waiting')
  const waitingTasks = tasks.filter(t => t.status === 'waiting')
  const doneTasks = tasks.filter(t => t.status === 'done')

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
        />
      </div>

      {/* メインコンテンツ（ヘッダー分の余白を確保） */}
      <div className="pt-56 sm:pt-40 lg:pt-32 p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* アクティブタスク */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              アクティブ
              <span className="bg-violet-500 text-white text-sm px-2 py-0.5 rounded-full">
                {activeTasks.length}
              </span>
            </h2>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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

            <div className="space-y-2 mb-6">
              {waitingTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  compact={true}
                  onUpdate={updateTask}
                  onDelete={deleteTask}
                  onSplit={splitTask}
                />
              ))}
              {waitingTasks.length === 0 && (
                <div className="text-center py-8 text-gray-400 bg-slate-800/50 rounded-lg">
                  👍 待ちタスクなし
                </div>
              )}
            </div>

            {doneTasks.length > 0 && (
              <>
                <h2 className="text-lg font-bold mb-4 text-gray-400">
                  完了 ({doneTasks.length})
                </h2>
                <div className="space-y-2 opacity-60">
                  {doneTasks.slice(0, 5).map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      compact={true}
                      onUpdate={updateTask}
                      onDelete={deleteTask}
                      onSplit={splitTask}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
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