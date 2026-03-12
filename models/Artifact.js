import mongoose from 'mongoose';

const artifactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  originTribe: { type: String, required: true },
  historicalSignificance: { type: String, required: true },
  category: { type: String, required: true },
  imageUrl: { type: String, required: true },
  yearDiscovered: { type: String, required: true },
  material: { type: String, required: true },
}, {
  timestamps: true,
});

const Artifact = mongoose.model('Artifact', artifactSchema);

export default Artifact;
