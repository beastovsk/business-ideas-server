const sql = require("../database");

const operationController = {
    latestOperations: async (req, res) => {
        try {
            const result = await sql`
                SELECT id, type, amount, date, status
                FROM "operations"
                ORDER BY date DESC
                LIMIT 5
            `;
            
            if (result.length === 0) {
                return res.status(200).json({ message: "No operations found" });
            }

            res.json({ operations: result });
        } catch (error) {
            console.log(error);
            res.status(200).json({ operations: null });
        }
    }
};

module.exports = operationController;
