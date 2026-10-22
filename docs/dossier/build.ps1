# Builds every LaTeX document of the dossier into docs/dossier/build/.
# Usage (from any directory):  powershell -ExecutionPolicy Bypass -File docs/dossier/build.ps1
# Needs MiKTeX (or TeX Live) with latexmk on PATH. PDFs are not committed.

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

# latexmk is a Perl script. MiKTeX does not ship Perl; Git for Windows does.
# If perl is not on PATH, append Git's copy for this process only.
if (-not (Get-Command perl -ErrorAction SilentlyContinue)) {
  $git = Get-Command git -ErrorAction SilentlyContinue
  $candidates = @('C:\Program Files\Git\usr\bin')
  if ($git) { $candidates += (Join-Path (Split-Path (Split-Path $git.Source)) 'usr\bin') }
  foreach ($c in $candidates) {
    if (Test-Path (Join-Path $c 'perl.exe')) { $env:PATH = "$env:PATH;$c"; break }
  }
}
$useLatexmk = [bool](Get-Command perl -ErrorAction SilentlyContinue)
if (-not $useLatexmk) { Write-Host 'perl not found: running pdflatex three times instead of latexmk.' }
$out = Join-Path $root 'build'
New-Item -ItemType Directory -Force $out | Out-Null

$failed = @()
$built = 0
foreach ($dir in @($root, (Join-Path $root 'antrag'), (Join-Path $root 'partner'))) {
  if (-not (Test-Path $dir)) { continue }
  Get-ChildItem -Path $dir -Filter '*.tex' -File |
    Where-Object { $_.Name -ne 'preamble.tex' -and (Select-String -Path $_.FullName -Pattern '\\documentclass' -Quiet) } |
    ForEach-Object {
      Write-Host "== $($_.FullName)"
      Push-Location $dir
      try {
        # Empty stdin, so a TeX error can never wait for input.
        if ($useLatexmk) {
          $null | & latexmk -pdf -interaction=nonstopmode "-outdir=$out" $_.Name | Out-Host
          $code = $LASTEXITCODE
        } else {
          foreach ($pass in 1..3) {
            $null | & pdflatex -interaction=nonstopmode "-output-directory=$out" $_.Name | Out-Null
            $code = $LASTEXITCODE
            if ($code -ne 0) { break }
          }
        }
        if ($code -ne 0) { $failed += $_.Name } else { $built++ }
      } finally {
        Pop-Location
      }
    }
}

Write-Host "Built $built document(s) into $out"
if ($failed.Count -gt 0) {
  Write-Host "Failed: $($failed -join ', ')"
  exit 1
}
exit 0
