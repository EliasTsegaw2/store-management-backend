const { Product, Order } = require('../models');

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

module.exports = {
    createOrder,
    getOrders,
    updateOrder,
    deleteOrder,
    approveOrder,
    createItem,
    deleteItem
};
