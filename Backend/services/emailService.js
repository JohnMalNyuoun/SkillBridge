const { Resend } = require('resend');

const hasEmailConfig = () => {
	return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
};

const sendEmail = async ({ to, subject, html, text }) => {
	if (!hasEmailConfig()) {
		throw new Error('Email service is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.');
	}

	const resend = new Resend(process.env.RESEND_API_KEY);
	const { error } = await resend.emails.send({
		from: process.env.RESEND_FROM_EMAIL,
		to,
		subject,
		html,
		text
	});

	if (error) throw new Error(`Resend email delivery failed: ${error.message}`);
	return { sent: true };
};

module.exports = {
	sendEmail,
	hasEmailConfig
};
