import express from 'express';
import Artifact from '../models/Artifact.js';
import { protect, admin } from '../middleware/auth.js';
import { upload } from '../config/cloudinary.js';

const router = express.Router();

// Get all artifacts
router.get('/', async (req, res) => {
  try {
    const artifacts = await Artifact.find({});
    res.json(artifacts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single artifact
router.get('/:id', async (req, res) => {
  try {
    const artifact = await Artifact.findById(req.params.id);

    if (artifact) {
      res.json(artifact);
    } else {
      res.status(404).json({ message: 'Artifact not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create artifact (Admin only)
router.post('/', protect, admin, upload.single('image'), async (req, res) => {

  console.log('Received artifact creation request with data:', req.body);
  console.log('Received file data:', req.file);
  try {
    const {
      name,
      description,
      originTribe,
      historicalSignificance,
      category,
      yearDiscovered,
      material
    } = req.body;



    let imageUrl = req.body.imageUrl || '';

    if (req.file && req.file.path) {
      imageUrl = req.file.path;
    }

    const artifact = new Artifact({
      name,
      description,
      originTribe,
      historicalSignificance,
      category,
      imageUrl,
      yearDiscovered,
      material
    });

    const createdArtifact = await artifact.save();
    res.status(201).json(createdArtifact);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update artifact (Admin only)
router.put('/:id', protect, admin, upload.single('image'), async (req, res) => {
  try {
    const {
      name,
      description,
      originTribe,
      historicalSignificance,
      category,
      yearDiscovered,
      material
    } = req.body;

    const artifact = await Artifact.findById(req.params.id);

    if (artifact) {
      artifact.name = name || artifact.name;
      artifact.description = description || artifact.description;
      artifact.originTribe = originTribe || artifact.originTribe;
      artifact.historicalSignificance = historicalSignificance || artifact.historicalSignificance;
      artifact.category = category || artifact.category;
      artifact.yearDiscovered = yearDiscovered || artifact.yearDiscovered;
      artifact.material = material || artifact.material;

      if (req.file && req.file.path) {
        artifact.imageUrl = req.file.path;
      } else if (req.body.imageUrl) {
        artifact.imageUrl = req.body.imageUrl;
      }

      const updatedArtifact = await artifact.save();
      res.json(updatedArtifact);
    } else {
      res.status(404).json({ message: 'Artifact not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete artifact (Admin only)
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const artifact = await Artifact.findById(req.params.id);

    if (artifact) {
      await artifact.deleteOne();
      res.json({ message: 'Artifact removed' });
    } else {
      res.status(404).json({ message: 'Artifact not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;