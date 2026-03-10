const express = require("express")
const cors = require("cors")

const app = express()

app.use(cors())
app.use(express.json())

app.get("/", (req, res) => {
    res.json({
        message: "Supermarket SaaS API running"
    })
})

module.exports = app