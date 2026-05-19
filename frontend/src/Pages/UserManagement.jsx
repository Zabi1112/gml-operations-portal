import { useEffect, useState } from "react";
import axios from "axios";
import { API } from "../api";
import Layout from "../components/Layout.jsx";
import "./UserManagement.css";

function UserManagement() {
  const token = localStorage.getItem("token");

  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "VIEWER"
  });

  const auth = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };

  const loadUsers = async () => {
    try {
      const res = await axios.get(`${API}/users`, auth);
      setUsers(res.data);
    } catch (error) {
      console.log(error);
      alert("Failed to load users");
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const createUser = async (e) => {
    e.preventDefault();

    try {
      await axios.post(`${API}/users`, form, auth);
      setForm({
        name: "",
        email: "",
        password: "",
        role: "VIEWER"
      });
      loadUsers();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to create user");
    }
  };

  const toggleStatus = async (id, isActive) => {
    try {
      await axios.patch(
        `${API}/users/${id}/status`,
        { isActive: !isActive },
        auth
      );
      loadUsers();
    } catch (error) {
      alert("Failed to update status");
    }
  };

  const deleteUser = async (id) => {
    if (!confirm("Delete this user?")) return;

    try {
      await axios.delete(`${API}/users/${id}`, auth);
      loadUsers();
    } catch (error) {
      alert("Failed to delete user");
    }
  };

  return (
    <Layout title="User Management">
      <form className="user-form" onSubmit={createUser}>
        <input
          placeholder="Name"
          value={form.name}
          onChange={(e) =>
            setForm({ ...form, name: e.target.value })
          }
          required
        />

        <input
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) =>
            setForm({ ...form, email: e.target.value })
          }
          required
        />

        <input
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(e) =>
            setForm({ ...form, password: e.target.value })
          }
          required
        />

        <select
          value={form.role}
          onChange={(e) =>
            setForm({ ...form, role: e.target.value })
          }
        >
          <option value="ADMIN">ADMIN</option>
          <option value="EDITOR">EDITOR</option>
          <option value="VIEWER">VIEWER</option>
        </select>

        <button type="submit">Create User</button>
      </form>

      <div className="user-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.isActive ? "Active" : "Inactive"}</td>
                <td>
                  <button onClick={() => toggleStatus(u.id, u.isActive)}>
                    {u.isActive ? "Deactivate" : "Activate"}
                  </button>

                  <button
                    className="danger"
                    onClick={() => deleteUser(u.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

export default UserManagement;