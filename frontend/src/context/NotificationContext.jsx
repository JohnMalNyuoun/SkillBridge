import { createContext, useState, useEffect, useContext } from 'react';
import { getUnreadCount } from '../services/notificationService';
import api from '../services/api';
import useAuth from '../hooks/useAuth';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
	const { user } = useAuth();
	const [unreadCount, setUnreadCount] = useState(0);

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

	const resetUnreadCount = () => setUnreadCount(0);

	return (
		<NotificationContext.Provider
			value={{ unreadCount, fetchUnreadCount, resetUnreadCount }}
		>
			{children}
		</NotificationContext.Provider>
	);
};

export const useNotifications = () => useContext(NotificationContext);
