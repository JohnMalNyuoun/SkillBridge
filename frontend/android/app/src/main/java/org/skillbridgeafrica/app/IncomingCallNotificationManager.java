package org.skillbridgeafrica.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.app.Person;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Locale;
import java.util.Map;
import java.util.TimeZone;

public final class IncomingCallNotificationManager {
    static final String EXTRA_CALL_ACTION = "skillbridge.call_action";
    static final String EXTRA_CALL_SESSION_ID = "skillbridge.call_session_id";
    static final String EXTRA_NOTIFICATION_ID = "skillbridge.notification_id";
    static final String ACTION_ANSWER = "org.skillbridgeafrica.app.CALL_ANSWER";
    static final String ACTION_DECLINE = "org.skillbridgeafrica.app.CALL_DECLINE";
    static final String CHANNEL_ID = "skillbridge_incoming_calls";
    private static final String CHANNEL_NAME = "Incoming calls";

    private IncomingCallNotificationManager() {}

    static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) return;

        AudioAttributes audioAttributes = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            CHANNEL_NAME,
            NotificationManager.IMPORTANCE_HIGH
        );
        Uri ringtone = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
        if (ringtone == null) {
            ringtone = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        }
        channel.setDescription("Alerts for incoming SkillBridge calls");
        channel.setSound(ringtone, audioAttributes);
        channel.enableVibration(true);
        channel.setVibrationPattern(new long[] { 0, 500, 250, 500 });
        channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PRIVATE);
        manager.createNotificationChannel(channel);
    }

    static void show(Context context, Map<String, String> data) {
        String callSessionId = data.get("callSessionId");
        String notificationId = data.get("notificationId");
        if (callSessionId == null || notificationId == null) return;

        String expiresAt = data.get("expiresAt");
        long remainingMs = parseRemainingMs(expiresAt);
        if (remainingMs <= 0) return;

        ensureChannel(context);
        String callerName = valueOrDefault(data.get("callerName"), "SkillBridge member");
        String courseTitle = valueOrDefault(data.get("courseTitle"), "Course group");
        boolean video = "video".equals(data.get("callType"));
        String title = "Incoming " + (video ? "video" : "audio") + " call";
        String text = callerName + " is calling in " + courseTitle + ".";
        int notificationNumber = notificationNumber(notificationId);

        PendingIntent answerIntent = actionIntent(
            context,
            ACTION_ANSWER,
            "answer",
            callSessionId,
            notificationId
        );
        PendingIntent declineIntent = actionIntent(
            context,
            ACTION_DECLINE,
            "decline",
            callSessionId,
            notificationId
        );
        Intent contentIntent = new Intent(context, MainActivity.class);
        contentIntent.setAction(ACTION_ANSWER);
        contentIntent.setPackage(context.getPackageName());
        contentIntent.putExtra(EXTRA_CALL_ACTION, "answer");
        contentIntent.putExtra(EXTRA_CALL_SESSION_ID, callSessionId);
        contentIntent.putExtra(EXTRA_NOTIFICATION_ID, notificationId);
        contentIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openIntent = PendingIntent.getActivity(
            context,
            pendingIntentNumber(notificationId, "open"),
            contentIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_skillbridge_call)
            .setContentTitle(title)
            .setContentText(text)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setOngoing(true)
            .setAutoCancel(false)
            .setOnlyAlertOnce(true)
            .setContentIntent(openIntent)
            .setTimeoutAfter(remainingMs);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Person caller = new Person.Builder()
                .setName(callerName)
                .setImportant(true)
                .build();
            builder.setStyle(NotificationCompat.CallStyle.forIncomingCall(
                caller,
                declineIntent,
                answerIntent
            ).setIsVideo(video));
        } else {
            builder.addAction(
                android.R.drawable.sym_call_outgoing,
                "Answer",
                answerIntent
            );
            builder.addAction(
                android.R.drawable.ic_menu_close_clear_cancel,
                "Decline",
                declineIntent
            );
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                builder.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE));
                builder.setVibrate(new long[] { 0, 500, 250, 500 });
            }
        }

        try {
            NotificationManagerCompat.from(context).notify(notificationNumber, builder.build());
        } catch (SecurityException exception) {
            android.util.Log.w("SkillBridgeCalls", "Notification permission is unavailable.");
        }
    }

    static void dismiss(Context context, String notificationId) {
        if (notificationId == null) return;
        NotificationManagerCompat.from(context).cancel(notificationNumber(notificationId));
    }

    private static PendingIntent actionIntent(
        Context context,
        String intentAction,
        String action,
        String callSessionId,
        String notificationId
    ) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction(intentAction);
        intent.setPackage(context.getPackageName());
        intent.putExtra(EXTRA_CALL_ACTION, action);
        intent.putExtra(EXTRA_CALL_SESSION_ID, callSessionId);
        intent.putExtra(EXTRA_NOTIFICATION_ID, notificationId);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(
            context,
            pendingIntentNumber(notificationId, action),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private static long parseRemainingMs(String expiresAt) {
        if (expiresAt == null) return 0;
        try {
            SimpleDateFormat format = new SimpleDateFormat(
                "yyyy-MM-dd'T'HH:mm:ss.SSSX",
                Locale.US
            );
            format.setTimeZone(TimeZone.getTimeZone("UTC"));
            long expiry = format.parse(expiresAt).getTime();
            return Math.max(0, expiry - System.currentTimeMillis());
        } catch (ParseException | NullPointerException exception) {
            return 0;
        }
    }

    private static String valueOrDefault(String value, String fallback) {
        return value == null || value.trim().isEmpty() ? fallback : value;
    }

    private static int notificationNumber(String notificationId) {
        int value = notificationId.hashCode() & 0x7fffffff;
        return value == 0 ? 1 : value;
    }

    private static int pendingIntentNumber(String notificationId, String action) {
        return notificationNumber(notificationId) * 31 + action.hashCode();
    }
}
