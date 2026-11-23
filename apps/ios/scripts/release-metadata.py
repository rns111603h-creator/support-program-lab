"""Offline metadata lint only; does not validate URLs, signatures or Apple approval."""
import ipaddress
import json
import os
import pathlib
import re
import sys
from urllib.parse import urlsplit


def public_https(value):
    if not isinstance(value, str):
        return False
    try:
        url = urlsplit(value)
        _ = url.port
        host = (url.hostname or "").lower()
        if url.scheme != "https" or not host or url.username or url.password:
            return False
        if host == "localhost" or host == "example.com" or host.endswith((".localhost", ".local", ".test", ".invalid", ".example", ".example.com")):
            return False
        try:
            return ipaddress.ip_address(host).is_global
        except ValueError:
            ascii_host = host.encode("idna").decode("ascii")
            return len(ascii_host) <= 253 and re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+", ascii_host) is not None
    except (ValueError, UnicodeError):
        return False


def validate(config):
    errors = []
    if config.get("initialScope") not in ("local-only", "cloud"):
        errors.append("初版の範囲を本人と確定してください。")
    bundle = config.get("bundleIdentifier", "")
    if not re.fullmatch(r"[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+){2,}", bundle) or bundle.endswith(".dev"):
        errors.append("正式なbundleIdentifierを指定してください。開発用.devは提出不可です。")
    if not re.fullmatch(r"[A-Z0-9]{10}", config.get("appleTeamID", "")):
        errors.append("個人用Apple DeveloperのappleTeamIDが必要です。")
    for field, limit in [("appName", 30), ("subtitle", 30), ("description", 4000), ("keywords", 100)]:
        value = config.get(field)
        if not isinstance(value, str) or not value.strip() or (len(value.encode("utf-8")) if field == "keywords" else len(value)) > limit:
            unit = "UTF-8 bytes" if field == "keywords" else "文字"
            errors.append(f"{field}は1〜{limit}{unit}で記入してください。")
    for field in ["privacyPolicyURL", "supportURL"]:
        if not public_https(config.get(field)):
            errors.append(f"{field}には有効な公開HTTPS URLが必要です。")
    contact = config.get("reviewContact", {})
    if not isinstance(contact, dict) or any(not isinstance(contact.get(k), str) or not contact[k].strip() for k in ["name", "email", "phone"]):
        errors.append("審査連絡先の氏名・email・電話番号を本人確認のうえ記入してください。")
    elif not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", contact["email"]):
        errors.append("審査連絡先emailの形式を確認してください。")
    if config.get("initialScope") == "cloud":
        if not public_https(config.get("backendURL")):
            errors.append("cloud版は稼働中のbackendURLが必要です。")
        if not config.get("accountDeletionEvidence"):
            errors.append("cloud版はアプリ内アカウント削除の実装・検証根拠が必要です。")
        if not config.get("sharedContentEvidence"):
            errors.append("cloud版は共有コンテンツのフィルタ・通報・ブロック・問い合わせ運用の根拠が必要です。")
    return errors


def validate_build_settings(config, environment):
    errors = []
    for setting, field in [("PRODUCT_BUNDLE_IDENTIFIER", "bundleIdentifier"), ("DEVELOPMENT_TEAM", "appleTeamID")]:
        if environment.get(setting) != config.get(field):
            errors.append(f"Xcodeの{setting}と提出用の{field}が一致しません。")
    return errors


if __name__ == "__main__":
    try:
        config = json.loads(pathlib.Path(sys.argv[1]).read_text())
        if not isinstance(config, dict):
            raise ValueError("設定はJSON objectにしてください。")
        errors = validate(config)
        if os.environ.get("CONFIGURATION") == "Release":
            errors.extend(validate_build_settings(config, os.environ))
    except (IndexError, OSError, ValueError, TypeError) as error:
        print(f"メタデータを検査できません: {error}", file=sys.stderr)
        sys.exit(1)
    if errors:
        print("提出準備の未完了項目:\n" + "\n".join(f"- {item}" for item in errors))
        sys.exit(1)
    print("メタデータ形式は整っています。URLの実稼働・権利・プライバシー申告・署名・実機検証・審査承認は別途確認が必要です。")
