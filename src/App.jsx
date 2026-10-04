import { useEffect, useState } from "react";
import "./App.css";

// =========================
// API URL
// =========================

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

const API_URL = `${API_BASE_URL}/api/products`;
const LOGIN_URL = `${API_BASE_URL}/api/login`;
const LOGOUT_URL = `${API_BASE_URL}/api/logout`;

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [loggedIn, setLoggedIn] = useState(
    !!localStorage.getItem("access_token")
  );

  const [username, setUsername] = useState(
    localStorage.getItem("username") || ""
  );

  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    product_name: "",
    description: "",
    price: "",
    quantity: "",
  });

  // =========================
  // LOGIN
  // =========================

  const handleLoginChange = (e) => {
    setLoginForm({
      ...loginForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      setError("");

      const response = await fetch(LOGIN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(loginForm),
      });

      const result = await response.json();

      if (!response.ok || !result.status) {
        throw new Error(result.message || "Login failed.");
      }

      localStorage.setItem("access_token", result.tokens.access_token);
      localStorage.setItem("refresh_token", result.tokens.refresh_token);
      localStorage.setItem("username", result.user.username);

      setUsername(result.user.username);
      setLoggedIn(true);

      setLoginForm({
        username: "",
        password: "",
      });

      alert("Login successful!");
    } catch (err) {
      setError(err.message);
    }
  };

  // =========================
  // LOGOUT
  // =========================

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem("refresh_token");

      if (refreshToken) {
        await fetch(LOGOUT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            refresh_token: refreshToken,
          }),
        });
      }
    } catch (err) {
      console.log("Logout API error:", err);
    }

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("username");

    setLoggedIn(false);
    setUsername("");
    setProducts([]);
    setShowForm(false);
    setEditingId(null);
    setError("");
  };

  // =========================
  // GET PRODUCTS
  // =========================

  const fetchProducts = async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      setLoading(false);
      setLoggedIn(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const text = await response.text();

      let result;

      try {
        result = JSON.parse(text);
      } catch {
        throw new Error(
          "The server returned an invalid response. Check that LavaLust is running."
        );
      }

      if (response.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("username");

        setLoggedIn(false);
        setUsername("");
        setProducts([]);

        throw new Error("Your login session has expired. Please login again.");
      }

      if (!response.ok || !result.status) {
        throw new Error(result.message || "Failed to load products.");
      }

      setProducts(result.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loggedIn) {
      fetchProducts();
    } else {
      setLoading(false);
    }
  }, [loggedIn]);

  // =========================
  // FORM
  // =========================

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleAddClick = () => {
    setEditingId(null);

    setFormData({
      product_name: "",
      description: "",
      price: "",
      quantity: "",
    });

    setShowForm(true);
    setError("");
  };

  const handleEdit = (product) => {
    setEditingId(product.id);

    setFormData({
      product_name: product.product_name,
      description: product.description,
      price: product.price,
      quantity: product.quantity,
    });

    setShowForm(true);
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =========================
  // ADD / UPDATE
  // =========================

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("access_token");

    if (!token) {
      setError("You must login first.");
      setLoggedIn(false);
      return;
    }

    try {
      setError("");

      const isEditing = editingId !== null;

      const url = isEditing
        ? `${API_URL}/${editingId}`
        : API_URL;

      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_name: formData.product_name,
          description: formData.description,
          price: Number(formData.price),
          quantity: Number(formData.quantity),
        }),
      });

      const result = await response.json();

      if (response.status === 401) {
        await handleLogout();
        throw new Error("Your login session has expired. Please login again.");
      }

      if (!response.ok || !result.status) {
        throw new Error(
          result.message ||
            (isEditing
              ? "Failed to update product."
              : "Failed to add product.")
        );
      }

      alert(
        isEditing
          ? "Product updated successfully!"
          : "Product added successfully!"
      );

      setFormData({
        product_name: "",
        description: "",
        price: "",
        quantity: "",
      });

      setEditingId(null);
      setShowForm(false);

      fetchProducts();
    } catch (err) {
      setError(err.message);
    }
  };

  // =========================
  // DELETE
  // =========================

  const handleDelete = async (id, productName) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${productName}"?`
    );

    if (!confirmed) return;

    const token = localStorage.getItem("access_token");

    if (!token) {
      setError("You must login first.");
      setLoggedIn(false);
      return;
    }

    try {
      setError("");

      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (response.status === 401) {
        await handleLogout();
        throw new Error("Your login session has expired. Please login again.");
      }

      if (!response.ok || !result.status) {
        throw new Error(
          result.message || "Failed to delete product."
        );
      }

      alert("Product deleted successfully!");

      fetchProducts();
    } catch (err) {
      setError(err.message);
    }
  };

  // =========================
  // CANCEL
  // =========================

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);

    setFormData({
      product_name: "",
      description: "",
      price: "",
      quantity: "",
    });

    setError("");
  };

  // =========================
  // LOGIN SCREEN
  // =========================

  if (!loggedIn) {
    return (
      <div className="app">
        <header className="header">
          <h1>LavaLust React CRUD</h1>
          <p>Product Management System</p>
        </header>

        <main className="container">
          <div className="form-container login-container">
            <h2>Login</h2>
            <p>Login to access the product management system.</p>

            {error && (
              <div className="error">
                Error: {error}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Username</label>

                <input
                  type="text"
                  name="username"
                  value={loginForm.username}
                  onChange={handleLoginChange}
                  placeholder="Enter username"
                  required
                />
              </div>

              <div className="form-group">
                <label>Password</label>

                <input
                  type="password"
                  name="password"
                  value={loginForm.password}
                  onChange={handleLoginChange}
                  placeholder="Enter password"
                  required
                />
              </div>

              <button type="submit" className="save-button">
                Login
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  // =========================
  // PRODUCT SCREEN
  // =========================

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>LavaLust React CRUD</h1>
          <p>Product Management System</p>
        </div>

        <div className="user-section">
          <span>
            Logged in as: <strong>{username}</strong>
          </span>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="container">
        <div className="page-title">
          <div>
            <h2>Products</h2>
            <p>Products retrieved from LavaLust API</p>
          </div>

          <button
            className="add-button"
            onClick={handleAddClick}
          >
            + Add Product
          </button>
        </div>

        {showForm && (
          <div className="form-container">
            <h2>
              {editingId !== null
                ? "Edit Product"
                : "Add New Product"}
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Product Name</label>

                <input
                  type="text"
                  name="product_name"
                  value={formData.product_name}
                  onChange={handleChange}
                  placeholder="Enter product name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>

                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter product description"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Price</label>

                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Quantity</label>

                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="save-button"
                >
                  {editingId !== null
                    ? "Update Product"
                    : "Save Product"}
                </button>

                <button
                  type="button"
                  className="cancel-button"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {error && (
          <div className="error">
            Error: {error}
          </div>
        )}

        {loading && (
          <div className="message">
            Loading products...
          </div>
        )}

        {!loading && !error && (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Product Name</th>
                  <th>Description</th>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan="6">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id}>
                      <td>{product.id}</td>

                      <td>
                        <strong>
                          {product.product_name}
                        </strong>
                      </td>

                      <td>
                        {product.description}
                      </td>

                      <td>
                        ₱
                        {Number(product.price).toLocaleString()}
                      </td>

                      <td>
                        {product.quantity}
                      </td>

                      <td>
                        <button
                          className="edit-button"
                          onClick={() =>
                            handleEdit(product)
                          }
                        >
                          Edit
                        </button>

                        <button
                          className="delete-button"
                          onClick={() =>
                            handleDelete(
                              product.id,
                              product.product_name
                            )
                          }
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <button
          className="refresh-button"
          onClick={fetchProducts}
        >
          Refresh Products
        </button>
      </main>
    </div>
  );
}

export default App;