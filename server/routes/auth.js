// const router = require('express').Router();
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const User = require('../models/User');

// router.post('/register', async (req, res) => {
//     try {
//         const salt = await bcrypt.genSalt(10);
//         const hashedPassword = await bcrypt.hash(req.body.password, salt);
        
//         const newUser = new User({
//             username: req.body.username,
//             password: hashedPassword,
//         });

//         const user = await newUser.save();
//         const { password, ...others } = user._doc;
//         res.status(201).json(others);
//     } catch (err) {
//         res.status(500).json({ message: "Error registering user", error: err });
//     }
// });

// router.post('/login', async (req, res) => {
//     try {
//         const user = await User.findOne({ username: req.body.username });
//         if (!user) {
//             return res.status(401).json("Wrong credentials!");
//         }

//         const validated = await bcrypt.compare(req.body.password, user.password);
//         if (!validated) {
//             return res.status(401).json("Wrong credentials!");
//         }

//         const accessToken = jwt.sign({
//             id: user._id,
//             username: user.username
//         }, process.env.JWT_SECRET, { expiresIn: "3d" });

//         const { password, ...others } = user._doc;
//         res.status(200).json({ ...others, accessToken });
//     } catch (err) {
//         res.status(500).json({ message: "Error logging in", error: err });
//     }
// });

// module.exports = router;


// -------------------------------------------------------------------------------------------


// File: /server/routes/auth.js
const routerAuth = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserAuth = require('../models/User');

routerAuth.post('/register', async (req, res) => {
    const { username, email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match." });
    }

    try {
        const existingUser = await UserAuth.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: "Username or email already exists." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const newUser = new UserAuth({
            username,
            email,
            password: hashedPassword,
        });

        const user = await newUser.save();
        const { password: _, ...others } = user._doc;
        res.status(201).json(others);
    } catch (err) {
        res.status(500).json({ message: "Error registering user", error: err });
    }
});

routerAuth.post('/login', async (req, res) => {
    try {
        const user = await UserAuth.findOne({ email: req.body.email });
        if (!user) {
            return res.status(401).json("Wrong credentials!");
        }

        const validated = await bcrypt.compare(req.body.password, user.password);
        if (!validated) {
            return res.status(401).json("Wrong credentials!");
        }

        const accessToken = jwt.sign({
            id: user._id,
            username: user.username
        }, process.env.JWT_SECRET, { expiresIn: "3d" });

        const { password, ...others } = user._doc;
        res.status(200).json({ ...others, accessToken });
    } catch (err) {
        res.status(500).json({ message: "Error logging in", error: err });
    }
});

module.exports = routerAuth;