const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: "webisupagency@gmail.com",
		pass: "izjn njvi cxap muvc",
	},
});

const agencyController = {
	sendContact: async (req, res) => {
		const { contactForm, orderForm } = req.body;

		try {
			const mailBody = `
				<div>
					<h1 style='color: #6f4ff2'>WEBI Agency</h1>
					
					<h3>
						<b style='color: #6f4ff2'>${JSON.stringify(contactForm)}</b>
					</h3>
                    <h3>
                    <b style='color: #6f4ff2'>${JSON.stringify(orderForm)}</b>
                </h3>
				</div>
			`;

			const mailOptions = {
				from: "Webi",
				to: "webisupagency@gmail.com",
				html: mailBody,
				subject: "Новая заявка",
			};

			transporter.sendMail(mailOptions, (error, info) => {
				if (error) {
					console.error("Ошибка отправки электронной почты:", error);
					res.status(500).json({
						error: "Ошибка отправки электронной почты",
					});
				} else {
					res.json({
						message:
							"Подтверждение регистрации отправлено на вашу почту",
					});
				}
			});

			return res.json({
				message:
					"Заявка успешно создана. Ожидайте сообщения в телеграм",
			});
		} catch (error) {
			console.error("Ошибка регистрации:", error);
			res.status(500).json({ error: "Ошибка регистрации" });
		}
	},
};

module.exports = agencyController;
