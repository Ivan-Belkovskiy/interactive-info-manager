'use client';

import { Category, _Record } from "@/types/data";
import RecordsList from "../RecordsList/RecordsList";
import "./MainApp.css";
import { useState } from "react";
import RecordManagementForm from "../RecordManagementForm/RecordManagementForm";
import SimpleModal from "../UI/SimpleModal/SimpleModal";
import { ClientCrypto } from "@/modules/ClientCrypto";
import { deleteRecord, createCategory, deleteCategory } from "@/app/actions";

export interface MainAppProps {
    categories: Category[];
    records: _Record[];
}

export type MainAppAction = "default" | "record-creation" | "record-editor" | "category-creation";

const ActionTranslations: Record<MainAppAction, string> = {
    default: "Interactive Info Manager",
    "record-creation": "Новая запись",
    "record-editor": "Редактирование записи",
    "category-creation": "Создание категории"
}

export default function MainApp({ categories, records }: MainAppProps) {
    const [keyPassword, setKeyPassword] = useState<string | null>(null);
    const [currentAction, setCurrentAction] = useState<MainAppAction>('default');
    const [editingRecordData, setEditingRecordData] = useState<Partial<_Record> | null>(null);
    
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

    const renderElements = (action: MainAppAction) => {
        if (action === 'default') return (
            <>
                <RecordsList
                    categories={categories}
                    records={records}
                    onSelect={handleRecordSelect}
                    onDelete={handleRecordDelete}
                    onDeleteCategory={handleCategoryDelete}
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
                </div>
            </>
        );

        if (action === 'record-creation') return (
            <RecordManagementForm
                keyPassword={keyPassword || undefined}
                categories={categories}
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
                categories={categories}
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
                        ? `Создать подкатегорию в "${categories.find(c => c.id === activeCategoryId)?.name}":`
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

    return (
        <div className="main-app">
            {currentAction !== 'category-creation' && (
                <h1 className="main-app__title">{ActionTranslations[currentAction]}</h1>
            )}
            {renderElements(currentAction)}
            {isModalOpened && <SimpleModal
                type="prompt"
                title="Введите ключ-пароль:"
                onConfirm={(value) => {
                    setKeyPassword(value);
                    setModalOpened(false);
                    if (dataToOpen) handleRecordSelect(dataToOpen, value);
                }}
                onCancel={() => setModalOpened(false)}
            />}
        </div>
    )
}