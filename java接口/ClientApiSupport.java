package szapp.inst.data;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Locale;
import java.util.UUID;

import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import com.alibaba.fastjson.JSONObject;
import com.alibaba.fastjson.parser.Feature;

import gnu.trove.THashMap;
import net.sf.hibernate.Session;
import szapp.util.Common;

/** Shared parsing, validation and authentication for acquisition client APIs. */
final class ClientApiSupport {
    static final long AUTH_WINDOW_SECONDS = 300L;

    private ClientApiSupport() {}

    static final class ApiException extends Exception {
        private static final long serialVersionUID = 1L;
        final String code;
        ApiException(String code, String message) { super(message); this.code = code; }
    }

    static final class RequestData {
        final String rawJson;
        final JSONObject json;
        RequestData(String rawJson, JSONObject json) {
            this.rawJson = rawJson;
            this.json = json;
        }
    }

    static final class ClientIdentity {
        String clientId;
        String clientType;
        String instno;
        String fdptno;
        long fhiino;
        String appliedVersion;
    }

    static RequestData parseRequest(THashMap fields) throws Exception {
        String encoded = Common.getMapValString(fields, "dataquote");
        if (isBlank(encoded)) throw new ApiException("INVALID_REQUEST", "dataquote 不能为空");
        String raw = URLDecoder.decode(encoded, "UTF-8");
        JSONObject json;
        try {
            json = (JSONObject) JSONObject.parse(raw, Feature.OrderedField);
        } catch (Exception e) {
            throw new ApiException("INVALID_JSON", "dataquote 不是有效 JSON");
        }
        return new RequestData(raw, json);
    }

    static ClientIdentity authenticate(Session session, THashMap fields, RequestData request) throws Exception {
        String clientId = required(request.json, "client_id", 100);
        String keyId = requiredField(fields, "auth_key_id", 60);
        String nonce = requiredField(fields, "auth_nonce", 100);
        String signature = requiredField(fields, "auth_signature", 128).toLowerCase(Locale.ENGLISH);
        long timestamp = parseLong(requiredField(fields, "auth_timestamp", 20), "auth_timestamp");
        long now = System.currentTimeMillis() / 1000L;
        if (Math.abs(now - timestamp) > AUTH_WINDOW_SECONDS) {
            throw new ApiException("AUTH_EXPIRED", "请求时间戳已过期");
        }
        if (!nonce.matches("[A-Za-z0-9_-]{8,100}")) {
            throw new ApiException("AUTH_NONCE_INVALID", "auth_nonce 格式不正确");
        }

        String sql = "select client_id,client_type,instno,fdptno,fhiino,fenable,"
            + "fauthkeyid,fauthsecretenc,fauthstatus,fappliedver "
            + "from htlis.lis_client_info where client_id=?";
        PreparedStatement ps = null;
        ResultSet rs = null;
        try {
            ps = session.connection().prepareStatement(sql);
            ps.setString(1, clientId);
            rs = ps.executeQuery();
            if (!rs.next()) throw new ApiException("CLIENT_NOT_REGISTERED", "客户端未登记");
            if (!"是".equals(trim(rs.getString("fenable")))) {
                throw new ApiException("CLIENT_DISABLED", "客户端未启用");
            }
            if (!"ACTIVE".equalsIgnoreCase(trim(rs.getString("fauthstatus")))) {
                throw new ApiException("AUTH_DISABLED", "客户端凭证不可用");
            }
            if (!keyId.equals(trim(rs.getString("fauthkeyid")))) {
                throw new ApiException("AUTH_KEY_MISMATCH", "客户端凭证标识不匹配");
            }
            String secret = decryptSecret(rs.getString("fauthsecretenc"));
            String canonical = clientId + "\n" + timestamp + "\n" + nonce + "\n" + request.rawJson;
            String expected = hmacSha256Hex(secret, canonical);
            if (!MessageDigest.isEqual(expected.getBytes(StandardCharsets.US_ASCII),
                    signature.getBytes(StandardCharsets.US_ASCII))) {
                throw new ApiException("AUTH_SIGNATURE_INVALID", "请求签名校验失败");
            }
            ClientIdentity id = new ClientIdentity();
            id.clientId = clientId;
            id.clientType = trim(rs.getString("client_type"));
            id.instno = trim(rs.getString("instno"));
            id.fdptno = trim(rs.getString("fdptno"));
            id.fhiino = rs.getLong("fhiino");
            if (rs.wasNull() || id.fhiino <= 0) throw new ApiException("CLIENT_SCOPE_INVALID", "客户端未配置机构归属");
            id.appliedVersion = trim(rs.getString("fappliedver"));
            String reportedInstno = trim(request.json.getString("instno"));
            if (!isBlank(reportedInstno) && !reportedInstno.equalsIgnoreCase(id.instno)) {
                throw new ApiException("INSTNO_MISMATCH", "客户端仪器编号与服务端登记不一致");
            }
            return id;
        } finally {
            close(rs); close(ps);
        }
    }

