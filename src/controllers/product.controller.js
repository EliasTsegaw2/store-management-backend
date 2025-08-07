const axios = require('axios');
const FormData = require('form-data');
const { Product } = require('../models');

const createProduct = async (req, res) => {
  try {
    const imageUrls = [];

    if (req.files?.length > 0) {
      for (const file of req.files) {
        const filename = file.originalname;
        const seaweedUrl = `http://localhost:8888/myimages/${filename}`;
        const form = new FormData();
        form.append('file', file.buffer, filename);
        await axios.post(seaweedUrl, form, { headers: form.getHeaders() });
        imageUrls.push(seaweedUrl);
      }
    }

    const product = new Product({ ...req.body, imageUrls });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const getProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct
};