/**
 * Windows desktop alarm installer (voice before every prayer + Adhan + sunrise alarm, no browser needed).
 *   /api/desktop?lat=..&lng=..&cc=EG&tz=Africa/Cairo&city=..&lead=15&wake=20&adhan=1&voice=1   → Install-PrayerAlarm.cmd
 *   same + &f=ps1                                                                               → the setup script itself
 * The .cmd only runs the setup script; everything is installed per-user in %LOCALAPPDATA%\PrayerAlarm
 * and started from the Startup folder (no admin rights).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { isValidTz } from '@/lib/civil';

export const dynamic = 'force-dynamic';

const num = (v: string | null, lo: number, hi: number, d: number) => {
  const n = Number(v);
  return v !== null && Number.isFinite(n) && n >= lo && n <= hi ? n : d;
};
/** JSON with every non-ASCII char escaped → the PowerShell script stays pure ASCII */
const asciiJson = (o: unknown) => JSON.stringify(o).replace(/[\u007f-￿]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const base = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const tzIn = q.get('tz') ?? 'Africa/Cairo';
  const cfg = {
    base,
    lat: num(q.get('lat'), -66, 66, 30.0911),
    lng: num(q.get('lng'), -180, 180, 31.3225),
    cc: (q.get('cc') ?? 'EG').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2) || 'EG',
    tz: isValidTz(tzIn) ? tzIn : 'Africa/Cairo',
    asr: q.get('asr') === 'hanafi' ? 'hanafi' : 'shafi',
    city: (q.get('city') ?? 'مصر الجديدة').slice(0, 40),
    lead: num(q.get('lead'), 0, 30, 15),
    wake: num(q.get('wake'), 0, 60, 20),
    voice: q.get('voice') !== '0',
    adhan: q.get('adhan') !== '0',
  };

  if (q.get('f') === 'ps1') {
    const json = asciiJson(cfg).replace(/'/g, "''");
    const ps = `$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$Dir = Join-Path $env:LOCALAPPDATA 'PrayerAlarm'
New-Item -ItemType Directory -Force -Path $Dir | Out-Null
Write-Host 'Prayer alarm: installing to' $Dir
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | Where-Object { $_.CommandLine -like '*PrayerAlarm.ps1*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
$b = '${base}'
$wc = New-Object Net.WebClient
$wc.DownloadFile("$b/desktop/PrayerAlarm.ps1", "$Dir\\PrayerAlarm.ps1")
$wc.DownloadFile("$b/audio/reminder-own.mp3", "$Dir\\reminder-own.mp3")
$wc.DownloadFile("$b/audio/adhan/refaat-short.mp3", "$Dir\\adhan-refaat-short.mp3")
$wc.DownloadFile("$b/desktop/wake.mp3", "$Dir\\wake.mp3")
[IO.File]::WriteAllText("$Dir\\config.json", '${json}')
Remove-Item "$Dir\\times.json", "$Dir\\fired.txt" -ErrorAction SilentlyContinue
$ps = Join-Path $env:WINDIR 'System32\\WindowsPowerShell\\v1.0\\powershell.exe'
$args1 = '-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + "$Dir\\PrayerAlarm.ps1" + '"'
$lnk = Join-Path ([Environment]::GetFolderPath('Startup')) 'PrayerAlarm.lnk'
$sh = New-Object -ComObject WScript.Shell
$s = $sh.CreateShortcut($lnk); $s.TargetPath = $ps; $s.Arguments = $args1; $s.WorkingDirectory = $Dir; $s.WindowStyle = 7; $s.Save()
$t = $sh.CreateShortcut("$Dir\\Test.lnk"); $t.TargetPath = $ps; $t.Arguments = $args1 + ' -Test'; $t.WorkingDirectory = $Dir; $t.Save()
$un = @'
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | Where-Object { $_.CommandLine -like '*PrayerAlarm.ps1*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Remove-Item (Join-Path ([Environment]::GetFolderPath('Startup')) 'PrayerAlarm.lnk') -ErrorAction SilentlyContinue
Write-Host 'Prayer alarm removed.'
'@
[IO.File]::WriteAllText("$Dir\\Uninstall.ps1", $un)
[IO.File]::WriteAllText("$Dir\\Uninstall.cmd", '@echo off' + [Environment]::NewLine + 'powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Uninstall.ps1"' + [Environment]::NewLine + 'pause' + [Environment]::NewLine)
Start-Process -FilePath $ps -ArgumentList $args1 -WindowStyle Hidden
Write-Host ''
Write-Host 'OK - installed and running. It starts automatically with Windows.' -ForegroundColor Green
Write-Host 'Playing a test now: your voice, then the Adhan (press the Stop button to end).'
Start-Process -FilePath $ps -ArgumentList ($args1 + ' -Test') -WindowStyle Hidden
Write-Host "Folder: $Dir   (Test.lnk = test again, Uninstall.cmd = remove)"
`;
    return new NextResponse(ps, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
  }

  const self = new URL(req.nextUrl.toString());
  self.searchParams.set('f', 'ps1');
  const cmd = [
    '@echo off',
    'title Prayer Alarm - Prof Ali Kotb',
    `powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol='Tls12'; iex ((New-Object Net.WebClient).DownloadString('${self.toString().replace(/%/g, '%%')}'))"`,
    'echo.',
    'pause',
    '',
  ].join(String.fromCharCode(13, 10));
  return new NextResponse(cmd, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="Install-PrayerAlarm.cmd"',
      'Cache-Control': 'no-store',
    },
  });
}
