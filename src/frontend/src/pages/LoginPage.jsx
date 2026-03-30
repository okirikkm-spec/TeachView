import { useNavigate } from "react-router-dom";
import AuthForm from "../components/AuthForm";
import { login, saveToken } from "../services/authApi";

const fields = [
    { name: "email", placeholder: "Email", type: "email" },
    { name: "password", placeholder: "Пароль", type: "password" },
]

export default function LoginPage(){
    const navigate = useNavigate();

    const handleSubmit = async ({ email, password }) => {
        const { token } = await login(email, password);
        saveToken(token);
        navigate("/");
    };
    
    return (
        <AuthForm
            title="Войти"
            fields={fields}
            onSubmit={handleSubmit}
            linkText="Нет аккаунта? Зарегистрируйтесь"
            linkTo="/register"
        />
    );
}