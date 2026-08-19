import mongoose from 'mongoose';

const topBannerSchema = new mongoose.Schema({
    image: {
        type: String,
        required: true,
    },
    publicId: {
        type: String,
    },
    order: {
        type: Number,
        default: 0,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    isVideo: {
        type: Boolean,
        default: false,
    }
}, {
    timestamps: true
});

const TopBanner = mongoose.model('TopBanner', topBannerSchema);

export default TopBanner;
