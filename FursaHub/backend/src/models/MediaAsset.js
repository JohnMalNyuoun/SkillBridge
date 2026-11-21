const mongoose = require('mongoose');

const mediaAssetSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    url: { type: String, required: true },
    secureUrl: String,
    publicId: { type: String, required: true, unique: true },
    resourceType: { type: String, enum: ['image', 'video', 'raw'], default: 'image' },
    format: String,
    bytes: Number,
    width: Number,
    height: Number,

    folder: String,
    purpose: {
      type: String,
      enum: ['avatar', 'profile_picture', 'cover_banner', 'application_attachment', 'impact_story', 'opportunity_cover', 'business_showcase', 'other'],
      default: 'other',
      index: true,
    },

    relatedTo: {
      kind: { type: String, enum: ['Application', 'Opportunity', 'ImpactRecord', 'User'] },
      id: { type: mongoose.Schema.Types.ObjectId },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MediaAsset', mediaAssetSchema);
