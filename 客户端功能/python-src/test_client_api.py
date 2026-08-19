# -*- coding: utf-8 -*-
import configparser
# 凭证签名测试依赖保留为注释，当前不参与测试。
# import hashlib
# import hmac
import json
import os
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import unquote

from client_api import ClientApi


class _Handler(BaseHTTPRequestHandler):
    secret = "unit-test-secret"
    error = None

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            raw_request = self.rfile.read(length)
            content_type = self.headers.get("Content-Type", "")
            boundary = content_type.split("boundary=", 1)[1].encode()
            fields = {}
            for part in raw_request.split(b"--" + boundary):
                if b"name=\"" not in part or b"\r\n\r\n" not in part:
                    continue
                head, value = part.split(b"\r\n\r\n", 1)
                name = head.split(b"name=\"", 1)[1].split(b"\"", 1)[0].decode()
                fields[name] = value.rstrip(b"\r\n-").decode("utf-8")
            raw_json = unquote(fields["dataquote"])
            payload = json.loads(raw_json)
            # 原凭证签名校验保留为注释，当前接口不再发送或要求凭证字段。
            # canonical = "%s\n%s\n%s\n%s" % (
            #     payload["client_id"], fields["auth_timestamp"], fields["auth_nonce"], raw_json
            # )
            # expected = hmac.new(self.secret.encode(), canonical.encode(), hashlib.sha256).hexdigest()
            # if expected != fields["auth_signature"]:
            #     raise AssertionError("signature mismatch")
            if fields.get("auth_signature"):
                raise AssertionError("credential fields must be inactive")
            response = json.dumps({"result": "success", "params": {"changed": False}}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(response)))
            self.end_headers()
            self.wfile.write(response)
        except Exception as exc:
            _Handler.error = exc
            self.send_response(500)
            self.end_headers()

    def log_message(self, *_):
        pass


class ClientApiTest(unittest.TestCase):
    def test_unsigned_post_and_atomic_policy_write(self):
        server = HTTPServer(("127.0.0.1", 0), _Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            with tempfile.TemporaryDirectory() as folder:
                watch = os.path.join(folder, "watch")
                os.mkdir(watch)
                config_path = os.path.join(folder, "config.ini")
                with open(config_path, "w", encoding="utf-8") as stream:
                    stream.write(
                        "[interface]\nclient_id=TEST-01\ninstno=TEST-01\n"
                        # "auth_key_id=KEY-01\nclient_secret=unit-test-secret\n"
                        "client_api_enabled=1\nservice=http://127.0.0.1:%d\n" % server.server_port
                    )
                api = ClientApi(config_path)
                result = api.post("UploadClientLog.m", {"status": "RUNNING"})
                self.assertFalse(result["changed"])
                self.assertIsNone(_Handler.error)

                identity = api._identity(api._load())
                updates = api._validate_policy({
                    "client_id": "TEST-01", "instno": "TEST-01", "interface_type": "http",
                    "file_path": watch, "scan_interval": 10,
                    "service_url": "http://127.0.0.1:8801/yncdc/UploadInstDataFilesNew.m",
                    "start_row": 1, "samp_col_flag": "样品名称", "track_mode": 1,
                    "allowed_extensions": ".pdf,.txt", "max_companion_files": 2,
                    "heartbeat_interval": 60, "data_mode": "file_first",
                }, identity)
                api._atomic_apply(updates, "v1_20260810", "a" * 64)
                cfg = configparser.ConfigParser(interpolation=None)
                cfg.read(config_path, encoding="utf-8")
                self.assertEqual(cfg.get("interface", "service"), "http://127.0.0.1:8801/yncdc")
                self.assertEqual(cfg.get("remote_policy", "current_version"), "v1_20260810")
                self.assertTrue(os.path.exists(config_path + ".bak"))
        finally:
            server.shutdown()
            server.server_close()


if __name__ == "__main__":
    unittest.main()
