require('dotenv').config(); // Load environment variables from .env file

const supabase =require('./lib/supabaseClient');

const express = require('express');
const cors = require('cors');
const app = express();


const PORT = process.env.PORT || 3001;

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3001' //This connects the server to the client URL specified in the environment variables or defaults to localhost:3001 if not specified.
}))

app.use(express.json()); // Middleware to parse JSON request bodies

app.get('/health', (req, res) => {
    res.json({ status: "Okay!"});
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})

module.exports = app;