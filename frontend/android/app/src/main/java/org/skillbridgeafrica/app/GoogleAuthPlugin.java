package org.skillbridgeafrica.app;

import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.NoCredentialException;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

@CapacitorPlugin(name = "GoogleAuth")
public class GoogleAuthPlugin extends Plugin {
    @PluginMethod
    public void signIn(PluginCall call) {
        String serverClientId = call.getString("serverClientId");
        if (serverClientId == null || serverClientId.trim().isEmpty()) {
            call.reject("Google server client ID is not configured", "CONFIGURATION");
            return;
        }

        GetSignInWithGoogleOption googleOption =
            new GetSignInWithGoogleOption.Builder(serverClientId).build();
        GetCredentialRequest request = new GetCredentialRequest.Builder()
            .addCredentialOption(googleOption)
            .build();
        CredentialManager credentialManager = CredentialManager.create(getContext());

        credentialManager.getCredentialAsync(
            getActivity(),
            request,
            null,
            getActivity().getMainExecutor(),
            new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                @Override
                public void onResult(GetCredentialResponse result) {
                    handleCredential(call, result.getCredential());
                }

                @Override
                public void onError(GetCredentialException exception) {
                    if (exception instanceof GetCredentialCancellationException) {
                        call.reject("Google sign-in was cancelled", "CANCELLED");
                    } else if (exception instanceof NoCredentialException) {
                        call.reject(
                            "No Google account is available on this device. Add a Google account and try again.",
                            "NO_CREDENTIAL"
                        );
                    } else {
                        call.reject("Google sign-in could not be completed", "GOOGLE_AUTH_FAILED");
                    }
                }
            }
        );
    }

    private void handleCredential(PluginCall call, Credential credential) {
        String credentialType = credential.getType();
        if (!(credential instanceof CustomCredential)
            || (!GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(credentialType)
                && !GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_SIWG_CREDENTIAL.equals(credentialType))) {
            call.reject("Google returned an unsupported credential", "UNSUPPORTED_CREDENTIAL");
            return;
        }

        try {
            GoogleIdTokenCredential googleCredential =
                GoogleIdTokenCredential.createFrom(credential.getData());
            JSObject result = new JSObject();
            result.put("idToken", googleCredential.getIdToken());
            call.resolve(result);
        } catch (IllegalArgumentException exception) {
            call.reject("Google returned an invalid ID token response", "INVALID_GOOGLE_RESPONSE");
        }
    }
}
