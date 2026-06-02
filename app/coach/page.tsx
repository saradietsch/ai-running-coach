'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

type Message = { role: 'user' | 'assistant'; content: string }

const SUGGESTED = [
  'How is my training going overall?',
  'How well did I prepare for my half marathon?',
  'What should I focus on now that the race is over?',
  'Am I ready to start training for another race?',
]

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [streamingContent, setStreamingContent] = useState('')
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  async function ask(q: string) {
    const trimmed = q.trim()
    if (!trimmed || loading) return

    setLoading(true)
    setInput('')
    setCurrentQuestion(trimmed)
    setStreamingContent('')

    let fullResponse = ''

    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed, history: messages }),
      })

      if (!res.ok || !res.body) {
        setMessages((prev) => [
          ...prev,
          { role: 'user', content: trimmed },
          { role: 'assistant', content: 'Something went wrong. Please try again.' },
        ])
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        fullResponse += chunk
        setStreamingContent(fullResponse)
      }
    } catch {
      fullResponse = 'Something went wrong. Please try again.'
    } finally {
      // Commit completed exchange to history
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: trimmed },
        { role: 'assistant', content: fullResponse },
      ])
      setStreamingContent('')
      setCurrentQuestion('')
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    ask(input)
  }

  const hasConversation = messages.length > 0 || loading

  return (
    <main className="min-h-screen bg-orange-50 flex flex-col">
      {/* Nav */}
      <nav className="border-b border-orange-200 bg-white/70 backdrop-blur px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <span
            className="font-bold text-lg text-stone-900 tracking-tight"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Strava Coach
          </span>
          <Link href="/dashboard" className="text-stone-500 text-sm hover:text-stone-900 transition-colors">
            Dashboard
          </Link>
          <Link href="/coach" className="text-orange-600 text-sm font-medium">
            AI Coach
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto w-full px-6 py-8 flex flex-col flex-1 gap-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">AI Coach</h1>
          <p className="text-stone-500 text-sm mt-1">
            Ask anything about your training, race results, recovery, or goals.
            Your full run history is included automatically.
          </p>
        </div>

        {/* Suggested questions — only shown before first message */}
        {!hasConversation && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTED.map((q) => (
              <button
                key={q}
                onClick={() => ask(q)}
                className="px-3 py-1.5 bg-white border border-orange-200 rounded-full text-sm text-stone-600 hover:bg-orange-100 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Conversation thread */}
        {hasConversation && (
          <div className="space-y-4">
            {/* Completed messages */}
            {messages.map((msg, i) =>
              msg.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <div className="bg-orange-500 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm max-w-[80%] leading-relaxed">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex justify-start">
                  <div className="bg-white border border-orange-200 rounded-2xl rounded-tl-sm px-5 py-4 text-sm max-w-[85%] shadow-sm">
                    <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest mb-2">Coach</p>
                    <p className="text-stone-700 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              )
            )}

            {/* Streaming: show current question bubble + live response */}
            {loading && (
              <>
                <div className="flex justify-end">
                  <div className="bg-orange-500 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm max-w-[80%] leading-relaxed">
                    {currentQuestion}
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-white border border-orange-200 rounded-2xl rounded-tl-sm px-5 py-4 text-sm max-w-[85%] shadow-sm">
                    <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest mb-2">Coach</p>
                    <p className="text-stone-700 leading-relaxed whitespace-pre-wrap">
                      {streamingContent}
                      <span className="inline-block w-0.5 h-4 bg-orange-400 ml-0.5 animate-pulse align-middle" />
                    </p>
                  </div>
                </div>
              </>
            )}

            <div ref={bottomRef} />
          </div>
        )}

        {/* Empty state */}
        {!hasConversation && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-stone-300 text-sm">Select a suggestion or type a question below.</p>
          </div>
        )}

        {/* Input */}
        <div className="mt-auto space-y-2">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl border border-orange-200 shadow-sm p-4 flex gap-3 items-end"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  ask(input)
                }
              }}
              placeholder="Ask your coach something…"
              className="flex-1 bg-transparent text-stone-800 placeholder-stone-400 text-sm resize-none border-none focus:outline-none"
              rows={2}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-200 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors shrink-0"
            >
              {loading ? '…' : 'Send'}
            </button>
          </form>

          {/* Attribution */}
          <p className="text-center text-xs text-stone-400">
            Powered by{' '}
            <span className="text-orange-400 font-medium">Claude</span>
            {' '}by Anthropic
          </p>
        </div>

      </div>
    </main>
  )
}
