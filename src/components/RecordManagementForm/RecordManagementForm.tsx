'use client';

import { useEffect, useState } from 'react';
import './RecordManagementForm.css';
import SimpleCheckbox from '../UI/SimpleCheckbox/SimpleCheckbox';
import TextEditor from '../UI/TextEditor/TextEditor';
import { createRecord, updateRecord } from '@/app/actions';
import { ClientCrypto } from '@/modules/ClientCrypto';
import AnimatedLoader from '../UI/AnimatedLoader/AnimatedLoader';
import { _Record, Category } from '@/types/data';
import SimpleModal from '../UI/SimpleModal/SimpleModal';

export interface RecordManagementFormProps {

    openPasswordModal?: () => void;

    keyPassword?: string;
    editingData?: Partial<_Record>;
    defaultCategoryId: number | null;
    categories: Category[];
    onClose: () => void;
}

export default function RecordManagementForm({
    openPasswordModal,
    keyPassword,
    defaultCategoryId,
    editingData,
    categories,
    onClose }: RecordManagementFormProps) {
    const [isLoading, setLoading] = useState(false);
    const [title, setTitle] = useState('');

    const [categoryId, setCategoryId] = useState<number | null>(
        editingData ? (editingData.categoryId || null) : defaultCategoryId
    );
    const [isEncrypted, setEncrypted] = useState(true);
    const [content, setContent] = useState('');
    const [error, setError] = useState<string | null>(null);


    const [isModalOpened, setModalOpened] = useState(false);



    const decryptContent = async (content: string) => {
        if (keyPassword) {
            const res = await ClientCrypto.decrypt(content, keyPassword);
            if (res.success) {
                setContent(res.data);
            }
        }
    }

    useEffect(() => {
        setCategoryId(editingData ? (editingData.categoryId || null) : defaultCategoryId);
    }, [editingData, defaultCategoryId]);

    useEffect(() => {
        if (editingData) {
            if (editingData.title) setTitle(editingData.title);
            // if (editingData.categoryId !== undefined) setCategoryId((editingData.categoryId === null) ? '' : String(editingData.categoryId));
            if (editingData.isEncrypted !== undefined) setEncrypted(editingData.isEncrypted);
            if (editingData.content) {
                if (editingData.isEncrypted) {
                    decryptContent(editingData.content);
                } else setContent(editingData.content);
            }
        }
    }, [editingData]);

    const handleSubmit = async () => {
        if (!title.trim()) {
            setError("Введите название записи");
            return;
        }

        setLoading(true);
        setError(null);

        let data = content;
        try {
            if (isEncrypted) {
                if (!keyPassword) return openPasswordModal?.();

                data = await ClientCrypto.encrypt(data, keyPassword);
            }

            const parsedCategoryId = categoryId === null ? null : Number(categoryId);

            const res = (editingData && editingData.id) ? await updateRecord({
                recordId: editingData.id,

                title,
                categoryId: parsedCategoryId,
                content: data,
                isEncrypted
            }) : await createRecord({
                title,
                categoryId: parsedCategoryId,
                content: data,
                isEncrypted
            });

            if (res.success) {
                onClose();
            } else {
                setError(res.error || "Не удалось сохранить");
            }
        } catch (err) {
            console.error(err);
            setError("Ошибка при шифровании или отправке данных");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form className="record-management-form" onSubmit={(e) => e.preventDefault()}>
            {error && <div className="record-management-form__error">{error}</div>}

            <div className="record-management-form__block">
                <span className="record-management-form__label">Название:</span>
                <input
                    className="record-management-form__input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
            </div>

            <div className="record-management-form__block">
                <span className="record-management-form__label">Категория:</span>
                <select
                    className="record-management-form__select"
                    value={categoryId ?? ""}
                    onChange={(e) => setCategoryId(e.target.value === "" ? null : Number(e.target.value))}
                >
                    <option value="">Корневой каталог (Без категории)</option>

                    {categories.map(с => (
                        <option key={с.id} value={с.id}>
                            {с.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="record-management-form__block">
                <span className="record-management-form__label">Шифровать данные?</span>
                <SimpleCheckbox
                    // disabled={editingData !== undefined}
                    checked={isEncrypted ? true : false}
                    onSelect={(v) => {
                        if (editingData) {
                            setModalOpened(true);
                        } else setEncrypted(v);
                    }}
                />
            </div>

            <div className="record-management-form__block content-block">
                <TextEditor
                    initialValue={content}
                    className="record-management-form__text-editor"
                    onChange={(v) => setContent(v)}
                />
            </div>

            <div className="record-management-form__block actions-block">
                <button
                    type="button"
                    className={`record-management-form__button ${isLoading ? 'loading' : ''}`}
                    disabled={isLoading}
                    onClick={handleSubmit}
                >
                    {isLoading ? (
                        <>
                            <AnimatedLoader />
                            <span>Сохранение</span>
                        </>
                    ) : "Сохранить"}
                </button>

                <button
                    type="button"
                    className="record-management-form__button button--cancel"
                    onClick={onClose}
                    disabled={isLoading}
                >
                    Отмена
                </button>
            </div>
            {isModalOpened && <SimpleModal
                type="confirm"
                title={(isEncrypted) ? "Отключить шифрование для текущей записи?" : "Включить шифрование для текущей записи?"}
                onConfirm={() => {
                    setEncrypted(p => !p);
                    setModalOpened(false);
                }}
                onCancel={() => setModalOpened(false)}
            />}
        </form>
    )
}