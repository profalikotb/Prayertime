<#
  Prof Ali Kotb Prayer Time — Windows desktop alarm (runs at logon, no browser needed)
    T − lead min → his recorded voice     T → Sheikh Mohamed Refaat Adhan (short)     sunrise − wake min → loud alarm
  Master volume is raised to 100 % (and unmuted) while playing, then restored.
  Files: %LOCALAPPDATA%\PrayerAlarm\ (config.json, times.json, log.txt, *.mp3)
#>
param([switch]$Test)
$ErrorActionPreference = 'Continue'
$Dir = Join-Path $env:LOCALAPPDATA 'PrayerAlarm'
Set-Location $Dir

# ---- single instance (the -Test run may run beside it) ----
if (-not $Test) {
  $created = $false
  $mutex = New-Object System.Threading.Mutex($true, 'Global\ProfAliKotbPrayerAlarm', [ref]$created)
  if (-not $created) { exit }
}

function Log($m) {
  $line = (Get-Date).ToString('dd/MM/yyyy hh:mm:ss tt') + '  ' + $m
  Add-Content -Path (Join-Path $Dir 'log.txt') -Value $line -Encoding UTF8
  $all = Get-Content (Join-Path $Dir 'log.txt') -Encoding UTF8
  if ($all.Count -gt 300) { $all | Select-Object -Last 200 | Set-Content (Join-Path $Dir 'log.txt') -Encoding UTF8 }
}

