const db = require("../database");
const bcrypt = require("bcryptjs");
const { generateToken, decodeToken } = require("../utils");
const nodemailer = require("nodemailer");
const { v4 } = require("uuid");
const nodemailerConfig = require("../nodeMaller");

const transporter = nodemailer.createTransport(nodemailerConfig);

const authController = {
	login: async (req, res) => {
		try {
			const { email, password } = req.body;
			const user = await db.query(
				`SELECT * FROM "user" WHERE email = $1`,
				[email]
			);

			if (user.rows.length === 0) {
				return res
					.status(400)
					.json({ message: "Пользователь не найден" });
			}
			if (!user.rows[0].is_confirmed) {
				return res.status(400).json({
					message:
						"Аккаунт не подтвержден. Проверьте вашу почту для подтверждения регистрации",
				});
			}
			const checkPass = await bcrypt.compare(
				password,
				user.rows[0].password
			);
			if (!checkPass) {
				return res.status(400).json({ message: "Неверный пароль" });
			}

			const token = generateToken({
				id: user.rows[0].id,
				email: user.rows[0].email,
			});
			res.json({ token, message: "Вы успешно авторизовались" });
		} catch (error) {
			res.status(500).json({ error: "Ошибка авторизации" });
		}
	},
	register: async (req, res) => {
		try {
			const { email, password } = req.body;
			const existingUser = await db.query(
				`SELECT * FROM "user" WHERE email = $1`,
				[email]
			);

			if (existingUser && existingUser.rows.length > 0) {
				if (!existingUser.rows[0].is_confirmed) {
					return res
						.status(400)
						.json({ message: "Подтвердите почту" });
				}

				return res
					.status(400)
					.json({ message: "Этот пользователь уже зарегистрирован" });
			}

			const hash = await bcrypt.hash(password, 10);
			const confirmToken = v4().split("-")[0]; 

			await db.query(
				`INSERT INTO "user" (email, password, is_confirmed, confirm_token) VALUES ($1, $2, $3, $4) RETURNING id, email`,
				[email, hash, 0, confirmToken]
			);

			const mailBody = `
				<div>
					<h1 style='color: #6f4ff2'>WEBI Marketplace</h1>
					<h2>
						Ваш <i style='color: #6f4ff2'>код</i> для подтверждения почты:</h2>
					<br/> 
					<h3>
						<b style='color: #6f4ff2' class='token'>${confirmToken}</b>
					</h3>
				</div>
			`;

			const mailOptions = {
				from: "Webi",
				to: email,
				html: mailBody,
				subject: "Подтверждение почты",
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
		} catch (error) {
			console.error("Ошибка регистрации:", error);
			res.status(500).json({ error: "Ошибка регистрации" });
		}
	},
	confirmEmail: async (req, res) => {
		try {
			const { confirmToken } = req.body;

			const user = await db.query(
				`SELECT * FROM "user" WHERE confirm_token = $1`,
				[confirmToken]
			);

			if (!user.rows.length) {
				return res
					.status(400)
					.json({ message: "Неверный код подтверждения" });
			}

			const [{ email, id }] = user.rows;

			const token = await generateToken({ id, email });

			await db.query(
				`UPDATE "user" SET is_confirmed = true WHERE confirm_token = $1`,
				[confirmToken]
			);

			res.json({ message: "Почта подтверждена", token });
		} catch (error) {
			console.error("Ошибка подтверждения:", error);
			res.status(500).json({ error: "Ошибка подтверждения" });
		}
	},
	sendResetCode: async (req, res) => {
		const { email } = req.body;

		const user = await db.query(`SELECT * FROM "user" WHERE email = $1`, [
			email,
		]);

		if (!user.rows.length) {
			return res.status(400).json({ message: "Пользователь не найден" });
		}

		const [{ confirm_token }] = user.rows;

		const confirmSlicedToken = confirm_token.slice(0, -2) + "rp";

		const mailBody = `
				<div>
					<h1 style='color: #6f4ff2'>WEBI Marketplace</h1>
					<h2>
						Ваш <i style='color: #6f4ff2'>код</i> для восстановления пароля:</h2>
					<br/>
					<h3>
						<b style='color: #6f4ff2' class='token'>${confirmSlicedToken}</b>
					</h3>
				</div>
			`;

		const mailOptions = {
			from: "Webi",
			to: email,
			html: mailBody,
			subject: "Восстановление пароля",
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
						"Код для восстановление пароля отправлен на вашу почту",
				});
			}
		});

		res.json({ message: "Код подтверждения отправлен на почту" });
	},
	resetPassword: async (req, res) => {
		try {
			const { email, password, confirmToken } = req.body;

			const user = await db.query(
				`SELECT * FROM "user" WHERE email = $1`,
				[email]
			);

			if (!user.rows.length) {
				return res
					.status(400)
					.json({ message: "Пользователь не найден" });
			}

			const [{ id }] = user.rows;
			const token = generateToken({ email, id });
			const hash = await bcrypt.hash(password, 10);

			await db.query(
				`UPDATE "user" SET password = $1 WHERE email = $2 AND confirm_token = $3 RETURNING email`,
				[hash, email, confirmToken.slice(0, -2) + "rp"]
			);

			res.json({ token, message: "Пароль успешно изменен" });
		} catch (error) {
			console.error("Ошибка регистрации:", error);
			res.status(500).json({ error: "Ошибка регистрации" });
		}
	},
	supportRequest: async (req, res) => {
		try {
			const { email, body, name } = req.body;
			const mailBody = `
			<div>
				<h1 style='color: #6f4ff2'>WEBI Marketplace</h1>
		
				<h2>Name: <span style='color: #6f4ff2'>${name}</span></h2>
				<h2>Email: <span style='color: #6f4ff2'>${email}</span></h2>
				<h2>Body: <span style='color: #6f4ff2'>${body}</span></h2>
			</div>
		`;

			const mailOptions = {
				from: "Webi",
				to: "webisupagency@gmail.com",
				html: mailBody,
				subject: "Обращение в поддержку",
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
							"Код для восстановление пароля отправлен на вашу почту",
					});
				}
			});

			res.json({ message: "Обращение успешно отправлено" });
		} catch (error) {
			console.error("Ошибка регистрации:", error);
			res.status(500).json({ error: "Ошибка регистрации" });
		}
	},
};

module.exports = authController;
