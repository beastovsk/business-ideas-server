const sql = require("../database");
const OpenAI = require("openai");
const { decodeToken } = require("../utils");

const openai = new OpenAI({
	apiKey: process.env.OPENAI_SECRET_KEY,
});

const productController = {
	generateProduct: async (req, res) => {
		try {
			const [_, token] = req.headers.authorization.split(" ");
			const { id: userId } = decodeToken({ token });
			const {
				niche,
				otherNiche,
				budgetFrom,
				budgetTo,
				targetAudience,
				profession,
				productType,
				market,
				implementationTime,
				comments,
			} = productDetails;

			const messages = [
				{
					role: "system",
					content:
						"Ты бизнес-аналитик, который генерирует информацию о продукте на основе введенных пользователем данных",
				},
				{
					role: "user",
					content: `Сгенерируй продукт для бизнеса на русском языке для российского рынка в валидном JSON формате. 
                        Пользователь ввел:
                        niche: ${niche},
                        otherNiche (если не пусто, то это конкретная ниша): ${otherNiche},
                        budgetFrom: ${budgetFrom},
                        budgetTo: ${budgetTo},
                        targetAudience: ${targetAudience},
                        profession (если не пусто, то пользователь видит это как ЦА): ${profession},
                        productType: ${productType},
                        market: ${market},
                        implementationTime: ${implementationTime},
                        comments (если не пусто, то обязательны для генерации): ${comments},

                        На основе этих данных, выдай мне следущие пункты:
                        1. Название продукта
                        2. Описание продукта
                        3. Основные характеристики и преимущества
                        4. Целевую аудиторию
                        5. Анализ рынка
                        6. Конкурентные преимущества
                        7. Предполагаемый бюджет и сроки
                        8. Возможные проблемы и пути их решения
                        9. Дополнительные рекомендации
                        10. Уникальное предложение продукта

                        В следущем формате:
                        {
                            productName: '',
                            productDescription: '',
                            features: [],
                            benefits: [],
                            targetAudience: '',
                            marketAnalysis: '',
                            competitiveAdvantage: '',
                            estimatedBudget: '',
                            potentialChallenges: '',
                            additionalRecommendations: '',
                            uniqueOffer: ''
                        }

                        Отвечай развернуто, особенно для списком (массивов). Учитай данные пользователей и их предпочтения
                        `,
				},
			];

			const response = await openai.chat.completions.create({
				model: "gpt-3.5-turbo",
				messages: messages,
				max_tokens: 2048,
				temperature: 0.7,
			});

			const content = response.choices[0].message.content;
			const res = JSON.parse(content);
			const tokens = response.usage.total_tokens;
			const cost_per_token_rub = 1 / 1000; // 1 рубль за 1000 токенов
			const amount = tokens * cost_per_token_rub;
			const date = new Date().toISOString(); // Получаем текущую дату в формате YYYY-MM-DD
			const info = { req: { ...req.body }, res: content };
			const result = await sql`
                INSERT INTO "product" (
                    title,
                    description,
                    date,
                    amount,
                    info,
                    favourite,
                    status,
                    label,
                    priority,
                    userId
                ) VALUES (
                    ${res.productName},
                    ${res.productDescription},
                    ${date},
                    ${amount},
                    ${JSON.stringify(info)},
                    ${"false"},
                    ${"created"},
                    ${niche},
                    ${"low"},
                    ${userId}
                ) RETURNING *;
            `;

			res.json({
				message: "Продукт успешно сгенерирован",
				product: result[0],
			});
		} catch (error) {
			console.log(error);
			res.status(500).json({ error: "Server error" });
		}
	},
	getAllProducts: async (req, res) => {
		try {
			const [_, token] = req.headers.authorization.split(" ");
			const { id } = decodeToken({ token });
			const { isLatest } = req.query;

			let result;
			if (isLatest) {
				// Получение последних 5 продуктов для конкретного пользователя
				result = await sql`
                    SELECT id, title, description, date, amount
                    FROM "product"
                    WHERE userId = ${id}
                    ORDER BY date DESC
                    LIMIT 5
                `;
			} else {
				// Получение всех продуктов для конкретного пользователя
				result = await sql`
                    SELECT id, title, description, date, amount
                    FROM "product"
                    WHERE userId = ${id}
                `;
			}

			if (result.length === 0) {
				return res
					.status(200)
					.json({ products: [], message: "No products found" });
			}

			res.json({ products: result });
		} catch (error) {
			console.log(error);
			res.status(200).json({ products: null });
		}
	},
	getProductById: async (req, res) => {
		try {
			const [_, token] = req.headers.authorization.split(" ");
			const { id: userId } = decodeToken({ token });
			const { id } = req.params;

			const result = await sql`
                SELECT id, title, description, date, amount
                FROM "product"
                WHERE id = ${id} AND userid = ${userId}
            `;

			if (result.length === 0) {
				return res.status(200).json({ message: "Product not found" });
			}

			res.json({ product: result[0] });
		} catch (error) {
			console.log(error);
			res.status(200).json({ product: null });
		}
	},
	deleteProductById: async (req, res) => {
		try {
			const [_, token] = req.headers.authorization.split(" ");
			const { id: userId } = decodeToken({ token });
			const { id } = req.params;

			const product = await sql`
                SELECT id
                FROM "product"
                WHERE id = ${id} AND userId = ${userId}
            `;

			if (product.length === 0) {
				return res.status(200).json({
					message:
						"Product not found or you don't have permission to delete it",
				});
			}

			await sql`
                DELETE FROM "product"
                WHERE id = ${id}
            `;

			res.json({ message: "Product deleted successfully" });
		} catch (error) {
			console.log(error);
			res.status(200).json({ product: null });
		}
	},
	updateProduct: async (req, res) => {
		try {
			const {
				id,
				title,
				description,
				date,
				amount,
				info,
				favourite,
				status,
				label,
				priority,
			} = req.body;
			const [_, token] = req.headers.authorization.split(" ");
			const { id: userId } = decodeToken({ token });

			const product = await sql`
                SELECT id
                FROM "product"
                WHERE id = ${id} AND userId = ${userId}
            `;

			if (product.length === 0) {
				return res.status(200).json({
					message:
						"Product not found or you don't have permission to update it",
				});
			}

			const updateFields = {};
			if (title !== undefined) updateFields.title = title;
			if (description !== undefined)
				updateFields.description = description;
			if (date !== undefined) updateFields.date = date;
			if (amount !== undefined) updateFields.amount = amount;
			if (info !== undefined) updateFields.info = info;
			if (favourite !== undefined) updateFields.favourite = favourite;
			if (status !== undefined) updateFields.status = status;
			if (label !== undefined) updateFields.label = label;
			if (priority !== undefined) updateFields.priority = priority;

			await sql`
                UPDATE "product"
                SET ${sql(updateFields)}, updated_at = NOW()
                WHERE id = ${id}
            `;

			res.json({ message: "Product updated successfully" });
		} catch (error) {
			console.log(error);
			res.status(500).json({ error: "Server error" });
		}
	},
};

module.exports = productController;
