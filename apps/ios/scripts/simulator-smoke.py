"""Unsigned Simulator launch evidence; this does not test interaction or a device."""
import json
import os
import pathlib
import subprocess
import time
import uuid

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
container = pathlib.Path(command("xcrun", "simctl", "get_app_container", identifier, "jp.supportprogramlab.ios.dev", "data").strip())
root = container / "Library/Application Support/SupportProgramLab"
if "CoreSimulator" not in container.parts or root.exists():
    raise SystemExit("Fixture requires a fresh Simulator app container; existing data will not be overwritten")
root.mkdir(parents=True, mode=0o700)
now = time.time() - 978307200  # Foundation's default Codable Date reference: 2001-01-01.
program = {
    "id": str(uuid.uuid4()), "title": "架空の進行練習", "summary": "Simulatorの表示確認に使う架空教材です。",
    "body": "導入と振り返りの流れを確認します。実際の支援教材や利用者情報は含みません。",
    "tags": ["架空データ", "10分"], "durationMinutes": 10,
    "steps": [{"id": str(uuid.uuid4()), "title": title, "minutes": 5, "notes": "表示確認用の架空メモです。"} for title in ["導入", "振り返り"]],
    "attachments": [], "sourceURL": "", "rightsBasis": "画面確認用に作成した架空の文章です。",
    "createdAt": now, "updatedAt": now,
}
index = root / "programs.json"
index.write_text(json.dumps({"version": 1, "programs": [program]}, ensure_ascii=False))
index.chmod(0o600)
launch = command("xcrun", "simctl", "launch", identifier, "jp.supportprogramlab.ios.dev")
time.sleep(3)
os.kill(int(launch.rsplit(":", 1)[1].strip()), 0)
subprocess.run(["xcrun", "simctl", "io", identifier, "screenshot", str(ARTIFACTS / "iphone-library.png")], check=True)
(ARTIFACTS / "simulator-smoke.json").write_text(json.dumps({
    "runtime": runtime, "device": device["name"], "launch": launch.strip(),
    "scope": "unsigned Simulator build, install, process launch and screenshot only",
    "fixture": "one synthetic program written into a fresh Simulator container; not created by UI automation",
    "interactive_acceptance": "not_performed", "physical_iPhone": "not_performed",
    "signed_archive": "not_performed", "testflight": "not_performed", "app_store": "not_submitted"
}, ensure_ascii=False, indent=2) + "\n")
