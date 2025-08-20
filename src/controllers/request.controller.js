const mongoose = require('mongoose');
const { Request, Inventory } = require('../models');

const createRequest = async (req, res) => {
    try {
        const { role } = req.user;
        let newRequestData = {
            requestedBy: req.user._id,
            requesterRole: role // Store the user's role in the request
        };

        if (role === 'Student') {
            const {
                studentName, studentId, department, courseCode,
                courseName, instructor, reason, pickupDate, components
            } = req.body;

            // Validate required fields for students
            if (!studentName || !studentId || !department || !reason || !pickupDate || !components) {
                return res.status(400).json({ error: 'Missing required student fields.' });
            }

            for (const item of components) {
                const inv = await Inventory.findById(item._id);
                // Only allow components for students
                if (!inv || inv.type !== 'component' || inv.available < item.quantity) {
                    return res.status(400).json({ error: `Insufficient stock or not a component for ${inv?.name || 'Unknown Component'}` });
                }
            }

            newRequestData = {
                ...newRequestData,
                studentName, studentId, department, courseCode,
                courseName, instructor, reason, pickupDate,
                components: components.map(c => ({
                    productId: c._id,
                    quantity: c.quantity
                }))
            };
        } else if (role === 'Lecturer' || role === 'ARA') {
            const { reason, duration, components } = req.body;

            if (!reason || !components) {
                return res.status(400).json({ error: 'Missing required fields for lecturer/ARA.' });
            }

            for (const item of components) {
                const inv = await Inventory.findById(item._id);
                // Allow both components and equipment for Lecturer/ARA
                if (!inv || inv.available < item.quantity) {
                    return res.status(400).json({ error: `Insufficient stock for ${inv?.name || 'Unknown Item'}` });
                }
            }

            newRequestData = {
                ...newRequestData,
                reason,
                duration,
                components: components.map(c => ({
                    productId: c._id,
                    quantity: c.quantity
                }))
            };
        } else {
            return res.status(403).json({ error: 'Unauthorized request type.' });
        }

        const newRequest = new Request(newRequestData);
        await newRequest.save();
        res.status(201).json({ message: 'Request submitted successfully.' });
    } catch (err) {
        console.error('Error creating request:', err);
        res.status(500).json({ error: 'Failed to submit request.' });
    }
};

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

            inventoryItem.available -= item.quantity;
            await inventoryItem.save({ session });

            dispatchedItems.push(item);
        }

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

const getApprovedRequests = async (req, res) => {
    if (req.user.role !== 'StoreManager') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        const requests = await Request.find({ approved: true })
            .populate({ path: 'components.productId', select: 'name model image' })
            .populate({ path: 'requestedBy', select: 'username email name' });

        res.json(requests);
    } catch (err) {
        console.error('Fetch approved requests error:', err);
        res.status(500).json({ error: 'Failed to load approved requests' });
    }
};

module.exports = {
    createRequest,
    getPendingRequests,
    approveRequest,
    dispatchRequest,
    getApprovedRequests,
};
