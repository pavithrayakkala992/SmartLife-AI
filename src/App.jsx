import { useEffect, useRef, useState } from 'react'
import {
  Brain, CheckCircle2, Circle, Clock3, Plus, Sparkles,
  Trash2, CalendarDays, Target, ListTodo, Zap, X, Send,
  MessageCircle, Bot, User, RotateCcw, Pencil, Mic, Volume2, VolumeX
} from 'lucide-react'
import './App.css'

const initialTasks = [
  { id: 1, title: 'Review important tasks', time: '09:00 AM', priority: 'High', done: false },
  { id: 2, title: 'Work on my project', time: '11:00 AM', priority: 'High', done: false },
  { id: 3, title: 'Take a short break', time: '01:00 PM', priority: 'Low', done: true },
]

const welcomeMessage = {
  role: 'assistant',
  text: "Hi! I'm your SmartLife assistant. 😊 Add tasks in normal language, check your progress, or ask me to create a practical plan for your day.",
}

function App() {
  const [tasks, setTasks] = useState(() => {
    try {
      const saved = localStorage.getItem('smartlife-tasks')
      return saved ? JSON.parse(saved) : initialTasks
    } catch {
      return initialTasks
    }
  })

  const [title, setTitle] = useState('')
  const [time, setTime] = useState('10:00')
  const [priority, setPriority] = useState('Medium')
  const [showForm, setShowForm] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [plan, setPlan] = useState('')
  const [message, setMessage] = useState('')
  const [activeSection, setActiveSection] = useState('dashboard')
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState([welcomeMessage])
  const chatContainerRef = useRef(null)
  const recognitionRef = useRef(null)
  const [isListening, setIsListening] = useState(false)
  const [voiceReplies, setVoiceReplies] = useState(false)

  useEffect(() => {
    localStorage.setItem('smartlife-tasks', JSON.stringify(tasks))
  }, [tasks])

  useEffect(() => {
    const box = chatContainerRef.current
    if (box) {
      box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' })
    }
  }, [chatMessages])

  // Keep the sidebar highlight in sync with the section currently being viewed.
  useEffect(() => {
    const updateActiveSection = () => {
      const marker = window.innerHeight * 0.35
      const sections = [
        { name: 'dashboard', element: document.querySelector('.welcome-card') },
        { name: 'tasks', element: document.querySelector('.tasks-panel') },
        { name: 'planner', element: document.querySelector('.planner-panel') },
        { name: 'assistant', element: document.querySelector('.assistant-panel') },
      ].filter(item => item.element)

      let current = 'dashboard'
      let closestDistance = Infinity
      for (const item of sections) {
        const rect = item.element.getBoundingClientRect()
        if (rect.top <= marker && rect.bottom > marker) {
          current = item.name
          closestDistance = 0
          break
        }
        const distance = Math.min(Math.abs(rect.top - marker), Math.abs(rect.bottom - marker))
        if (distance < closestDistance) {
          closestDistance = distance
          current = item.name
        }
      }
      setActiveSection(current)
    }

    updateActiveSection()
    window.addEventListener('scroll', updateActiveSection, { passive: true })
    window.addEventListener('resize', updateActiveSection)
    return () => {
      window.removeEventListener('scroll', updateActiveSection)
      window.removeEventListener('resize', updateActiveSection)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort()
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    }
  }, [])

  function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Voice input is not supported in this browser. Please use Google Chrome or type your message instead.'
      }])
      return
    }

    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-IN'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => {
      setIsListening(false)
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        text: 'I could not hear that clearly. Please allow microphone access and try again, or type your message.'
      }])
    }
    recognition.onresult = event => {
      const spokenText = event.results?.[0]?.[0]?.transcript?.trim()
      if (spokenText) {
        setChatInput(spokenText)
        window.setTimeout(() => {
          const form = document.querySelector('.chat-form')
          if (form) form.requestSubmit()
        }, 100)
      }
    }
    recognitionRef.current = recognition
    recognition.start()
  }

  function speakReply(text) {
    if (!voiceReplies || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const spokenText = text.replace(/[•✓○🎉😊👋☕⚠️]/gu, ' ').replace(/\s+/g, ' ').trim()
    const utterance = new SpeechSynthesisUtterance(spokenText)
    utterance.lang = 'en-IN'
    utterance.rate = 1
    window.speechSynthesis.speak(utterance)
  }

  const completed = tasks.filter(task => task.done).length
  const progress = tasks.length
    ? Math.round((completed / tasks.length) * 100)
    : 0
  const pendingTasks = tasks.filter(task => !task.done)

  function timeToMinutes(value) {
    if (!value || value.toLowerCase() === 'anytime') return Infinity

    const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
    if (!match) return Infinity

    let hour = Number(match[1])
    const minute = Number(match[2])
    const meridiem = match[3].toUpperCase()

    if (meridiem === 'PM' && hour !== 12) hour += 12
    if (meridiem === 'AM' && hour === 12) hour = 0

    return hour * 60 + minute
  }

  function minutesToTime(totalMinutes) {
    const hour24 = Math.floor(totalMinutes / 60) % 24
    const minute = totalMinutes % 60
    const hour12 = hour24 % 12 || 12
    const meridiem = hour24 >= 12 ? 'PM' : 'AM'

    return `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${meridiem}`
  }

  function sortTasks(taskList) {
    const rank = { High: 0, Medium: 1, Low: 2 }

    return [...taskList].sort((a, b) => {
      const priorityDifference =
        (rank[a.priority] ?? 1) - (rank[b.priority] ?? 1)

      if (priorityDifference !== 0) return priorityDifference
      return timeToMinutes(a.time) - timeToMinutes(b.time)
    })
  }

  function navigateTo(section, selector) {
    setActiveSection(section)

    if (section === 'dashboard') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const target = document.querySelector(selector)
    if (!target) return

    // Scroll to the exact section position instead of centering a tall panel.
    const top = target.getBoundingClientRect().top + window.scrollY - 24
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }

  function addTask(e) {
    e.preventDefault()
    if (!title.trim()) return

    const [hoursText, minutesText] = time.split(':')
    const hour24 = Number(hoursText)
    const formattedTime = `${String(hour24 % 12 || 12).padStart(2, '0')}:${minutesText} ${hour24 >= 12 ? 'PM' : 'AM'}`

    if (editingTaskId !== null) {
      setTasks(prev => prev.map(task => task.id === editingTaskId
        ? { ...task, title: title.trim(), time: formattedTime, priority }
        : task
      ))
      setMessage('Your task has been updated!')
    } else {
      setTasks(prev => [...prev, {
        id: Date.now(), title: title.trim(), time: formattedTime, priority, done: false,
      }])
      setMessage('Your task has been added!')
    }

    setTitle('')
    setTime('10:00')
    setPriority('Medium')
    setEditingTaskId(null)
    setShowForm(false)
    setPlan('')
  }

  function openEditTask(task) {
    const match = task.time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
    let value = '10:00'
    if (match) {
      let hour = Number(match[1]) % 12
      if (match[3].toUpperCase() === 'PM') hour += 12
      value = `${String(hour).padStart(2, '0')}:${match[2]}`
    }
    setEditingTaskId(task.id)
    setTitle(task.title)
    setTime(value)
    setPriority(task.priority)
    setMessage('')
    setShowForm(true)
  }

  function addChatTask(taskTitle, taskPriority = 'Medium', taskTime = 'Anytime') {
    const cleanTitle = taskTitle
      .replace(/^[\s:—–-]+|[\s:—–-]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    if (!cleanTitle) return 'Please tell me the task name.'

    const duplicate = tasks.some(task =>
      task.title.toLowerCase() === cleanTitle.toLowerCase() &&
      task.time === taskTime &&
      task.priority === taskPriority &&
      !task.done
    )

    if (duplicate) {
      return `"${cleanTitle}" is already in your task list with the same time and priority.`
    }

    setTasks(prev => [
      ...prev,
      {
        id: Date.now(),
        title: cleanTitle,
        time: taskTime,
        priority: taskPriority,
        done: false,
      },
    ])

    setPlan('')
    return `Task added successfully!\nTask: ${cleanTitle}\nPriority: ${taskPriority}\nTime: ${taskTime}`
  }

  function toggleTask(id) {
    setTasks(prev =>
      prev.map(task =>
        task.id === id ? { ...task, done: !task.done } : task
      )
    )
    setPlan('')
  }

  function deleteTask(id) {
    setTasks(prev => prev.filter(task => task.id !== id))
    setPlan('')
  }

  function durationFor(task) {
    const name = task.title.toLowerCase()

    if (/break|lunch|dinner|snack|rest/.test(name)) return 15
    if (/study|exam|assignment|project|coding|practice|revision|revise/.test(name)) return 60

    return 30
  }
  function buildSchedule(taskList) {
    // A recurring water task should generate reminders, not one 30-minute block.
    const isWaterReminder = task =>
      /water/i.test(task.title) && /every|each|per/i.test(task.title) && /30\s*minutes|half\s*hour/i.test(task.title)

    const recurringWaterTasks = taskList.filter(isWaterReminder)
    const normalTasks = taskList.filter(task => !isWaterReminder(task))

    const fixed = normalTasks
      .filter(task => timeToMinutes(task.time) !== Infinity)
      .map(task => ({
        task,
        start: timeToMinutes(task.time),
        duration: durationFor(task),
        flexible: false,
      }))
      .sort((a, b) => a.start - b.start)

    const flexible = sortTasks(
      normalTasks.filter(task => timeToMinutes(task.time) === Infinity)
    )
    const entries = [...fixed]

    for (const task of flexible) {
      const duration = durationFor(task)
      let cursor = 9 * 60
      let attempts = 0

      while (attempts < 200) {
        const conflict = entries
          .slice()
          .sort((a, b) => a.start - b.start)
          .find(item => cursor < item.start + item.duration && cursor + duration > item.start)
        if (!conflict) break
        cursor = conflict.start + conflict.duration + 10
        attempts++
      }

      entries.push({ task, start: cursor, duration, flexible: true })
    }

    for (const task of recurringWaterTasks) {
      for (let cursor = 9 * 60; cursor <= 21 * 60; cursor += 30) {
        const reminderDuration = 5
        const overlapsTask = entries.some(item =>
          cursor < item.start + item.duration &&
          cursor + reminderDuration > item.start
        )

        // Keep the 30-minute reminder pattern, but skip times occupied by another task.
        if (overlapsTask) continue

        entries.push({
          task: { ...task, title: 'Drink water reminder' },
          start: cursor,
          duration: reminderDuration,
          flexible: true,
          reminder: true,
        })
      }
    }

    return entries.sort((a, b) => a.start - b.start)
  }

  function createPlan() {
    const ordered = pendingTasks

    if (!ordered.length) {
      setPlan('All tasks are completed! 🎉 Enjoy your free time.')
      return
    }

    const fixed = ordered
      .filter(task => timeToMinutes(task.time) !== Infinity)
      .map(task => ({ task, start: timeToMinutes(task.time), duration: durationFor(task) }))
      .sort((a, b) => a.start - b.start)
    const conflicts = []

    for (let i = 0; i < fixed.length; i++) {
      for (let j = i + 1; j < fixed.length; j++) {
        if (fixed[j].start < fixed[i].start + fixed[i].duration) {
          conflicts.push(`• ${fixed[i].task.title} overlaps with ${fixed[j].task.title}.`) 
        }
      }
    }

    const schedule = buildSchedule(ordered)
    let result = 'YOUR PERSONALIZED DAILY PLAN\n\n'
    result += 'Suggested schedule · Durations are estimates\n\n'

    if (conflicts.length) {
      result += '⚠️ TIME CONFLICTS — please adjust these requested times:\n'
      result += [...new Set(conflicts)].join('\n') + '\n\n'
    }

    let taskNumber = 1
    let previousEnd = null

    schedule.forEach(item => {
      if (previousEnd !== null && item.start - previousEnd >= 30) {
        result += `☕ ${minutesToTime(previousEnd)}–${minutesToTime(previousEnd + 10)} — Suggested break\n\n`
      }

      const end = item.start + item.duration
      result += `${taskNumber}. ${minutesToTime(item.start)}–${minutesToTime(end)} — ${item.task.title}\n`
      if (item.reminder) {
        result += '   Recurring reminder · Every 30 minutes'
      } else {
        result += `   ${item.task.priority} priority · Estimated ${item.duration} minutes`
        result += item.flexible ? ' · Suggested time' : ' · Requested time'
      }
      result += '\n\n'
      taskNumber++
      previousEnd = Math.max(previousEnd ?? end, end)
    })

    result += 'WHY THIS PLAN?\n'
    result += '• Requested times are preserved; conflicts are flagged above.\n'
    result += '• Tasks without a fixed time are placed in available slots from 9 AM.\n'
    result += '• Higher-priority flexible tasks are scheduled first.\n'
    if (ordered.some(task => /water/i.test(task.title) && /every|each|per/i.test(task.title) && /30\s*minutes|half\s*hour/i.test(task.title))) {
      result += '• Water reminders repeat every 30 minutes from 9 AM to 9 PM.\n'
    }
    result += '• Durations are estimates. Review the plan before following it.\n\n'
    result += 'Tip: Edit a task to change its time or priority.'
    setPlan(result)
  }

  function getAssistantReply(text) {
    const lower = text.toLowerCase().trim()
    const pending = tasks.filter(task => !task.done)

    if (/\b(plan my day|organize my day|what should i do|create a plan|make me a schedule)\b/i.test(lower)) {
      createPlan()
      return pending.length
        ? 'I created a suggested schedule in Daily Planner. Check the plan for estimated durations and any requested-time conflicts.'
        : 'You have no pending tasks right now. Add a task whenever you are ready!'
    }

    if (/\b(show|list|display)\b.*\b(tasks|task list)\b|\bwhat are my tasks\b/i.test(lower)) {
      if (!tasks.length) return 'Your task list is empty. You can say: “Add a task to study Java at 6 PM.”'
      return `Here is your task list:\n${tasks.map((task, index) => `${index + 1}. ${task.done ? '✓' : '○'} ${task.title} — ${task.time} — ${task.priority} priority`).join('\n')}`
    }

    if (/\b(mark all tasks complete|complete all tasks|finish all tasks)\b/i.test(lower)) {
      if (!pending.length) return 'All your tasks are already completed. Well done!'
      setTasks(prev => prev.map(task => ({ ...task, done: true })))
      setPlan('')
      return `Done! I marked all ${pending.length} remaining tasks as completed.`
    }

    if (/\b(complete|finish|mark done|mark as complete)\b/i.test(lower)) {
      const target = lower
        .replace(/\b(please|complete|finish|mark|as|done|the|task|my)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
      const match = pending.find(task => task.title.toLowerCase() === target) ||
        pending.find(task => target.length > 1 && task.title.toLowerCase().includes(target))
      if (match) {
        toggleTask(match.id)
        return `Marked “${match.title}” as completed. Nice work!`
      }
      return target
        ? `I couldn't find a pending task matching “${target}”. Say “show my tasks” to see the exact names.`
        : 'Which task did you finish? For example: “Complete study Java”.'
    }

    if (/\b(delete|remove)\b/i.test(lower)) {
      const target = lower
        .replace(/\b(please|delete|remove|the|task|called|named|my)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
      const match = tasks.find(task => task.title.toLowerCase() === target) ||
        tasks.find(task => target.length > 1 && task.title.toLowerCase().includes(target))
      if (match) {
        deleteTask(match.id)
        return `Deleted “${match.title}” from your task list.`
      }
      return target
        ? `I couldn't find a task matching “${target}”. Say “show my tasks” to see the exact names.`
        : 'Which task should I delete? For example: “Delete study Java”.'
    }

    // Change the time of an existing task (supports typed and speech-recognized commands).
    if (/\b(change|update|move|reschedule)\b/i.test(lower) && /\b(time|to)\b/i.test(lower)) {
      const timeMatch = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/i)
      if (!timeMatch) return 'Please include the new time, for example: “Change Java time to 7 PM”.'

      let hour = Number(timeMatch[1])
      const minute = Number(timeMatch[2] || '00')
      const meridiem = timeMatch[3].replace(/\./g, '').toUpperCase()
      if (hour < 1 || hour > 12 || minute > 59) return 'That time does not look valid. Try a time like 7 PM or 7:30 PM.'
      if (meridiem === 'PM' && hour !== 12) hour += 12
      if (meridiem === 'AM' && hour === 12) hour = 0
      const newTime = `${String(hour % 12 || 12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${meridiem}`

      // Match the existing task by its title, rather than relying on a fixed command format.
      const match = tasks
        .filter(task => task.title.trim().length > 1 && lower.includes(task.title.toLowerCase()))
        .sort((a, b) => b.title.length - a.title.length)[0]

      if (!match) return 'I couldn’t find the task name in that message. Try: “Change Java time to 7 PM”.'
      setTasks(prev => prev.map(task => task.id === match.id ? { ...task, time: newTime } : task))
      setPlan('')
      return `Updated “${match.title}” to ${newTime}.`
    }

    const isTaskRequest = /\b(add|create|remind me to|remember to|schedule)\b/i.test(text)
    if (isTaskRequest) {
      const timeMatch = text.match(/\b(?:at|by)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i) ||
        text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i)
      let taskTime = 'Anytime'

      if (timeMatch) {
        let hour = Number(timeMatch[1])
        const minute = timeMatch[2] || '00'
        const meridiem = timeMatch[3].toUpperCase()
        if (hour >= 1 && hour <= 12 && Number(minute) < 60) {
          if (meridiem === 'PM' && hour !== 12) hour += 12
          if (meridiem === 'AM' && hour === 12) hour = 0
          taskTime = `${String(hour % 12 || 12).padStart(2, '0')}:${minute} ${meridiem}`
        }
      }

      let taskPriority = 'Medium'
      if (/\b(high|urgent|important)\s*(priority)?\b/i.test(text)) taskPriority = 'High'
      else if (/\blow\s*priority\b/i.test(text)) taskPriority = 'Low'

      const taskText = text
        .replace(/^(please\s+)?(add|create|schedule)\s+/i, '')
        .replace(/^(please\s+)?remind me to\s+/i, '')
        .replace(/^(please\s+)?remember to\s+/i, '')
        .replace(/\b(high|medium|low)\s*priority\b/ig, '')
        .replace(/\b(urgent|important)\b/ig, '')
        .replace(/\b(?:at|by)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/ig, '')
        .replace(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/ig, '')
        .replace(/\b(task|priority)\b/ig, '')
        .replace(/\b(today|tomorrow|tonight)\b/ig, '')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^[\s:—–-]+|[\s:—–-]+$/g, '')
        .replace(/^(a|an|the)\s+/i, '')
        .replace(/^to\s+/i, '')
        .trim()

      if (taskText.length < 2) return 'Please include a task name. Example: “Add a high-priority task to study Java at 6 PM.”'
      return addChatTask(taskText, taskPriority, taskTime)
    }

    if (/\b(how many|my tasks|task list|progress|how am i doing)\b/i.test(lower)) {
      return `You have ${tasks.length} tasks in total. ${completed} completed and ${pending.length} remaining. Your completion progress is ${progress}%.`
    }

    if (/\b(hello|hi|hey)\b/i.test(lower)) {
      return 'Hi! I can add tasks, show your task list, mark tasks complete, delete tasks, check progress, and create a daily plan. What would you like to do?'
    }

    if (/\b(help|what can you do|commands)\b/i.test(lower)) {
      return 'Here is what I can do in this demo:\n• Add a task: “Add study Java at 6 PM”\n• Show tasks: “Show my tasks”\n• Complete a task: “Complete study Java”\n• Delete a task: “Delete study Java”\n• Check progress: “How many tasks do I have?”\n• Make a plan: “Plan my day”\n\nNote: This assistant uses built-in language rules; it is not connected to a live AI model.'
    }

    return 'I didn’t understand that request yet. Type “help” to see the actions I can perform.'
  }

  function sendChat(e) {
    e.preventDefault()

    const text = chatInput.trim()
    if (!text) return

    const reply = getAssistantReply(text)

    setChatMessages(prev => [
      ...prev,
      { role: 'user', text },
      { role: 'assistant', text: reply },
    ])

    speakReply(reply)
    setChatInput('')
  }
    return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><Brain size={25} /></div>
          <span>SmartLife<span className="brand-accent"> AI</span></span>
        </div>

        <p className="nav-label">WORKSPACE</p>

        <button type="button" className={`nav-item ${activeSection === 'dashboard' ? 'active' : ''}`} onClick={() => navigateTo('dashboard')}>
          <Target size={19} /> Dashboard
        </button>
        <button type="button" className={`nav-item ${activeSection === 'tasks' ? 'active' : ''}`} onClick={() => navigateTo('tasks', '.tasks-panel')}>
          <ListTodo size={19} /> My tasks
        </button>
        <button type="button" className={`nav-item ${activeSection === 'planner' ? 'active' : ''}`} onClick={() => navigateTo('planner', '.planner-panel')}>
          <CalendarDays size={19} /> Daily planner
        </button>
        <button type="button" className={`nav-item ${activeSection === 'assistant' ? 'active' : ''}`} onClick={() => navigateTo('assistant', '.assistant-panel')}>
          <MessageCircle size={19} /> AI assistant
        </button>

        <div className="sidebar-bottom">
          <div className="mini-sparkle"><Sparkles size={22} /></div>
          <strong>Small steps. Big progress.</strong>
          <p>Make today count, one task at a time.</p>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">YOUR PERSONAL PRODUCTIVITY SPACE</p>
            <h1>Good day! <span>👋</span></h1>
            <p className="subheading">Let's make today productive and stress-free.</p>
          </div>
          <div className="avatar">S</div>
        </header>

        <section className="welcome-card">
          <div className="welcome-copy">
            <span className="pill"><Sparkles size={14} /> YOUR DAY, YOUR WAY</span>
            <h2>Make time for what<br />really matters.</h2>
            <p>Organize your priorities, track your progress, and build better daily habits.</p>
            <button type="button" className="primary-btn" onClick={() => { setEditingTaskId(null); setTitle(''); setTime('10:00'); setPriority('Medium'); setMessage(''); setShowForm(true) }}>
              <Plus size={18} /> Add a task
            </button>
          </div>
          <div className="welcome-art"><Brain size={100} strokeWidth={1.2} /></div>
        </section>

        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon purple"><ListTodo size={21} /></div>
            <p>Total tasks</p>
            <strong>{tasks.length}</strong>
            <span>Tasks in your list</span>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><CheckCircle2 size={21} /></div>
            <p>Completed</p>
            <strong>{completed}</strong>
            <span>Tasks finished</span>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange"><Zap size={21} /></div>
            <p>Remaining</p>
            <strong>{tasks.length - completed}</strong>
            <span>Keep going!</span>
          </div>
        </section>

        <section className="content-grid">
          <div className={`panel tasks-panel ${activeSection === 'tasks' ? 'section-focused' : ''}`}>
            <div className="panel-header">
              <div>
                <h3><ListTodo size={20} /> Today's tasks</h3>
                <p>One step at a time.</p>
              </div>
              <button type="button" className="small-btn" onClick={() => { setEditingTaskId(null); setTitle(''); setTime('10:00'); setPriority('Medium'); setMessage(''); setShowForm(true) }}>
                <Plus size={16} /> Add
              </button>
            </div>

            {message && <p className="success-message">{message}</p>}

            <div className="task-list">
              {sortTasks(tasks).map(task => (
                <div className={`task-row ${task.done ? 'task-done' : ''}`} key={task.id}>
                  <button type="button" className="check-btn" onClick={() => toggleTask(task.id)} aria-label={task.done ? 'Mark incomplete' : 'Mark complete'}>
                    {task.done ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                  </button>
                  <div className="task-info">
                    <strong>{task.title}</strong>
                    <span><Clock3 size={13} /> {task.time}</span>
                  </div>
                  <span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span>
                  <button type="button" className="edit-btn" onClick={() => openEditTask(task)} aria-label="Edit task" title="Edit task">
                    <Pencil size={15} />
                  </button>
                  <button type="button" className="delete-btn" onClick={() => deleteTask(task.id)} aria-label="Delete task">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {tasks.length === 0 && <p className="empty-state">No tasks yet. Add your first task!</p>}
            </div>

            <div className="progress-area">
              <div className="progress-label">
                <span>Daily progress</span>
                <strong>{progress}%</strong>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>

          <div className={`panel planner-panel ${activeSection === 'planner' ? 'section-focused' : ''}`}>
            <div className="planner-icon"><Sparkles size={25} /></div>
            <span className="pill">SMART PLANNER</span>
            <h3>Plan your day</h3>
            <p>Get a suggested schedule with estimated durations, priority order, and breaks.</p>
            <button type="button" className="primary-btn full-btn" onClick={createPlan}>
              <Zap size={17} /> Create my plan
            </button>
            {plan && <pre className="plan-result">{plan}</pre>}
            <div className="tip-box">
              <strong>💡 A little reminder</strong>
              <p>Focus on your most important task first. Progress matters more than perfection.</p>
            </div>
          </div>
        </section>

        <section className={`panel assistant-panel ${activeSection === 'assistant' ? 'section-focused' : ''}`}>
          <div className="assistant-heading">
            <div className="assistant-logo"><Bot size={25} /></div>
            <div>
              <span className="pill"><Sparkles size={13} /> SMARTLIFE ASSISTANT</span>
              <h3>How can I help you today?</h3>
              <p>Ask me to plan your day, add a task, or check your progress.</p>
            </div>
            <button type="button" className="reset-chat-btn" onClick={() => setChatMessages([welcomeMessage])} title="Clear conversation" aria-label="Clear conversation">
              <RotateCcw size={17} />
            </button>
          </div>

          <div className="chat-messages" aria-live="polite" ref={chatContainerRef}>
            {chatMessages.map((msg, index) => (
              <div className={`chat-message ${msg.role}`} key={index}>
                <div className="chat-avatar">
                  {msg.role === 'assistant' ? <Bot size={17} /> : <User size={17} />}
                </div>
                <div className="chat-bubble">
                  {msg.text.split('\n').map((line, i) => (
                    <span key={i}>{line || '\u00A0'}<br /></span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="suggestion-chips">
            <button type="button" onClick={() => setChatInput('Plan my day')}>Plan my day</button>
            <button type="button" onClick={() => setChatInput('How many tasks do I have?')}>Check my tasks</button>
            <button type="button" onClick={() => setChatInput('Add a high-priority task to study Java at 6 PM')}>Add a task</button>
          </div>

          <div className="voice-controls">
            <button type="button" className={`voice-btn ${isListening ? 'listening' : ''}`} onClick={startVoiceInput} aria-label={isListening ? 'Stop voice input' : 'Speak to assistant'}>
              <Mic size={17} /> {isListening ? 'Listening… click to stop' : 'Talk to SmartLife'}
            </button>
            <button type="button" className={`voice-btn ${voiceReplies ? 'voice-enabled' : ''}`} onClick={() => {
              setVoiceReplies(value => {
                if (value && 'speechSynthesis' in window) window.speechSynthesis.cancel()
                return !value
              })
            }} aria-label={voiceReplies ? 'Turn spoken replies off' : 'Turn spoken replies on'}>
              {voiceReplies ? <Volume2 size={17} /> : <VolumeX size={17} />}
              {voiceReplies ? 'Voice replies on' : 'Voice replies off'}
            </button>
          </div>

          <form className="chat-form" onSubmit={sendChat}>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type a message..." aria-label="Message the assistant" />
            <button type="submit" aria-label="Send message" disabled={!chatInput.trim()}>
              <Send size={19} />
            </button>
          </form>

          <p className="chat-disclaimer">Voice demo · Uses your browser’s speech features. Assistant actions still use built-in rules, not a connected AI model.</p>
        </section>

        <footer>SmartLife AI · Plan mindfully. Live better.</footer>
      </main>

      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); setEditingTaskId(null); setTitle('') }}>
          <div className="task-modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="pill"><Sparkles size={14} /> {editingTaskId !== null ? 'EDIT TASK' : 'NEW TASK'}</span>
                <h2 id="task-modal-title">{editingTaskId !== null ? 'Edit task' : 'Add a task'}</h2>
                <p>{editingTaskId !== null ? 'Update your task details.' : 'What would you like to get done?'}</p>
              </div>
              <button type="button" className="modal-close" onClick={() => { setShowForm(false); setEditingTaskId(null); setTitle('') }} aria-label="Close form">
                <X size={20} />
              </button>
            </div>

            <form className="task-form modal-form" onSubmit={addTask}>
              <label htmlFor="task-title">Task name</label>
              <input id="task-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Finish my assignment" required autoFocus />

              <label htmlFor="task-time">Time</label>
              <input id="task-time" type="time" value={time} onChange={e => setTime(e.target.value)} required />

              <label htmlFor="task-priority">Priority</label>
              <select id="task-priority" value={priority} onChange={e => setPriority(e.target.value)}>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>

              <button className="primary-btn full-btn" type="submit">
                {editingTaskId !== null ? <Pencil size={17} /> : <Plus size={17} />} {editingTaskId !== null ? 'Save changes' : 'Save task'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App