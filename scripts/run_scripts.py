import os
import subprocess
import sys

SCRIPTS_DIR = "scripts"
SELF = os.path.basename(__file__)

for filename in sorted(os.listdir(SCRIPTS_DIR)):
    if filename.endswith(".py") and filename != SELF:
        path = os.path.join(SCRIPTS_DIR, filename)
        print(f"▶ Running {path} ...")
        subprocess.run([sys.executable, path], check=True)
