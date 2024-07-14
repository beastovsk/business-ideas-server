require("dotenv").config();
const JWT = require("jsonwebtoken");
const { PORT } = process.env;

const generateToken = ({ id, email }) => {
	console.log(process.env.SECRET_KEY_SESSION);
	return JWT.sign(
		{
			id,
			email,
		},
		process.env.SECRET_KEY_SESSION,
		{ expiresIn: "24h" }
	);
};

const decodeToken = ({ token }) => {
	return JWT.verify(token, process.env.SECRET_KEY_SESSION);
};

module.exports = { generateToken, decodeToken };
