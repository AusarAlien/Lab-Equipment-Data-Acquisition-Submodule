# -*- coding: utf-8 -*-
"""Client runtime API shared by heartbeat, events and policy sync."""
import configparser
# import hashlib  # 客户端凭证功能停用，保留供恢复 HMAC 签名时使用。
# import hmac
import json
import os
# import secrets
import shutil
import tempfile
import threading
import time
import uuid
from urllib.parse import quote

import requests


class ClientApiError(RuntimeError):
    pass


class ClientApi:
    def __init__(self, config_path, logger=None):
        self.config_path = os.path.abspath(config_path)
        self.log = logger
        self.run_id = uuid.uuid4().hex.upper()
        self._lock = threading.RLock()
        self._last_pull = 0.0

    def _message(self, level, text, *args):
        if self.log:
            getattr(self.log, level, self.log.info)(text, *args)

    def _load(self):
        cfg = configparser.ConfigParser(interpolation=None)
        cfg.read(self.config_path, encoding="utf-8-sig")
        return cfg

    @staticmethod
    def _value(cfg, section, key, fallback=""):
        try:
            return cfg.get(section, key).strip()
        except Exception:
            return fallback

    def enabled(self):
        cfg = self._load()
        return self._value(cfg, "interface", "client_api_enabled", "1").lower() not in (
            "0", "false", "否", "no"
        )

    def _identity(self, cfg):
        return {
            "client_id": self._value(cfg, "interface", "client_id"),
            "instno": self._value(cfg, "interface", "instno"),
            # "auth_key_id": self._value(cfg, "interface", "auth_key_id"),
            # "client_secret": self._value(cfg, "interface", "client_secret"),
            "service": self._value(cfg, "interface", "service").rstrip("/"),
        }

    @staticmethod
    def _normalize_response(value):
        if not isinstance(value, dict):
            return {}
        merged = dict(value)
        for key in ("params", "outParams", "data"):
            nested = value.get(key)
            if isinstance(nested, dict):
                merged.update(nested)
        return merged

    def post(self, endpoint, payload, timeout=8):
        cfg = self._load()
        if self._value(cfg, "interface", "client_api_enabled", "1").lower() in (
            "0", "false", "否", "no"
        ):
            raise ClientApiError("客户端运行接口已禁用")
        identity = self._identity(cfg)
        # 客户端凭证功能当前停用；保留凭证字段和签名实现便于将来恢复。
        # missing = [k for k in ("client_id", "instno", "auth_key_id", "client_secret", "service")
        missing = [k for k in ("client_id", "instno", "service")
                   if not identity[k]]
        if missing:
            raise ClientApiError("客户端接口配置缺失：" + ",".join(missing))

        body = dict(payload or {})
        body["client_id"] = identity["client_id"]
        body.setdefault("instno", identity["instno"])
        raw = json.dumps(body, ensure_ascii=False, separators=(",", ":"))
        # 凭证签名代码保留但不参与当前请求。
        # timestamp = str(int(time.time()))
        # nonce = secrets.token_urlsafe(18).replace("=", "")
        # canonical = "%s\n%s\n%s\n%s" % (identity["client_id"], timestamp, nonce, raw)
        # signature = hmac.new(
        #     identity["client_secret"].encode("utf-8"),
        #     canonical.encode("utf-8"), hashlib.sha256
        # ).hexdigest()
        fields = {
            "dataquote": quote(raw),
            # "auth_key_id": identity["auth_key_id"],
            # "auth_timestamp": timestamp,
            # "auth_nonce": nonce,
            # "auth_signature": signature,
        }
        url = identity["service"] + "/" + endpoint.lstrip("/")
        try:
            with requests.Session() as session:
                session.trust_env = False
                response = session.post(
                    url, data=fields,
                    files={"dummy": ("", b"", "application/octet-stream")},
                    timeout=timeout,
                )
            response.raise_for_status()
            result = self._normalize_response(response.json())
        except Exception as exc:
            raise ClientApiError("%s请求失败：%s" % (endpoint, exc))
        if str(result.get("result", "")).lower() not in ("success", "ok"):
            raise ClientApiError(str(result.get("message") or result.get("code") or "服务端返回失败"))
        return result

    def heartbeat(self, info):
        payload = dict(info or {})
        payload["run_id"] = self.run_id
        return self.post("UploadClientLog.m", payload, timeout=5)

    def event(self, log_type, result_status="INFO", level="INFO", **values):
        payload = {
            "event_id": values.pop("event_id", uuid.uuid4().hex.upper()),
            "event_time": int(time.time()),
            "mode": "http",
            "log_type": log_type,
            "log_level": level,
            "result_status": result_status,
            "run_id": self.run_id,
        }
        payload.update({k: v for k, v in values.items() if v is not None and v != ""})
        return self.post("UploadClientEvent.m", payload, timeout=6)

    @staticmethod
    def _positive_int(value, name, allow_zero=False):
        try:
            number = int(value)
        except Exception:
            raise ClientApiError("策略字段%s必须为整数" % name)
        if number < 0 or (number == 0 and not allow_zero):
            raise ClientApiError("策略字段%s取值无效" % name)
        return str(number)

    def _validate_policy(self, config, identity):
        if not isinstance(config, dict):
            raise ClientApiError("服务端策略内容为空")
        if str(config.get("client_id", "")).strip() != identity["client_id"]:
            raise ClientApiError("策略客户端编号不匹配")
        if str(config.get("instno", "")).strip().upper() != identity["instno"].upper():
            raise ClientApiError("策略仪器编号不匹配")
        if str(config.get("interface_type", "http")).strip().lower() != "http":
            raise ClientApiError("当前客户端只允许HTTP采集策略")
        file_path = str(config.get("file_path", "")).strip()
        if not file_path or not os.path.isdir(file_path):
            raise ClientApiError("策略监听目录不存在：%s" % file_path)
        service = str(config.get("service_url", "")).strip().rstrip("/")
        if service.endswith("/UploadInstDataFilesNew.m"):
            service = service[:-len("/UploadInstDataFilesNew.m")]
        if not service.lower().startswith(("http://", "https://")):
            raise ClientApiError("策略服务地址无效")
        extensions = str(config.get("allowed_extensions", "")).strip()
        if not extensions:
            raise ClientApiError("策略允许扩展名不能为空")
        return {
            "type": "http",
            "filepath": file_path,
            "frequency": self._positive_int(config.get("scan_interval"), "scan_interval"),
            "service": service,
            "startrow": self._positive_int(config.get("start_row", 1), "start_row", allow_zero=True),
            "sampcolflag": str(config.get("samp_col_flag", "")).strip(),
            "track_mode": "1" if int(config.get("track_mode", 0)) else "0",
            "allowed_extensions": extensions,
            "max_companion_files": self._positive_int(
                config.get("max_companion_files", 0), "max_companion_files", allow_zero=True
            ),
            "heartbeat_interval": self._positive_int(
                config.get("heartbeat_interval"), "heartbeat_interval"
            ),
            "archive_mode": str(config.get("archive_mode", "")).strip(),
            "data_mode": str(config.get("data_mode", "file_first")).strip() or "file_first",
            "usb_output_dir": str(config.get("output_dir", "")).strip(),
            "usb_filename_template": str(config.get("file_name_template", "")).strip(),
        }

    def _atomic_apply(self, interface_updates, version, policy_hash):
        with self._lock:
            cfg = self._load()
            if not cfg.has_section("interface"):
                cfg.add_section("interface")
            for key, value in interface_updates.items():
                cfg.set("interface", key, value)
            if not cfg.has_section("remote_policy"):
                cfg.add_section("remote_policy")
            cfg.set("remote_policy", "current_version", version)
            cfg.set("remote_policy", "current_hash", policy_hash)
            cfg.set("remote_policy", "applied_at", time.strftime("%Y-%m-%d %H:%M:%S"))

            folder = os.path.dirname(self.config_path) or "."
            fd, temp_path = tempfile.mkstemp(prefix="config.", suffix=".tmp", dir=folder)
            try:
                with os.fdopen(fd, "w", encoding="utf-8") as stream:
                    cfg.write(stream)
                    stream.flush()
                    os.fsync(stream.fileno())
                if os.path.exists(self.config_path):
                    shutil.copy2(self.config_path, self.config_path + ".bak")
                os.replace(temp_path, self.config_path)
            finally:
                if os.path.exists(temp_path):
                    os.remove(temp_path)

    def pull_and_apply(self):
        cfg = self._load()
        identity = self._identity(cfg)
        current_version = self._value(cfg, "remote_policy", "current_version")
        current_hash = self._value(cfg, "remote_policy", "current_hash")
        result = self.post("GetClientConfig.m", {
            "mode": "http",
            "current_policy_ver": current_version,
            "current_policy_hash": current_hash,
        })
        if not result.get("changed"):
            return False

        version = str(result.get("policy_ver", "")).strip()
        policy_hash = str(result.get("policy_hash", "")).strip().lower()
        config = result.get("config")
        if not version or len(policy_hash) != 64:
            raise ClientApiError("服务端策略版本或摘要无效")
        try:
            updates = self._validate_policy(config, identity)
            self._atomic_apply(updates, version, policy_hash)
            self.post("UploadClientConfigAck.m", {
                "policy_ver": version,
                "policy_hash": policy_hash,
                "apply_status": "SUCCESS",
                "apply_message": "客户端已原子应用HTTP采集策略",
            })
            self._message("info", "已应用远程策略：%s", version)
            return True
        except Exception as exc:
            try:
                self.post("UploadClientConfigAck.m", {
                    "policy_ver": version,
                    "policy_hash": policy_hash,
                    "apply_status": "FAILED",
                    "apply_message": str(exc)[:1000],
                })
            except Exception as ack_exc:
                self._message("warning", "策略失败回执未送达：%s", ack_exc)
            raise

    def maybe_pull(self, now=None):
        if not self.enabled():
            return False
        now = now or time.time()
        cfg = self._load()
        try:
            interval = int(self._value(cfg, "interface", "config_pull_interval", "300"))
        except Exception:
            interval = 300
        if interval <= 0 or now - self._last_pull < interval:
            return False
        self._last_pull = now
        try:
            changed = self.pull_and_apply()
            if not changed:
                self._message("info", "策略检查完成：当前已是最新版本")
            return changed
        except Exception as exc:
            self._message("warning", "远程策略同步失败：%s", exc)
            return False
