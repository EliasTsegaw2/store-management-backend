const axios = require('axios');
const FormData = require('form-data');
const { Product, User, Order, Inventory, Maintenance, Request } = require('../models');
const mongoose = require('mongoose');

// === PRODUCT CONTROLLERS ===
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

// === USER CONTROLLERS ===
const createUser = async (req, res) => {
    try {
        const user = new User(req.body);
        await user.save();
        res.status(201).json(user);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const getUsers = async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const updateUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// === ORDER CONTROLLERS ===
const createOrder = async (req, res) => {
    try {
        const { _id, items } = req.body;
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Items array is required' });
        }

        let totalAmount = 0;
        for (const item of items) {
            if (!item.productId || !item.quantity) {
                return res.status(400).json({ error: 'Each item must have productId and quantity' });
            }
            const product = await Product.findById(item.productId);
            if (!product) return res.status(400).json({ error: `Product not found: ${item.productId}` });
            totalAmount += product.price * item.quantity;
        }

        const order = new Order({ _id, items, totalAmount });
        await order.save();
        res.status(201).json(order);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const getOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('_id')
            .populate('items.productId');
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const updateOrder = async (req, res) => {
    try {
        let updateData = req.body;
        if (req.body.items) {
            let totalAmount = 0;
            for (const item of req.body.items) {
                const product = await Product.findById(item.productId);
                if (!product) {
                    return res.status(400).json({ error: `Product not found: ${item.productId}` });
                }
                totalAmount += product.price * item.quantity;
            }
            updateData.totalAmount = totalAmount;
        }
        const order = await Order.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json(order);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const deleteOrder = async (req, res) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json({ message: 'Order deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const approveOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });

        if (order.approvedByHOD) {
            return res.status(400).json({ error: 'Order already approved' });
        }

        order.approvedByHOD = true;
        await order.save();
        res.json({ message: 'Order approved by Department Head', order });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const createItem = async (req, res) => {
    try {
        const { orderId, productId, quantity } = req.body;
        if (!orderId || !productId || !quantity) {
            return res.status(400).json({ error: 'orderId, productId, and quantity are required' });
        }

        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ error: 'Order not found' });

        order.items.push({ productId, quantity });
        await order.save();
        res.status(201).json(order);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const deleteItem = async (req, res) => {
    try {
        const { orderId, itemId } = req.body;
        if (!orderId || !itemId) {
            return res.status(400).json({ error: 'orderId and itemId are required' });
        }

        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ error: 'Order not found' });

        order.items = order.items.filter(item => item._id.toString() !== itemId);
        await order.save();
        res.json({ message: 'Item deleted from order', order });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// === INVENTORY CONTROLLERS ===
const getInventory = async (req, res) => {
  try {
    const {
      search,
      model,
      type,       // <-- here
      place,
      condition,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};
    if (search) query.name = { $regex: search, $options: 'i' };
    if (model) query.model = model;
    if (type) query.type = type; // <-- filter by type
    if (place) query.place = place;
    if (condition) query.condition = condition;

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


const addInventory = async (req, res) => {
    try {
        const item = new Inventory(req.body);
        await item.save();
        res.status(201).json(item);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const updateInventory = async (req, res) => {
    try {
        let updateData = { ...req.body };

        // Handle image upload if present
        if (req.file) {
            const filename = req.file.originalname;
            const seaweedUrl = `http://localhost:8888/myimages/${filename}`;
            const form = new FormData();
            form.append('file', req.file.buffer, filename);

            await axios.post(seaweedUrl, form, {
                headers: form.getHeaders()
            });

            updateData.image = seaweedUrl;
        }

        const item = await Inventory.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!item) return res.status(404).json({ error: 'Item not found' });

        res.json(item);
    } catch (err) {
        console.error('Error updating inventory:', err);
        res.status(400).json({ error: err.message });
    }
};

const deleteInventory = async (req, res) => {
    try {
        const item = await Inventory.findByIdAndDelete(req.params.id);
        if (!item) return res.status(404).json({ error: 'Item not found' });
        res.json({ message: 'Item deleted' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// === MAINTENANCE CONTROLLERS ===
const createMaintenance = async (req, res) => {
    try {
        const maintenance = await Maintenance.create(req.body);

        await Inventory.findByIdAndUpdate(req.body.item, {
            lastMaintenance: req.body.last,
        });

        res.status(201).json(maintenance);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const getAllMaintenance = async (req, res) => {
    try {
        const maintenances = await Maintenance.find()
            .populate('item')
            .sort({ createdAt: -1 });

        res.status(200).json(maintenances);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};



// === REQUEST CONTROLLERS ===

// Student submits request
const createRequest = async (req, res) => {
    try {
        const {
            studentName,
            studentId,
            department,
            courseCode,
            courseName,
            instructor,
            reason,
            pickupDate,
            components
        } = req.body;

        // Optional: Validate Inventory quantity
        for (const item of components) {
            const inv = await Inventory.findById(item._id);
            if (!inv || inv.available < item.quantity) {
                return res.status(400).json({ error: `Insufficient stock for ${inv?.name || 'Unknown Component'}` });
            }
        }

        const newRequest = new Request({
            studentName,
            studentId,
            department,
            courseCode,
            courseName,
            instructor,
            reason,
            pickupDate,
            components: components.map(c => ({
                productId: c._id,
                quantity: c.quantity
            })),
            requestedBy: req.user._id
        });

        await newRequest.save();
        res.status(201).json({ message: 'Request submitted successfully.' });
    } catch (err) {
        console.error('Error creating request:', err);
        res.status(500).json({ error: 'Failed to submit request.' });
    }
};

// Get all pending requests (for HOD)
const getPendingRequests = async (req, res) => {
    if (req.user.role !== 'DepartmentHead') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        const requests = await Request.find({ approved: false })
            .populate('components.productId')
            .populate('requestedBy', 'username email');

        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch pending requests' });
    }
};

// Approve a request
const approveRequest = async (req, res) => {
    if (req.user.role !== 'DepartmentHead') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        const request = await Request.findById(req.params.id);

        if (!request) return res.status(404).json({ error: 'Request not found' });
        if (request.approved) return res.status(400).json({ error: 'Already approved' });

        request.approved = true;
        request.approvedBy = req.user._id;
        await request.save();

        res.json({ message: 'Request approved. Awaiting dispatch.', request });
    } catch (err) {
        console.error('Approval error:', err);
        res.status(500).json({ error: 'Failed to approve request' });
    }
};


// Dispatch a request (for StoreManager)

const dispatchRequest = async (req, res) => {
  if (req.user.role !== 'StoreManager') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const request = await Request.findById(req.params.id)
      .populate('components.productId')
      .session(session);

    if (!request) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Request not found' });
    }

    if (!request.approved) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Request not approved yet' });
    }

    if (request.dispatched) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Request already dispatched' });
    }

    const dispatchedItems = [];
    const unavailableItems = [];

    for (const item of request.components) {
      const inventoryItem = await Inventory.findById(item.productId._id).session(session);

      if (!inventoryItem || inventoryItem.available < item.quantity) {
        unavailableItems.push({
          name: item.productId.name,
          model: item.productId.model,
          requested: item.quantity,
          available: inventoryItem?.available || 0
        });
        continue;
      }

      // Deduct stock and mark item as dispatched
      inventoryItem.available -= item.quantity;
      await inventoryItem.save({ session });

      dispatchedItems.push(item);
    }

    // If at least one item dispatched, mark partial dispatch
    if (dispatchedItems.length > 0) {
      request.dispatched = true;
      request.dispatchedAt = new Date();
      request.components = dispatchedItems;
      await request.save({ session });
      await session.commitTransaction();
      session.endSession();

      return res.status(200).json({
        message: 'Partial dispatch completed',
        dispatched: dispatchedItems,
        backordered: unavailableItems
      });
    } else {
      await session.abortTransaction();
      return res.status(400).json({
        error: 'Insufficient stock for all requested items',
        backordered: unavailableItems
      });
    }

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Dispatch error:', err);
    return res.status(500).json({ error: 'Dispatch failed due to server error' });
  }
};


// === Store Manager - Get Approved Requests ===
const getApprovedRequests = async (req, res) => {
  if (req.user.role !== 'StoreManager') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const requests = await Request.find({ approved: true })
      .populate({
        path: 'components.productId',
        select: 'name model image', // or whatever fields you need
      })
      .populate({
        path: 'requestedBy',
        select: 'username email name', // make sure these exist in your User model
      });

    res.json(requests);
  } catch (err) {
    console.error('Fetch approved requests error:', err);
    res.status(500).json({ error: 'Failed to load approved requests' });
  }
};



module.exports = {
    // Product
    createProduct,
    getProducts,
    updateProduct,
    deleteProduct,
    // User
    createUser,
    getUsers,
    updateUser,
    deleteUser,
    // Order
    createOrder,
    getOrders,
    updateOrder,
    deleteOrder,
    createItem,
    approveOrder,
    deleteItem,
    // Inventory
    getInventory,
    addInventory,
    updateInventory,
    deleteInventory,
    // Maintenance
    createMaintenance,
    getAllMaintenance,
    //Request
    createRequest,
    getPendingRequests,
    approveRequest,
    dispatchRequest,
    getApprovedRequests
};
