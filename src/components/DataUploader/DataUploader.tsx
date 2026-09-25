import { ChangeEvent, useRef, useState } from "react";
import "./DataUploader.css";
import SimpleCheckbox from "../UI/SimpleCheckbox/SimpleCheckbox";
import AnimatedLoader from "../UI/AnimatedLoader/AnimatedLoader";
import SimpleModal, { SimpleModalType } from "../UI/SimpleModal/SimpleModal";
import { ClientCrypto } from "@/modules/ClientCrypto";
import { RecordDataToUpload, uploadManyRecords } from "@/app/actions";
import { Category } from "@/types/data";

export interface DataUploaderProps {

    categories: Category[];

    keyPassword?: string | null;
    activeCategoryId?: number | null;

    onClose?: () => void;
}

export interface UploadedData {
    name: string;
    encrypt: boolean;
    file: File;
}

export interface UploadedDataFull {
    name: string;
    isEncrypted: boolean;
    content: string;
}

interface OpenedModalProps {
    isOpened: boolean;
    type: SimpleModalType;
    title?: string;
    message?: string;
    uploadData?: {
        dataList: UploadedDataFull[];
        progressCurrent: number;
        progressAll: number;
    };

    onConfirm?: () => void;
    onCancel?: () => void;
}

export default function DataUploader({
    categories,
    keyPassword,
    activeCategoryId,
    onClose
}: DataUploaderProps) {

    const [uploadedData, setUploadedData] = useState<UploadedData[]>([]);
    const [isLoading, setLoading] = useState(false);
    const [openedModalProps, setOpenedModalProps] = useState<OpenedModalProps>({ isOpened: false, type: "confirm" });
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const readFileContents = async (file: File) => new Promise<{ success: boolean; data?: string; error?: any }>(async (res, rej) => {
        const reader = new FileReader();

        reader.readAsText(file);

        reader.onload = () => res({ success: true, data: reader.result as string });

        reader.onerror = (ev) => res({ success: false, error: true });

    });

    const handleSubmit = async () => {
        // if (uploadedData.filter(d => d.encrypt).length > 0) return;

        const fullToUpload: RecordDataToUpload[] = [];

        let processed = 0,
            all = uploadedData.length;

        setOpenedModalProps({
            isOpened: true,
            type: "progress",
            title: "Шифрование и сохранение данных...",
            message: "Пожалуйста, не перезагружайте страницу до окончания процесса!",
            uploadData: {
                dataList: [],
                progressCurrent: processed,
                progressAll: all,
            },
        });

        for (let i = 0; i < uploadedData.length; i++) {
            const ent = uploadedData[i];
            const content = await readFileContents(ent.file);
            if (content.data) {

                if (ent.encrypt && !keyPassword) continue;

                let fullContent = (ent.encrypt) ? await ClientCrypto.encrypt(content.data, keyPassword as string) : content.data;

                fullToUpload.push({
                    title: ent.name,
                    isEncrypted: ent.encrypt,
                    categoryId: activeCategoryId || null,
                    content: fullContent,

                });

                processed++;

                setOpenedModalProps({
                    isOpened: true,
                    type: "progress",
                    title: "Шифрование и сохранение данных...",
                    message: "Пожалуйста, не перезагружайте страницу до окончания процесса!",
                    uploadData: {
                        dataList: [],
                        progressCurrent: processed,
                        progressAll: all,
                    },
                });
            }
        }

        const res = await uploadManyRecords(fullToUpload);

        if (res.success) {
            setOpenedModalProps({
                isOpened: true,
                type: "info",
                title: "Данные успешно сохранены!",
                onConfirm: () => setOpenedModalProps({ isOpened: false, type: "info" }),
            });
        } else {
            setOpenedModalProps({
                isOpened: true,
                type: "info",
                title: "Ошибка сохранения данных!",
                message: res.error,
                onConfirm: () => setOpenedModalProps({ isOpened: false, type: "info" }),
            });
        }
    }

    const updateEntryInfo = (index: number, data: Partial<UploadedData>) => {
        setUploadedData((p) => p.map((_, i) => (i === index) ? {
            ..._,
            ...data,
        } : _));
    }

    const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setUploadedData(
                [
                    ...uploadedData,
                    ...Array.from(e.target.files).map(file => ({
                        name: file.name,
                        encrypt: false,
                        file
                    }))
                ]
            );
        }
    }

    return (
        <div className="data-uploader">
            <div className="data-uploader__block">
                {(activeCategoryId) ? (
                    <>
                        <span className="data-uploader__label">В категории:</span>
                        <div className="data-uploader__value">{categories.find(c => c.id === activeCategoryId)?.name}</div>
                    </>
                ) : (
                    <span className="data-uploader__label">В корневом каталоге</span>
                )}
                {/* <select disabled className="data-uploader__select">

                </select> */}
            </div>
            <div className="data-uploader__uploads">
                <div className="data-uploader-item heading-item">
                    <div className="data-uploader-item__left">
                        <input type="text" className="data-uploader__input" placeholder="Название файла" disabled />
                    </div>
                    <div className="data-uploader-item__right">
                        {(keyPassword) && (
                            <>
                                <div className="data-uploader__block inline-type --mobile-only">
                                    {/* <span className="data-uploader__label">Шифровать все:</span> */}
                                    <SimpleCheckbox
                                        disabled={uploadedData.length === 0}
                                        onSelect={(v) => {
                                            setUploadedData(p => {
                                                if (p.filter(d => d.encrypt).length === p.length) {
                                                    return p.map(_ => ({ ..._, encrypt: false }));
                                                } else return p.map(_ => ({ ..._, encrypt: true }));
                                            });
                                        }}
                                        checked={(
                                            (uploadedData.filter(d => d.encrypt).length === uploadedData.length) && uploadedData.length > 0
                                        )}
                                    />
                                </div>
                                <div className="data-uploader__block inline-type --desktop-only">
                                    <span className="data-uploader__label --desktop-only">Шифровать все:</span>
                                    <SimpleCheckbox
                                        disabled={uploadedData.length === 0}
                                        onSelect={(v) => {
                                            setUploadedData(p => {
                                                if (p.filter(d => d.encrypt).length === p.length) {
                                                    return p.map(_ => ({ ..._, encrypt: false }));
                                                } else return p.map(_ => ({ ..._, encrypt: true }));
                                            });
                                        }}
                                        checked={(
                                            (uploadedData.filter(d => d.encrypt).length === uploadedData.length) && uploadedData.length > 0
                                        )}
                                    />
                                </div>
                            </>
                        )}
                        <button className="data-uploader__button inline --desktop-only" disabled>Удалить</button>
                        <button className="data-uploader__button inline --mobile-only" disabled>⨉</button>
                    </div>
                </div>
                {uploadedData.map((d, i) => (
                    <div className="data-uploader-item">
                        <div className="data-uploader-item__left">
                            <input type="text" className="data-uploader__input" value={d.name} onChange={(e) => {
                                updateEntryInfo(i, {
                                    name: e.target.value,
                                });
                            }} />
                        </div>
                        <div className="data-uploader-item__right">
                            {(keyPassword) && (
                                <>
                                    <div className="data-uploader__block inline-type --desktop-only">
                                        <span className="data-uploader__label">Шифровать:</span>
                                        <SimpleCheckbox
                                            onSelect={(v) => updateEntryInfo(i, {
                                                encrypt: v,
                                            })}
                                            checked={d.encrypt}
                                        />
                                    </div>
                                    <div className="data-uploader__block inline-type --mobile-only">
                                        {/* <span className="data-uploader__label">Шифровать:</span> */}
                                        <SimpleCheckbox
                                            onSelect={(v) => updateEntryInfo(i, {
                                                encrypt: v,
                                            })}
                                            checked={d.encrypt}
                                        />
                                    </div>
                                </>
                            )}
                            <button className="data-uploader__button inline --desktop-only" onClick={() => setUploadedData(p => (
                                p.filter((_, idx) => idx !== i)
                            ))}>Удалить</button>
                            <button className="data-uploader__button inline --mobile-only" onClick={() => setUploadedData(p => (
                                p.filter((_, idx) => idx !== i)
                            ))}>⨉</button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="data-uploader__block actions-block">
                <button
                    type="button"
                    className="data-uploader__button button--cancel"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                >
                    Загрузить файлы...
                </button>

                <button
                    type="button"
                    className={`data-uploader__button ${isLoading ? 'loading' : ''}`}
                    disabled={isLoading}
                    onClick={() => setOpenedModalProps({
                        isOpened: true,
                        type: "confirm",
                        title: "Начать сохранение и шифрование данных?",
                        onConfirm: () => handleSubmit(),
                        onCancel: () => setOpenedModalProps({ isOpened: false, type: "confirm" })
                    })}
                >
                    {isLoading ? (
                        <>
                            <AnimatedLoader />
                            <span>Сохранение</span>
                        </>
                    ) : "Сохранить данные"}
                </button>


                <input type="file" hidden ref={fileInputRef} onChange={handleFileUpload} multiple accept='.txt' />

                <button
                    type="button"
                    className="data-uploader__button button--cancel"
                    onClick={onClose}
                    disabled={isLoading}
                >
                    Назад
                </button>
            </div>

            {openedModalProps.isOpened === true && (
                openedModalProps.type === 'info' ? (
                    <SimpleModal
                        type={openedModalProps.type}
                        title={openedModalProps.title}
                        message={openedModalProps.message}
                        onConfirm={openedModalProps.onConfirm}
                    />
                ) : (openedModalProps.type === 'confirm') ? (
                    <SimpleModal
                        type={openedModalProps.type} title={openedModalProps.title}
                        message={openedModalProps.message}
                        onConfirm={openedModalProps.onConfirm}
                        onCancel={openedModalProps.onCancel}
                    />
                ) : (openedModalProps.type === 'prompt') ? (
                    <SimpleModal
                        type={openedModalProps.type} title={openedModalProps.title}
                        message={openedModalProps.message}
                        onConfirm={openedModalProps.onConfirm}
                        onCancel={openedModalProps.onCancel}
                    />
                ) : (
                    <SimpleModal
                        type={openedModalProps.type}
                        title={openedModalProps.title}
                        message={openedModalProps.message}
                        current={openedModalProps.uploadData?.progressCurrent || 0}
                        all={openedModalProps.uploadData?.progressAll || 0}
                        displayPercent
                    />
                )
            )}
        </div>
    )
}