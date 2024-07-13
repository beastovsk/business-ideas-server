const JWT = require("jsonwebtoken");

const generateToken = ({ id, email }) => {
	return JWT.sign(
		{
			id,
			email,
		},
		process.env.JWT_SECRET,
		{ expiresIn: "24h" }
	);
};

const decodeToken = ({ token }) => {
	return JWT.verify(token, process.env.JWT_SECRET);
};

module.exports = { generateToken, decodeToken };
