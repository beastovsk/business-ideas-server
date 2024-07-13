require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const path = require("path");
const cors = require("cors");
const indexRouter = require("./routes/index.router");
const app = express();
const { Server } = require("socket.io");
const { PORT } = process.env;
const { createServer } = require("node:http");

const corsOptions = {
	origin: [
		"http://localhost:3000",
		"http://127.0.0.1:3000",
		"https://webi-agency.ru",
		"https://webi-app.vercel.app",
	],
	credentials: true,
	methods: ["GET", "POST", "DELETE", "PATCH", "PUT"],
};
const server = createServer(app);
app.use(cors(corsOptions));

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "50mb" }));
app.use(morgan("dev"));
app.use(express.static(path.join(process.cwd(), "public")));

app.use("/api", indexRouter);
const io = new Server(server, {
	cors: {
		origin: [
			"http://localhost:3000",
			"http://127.0.0.1:3000",
			"https://webi-agency.ru",
			"https://webi-app.vercel.app",
		],
		credentials: true,
		methods: ["GET", "POST", "DELETE", "PATCH", "PUT"],
	},
});
global.io = io; //added

io.on("connection", (socket) => {
	console.log("socket started");
});

server.listen(PORT, () =>
	console.log(`Сервер запущен: http://localhost:${PORT}`)
);
