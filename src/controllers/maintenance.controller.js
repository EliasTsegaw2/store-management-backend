const { Maintenance, Inventory } = require('../models');

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

module.exports = {
    createMaintenance,
    getAllMaintenance,
};