    static void verifyHttpMode(JSONObject json) throws ApiException {
        String mode = trim(json.getString("mode"));
        if (!isBlank(mode) && !"http".equalsIgnoreCase(mode)) {
            throw new ApiException("MODE_NOT_SUPPORTED", "当前仅支持 http 采集模式");
        }
    }

    static String required(JSONObject json, String key, int maxLength) throws ApiException {
        String value = trim(json.getString(key));
        if (isBlank(value)) throw new ApiException("FIELD_REQUIRED", key + " 不能为空");
        if (value.length() > maxLength) throw new ApiException("FIELD_TOO_LONG", key + " 长度超限");
        return value;
    }

    static String optional(JSONObject json, String key, int maxLength) throws ApiException {
        String value = trim(json.getString(key));
        if (value.length() > maxLength) throw new ApiException("FIELD_TOO_LONG", key + " 长度超限");
        return value;
    }

    static long nonNegativeLong(JSONObject json, String key) throws ApiException {
        Object value = json.get(key);
        if (value == null || "".equals(String.valueOf(value).trim())) return 0L;
        long number;
        try { number = Long.parseLong(String.valueOf(value)); }
        catch (Exception e) { throw new ApiException("FIELD_INVALID", key + " 必须为整数"); }
        if (number < 0) throw new ApiException("FIELD_INVALID", key + " 不能为负数");
        return number;
    }

    static Long nullableLong(JSONObject json, String key) throws ApiException {
        Object value = json.get(key);
        if (value == null || "".equals(String.valueOf(value).trim())) return null;
        try { return Long.valueOf(String.valueOf(value)); }
        catch (Exception e) { throw new ApiException("FIELD_INVALID", key + " 必须为整数"); }
    }

    static Timestamp eventTime(JSONObject json, String key) throws ApiException {
        Object value = json.get(key);
        if (value == null || "".equals(String.valueOf(value).trim())) return new Timestamp(System.currentTimeMillis());
        String text = String.valueOf(value).trim();
        try {
            long number = Long.parseLong(text);
            if (text.length() <= 10) number *= 1000L;
            return checkedTimestamp(number);
        } catch (NumberFormatException ignore) {}
        String[] patterns = {"yyyy-MM-dd HH:mm:ss.SSS", "yyyy-MM-dd HH:mm:ss", "yyyy/MM/dd HH:mm:ss"};
        for (int i = 0; i < patterns.length; i++) {
            try {
                SimpleDateFormat f = new SimpleDateFormat(patterns[i]);
                f.setLenient(false);
                return checkedTimestamp(f.parse(text).getTime());
            } catch (ParseException ignore) {}
        }
        throw new ApiException("FIELD_INVALID", key + " 时间格式不正确");
    }

    private static Timestamp checkedTimestamp(long millis) throws ApiException {
        long now = System.currentTimeMillis();
        if (millis > now + 86400000L || millis < now - 31536000000L) {
            throw new ApiException("EVENT_TIME_INVALID", "客户端事件时间超出允许范围");
        }
        return new Timestamp(millis);
    }

    static String uuid() { return UUID.randomUUID().toString().replace("-", "").toUpperCase(Locale.ENGLISH); }

    static String sha256Hex(String value) throws Exception {
        return hex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
    }

