'use client';

import { useState, useMemo } from "react";
import "./RecordsList.css";
import { Category, _Record } from '@/types/data';
import { formatDate } from '@/utils/date';
import SimpleModal from "../UI/SimpleModal/SimpleModal";

type ViewMode = "categories" | "records";

export default function RecordsList({
    categories,
    records,
    onSelect,
    onDelete,
    onDeleteCategory,
    onCategoryChange
}: {

    categories: Category[];
    records: _Record[];
    onSelect?: (data: _Record) => void;
    onDelete?: (data: _Record) => void;
    onDeleteCategory?: (id: number) => void;
    onCategoryChange?: (categoryId: number | null) => void;
}) {
    const [isLoading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>("categories");
    const [currentCategoryId, setCurrentCategoryId] = useState<number | null>(null);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState<{ data: _Record; } | null>(null);
    const [isDeleteCategoryModalOpen, setDeleteCategoryModalOpen] = useState<{ data: Category } | null>(null);

    const onConfirmDelete = async () => {
        if (isDeleteModalOpen) {
            setLoading(true);
            await onDelete?.(isDeleteModalOpen.data);
            setLoading(false);
            setDeleteModalOpen(null);
        }
    }

    const changeCategory = (id: number | null) => {
        setCurrentCategoryId(id);
        onCategoryChange?.(id);
    };

    const currentSubCategories = useMemo(() => {
        return categories.filter(cat => cat.parentId === currentCategoryId);
    }, [categories, currentCategoryId]);

    const currentFolderRecords = useMemo(() => {
        return records.filter(rec => rec.categoryId === currentCategoryId);
    }, [records, currentCategoryId]);

    const breadcrumbs = useMemo(() => {
        const crumbs: Category[] = [];
        let currentId = currentCategoryId;

        while (currentId) {
            const cat = categories.find(c => c.id === currentId);
            if (cat) {
                crumbs.unshift(cat);
                currentId = cat.parentId;
            } else {
                break;
            }
        }
        return crumbs;
    }, [categories, currentCategoryId]);

    return (
        <div className="records-list">
            <h2 className="records-list__title">Мои записи</h2>

            <div className="records-list__filters">
                <div className="records-list-filter">
                    <span className="records-list-filter__label">Отображать:</span>
                    <select
                        className="records-list-filter__select"
                        value={viewMode}
                        onChange={(e) => {
                            setViewMode(e.target.value as ViewMode);
                            changeCategory(null);
                        }}
                    >
                        <option value="categories">по категориям</option>
                        <option value="records">списком записей</option>
                    </select>
                </div>
            </div>

            {viewMode === "categories" && (
                <div className="records-list__breadcrumbs">
                    <span
                        className={`breadcrumb-item ${currentCategoryId === null ? 'active' : ''}`}
                        onClick={() => changeCategory(null)}
                    >
                        Корневой каталог
                    </span>
                    {breadcrumbs.map((crumb) => (
                        <span key={crumb.id} className="breadcrumb-wrapper">
                            <span className="breadcrumb-separator">/</span>
                            <span
                                className={`breadcrumb-item ${currentCategoryId === crumb.id ? 'active' : ''}`}
                                onClick={() => changeCategory(crumb.id)}
                            >
                                {crumb.name}
                            </span>
                        </span>
                    ))}
                </div>
            )}

            <div className="records-list__data">
                {viewMode === "categories" && (
                    <>
                        {currentCategoryId !== null && (
                            <div
                                className="records-list-item folder-up"
                                onClick={() => {
                                    const currentCat = categories.find(c => c.id === currentCategoryId);
                                    changeCategory(currentCat?.parentId || null);
                                }}
                            >
                                <span className="records-list-item__name"> .. (Назад)</span>
                            </div>
                        )}

                        {currentSubCategories.map(category => (
                            <div
                                className="records-list-item type-folder"
                                key={category.id}
                                // onClick={() => changeCategory(category.id)}
                            >
                                <div className="records-list-item__left" onClick={() => changeCategory(category.id)}>
                                    <span className="records-list-item__name">{category.name}</span>
                                </div>
                                <div className="records-list-item__right">
                                    <button
                                        className="records-list-item__button"
                                        onClick={() => setDeleteCategoryModalOpen({ data: category })}
                                    >Удалить категорию</button>
                                    {/* <span className="records-list-item__hint">КАТЕГОРИЯ</span> */}
                                </div>
                            </div>
                        ))}

                        {currentFolderRecords.map(r => (
                            <RecordRow
                                key={r.id}
                                record={r}
                                onSelect={onSelect}
                                onDelete={(data) => setDeleteModalOpen({ data })}
                            />
                        ))}

                        {currentSubCategories.length === 0 && currentFolderRecords.length === 0 && (
                            <p className="records-list__info">В данной категории нет записей!</p>
                        )}
                    </>
                )}

                {viewMode === "records" && (
                    records.length > 0 ? (
                        records.map(r => (
                            <RecordRow
                                key={r.id}
                                record={r}
                                onSelect={onSelect}
                                onDelete={(data) => setDeleteModalOpen({ data })}
                            />
                        ))
                    ) : (
                        <p className="records-list__info">Записей пока нет!</p>
                    )
                )}
            </div>

            {isDeleteModalOpen && (
                <SimpleModal
                    type="confirm"
                    title={`Удалить запись "${isDeleteModalOpen.data.title}"?`}
                    confirmBtnText="Удалить"
                    cancelBtnText="Отмена"
                    disableButtons={isLoading}
                    onConfirm={onConfirmDelete}
                    onCancel={() => setDeleteModalOpen(null)}
                />
            )}

            {isDeleteCategoryModalOpen && (
                <SimpleModal
                    type="confirm"
                    title={`Удалить категорию "${isDeleteCategoryModalOpen.data.name}"?`}
                    message="Содержимое категории будут перенесены на уровень выше"
                    confirmBtnText="Удалить"
                    cancelBtnText="Отмена"
                    disableButtons={isLoading}
                    onConfirm={() => {
                        onDeleteCategory?.(isDeleteCategoryModalOpen.data.id);
                        changeCategory(isDeleteCategoryModalOpen.data.parentId);
                        setDeleteCategoryModalOpen(null);
                    }}
                    onCancel={() => setDeleteCategoryModalOpen(null)}
                />
            )}
        </div>
    )
}

function RecordRow({
    record,
    onSelect,
    onDelete
}: {
    record: _Record;
    onSelect?: (data: _Record) => void;
    onDelete: (data: _Record) => void;
}) {
    return (
        <div className="records-list-item type-file">
            <div className="records-list-item__left" onClick={() => onSelect?.(record)}>
                <span className="records-list-item__name">{record.title}</span>
            </div>
            <div className="records-list-item__right">
                <div className="records-list-item__infobox lf">
                    <span className="records-list-item__label">Создана:</span>
                    <div className="records-list-item__value">{formatDate(record.createdAt)}</div>
                </div>
                <div className="records-list-item__infobox lf">
                    <span className="records-list-item__label">Отредактирована:</span>
                    <div className="records-list-item__value">{formatDate(record.updatedAt)}</div>
                </div>
                <div className="records-list-item__infobox">
                    <span className="records-list-item__label">Зашифрована:</span>
                    <div className="records-list-item__value">{record.isEncrypted ? "✔" : "⨉"}</div>
                </div>
                <button
                    className="records-list-item__button"
                    onClick={() => onDelete(record)}
                >
                    Удалить
                </button>
            </div>
        </div>
    );
}