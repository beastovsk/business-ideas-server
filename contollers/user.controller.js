const sql = require("../database");
const bcrypt = require("bcryptjs");
const { generateToken, decodeToken } = require("../utils");

const userController = {
  getUser: async (req, res) => {
    try {
      const [_, token] = req.headers.authorization.split(" ");
      const { email } = decodeToken({ token });
      const result = await sql`SELECT * FROM "users" WHERE email = ${email}`;
      if (result.length === 0) {
        return res.status(200).json({ message: "Пользователь не найден" });
      }

      const { password, is_confirmed, confirm_token, ...user } = result[0];

      res.json({ user });
    } catch (error) {
      console.log(error);
      res.status(200).json({ user: null });
    }
  },
  changeEmail: async (req, res) => {
    try {
      const { currentEmail, newEmail, password } = req.body;
      const [_, token] = req.headers.authorization.split(" ");
      const { email: decodedEmail } = decodeToken({ token });

      if (decodedEmail !== currentEmail) {
        return res.status(200).json({ message: "Некорректная текущая почта" });
      }

      const result =
        await sql`SELECT * FROM "users" WHERE email = ${decodedEmail}`;

      if (result.length === 0) {
        return res.status(200).json({ message: "Пользователь не найден" });
      }

      const user = result[0];

      const checkPass = await bcrypt.compare(password, user.password);
      if (!checkPass) {
        return res.status(200).json({ message: "Некорректный пароль" });
      }

      await sql`UPDATE "users" SET email = ${newEmail} WHERE email = ${currentEmail}`;

      const updatedToken = generateToken({
        id: user.id,
        email: newEmail,
      });

      res.json({
        token: updatedToken,
        message: "Почта успешно изменена",
      });
    } catch (error) {
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },
  changePassword: async (req, res) => {
    try {
      const { currentPassword, password } = req.body;
      const [_, token] = req.headers.authorization.split(" ");
      const { email } = decodeToken({ token });

      const result = await sql`SELECT * FROM "users" WHERE email = ${email}`;

      if (result.length === 0) {
        return res.status(200).json({ message: "Пользователь не найден" });
      }

      const user = result[0];

      const checkPass = await bcrypt.compare(currentPassword, user.password);
      if (!checkPass) {
        return res.status(200).json({ message: "Некорректный пароль" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await sql`UPDATE "users" SET password = ${hashedPassword} WHERE email = ${email}`;

      res.json({
        message: "Пароль успешно изменен",
      });
    } catch (error) {
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },
  updateSubscription: async (req, res) => {
    try {
      res.json({
        message: "Подписка успешно оформлена",
      });
    } catch (error) {
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },
  removeSubscription: async (req, res) => {
    try {
      res.json({
        message: "Подписка успешно отменена",
      });
    } catch (error) {
      res.status(500).json({ error: "Ошибка сервера" });
    }
  },
};

module.exports = userController;
