'use client'

import { useState } from 'react'
import TaskFormModal from '@/components/TaskFormModal'

export default function AddTaskButton({ dateStr }: { dateStr: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm font-medium text-white bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800 rounded-xl px-4 py-2.5 transition-colors"
      >
        <span className="text-base leading-none">+</span>
        Görev ekle
      </button>

      {open && <TaskFormModal defaultDate={dateStr} onClose={() => setOpen(false)} />}
    </>
  )
}
