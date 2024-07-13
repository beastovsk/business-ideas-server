const db = require("../database");
const nodemailer = require("nodemailer");
const { decodeToken } = require("../utils");
const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: "webisupagency@gmail.com",
		pass: "izjn njvi cxap muvc",
	},
});

const orderController = {
	createOrder: async (req, res) => {
		try {
			const { serviceId } = req.body;
			const [_, token] = await req.headers.authorization.split(" ");
			const { email, id } = await decodeToken({ token });
			const service = await db.query(
				`SELECT * FROM "service" WHERE id = $1`,
				[serviceId]
			);

			if (!service.rows.length) {
				return res.status(400).json({ message: "Невалидный сервис" });
			}
			const { owner_id: sellerId } = service.rows[0];
			const user = await db.query(
				`SELECT * FROM "user" WHERE email = $1`,
				[email]
			);
			if (!user.rows.length) {
				return res.status(400).json({ message: "Невалидный токен" });
			}
			if (sellerId === id) {
				return res.status(400).json({
					message:
						"Вы не можете создать заказ на свой собственный сервис",
				});
			}
			const newOrder = await db.query(
				`INSERT INTO "order" (seller_id, service_id, buyer_id, status) VALUES ($1, $2, $3, 'await_payment') RETURNING id`,
				[sellerId, serviceId, id]
			);
			global.io.emit("create_order", {
				orderId: newOrder.rows[0].id,
				sellerId,
			});

			res.json({
				message: "Заказ успешно создан",
				orderId: newOrder.rows[0].id,
			});
		} catch (error) {
			console.error("Error:", error);
			res.status(500).json({ error: "Ошибка сервера" });
		}
	},
	updateOrder: async (req, res) => {
		try {
			const { orderId, status, repository_link } = req.body;
			const [_, token] = await req.headers.authorization.split(" ");
			const { email, id } = await decodeToken({ token });
			const order = await db.query(
				`SELECT * FROM "order" WHERE id = $1`,
				[orderId]
			);

			if (!order.rows.length) {
				return res
					.status(400)
					.json({ message: "Такого ордера не существует" });
			}
			const user = await db.query(
				`SELECT * FROM "user" WHERE email = $1`,
				[email]
			);
			if (!user.rows.length) {
				return res.status(400).json({ message: "Невалидный токен" });
			}

			await db.query(
				`UPDATE "order" SET status = $1, repository_link = $2`,
				[status, repository_link]
			);
			global.io.emit("update_order", { orderId, status });
			res.json({
				message: "Отправлено",
			});
		} catch (error) {
			console.error("Error:", error);
			res.status(500).json({ error: "Ошибка сервера" });
		}
	},
	closeOrder: async (req, res) => {
		try {
			const { orderId } = req.body;
			const [_, token] = await req.headers.authorization.split(" ");
			const { email, id } = await decodeToken({ token });
			const user = await db.query(
				`SELECT * FROM "user" WHERE email = $1`,
				[email]
			);
			if (!user.rows.length) {
				return res.status(400).json({ message: "Невалидный токен" });
			}
			const order = await db.query(
				'SELECT * FROM "order" WHERE id = $1',
				[orderId]
			);

			if (!order.rows.length) {
				return res.status(400).json({ message: "Невалидный ордер" });
			}

			const [{ buyer_id, seller_id }] = order.rows;

			if (id === buyer_id || id === seller_id) {
				global.io.emit("update_order", { orderId, status: "cancel" });

				await db.query(
					`UPDATE "order" SET status = 'cancel' WHERE id = $1`,
					[orderId]
				);
				return res.json({ message: "Заказ отменен" });
			}

			res.status(400).json({
				buyer_id,
				id,
				seller_id,
				message: "Нет прав на закрытие заказа",
			});
		} catch (error) {
			console.error("Error:", error);
			res.status(500).json({ error: "Ошибка сервера" });
		}
	},
	getOrderById: async (req, res) => {
		try {
			const { orderId } = req.query;
			const [_, token] = await req.headers.authorization.split(" ");
			const { email, id } = await decodeToken({ token });
			const user = await db.query(
				`SELECT * FROM "user" WHERE email = $1`,
				[email]
			);
			if (!user.rows.length) {
				return res.status(400).json({ message: "Невалидный токен" });
			}
			const order = await db.query(
				'SELECT * FROM "order" WHERE id = $1',
				[orderId]
			);

			if (!order.rows.length) {
				return res.status(400).json({ message: "Невалидный ордер" });
			}

			const [{ buyer_id, seller_id }] = order.rows;

			if (buyer_id === id || seller_id === id) {
				return res.json({ order: order.rows[0] });
			}

			return res
				.status(400)
				.json({ message: "Нет прав на получение заказа" });
		} catch (error) {
			console.error("Error:", error);
			res.status(500).json({ error: "Ошибка сервера" });
		}
	},
	getOrders: async (req, res) => {
		try {
			const [_, token] = await req.headers.authorization.split(" ");
			const { email, id } = await decodeToken({ token });
			const user = await db.query(
				`SELECT * FROM "user" WHERE email = $1`,
				[email]
			);
			if (!user.rows.length) {
				return res.status(400).json({ message: "Невалидный токен" });
			}

			const orders = await db.query(
				'SELECT * FROM "order" WHERE seller_id = $1 OR buyer_id = $1',
				[id]
			);

			if (!orders.rows.length) {
				return res.json({ orders: [] });
			}

			res.json({ orders: orders.rows });
		} catch (error) {
			console.error("Error:", error);
			res.status(500).json({ error: "Ошибка сервера" });
		}
	},
	resendOrderDetails: async (req, res) => {
		try {
			const { orderId, repository_link } = req.body;
			const [_, token] = await req.headers.authorization.split(" ");
			const { email, id } = await decodeToken({ token });
			const order = await db.query(
				`SELECT * FROM "order" WHERE id = $1`,
				[orderId]
			);

			if (!order.rows.length) {
				return res
					.status(400)
					.json({ message: "Такого ордера не существует" });
			}
			const [{ buyer_id }] = order.rows;
			const user = await db.query(
				`SELECT * FROM "user" WHERE email = $1`,
				[email]
			);
			if (!user.rows.length) {
				return res.status(400).json({ message: "Невалидный токен" });
			}
			const buyer = await db.query(`SELECT * FROM "user" WHERE id = $1`, [
				buyer_id,
			]);
			const [{ email: buyer_email }] = buyer.rows;
			const mailBody = `
                <div>
                    <h1 style='color: #6f4ff2'>WEBI Marketplace</h1>
            
                    <h2>Репозиторий с сервисом: <span style='color: #6f4ff2'>${repository_link}</span></h2>

                    <p>При проверке - обратите внимание на структуру репозитория</p>
                    <p>По ссылке должно находиться:</p>
                    <ul>
                        <li>Фронтенд</li>
                        <li>Бекенд</li>
                        <li>sql-файл</li>
                        <li>.readme файл</li>
                    </ul>

                    <p>После проверки не забудьте подтвердить получение, если все соответствует действительности или обратитесь в тех. поддержку</p>
                </div>`;

			const mailOptions = {
				from: "Webi",
				to: buyer_email,
				html: mailBody,
				subject: "Получение файлов",
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
			res.json({ message: "Успешно отправлено" });
		} catch (error) {
			console.error("Error:", error);
			res.status(500).json({ error: "Ошибка сервера" });
		}
	},
};

module.exports = orderController;
