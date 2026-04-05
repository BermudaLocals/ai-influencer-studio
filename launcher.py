#!/usr/bin/env python3
"""AI Influencer Studio - Master Launcher
Starts all services and provides unified access
"""
import os
import sys
import subprocess
import time
import signal
import threading
from typing import List, Dict

# Add project to path
sys.path.insert(0, "/root/ai_influencer_studio")

class ServiceManager:
    """Manages all platform services"""

    def __init__(self):
        self.processes: Dict[str, subprocess.Popen] = {}
        self.services = {
            "ai_influencer": {
                "name": "AI Influencer Studio",
                "port": 5000,
                "script": "/root/ai_influencer_studio/app.py",
                "icon": "🤖"
            },
            "survey": {
                "name": "Real or AI Survey",
                "port": 5050,
                "script": "/root/ai_influencer_studio/survey/app.py",
                "icon": "🎭"
            }
        }

    def start_service(self, service_id: str) -> bool:
        """Start a single service"""
        if service_id not in self.services:
            print(f"Unknown service: {service_id}")
            return False

        service = self.services[service_id]

        if service_id in self.processes and self.processes[service_id].poll() is None:
            print(f"{service['icon']} {service['name']} already running on port {service['port']}")
            return True

        try:
            process = subprocess.Popen(
                [sys.executable, service["script"]],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=os.path.dirname(service["script"])
            )
            self.processes[service_id] = process
            print(f"{service['icon']} {service['name']} started on port {service['port']}")
            return True
        except Exception as e:
            print(f"Failed to start {service['name']}: {e}")
            return False

    def stop_service(self, service_id: str) -> bool:
        """Stop a single service"""
        if service_id not in self.processes:
            return True

        process = self.processes[service_id]
        if process.poll() is None:
            process.terminate()
            process.wait(timeout=5)

        del self.processes[service_id]
        service = self.services[service_id]
        print(f"⏹️  {service['name']} stopped")
        return True

    def start_all(self):
        """Start all services"""
        print("\n" + "="*60)
        print("🚀 AI INFLUENCER STUDIO - Starting All Services")
        print("="*60 + "\n")

        for service_id in self.services:
            self.start_service(service_id)
            time.sleep(1)  # Stagger starts

        print("\n" + "="*60)
        print("✅ All services started!")
        print("="*60)
        self.print_urls()

    def stop_all(self):
        """Stop all services"""
        print("\n⏹️  Stopping all services...")
        for service_id in list(self.processes.keys()):
            self.stop_service(service_id)
        print("✅ All services stopped")

    def print_urls(self):
        """Print access URLs"""
        print("\n📍 Access URLs:")
        print("-" * 40)
        for service_id, service in self.services.items():
            print(f"   {service['icon']} {service['name']}")
            print(f"      http://localhost:{service['port']}")
        print("-" * 40)
        print("\n💡 Press Ctrl+C to stop all services\n")

    def status(self):
        """Print status of all services"""
        print("\n📊 Service Status:")
        print("-" * 40)
        for service_id, service in self.services.items():
            running = service_id in self.processes and self.processes[service_id].poll() is None
            status = "🟢 Running" if running else "🔴 Stopped"
            print(f"   {service['icon']} {service['name']}: {status}")
        print("-" * 40)


def main():
    manager = ServiceManager()

    def signal_handler(sig, frame):
        print("\n")
        manager.stop_all()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    print("""
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║     🤖 AI INFLUENCER STUDIO - Complete Platform 🤖        ║
    ║                                                           ║
    ║   Ultra-Realistic AI Influencer Generation System         ║
    ║   With Real vs AI Survey & Rewards                        ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
    """)

    manager.start_all()

    # Keep running
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        manager.stop_all()


if __name__ == "__main__":
    main()
