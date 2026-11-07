const express = require('express');
const router = express.Router();

const db = require('../config/db');

const {
    verifyToken,
    verifyTeacher,
    verifyStudent
} = require('../middleware/auth');


// CREATE QUIZ

router.post(
    '/create',
    verifyToken,
    verifyTeacher,
    (req, res) => {

        const {
            title,
            subject,
            total_marks,
            duration
        } = req.body;

        if (!title || !subject ||
            !Number.isInteger(total_marks) ||
            !Number.isInteger(duration) ||
            total_marks <= 0 || duration <= 0) {

            return res.status(400).json({
                message: "Enter valid quiz details"
            });
        }

        const sql = `
            INSERT INTO quizzes
            (title, subject, total_marks, duration, created_by)
            VALUES (?, ?, ?, ?, ?)
        `;

        db.query(
            sql,
            [
                title,
                subject,
                total_marks,
                duration,
                req.user.user_id
            ],
            (err, result) => {

                if (err) {
                    return res.status(500).json({
                        message: "Quiz creation failed"
                    });
                }

                res.json({
                    message: "Quiz created successfully",
                    quiz_id: result.insertId
                });

            }
        );

    }
);


// ADD QUESTIONS

router.post(
    '/add-question',
    verifyToken,
    verifyTeacher,
    (req, res) => {

        const {
            quiz_id,
            question_text,
            option_a,
            option_b,
            option_c,
            option_d,
            correct_answer
        } = req.body;

        if (!quiz_id || !question_text ||
            !option_a || !option_b ||
            !option_c || !option_d ||
            !['A', 'B', 'C', 'D'].includes(correct_answer)) {

            return res.status(400).json({
                message: "Enter all question details correctly"
            });
        }

        const checkSql = `
            SELECT quiz_id FROM quizzes
            WHERE quiz_id = ? AND created_by = ?
        `;

        db.query(
            checkSql,
            [quiz_id, req.user.user_id],
            (err, rows) => {

                if (err || rows.length === 0) {
                    return res.status(404).json({
                        message: "Quiz not found"
                    });
                }

                const sql = `
                    INSERT INTO questions
                    (
                        quiz_id,
                        question_text,
                        option_a,
                        option_b,
                        option_c,
                        option_d,
                        correct_answer
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `;

                db.query(
                    sql,
                    [
                        quiz_id,
                        question_text,
                        option_a,
                        option_b,
                        option_c,
                        option_d,
                        correct_answer
                    ],
                    (error) => {

                        if (error) {
                            return res.status(500).json({
                                message: "Question insertion failed"
                            });
                        }

                        res.json({
                            message: "Question added successfully"
                        });

                    }
                );

            }
        );

    }
);


// TEACHER: VIEW OWN QUIZZES

router.get(
    '/teacher',
    verifyToken,
    verifyTeacher,
    (req, res) => {

        const sql = `
            SELECT q.*,
            COUNT(questions.question_id) AS question_count
            FROM quizzes q
            LEFT JOIN questions
            ON q.quiz_id = questions.quiz_id
            WHERE q.created_by = ?
            GROUP BY q.quiz_id
        `;

        db.query(
            sql,
            [req.user.user_id],
            (err, result) => {

                if (err) {
                    return res.status(500).json({
                        message: "Unable to load quizzes"
                    });
                }

                res.json(result);

            }
        );

    }
);


// STUDENT: VIEW AVAILABLE QUIZZES

router.get(
    '/',
    verifyToken,
    verifyStudent,
    (req, res) => {

        const sql = `
            SELECT
                q.quiz_id,
                q.title,
                q.subject,
                q.total_marks,
                q.duration,
                u.name AS teacher_name
            FROM quizzes q
            JOIN users u
            ON q.created_by = u.user_id
            WHERE EXISTS (
                SELECT 1 FROM questions
                WHERE questions.quiz_id = q.quiz_id
            )
            AND NOT EXISTS (
                SELECT 1 FROM results r
                WHERE r.quiz_id = q.quiz_id
                AND r.user_id = ?
            )
        `;

        db.query(
            sql,
            [req.user.user_id],
            (err, result) => {

                if (err) {
                    return res.status(500).json({
                        message: "Unable to load quizzes"
                    });
                }

                res.json(result);

            }
        );

    }
);


// STUDENT: GET QUESTIONS

router.get(
    '/:id/questions',
    verifyToken,
    verifyStudent,
    (req, res) => {

        const sql = `
            SELECT
                question_id,
                quiz_id,
                question_text,
                option_a,
                option_b,
                option_c,
                option_d
            FROM questions
            WHERE quiz_id = ?
        `;

        db.query(
            sql,
            [req.params.id],
            (err, result) => {

                if (err) {
                    return res.status(500).json({
                        message: "Unable to load questions"
                    });
                }

                res.json(result);

            }
        );

    }
);

module.exports = router;