import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useCallback, useEffect, useRef, useState } from 'react'
import { queryText, queryTextStream, Message } from '@/api/lightrag'
import { errorMessage } from '@/lib/utils'
import { useSettingsStore } from '@/stores/settings'
import { useDebounce } from '@/hooks/useDebounce'
import QuerySettings from '@/components/retrieval/QuerySettings'
import { ChatMessage, MessageWithError } from '@/components/retrieval/ChatMessage'
import { EraserIcon, SendIcon, Sprout, Leaf } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function RetrievalTesting() {
  const { t } = useTranslation()
  const [messages, setMessages] = useState<MessageWithError[]>(
    () => useSettingsStore.getState().retrievalHistory || []
  )
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!inputValue.trim() || isLoading) return

      // Create messages
      const userMessage: Message = {
        content: inputValue,
        role: 'user'
      }

      const assistantMessage: Message = {
        content: '',
        role: 'assistant'
      }

      const prevMessages = [...messages]

      // Add messages to chatbox
      setMessages([...prevMessages, userMessage, assistantMessage])

      // Clear input and set loading
      setInputValue('')
      setIsLoading(true)

      // Create a function to update the assistant's message
      const updateAssistantMessage = (chunk: string, isError?: boolean) => {
        assistantMessage.content += chunk
        setMessages((prev) => {
          const newMessages = [...prev]
          const lastMessage = newMessages[newMessages.length - 1]
          if (lastMessage.role === 'assistant') {
            lastMessage.content = assistantMessage.content
            lastMessage.isError = isError
          }
          return newMessages
        })
      }

      // Prepare query parameters
      const state = useSettingsStore.getState()
      const queryParams = {
        ...state.querySettings,
        query: userMessage.content,
        conversation_history: prevMessages
          .filter((m) => m.isError !== true)
          .map((m) => ({ role: m.role, content: m.content }))
      }

      try {
        // Run query
        if (state.querySettings.stream) {
          let errorMessage = ''
          await queryTextStream(queryParams, updateAssistantMessage, (error) => {
            errorMessage += error
          })
          if (errorMessage) {
            if (assistantMessage.content) {
              errorMessage = assistantMessage.content + '\n' + errorMessage
            }
            updateAssistantMessage(errorMessage, true)
          }
        } else {
          const response = await queryText(queryParams)
          updateAssistantMessage(response.response)
        }
      } catch (err) {
        // Handle error
        updateAssistantMessage(`${t('retrievePanel.retrieval.error')}\n${errorMessage(err)}`, true)
      } finally {
        // Clear loading and add messages to state
        setIsLoading(false)
        useSettingsStore
          .getState()
          .setRetrievalHistory([...prevMessages, userMessage, assistantMessage])
      }
    },
    [inputValue, isLoading, messages, setMessages, t]
  )

  const debouncedMessages = useDebounce(messages, 100)
  useEffect(() => scrollToBottom(), [debouncedMessages, scrollToBottom])

  const clearMessages = useCallback(() => {
    setMessages([])
    useSettingsStore.getState().setRetrievalHistory([])
  }, [setMessages])

  return (
    <div className="flex size-full gap-2 px-2 pb-12 overflow-hidden bg-green-50/30">
      <div className="flex grow flex-col gap-4">
        <div className="relative grow">
          <div className="bg-primary-foreground/60 absolute inset-0 flex flex-col overflow-auto rounded-lg border border-green-200 p-2">
            <div className="flex min-h-0 flex-1 flex-col gap-2">
              {messages.length === 0 ? (
                <div className="text-muted-foreground flex h-full flex-col items-center justify-center text-lg">
                  <Sprout className="h-12 w-12 text-green-500 mb-2" />
                  <p>{t('retrievePanel.retrieval.startPrompt')}</p>
                  <p className="text-sm text-green-600 mt-2">欢迎使用农业知识检索系统，请输入您的农业相关问题...</p>
                </div>
              ) : (
                messages.map((message, idx) => (
                  <div
                    key={idx}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {<ChatMessage message={message} />}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} className="pb-1" />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={clearMessages}
            disabled={isLoading}
            size="sm"
            className="border-green-300 hover:bg-green-100"
          >
            <EraserIcon />
            {t('retrievePanel.retrieval.clear')}
          </Button>
          <Input
            className="flex-1 border-green-300 focus-visible:ring-green-400"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="请输入您的农业问题，例如：如何防治水稻稻瘟病？"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            variant="default" 
            disabled={isLoading} 
            size="sm"
            className="bg-green-600 hover:bg-green-700"
          >
            <Leaf className="mr-1 h-4 w-4" />
            {t('retrievePanel.retrieval.send')}
          </Button>
        </form>
      </div>
      <QuerySettings />
    </div>
  )
}
