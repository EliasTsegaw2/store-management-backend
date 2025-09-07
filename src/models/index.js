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
  displayName: { type: String },
  photo: { type: String }, // Profile image URL
  phone: { type: String },
  address: {
    country: String,
    city: String,
    street: String,
    postalCode: String
  },
  role: {
    type: String,
    enum: ['ARA', 'Lecturer', 'DepartmentHead', 'StoreManager', 'Student'],
    default: 'Student',
    required: true
  },
  // Student-specific
  studentId: { type: String },
  department: { type: String },
  courseCode: { type: String },
  yearOfStudy: { type: String },
  // Staff-specific
  employeeId: { type: String },
  position: { type: String },
  officeLocation: { type: String },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date }
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
  model: { type: String, required: true },
  total: { type: Number, required: true, default: 0 },
  available: { type: Number, required: true, default: 0 },
  reserved: { type: Number, required: true, default: 0 }, // NEW: reserved for approved requests
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
  pdfUrl: { type: String },
  location: locationSchema,
  description: { type: String },
  lastMaintenance: { type: Date },
}, { timestamps: true });

// Ensure available + reserved <= total
inventorySchema.pre('save', function (next) {
  if (this.available + this.reserved > this.total) {
    return next(new Error('Available + Reserved cannot exceed Total.'));
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

// Request Schema 
const requestSchema = new mongoose.Schema({
  // Who requested
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requesterRole: {
    type: String,
    enum: ['ARA', 'Lecturer', 'DepartmentHead', 'StoreManager', 'Student'],
    required: true
  },

  // Student fields (optional for non-students)
  studentName: { type: String },
  studentId: { type: String },
  department: { type: String },
  courseCode: { type: String },
  courseName: { type: String },
  instructor: { type: String },
  pickupDate: { type: Date },

  // Common fields
  reason: { type: String, required: true },
  duration: { type: String }, // For ARA/Lecturer borrowing duration

  // Line items and life-cycle quantities
  components: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
    quantity: { type: Number, required: true, min: 0 },
    allocated: { type: Number, default: 0, min: 0 },   // NEW
    dispatched: { type: Number, default: 0, min: 0 },  // NEW
    returned: { type: Number, default: 0, min: 0 }
  }],

  // Approval
  approved: { type: Boolean, default: false },         // NEW
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // NEW

  // Dispatch
  dispatched: { type: Boolean, default: false },       // NEW
  dispatchedAt: { type: Date },                        // NEW

  // Status
  status: {
    type: String,
    enum: [
      'PendingApproval',
      'Approved',
      'PartiallyAllocated',
      'Allocated',
      'PartiallyDispatched',
      'Dispatched',
      'PartiallyReturned',   // NEW
      'Completed',
      'Cancelled'
    ],
    default: 'PendingApproval'
  },

  // Returns
  returned: { type: Boolean, default: false },
  returnedAt: { type: Date },
  returnNote: { type: String },

  // Allocation hold window
  allocationExpiresAt: { type: Date },
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
