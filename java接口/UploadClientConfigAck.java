package szapp.inst.data;

import java.io.StringReader;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

import net.sf.hibernate.Session;
import org.apache.log4j.Logger;

import szapp.domain.ServiceLocator;
import szapp.util.CommonHiis;
import szapp.web.ctl.UpLoadFiles;

/**
 * Registered-client policy application receipt endpoint: POST
 * /UploadClientConfigAck.m.
 */
public class UploadClientConfigAck extends UpLoadFiles {
    private static final Logger log = Logger.getLogger(UploadClientConfigAck.class.getName());

    @Override
    protected void initProperties() throws Exception {
        this.sessionId = "CLIENT_API_" + System.currentTimeMillis();
        commonFields = (gnu.trove.THashMap) CommonHiis.synAddrSpecChar(commonFields);
    }

    @Override
    protected String insidePerform() throws Exception {
        Session session = ServiceLocator.currentSession();
        try {
            ClientApiSupport.RequestData request = ClientApiSupport.parseRequest(commonFields);
            // 客户端凭证功能当前停用；保留原调用便于将来恢复。
            // ClientApiSupport.ClientIdentity client = ClientApiSupport.authenticate(session, commonFields, request);
            ClientApiSupport.ClientIdentity client = ClientApiSupport.identifyRegisteredClient(session, request);
            String version = ClientApiSupport.required(request.json, "policy_ver", 40);
            String hash = ClientApiSupport.required(request.json, "policy_hash", 64).toLowerCase();
            String applyStatus = ClientApiSupport.required(request.json, "apply_status", 20).toUpperCase();
            if (!("SUCCESS".equals(applyStatus) || "FAILED".equals(applyStatus))) {
                throw new ClientApiSupport.ApiException("STATUS_INVALID", "apply_status 仅允许 SUCCESS 或 FAILED");
            }
            String message = ClientApiSupport.optional(request.json, "apply_message", 2000);
            Policy policy = loadAndVerifyPolicy(session, client, version, hash);
            updateClient(session, client, version, applyStatus, message);
            upsertAckLog(session, client, policy, applyStatus, message);
            session.connection().commit();
            outParams.put("result", "success");
            outParams.put("code", "OK");
            outParams.put("policy_ver", version);
            outParams.put("apply_status", applyStatus);
            outParams.put("server_time", Long.valueOf(System.currentTimeMillis() / 1000L));
            return SUCCESS;
        } catch (ClientApiSupport.ApiException e) {
            session.connection().rollback();
            fail(e.code, e.getMessage());
            return ERROR;
        } catch (Exception e) {
            session.connection().rollback();
            log.error("UploadClientConfigAck failed", e);
            fail("SERVER_ERROR", "策略应用回执处理失败");
            return ERROR;
        } finally {
            ServiceLocator.closeSession();
        }
    }

    private Policy loadAndVerifyPolicy(Session session, ClientApiSupport.ClientIdentity client,
            String version, String reportedHash) throws Exception {
        String sql = "select fguid,client_id,instno,policy_name,config_ver,interface_type,file_path,scan_interval,"
                + "service_url,start_row,samp_col_flag,track_mode,allowed_extensions,max_companion_files,"
                + "heartbeat_interval,archive_mode,data_mode,output_dir,file_name_template "
                + "from htlis.lis_client_policy where client_id=? and instno=? and fhiino=? "
                + "and policy_status='PUBLISHED' and config_ver=?";
        PreparedStatement ps = null;
        ResultSet rs = null;
        try {
            ps = session.connection().prepareStatement(sql);
            ps.setString(1, client.clientId);
            ps.setString(2, client.instno);
            ps.setLong(3, client.fhiino);
            ps.setString(4, version);
            rs = ps.executeQuery();
            if (!rs.next())
                throw new ClientApiSupport.ApiException("POLICY_NOT_FOUND", "未找到对应的已发布策略");
            Policy p = new Policy();
            p.guid = rs.getString("fguid");
            p.name = ClientApiSupport.trim(rs.getString("policy_name"));
            p.version = rs.getString("config_ver");
            p.json = ClientApiSupport.policyJson(rs);
            String actualHash = ClientApiSupport.sha256Hex(p.json);
            if (!actualHash.equalsIgnoreCase(reportedHash)) {
                throw new ClientApiSupport.ApiException("POLICY_HASH_MISMATCH", "客户端策略摘要与服务端发布内容不一致");
            }
            return p;
        } finally {
            ClientApiSupport.close(rs);
            ClientApiSupport.close(ps);
        }
    }

