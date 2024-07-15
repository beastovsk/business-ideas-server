const sql = require("../database");

const productController = {
    latestProducts: async (req, res) => {
        try {
            const result = await sql`
                SELECT id, title, description, date, amount
                FROM "product"
                ORDER BY date DESC
                LIMIT 5
            `;
            
            if (result.length === 0) {
                return res.status(200).json({ message: "No products found" });
            }

            res.json({ products: result });
        } catch (error) {
            console.log(error);
            res.status(200).json({ products: null });
        }
    }
};

module.exports = productController;
