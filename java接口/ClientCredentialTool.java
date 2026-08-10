package szapp.inst.data;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Locale;
import java.util.UUID;

/** Offline provisioning helper. It never connects to the database. */
public final class ClientCredentialTool {
    private ClientCredentialTool() {}

    public static void main(String[] args) throws Exception {
        String master = System.getProperty("syssjcj.client.masterKey");
        if (ClientApiSupport.isBlank(master)) master = System.getenv("SYSSJCJ_CLIENT_MASTER_KEY");
        if (ClientApiSupport.isBlank(master)) {
            System.err.println("Please set SYSSJCJ_CLIENT_MASTER_KEY or -Dsyssjcj.client.masterKey");
            System.exit(2);
        }
        String clientId = args.length > 0 ? args[0].trim() : "";
        if (clientId.length() == 0) {
            System.err.println("Usage: ClientCredentialTool <client_id>");
            System.exit(2);
        }
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        String secret = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        String keyId = "K_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase(Locale.ENGLISH);
        String encrypted = ClientApiSupport.encryptSecret(secret, master);
        System.out.println("CLIENT_ID=" + clientId);
        System.out.println("AUTH_KEY_ID=" + keyId);
        System.out.println("CLIENT_SECRET=" + secret);
        System.out.println("FAUTHSECRETENC=" + encrypted);
        System.out.println("Warning: CLIENT_SECRET is shown once; store it in the client config and do not write it to logs.");
    }
}
