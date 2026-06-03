const React = window.React

interface Props {
  baseUrl: string
  apiKey: string
  onBaseUrlChange: (value: string) => void
  onApiKeyChange: (value: string) => void
}

export function N8nConfigPanel({ baseUrl, apiKey, onBaseUrlChange, onApiKeyChange }: Props) {
  const { Card, Input, SectionHeader } = window.UI || {}

  return (
    <>
      {SectionHeader && <SectionHeader label="Configure n8n" />}
      {Card && (
        <Card>
          {Input && (
            <Input
              value={baseUrl}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onBaseUrlChange(e.target.value)}
              placeholder="http://localhost:5678"
            />
          )}
          {Input && (
            <Input
              type="password"
              value={apiKey}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onApiKeyChange(e.target.value)}
              placeholder="n8n_api_…"
            />
          )}
        </Card>
      )}
    </>
  )
}
