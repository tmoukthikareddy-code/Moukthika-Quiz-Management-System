const express = require('express');
const router = express.Router();

const db = require('../config/db');

const {
    verifyToken,
    verifyStudent
} = require('../middleware/auth');


// SUBMIT EXAMINATION

router.post(
    '/submit',
    verifyToken,
    verifyStudent,
    (req, res) => {

        const { quiz_id, answers } = req.body;

        if (!Number.isInteger(Number(quiz_id)) ||
            !Array.isArray(answers)) {

            return res.status(400).json({
                message: "Invalid submission"
            });
        }

        const student_id = req.user.user_id;

        const quizSql = `
            SELECT total_marks
            FROM quizzes
            WHERE quiz_id = ?
        `;

        db.query(quizSql, [quiz_id], (err, quizzes) => {

            if (err || quizzes.length === 0) {
                return res.status(404).json({
                    message: "Quiz not found"
                });
            }

            const totalMarks = quizzes[0].total_marks;

            const questionSql = `
                SELECT question_id, correct_answer
                FROM questions
                WHERE quiz_id = ?
            `;

            db.query(
                questionSql,
                [quiz_id],
                (error, questions) => {

                    if (error || questions.length === 0) {
                        return res.status(400).json({
                            message: "No questions available"
                        });
                    }

                    // Check for duplicate question IDs.

                    const submittedIds = answers.map(
                        a => Number(a.question_id)
                    );

                    const uniqueIds = new Set(submittedIds);

                    if (
                        uniqueIds.size !== submittedIds.length ||
                        submittedIds.some(id =>
                            !questions.some(q => q.question_id === id)
                        ) ||
                        answers.some(a =>
                            !['A', 'B', 'C', 'D'].includes(a.answer)
                        )
                    ) {
                        return res.status(400).json({
                            message: "Invalid answers submitted"
                        });
                    }

                    let correctCount = 0;

                    questions.forEach(question => {

                        const submitted = answers.find(
                            a => Number(a.question_id) === question.question_id
                        );

                        if (
                            submitted &&
                            submitted.answer === question.correct_answer
                        ) {
                            correctCount++;
                        }

                    });

                    const score = Math.round(
                        (correctCount / questions.length) * totalMarks
                    );

                    const checkSql = `
                        SELECT result_id FROM results
                        WHERE quiz_id = ? AND user_id = ?
                    `;

                    db.query(
                        checkSql,
                        [quiz_id, student_id],
                        (checkError, existing) => {

                            if (checkError) {
                                return res.status(500).json({
                                    message: "Submission failed"
                                });
                            }

                            if (existing.length > 0) {
                                return res.status(409).json({
                                    message: "You have already submitted this quiz"
                                });
                            }

                            const insertSql = `
                                INSERT INTO results
                                (quiz_id, user_id, score, status)
                                VALUES (?, ?, ?, 'Submitted')
                            `;

                            db.query(
                                insertSql,
                                [quiz_id, student_id, score],
                                (insertError) => {

                                    if (insertError) {
                                        return res.status(500).json({
                                            message: "Could not save result"
                                        });
                                    }

                                    res.json({
                                        message: "Examination submitted successfully",
                                        score: score,
                                        total_marks: totalMarks,
                                        correct_answers: correctCount,
                                        total_questions: questions.length
                                    });

                                }
                            );

                        }
                    );

                }
            );

        });

    }
);


// STUDENT: VIEW OWN RESULTS

router.get(
    '/student',
    verifyToken,
    verifyStudent,
    (req, res) => {

        const sql = `
            SELECT
                r.result_id,
                q.title,
                q.subject,
                q.total_marks,
                r.score,
                r.attempted_at,
                r.status
            FROM results r
            JOIN quizzes q
            ON r.quiz_id = q.quiz_id
            WHERE r.user_id = ?
            ORDER BY r.attempted_at DESC
        `;

        db.query(
            sql,
            [req.user.user_id],
            (err, result) => {

                if (err) {
                    return res.status(500).json({
                        message: "Unable to load results"
                    });
                }

                res.json(result);

            }
        );

    }
);


// TEACHER: VIEW ALL STUDENT RESULTS

router.get(
    '/teacher',
    verifyToken,
    (req, res, next) => {

        if (req.user.role !== 'teacher') {
            return res.status(403).json({
                message: "Teacher access only"
            });
        }

        next();

    },
    (req, res) => {

        const sql = `
            SELECT
                r.result_id,
                u.name AS student_name,
                q.title AS quiz_title,
                r.score,
                q.total_marks,
                r.attempted_at,
                r.status
            FROM results r
            JOIN users u ON r.user_id = u.user_id
            JOIN quizzes q ON r.quiz_id = q.quiz_id
            WHERE q.created_by = ?
            ORDER BY r.attempted_at DESC
        `;

        db.query(
            sql,
            [req.user.user_id],
            (err, result) => {

                if (err) {
                    return res.status(500).json({
                        message: "Unable to load student results"
                    });
                }

                res.json(result);

            }
        );

    }
);

module.exports = router;