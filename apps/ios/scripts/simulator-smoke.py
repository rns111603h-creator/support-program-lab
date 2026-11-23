"""Unsigned Simulator launch evidence; this does not test interaction or a device."""
import json
import pathlib
import subprocess
import time

ROOT = pathlib.Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "artifacts"
ARTIFACTS.mkdir(exist_ok=True)


def command(*arguments):
    return subprocess.check_output(arguments, text=True)


devices = json.loads(command("xcrun", "simctl", "list", "devices", "available", "--json"))["devices"]
candidates = [(runtime, device) for runtime, entries in devices.items()
              if ".iOS-" in runtime for device in entries
              if device.get("isAvailable") and device["name"].startswith("iPhone")]
if not candidates:
    raise SystemExit("No available iPhone Simulator; launch remains unverified")
runtime, device = sorted(candidates, key=lambda entry: (entry[0], entry[1]["name"]), reverse=True)[0]
identifier = device["udid"]
if device["state"] != "Booted":
    subprocess.run(["xcrun", "simctl", "boot", identifier], check=True)
subprocess.run(["xcrun", "simctl", "bootstatus", identifier, "-b"], check=True)
app = ROOT / "DerivedData/Build/Products/Debug-iphonesimulator/SupportProgramLab.app"
subprocess.run(["xcrun", "simctl", "install", identifier, str(app)], check=True)
launch = command("xcrun", "simctl", "launch", identifier, "jp.supportprogramlab.ios.dev")
time.sleep(3)
subprocess.run(["xcrun", "simctl", "io", identifier, "screenshot", str(ARTIFACTS / "iphone-library.png")], check=True)
(ARTIFACTS / "simulator-smoke.json").write_text(json.dumps({
    "runtime": runtime, "device": device["name"], "launch": launch.strip(),
    "scope": "unsigned Simulator build, install, process launch and screenshot only",
    "interactive_acceptance": "not_performed", "physical_iPhone": "not_performed",
    "signed_archive": "not_performed", "testflight": "not_performed", "app_store": "not_submitted"
}, ensure_ascii=False, indent=2) + "\n")