    static String hmacSha256Hex(String secret, String value) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return hex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
    }

    static String decryptSecret(String stored) throws Exception {
        if (isBlank(stored) || !stored.startsWith("v1:")) {
            throw new ApiException("AUTH_SECRET_INVALID", "服务端凭证未正确配置");
        }
        String master = System.getProperty("syssjcj.client.masterKey");
        if (isBlank(master)) master = System.getenv("SYSSJCJ_CLIENT_MASTER_KEY");
        if (isBlank(master)) throw new ApiException("AUTH_SERVER_CONFIG", "服务端未配置客户端凭证主密钥");
        String[] parts = stored.split(":", -1);
        if (parts.length != 3) throw new ApiException("AUTH_SECRET_INVALID", "服务端凭证格式错误");
        byte[] key = aes128Key(master);
        byte[] iv = java.util.Base64.getDecoder().decode(parts[1]);
        byte[] encrypted = java.util.Base64.getDecoder().decode(parts[2]);
        Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
        cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new IvParameterSpec(iv));
        return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
    }

    static String encryptSecret(String secret, String master) throws Exception {
        if (isBlank(secret) || isBlank(master)) throw new IllegalArgumentException("secret/master must not be blank");
        byte[] iv = new byte[16];
        new SecureRandom().nextBytes(iv);
        Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
        cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(aes128Key(master), "AES"), new IvParameterSpec(iv));
        return "v1:" + java.util.Base64.getEncoder().encodeToString(iv) + ":"
            + java.util.Base64.getEncoder().encodeToString(cipher.doFinal(secret.getBytes(StandardCharsets.UTF_8)));
    }

    private static byte[] aes128Key(String master) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(master.getBytes(StandardCharsets.UTF_8));
        byte[] key = new byte[16];
        System.arraycopy(digest, 0, key, 0, key.length);
        return key;
    }

    /** Client-applied configuration JSON. Display-only policy metadata is excluded. */
    static String policyJson(ResultSet rs) throws Exception {
        JSONObject c = new JSONObject(true);
        c.put("client_id", trim(rs.getString("client_id")));
        c.put("instno", trim(rs.getString("instno")));
        c.put("config_ver", trim(rs.getString("config_ver")));
        c.put("interface_type", trim(rs.getString("interface_type")));
        c.put("file_path", trim(rs.getString("file_path")));
        c.put("scan_interval", rs.getLong("scan_interval"));
        c.put("service_url", trim(rs.getString("service_url")));
        putNullableNumber(c, "start_row", rs, "start_row");
        c.put("samp_col_flag", trim(rs.getString("samp_col_flag")));
        c.put("track_mode", rs.getLong("track_mode"));
        c.put("allowed_extensions", trim(rs.getString("allowed_extensions")));
        putNullableNumber(c, "max_companion_files", rs, "max_companion_files");
        c.put("heartbeat_interval", rs.getLong("heartbeat_interval"));
        c.put("archive_mode", trim(rs.getString("archive_mode")));
        c.put("data_mode", trim(rs.getString("data_mode")));
        c.put("output_dir", trim(rs.getString("output_dir")));
        c.put("file_name_template", trim(rs.getString("file_name_template")));
        return c.toJSONString();
    }

    private static void putNullableNumber(JSONObject o, String key, ResultSet rs, String column) throws Exception {
        long value = rs.getLong(column);
        o.put(key, rs.wasNull() ? null : Long.valueOf(value));
    }

    private static String requiredField(THashMap fields, String key, int maxLength) throws ApiException {
        String value = trim(Common.getMapValString(fields, key));
        if (isBlank(value)) throw new ApiException("AUTH_FIELD_REQUIRED", key + " 不能为空");
        if (value.length() > maxLength) throw new ApiException("AUTH_FIELD_INVALID", key + " 长度超限");
        return value;
    }

    private static long parseLong(String value, String key) throws ApiException {
        try { return Long.parseLong(value); }
        catch (Exception e) { throw new ApiException("FIELD_INVALID", key + " 必须为整数"); }
    }

    static String trim(String value) { return value == null ? "" : value.trim(); }
    static boolean isBlank(String value) { return value == null || value.trim().length() == 0; }
    static String nullIfBlank(String value) { return isBlank(value) ? null : value.trim(); }

    private static String hex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (int i = 0; i < bytes.length; i++) sb.append(String.format("%02x", bytes[i] & 0xff));
        return sb.toString();
    }

    static void close(AutoCloseable c) {
        if (c != null) try { c.close(); } catch (Exception ignore) {}
    }
}
