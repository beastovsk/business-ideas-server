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

            const messages = [
                {
                    role: "system",
                    content: "You are an assistant that generates product details.",
                },
                {
                    role: "user",
                    content: "Generate a new product with a title, description, and other relevant details.",
                },
            ];

            const response = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: messages,
                max_tokens: 500,
                temperature: 0.7,
            });

            const generatedContent = response.choices[0].message.content;

            const productDetails = JSON.parse(generatedContent);

            const { title, description, amount, info, favourite, status, label, priority } = productDetails;

            const date = new Date().toISOString().split('T')[0]; // Получаем текущую дату в формате YYYY-MM-DD

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
                    ${title},
                    ${description},
                    ${date},
                    ${amount},
                    ${info},
                    ${favourite},
                    ${status},
                    ${label},
                    ${priority},
                    ${userId}
                ) RETURNING *;
            `;

            res.json({ message: "Product generated and saved successfully", product: result[0] });
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
                return res.status(200).json({ message: "No products found" });
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
                return res.status(200).json({ message: "Product not found or you don't have permission to delete it" });
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
            const { id, title, description, date, amount, info, favourite, status, label, priority } = req.body;
            const [_, token] = req.headers.authorization.split(" ");
            const { id: userId } = decodeToken({ token });

            const product = await sql`
                SELECT id
                FROM "product"
                WHERE id = ${id} AND userId = ${userId}
            `;

            if (product.length === 0) {
                return res.status(200).json({ message: "Product not found or you don't have permission to update it" });
            }

            const updateFields = {};
            if (title !== undefined) updateFields.title = title;
            if (description !== undefined) updateFields.description = description;
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
    }
};

module.exports = productController;
