# Un solo comando para Windows: enciende la IA local (si servidor/.env dice IA_MODO=local) y el servidor.
# Es lo que en la Mac hacen ia-local/iniciar-ia.sh + «npm start». No instala la app en el celular: eso sólo se puede
# desde la Mac con correr-app.sh.
#
# Uso (en PowerShell, desde esta carpeta):
#   .\iniciar.ps1                → enciende todo; el servidor queda en esta ventana (Ctrl+C lo apaga)
#   .\iniciar.ps1 -PrepararBd    → antes: instala dependencias, crea la base de MySQL y carga los datos
#                                  de ejemplo (no borra nada; se puede repetir)
#
# Con IA_MODO=fijo (el de fábrica) no hace falta ningún modelo: sólo MySQL.
# Con IA_MODO=local hacen falta ffmpeg, whisper-server (whisper.cpp), Ollama y sus modelos (ver ../ia-local/README.md).
param([switch]$PrepararBd)

$ErrorActionPreference = 'Stop'
$Servidor = Join-Path $PSScriptRoot '..\servidor'
$Base = Join-Path $HOME '.bomberos-ia'
$Registros = Join-Path $Base 'registros'
New-Item -ItemType Directory -Force -Path $Registros | Out-Null

function Fallar($mensaje) {
  Write-Host $mensaje -ForegroundColor Red
  exit 1
}

function Responde($url) {
  try {
    Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 | Out-Null
    return $true
  } catch {
    # Una respuesta con error (404, 405…) también cuenta: hay alguien escuchando.
    return ($null -ne $_.Exception.Response)
  }
}

function Npm {
  & npm.cmd @args
  if ($LASTEXITCODE -ne 0) { Fallar "Falló: npm $args" }
}

# 1 · servidor/.env. Si no existe, se crea con una clave local al azar (no se muestra).
$ArchivoEnv = Join-Path $Servidor '.env'
if (-not (Test-Path $ArchivoEnv)) {
  $bytes = New-Object byte[] 24
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $clave = -join ($bytes | ForEach-Object { $_.ToString('x2') })
  $lineas = (Get-Content (Join-Path $Servidor '.env.example') -Encoding UTF8) -replace '^CLAVE_LOCAL=.*', "CLAVE_LOCAL=$clave"
  [IO.File]::WriteAllLines($ArchivoEnv, [string[]]$lineas)
  Write-Host 'Se creó servidor\.env. Abre ese archivo y pon el usuario y la contraseña de tu MySQL (DB_USER, DB_PASSWORD).' -ForegroundColor Yellow
}

# Lo que ya venga en el entorno gana sobre el .env, igual que en el servidor.
$config = @{}
foreach ($linea in Get-Content $ArchivoEnv -Encoding UTF8) {
  if ($linea -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$') { $config[$Matches[1]] = $Matches[2].Trim() }
}
function Valor($nombre, $porOmision) {
  $delEntorno = [Environment]::GetEnvironmentVariable($nombre)
  if ($delEntorno) { return $delEntorno }
  if ($config[$nombre]) { return $config[$nombre] }
  return $porOmision
}

$whisper = $null
Push-Location $Servidor
try {
  # 2 · Dependencias y base de datos
  if ($PrepararBd) {
    Npm install --silent
    Npm run db:crear
    Npm run datos-prueba
  } elseif (-not (Test-Path 'node_modules')) {
    Npm install --silent
  }

  $puertoServidor = Valor 'PORT' '3100'
  if (Responde "http://127.0.0.1:$puertoServidor/api/salud") {
    Fallar "Ya hay un servidor en el puerto $puertoServidor. Ciérralo y vuelve a correr este comando."
  }

  # 3 · Las dos IAs (sólo en modo local)
  if ((Valor 'IA_MODO' 'fijo') -eq 'local') {
    if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) { Fallar 'Falta ffmpeg: winget install ffmpeg' }

    $urlWhisper = Valor 'WHISPER_URL' 'http://127.0.0.1:8178'
    if (Responde $urlWhisper) {
      Write-Host 'whisper-server ya estaba corriendo'
    } else {
      if (-not (Get-Command whisper-server -ErrorAction SilentlyContinue)) {
        Fallar 'Falta whisper-server (whisper.cpp) en el PATH. Ver ../ia-local/README.md.'
      }
      $modelo = Valor 'WHISPER_MODELO' (Join-Path $Base 'modelos\ggml-large-v3.bin')
      if ($modelo.StartsWith('~')) { $modelo = Join-Path $HOME $modelo.Substring(1) }
      if (-not (Test-Path $modelo)) { Fallar "Falta el modelo de Whisper en $modelo" }
      $puerto = ([Uri]$urlWhisper).Port
      Write-Host 'Arrancando whisper-server (carga el modelo una vez, tarda unos segundos)...'
      $whisper = Start-Process whisper-server -PassThru -WindowStyle Hidden `
        -ArgumentList '-m', "`"$modelo`"", '-l', 'es', '--host', '127.0.0.1', '--port', $puerto, '-t', '8', '-sns' `
        -RedirectStandardOutput (Join-Path $Registros 'whisper-server.log') `
        -RedirectStandardError (Join-Path $Registros 'whisper-server.err.log')
      $listo = $false
      foreach ($i in 1..60) {
        if (Responde $urlWhisper) { $listo = $true; break }
        if ($whisper.HasExited) { break }
        Start-Sleep -Seconds 1
      }
      if (-not $listo) { Fallar "whisper-server no arrancó; ver $Registros\whisper-server.err.log" }
      Write-Host '  whisper-server listo'
    }

    $urlOllama = Valor 'OLLAMA_URL' 'http://127.0.0.1:11434'
    $modeloOllama = Valor 'OLLAMA_MODELO' 'qwen2.5:14b'
    if (-not (Responde "$urlOllama/api/tags")) { Fallar 'Ollama no está corriendo: abre la app Ollama' }
    $instalados = (Invoke-RestMethod "$urlOllama/api/tags").models | ForEach-Object { $_.name }
    if ($instalados -notcontains $modeloOllama) { Fallar "Falta el modelo: ollama pull $modeloOllama" }
    Write-Host "Precargando $modeloOllama en Ollama..."
    $cuerpo = @{ model = $modeloOllama; keep_alive = '30m' } | ConvertTo-Json
    Invoke-RestMethod -Method Post -Uri "$urlOllama/api/generate" -Body $cuerpo -ContentType 'application/json' -TimeoutSec 180 | Out-Null
    Write-Host '  Ollama listo'
  } else {
    Write-Host 'IA en modo fijo (respuestas de ejemplo). Para la IA real: IA_MODO=local en servidor\.env.'
  }

  # 4 · Servidor, en esta ventana (Ctrl+C lo apaga).
  & node servidor.js
} finally {
  # Al terminar, por lo que sea, se apaga el whisper-server que arrancó este comando.
  if ($whisper -and -not $whisper.HasExited) {
    Stop-Process -Id $whisper.Id -Force
    Write-Host 'whisper-server detenido'
  }
  Pop-Location
}
