$ErrorActionPreference = 'Stop'

$pagePath = Join-Path $PSScriptRoot 'index.html'
if (-not (Test-Path -LiteralPath $pagePath)) {
  throw "Expected CRT page at $pagePath"
}

$page = Get-Content -Raw -LiteralPath $pagePath
$requiredMarkers = @(
  '<meta charset="UTF-8">',
  'name="viewport"',
  '<pre',
  'scanlines',
  'document.body.dataset.mode',
  'diagnostic',
  'sleep',
  'prefers-reduced-motion',
  'aria-live',
  'click',
  'keydown'
)

$missing = $requiredMarkers | Where-Object { $page -notmatch [regex]::Escape($_) }
if ($missing) {
  throw "Missing required CRT markers: $($missing -join ', ')"
}

if ($page -match '(?is)<\s*(?:script|link|img|source|video|audio|embed|object|iframe)\b[^>]*\b(?:src|href|srcset|poster|data)\s*=') {
  throw 'The CRT page must not load external or relative HTML resources.'
}

if ($page -match '(?is)\burl\s*\(|@import\s+(?:url\s*\(|["''])') {
  throw 'The CRT page must not load external or relative CSS resources.'
}

if ($page -notmatch 'body\[data-mode="sleep"\]\s*\{[\s\S]*?--dim:\s*#86c98e;') {
  throw 'Sleep mode must use a readable muted green for normal footer text.'
}

if ($page -notmatch 'body\[data-mode="sleep"\]\s+\.badge\s*\{\s*color:\s*#e7f8e8;\s*background:\s*#285030;') {
  throw 'The sleep badge must maintain normal-text contrast.'
}

if ($page -notmatch "badge\.textContent\s*=\s*isSleeping\s*\?\s*'IDLE'\s*:\s*'LIVE'") {
  throw 'The badge must continue to show the current diagnostic or sleep state.'
}

if ($page -notmatch '@media \(max-width: 430px\)[\s\S]*?\.face\s*\{\s*font-size:\s*clamp\(5\.5px,\s*1\.9vw,\s*8px\);') {
  throw 'The mobile layout must shrink the preformatted face to keep every character visible at 320px.'
}

Write-Host 'CRT static check passed.'
