import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { io } from 'socket.io-client';
import { getUnreadCount } from '../services/notificationService';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import { SOCKET_URL } from '../utils/constants';
import { isNativeAndroid } from '../services/nativeAuthSession';
import { NativeIncomingCall } from '../services/nativeIncomingCall';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
	const { user, token } = useAuth();
	const [unreadCount, setUnreadCount] = useState(0);
	const [callInvitation, setCallInvitation] = useState(null);
	const [groupChatMessageAlert, setGroupChatMessageAlert] = useState(null);
	const [nativeCallAction, setNativeCallAction] = useState(null);

	const fetchUnreadCount = useCallback(async () => {
		if (!user) return;
		try {
			if (user.role === 'youth') {
				const res = await getUnreadCount();
				setUnreadCount(res.data.count);
				return;
			}

			if (user.role === 'admin') {
				const res = await api.get('/admin/courses/stats');
				setUnreadCount(res?.data?.data?.pendingOrganisations || 0);
				return;
			}

			setUnreadCount(0);
		} catch (err) {
			console.error(err);
		}
	}, [user]);

	useEffect(() => {
		fetchUnreadCount();

		// Poll every 30 seconds
		const interval = setInterval(fetchUnreadCount, 30000);
		return () => clearInterval(interval);
	}, [fetchUnreadCount]);

	useEffect(() => {
		if (!['youth', 'organisation', 'org_admin', 'staff', 'trainee'].includes(user?.role) || !token) {
			return undefined;
		}

		const socket = io(SOCKET_URL, {
			auth: { token },
			withCredentials: true
		});
		socket.on('course-call:invitation', (invitation) => {
			setCallInvitation((current) => (
				current?.callSessionId === invitation.callSessionId
					? current
					: { ...invitation, recipientUserId: user.id }
			));
			void fetchUnreadCount();
		});
		socket.on('course-call:ended', ({ callSessionId }) => {
			setCallInvitation((current) => (
				current?.callSessionId === callSessionId ? null : current
			));
		});
		socket.on('course-call:invitation-cancelled', ({ callSessionId }) => {
			setCallInvitation((current) => (
				current?.callSessionId === callSessionId ? null : current
			));
		});
		socket.on('notification:new', () => {
			void fetchUnreadCount();
		});
		socket.on('group-chat:message-alert', (alert) => {
			setGroupChatMessageAlert({ ...alert, recipientUserId: user.id });
			void fetchUnreadCount();
		});

		return () => socket.disconnect();
	}, [fetchUnreadCount, token, user?.id, user?.role]);

	useEffect(() => {
		const userId = user?.id;
		const notificationsEnabled = user?.notificationsEnabled;
		if (!isNativeAndroid() || !userId || !token) return undefined;
		let active = true;
		let actionListener;
		let tokenListener;

		const registerToken = async (pushToken) => {
			if (
				!active
				|| notificationsEnabled === false
				|| typeof pushToken !== 'string'
				|| pushToken.length < 20
			) return;
			try {
				await api.post('/push-tokens', { token: pushToken });
			} catch (err) {
				console.warn(
					'Unable to register Android call notifications:',
					err.response?.status || err.message
				);
			}
		};

		const consumePendingAction = async () => {
			try {
				const result = await NativeIncomingCall.getPendingCallAction();
				if (active && result?.action && result?.callSessionId) {
					setNativeCallAction({ ...result, recipientUserId: userId });
					return true;
				}
			} catch (err) {
				console.warn('Unable to read a pending Android call action:', err.message);
			}
			return false;
		};

		const initializePush = async () => {
			try {
				actionListener = await NativeIncomingCall.addListener(
					'callActionAvailable',
					() => { void consumePendingAction(); }
				);
				if (!active) {
					actionListener.remove();
					return;
				}
				tokenListener = await NativeIncomingCall.addListener(
					'tokenRefresh',
					({ token: pushToken }) => { void registerToken(pushToken); }
				);
				if (!active) {
					tokenListener.remove();
					return;
				}
				const hasPendingAction = await consumePendingAction();
				if (hasPendingAction) return;
				if (!active || notificationsEnabled === false) return;

				const permission = await NativeIncomingCall.requestNotificationPermission();
				if (!active || permission?.granted !== true) return;
				const result = await NativeIncomingCall.getToken();
				await registerToken(result?.token);
			} catch (err) {
				console.warn(
					'Android call notifications are unavailable:',
					err.message
				);
			}
		};

		void initializePush();
		return () => {
			active = false;
			actionListener?.remove();
			tokenListener?.remove();
		};
	}, [token, user?.id, user?.notificationsEnabled]);

	const clearCallInvitation = useCallback(() => setCallInvitation(null), []);
	const clearNativeCallAction = useCallback(() => setNativeCallAction(null), []);
	const resetUnreadCount = () => setUnreadCount(0);
	const clearGroupChatMessageAlert = () => setGroupChatMessageAlert(null);

	return (
		<NotificationContext.Provider
			value={{
				unreadCount,
				fetchUnreadCount,
				resetUnreadCount,
				callInvitation: callInvitation?.recipientUserId === user?.id
					? callInvitation
					: null,
				clearCallInvitation,
				nativeCallAction: nativeCallAction?.recipientUserId === user?.id
					? nativeCallAction
					: null,
				clearNativeCallAction,
				groupChatMessageAlert: groupChatMessageAlert?.recipientUserId === user?.id
					? groupChatMessageAlert
					: null,
				clearGroupChatMessageAlert
			}}
		>
			{children}
		</NotificationContext.Provider>
	);
};

export const useNotifications = () => useContext(NotificationContext);
