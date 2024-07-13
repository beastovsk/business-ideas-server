const { Pool } = require('pg')

const pool = new Pool({
    user:"postgres",
    password:"GEIpWdEspYdHhwpzkoaFvVdBlFKVwGAF",
    host:"roundhouse.proxy.rlwy.net",
    port:34775,
    database: "railway"
})

pool.connect((err) => {
    if (err) throw err
    console.log("Connect to PostgreSQL successfully!")
})

module.exports = pool