const express = require('express');
const router = express.Router();

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const db = require('../config/db');

// REGISTER

router.post('/register', async (req, res) => {

    const { name, email, password, role } = req.body;

    if (!name || !email || !password ||
        !['teacher', 'student'].includes(role)) {

        return res.status(400).json({
            message: "Enter valid details"
        });
    }

    try {

        const hashedPassword =
            await bcrypt.hash(password, 10);

        const sql = `
            INSERT INTO users
            (name, email, password, role)
            VALUES (?, ?, ?, ?)
        `;

        db.query(
            sql,
            [name, email, hashedPassword, role],
            (err, result) => {

                if (err) {
                    return res.status(400).json({
                        message: "Registration failed"
                    });
                }

                res.json({
                    message: "Registration successful"
                });

            }
        );

    } catch (error) {

        res.status(500).json({
            message: "Server error"
        });

    }

});


// LOGIN

router.post('/login', (req, res) => {

    const { email, password } = req.body;

    const sql = "SELECT * FROM users WHERE email = ?";

    db.query(sql, [email], async (err, result) => {

        if (err) {
            return res.status(500).json({
                message: "Database error"
            });
        }

        if (result.length === 0) {
            return res.status(401).json({
                message: "User not found"
            });
        }

        const user = result[0];

        const validPassword = await bcrypt.compare(
            password,
            user.password
        );

        if (!validPassword) {
            return res.status(401).json({
                message: "Incorrect password"
            });
        }

        const token = jwt.sign(
            {
                user_id: user.user_id,
                name: user.name,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );

        res.json({
            message: "Login successful",
            token: token,
            user: {
                user_id: user.user_id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    });

});

module.exports = router;