const db = require("../database");
const bcrypt = require("bcryptjs");
const { generateToken, decodeToken } = require("../utils");

const userController = {
	getUser: async (req, res) => {
		try {
			// Get token, sliced "Bearer" label
			const [_, token] = req.headers.authorization.split(" ");
			const { email } = decodeToken({ token });

			const result = await db.query(
				`SELECT * FROM "user" WHERE email = $1`,
				[email]
			);

			if (result.rows.length === 0) {
				return res
					.status(400)
					.json({ message: "Пользователь не найден" });
			}

			const { password, is_confirmed, confirm_token, ...user } =
				result.rows[0];

			res.json({ user });
		} catch (error) {
			res.status(500).json({ error: "Ошибка авторизации" });
		}
	},
	changeEmail: async (req, res) => {
		try {
			const { currentEmail, newEmail, password } = req.body;
			const [_, token] = req.headers.authorization.split(" ");
			const { email: decodedEmail } = decodeToken({ token });

			if (decodedEmail !== currentEmail) {
				return res
					.status(400)
					.json({ message: "Некорректная текущая почта" });
			}

			const result = await db.query(
				`SELECT * FROM "user" WHERE email = $1`,
				[decodedEmail]
			);

			if (result.rows.length === 0) {
				return res
					.status(400)
					.json({ message: "Пользователь не найден" });
			}

			const [user] = result.rows;

			bcrypt.compare(
				password,
				user.password,
				(err, isSamePasswords, next) => {
					if (!isSamePasswords) {
						return res
							.status(400)
							.json({ message: "Некорректный пароль" });
					}
				}
			);

			db.query(`UPDATE "user" SET email = $1 WHERE email = $2`, [
				newEmail,
				currentEmail,
			]);

			const updatedToken = generateToken({
				id: user.id,
				email: newEmail,
			});

			res.json({
				token: updatedToken,
				message: "Почта успешно изменена",
			});
		} catch (error) {
			res.status(500).json({ error: "Ошибка сервера" });
		}
	},
	changePassword: async (req, res) => {
		try {
			const { currentPassword, password } = req.body;
			const [_, token] = req.headers.authorization.split(" ");
			const { email, id } = decodeToken({ token });

			const result = await db.query(
				`SELECT * FROM "user" WHERE email = $1`,
				[email]
			);

			if (result.rows.length === 0) {
				return res
					.status(400)
					.json({ message: "Пользователь не найден" });
			}

			const [user] = result.rows;

			bcrypt.compare(
				currentPassword,
				user.password,
				(err, isSamePasswords) => {
					if (!isSamePasswords) {
						return res
							.status(400)
							.json({ message: "Некорректный пароль" });
					}
				}
			);

			const hashedPassword = bcrypt.hash(password, 10);

			await db.query(`UPDATE "user" SET password = $1 WHERE email = $2`, [
				hashedPassword,
				email,
			]);

			res.json({
				message: "Пароль успешно изменен",
			});
		} catch (error) {
			res.status(500).json({ error: "Ошибка сервера" });
		}
	},
	updateSubscription: async (req, res) => {
		try {
			res.json({
				message: "Подписка успешно оформлена",
			});
		} catch (error) {
			res.status(500).json({ error: "Ошибка сервера" });
		}
	},
	removeSubscription: async (req, res) => {
		try {
			res.json({
				message: "Подписка успешно отменена",
			});
		} catch (error) {
			res.status(500).json({ error: "Ошибка сервера" });
		}
	},
};

module.exports = userController;
