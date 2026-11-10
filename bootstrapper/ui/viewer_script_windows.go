//go:build windows

package ui

// viewerScript renders the installer window. It is intentionally dumb: every
// string it shows, including button captions, comes from the status JSON the Go
// process publishes, so the window has no language of its own.
//
// The script is PowerShell 5.1 compatible (Windows 10/11 ship it), uses only
// WinForms, and avoids backticks so it can live in a Go raw string.
const viewerScript = `param(
   [Parameter(Mandatory=$true)][string]$StatusPath
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$script:dir          = [System.IO.Path]::GetDirectoryName($StatusPath)
$script:decisionPath = [System.IO.Path]::Combine($script:dir, 'decision.txt')
$script:readyPath    = [System.IO.Path]::Combine($script:dir, 'ready.txt')
$script:frames       = @([char]0x25D0, [char]0x25D3, [char]0x25D1, [char]0x25D2)
$script:tick         = 0
$script:raw          = ''
$script:phase        = 'welcome'
$script:logPath      = ''
$script:copiedLabel  = ''
$script:lastUpdate   = Get-Date

# --- palette -------------------------------------------------------------
$colBg     = [System.Drawing.ColorTranslator]::FromHtml('#15171C')
$colCard   = [System.Drawing.ColorTranslator]::FromHtml('#1E2128')
$colCard2  = [System.Drawing.ColorTranslator]::FromHtml('#1B1E24')
$colText   = [System.Drawing.ColorTranslator]::FromHtml('#E9ECF1')
$colMuted  = [System.Drawing.ColorTranslator]::FromHtml('#98A0AC')
$colAccent = [System.Drawing.ColorTranslator]::FromHtml('#45F3FF')
$colGreen  = [System.Drawing.ColorTranslator]::FromHtml('#58E39B')
$colYellow = [System.Drawing.ColorTranslator]::FromHtml('#FFC24B')
$colRed    = [System.Drawing.ColorTranslator]::FromHtml('#FF6B6B')
$colTrack  = [System.Drawing.ColorTranslator]::FromHtml('#2A2F38')

# --- fonts (created once; recreating them per tick leaks GDI handles) ----
$fBrand      = [System.Drawing.Font]::new('Segoe UI', [single]13, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Point)
$fHeadline   = [System.Drawing.Font]::new('Segoe UI', [single]15.5, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Point)
$fSub        = [System.Drawing.Font]::new('Segoe UI', [single]9.5, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Point)
$fSmall      = [System.Drawing.Font]::new('Segoe UI', [single]8.5, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Point)
$fStep       = [System.Drawing.Font]::new('Segoe UI', [single]10, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Point)
$fStepBold   = [System.Drawing.Font]::new('Segoe UI', [single]10, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Point)
$fCardTitle  = [System.Drawing.Font]::new('Segoe UI', [single]9, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Point)
$fButton     = [System.Drawing.Font]::new('Segoe UI', [single]9.5, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Point)
$fGlyph      = [System.Drawing.Font]::new('Segoe UI', [single]11.5, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Point)

function New-Label {
   param([int]$X,[int]$Y,[int]$W,[int]$H,[string]$Text,[System.Drawing.Font]$Font,$Color,$Align)
   $l = New-Object System.Windows.Forms.Label
   $l.Location = New-Object System.Drawing.Point -ArgumentList $X,$Y
   $l.Size = New-Object System.Drawing.Size -ArgumentList $W,$H
   $l.Text = $Text
   $l.Font = $Font
   $l.ForeColor = $Color
   $l.BackColor = [System.Drawing.Color]::Transparent
   $l.AutoSize = $false
   $l.UseMnemonic = $false
   if ($null -ne $Align) { $l.TextAlign = $Align }
   return $l
}

function New-Link {
   param([int]$X,[int]$Y,[int]$W,[int]$H,[string]$Text)
   $l = New-Object System.Windows.Forms.LinkLabel
   $l.Location = New-Object System.Drawing.Point -ArgumentList $X,$Y
   $l.Size = New-Object System.Drawing.Size -ArgumentList $W,$H
   $l.Text = $Text
   $l.Font = $fSmall
   $l.LinkColor = $colAccent
   $l.ActiveLinkColor = $colText
   $l.VisitedLinkColor = $colAccent
   $l.LinkBehavior = 'HoverUnderline'
   $l.BackColor = [System.Drawing.Color]::Transparent
   $l.AutoSize = $false
   return $l
}

# --- form ---------------------------------------------------------------
$form = New-Object System.Windows.Forms.Form
$form.Text = 'CalyCode Installer'
$form.ClientSize = New-Object System.Drawing.Size -ArgumentList 680,688
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.ShowIcon = $false
$form.BackColor = $colBg
$form.ForeColor = $colText
$form.Font = $fSub
$form.TopMost = $true
$form.ControlBox = $false
$form.AutoScaleMode = [System.Windows.Forms.AutoScaleMode]::Dpi
$form.AutoScaleDimensions = New-Object System.Drawing.SizeF -ArgumentList 96,96

$strip = New-Object System.Windows.Forms.Panel
$strip.Location = New-Object System.Drawing.Point -ArgumentList 0,0
$strip.Size = New-Object System.Drawing.Size -ArgumentList 680,4
$strip.BackColor = $colAccent
$form.Controls.Add($strip)

$mark = New-Object System.Windows.Forms.Panel
$mark.Location = New-Object System.Drawing.Point -ArgumentList 28,22
$mark.Size = New-Object System.Drawing.Size -ArgumentList 10,10
$mark.BackColor = $colAccent
$form.Controls.Add($mark)

$brand = New-Label -X 46 -Y 15 -W 240 -H 26 -Text 'CalyCode' -Font $fBrand -Color $colText
$form.Controls.Add($brand)

$tagline = New-Label -X 300 -Y 19 -W 352 -H 20 -Text '' -Font $fSmall -Color $colMuted -Align ([System.Drawing.ContentAlignment]::MiddleRight)
$form.Controls.Add($tagline)

$headline = New-Label -X 28 -Y 52 -W 624 -H 30 -Text '' -Font $fHeadline -Color $colText
$form.Controls.Add($headline)

$sub = New-Label -X 28 -Y 86 -W 624 -H 46 -Text '' -Font $fSub -Color $colMuted
$form.Controls.Add($sub)

# --- step checklist -----------------------------------------------------
$stepsCard = New-Object System.Windows.Forms.Panel
$stepsCard.Location = New-Object System.Drawing.Point -ArgumentList 20,138
$stepsCard.Size = New-Object System.Drawing.Size -ArgumentList 640,256
$stepsCard.BackColor = $colCard
$form.Controls.Add($stepsCard)

$rows = @()
for ($i = 0; $i -lt 8; $i++) {
   $y = 8 + ($i * 60)
   $glyph = New-Label -X 16 -Y ($y + 3) -W 24 -H 26 -Text '' -Font $fGlyph -Color $colMuted -Align ([System.Drawing.ContentAlignment]::MiddleLeft)
   $title = New-Label -X 46 -Y ($y + 2) -W 578 -H 22 -Text '' -Font $fStep -Color $colText
   $detail = New-Label -X 46 -Y ($y + 24) -W 578 -H 32 -Text '' -Font $fSmall -Color $colMuted
   $stepsCard.Controls.Add($glyph)
   $stepsCard.Controls.Add($title)
   $stepsCard.Controls.Add($detail)
   $rows += ,@{ Glyph = $glyph; Title = $title; Detail = $detail; State = 'pending' }
}

# --- details card: welcome bullets before starting, "why this matters" while
#     running, next steps when done. The card is authored in its welcome
#     geometry so the form loads at the right size on every DPI. ------------
$detailsCard = New-Object System.Windows.Forms.Panel
$detailsCard.Location = New-Object System.Drawing.Point -ArgumentList 20,402
$detailsCard.Size = New-Object System.Drawing.Size -ArgumentList 640,190
$detailsCard.BackColor = $colCard2
$form.Controls.Add($detailsCard)

$detailsTitle = New-Label -X 18 -Y 14 -W 600 -H 20 -Text '' -Font $fCardTitle -Color $colAccent
$detailsCard.Controls.Add($detailsTitle)

$detailsBody = New-Label -X 18 -Y 38 -W 604 -H 118 -Text '' -Font $fSmall -Color ([System.Drawing.ColorTranslator]::FromHtml('#C3C9D2'))
$detailsCard.Controls.Add($detailsBody)

# Where the setup log will be written; visible only on the welcome panel.
$logNotice = New-Label -X 18 -Y 160 -W 604 -H 22 -Text '' -Font $fSmall -Color $colMuted
$detailsCard.Controls.Add($logNotice)

# --- progress -----------------------------------------------------------
$track = New-Object System.Windows.Forms.Panel
$track.Location = New-Object System.Drawing.Point -ArgumentList 28,624
$track.Size = New-Object System.Drawing.Size -ArgumentList 620,5
$track.BackColor = $colTrack
$form.Controls.Add($track)

$fill = New-Object System.Windows.Forms.Panel
$fill.Location = New-Object System.Drawing.Point -ArgumentList 0,0
$fill.Size = New-Object System.Drawing.Size -ArgumentList 0,5
$fill.BackColor = $colAccent
$track.Controls.Add($fill)

$meta = New-Label -X 28 -Y 600 -W 320 -H 20 -Text '' -Font $fSmall -Color $colMuted
$form.Controls.Add($meta)

$elapsed = New-Label -X 332 -Y 600 -W 320 -H 20 -Text '' -Font $fSmall -Color $colMuted -Align ([System.Drawing.ContentAlignment]::MiddleRight)
$form.Controls.Add($elapsed)

$openLog = New-Link -X 28 -Y 638 -W 180 -H 22 -Text ''
$form.Controls.Add($openLog)

$copyLog = New-Link -X 214 -Y 638 -W 220 -H 22 -Text ''
$form.Controls.Add($copyLog)

function New-ActionButton {
   param([int]$X,[string]$Text,$Color)
   $b = New-Object System.Windows.Forms.Button
   $b.Location = New-Object System.Drawing.Point -ArgumentList $X,632
   $b.Size = New-Object System.Drawing.Size -ArgumentList 96,30
   $b.Text = $Text
   $b.Font = $fButton
   $b.FlatStyle = 'Flat'
   $b.FlatAppearance.BorderSize = 0
   $b.BackColor = $Color
   $b.ForeColor = [System.Drawing.ColorTranslator]::FromHtml('#0F1318')
   $b.Cursor = 'Hand'
   $b.UseVisualStyleBackColor = $false
   return $b
}

$installBtn = New-ActionButton -X 460 -Text '' -Color $colAccent
$installBtn.DialogResult = [System.Windows.Forms.DialogResult]::None
$form.Controls.Add($installBtn)

$cancelBtn = New-ActionButton -X 566 -Text '' -Color $colTrack
$cancelBtn.ForeColor = $colMuted
$form.Controls.Add($cancelBtn)

$closeBtn = New-ActionButton -X 566 -Text '' -Color $colAccent
$closeBtn.Visible = $false
$form.Controls.Add($closeBtn)

# Shown in the details card while setup runs: there is nothing to dismiss yet.
$hint = New-Label -X 18 -Y 160 -W 604 -H 22 -Text '' -Font $fSmall -Color $colMuted
$hint.Visible = $false
$detailsCard.Controls.Add($hint)
$hint.BringToFront()

# --- actions ------------------------------------------------------------
$installBtn.Add_Click({
   try { [System.IO.File]::WriteAllText($script:decisionPath, 'install') } catch { }
   $script:phase = 'running'
   $installBtn.Visible = $false
   $cancelBtn.Visible = $false
})

$cancelBtn.Add_Click({
   try { [System.IO.File]::WriteAllText($script:decisionPath, 'cancel') } catch { }
   $form.Close()
})

$closeBtn.Add_Click({ $form.Close() })

$openLog.Add_LinkClicked({
   if ($script:logPath -and (Test-Path -LiteralPath $script:logPath)) {
      Start-Process -FilePath 'notepad.exe' -ArgumentList ('"' + $script:logPath + '"')
   }
})

$copyLog.Add_LinkClicked({
   if (-not $script:logPath) { return }
   try {
      [System.Windows.Forms.Clipboard]::SetText($script:logPath)
      $copyLog.Text = $script:copiedLabel
   } catch { }
})

# --- status -------------------------------------------------------------
function Read-Status {
   try {
      if (-not (Test-Path -LiteralPath $StatusPath)) { return $null }
      $raw = [System.IO.File]::ReadAllText($StatusPath, [System.Text.Encoding]::UTF8)
      if ([string]::IsNullOrWhiteSpace($raw)) { return $null }
      return $raw
   } catch { return $null }
}

function Show-Stage {
   param([string]$Phase)
   $welcome = ($Phase -eq 'welcome')
   # The checklist is visible from the first screen: it doubles as the promise
   # of what is about to happen. Every other row appears once setup starts.
   $stepsCard.Visible = $true
   $track.Visible = -not $welcome
   $meta.Visible = -not $welcome
   $elapsed.Visible = -not $welcome
   $installBtn.Visible = $welcome
   $cancelBtn.Visible = $welcome
   if ($welcome) { $closeBtn.Visible = $false }
}

function Apply-Status {
   param($S)
   $form.Text = [string]$S.title
   $brand.Text = [string]$S.app
   $tagline.Text = [string]$S.tagline
   $headline.Text = [string]$S.headline
   $sub.Text = [string]$S.subheading
   if ($S.versionLabel) { $sub.Text = ([string]$S.subheading) + '   ' + [string]$S.versionLabel }

   $script:phase = [string]$S.phase
   Show-Stage $script:phase

   $steps = @($S.steps)
   for ($i = 0; $i -lt $rows.Count; $i++) {
      $row = $rows[$i]
      if ($i -ge $steps.Count) {
         $row.Glyph.Visible = $false
         $row.Title.Visible = $false
         $row.Detail.Visible = $false
         continue
      }
      $step = $steps[$i]
      $row.Glyph.Visible = $true
      $row.Title.Visible = $true
      $row.State = [string]$step.state
      $row.Title.Text = [string]$step.title
      $row.Detail.Text = [string]$step.detail
      $row.Detail.Visible = (([string]$step.detail).Length -gt 0) -and ($row.State -ne 'pending')
      switch ($row.State) {
         'active' {
            $row.Glyph.Text = [string]$script:frames[$script:tick % 4]
            $row.Glyph.ForeColor = $colAccent
            $row.Title.ForeColor = $colText
            $row.Title.Font = $fStepBold
            $row.Detail.ForeColor = $colMuted
         }
         'done' {
            $row.Glyph.Text = [char]0x2714
            $row.Glyph.ForeColor = $colGreen
            $row.Title.ForeColor = $colText
            $row.Title.Font = $fStep
            $row.Detail.ForeColor = $colMuted
         }
         'attention' {
            $row.Glyph.Text = '!'
            $row.Glyph.ForeColor = $colYellow
            $row.Title.ForeColor = $colText
            $row.Title.Font = $fStep
            $row.Detail.ForeColor = $colYellow
         }
         'failed' {
            $row.Glyph.Text = [char]0x2716
            $row.Glyph.ForeColor = $colRed
            $row.Title.ForeColor = $colText
            $row.Title.Font = $fStepBold
            $row.Detail.ForeColor = $colRed
         }
         default {
            $row.Glyph.Text = [char]0x25CB
            $row.Glyph.ForeColor = $colMuted
            $row.Title.ForeColor = $colMuted
            $row.Title.Font = $fStep
            $row.Detail.ForeColor = $colMuted
         }
      }
   }

   $detailsTitle.Text = [string]$S.detailsTitle
   $detailsBody.Text = [string]$S.detailsBody
   $logNotice.Text = [string]$S.logNotice
   $detailsCard.Visible = (([string]$S.detailsTitle).Length + ([string]$S.detailsBody).Length) -gt 0
   if ($script:phase -eq 'failed') {
      $detailsTitle.ForeColor = $colRed
      $detailsBody.ForeColor = [System.Drawing.ColorTranslator]::FromHtml('#F0D4D4')
   } else {
      $detailsTitle.ForeColor = $colAccent
      $detailsBody.ForeColor = [System.Drawing.ColorTranslator]::FromHtml('#C3C9D2')
   }

   $pct = [int]$S.percent
   if ($pct -lt 0) { $pct = 0 }
   if ($pct -gt 100) { $pct = 100 }
   $fill.Width = [int](620 * $pct / 100)
   switch ($script:phase) {
      'finished' { $fill.BackColor = $colGreen }
      'failed'   { $fill.BackColor = $colRed }
      default    { $fill.BackColor = $colAccent }
   }
   $meta.Text = ([string]$S.footerMeta) + '   ' + $pct + '%'
   $elapsed.Text = [string]$S.footerElapsed

   $script:logPath = [string]$S.logPath
   $script:copiedLabel = [string]$S.labels.copied
   $openLog.Text = [string]$S.labels.openLog
   $copyLog.Text = [string]$S.labels.copyLog
   $installBtn.Text = [string]$S.labels.install
   $cancelBtn.Text = [string]$S.labels.cancel
   $closeBtn.Text = [string]$S.labels.close
   $hint.Text = [string]$S.labels.keepOpen

   $welcome = ($script:phase -eq 'welcome')
   $running = ($script:phase -eq 'running')
   $closeBtn.Visible = -not $welcome -and -not $running
   $hint.Visible = $running
   $logNotice.Visible = $welcome -or ($script:phase -eq 'finished')
   $script:lastUpdate = Get-Date
}

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 150
$timer.Add_Tick({
   $script:tick++
   try {
      $raw = Read-Status
      if ($null -ne $raw -and $raw -ne $script:raw) {
         $script:raw = $raw
         Apply-Status ($raw | ConvertFrom-Json)
      } else {
         if ($script:phase -eq 'running') {
            $frame = [string]$script:frames[$script:tick % 4]
            foreach ($row in $rows) {
               if ($row.State -eq 'active' -and $row.Glyph.Visible) { $row.Glyph.Text = $frame }
            }
         }
         # Watchdog: if setup stops reporting and never finishes, give the user a
         # way out instead of leaving them in a window with no buttons.
         if (($script:phase -eq 'running' -or $script:phase -eq 'welcome') -and (((Get-Date) - $script:lastUpdate).TotalSeconds -gt 600)) {
            $closeBtn.Visible = $true
            $hint.Visible = $false
         }
      }
   } catch { }
})

$form.Add_Shown({
   # Signal that the window exists before doing anything slow. Add-Type compiles
   # C# on a cold cache and can take seconds; the Go side should not mistake that
   # for "the window never opened" and fall back to text mode.
   try { [System.IO.File]::WriteAllText($script:readyPath, 'ready') } catch { }
   try {
      # The window is launched from a GUI process with a hidden console, so
      # Windows hands it a SW_HIDE startup state. Force it visible; the console
      # itself is already hidden by the parent process.
      $sig = '[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int cmd); [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd); [DllImport("dwmapi.dll")] public static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int value, int size);'
      $native = Add-Type -MemberDefinition $sig -Name 'WindowFx' -Namespace 'CalyCodeInstaller' -PassThru
      [void]$native::ShowWindow($form.Handle, 5)
      [void]$native::SetForegroundWindow($form.Handle)
      $dark = 1
      [void]$native::DwmSetWindowAttribute($form.Handle, 20, [ref]$dark, 4)
   } catch { }
   $form.Activate()
   $timer.Start()
})

$form.Add_FormClosing({
   param($sender, $e)
   if ($script:phase -eq 'welcome') {
      try { [System.IO.File]::WriteAllText($script:decisionPath, 'cancel') } catch { }
   }
   if ($script:phase -eq 'running') {
      # Setup is mid-flight: closing now would hide what is happening.
      $e.Cancel = $true
   }
})

# Apply the first status before the window is created, so the layout that ships
# is the one WinForms scales for the user's display DPI.
$initial = Read-Status
if ($null -ne $initial) {
   try { Apply-Status ($initial | ConvertFrom-Json) } catch { }
}

[void]$form.ShowDialog()
`
