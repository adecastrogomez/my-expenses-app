# Ejecuta Liquibase (imagen Docker) contra la BD indicada en un fichero de propiedades.
# Por defecto db/liquibase.properties (local). Para Supabase:
#   $env:LB_PROPS = 'liquibase.supabase.properties'; ./db/migrate.ps1 update
# Uso:  ./db/migrate.ps1 [update|status|rollback-count 1|validate]
param([Parameter(ValueFromRemainingArguments)] [string[]]$LbArgs = @('update'))
$dir = $PSScriptRoot
$props = if ($env:LB_PROPS) { $env:LB_PROPS } else { 'liquibase.properties' }
if (-not (Test-Path "$dir/$props")) { throw "Falta db/$props (copia liquibase.properties.example)" }
Write-Host "Liquibase -> $props"
docker run --rm -v "${dir}:/liquibase/project" -w /liquibase/project liquibase/liquibase:4.33 --defaults-file=$props @LbArgs
