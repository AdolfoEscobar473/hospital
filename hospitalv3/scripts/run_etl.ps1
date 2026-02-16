param(
  [string]$SqlitePath = "c:\Users\SANDRA\Downloads\HOSPITAL\desarrollo-hospital-1\hospitalv2\hospital.db",
  [switch]$Truncate
)

$backend = "c:\Users\SANDRA\Downloads\HOSPITAL\desarrollo-hospital-1\hospitalv3\backend"
$python = "$backend\.venv\Scripts\python.exe"

if ($Truncate) {
  & $python "$backend\manage.py" etl_from_sqlite --sqlite-path "$SqlitePath" --truncate
} else {
  & $python "$backend\manage.py" etl_from_sqlite --sqlite-path "$SqlitePath"
}
