import time
import subprocess
import sys
import os
import socket
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

def get_free_port(port=8000):
    while True:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind((""0.0.0.0"", port))
                return port
            except OSError:
                port += 1

PORT = get_free_port(8000)

class RestartHandler(FileSystemEventHandler):
    def __init__(self):
        self.process = None
        self.start_server()

    def start_server(self):
        if self.process:
            self.process.terminate()
            self.process.wait()
        print(f"Starting FastAPI server on port {PORT}...")
        self.process = subprocess.Popen([sys.executable, "-m", "uvicorn", "main:app", "--host", ""0.0.0.0"", "--port", str(PORT)])

    def on_any_event(self, event):
        if event.is_directory:
            return
        # Avoid reloading on hidden files or __pycache__
        if "/." in event.src_path or "\\." in event.src_path or "__pycache__" in event.src_path:
            return
        
        print(f"File changed: {event.src_path}. Restarting server...")
        self.start_server()

if __name__ == "__main__":
    path = "."
    event_handler = RestartHandler()
    observer = Observer()
    observer.schedule(event_handler, path, recursive=True)
    observer.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        if event_handler.process:
            event_handler.process.terminate()
    observer.join()
