// === INVENTORY CONTROLLERS ===
const { Inventory } = require('../models');
const axios = require('axios');
const FormData = require('form-data');

// GET /api/inventory
const getInventory = async (req, res) => {
  try {
    const {
      search,
      model,
      type,
      place,
      condition,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};
    if (search) query.name = { $regex: search, $options: 'i' };
    if (model) query.model = model;
    if (type) query.type = type;
    if (condition) query.condition = condition;
    if (place) query['location.building'] = place; // or adapt for room/shelf

    const skip = (Number(page) - 1) * Number(limit);

    const items = await Inventory.find(query)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Inventory.countDocuments(query);

    res.json({
      items,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Error fetching inventory:', err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/inventory
const addInventory = async (req, res) => {
  try {
    let imageUrl = undefined;
    if (req.file) {
      const filename = req.file.originalname;
      const seaweedUrl = `http://localhost:8888/myimages/${filename}`;
      const form = new FormData();
      form.append('file', req.file.buffer, filename);
      await axios.post(seaweedUrl, form, { headers: form.getHeaders() });
      imageUrl = seaweedUrl;
    }

    const {
      name,
      model,
      total,
      available,
      type,
      condition,
      location,
      description,
      lastMaintenance,
    } = req.body;

    const item = new Inventory({
      name,
      model,
      total,
      available,
      type,
      condition,
      imageUrl,
      location,
      description,
      lastMaintenance,
    });

    await item.save();
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// PUT /api/inventory/:id
const updateInventory = async (req, res) => {
  try {
    let updateData = { ...req.body };

    if (req.file) {
      const filename = req.file.originalname;
      const seaweedUrl = `http://localhost:8888/myimages/${filename}`;
      const form = new FormData();
      form.append('file', req.file.buffer, filename);
      await axios.post(seaweedUrl, form, { headers: form.getHeaders() });
      updateData.imageUrl = seaweedUrl;
    }

    const item = await Inventory.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE /api/inventory/:id
const deleteInventory = async (req, res) => {
  try {
    const item = await Inventory.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports = {
  getInventory,
  addInventory,
  updateInventory,
  deleteInventory,
};
