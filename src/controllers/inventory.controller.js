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
    let imageUrl, pdfUrl;

    if (req.files?.image?.[0]) {
      const imageFile = req.files.image[0];
      const filename = imageFile.originalname;
      const seaweedUrl = `http://localhost:8888/myimages/${filename}`;
      const form = new FormData();
      form.append('file', imageFile.buffer, filename);
      await axios.post(seaweedUrl, form, { headers: form.getHeaders() });
      imageUrl = seaweedUrl;
    }

    if (req.files?.pdf?.[0]) {
      const pdfFile = req.files.pdf[0];
      const pdfFilename = pdfFile.originalname;
      const seaweedPdfUrl = `http://localhost:8888/mypdfs/${pdfFilename}`;
      const pdfForm = new FormData();
      pdfForm.append('file', pdfFile.buffer, pdfFilename);
      await axios.post(seaweedPdfUrl, pdfForm, { headers: pdfForm.getHeaders() });
      pdfUrl = seaweedPdfUrl;
    }

    let {
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

    let t = Number(total);
    if (Number.isNaN(t) || t < 0) t = 0;

    let a = available === undefined ? t : Number(available);
    if (Number.isNaN(a) || a < 0) a = 0;
    if (a > t) a = t;

    const item = new Inventory({
      name,
      model,
      total: t,
      available: a,
      reserved: 0,
      type,
      condition,
      imageUrl,
      pdfUrl,
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

    if (req.files?.image?.[0]) {
      const imageFile = req.files.image[0];
      const filename = imageFile.originalname;
      const seaweedUrl = `http://localhost:8888/myimages/${filename}`;
      const form = new FormData();
      form.append('file', imageFile.buffer, filename);
      await axios.post(seaweedUrl, form, { headers: form.getHeaders() });
      updateData.imageUrl = seaweedUrl;
    }

    if (req.files?.pdf?.[0]) {
      const pdfFile = req.files.pdf[0];
      const pdfFilename = pdfFile.originalname;
      const seaweedPdfUrl = `http://localhost:8888/mypdfs/${pdfFilename}`;
      const pdfForm = new FormData();
      pdfForm.append('file', pdfFile.buffer, pdfFilename);
      await axios.post(seaweedPdfUrl, pdfForm, { headers: pdfForm.getHeaders() });
      updateData.pdfUrl = seaweedPdfUrl;
    }

    // Coerce numeric fields
    if (updateData.total !== undefined) {
      updateData.total = Number(updateData.total);
      if (Number.isNaN(updateData.total) || updateData.total < 0) {
        return res.status(400).json({ error: 'Invalid total' });
      }
    }
    if (updateData.available !== undefined) {
      updateData.available = Number(updateData.available);
      if (Number.isNaN(updateData.available) || updateData.available < 0) {
        return res.status(400).json({ error: 'Invalid available' });
      }
    }

    // Validate lowering total
    if (updateData.total !== undefined) {
      const current = await Inventory.findById(req.params.id).lean();
      if (!current) return res.status(404).json({ error: 'Item not found' });
      const sum = (current.available || 0) + (current.reserved || 0);
      if (updateData.total < sum) {
        return res.status(400).json({
          error: `total (${updateData.total}) < available+reserved (${sum})`
        });
      }
    }

    // Clamp available if both provided
    if (updateData.total !== undefined && updateData.available !== undefined) {
      if (updateData.available > updateData.total) {
        updateData.available = updateData.total;
      }
    }

    const item = await Inventory.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.reserved == null) { item.reserved = 0; await item.save(); }

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

// OPTIONAL one-off repair endpoint (remove after use)
const repairInventoryData = async (req, res) => {
  try {
    const bad = await Inventory.find({
      $expr: { $gt: [ { $add: ['$available', '$reserved'] }, '$total' ] }
    });
    for (const inv of bad) {
      const sum = (inv.available || 0) + (inv.reserved || 0);
      inv.total = sum;
      if (inv.reserved == null) inv.reserved = 0;
      await inv.save();
    }
    const missingReserved = await Inventory.updateMany(
      { reserved: { $exists: false } },
      { $set: { reserved: 0 } }
    );
    res.json({
      repaired: bad.length,
      initializedReserved: missingReserved.modifiedCount
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = {
  getInventory,
  addInventory,
  updateInventory,
  deleteInventory,
  repairInventoryData, // optional
};
