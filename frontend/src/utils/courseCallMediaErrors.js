export const getCourseCallMediaErrorMessage = (errorName, callMode) => {
  const requiredDevices = callMode === 'video' ? 'microphone or camera' : 'microphone';

  switch (errorName) {
    case 'NotFoundError':
      return callMode === 'video'
        ? 'A required microphone or camera could not be found. Check your devices or try joining with audio.'
        : 'No microphone was found. Connect a microphone or check your device settings.';
    case 'NotAllowedError':
      return `Access to the ${requiredDevices} was denied. Allow access in your browser or Android settings, then try again.`;
    case 'NotReadableError':
      return `The ${requiredDevices} is unavailable or being used by another app. Close other apps using it and try again.`;
    case 'OverconstrainedError':
      return `This device cannot meet the requested ${callMode === 'video' ? 'audio and video' : 'audio'} settings. Try another call mode or device.`;
    case 'SecurityError':
      return 'Media access is blocked in this context. Open SkillBridge using a secure connection and try again.';
    default:
      return `Unable to access the ${requiredDevices}. Check your permissions and device availability, then try again.`;
  }
};
