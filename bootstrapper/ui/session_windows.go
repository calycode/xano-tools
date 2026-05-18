//go:build windows

package ui

import (
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type installerStatus struct {
	Title  string `json:"title"`
	Detail string `json:"detail"`
	Step   int    `json:"step"`
	Total  int    `json:"total"`
	Done   bool   `json:"done"`
}

func newInstallerSession() *InstallerSession {
	tmpDir, err := os.MkdirTemp("", "calycode-installer-*")
	if err != nil {
		return &InstallerSession{}
	}

	statusPath := filepath.Join(tmpDir, "status.json")
	scriptPath := filepath.Join(tmpDir, "viewer.ps1")

	writeStatusFile := func(st installerStatus) {
		payload, _ := json.Marshal(st)
		tmp := statusPath + ".tmp"
		_ = os.WriteFile(tmp, payload, 0600)
		_ = os.Rename(tmp, statusPath)
	}

	writeStatusFile(installerStatus{Title: "Preparing...", Detail: "Starting installer", Step: 0, Total: 3, Done: false})

	statusEscaped := strings.ReplaceAll(statusPath, "'", "''")
	viewerScript := `Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$statusPath = '` + statusEscaped + `'

$form = New-Object System.Windows.Forms.Form
$form.Text = 'CalyCode Installer'
$form.StartPosition = 'CenterScreen'
$form.Size = New-Object System.Drawing.Size(560, 220)
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.TopMost = $true

$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Location = New-Object System.Drawing.Point(24, 24)
$titleLabel.Size = New-Object System.Drawing.Size(510, 32)
$titleLabel.Font = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
$titleLabel.Text = 'Preparing installer...'
$form.Controls.Add($titleLabel)

$detailLabel = New-Object System.Windows.Forms.Label
$detailLabel.Location = New-Object System.Drawing.Point(24, 64)
$detailLabel.Size = New-Object System.Drawing.Size(510, 44)
$detailLabel.Font = New-Object System.Drawing.Font('Segoe UI', 9)
$detailLabel.Text = 'Please wait while setup starts.'
$form.Controls.Add($detailLabel)

$progress = New-Object System.Windows.Forms.ProgressBar
$progress.Location = New-Object System.Drawing.Point(24, 122)
$progress.Size = New-Object System.Drawing.Size(510, 22)
$progress.Minimum = 0
$progress.Maximum = 100
$progress.Style = 'Continuous'
$progress.Value = 5
$form.Controls.Add($progress)

$stepLabel = New-Object System.Windows.Forms.Label
$stepLabel.Location = New-Object System.Drawing.Point(24, 152)
$stepLabel.Size = New-Object System.Drawing.Size(510, 24)
$stepLabel.Font = New-Object System.Drawing.Font('Segoe UI', 8)
$stepLabel.Text = 'Step 0 of 3'
$form.Controls.Add($stepLabel)

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 350
$timer.Add_Tick({
   try {
      if (-not (Test-Path -LiteralPath $statusPath)) {
         return
      }
      $raw = Get-Content -LiteralPath $statusPath -Raw
      if (-not $raw) {
         return
      }
      $status = $raw | ConvertFrom-Json

      if ($status.title) { $titleLabel.Text = [string]$status.title }
      if ($status.detail) { $detailLabel.Text = [string]$status.detail }

      $total = [int]$status.total
      if ($total -lt 1) { $total = 1 }
      $step = [int]$status.step
      if ($step -lt 0) { $step = 0 }
      if ($step -gt $total) { $step = $total }

      $pct = [int](($step * 100) / $total)
      if ($pct -lt 1) { $pct = 1 }
      if ($pct -gt 100) { $pct = 100 }
      $progress.Value = $pct
      $stepLabel.Text = 'Step ' + $step + ' of ' + $total

      if ($status.done -eq $true) {
         $timer.Stop()
         $form.Close()
      }
   } catch {
      # Ignore transient parse/read errors.
   }
})

$timer.Start()
[void]$form.ShowDialog()
`

	_ = os.WriteFile(scriptPath, []byte(viewerScript), 0600)

	cmd := exec.Command(
		"powershell.exe",
		"-NoProfile",
		"-WindowStyle",
		"Hidden",
		"-ExecutionPolicy",
		"Bypass",
		"-File",
		scriptPath,
	)
	_ = cmd.Start()

	var mu sync.Mutex
	closed := false

	return &InstallerSession{
		updateFn: func(step, total int, title, detail string) {
			mu.Lock()
			defer mu.Unlock()
			if closed {
				return
			}
			writeStatusFile(installerStatus{Title: title, Detail: detail, Step: step, Total: total, Done: false})
		},
		closeFn: func() {
			mu.Lock()
			defer mu.Unlock()
			if closed {
				return
			}
			closed = true
			writeStatusFile(installerStatus{Title: "Done", Detail: "Finalizing...", Step: 3, Total: 3, Done: true})
			go func() {
				time.Sleep(2 * time.Second)
				_ = os.RemoveAll(tmpDir)
			}()
		},
	}
}
