'use client';

import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import './UserDataEditor.css';
import SimpleCheckbox from '../UI/SimpleCheckbox/SimpleCheckbox';
import TextEditor from '../UI/TextEditor/TextEditor';
import { createRecord, updateRecord, updateUserData } from '@/app/actions';
import { ClientCrypto } from '@/modules/ClientCrypto';
import AnimatedLoader from '../UI/AnimatedLoader/AnimatedLoader';
import { _Record, Category, User } from '@/types/data';
import SimpleModal from '../UI/SimpleModal/SimpleModal';
import ImportForm from '../ImportForm/ImportForm';

export interface UserDataEditorProps {

    openPasswordModal?: () => void;
    setKeyPassword?: Dispatch<SetStateAction<string | null>>;

    onKeyPasswordReplace?: (newKeyPassword: string) => void;

    keyPassword?: string | null;
    editingData?: Partial<User>;
    // onClose: () => void;
}

export default function UserDataEditor({
    openPasswordModal,
    keyPassword,
    setKeyPassword,
    editingData,
    onKeyPasswordReplace
    // onClose 
}: UserDataEditorProps) {
    const [isLoading, setLoading] = useState(false);
    const [login, setTitle] = useState('');
    const [currentKeyPassword, setCurrentKeyPassword] = useState<string | null>(null);

    const [isEncrypted, setEncrypted] = useState(true);
    const [content, setContent] = useState('');
    const [error, setError] = useState<string | null>(null);


    const [openedModal, setModalOpened] = useState<"enter-key-pass" | "replace-key-pass" | "data-export" | "data-import" | null>(null);



    const decryptContent = async (content: string) => {
        if (keyPassword) {
            const res = await ClientCrypto.decrypt(content, keyPassword);
            if (res.success) {
                setContent(res.data);
            }
        }
    }

    useEffect(() => {
        if (editingData) {
            if (editingData.login) setTitle(editingData.login);
            setCurrentKeyPassword(editingData.keyPassword || null);
        }
    }, [editingData]);

    const handleDataExport = async () => {
        const a = document.createElement('a');

        a.href = `/api/export?encrypted=${keyPassword ? true : false}`;

        a.click();

        a.remove();

        setModalOpened(null);
        // const res = await fetch('/api/export/');
        // const json = await res.json();

        // if (json.)
    }

    const handleSubmit = async (value: string) => {

        if (openedModal === 'replace-key-pass') {
            onKeyPasswordReplace?.(value);
            setModalOpened(null);
            return;
        }

        if (login.trim().length < 5) {
            setError("Логин должен быть длиннее, чем 4 символа");
            return;
        }

        setLoading(true);
        setError(null);

        // let data = currentKeyPassword;
        try {
            if (!value || !editingData?.id) return null;

            if (editingData.keyPassword) {
                const data = await ClientCrypto.decrypt(editingData.keyPassword, value);

                // const res = await updateUserData(editingData.id, {
                //     keyPassword: data,
                // });

                if (data.success && data.data === value) {
                    setCurrentKeyPassword(data.data);
                    setKeyPassword?.(data.data);
                    setModalOpened(null);
                } else {
                    setError("Неправильный ключ-пароль!");
                    setModalOpened(null);
                }
            } else {
                const data = await ClientCrypto.encrypt(value, value);

                const res = await updateUserData(editingData.id, {
                    keyPassword: data,
                });

                if (res.success) {
                    setCurrentKeyPassword(value);
                    setModalOpened(null);
                } else {
                    setError(res.error || "Не удалось сохранить");
                }
            }

            // const parsedCategoryId = categoryId === null ? null : Number(categoryId);

            // const res = (editingData && editingData.id) ? await updateRecord({
            //     recordId: editingData.id,

            //     title,
            //     categoryId: parsedCategoryId,
            //     content: data,
            //     isEncrypted
            // }) : await createRecord({
            //     title,
            //     categoryId: parsedCategoryId,
            //     content: data,
            //     isEncrypted
            // });


        } catch (err) {
            console.error(err);
            setError("Ошибка при шифровании или отправке данных");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="user-data-editor">

            <div className="user-data-section">
                <h2 className="user-data-section__title">Основная информация</h2>
                <div className="user-data-editor__block">
                    <span className="user-data-editor__label">Логин:</span>
                    <input
                        className="user-data-editor__input"
                        value={login}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                <div className="user-data-editor__block">
                    <span className="user-data-editor__label">Пароль для входа:</span>
                    <input
                        className="user-data-editor__input"
                        value="*******"
                        disabled
                    // onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                {(!currentKeyPassword || keyPassword) && <div className="user-data-editor__block">
                    <span className="user-data-editor__label">Ключ-пароль:</span>
                    {(currentKeyPassword) ? (
                        <>
                            {/* <input
                            className="user-data-editor__input"
                            value={keyPassword || "*******"}
                            disabled
                        // onChange={(e) => setTitle(e.target.value)}
                        /> */}
                            {(keyPassword) ? (
                                <>
                                    <button className={`user-data-editor__button inline-button correct-key-password`}>✔ Ключ-пароль введен!</button>
                                    <button className={`user-data-editor__button inline-button`} onClick={() => {
                                        setError(null);
                                        setModalOpened('replace-key-pass');
                                    }}>Заменить ключ-пароль</button>
                                    {/* <input type="text" className="user-data-editor__input" /> */}
                                </>
                            ) : (
                                <button className="user-data-editor__button inline-button" onClick={() => {
                                    setError(null);
                                    setModalOpened('enter-key-pass');
                                }}>Ввести ключ-пароль</button>
                            )
                            }
                        </>
                    ) : (
                        <button className="user-data-editor__button inline-button" onClick={() => {
                            setError(null);
                            setModalOpened('enter-key-pass');
                        }}>Создать ключ-пароль</button>
                    )}
                </div>}

                {error && <div className="user-data-editor__error">{error}</div>}

                {/* <div className="user-data-editor__block">
                <span className="user-data-editor__label">Шифровать данные?</span>
                <SimpleCheckbox
                    // disabled={editingData !== undefined}
                    checked={isEncrypted ? true : false}
                    onSelect={(v) => {
                        if (editingData) {
                            setModalOpened(true);
                        } else setEncrypted(v);
                    }}
                />
            </div> */}

                <div className="user-data-editor__block actions-block">
                    <button
                        type="button"
                        className={`user-data-editor__button ${isLoading ? 'loading' : ''}`}
                        disabled={isLoading}
                    // onClick={handleSubmit}
                    >
                        {isLoading ? (
                            <>
                                <AnimatedLoader />
                                <span>Сохранение...</span>
                            </>
                        ) : "Сохранить настройки"}
                    </button>
                </div>
            </div>

            <div className="user-data-section">
                <h2 className="user-data-section__title">Управление данными</h2>
                <div className="user-data-editor__block actions-block">
                    <button
                        type="button"
                        className={`user-data-editor__button ${isLoading ? 'loading' : ''}`}
                        onClick={() => setModalOpened('data-import')}
                        disabled={isLoading}
                    // onClick={handleSubmit}
                    >
                        Импорт данных из JSON
                    </button>
                    <button
                        type="button"
                        className={`user-data-editor__button ${isLoading ? 'loading' : ''}`}
                        onClick={() => setModalOpened('data-export')}
                        disabled={isLoading}
                    // onClick={handleSubmit}
                    >
                        Экспорт данных в JSON
                    </button>
                </div>
            </div>

            {openedModal === 'data-import' ? (
                <div className="import-modal">
                    <ImportForm onClose={() => setModalOpened(null)} />
                </div>
            ) : openedModal === 'data-export' ? (
                <SimpleModal
                    type="confirm"
                    title={"Экспортировать все записи в JSON?"}
                    // message={""}
                    onConfirm={handleDataExport}
                    onCancel={() => setModalOpened(null)}
                />
            ) : (openedModal) && <SimpleModal
                type="prompt"
                title={(editingData?.keyPassword && openedModal === 'enter-key-pass') ? "Введите ключ-пароль этого пользователя:" : "Введите новый ключ-пароль:"}
                message={(openedModal === 'replace-key-pass') ? 'Все имеющиеся зашифрованные записи будут перешифрованы новым ключом! Этот процесс может быть длительным!' : ''}
                onConfirm={handleSubmit}
                onCancel={() => setModalOpened(null)}
            />}

            
        </div>
    )
}