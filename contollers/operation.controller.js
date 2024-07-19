const sql = require("../database");
const { decodeToken } = require("../utils");

const operationController = {
	getAllOperations: async (req, res) => {
		try {
			const [_, token] = req.headers.authorization.split(" ");
			const { id } = decodeToken({ token });
			const { isLatest } = req.query;

			let result;
			if (isLatest) {
				result = await sql`
                    SELECT id, type, amount, date, status
                    FROM "operations"
                    WHERE userId = ${id}
                    ORDER BY date DESC
                    LIMIT 5
                `;
			} else {
				result = await sql`
                    SELECT id, type, amount, date, status
                    FROM "operations"
                    WHERE userId = ${id}
                    ORDER BY date DESC
                `;
			}

			if (result.length === 0) {
				return res
					.status(200)
					.json({ operations: [], message: "No operations found" });
			}

			res.json({ operations: result });
		} catch (error) {
			console.log(error);
			res.status(200).json({ operations: null });
		}
	},
};

module.exports = operationController;
