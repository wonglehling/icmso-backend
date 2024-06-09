const User = require('../models/user')
const { UnauthorizedAccessError } = require('../helpers/exceptions');
const { hashPassword, comparePassword } = require('../helpers/auth')
const jwt = require('jsonwebtoken');

const registerUser = async (req, res) => {
    try {
        const payload = req.body;
        // check empty value
        if (!payload.user_email) {
            return res.json({
                err: 'Email is required!'
            })
        }
        
        if (!payload.user_password || payload.user_password.length < 6) {
            return res.json({
                err: 'Password of at least 6 characters long is required!'
            })
        }
        
        // if (!payload.username) {
        //     return res.json({
        //         err: 'username is required!'
        //     })
        // }
        
        else {
            const hashedPassword = await hashPassword(payload.user_password)
            // find user if exist in db
            // create user record in db
            const newUser = new User({...payload, user_password: hashedPassword})
            await newUser.save();
            res.status(201).json({ message: 'User registered successfully' });
        }
    } catch (error) {
        res.status(401).json({
            error: error.name,
            message: error.message
        })
    }
}

const loginUser = async (req, res) => {
    try {
        const { user_email, user_password } = req.body
        const user = await User.findOne({ user_email, status: "active" });
        if (!user) {
            throw new UnauthorizedAccessError('No user found')
        }

        const match = await comparePassword(user_password, user.user_password)
        if (match) {
            jwt.sign({
                user_email: user.user_email,
                userId: user._id,
                user_first_name: user.user_first_name,
                user_last_name: user.user_last_name,
                physician_name: user.physician_name,
                physician_photo_url: user.physician_photo_url,
                type: user.type
            }, process.env.JWT_SECRET, {}, (err, token) => {
                if (err) throw err;
                res.cookie('token', token, {
                    secure: false,//process.env.NODE_ENV !== "development",
                    httpOnly: true,
                    maxAge: 2 * 60 * 60 * 1000,
                })
                    .json({ token, type: user.type, userdata: {
                        userId: user._id,
                        user_first_name: user.user_first_name,
                        user_last_name: user.user_last_name,
                        user_avatar_url: user.user_avatar_url,
                        user_type: user.user_type
                    } })
            })
        }
        else {
            throw new UnauthorizedAccessError("Unauthorized Access")
        }
    } catch (error) {
        res.status(401).json({
            error: error.name,
            message: error.message
        })
    }
}

const getUserProfile = (req, res) => {
    const { token } = req.cookies
    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, {}, (err, decodedToken) => {
            if (err) {
                var code = 401
                var errorInfo = "Unauthorized Access"
                res.status(code).send({
                    status: code,
                    info: errorInfo,
                    error_code: code,
                    message: errorInfo,
                });
            }
            else {
                res.json(decodedToken)
            }
        })
    } else {
        res.json(null)
    }
}

module.exports = { registerUser, loginUser, getUserProfile }