    private void updateClient(Session session, ClientApiSupport.ClientIdentity client,
            String version, String status, String message) throws Exception {
        String sql = "update htlis.lis_client_info set fappliedver=case when ?='SUCCESS' then ? else fappliedver end,"
                + "fapplystatus=?,fapplymsg=?,"
                + "flastconfigdt=sysdate,fempid=?,fopdt=sysdate where client_id=? and fhiino=?";
        PreparedStatement ps = null;
        try {
            ps = session.connection().prepareStatement(sql);
            ps.setString(1, status);
            ps.setString(2, version);
            ps.setString(3, status);
            ps.setString(4, ClientApiSupport.nullIfBlank(message));
            ps.setString(5, client.clientId);
            ps.setString(6, client.clientId);
            ps.setLong(7, client.fhiino);
            if (ps.executeUpdate() != 1)
                throw new ClientApiSupport.ApiException("CLIENT_UPDATE_FAILED", "客户端策略状态更新失败");
        } finally {
            ClientApiSupport.close(ps);
        }
    }

    private void upsertAckLog(Session session, ClientApiSupport.ClientIdentity client,
            Policy policy, String status, String message) throws Exception {
        String action = "SUCCESS".equals(status) ? "APPLY_SUCCESS" : "APPLY_FAIL";
        String sql = "merge into htlis.lis_client_policy_log t using (select ? client_id,? config_ver,? action_type from dual) s "
                + "on (t.client_id=s.client_id and t.config_ver=s.config_ver and t.action_type=s.action_type) "
                + "when matched then update set t.after_json=?,t.result_status=?,t.result_message=?,t.fempid=?,t.fopdt=sysdate,t.fhiino=? "
                + "when not matched then insert (fguid,policy_guid,client_id,config_ver,policy_name,action_type,foperatortype,"
                + "before_json,after_json,result_status,result_message,change_summary,operation_source,fempid,fopdt,fhiino) "
                + "values (?,?,?,?,?,?,'CLIENT',null,?,?,?,?,'UploadClientConfigAck',?,sysdate,?)";
        PreparedStatement ps = null;
        try {
            ps = session.connection().prepareStatement(sql);
            int i = 1;
            ps.setString(i++, client.clientId);
            ps.setString(i++, policy.version);
            ps.setString(i++, action);
            ps.setCharacterStream(i++, new StringReader(policy.json), policy.json.length());
            ps.setString(i++, status);
            ps.setString(i++, ClientApiSupport.nullIfBlank(message));
            ps.setString(i++, client.clientId);
            ps.setLong(i++, client.fhiino);
            ps.setString(i++, ClientApiSupport.uuid());
            ps.setString(i++, policy.guid);
            ps.setString(i++, client.clientId);
            ps.setString(i++, policy.version);
            ps.setString(i++, policy.name);
            ps.setString(i++, action);
            ps.setCharacterStream(i++, new StringReader(policy.json), policy.json.length());
            ps.setString(i++, status);
            ps.setString(i++, ClientApiSupport.nullIfBlank(message));
            ps.setString(i++, "SUCCESS".equals(status) ? "客户端应用策略成功" : "客户端应用策略失败");
            ps.setString(i++, client.clientId);
            ps.setLong(i++, client.fhiino);
            ps.executeUpdate();
        } finally {
            ClientApiSupport.close(ps);
        }
    }

    private void fail(String code, String message) {
        outParams.put("result", "error");
        outParams.put("code", code);
        outParams.put("message", message);
    }

    private static final class Policy {
        String guid;
        String name;
        String version;
        String json;
    }

    @Override
    public int getUploadCount() {
        return 0;
    }
}