$cfg = Get-Content (Join-Path $Dir 'config.json') -Raw -Encoding UTF8 | ConvertFrom-Json
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# ---- master volume (Core Audio) ----
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
  int f(); int g(); int h(); int i();
  int SetMasterVolumeLevelScalar(float fLevel, Guid ctx);
  int j();
  int GetMasterVolumeLevelScalar(out float pfLevel);
  int k(); int l(); int m(); int n();
  int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, Guid ctx);
  int GetMute(out bool pbMute);
}
[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice { int Activate(ref Guid id, int clsCtx, IntPtr p, out IAudioEndpointVolume aev); }
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator { int f(); int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint); }
[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumeratorCom { }
public static class PrayerVol {
  static IAudioEndpointVolume V() {
    var e = (IMMDeviceEnumerator)(new MMDeviceEnumeratorCom());
    IMMDevice d; Marshal.ThrowExceptionForHR(e.GetDefaultAudioEndpoint(0, 1, out d));
    IAudioEndpointVolume v; Guid g = typeof(IAudioEndpointVolume).GUID;
    Marshal.ThrowExceptionForHR(d.Activate(ref g, 23, IntPtr.Zero, out v)); return v;
  }
  public static float Get() { float x; Marshal.ThrowExceptionForHR(V().GetMasterVolumeLevelScalar(out x)); return x; }
  public static void Set(float x) { Marshal.ThrowExceptionForHR(V().SetMasterVolumeLevelScalar(x, Guid.Empty)); }
  public static bool Muted() { bool m; Marshal.ThrowExceptionForHR(V().GetMute(out m)); return m; }
  public static void Mute(bool m) { Marshal.ThrowExceptionForHR(V().SetMute(m, Guid.Empty)); }
}
'@
Add-Type -AssemblyName PresentationCore, System.Windows.Forms, System.Drawing

function Show-Toast($title, $body) {
  try {
    [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
    [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
    $x = New-Object Windows.Data.Xml.Dom.XmlDocument
    $t = [Security.SecurityElement]::Escape($title); $b = [Security.SecurityElement]::Escape($body)
    $x.LoadXml("<toast scenario='reminder'><visual><binding template='ToastGeneric'><text>$t</text><text>$b</text></binding></visual><audio silent='true'/></toast>")
    $app = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe'
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($app).Show((New-Object Windows.UI.Notifications.ToastNotification $x))
  } catch { }
}

# Plays a file at full volume with a small always-on-top «إيقاف» window; loops if $loopSec > 0.
function Play-Alert($file, $title, $body, [int]$loopSec = 0) {
  Show-Toast $title $body
  $oldVol = $null; $oldMute = $null
  try { $oldVol = [PrayerVol]::Get(); $oldMute = [PrayerVol]::Muted(); [PrayerVol]::Mute($false); [PrayerVol]::Set(1.0) } catch { Log "volume: $($_.Exception.Message)" }
  $p = New-Object System.Windows.Media.MediaPlayer
  $p.Volume = 1.0
  $p.Open([Uri](Join-Path $Dir $file))
  $p.Play()
  $f = New-Object System.Windows.Forms.Form
  $f.Text = 'مواقيت الصلاة'; $f.TopMost = $true; $f.RightToLeft = 'Yes'; $f.RightToLeftLayout = $true
  $f.StartPosition = 'Manual'; $f.FormBorderStyle = 'FixedToolWindow'; $f.Width = 380; $f.Height = 170
  $wa = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
  $f.Location = New-Object System.Drawing.Point(($wa.Right - 400), ($wa.Bottom - 190))
  $f.BackColor = [System.Drawing.Color]::FromArgb(11, 59, 51)
  $l = New-Object System.Windows.Forms.Label
  $l.Text = "$title`n$body"; $l.ForeColor = [System.Drawing.Color]::FromArgb(251, 245, 230)
  $l.Font = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
  $l.SetBounds(12, 10, 350, 70)
  $btn = New-Object System.Windows.Forms.Button
  $btn.Text = 'إيقاف'; $btn.SetBounds(130, 88, 120, 34)
  $btn.BackColor = [System.Drawing.Color]::FromArgb(200, 158, 74); $btn.FlatStyle = 'Flat'
  $script:stop = $false
  $btn.Add_Click({ $script:stop = $true })
  $f.Add_FormClosed({ $script:stop = $true })
  $f.Controls.Add($l); $f.Controls.Add($btn); $f.Show()
  $start = Get-Date
  $limit = if ($loopSec -gt 0) { $loopSec } else { 180 }
  while (-not $script:stop -and ((Get-Date) - $start).TotalSeconds -lt $limit) {
    [System.Windows.Forms.Application]::DoEvents()
    Start-Sleep -Milliseconds 100
    if ($p.NaturalDuration.HasTimeSpan -and $p.Position -ge $p.NaturalDuration.TimeSpan) {
      if ($loopSec -gt 0) { $p.Position = [TimeSpan]::Zero; $p.Play() } else { break }
    }
  }
  $p.Stop(); $p.Close()
  try { $f.Close() } catch { }
  try { if ($null -ne $oldVol) { [PrayerVol]::Set($oldVol); [PrayerVol]::Mute($oldMute) } } catch { }
}

$names = @{ fajr = 'الفجر'; dhuhr = 'الظهر'; asr = 'العصر'; maghrib = 'المغرب'; isha = 'العشاء' }
function MinAr([int]$m) { if ($m -le 10) { "$m دقائق" } else { "$m دقيقة" } }

function Get-Times {
  $file = Join-Path $Dir 'times.json'
  $fresh = (Test-Path $file) -and ((Get-Date) - (Get-Item $file).LastWriteTime).TotalHours -lt 12
  if (-not $fresh) {
    try {
      $u = "$($cfg.base)/api/times?lat=$($cfg.lat)&lng=$($cfg.lng)&cc=$($cfg.cc)&tz=$($cfg.tz)&asr=$($cfg.asr)&days=10"
      $raw = (Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 20).Content
      $null = $raw | ConvertFrom-Json
      Set-Content -Path $file -Value $raw -Encoding UTF8
      Log 'times updated'
    } catch { Log "times fetch failed (offline?) — using cache: $($_.Exception.Message)" }
  }
  if (Test-Path $file) { return (Get-Content $file -Raw -Encoding UTF8 | ConvertFrom-Json).days }
  return @()
}

$firedFile = Join-Path $Dir 'fired.txt'
$fired = @{}
if (Test-Path $firedFile) { Get-Content $firedFile | ForEach-Object { $fired[$_] = 1 } }
function Mark($id) { $fired[$id] = 1; Add-Content -Path $firedFile -Value $id }

if ($Test) {
  Play-Alert 'reminder-own.mp3' '⏳ تجربة: التنبيه بصوتك' 'بأعلى مستوى صوت'
  Play-Alert 'adhan-refaat-short.mp3' '🕌 تجربة: أذان الشيخ محمد رفعت' 'اضغط «إيقاف» للإيقاف'
  exit
}

Log "started · lead $($cfg.lead) min · wake $($cfg.wake) min"
$epoch = [DateTimeOffset]::FromUnixTimeMilliseconds(0)
while ($true) {
  try {
    $now = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    foreach ($d in (Get-Times)) {
      $friday = ([DateTime]::ParseExact($d.date, 'yyyy-MM-dd', $null)).DayOfWeek -eq 'Friday'
      $events = @()
      foreach ($k in 'fajr', 'dhuhr', 'asr', 'maghrib', 'isha') {
        $at = [long]$d.$k
        $n = if ($k -eq 'dhuhr' -and $friday) { 'الجمعة' } else { $names[$k] }
        $tm = [DateTimeOffset]::FromUnixTimeMilliseconds($at).ToLocalTime().ToString('h:mm tt')
        if ($cfg.voice -and $cfg.lead -gt 0) { $events += , @("$($d.date)-$k-v", ($at - $cfg.lead * 60000), 'reminder-own.mp3', "⏳ باقي $(MinAr $cfg.lead) على أذان $n", "الأذان $tm", 0) }
        if ($cfg.adhan) { $events += , @("$($d.date)-$k-a", $at, 'adhan-refaat-short.mp3', "🕌 حان الآن وقت صلاة $n", "$($cfg.city) · $tm", 0) }
      }
      if ($cfg.wake -gt 0) {
        $sr = [long]$d.sunrise
        $tm = [DateTimeOffset]::FromUnixTimeMilliseconds($sr).ToLocalTime().ToString('h:mm tt')
        $events += , @("$($d.date)-wake", ($sr - $cfg.wake * 60000), 'wake.mp3', "⏰ الشروق بعد $(MinAr $cfg.wake)", "استيقظ — صلِّ الفجر قبل الشروق · الشروق $tm", 300)
      }
      foreach ($e in $events) {
        $id = $e[0]; $due = [long]$e[1]
        if (-not $fired.ContainsKey($id) -and $now -ge $due -and ($now - $due) -lt 120000) {
          Mark $id
          Log "play $id"
          Play-Alert $e[2] $e[3] $e[4] $e[5]
          $now = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
        }
      }
    }
    if ((Get-Date).Hour -eq 3 -and (Get-Item $firedFile -ErrorAction SilentlyContinue).Length -gt 20000) { Remove-Item $firedFile; $fired = @{} }
  } catch { Log "loop error: $($_.Exception.Message)" }
  Start-Sleep -Seconds 15
}
