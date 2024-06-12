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
    if (!payload.user_password || payload.user_password.length === 0) {
      let result = '';
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      const charactersLength = characters.length;
      let counter = 0;
      while (counter < 8) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
      }
      payload.user_password = result;
    } else if (payload.user_password.length < 6) {
      return res.json({
        err: 'Password of at least 6 characters long is required!'
      })
    }

    const hashedPassword = await hashPassword(payload.user_password)
    // find user if exist in db
    // create user record in db
    const newUser = new User({ ...payload, user_password: hashedPassword })
    await newUser.save();

    // send email
    var transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SENDER_EMAIL,
        pass: process.env.SENDER_PASS
      }
    });

    var mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: payload.user_email,
      subject: 'ICMSO Registration',
      html: `<h1>Welcome to ICMSO</h1><p>Someone added you into the ICMS System as <b>${payload.user_type}</b>. </p><p>Click <a href="${process.env.CLIENT_URL}/login">here</a> to login now, using the credentials as follow: <li>Email: ${req.body.new_member.group_member_email}</li><li>Password: ${payload.user_password}</li></p>`
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        throw error;
      }
    });

    res.status(201).json({ message: 'User registered successfully' });

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
        user_type: user.user_type
      }, process.env.JWT_SECRET, {}, (err, token) => {
        if (err) throw err;
        res.cookie('token', token, {
          secure: false,//process.env.NODE_ENV !== "development",
          httpOnly: true,
          maxAge: 2 * 60 * 60 * 1000,
        })
          .json({
            token, type: user.user_type, userdata: {
              userId: user._id,
              user_first_name: user.user_first_name,
              user_last_name: user.user_last_name,
              user_avatar_url: user.user_avatar_url,
              user_type: user.user_type
            }
          })
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