const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {

    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).json({
            message: "Please login first"
        });
    }

    try {

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            message: "Invalid or expired token"
        });

    }
}

function verifyTeacher(req, res, next) {

    if (req.user.role !== 'teacher') {

        return res.status(403).json({
            message: "Teacher access only"
        });

    }

    next();
}

function verifyStudent(req, res, next) {

    if (req.user.role !== 'student') {

        return res.status(403).json({
            message: "Student access only"
        });

    }

    next();
}

module.exports = {
    verifyToken,
    verifyTeacher,
    verifyStudent
};