package szapp.inst.data;

import java.io.StringReader;
import java.sql.PreparedStatement;
import java.sql.Types;

import net.sf.hibernate.Session;
import org.apache.log4j.Logger;

import szapp.domain.ServiceLocator;
import szapp.util.CommonHiis;
import szapp.web.ctl.UpLoadFiles;

/** Authenticated acquisition event endpoint: POST /UploadClientEvent.m. */
public class UploadClientEvent extends UpLoadFiles {
    private static final Logger log = Logger.getLogger(UploadClientEvent.class.getName());

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

            String eventId = ClientApiSupport.required(request.json, "event_id", 60);
            String logType = ClientApiSupport.required(request.json, "log_type", 40).toUpperCase();
            requireOneOf(logType, "CLIENT_START", "CLIENT_STOP", "FILE_FOUND", "UPLOAD_SUCCESS", "UPLOAD_FAIL",
                    "CONFIG_PULL", "CONFIG_APPLY_SUCCESS", "CONFIG_APPLY_FAIL");
            String level = ClientApiSupport.required(request.json, "log_level", 20).toUpperCase();
            requireOneOf(level, "INFO", "WARN", "ERROR");
            String resultStatus = ClientApiSupport.required(request.json, "result_status", 20).toUpperCase();
            requireOneOf(resultStatus, "SUCCESS", "FAILED", "INFO");

            boolean created = insertEvent(session, client, request, eventId, logType, level, resultStatus);
            session.connection().commit();
            outParams.put("result", "success");
            outParams.put("code", "OK");
            outParams.put("event_id", eventId);
            outParams.put("created", Boolean.valueOf(created));
            outParams.put("server_time", Long.valueOf(System.currentTimeMillis() / 1000L));
            return SUCCESS;
        } catch (ClientApiSupport.ApiException e) {
            session.connection().rollback();
            fail(e.code, e.getMessage());
            return ERROR;
        } catch (Exception e) {
            session.connection().rollback();
            log.error("UploadClientEvent failed", e);
            fail("SERVER_ERROR", "客户端事件处理失败");
            return ERROR;
        } finally {
            ServiceLocator.closeSession();
        }
    }

    private boolean insertEvent(Session session, ClientApiSupport.ClientIdentity client,
            ClientApiSupport.RequestData request, String eventId, String logType,
            String level, String resultStatus) throws Exception {
        String rawDetail = ClientApiSupport.optional(request.json, "raw_detail", 2000000);
        String sql = "insert into htlis.lis_acquisition_log "
                + "(seq_id,fguid,client_id,log_time,log_level,log_type,instno,file_name,file_size,message,raw_detail,"
                + "fempid,fopdt,fhiino,fdiseq,result_status,http_status,duration_ms,retry_count,error_code,request_guid) "
                + "select htlis.seq_acq_log.nextval,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,? from dual "
                + "where not exists (select 1 from htlis.lis_acquisition_log where fguid=? or (client_id=? and request_guid=?))";
        PreparedStatement ps = null;
        try {
            ps = session.connection().prepareStatement(sql);
            int i = 1;
            ps.setString(i++, eventId);
            ps.setString(i++, client.clientId);
            ps.setTimestamp(i++, ClientApiSupport.eventTime(request.json, "event_time"));
            ps.setString(i++, level);
            ps.setString(i++, logType);
            ps.setString(i++, client.instno);
            ps.setString(i++, ClientApiSupport.nullIfBlank(ClientApiSupport.optional(request.json, "file_name", 500)));
            setNullableLong(ps, i++, ClientApiSupport.nullableLong(request.json, "file_size"));
            ps.setString(i++, ClientApiSupport.nullIfBlank(ClientApiSupport.optional(request.json, "message", 2000)));
            if (ClientApiSupport.isBlank(rawDetail))
                ps.setNull(i++, Types.CLOB);
            else
                ps.setCharacterStream(i++, new StringReader(rawDetail), rawDetail.length());
            ps.setString(i++, client.clientId);
            ps.setTimestamp(i++, new java.sql.Timestamp(System.currentTimeMillis()));
            ps.setLong(i++, client.fhiino);
            setNullableLong(ps, i++, ClientApiSupport.nullableLong(request.json, "fdiseq"));
            ps.setString(i++, resultStatus);
            setNullableLong(ps, i++, ClientApiSupport.nullableLong(request.json, "http_status"));
            setNullableLong(ps, i++, ClientApiSupport.nullableLong(request.json, "duration_ms"));
            ps.setLong(i++, ClientApiSupport.nonNegativeLong(request.json, "retry_count"));
            ps.setString(i++, ClientApiSupport.nullIfBlank(ClientApiSupport.optional(request.json, "error_code", 100)));
            String requestGuid = ClientApiSupport.optional(request.json, "request_guid", 100);
            if (ClientApiSupport.isBlank(requestGuid))
                requestGuid = eventId;
            ps.setString(i++, requestGuid);
            ps.setString(i++, eventId);
            ps.setString(i++, client.clientId);
            ps.setString(i++, requestGuid);
            return ps.executeUpdate() == 1;
        } finally {
            ClientApiSupport.close(ps);
        }
    }

    private static void setNullableLong(PreparedStatement ps, int index, Long value) throws Exception {
        if (value == null)
            ps.setNull(index, Types.NUMERIC);
        else
            ps.setLong(index, value.longValue());
    }

    private static void requireOneOf(String value, String... allowed) throws ClientApiSupport.ApiException {
        for (int i = 0; i < allowed.length; i++)
            if (allowed[i].equals(value))
                return;
        throw new ClientApiSupport.ApiException("FIELD_INVALID", value + " 不在允许值范围内");
    }

    private void fail(String code, String message) {
        outParams.put("result", "error");
        outParams.put("code", code);
        outParams.put("message", message);
    }

    @Override
    public int getUploadCount() {
        return 0;
    }
}
