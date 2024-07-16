const sql = require("../database");
const { decodeToken } = require("../utils");

const productController = {
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
    }
};

module.exports = productController;
