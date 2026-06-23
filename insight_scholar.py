#!/usr/bin/env python3
"""Local launcher and validation entrypoint for Insight Scholar."""

from __future__ import annotations

import argparse
import os
import shutil
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path


ROOT = Path(__file__).resolve().parent
APP_URL = "http://127.0.0.1:3000"
PLAYWRIGHT_OUTPUT = ROOT / "output" / "playwright"


class LauncherError(RuntimeError):
    """A user-actionable launcher failure."""


def executable(name: str) -> str:
    path = shutil.which(name)
    if not path:
        raise LauncherError(
            f"Required command '{name}' was not found. Install Node.js 18+ "
            "from https://nodejs.org/ and restart this terminal."
        )
    return path


def run_command(command: list[str], label: str, env: dict[str, str] | None = None) -> None:
    print(f"\n[Insight Scholar] {label}")
    result = subprocess.run(command, cwd=ROOT, env=env, check=False)
    if result.returncode:
        raise LauncherError(f"{label} failed with exit code {result.returncode}.")


def ensure_dependencies() -> None:
    npm = executable("npm")
    executable("node")
    if not (ROOT / "node_modules" / "vite").exists():
        run_command([npm, "install"], "Installing npm dependencies")


def wait_until_ready(process: subprocess.Popen[bytes], timeout: int = 90) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise LauncherError(f"The Vite server exited early with code {process.returncode}.")
        try:
            with urllib.request.urlopen(APP_URL, timeout=2) as response:
                if response.status < 500:
                    return
        except (urllib.error.URLError, TimeoutError):
            time.sleep(0.5)
    raise LauncherError(f"The application did not become ready at {APP_URL} within {timeout} seconds.")


def stop_process_tree(process: subprocess.Popen[bytes]) -> None:
    if process.poll() is not None:
        return
    if os.name == "nt":
        subprocess.run(
            ["taskkill", "/PID", str(process.pid), "/T", "/F"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        )
    else:
        os.killpg(os.getpgid(process.pid), signal.SIGTERM)
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()


def run_app() -> None:
    ensure_dependencies()
    npm = executable("npm")
    creation_flags = subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0
    process = subprocess.Popen(
        [npm, "run", "dev", "--", "--host", "127.0.0.1"],
        cwd=ROOT,
        creationflags=creation_flags,
        start_new_session=os.name != "nt",
    )
    try:
        wait_until_ready(process)
        print(f"\n[Insight Scholar] Ready at {APP_URL}. Press Ctrl+C to stop.")
        webbrowser.open(APP_URL, new=2)
        process.wait()
        if process.returncode:
            raise LauncherError(f"The Vite server stopped with exit code {process.returncode}.")
    except KeyboardInterrupt:
        print("\n[Insight Scholar] Stopping...")
    finally:
        stop_process_tree(process)


def run_tests() -> None:
    ensure_dependencies()
    npm = executable("npm")
    npx = executable("npx")
    PLAYWRIGHT_OUTPUT.mkdir(parents=True, exist_ok=True)
    run_command([npx, "playwright", "install", "chromium"], "Ensuring Playwright Chromium is installed")
    run_command([npm, "run", "typecheck"], "TypeScript typecheck")
    run_command([npm, "run", "test:unit"], "Unit tests")
    run_command([npm, "run", "build"], "Production build")
    run_command([npm, "run", "test:e2e"], "Playwright UI/UX tests")
    print(f"\n[Insight Scholar] All checks passed. Browser artifacts: {PLAYWRIGHT_OUTPUT}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run or test the complete Insight Scholar application.")
    subparsers = parser.add_subparsers(dest="mode")
    subparsers.add_parser("run", help="Install missing dependencies, start Vite, and open the browser.")
    subparsers.add_parser("test", help="Run typecheck, unit tests, build, and Playwright UI/UX tests.")
    if len(sys.argv) < 2:
        return parser.parse_args(["run"])
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        if args.mode == "run":
            run_app()
        else:
            run_tests()
        return 0
    except LauncherError as error:
        print(f"\n[Insight Scholar] ERROR: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
