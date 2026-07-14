$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$output = & npx supabase status -o env
if ($LASTEXITCODE -ne 0) {
    throw "Unable to read the local Supabase environment."
}

$values = @{}
foreach ($line in $output) {
    if ($line -match '^([A-Z0-9_]+)=(.*)$') {
        $values[$matches[1]] = $matches[2].Trim().Trim('"')
    }
}

$apiUrl = $values["API_URL"]
$publishableKey = $values["PUBLISHABLE_KEY"]
$secretKey = $values["SECRET_KEY"]
if (-not $publishableKey) { $publishableKey = $values["ANON_KEY"] }
if (-not $secretKey) { $secretKey = $values["SERVICE_ROLE_KEY"] }

if (-not $apiUrl -or -not $publishableKey -or -not $secretKey) {
    throw "Supabase status did not return the required local API keys."
}

$content = @(
    "NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000"
    "NEXT_PUBLIC_SUPABASE_URL=$apiUrl"
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$publishableKey"
    "NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=false"
    "SUPABASE_SECRET_KEY=$secretKey"
    "INITIAL_SYS_ADMIN_EMAIL=admin@mindspan.local"
)

$path = Join-Path $root ".env.local"
[System.IO.File]::WriteAllLines($path, $content, [System.Text.UTF8Encoding]::new($false))
Write-Host "      Created .env.local for local development."
