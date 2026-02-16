import zipfile
import os
from pathlib import Path

print("Comprimiendo carpeta dist del frontend...")

dist_path = Path("dist")
zip_path = Path("..") / "scripts" / "frontend-deploy.zip"

# Eliminar zip anterior si existe
if os.path.exists(zip_path):
    os.remove(zip_path)
    print(f"✓ Eliminado archivo anterior: {zip_path}")

# Crear el archivo zip
file_count = 0
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(dist_path):
        for file in files:
            file_path = Path(root) / file
            # Calcular ruta relativa desde dist
            arcname = file_path.relative_to(dist_path)
            zipf.write(file_path, arcname)
            file_count += 1

print(f"✓ Compresión completada: {file_count} archivos en {zip_path}")
print(f"✓ Tamaño del archivo: {os.path.getsize(zip_path) / (1024*1024):.2f} MB")
