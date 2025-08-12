const mongoose = require('mongoose');

const FileTransferSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    status: { type: String, enum: ['completed', 'failed'], default: 'completed' }
}, { timestamps: true });

module.exports = mongoose.model('FileTransfer', FileTransferSchema);
