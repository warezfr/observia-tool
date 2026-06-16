"""Shared test configuration.

Ensures the ``server`` directory is importable as the project root so that
``import app.*`` works regardless of the current working directory.
"""
import os
import sys

SERVER_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if SERVER_DIR not in sys.path:
    sys.path.insert(0, SERVER_DIR)
