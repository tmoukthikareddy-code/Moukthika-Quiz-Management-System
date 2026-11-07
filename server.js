const express = require('express');
const cors = require('cors');
const path = require('path');

require('dotenv').config();

const app = express();

// Middleware

app.use(cors());

app.use(express.json());

app.use(express.static(
    path.join(__dirname, 'public')
));

// Database connection

require('./config/db');

// Routes

app.use('/api/auth', require('./routes/auth'));

app.use('/api/quizzes', require('./routes/quizzes'));

app.use('/api/results', require('./routes/results'));

// Home page

app.get('/', (req, res) => {

    res.sendFile(
        path.join(__dirname, 'public', 'index.html')
    );

});

// Start server

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log(
        `Moukthika Quiz System running at http://localhost:${PORT}`
    );

});