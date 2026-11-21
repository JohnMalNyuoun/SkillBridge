package org.skillbridgeafrica.app;

import android.Manifest;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import androidx.appcompat.app.AlertDialog;
import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.firebase.messaging.FirebaseMessaging;

import org.json.JSONException;
import org.json.JSONObject;

import java.lang.ref.WeakReference;

@CapacitorPlugin(
    name = "IncomingCall",
    permissions = {
        @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
    }
)
public class IncomingCallPlugin extends Plugin {
    private static final String PREFERENCES = "skillbridge_incoming_calls";
    private static final String PENDING_ACTION_KEY = "pending_call_action";
    private static final String PERMISSION_PROMPTED_KEY = "notification_permission_prompted";
    private static WeakReference<IncomingCallPlugin> pluginReference = new WeakReference<>(null);

    @Override
    public void load() {
        pluginReference = new WeakReference<>(this);
        cacheCallAction(getActivity().getIntent());
    }

    @PluginMethod
    public void getToken(PluginCall call) {
        FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
            if (!task.isSuccessful() || task.getResult() == null) {
                call.reject("Android push token is unavailable.", "FCM_TOKEN_UNAVAILABLE");
                return;
            }
            JSObject result = new JSObject();
            result.put("token", task.getResult());
            call.resolve(result);
        });
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        IncomingCallNotificationManager.ensureChannel(getContext());
        if (
            Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU
            || NotificationManagerCompat.from(getContext()).areNotificationsEnabled()
        ) {
            resolvePermission(call);
            return;
        }
        if (getPermissionState("notifications") == PermissionState.GRANTED) {
            resolvePermission(call);
            return;
        }

        SharedPreferences preferences = getContext().getSharedPreferences(
            PREFERENCES,
            android.content.Context.MODE_PRIVATE
        );
        if (preferences.getBoolean(PERMISSION_PROMPTED_KEY, false)) {
            resolvePermission(call);
            return;
        }

        new AlertDialog.Builder(getActivity())
            .setTitle("Incoming call alerts")
            .setMessage("Allow notifications so SkillBridge can alert you about incoming calls while the app is in the background.")
            .setNegativeButton("Not now", (dialog, which) -> {
                preferences.edit().putBoolean(PERMISSION_PROMPTED_KEY, true).apply();
                resolvePermission(call);
            })
            .setPositiveButton("Continue", (dialog, which) -> {
                preferences.edit().putBoolean(PERMISSION_PROMPTED_KEY, true).apply();
                requestPermissionForAlias(
                    "notifications",
                    call,
                    "notificationPermissionCallback"
                );
            })
            .setOnCancelListener(dialog -> {
                preferences.edit().putBoolean(PERMISSION_PROMPTED_KEY, true).apply();
                resolvePermission(call);
            })
            .show();
    }

    @PermissionCallback
    private void notificationPermissionCallback(PluginCall call) {
        resolvePermission(call);
    }

    @PluginMethod
    public void getPendingCallAction(PluginCall call) {
        SharedPreferences preferences = getContext().getSharedPreferences(
            PREFERENCES,
            android.content.Context.MODE_PRIVATE
        );
        String pending = preferences.getString(PENDING_ACTION_KEY, null);
        if (pending == null) {
            cacheCallAction(getActivity().getIntent());
            pending = preferences.getString(PENDING_ACTION_KEY, null);
        }
        if (pending == null) {
            call.resolve(new JSObject());
            return;
        }

        preferences.edit().remove(PENDING_ACTION_KEY).apply();
        removeCallActionExtras(getActivity().getIntent());
        try {
            JSONObject action = new JSONObject(pending);
            JSObject result = new JSObject();
            result.put("action", action.getString("action"));
            result.put("callSessionId", action.getString("callSessionId"));
            result.put("notificationId", action.getString("notificationId"));
            call.resolve(result);
        } catch (JSONException exception) {
            call.reject("The pending call action could not be read.", "INVALID_CALL_ACTION");
        }
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        cacheCallAction(intent);
        super.handleOnNewIntent(intent);
        if (hasCallAction(intent)) {
            notifyListeners("callActionAvailable", new JSObject(), true);
        }
    }

    static void notifyTokenRefresh(String token) {
        IncomingCallPlugin plugin = pluginReference.get();
        if (plugin == null) return;
        android.os.Handler handler = new android.os.Handler(
            android.os.Looper.getMainLooper()
        );
        handler.post(() -> {
            JSObject data = new JSObject();
            data.put("token", token);
            plugin.notifyListeners("tokenRefresh", data, true);
        });
    }

    private void resolvePermission(PluginCall call) {
        JSObject result = new JSObject();
        result.put(
            "granted",
            NotificationManagerCompat.from(getContext()).areNotificationsEnabled()
        );
        call.resolve(result);
    }

    private void cacheCallAction(Intent intent) {
        if (!hasCallAction(intent)) return;
        String action = intent.getStringExtra(IncomingCallNotificationManager.EXTRA_CALL_ACTION);
        String callSessionId = intent.getStringExtra(
            IncomingCallNotificationManager.EXTRA_CALL_SESSION_ID
        );
        String notificationId = intent.getStringExtra(
            IncomingCallNotificationManager.EXTRA_NOTIFICATION_ID
        );
        if (
            !("answer".equals(action) || "decline".equals(action))
            || callSessionId == null
            || notificationId == null
        ) return;

        JSONObject data = new JSONObject();
        try {
            data.put("action", action);
            data.put("callSessionId", callSessionId);
            data.put("notificationId", notificationId);
        } catch (JSONException exception) {
            return;
        }
        getContext().getSharedPreferences(PREFERENCES, android.content.Context.MODE_PRIVATE)
            .edit()
            .putString(PENDING_ACTION_KEY, data.toString())
            .apply();
        IncomingCallNotificationManager.dismiss(getContext(), notificationId);
    }

    private boolean hasCallAction(Intent intent) {
        return intent != null
            && intent.hasExtra(IncomingCallNotificationManager.EXTRA_CALL_ACTION)
            && intent.hasExtra(IncomingCallNotificationManager.EXTRA_CALL_SESSION_ID);
    }

    private void removeCallActionExtras(Intent intent) {
        if (intent == null) return;
        intent.removeExtra(IncomingCallNotificationManager.EXTRA_CALL_ACTION);
        intent.removeExtra(IncomingCallNotificationManager.EXTRA_CALL_SESSION_ID);
        intent.removeExtra(IncomingCallNotificationManager.EXTRA_NOTIFICATION_ID);
    }
}
