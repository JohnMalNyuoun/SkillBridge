package org.skillbridgeafrica.app;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

public class IncomingCallMessagingService extends FirebaseMessagingService {
    @Override
    public void onMessageReceived(RemoteMessage message) {
        Map<String, String> data = message.getData();
        String type = data.get("type");
        if ("call_cancelled".equals(type)) {
            IncomingCallNotificationManager.dismiss(
                this,
                data.get("notificationId")
            );
            return;
        }
        if ("incoming_call".equals(type)) {
            IncomingCallNotificationManager.show(this, data);
        }
    }

    @Override
    public void onNewToken(String token) {
        IncomingCallPlugin.notifyTokenRefresh(token);
    }
}
