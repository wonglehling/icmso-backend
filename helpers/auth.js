const bcrypt = require('bcrypt')
const getUserInfo = require('./getUserInfo');

const hashPassword = (password) => {
    return new Promise((resolve, reject) => {
        bcrypt.genSalt(12, (e, salt) => {
            if (e) reject(e)
            bcrypt.hash(password, salt, (e, hash) => {
                if (e) reject(e)
                resolve(hash)
            })
        })
    })
}

const comparePassword = (password, hashed) => {
    return bcrypt.compare(password, hashed)
}

const checkAccess = (res, reqUserId) => {
    const { userId, type } = getUserInfo(res)
    return type === 'admin' || userId === reqUserId
}

module.exports = { hashPassword, comparePassword, checkAccess }