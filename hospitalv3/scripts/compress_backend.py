import zipfile
import os
from pathlib import Path

# Directorios y archivos a excluir
EXCLUDE_PATTERNS = [
    'venv',
    '__pycache__',
    '.env',
    'db.sqlite3',
    '.pyc',
    '.pyo',
    '.git',
    '.gitignore',
    'staticfiles',
    '.vscode',
    '.idea',
    'node_modules',
    '*.sqlite3',
    '.pytest_cache',
    '.coverage'
]

def should_exclude(path):
    """Verifica si un archivo/carpeta debe ser excluido"""
    path_str = str(path)
    for pattern in EXCLUDE_PATTERNS:
        if pattern in path_str:
            return True
    return False

print("Comprimiendo carpeta backend...")
print("Excluyendo:", ", ".join(EXCLUDE_PATTERNS))

backend_path = Path("..") / "backend"
zip_path = "backend-deploy.zip"

# Eliminar zip anterior si existe
if os.path.exists(zip_path):
    os.remove(zip_path)
    print(f"✓ Eliminado archivo anterior: {zip_path}")

# Crear el archivo zip
file_count = 0
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=1) as zipf:
    for root, dirs, files in os.walk(backend_path):
        # Filtrar directorios excluidos
        dirs[:] = [d for d in dirs if not should_exclude(Path(root) / d)]
        
        for file in files:
            file_path = Path(root) / file
            if not should_exclude(file_path):
                # Calcular ruta relativa desde backend
                arcname = file_path.relative_to(backend_path)
                zipf.write(file_path, arcname)
                file_count += 1
                if file_count % 100 == 0:
                    print(f"  Archivos procesados: {file_count}")

print(f"✓ Compresión completada: {file_count} archivos en {zip_path}")
print(f"✓ Tamaño del archivo: {os.path.getsize(zip_path) / (1024*1024):.2f} MB")
