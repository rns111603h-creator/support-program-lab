import importlib.util
import pathlib
import unittest

MODULE = pathlib.Path(__file__).with_name("release-metadata.py")


class MetadataTests(unittest.TestCase):
    def setUp(self):
        spec = importlib.util.spec_from_file_location("metadata", MODULE)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        self.validate = module.validate
        self.sample = {
            "initialScope": "local-only",
            "bundleIdentifier": "jp.synthetic.fixture.program",
            "appleTeamID": "ABCDE12345",
            "appName": "架空教材アプリ",
            "subtitle": "架空のテスト用",
            "description": "テスト用の架空説明です。",
            "keywords": "教材,テスト",
            "privacyPolicyURL": "https://synthetic-owner.github.io/privacy",
            "supportURL": "https://synthetic-owner.github.io/support",
            "reviewContact": {"name": "Synthetic", "email": "review@synthetic-owner.github.io", "phone": "+81-00-0000-0000"},
        }

    def test_valid_local_metadata_does_not_claim_release_approval(self):
        self.assertEqual(self.validate(self.sample), [])

    def test_scope_must_be_decided(self):
        self.sample["initialScope"] = "UNDECIDED"
        self.assertIn("初版の範囲", " ".join(self.validate(self.sample)))

    def test_cloud_needs_backend_and_deletion_and_moderation_evidence(self):
        self.sample["initialScope"] = "cloud"
        errors = " ".join(self.validate(self.sample))
        for text in ["backendURL", "アカウント削除", "共有コンテンツ"]:
            self.assertIn(text, errors)

    def test_placeholder_urls_are_refused(self):
        for url in ["", "http://synthetic-owner.github.io", "https://example.com/privacy", "https://localhost/privacy", "https://127.0.0.1/privacy", "https://10.1.2.3/privacy", "https://owner.invalid/privacy", "https://owner.test/privacy"]:
            self.sample["privacyPolicyURL"] = url
            self.assertTrue(self.validate(self.sample), url)

    def test_production_identifier_and_team_are_required(self):
        self.sample["bundleIdentifier"] = "jp.supportprogramlab.ios.dev"
        self.sample["appleTeamID"] = ""
        self.assertGreaterEqual(len(self.validate(self.sample)), 2)

    def test_contact_and_metadata_lengths(self):
        self.sample["appName"] = "架" * 31
        self.sample["reviewContact"] = {}
        self.assertGreaterEqual(len(self.validate(self.sample)), 2)

    def test_keywords_limit_is_utf8_bytes(self):
        self.sample["keywords"] = "教" * 34
        self.assertIn("keywords", " ".join(self.validate(self.sample)))

    def test_malformed_host_and_port_are_refused(self):
        for url in ["https://bad host.io/privacy", "https://owner.github.io:broken/privacy"]:
            self.sample["supportURL"] = url
            self.assertTrue(self.validate(self.sample), url)

    def test_release_build_must_use_the_same_identity_as_the_metadata(self):
        spec = importlib.util.spec_from_file_location("metadata", MODULE)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        self.assertTrue(module.validate_build_settings(self.sample, {
            "PRODUCT_BUNDLE_IDENTIFIER": "jp.supportprogramlab.ios.dev",
            "DEVELOPMENT_TEAM": "",
        }))

    def test_matching_build_settings_are_accepted_for_metadata_lint_only(self):
        spec = importlib.util.spec_from_file_location("metadata", MODULE)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        self.assertEqual(module.validate_build_settings(self.sample, {
            "PRODUCT_BUNDLE_IDENTIFIER": self.sample["bundleIdentifier"],
            "DEVELOPMENT_TEAM": self.sample["appleTeamID"],
        }), [])


if __name__ == "__main__":
    unittest.main()
