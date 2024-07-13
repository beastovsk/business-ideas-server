const db = require("../database");
const { decodeToken } = require("../utils");

const serviceController = {
	createService: async (req, res) => {
		try {
			const {
				title,
				price,
				images,
				videoLink,
				description,
				previewLink,
				telegram,
			} = req.body;
			const [_, token] = await req.headers.authorization.split(" ");
			const { email, id } = await decodeToken({ token });
			const user = await db.query(
				`SELECT * FROM "user" WHERE email = $1`,
				[email]
			);

			if (!user.rows.length) {
				return res.status(400).json({ message: "Невалидный токен" });
			}

			const newService = await db.query(
				`INSERT INTO "service" (owner_id, title, price, images, video_link, description, preview_link, telegram, is_highlighted, is_premium, is_visible) 
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING title`,
				[
					id,
					title,
					price,
					images,
					videoLink,
					description,
					previewLink,
					telegram,
					false,
					false,
					false,
				]
			);

			res.json({
				message: "Сервис успешно создан",
				service: newService.rows[0].title,
			});
		} catch (error) {
			console.log(error);
			res.status(500).json({ error: "Ошибка сервера" });
		}
	},

	removeService: async (req, res) => {
		try {
			const { serviceId } = req.body;
			const [_, token] = req.headers.authorization.split(" ");
			const { email } = decodeToken({ token });

			const user = await db.query(
				`SELECT * FROM "user" WHERE email = $1`,
				[email]
			);

			if (!user.rows.length) {
				return res.status(400).json({ message: "Невалидный токен" });
			}

			const deletedService = await db.query(
				`DELETE FROM "service" WHERE id = $1 RETURNING title`,
				[serviceId]
			);

			if (!deletedService.rows.length) {
				return res
					.status(400)
					.json({ message: "Данный сервис не существует" });
			}

			res.json({
				message: "Сервис успешно удален",
				service: deletedService.rows[0].title,
			});
		} catch (error) {
			res.status(500).json({ error: "Ошибка сервера" });
		}
	},

	updateService: async (req, res) => {
		try {
			const {
				title,
				price,
				images,
				videoLink,
				description,
				previewLink,
				telegram,
				isHighlighted,
				isPremium,
				isVisible,
			} = req.body;
			const [_, token] = req.headers.authorization.split(" ");
			const { email, id } = decodeToken({ token });

			const user = await db.query(
				`SELECT * FROM "user" WHERE email = $1`,
				[email]
			);

			if (!user.rows.length) {
				return res.status(400).json({ message: "Невалидный токен" });
			}

			const updatedService = await db.query(
				`UPDATE "service"
				 SET title = $2, price = $3, images = $4, video_link = $5, description = $6, preview_link = $7, telegram = $8
				 WHERE owner_id = $1 RETURNING title`,
				[
					id,
					title,
					price,
					images,
					videoLink,
					description,
					previewLink,
					telegram,
				]
			);

			if (!updatedService.rows.length) {
				return res
					.status(400)
					.json({ message: "Данный сервис не существует" });
			}

			res.json({
				message: "Сервис успешно изменен",
				service: updatedService.rows[0].title,
			});
		} catch (error) {
			res.status(500).json({ error: "Ошибка сервера" });
		}
	},

	getServiceById: async (req, res) => {
		try {
			const { serviceId } = req.query;

			const service = await db.query(
				`SELECT * FROM "service" WHERE id = $1`,
				[serviceId]
			);

			if (!service.rows.length) {
				return res
					.status(400)
					.json({ message: "Данный сервис не существует" });
			}

			return res.json({ service: service.rows[0] });
		} catch (error) {
			res.status(500).json({ error: "Ошибка сервера" });
		}
	},

	getServices: async (req, res) => {
		try {
			const { name, priceFrom, priceTo } = req.query;

			let query = `SELECT * FROM "service" WHERE 1 = 1`;

			if (name) {
				query += ` AND "title" ILIKE '%${name}%'`;
			}
			if (priceFrom && priceTo) {
				query += ` AND "price" BETWEEN ${priceFrom} AND ${priceTo}`;
			} else if (priceFrom) {
				query += ` AND "price" >= ${priceFrom}`;
			} else if (priceTo) {
				query += ` AND "price" <= ${priceTo}`;
			}

			const services = await db.query(query);

			res.json({ services: services.rows });
		} catch (error) {
			console.error("Error:", error);
			res.status(500).json({ error: "Ошибка сервера" });
		}
	},

	getPersonalServices: async (req, res) => {
		try {
			const [_, token] = req.headers.authorization.split(" ");
			const { email, id } = decodeToken({ token });

			const user = await db.query(
				`SELECT * FROM "user" WHERE email = $1`,
				[email]
			);

			if (!user.rows.length) {
				return res.status(400).json({ message: "Невалидный токен" });
			}

			const services = await db.query(
				`SELECT * FROM "service" WHERE owner_id = $1`,
				[id]
			);

			res.status(200).json({ services: services.rows });
		} catch (error) {
			console.error("Error:", error);
			res.status(500).json({ error: "Ошибка сервера" });
		}
	},
};

module.exports = serviceController;
