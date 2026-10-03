"""Audit the exact Play internal AAB with standard-library ZIP/XML and official JDK tools."""
import hashlib
import json
import os
import re
from pathlib import Path
import subprocess
import xml.etree.ElementTree as ET
import zipfile

root = Path(__file__).resolve().parent.parent
reports = root / "docs/android/publication"
reports.mkdir(parents=True, exist_ok=True)
bundle = root / "android/app/build/outputs/bundle/playtest/app-playtest.aab"
java_home = Path(os.environ["JAVA_HOME"])
bundletool = Path(os.environ["BUNDLETOOL"])

def command(args):
    result = subprocess.run([str(arg) for arg in args], capture_output=True, text=True, check=True, timeout=120)
    return result.stdout + result.stderr

validation = command([java_home / "bin/java", "-jar", bundletool, "validate", "--bundle=" + str(bundle)])
(reports / "play-upload-bundle-validation.log").write_text(validation)
manifest_text = command([java_home / "bin/java", "-jar", bundletool, "dump", "manifest", "--bundle=" + str(bundle)])
(reports / "playtest-manifest.xml").write_text(manifest_text)
manifest = ET.fromstring(manifest_text)
android = "{http://schemas.android.com/apk/res/android}"
assert manifest.get("package") == "com.elevenfate.game"
assert manifest.find("application").get(android + "debuggable", "false") == "false"
sdk = manifest.find("uses-sdk")
assert int(sdk.get(android + "targetSdkVersion")) >= 36
permissions = {p.get(android + "name") for p in manifest.findall("uses-permission")}
assert not permissions.intersection({"com.google.android.gms.permission.AD_ID", "android.permission.ACCESS_ADSERVICES_AD_ID", "android.permission.ACCESS_ADSERVICES_ATTRIBUTION", "android.permission.ACCESS_ADSERVICES_TOPICS"})
with zipfile.ZipFile(bundle) as archive:
    assert archive.testzip() is None
    build = json.loads(archive.read("base/assets/build-info.json"))
    assert build["versionCode"] == int(manifest.get(android + "versionCode"))
    offline = json.loads(archive.read("base/assets/offline-manifest.json"))
    for asset in offline["files"]:
        data = archive.read("base/assets/" + asset["path"])
        assert len(data) == asset["bytes"]
        assert hashlib.sha256(data).hexdigest() == asset["sha256"], asset["path"]
    assert not any("/lib/" in name and name.endswith(".so") for name in archive.namelist())
    assert not any(name.endswith((".p12", ".jks", ".keystore", "upload-password.txt", "release.properties")) for name in archive.namelist())
    changed = None
    baseline = root.parent / "ELEVENFATE-QA.apk"
    if baseline.exists():
        with zipfile.ZipFile(baseline) as old:
            changed = [asset["path"] for asset in offline["files"] if "assets/" + asset["path"] not in old.namelist() or old.read("assets/" + asset["path"]) != archive.read("base/assets/" + asset["path"])]
signature = command([java_home / "bin/jarsigner", "-verify", "-verbose", "-certs", bundle])
assert "jar verified." in signature and "CN=ELEVENFATE Upload" in signature and "CN=Android Debug" not in signature
(reports / "playtest-jarsigner.txt").write_text(signature)
certificate_text = command([java_home / "bin/keytool", "-printcert", "-jarfile", bundle])
certificate_sha256 = re.search(r"SHA256:\s*([a-fA-F0-9:]+)", certificate_text).group(1).replace(":", "").lower()
key_info = json.loads((root / "android/.local/signing/upload-key-info.json").read_text())
assert certificate_sha256 == key_info["certificateSha256"].replace(":", "").lower(), "AAB certificate differs from configured upload key"
lint = ET.parse(root / "android/app/build/reports/lint-results-playtest.xml").getroot().findall("issue")
errors = sum(issue.get("severity") in ["Error", "Fatal"] for issue in lint)
assert errors == 0
report = {"passed": True, "versionCode": build["versionCode"], "buildInfo": build, "sha256": hashlib.sha256(bundle.read_bytes()).hexdigest(), "assetChecks": len(offline["files"]), "changedAssetsComparedWithTestedV3": changed, "engineAndVideosMatchTestedV3": changed is not None and not any(p.startswith("dist/") or p.startswith("web/assets/cutscenes/") for p in changed), "embeddedNativeLibraries": [], "signingSecretsInBundle": False, "signedByUploadKey": True, "lintErrors": errors, "lintWarnings": sum(issue.get("severity") == "Warning" for issue in lint), "certificateWarnings": "Local self-signed certificate warnings expected; no Play acceptance or certificate-chain approval claimed."}
report["certificateSha256"] = certificate_sha256
(reports / "playtest-bundle-integrity.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
