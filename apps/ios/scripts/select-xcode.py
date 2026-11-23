"""Prefer an installed stable Xcode 26; record fallback as a release blocker."""
import glob
import os
import pathlib
import re
import subprocess

candidates = []
for name in glob.glob("/Applications/Xcode*.app"):
    match = re.search(r"Xcode[_ ](26(?:\.\d+)*)\.app$", name)
    if match:
        candidates.append((tuple(map(int, match[1].split("."))), name))
if candidates:
    selected = pathlib.Path(max(candidates)[1]) / "Contents/Developer"
    with open(os.environ["GITHUB_ENV"], "a") as output:
        output.write(f"DEVELOPER_DIR={selected}\n")
    print(f"Selected {selected}")
else:
    print("Xcode 26 not found; using runner default for development checks. App Store SDK requirement remains unverified.")
    subprocess.run(["ls", "-d", "/Applications"], check=True)
