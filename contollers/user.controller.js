const sql = require("../database");
const bcrypt = require("bcryptjs");
const { generateToken, decodeToken } = require("../utils");
const { v4: uuidv4 } = require("uuid");

const userController = {
	getUser: async (req, res) => {
		try {
			const [_, token] = req.headers.authorization.split(" ");
			const { email } = decodeToken({ token });
			const result =
				await sql`SELECT * FROM "users" WHERE email = ${email}`;
			if (result.length === 0) {
				return res
					.status(200)
					.json({ message: "Пользователь не найден" });
			}

			const { password, is_confirmed, confirm_token, ...user } =
				result[0];

			res.json({ user });
		} catch (error) {
			console.log(error);
			res.status(200).json({ user: null });
		}
	},
	changeEmail: async (req, res) => {
		try {
			const { currentEmail, newEmail, password } = req.body;
			const [_, token] = req.headers.authorization.split(" ");
			const { email: decodedEmail } = decodeToken({ token });

			if (decodedEmail !== currentEmail) {
				return res
					.status(200)
					.json({ message: "Некорректная текущая почта" });
			}

			const result =
				await sql`SELECT * FROM "users" WHERE email = ${decodedEmail}`;

			if (result.length === 0) {
				return res
					.status(200)
					.json({ message: "Пользователь не найден" });
			}

			const user = result[0];

			const checkPass = await bcrypt.compare(password, user.password);
			if (!checkPass) {
				return res.status(200).json({ message: "Некорректный пароль" });
			}

			await sql`UPDATE "users" SET email = ${newEmail} WHERE email = ${currentEmail}`;

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
			const { email } = decodeToken({ token });

			const result =
				await sql`SELECT * FROM "users" WHERE email = ${email}`;

			if (result.length === 0) {
				return res
					.status(200)
					.json({ message: "Пользователь не найден" });
			}

			const user = result[0];

			const checkPass = await bcrypt.compare(
				currentPassword,
				user.password
			);
			if (!checkPass) {
				return res.status(200).json({ message: "Некорректный пароль" });
			}

			const hashedPassword = await bcrypt.hash(password, 10);

			await sql`UPDATE "users" SET password = ${hashedPassword} WHERE email = ${email}`;

			res.json({
				message: "Пароль успешно изменен",
			});
		} catch (error) {
			res.status(500).json({ error: "Ошибка сервера" });
		}
	},
	createTransaction: async (req, res) => {
		try {
			const { paymentMethod, fullName, amount, phoneNumber } = req.body;
			const [_, token] = req.headers.authorization.split(" ");
			const { email } = decodeToken({ token });

			const userResult =
				await sql`SELECT * FROM "users" WHERE email = ${email}`;
			if (userResult.length === 0) {
				return res.status(200).json({ message: "Невалидный токен" });
			}

			// Check if promo code is valid
			if (paymentMethod === "card") {
				const authString = `${process.env.YOOKASSA_SHOP_ID}:${process.env.YOOKASSA_API_KEY}`;

				const url = "https://api.yookassa.ru/v3/payments";
				const headers = new Headers({
					Authorization: `Basic ${Buffer.from(authString).toString(
						"base64"
					)}`,
					"Idempotence-Key": uuidv4(), // Генерируем уникальный ключ идемпотентности
					"Content-Type": "application/json",
				});

				return await fetch(url, {
					method: "POST",
					headers,
					body: JSON.stringify({
						amount: {
							currency: "RUB",
							value: amount,
						},
						capture: true,
						confirmation: {
							type: "redirect",
							return_url:
								"https://startup-idea.ru/home?paymentStatus=success",
						},
						description: `Пополнение счёта на: ${amount} RUB`,
						receipt: {
							customer: { fullName, phoneNumber, email },
							items: [
								{
									description: `Транзакция на "${amount}"`,
									quantity: "1.00",
									amount: {
										currency: "RUB",
										value: amount,
									},
									vat_code: "2",
									payment_mode: "full_prepayment",
									payment_subject: "commodity",
								},
							],
						},
					}),
				})
					.then(async (response) => {
						const data = await response.json();
						if (data.status === "error") {
							return Promise.reject("Auth error");
						}
						return data;
					})
					.then((data) => {
						res.json(data);
					})
					.catch((error) => {
						res.json({
							error,
						});
					});
			}

			res.json({ message: "Произошла ошибка при оплате" });
		} catch (error) {
			res.status(500).json({ error: "Ошибка сервера" });
		}
	},
	confirmTransaction: async (req, res) => {
		try {
			const { uuid, paymentMethod, amount } = req.body;
			const [_, token] = req.headers.authorization.split(" ");
			const { email } = decodeToken({ token });

			const userResult =
				await sql`SELECT * FROM "users" WHERE email = ${email}`;
			if (userResult.length === 0) {
				return res.status(200).json({ message: "Невалидный токен" });
			}
			const user = userResult[0];

			const balance = Number(user.balance) + Number(amount);

			const updateSubscriptionAndPartnerIncome = async (status) => {
				const date = new Date().toISOString();

				if (status === "succeeded") {
					await sql`UPDATE "users" SET "balance" = ${balance} WHERE email = ${email}`;
					await sql`INSERT INTO "operations" (userid, type, date, status, amount) VALUES (${user.id}, 'Пополнение баланса', ${date}, 'Успешно', ${amount})`;
				}
				return res.json({ status, message: "Баланс успешно пополнен" });
			};

			if (paymentMethod === "card") {
				const authString = `${process.env.YOOKASSA_SHOP_ID}:${process.env.YOOKASSA_API_KEY}`;
				const url = `https://api.yookassa.ru/v3/payments/${uuid}`;
				const headers = {
					Authorization: `Basic ${Buffer.from(authString).toString(
						"base64"
					)}`,
					"Idempotence-Key": uuidv4(), // Генерируем уникальный ключ идемпотентности
					"Content-Type": "application/json",
				};
				return await fetch(url, {
					method: "GET",
					headers,
				})
					.then(async (response) => {
						const data = await response.json();
						return data;
					})
					.then(async (data) => {
						if (!data.paid) return res.json({ paid: data.paid });
						if (data.paid) {
							return await updateSubscriptionAndPartnerIncome(
								data.status
							);
						}
					})
					.catch((error) => {
						return res.json({ error });
					});
			}
			res.json({ message: "Произошла ошибка при оплате" });
		} catch (error) {
			res.status(500).json({ error: "Ошибка сервера" });
		}
	},
};

module.exports = userController;
