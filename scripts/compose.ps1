param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("dev", "prod", "test")]
    [string]$Target,

    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ComposeArgs
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot

switch ($Target) {
    "dev" {
        $baseArgs = @("-f", "docker-compose.yml", "-f", "docker-compose.dev.yml")
    }
    "prod" {
        $baseArgs = @("--env-file", "backend/.env.prod", "-f", "docker-compose.yml", "-f", "docker-compose.prod.yml")
    }
    "test" {
        $baseArgs = @("-f", "docker-compose.yml", "-f", "docker-compose.test.yml")
    }
}

if (-not $ComposeArgs -or $ComposeArgs.Count -eq 0) {
    $ComposeArgs = @("up", "--build", "-d")
}

Push-Location $root
try {
    docker compose @baseArgs @ComposeArgs
}
finally {
    Pop-Location
}
