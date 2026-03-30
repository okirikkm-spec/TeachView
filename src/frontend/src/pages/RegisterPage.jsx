import { useNavigate } from "react-router-dom";
import AuthForm from "../components/AuthForm";
import { register, saveToken } from "../services/authApi";

const fields = [
    { name: "username", placeholder: "Имя пользователя" },
    { name: "email", placeholder: "Email", type: "email" },
    { name: "password", placeholder: "Пароль", type: "password" },
];

export default function RegisterPage() {
    const navigate = useNavigate();

    const handleSubmit = async ({ username, email, password }) => {
        const { token } = await register(username, email, password);
        saveToken(token);
        navigate("/");
    };

    return (
        <AuthForm
            title="Зарегистрироваться"
            fields={fields}
            onSubmit={handleSubmit}
            linkText="Уже есть аккаунт? Войти"
            linkTo="/login"
        />
    );
}
