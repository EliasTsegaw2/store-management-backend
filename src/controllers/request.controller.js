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

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const request = await Request.findById(req.params.id).session(session).populate('components.productId');
    if (!request) { await session.abortTransaction(); return res.status(404).json({ error: 'Request not found' }); }
    if (request.approved) { await session.abortTransaction(); return res.status(400).json({ error: 'Already approved' }); }

    // Attempt to allocate (reserve) stock
    let allFullyAllocated = true;
    for (const item of request.components) {
      const inv = await Inventory.findById(item.productId._id).session(session);
      if (!inv) continue;

      const remainingToAllocate = Math.max(0, item.quantity - (item.allocated || 0));
      if (remainingToAllocate <= 0) continue;

      const canAllocate = Math.min(inv.available, remainingToAllocate);
      if (canAllocate > 0) {
        inv.available -= canAllocate;
        inv.reserved += canAllocate;
        await inv.save({ session });

        item.allocated = (item.allocated || 0) + canAllocate;
      }

      if (item.allocated < item.quantity) {
        allFullyAllocated = false;
      }
    }

    request.approved = true;
    request.approvedBy = req.user._id;
    request.status = allFullyAllocated
      ? 'Allocated'
      : (request.components.some(i => i.allocated > 0) ? 'PartiallyAllocated' : 'Approved');

    // Optional: allocations expire in 48h if not collected
    request.allocationExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await request.save({ session });
    await session.commitTransaction();
    session.endSession();

    // Build backorder info for client UX
    const backordered = request.components
      .filter(i => (i.quantity - (i.allocated || 0)) > 0)
      .map(i => ({
        productId: i.productId._id,
        name: i.productId.name,
        model: i.productId.model,
        requested: i.quantity,
        allocated: i.allocated,
        backordered: i.quantity - i.allocated
      }));

    return res.json({ message: 'Request approved', status: request.status, request, backordered });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Approval error:', err);
    return res.status(500).json({ error: 'Failed to approve request' });
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

    if (!request) { await session.abortTransaction(); return res.status(404).json({ error: 'Request not found' }); }
    if (!request.approved) { await session.abortTransaction(); return res.status(400).json({ error: 'Request not approved yet' }); }
    if (request.dispatched) { await session.abortTransaction(); return res.status(400).json({ error: 'Request already dispatched' }); }

    const dispatchedItems = [];
    for (const item of request.components) {
      const inv = await Inventory.findById(item.productId._id).session(session);
      if (!inv) continue;

      const toDispatch = Math.min(item.allocated || 0, item.quantity - (item.dispatched || 0));
      if (toDispatch > 0) {
        // reserved -> issued: reduce reserved only
        if (inv.reserved < toDispatch) {
          // Invariant breach; fallback: do nothing for this line
          continue;
        }
        inv.reserved -= toDispatch;
        await inv.save({ session });

        item.dispatched = (item.dispatched || 0) + toDispatch;
        item.allocated = Math.max(0, (item.allocated || 0) - toDispatch);

        dispatchedItems.push({
          productId: item.productId._id,
          name: item.productId.name,
          model: item.productId.model,
          quantity: toDispatch
        });
      }
    }

    const fullyDispatched = request.components.every(i => (i.dispatched || 0) >= i.quantity);
    const anyDispatched = dispatchedItems.length > 0;

    if (anyDispatched) {
      request.dispatched = fullyDispatched;
      request.dispatchedAt = new Date();
      request.status = fullyDispatched ? 'Dispatched' : 'PartiallyDispatched';
      await request.save({ session });

      await session.commitTransaction();
      session.endSession();

      const backordered = request.components
        .filter(i => (i.quantity - (i.dispatched || 0)) > 0)
        .map(i => ({
          productId: i.productId._id,
          name: i.productId.name,
          model: i.productId.model,
          remaining: i.quantity - (i.dispatched || 0)
        }));

      return res.status(200).json({
        message: fullyDispatched ? 'Dispatch completed' : 'Partial dispatch completed',
        dispatched: dispatchedItems,
        backordered
      });
    } else {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'No allocated items available to dispatch' });
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

const returnRequest = async (req, res) => {
  // Typically StoreManager handles returns; adjust roles as needed
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

    // OLD (blocks partial returns):
    // if (!request.dispatched) {
    //   await session.abortTransaction();
    //   return res.status(400).json({ error: 'Request not dispatched yet' });
    // }

    // NEW: allow returns if any line has dispatched > returned
    const hasReturnable = request.components.some(
      c => (c.dispatched || 0) > (c.returned || 0)
    );
    if (!hasReturnable) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Nothing dispatched to return yet' });
    }

    // items optional: if omitted, return all remaining (dispatched - returned)
    const items = Array.isArray(req.body?.items) ? req.body.items : null;
    const note = req.body?.returnNote || '';

    const returnedItems = [];
    const errors = [];

    for (const comp of request.components) {
      const inv = await Inventory.findById(comp.productId._id).session(session);
      if (!inv) {
        errors.push({ productId: String(comp.productId._id), error: 'Inventory not found' });
        continue;
      }

      // Remaining returnable is based on dispatched, not requested
      const remainingReturnable = Math.max(0, (comp.dispatched || 0) - (comp.returned || 0));

      // Determine target return quantity
      let wanted = remainingReturnable; // default: return all remaining dispatched
      if (items) {
        const match = items.find(i => String(i.productId) === String(comp.productId._id));
        wanted = match ? Number(match.quantity || 0) : 0;
      }

      // Clamp to remaining returnable
      const toReturn = Math.max(0, Math.min(wanted, remainingReturnable));
      if (toReturn <= 0) continue;

      // Guard: available must not exceed total
      const allowedByTotal = Math.max(0, inv.total - inv.available);
      const effectiveReturn = Math.min(toReturn, allowedByTotal);
      if (effectiveReturn <= 0) {
        errors.push({ productId: String(comp.productId._id), error: 'Cannot increase available beyond total' });
        continue;
      }

      comp.returned = (comp.returned || 0) + effectiveReturn;
      inv.available += effectiveReturn;
      await inv.save({ session });

      returnedItems.push({
        productId: comp.productId._id,
        name: comp.productId.name,
        model: comp.productId.model,
        returned: effectiveReturn
      });
    }

    if (returnedItems.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'No valid quantities to return', errors });
    }

    // Fully returned when all dispatched quantities have been returned
    const fullyReturned = request.components.every(
      c => (c.returned || 0) >= (c.dispatched || 0)
    );

    request.returned = fullyReturned;
    if (fullyReturned) {
      request.returnedAt = new Date();
      request.status = 'Completed'; // <- mark lifecycle done
    } else if (returnedItems.length > 0) {
      request.status = 'PartiallyReturned'; // <- reflect partial return
    }
    if (note) request.returnNote = note;
    await request.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Outstanding still returnable = dispatched - returned
    const outstanding = request.components
      .map(c => ({
        productId: c.productId._id,
        name: c.productId.name,
        model: c.productId.model,
        remainingToReturn: Math.max(0, (c.dispatched || 0) - (c.returned || 0))
      }))
      .filter(x => x.remainingToReturn > 0);

    return res.status(200).json({
      message: request.returned ? 'All dispatched items returned' : 'Partial return recorded',
      returned: returnedItems,
      outstanding,
      errors
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Return error:', err);
    return res.status(500).json({ error: 'Return failed due to server error' });
  }
};

module.exports = {
    createRequest,
    getPendingRequests,
    approveRequest,
    dispatchRequest,
    getApprovedRequests,
    returnRequest, // NEW
};
