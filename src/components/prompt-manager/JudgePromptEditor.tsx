import { useCallback, useMemo } from 'react'
import Editor from '@monaco-editor/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTestSuiteStore } from '@/stores/testSuiteStore'
import { useSettingsStore } from '@/stores/settingsStore'
import type { TestSuite } from '@/types'
import { PromptEnhancerDialog } from './PromptEnhancerDialog'

interface JudgePromptEditorProps {
  testSuite: TestSuite
}

export function JudgePromptEditor({ testSuite }: JudgePromptEditorProps) {
  const { updateJudgeSystemPrompt } = useTestSuiteStore()
  const { theme } = useSettingsStore()

  const editorTheme = useMemo(() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'vs-dark' : 'light'
    }
    return theme === 'dark' ? 'vs-dark' : 'light'
  }, [theme])

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined) {
        updateJudgeSystemPrompt(testSuite.id, value)
      }
    },
    [testSuite.id, updateJudgeSystemPrompt]
  )

  return (
    <Card className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-start justify-between gap-2 sm:gap-4">
          <div className="min-w-0">
            <CardTitle className="text-base sm:text-lg">Judge System Prompt</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Additional instructions for the LLM judge, appended to the default rubric
            </CardDescription>
          </div>
          <PromptEnhancerDialog
            testSuite={testSuite}
            target="judge"
            currentPrompt={testSuite.judgeSystemPrompt ?? ''}
            onApply={(value) => updateJudgeSystemPrompt(testSuite.id, value)}
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="markdown"
          value={testSuite.judgeSystemPrompt ?? ''}
          onChange={handleChange}
          theme={editorTheme}
          options={{
            minimap: { enabled: false },
            lineNumbers: 'on',
            wordWrap: 'on',
            fontSize: 14,
            padding: { top: 16, bottom: 16 },
            scrollBeyondLastLine: false,
          }}
        />
      </CardContent>
    </Card>
  )
}
