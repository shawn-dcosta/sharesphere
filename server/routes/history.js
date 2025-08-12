const router = require('express').Router();
const FileTransfer = require('../models/FileTransfer');
const User = require('../models/User');

router.post('/', async (req, res) => {
    const { senderId, receiverId, fileName, fileSize } = req.body;
    try {
        const sender = await User.findById(senderId);
        const receiver = await User.findById(receiverId);

        if (!sender || !receiver) {
            return res.status(404).json("Sender or receiver not found.");
        }
        
        const newTransfer = new FileTransfer({
            sender: sender._id,
            receiver: receiver._id,
            fileName,
            fileSize,
        });

        const savedTransfer = await newTransfer.save();
        res.status(201).json(savedTransfer);
    } catch (err) {
        res.status(500).json({ message: "Failed to log transfer", error: err });
    }
});

router.get('/:userId', async (req, res) => {
    try {
        const transfers = await FileTransfer.find({
            $or: [{ sender: req.params.userId }, { receiver: req.params.userId }]
        })
        .populate('sender', 'username')
        .populate('receiver', 'username')
        .sort({ createdAt: -1 });
        
        res.status(200).json(transfers);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch history", error: err });
    }
});

module.exports = router;
