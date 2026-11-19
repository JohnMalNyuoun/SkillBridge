import { createContext, useState, useEffect, useContext } from 'react';
import { io } from 'socket.io-client';
import { getUnreadCount } from '../services/notificationService';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import { SOCKET_URL } from '../utils/constants';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
	const { user, token } = useAuth();
	const [unreadCount, setUnreadCount] = useState(0);
	const [callInvitation, setCallInvitation] = useState(null);
	const [groupChatMessageAlert, setGroupChatMessageAlert] = useState(null);

	const fetchUnreadCount = async () => {
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
	};

	useEffect(() => {
		fetchUnreadCount();

		// Poll every 30 seconds
		const interval = setInterval(fetchUnreadCount, 30000);
		return () => clearInterval(interval);
	}, [user]);

	useEffect(() => {
		if (user?.role !== 'youth' || !token) return undefined;

		const socket = io(SOCKET_URL, {
			auth: { token },
			withCredentials: true
		});
		socket.on('course-call:invitation', (invitation) => {
			setCallInvitation({ ...invitation, recipientUserId: user.id });
			void fetchUnreadCount();
		});
		socket.on('notification:new', () => {
			void fetchUnreadCount();
		});
		socket.on('group-chat:message-alert', (alert) => {
			setGroupChatMessageAlert({ ...alert, recipientUserId: user.id });
			void fetchUnreadCount();
		});

		return () => socket.disconnect();
	}, [token, user?.id, user?.role]);

	const resetUnreadCount = () => setUnreadCount(0);
	const clearCallInvitation = () => setCallInvitation(null);
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
