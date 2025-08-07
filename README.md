# Store Management Backend

This is a backend store management system built with Node.js and Express. It provides a RESTful API for managing products, users, and orders.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Contributing](#contributing)
- [License](#license)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/store-management-backend.git
   ```

2. Navigate to the project directory:
   ```
   cd store-management-backend
   ```

3. Install the dependencies:
   ```
   npm install
   ```

4. Create a `.env` file based on the `.env.example` file and fill in the required environment variables.

## Usage

To start the application, run:
```
npm start
```

The server will start on the specified port (default is 3000).

## API Endpoints

- **Products**
  - `GET /products` - Retrieve all products
  - `POST /products` - Create a new product
  - `PUT /products/:id` - Update a product
  - `DELETE /products/:id` - Delete a product

- **Users**
  - `GET /users` - Retrieve all users
  - `POST /users` - Create a new user
  - `PUT /users/:id` - Update a user
  - `DELETE /users/:id` - Delete a user

- **Orders**
  - `GET /orders` - Retrieve all orders
  - `POST /orders` - Create a new order
  - `PUT /orders/:id` - Update an order
  - `DELETE /orders/:id` - Delete an order

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License.