package szapp.inst.data;

import java.sql.PreparedStatement;
import java.sql.ResultSet;

import net.sf.hibernate.Session;
import org.apache.log4j.Logger;

import szapp.domain.ServiceLocator;
import szapp.util.CommonHiis;
import szapp.web.ctl.UpLoadFiles;

/** Authenticated client heartbeat endpoint: POST /UploadClientLog.m. */
public class UploadClientLog extends UpLoadFiles {
    private static final Logger log = Logger.getLogger(UploadClientLog.class.getName());

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
            ClientApiSupport.ClientIdentity client = ClientApiSupport.authenticate(session, commonFields, request);
            ClientApiSupport.verifyHttpMode(request.json);

            String status = ClientApiSupport.required(request.json, "status", 20).toUpperCase();
            if (!("RUNNING".equals(status) || "STOPPED".equals(status) || "ERROR".equals(status))) {
                throw new ClientApiSupport.ApiException("STATUS_INVALID", "status 仅允许 RUNNING、STOPPED、ERROR");
            }
            String mode = ClientApiSupport.optional(request.json, "mode", 30);
            if (ClientApiSupport.isBlank(mode)) mode = "http";
            String clientType = ClientApiSupport.optional(request.json, "client_type", 20);
            String clientVer = ClientApiSupport.required(request.json, "client_ver", 40);
            String os = ClientApiSupport.optional(request.json, "os", 200);
            long heartbeatSeq = ClientApiSupport.nonNegativeLong(request.json, "heartbeat_seq");
            long uploadTotal = ClientApiSupport.nonNegativeLong(request.json, "upload_total");
            long uploadFail = ClientApiSupport.nonNegativeLong(request.json, "upload_fail");
            long uptimeSec = ClientApiSupport.nonNegativeLong(request.json, "uptime_sec");

            updateClient(session, client, clientType, clientVer, status, mode, uploadTotal, uploadFail, uptimeSec, os);
            boolean inserted = insertHeartbeat(session, client, clientVer, heartbeatSeq, status, mode,
                    uploadTotal, uploadFail, uptimeSec, ClientApiSupport.optional(request.json, "error_msg", 2000));
            String publishedVersion = findPublishedVersion(session, client);
            session.connection().commit();

            outParams.put("result", "success");
            outParams.put("code", "OK");
            outParams.put("server_time", Long.valueOf(System.currentTimeMillis() / 1000L));
            outParams.put("heartbeat_created", Boolean.valueOf(inserted));
            outParams.put("config_version", publishedVersion);
            outParams.put("config_changed", Boolean.valueOf(!ClientApiSupport.isBlank(publishedVersion)
                    && !publishedVersion.equals(client.appliedVersion)));
            return SUCCESS;
        } catch (ClientApiSupport.ApiException e) {
            session.connection().rollback();
            fail(e.code, e.getMessage());
            return ERROR;
        } catch (Exception e) {
            session.connection().rollback();
            log.error("UploadClientLog failed", e);
            fail("SERVER_ERROR", "心跳处理失败");
            return ERROR;
        } finally {
            ServiceLocator.closeSession();
        }
    }

    private void updateClient(Session session, ClientApiSupport.ClientIdentity client, String clientType,
            String clientVer, String status, String mode, long uploadTotal, long uploadFail,
            long uptimeSec, String os) throws Exception {
        String sql = "update htlis.lis_client_info set client_type=?,client_ver=?,last_heartbeat=sysdate,"
            + "current_status=?,running_mode=?,upload_total=?,upload_fail=?,uptime_sec=?,os_info=?,"
            + "fempid=?,fopdt=sysdate where client_id=? and fhiino=? and fenable='是'";
        PreparedStatement ps = null;
        try {
            ps = session.connection().prepareStatement(sql);
            ps.setString(1, ClientApiSupport.nullIfBlank(clientType));
            ps.setString(2, clientVer);
            ps.setString(3, status);
            ps.setString(4, mode.toLowerCase());
            ps.setLong(5, uploadTotal);
            ps.setLong(6, uploadFail);
            ps.setLong(7, uptimeSec);
            ps.setString(8, ClientApiSupport.nullIfBlank(os));
            ps.setString(9, client.clientId);
            ps.setString(10, client.clientId);
            ps.setLong(11, client.fhiino);
            if (ps.executeUpdate() != 1) throw new ClientApiSupport.ApiException("CLIENT_UPDATE_FAILED", "客户端状态更新失败");
        } finally { ClientApiSupport.close(ps); }
    }

    private boolean insertHeartbeat(Session session, ClientApiSupport.ClientIdentity client, String clientVer,
            long heartbeatSeq, String status, String mode, long uploadTotal, long uploadFail,
            long uptimeSec, String errorMsg) throws Exception {
        String sql = "insert into htlis.lis_heartbeat_log "
            + "(seq_id,fguid,client_id,heartbeat_seq,heartbeat_time,status,running_mode,upload_total,upload_fail,"
            + "uptime_sec,error_msg,fempid,fopdt,fhiino,instno,client_ver) "
            + "select htlis.seq_heartbeat_log.nextval,?,?,?,?,?,?,?,?,?,?,?,?,?,?,? from dual "
            + "where not exists (select 1 from htlis.lis_heartbeat_log where client_id=? and heartbeat_seq=?)";
        PreparedStatement ps = null;
        try {
            ps = session.connection().prepareStatement(sql);
            int i = 1;
            ps.setString(i++, ClientApiSupport.uuid());
            ps.setString(i++, client.clientId);
            ps.setLong(i++, heartbeatSeq);
            ps.setTimestamp(i++, new java.sql.Timestamp(System.currentTimeMillis()));
            ps.setString(i++, status);
            ps.setString(i++, mode.toLowerCase());
            ps.setLong(i++, uploadTotal);
            ps.setLong(i++, uploadFail);
            ps.setLong(i++, uptimeSec);
            ps.setString(i++, ClientApiSupport.nullIfBlank(errorMsg));
            ps.setString(i++, client.clientId);
            ps.setTimestamp(i++, new java.sql.Timestamp(System.currentTimeMillis()));
            ps.setLong(i++, client.fhiino);
            ps.setString(i++, client.instno);
            ps.setString(i++, clientVer);
            ps.setString(i++, client.clientId);
            ps.setLong(i++, heartbeatSeq);
            return ps.executeUpdate() == 1;
        } finally { ClientApiSupport.close(ps); }
    }

    private String findPublishedVersion(Session session, ClientApiSupport.ClientIdentity client) throws Exception {
        PreparedStatement ps = null;
        ResultSet rs = null;
        try {
            ps = session.connection().prepareStatement(
                "select config_ver from htlis.lis_client_policy where client_id=? and fhiino=? and policy_status='PUBLISHED'");
            ps.setString(1, client.clientId);
            ps.setLong(2, client.fhiino);
            rs = ps.executeQuery();
            return rs.next() ? ClientApiSupport.trim(rs.getString(1)) : "";
        } finally { ClientApiSupport.close(rs); ClientApiSupport.close(ps); }
    }

    private void fail(String code, String message) {
        outParams.put("result", "error");
        outParams.put("code", code);
        outParams.put("message", message);
    }

    @Override
    public int getUploadCount() { return 0; }
}
