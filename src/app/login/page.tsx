'use client';

import { useEffect, useState } from 'react';
import './page.css';
import { loginUser } from '../actions';

export default function LoginPage() {
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');

    const [isLoading, setLoading] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const onSubmit = async () => {
        try {
            setLoading(true);
            const res = await loginUser(login, password);
            if (res.success) {

            } else {
                setSubmitError(res.error);
            }
            setLoading(false);
        } catch (error) {
            setSubmitError('Неизвестная ошибка!');
        }
    };

    return (
        <div className="login-page">
            <form className="login-form" action={"#"}>
                <h1 className="login-form__title">Вход в систему</h1>
                <div className="login-form__block">
                    <span className="login-form__label">Логин:</span>
                    <input
                        type="text"
                        className="login-form__input"
                        value={login}
                        onChange={(e) => setLogin(e.target.value)}
                    />
                </div>
                <div className="login-form__block">
                    <span className="login-form__label">Пароль:</span>
                    <input
                        type="password"
                        className="login-form__input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
                <button
                    className={`login-form__button ${isLoading ? 'loading' : ''}`} onClick={onSubmit}
                    type="button"
                    disabled={isLoading}
                >Войти</button>
                {(submitError) && <div className="login-form__error">{submitError}</div>}
            </form>
        </div>
    )
}