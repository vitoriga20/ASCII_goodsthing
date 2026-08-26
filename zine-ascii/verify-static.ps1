$ErrorActionPreference = 'Stop'

$page = Join-Path $PSScriptRoot 'index.html'
if (-not (Test-Path $page)) {
  Write-Error 'FAIL: index.html is missing.'
  exit 1
}

$html = Get-Content -Raw $page
$requiredPatterns = [ordered]@{
  'zine main landmark' = '<main\b[^>]*class=["'']zine["'']'
  'interactive portrait semantics' = '<div\b[^>]*class=["''][^"'']*\bportrait\b[^"'']*["''][^>]*role=["'']application["''][^>]*tabindex=["'']0["'']'
  'portrait keyboard instructions' = 'id=["'']portrait-instructions["'']'
  'all portrait art hidden from AT' = '<pre\b[^>]*class=["''][^"'']*\bink\b[^"'']*["''][^>]*aria-hidden=["'']true["'']'
  'blue registration layer' = '<pre\b[^>]*class=["''][^"'']*\bink-blue\b[^"'']*["'']'
  'red registration layer' = '<pre\b[^>]*class=["''][^"'']*\bink-red\b[^"'']*["'']'
  'noise state' = '<body\b[^>]*data-noise=["'']low["'']'
  'keyboard noise button' = '<button\b[^>]*id=["'']noise-toggle["''][^>]*aria-pressed='
  'colour shift variables' = '--shift-x\s*:'
  'pointer input' = "addEventListener\(['\"]pointermove['\"]"
  'touch input' = "addEventListener\(['\"]touchmove['\"]"
  'touch drag containment' = 'touch-action\s*:\s*none'
  'non-passive touch listener' = "touchmove['\"],\s*\([^)]*\)\s*=>[\s\S]{0,500}?passive:\s*false"
  'reduced motion fallback' = '@media\s*\(prefers-reduced-motion:\s*reduce\)'
}

$missing = @($requiredPatterns.GetEnumerator() | Where-Object { $html -notmatch $_.Value } | ForEach-Object Key)
if ($missing.Count -gt 0) {
  Write-Error ("FAIL: missing required structures: " + ($missing -join ', '))
  exit 1
}

$externalRefs = [regex]::Matches($html, '(?i)(?:src|href|srcset|poster|data)\s*=\s*["'']\s*(?:https?:)?//')
if ($externalRefs.Count -gt 0) {
  Write-Error 'FAIL: external resource reference found.'
  exit 1
}

$blockedPatterns = [ordered]@{
  'CSS url()' = '(?i)url\s*\('
  'CSS @import' = '(?i)@import\b'
  'fetch API' = '\bfetch\s*\('
  'XMLHttpRequest API' = '\bXMLHttpRequest\b'
  'WebSocket API' = '\bWebSocket\b'
  'EventSource API' = '\bEventSource\b'
}
$blocked = @($blockedPatterns.GetEnumerator() | Where-Object { $html -match $_.Value } | ForEach-Object Key)
if ($blocked.Count -gt 0) {
  Write-Error ("FAIL: blocked external-loading pattern found: " + ($blocked -join ', '))
  exit 1
}

Write-Output 'PASS: 14 required structures present; 0 external resource or network-loading patterns.'
