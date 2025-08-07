const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Product Schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  description: { type: String },
  imageUrls: [{ type: String }],
}, { timestamps: true });

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  googleId: { type: String },
  displayName: { type: String },
  role: {
    type: String,
    enum: ['ARA', 'Lecturer', 'DepartmentHead', 'StoreManager', 'Student'],
    default: 'Student',
    required: true
  }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Order Schema
const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
  }],
  totalAmount: { type: Number, required: true },
  approvedByHOD: { type: Boolean, default: false },
}, { timestamps: true });

// Inventory Schema (umbrella for both components & equipment)
const locationSchema = new mongoose.Schema({
  building: { type: String },
  room: { type: String },
  shelf: { type: String },
}, { _id: false });

const inventorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  model: { type: String, required: true, unique: true },
  total: { type: Number, required: true, default: 0 },
  available: { type: Number, required: true, default: 0 },
  type: {
    type: String,
    enum: ['component', 'equipment'],
    required: true
  },
  condition: {
    type: String,
    enum: ['New', 'Good', 'Worn', 'Damaged'],
    default: 'Good'
  },
  imageUrl: { type: String },
  location: locationSchema,
  description: { type: String },
  lastMaintenance: { type: Date },
}, { timestamps: true });

// Validation to ensure available does not exceed total
inventorySchema.pre('save', function (next) {
  if (this.available > this.total) {
    return next(new Error('Available quantity cannot exceed total quantity.'));
  }
  next();
});
// Maintenance Schema
const maintenanceSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
  type: { type: String, enum: ['Calibration', 'Maintenance'], required: true },
  last: { type: Date, required: true },
  next: { type: Date, required: true },
  actions: { type: String, enum: ['Scheduled', 'Completed'], default: 'Scheduled' },
}, { timestamps: true });

//Reqiest Schema 
const requestSchema = new mongoose.Schema({
  studentName: { type: String, required: true },
  studentId: { type: String, required: true },
  department: { type: String, required: true },
  courseCode: { type: String },
  courseName: { type: String },
  instructor: { type: String },
  reason: { type: String, required: true },
  pickupDate: { type: Date, required: true },
  components: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
    quantity: { type: Number, required: true },
  }],
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approved: { type: Boolean, default: false },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dispatched: { type: Boolean, default: false },     
  dispatchedAt: { type: Date },
}, { timestamps: true });


// Model Registration
const Product = mongoose.model('Product', productSchema);
const User = mongoose.model('User', userSchema);
const Order = mongoose.model('Order', orderSchema);
const Inventory = mongoose.model('Inventory', inventorySchema);
const Maintenance = mongoose.model('Maintenance', maintenanceSchema);
const Request = mongoose.model('Request', requestSchema);

module.exports = {
  Product,
  User,
  Order,
  Inventory,
  Maintenance,
  Request
};
