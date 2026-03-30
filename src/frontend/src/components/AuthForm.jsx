import { useState } from "react";
import { Link } from "react-router-dom";

export default function AuthForm({ title, fields, onSubmit, linkText, linkTo }) {
  const [formData, setFormData] = useState(
    Object.fromEntries(fields.map(f => [f.name, ""]))
  );

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
          Teach<span>View</span>
        </div>

        <h1 className="auth-title">{title}</h1>
        <p className="auth-subtitle">
          {title === "Войти" ? "Войдите в свой аккаунт" : "Создайте новый аккаунт"}
        </p>

        <form onSubmit={handleSubmit}>
          {fields.map(field => (
            <div key={field.name} className="input-group">
              <input
                className="input"
                name={field.name}
                type={field.type || "text"}
                placeholder={field.placeholder}
                value={formData[field.name]}
                onChange={handleChange}
                required
              />
            </div>
          ))}
          <button type="submit" className="btn btn-primary btn-lg">
            {title}
          </button>
        </form>

        <div className="auth-link">
          <Link to={linkTo}>{linkText}</Link>
        </div>
      </div>
    </div>
  );
}
