'use client';

import { Category, User, _Record } from "@/types/data";
import RecordsList from "../RecordsList/RecordsList";
import "./MainApp.css";
import { useEffect, useState } from "react";
import RecordManagementForm from "../RecordManagementForm/RecordManagementForm";
import SimpleModal from "../UI/SimpleModal/SimpleModal";
import { ClientCrypto } from "@/modules/ClientCrypto";
import { deleteRecord, createCategory, deleteCategory } from "@/app/actions";
import UserDataEditor from "../UserDataEditor/UserDataEditor";
import AppNavigation from "../AppNavigation/AppNavigation";

export type MainAppProps = ({
    action: "user_settings";
    userData: User;
} | {
    action?: "main_app";
    categories: Category[];
    records: _Record[];
    userData: User;
}) & {
    setCurrentUrl: (data: string) => void;
};

export type MainAppAction = "default" | "record-creation" | "record-editor" | "category-creation" | "user-settings";

const ActionTranslations: Record<MainAppAction, string> = {
    default: "Interactive Info Manager",
    "record-creation": "Новая запись",
    "record-editor": "Редактирование записи",
    "category-creation": "Создание категории",
    "user-settings": "Настройки аккаунта"
}

export default function MainApp(props: MainAppProps) {
    const [keyPassword, setKeyPassword] = useState<string | null>(null);
    const [currentAction, setCurrentAction] = useState<MainAppAction>(((props.action === 'user_settings') ? 'user-settings' : 'default'));
    const [editingRecordData, setEditingRecordData] = useState<Partial<_Record> | null>(null);

    useEffect(() => {
        setCurrentAction(((props.action === 'user_settings') ? 'user-settings' : 'default'));
    }, [props.action])

    const [isModalOpened, setModalOpened] = useState(false);
    const [dataToOpen, setDataToOpen] = useState<_Record | null>(null);

    const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
    const [isLoading, setLoading] = useState(false);

    const handleRecordSelect = async (data: _Record, keyPass?: string) => {
        const pass = (keyPass || keyPassword);

        if (data.isEncrypted && (!pass || !(await ClientCrypto.decrypt(data.content, pass)).success)) {
            setDataToOpen(data);
            setModalOpened(true);
        } else {
            setEditingRecordData(data);
            setCurrentAction('record-editor');
        }
    }

    const handleRecordDelete = async (data: _Record) => {
        await deleteRecord(data.id);
    }

    const handleCategoryDelete = async (id: number) => {
        await deleteCategory(id);
    }

    const handleCategoryCreate = async (categoryName: string) => {
        if (!categoryName.trim()) return;

        setLoading(true);
        const res = await createCategory(categoryName, activeCategoryId);
        setLoading(false);

        if (res.success) {
            setCurrentAction('default');
        } else {
            alert(res.error || "Не удалось создать категорию");
        }
    }

    const validateKeyPassword = async (value: string) => {
        // if (login.trim().length < 5) {
        //     setError("Логин должен быть длиннее, чем 4 символа");
        //     return;
        // }

        setLoading(true);
        // setError(null);

        // let data = currentKeyPassword;
        try {
            if (!value) return false;

            if (props.userData.keyPassword) {
                const data = await ClientCrypto.decrypt(props.userData.keyPassword, value);

                // const res = await updateUserData(editingData.id, {
                // keyPassword: data,
                // });

                // alert(data.success)
                if (data.success && data.data === value) {
                    // setCurrentKeyPassword(data.data);
                    setKeyPassword(data.data);
                    setModalOpened(false);
                    return true;
                } else {
                    // setError("Неправильный ключ-пароль!");
                    setModalOpened(false);
                    return false;
                }
            } else {
                return false;
                // const data = await ClientCrypto.encrypt(value, value);

                // const res = await updateUserData(editingData.id, {
                //     keyPassword: data,
                // });

                // if (res.success) {
                //     setKeyPassword(value);
                //     // setCurrentKeyPassword(value);
                //     setModalOpened(false);
                // } else {
                //     // setError(res.error || "Не удалось сохранить");
                // }
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
            return false;
            // setError("Ошибка при шифровании или отправке данных");
        } finally {
            setLoading(false);
        }
    }

    const renderElements = (action: MainAppAction) => {
        if (props.action === 'user_settings') return (
            <UserDataEditor keyPassword={keyPassword} editingData={props.userData} setKeyPassword={setKeyPassword} />
        );
        if (action === 'default') {
            const filtered = (keyPassword) ? props.records : props.records.filter(r => !r.isEncrypted);
            return (
                <>
                    <RecordsList
                        categories={props.categories}
                        records={filtered}
                        showEncrypted={!!keyPassword}
                        onSelect={handleRecordSelect}
                        onDelete={handleRecordDelete}
                        onDeleteCategory={handleCategoryDelete}
                        validateInputText={validateKeyPassword}
                        onCategoryChange={(id) => setActiveCategoryId(id)}
                    />
                    <div className="main-app__buttons">
                        <button
                            className="main-app__button"
                            onClick={() => setCurrentAction('record-creation')}
                        >
                            Создать запись
                        </button>
                        <button
                            className="main-app__button main-app__button--secondary"
                            onClick={() => setCurrentAction('category-creation')}
                        >
                            Создать категорию
                        </button>
                        {/* <button
                        className="main-app__button main-app__button--secondary"
                        onClick={() => setCurrentAction('category-creation')}
                    >
                        Загрузить с устройства
                    </button> */}
                    </div>
                </>
            );
        };

        if (action === 'record-creation') return (
            <RecordManagementForm
                keyPassword={keyPassword || undefined}
                categories={props.categories}
                onClose={() => setCurrentAction('default')}
                defaultCategoryId={activeCategoryId}
                openPasswordModal={() => {
                    setDataToOpen(null);
                    setModalOpened(true);
                }}
            />
        );

        if (action === 'record-editor') return (
            <RecordManagementForm
                keyPassword={keyPassword || undefined}
                defaultCategoryId={activeCategoryId}
                editingData={editingRecordData || undefined}
                categories={props.categories}
                onClose={() => {
                    setEditingRecordData(null);
                    setCurrentAction('default');
                }}
                openPasswordModal={() => {
                    setDataToOpen(null);
                    setModalOpened(true);
                }}
            />
        );

        if (action === 'category-creation') return (
            <SimpleModal
                type="prompt"
                title={
                    activeCategoryId
                        ? `Создать подкатегорию в "${props.categories.find(c => c.id === activeCategoryId)?.name}":`
                        : "Создать категорию в корневом каталоге:"
                }
                // placeholder="Название категории..."
                confirmBtnText="Создать"
                cancelBtnText="Отмена"
                disableButtons={isLoading}
                onConfirm={handleCategoryCreate}
                onCancel={() => setCurrentAction('default')}
            />
        );
    }


    // if (props.action === 'user_settings')

    return (
        <div className="main-app">
            {/* <AppNavigation /> */}
            {currentAction !== 'category-creation' && (
                (currentAction !== 'default') && <h1 className="main-app__title">{ActionTranslations[currentAction]}</h1>
            )}
            {renderElements(currentAction)}
            {isModalOpened && <SimpleModal
                // type="prompt"
                type="confirm"
                title="Данная запись зашифрована! Пожалуйста, введите ключ-пароль в настройках аккаунта!"
                // title="Введите ключ-пароль:"
                onConfirm={() => {
                    props.setCurrentUrl('/settings');
                    // setKeyPassword(value);
                    setModalOpened(false);
                    // if (dataToOpen) handleRecordSelect(dataToOpen, value);
                }}
                onCancel={() => setModalOpened(false)}
            />}
        </div>
    )
}