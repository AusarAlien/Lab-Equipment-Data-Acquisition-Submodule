package szapp.inst.data;

import java.io.StringReader;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

import com.alibaba.fastjson.JSONObject;
import net.sf.hibernate.Session;
import org.apache.log4j.Logger;

import szapp.domain.ServiceLocator;
import szapp.util.CommonHiis;
import szapp.web.ctl.UpLoadFiles;

/** Registered-client published HTTP-policy pull endpoint: POST /GetClientConfig.m. */
public class GetClientConfig extends UpLoadFiles {
    private static final Logger log = Logger.getLogger(GetClientConfig.class.getName());

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
            String currentVersion = ClientApiSupport.optional(request.json, "current_policy_ver", 40);
            String currentHash = ClientApiSupport.optional(request.json, "current_policy_hash", 64);

            Policy policy = findPolicy(session, client);
            if (policy == null) {
                touchPullTime(session, client);
                session.connection().commit();
                outParams.put("result", "success"); outParams.put("code", "OK");
                outParams.put("changed", Boolean.FALSE); outParams.put("policy_status", "NONE");
                outParams.put("server_time", Long.valueOf(System.currentTimeMillis() / 1000L));
                return SUCCESS;
            }

            boolean changed = !policy.version.equals(currentVersion) || !policy.hash.equalsIgnoreCase(currentHash);
            touchPullTime(session, client);
            if (changed) writePullLog(session, client, policy);
            session.connection().commit();

            outParams.put("result", "success"); outParams.put("code", "OK");
            outParams.put("changed", Boolean.valueOf(changed));
            outParams.put("policy_status", "PUBLISHED");
            // 平台展示名称仅作为响应元数据，不进入客户端配置内容及配置摘要。
            outParams.put("policy_name", policy.name);
            outParams.put("policy_ver", policy.version); outParams.put("policy_hash", policy.hash);
            if (changed) outParams.put("config", JSONObject.parseObject(policy.json));
            outParams.put("server_time", Long.valueOf(System.currentTimeMillis() / 1000L));
            return SUCCESS;
        } catch (ClientApiSupport.ApiException e) {
            session.connection().rollback(); fail(e.code, e.getMessage()); return ERROR;
        } catch (Exception e) {
            session.connection().rollback(); log.error("GetClientConfig failed", e);
            fail("SERVER_ERROR", "采集策略读取失败"); return ERROR;
        } finally { ServiceLocator.closeSession(); }
    }

    private Policy findPolicy(Session session, ClientApiSupport.ClientIdentity client) throws Exception {
        String sql = "select fguid,client_id,instno,policy_name,config_ver,interface_type,file_path,scan_interval,"
            + "service_url,start_row,samp_col_flag,track_mode,allowed_extensions,max_companion_files,"
            + "heartbeat_interval,archive_mode,data_mode,output_dir,file_name_template "
            + "from htlis.lis_client_policy where client_id=? and instno=? and fhiino=? and policy_status='PUBLISHED'";
        PreparedStatement ps = null; ResultSet rs = null;
        try {
            ps = session.connection().prepareStatement(sql);
            ps.setString(1, client.clientId); ps.setString(2, client.instno); ps.setLong(3, client.fhiino);
            rs = ps.executeQuery();
            if (!rs.next()) return null;
            Policy p = new Policy(); p.guid = rs.getString("fguid");
            p.name = ClientApiSupport.trim(rs.getString("policy_name"));
            p.version = ClientApiSupport.trim(rs.getString("config_ver"));
            p.json = ClientApiSupport.policyJson(rs); p.hash = ClientApiSupport.sha256Hex(p.json);
            if (rs.next()) throw new ClientApiSupport.ApiException("POLICY_NOT_UNIQUE", "客户端存在多条已发布策略");
            return p;
        } finally { ClientApiSupport.close(rs); ClientApiSupport.close(ps); }
    }

    private void touchPullTime(Session session, ClientApiSupport.ClientIdentity client) throws Exception {
        PreparedStatement ps = null;
        try {
            ps = session.connection().prepareStatement(
                "update htlis.lis_client_info set flastconfigdt=sysdate,fempid=?,fopdt=sysdate where client_id=? and fhiino=?");
            ps.setString(1, client.clientId); ps.setString(2, client.clientId); ps.setLong(3, client.fhiino);
            ps.executeUpdate();
        } finally { ClientApiSupport.close(ps); }
    }

    private void writePullLog(Session session, ClientApiSupport.ClientIdentity client, Policy policy) throws Exception {
        String sql = "insert into htlis.lis_client_policy_log "
            + "(fguid,policy_guid,client_id,config_ver,policy_name,action_type,foperatortype,before_json,after_json,"
            + "result_status,result_message,change_summary,operation_source,fempid,fopdt,fhiino) "
            + "values (?,?,?,?,?,'CLIENT_PULL','CLIENT',null,?,'SUCCESS','客户端已获取发布策略','客户端下载策略',"
            + "'GetClientConfig',?,sysdate,?)";
        PreparedStatement ps = null;
        try {
            ps = session.connection().prepareStatement(sql); int i = 1;
            ps.setString(i++, ClientApiSupport.uuid()); ps.setString(i++, policy.guid);
            ps.setString(i++, client.clientId); ps.setString(i++, policy.version); ps.setString(i++, policy.name);
            ps.setCharacterStream(i++, new StringReader(policy.json), policy.json.length());
            ps.setString(i++, client.clientId); ps.setLong(i++, client.fhiino); ps.executeUpdate();
        } finally { ClientApiSupport.close(ps); }
    }

    private void fail(String code, String message) {
        outParams.put("result", "error"); outParams.put("code", code); outParams.put("message", message);
    }

    private static final class Policy { String guid; String name; String version; String json; String hash; }

    @Override
    public int getUploadCount() { return 0; }
}
