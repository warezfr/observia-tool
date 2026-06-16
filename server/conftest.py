import os
import sys

# Ensure the server root (which contains the `app` package) is importable
# regardless of the directory pytest is invoked from.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
