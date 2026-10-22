import { ChangeEvent, useRef, useEffect, useState, useMemo } from "react";
import "./DataUploader.css";
import SimpleCheckbox from "../UI/SimpleCheckbox/SimpleCheckbox";
import AnimatedLoader from "../UI/AnimatedLoader/AnimatedLoader";
import SimpleModal, { SimpleModalType } from "../UI/SimpleModal/SimpleModal";
import { ClientCrypto } from "@/modules/ClientCrypto";
import { RecordDataToUpload, FolderUploadItem, uploadRecordsWithFolders } from "@/app/actions";
import { Category } from "@/types/data";

export interface DataUploaderProps {

    categories: Category[];

    keyPassword?: string | null;
    activeCategoryId?: number | null;

    onClose?: () => void;
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

export interface UploadedData {
    name: string;
    encrypt: boolean;
    virtualPath: string;
    file: File;
}

interface TreeNode {
    name: string;
    path: string;
    folders: Map<string, TreeNode>;
    files: number[];
}

function buildTree(files: UploadedData[]): TreeNode {
    const root: TreeNode = { name: "", path: "", folders: new Map(), files: [] };

    files.forEach((f, index) => {
        const segments = f.virtualPath ? f.virtualPath.split("/").filter(Boolean) : [];
        let current = root;
        let innerPath = "";

        for (const seg of segments) {
            innerPath = innerPath ? `${innerPath}/${seg}` : seg;
            let child = current.folders.get(seg);
            if (!child) {
                child = { name: seg, path: innerPath, folders: new Map(), files: [] };
                current.folders.set(seg, child);
            }
            current = child;
        }

        current.files.push(index);
    });

    return root;
}

function findNode(root: TreeNode, path: string): TreeNode | null {
    if (!path) return root;
    let current: TreeNode | undefined = root;
    for (const seg of path.split("/").filter(Boolean)) {
        current = current?.folders.get(seg);
        if (!current) return null;
    }
    return current ?? null;
}

export default function DataUploader({
    categories,
    keyPassword,
    activeCategoryId,
    onClose,
}: DataUploaderProps) {
    const [uploadedData, setUploadedData] = useState<UploadedData[]>([]);
    const [currentVirtualPath, setCurrentVirtualPath] = useState("");
    const [isLoading, setLoading] = useState(false);
    const [openedModalProps, setOpenedModalProps] = useState<OpenedModalProps>({
        isOpened: false,
        type: "confirm",
    });

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const folderInputRef = useRef<HTMLInputElement | null>(null);

    const tree = useMemo(() => buildTree(uploadedData), [uploadedData]);

    useEffect(() => {
        if (currentVirtualPath && !findNode(tree, currentVirtualPath)) {
            setCurrentVirtualPath("");
        }
    }, [tree, currentVirtualPath]);

    const currentFolder = useMemo(
        () => findNode(tree, currentVirtualPath) ?? tree,
        [tree, currentVirtualPath]
    );

    const breadcrumbs = useMemo(() => {
        const result: { name: string; path: string }[] = [];
        if (!currentVirtualPath) return result;
        let acc = "";
        for (const seg of currentVirtualPath.split("/").filter(Boolean)) {
            acc = acc ? `${acc}/${seg}` : seg;
            result.push({ name: seg, path: acc });
        }
        return result;
    }, [currentVirtualPath]);

    const totalFiles = uploadedData.length;
    const allEncrypted = totalFiles > 0 && uploadedData.every((d) => d.encrypt);

    const readFileContents = (file: File) =>
        new Promise<{ success: boolean; data?: string }>((res) => {
            const reader = new FileReader();
            reader.readAsText(file);
            reader.onload = () => res({ success: true, data: reader.result as string });
            reader.onerror = () => res({ success: false });
        });

    const updateEntryInfo = (index: number, data: Partial<UploadedData>) => {
        setUploadedData((p) =>
            p.map((_, i) => (i === index ? { ..._, ...data } : _))
        );
    };

    const removeFile = (index: number) => {
        setUploadedData((p) => p.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        const fullToUpload: FolderUploadItem[] = [];
        let processed = 0;
        const all = uploadedData.length;

        setOpenedModalProps({
            isOpened: true,
            type: "progress",
            title: "Шифрование и сохранение данных...",
            message: "Пожалуйста, не перезагружайте страницу!",
            uploadData: { dataList: [], progressCurrent: 0, progressAll: all },
        });

        for (const ent of uploadedData) {
            const content = await readFileContents(ent.file);
            if (!content.data) continue;
            if (ent.encrypt && !keyPassword) continue;

            const fullContent = ent.encrypt
                ? await ClientCrypto.encrypt(content.data, keyPassword as string)
                : content.data;

            fullToUpload.push({
                title: ent.name,
                isEncrypted: ent.encrypt,
                content: fullContent,
                virtualPath: ent.virtualPath,
            });

            processed++;
            setOpenedModalProps({
                isOpened: true,
                type: "progress",
                title: "Шифрование и сохранение данных...",
                message: "Пожалуйста, не перезагружайте страницу!",
                uploadData: { dataList: [], progressCurrent: processed, progressAll: all },
            });
        }

        const res = await uploadRecordsWithFolders(
            fullToUpload,
            activeCategoryId ?? null
        );

        if (res.success) {
            setOpenedModalProps({
                isOpened: true,
                type: "info",
                title: `Данные успешно сохранены! Загружено: ${res.imported}`,
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
    };

    const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;

        const newFiles: UploadedData[] = Array.from(e.target.files).map((file) => ({
            name: file.name,
            encrypt: false,
            virtualPath: currentVirtualPath,
            file,
        }));

        setUploadedData((p) => [...p, ...newFiles]);
        e.target.value = "";
    };

    const handleFolderUpload = (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;

        const newFiles: UploadedData[] = Array.from(e.target.files).filter(f => f.type === 'text/plain').map((file) => {
            const fullRelative = (file as File & { webkitRelativePath: string })
                .webkitRelativePath;
            const dir = fullRelative.split("/").slice(0, -1).join("/");
            const virtualPath =
                currentVirtualPath && dir
                    ? `${currentVirtualPath}/${dir}`
                    : currentVirtualPath || dir;

            return { name: file.name, encrypt: false, virtualPath, file };
        });

        setUploadedData((p) => [...p, ...newFiles]);
        e.target.value = "";
    };

    const goToFolder = (path: string) => setCurrentVirtualPath(path);

    const goUp = () => {
        const segments = currentVirtualPath.split("/").filter(Boolean);
        segments.pop();
        setCurrentVirtualPath(segments.join("/"));
    };

    return (
        <div className="data-uploader">
            <div className="data-uploader__block">
                {activeCategoryId ? (
                    <>
                        <span className="data-uploader__label">В категории:</span>
                        <div className="data-uploader__value">
                            {categories.find((c) => c.id === activeCategoryId)?.name}
                        </div>
                    </>
                ) : (
                    <span className="data-uploader__label">В корневом каталоге</span>
                )}
            </div>

            <div className="data-uploader__breadcrumbs">
                <span
                    className={`data-uploader__breadcrumb ${currentVirtualPath === "" ? "active" : ""
                        }`}
                    onClick={() => goToFolder("")}
                >
                    Корень загрузки
                </span>
                {breadcrumbs.map((bc) => (
                    <span key={bc.path} className="data-uploader__breadcrumb-wrapper">
                        <span className="data-uploader__breadcrumb-separator">/</span>
                        <span
                            className={`data-uploader__breadcrumb ${currentVirtualPath === bc.path ? "active" : ""
                                }`}
                            onClick={() => goToFolder(bc.path)}
                        >
                            {bc.name}
                        </span>
                    </span>
                ))}
            </div>

            <div className="data-uploader__uploads">
                <div className="data-uploader-item heading-item">
                    <div className="data-uploader-item__left">
                        <span className="data-uploader__label file-count">
                            Файлов: {totalFiles}
                        </span>
                    </div>
                    <div className="data-uploader-item__right">
                        {keyPassword && (
                            <>
                                <div className="data-uploader__block inline-type --mobile-only">
                                    <SimpleCheckbox
                                        disabled={totalFiles === 0}
                                        checked={allEncrypted}
                                        onSelect={() =>
                                            setUploadedData((p) =>
                                                p.map((_) => ({
                                                    ..._,
                                                    encrypt: !allEncrypted,
                                                }))
                                            )
                                        }
                                    />
                                </div>
                                <div className="data-uploader__block inline-type --desktop-only">
                                    <span className="data-uploader__label">
                                        Шифровать все:
                                    </span>
                                    <SimpleCheckbox
                                        disabled={totalFiles === 0}
                                        checked={allEncrypted}
                                        onSelect={() =>
                                            setUploadedData((p) =>
                                                p.map((_) => ({
                                                    ..._,
                                                    encrypt: !allEncrypted,
                                                }))
                                            )
                                        }
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {currentVirtualPath && (
                    <div
                        className="data-uploader-item folder-up"
                        onClick={goUp}
                    >
                        {/* <div className="data-uploader-item__left"> */}
                        <span className="data-uploader-item__folder-name">
                            ⇑ (Назад)
                        </span>
                        {/* </div> */}
                    </div>
                )}

                {Array.from(currentFolder.folders.values()).map((folder) => (
                    <div
                        key={folder.path}
                        className="data-uploader-item folder-item"
                        onClick={() => goToFolder(folder.path)}
                    >
                        <div className="data-uploader-item__left">
                            <span className="data-uploader-item__folder-name">
                                {folder.name}
                            </span>
                        </div>
                        <div className="data-uploader-item__right">
                            <span className="data-uploader__label">
                                {folder.files.length} файл(ов)
                            </span>
                        </div>
                    </div>
                ))}

                {currentFolder.files.map((index) => {
                    const d = uploadedData[index];
                    if (!d) return null;
                    return (
                        <div key={`${index}-${d.name}`} className="data-uploader-item">
                            <div className="data-uploader-item__left">
                                <input
                                    type="text"
                                    className="data-uploader__input"
                                    value={d.name}
                                    onChange={(e) =>
                                        updateEntryInfo(index, {
                                            name: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <div className="data-uploader-item__right">
                                {keyPassword && (
                                    <>
                                        <div className="data-uploader__block inline-type --desktop-only">
                                            <span className="data-uploader__label">
                                                Шифровать:
                                            </span>
                                            <SimpleCheckbox
                                                checked={d.encrypt}
                                                onSelect={(v) =>
                                                    updateEntryInfo(index, {
                                                        encrypt: v,
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="data-uploader__block inline-type --mobile-only">
                                            <SimpleCheckbox
                                                checked={d.encrypt}
                                                onSelect={(v) =>
                                                    updateEntryInfo(index, {
                                                        encrypt: v,
                                                    })
                                                }
                                            />
                                        </div>
                                    </>
                                )}
                                <button
                                    className="data-uploader__button inline --desktop-only"
                                    onClick={() => removeFile(index)}
                                >
                                    Удалить
                                </button>
                                <button
                                    className="data-uploader__button inline --mobile-only"
                                    onClick={() => removeFile(index)}
                                >
                                    ⨉
                                </button>
                            </div>
                        </div>
                    );
                })}

                {currentFolder.files.length === 0 &&
                    currentFolder.folders.size === 0 && (
                        <p className="data-uploader__info">
                            Здесь пока нет файлов. Нажмите «Загрузить файлы...»
                            или «Загрузить папку...».
                        </p>
                    )}
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
                    className="data-uploader__button button--cancel"
                    onClick={() => folderInputRef.current?.click()}
                    disabled={isLoading}
                >
                    Загрузить папку...
                </button>

                <button
                    type="button"
                    className={`data-uploader__button ${isLoading ? "loading" : ""}`}
                    disabled={isLoading || uploadedData.length === 0}
                    onClick={() =>
                        setOpenedModalProps({
                            isOpened: true,
                            type: "confirm",
                            title: "Начать сохранение и шифрование данных?",
                            onConfirm: () => handleSubmit(),
                            onCancel: () =>
                                setOpenedModalProps({ isOpened: false, type: "confirm" }),
                        })
                    }
                >
                    {isLoading ? (
                        <>
                            <AnimatedLoader />
                            <span>Сохранение</span>
                        </>
                    ) : (
                        "Сохранить данные"
                    )}
                </button>

                <input
                    type="file"
                    hidden
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    multiple
                    accept=".txt"
                />
                <input
                    type="file"
                    hidden
                    ref={folderInputRef}
                    onChange={handleFolderUpload}
                    {...{ webkitdirectory: "true" }}
                />

                <button
                    type="button"
                    className="data-uploader__button button--cancel"
                    onClick={onClose}
                    disabled={isLoading}
                >
                    Назад
                </button>
            </div>

            {openedModalProps.isOpened &&
                (openedModalProps.type === "info" ? (
                    <SimpleModal
                        type="info"
                        title={openedModalProps.title}
                        message={openedModalProps.message}
                        onConfirm={openedModalProps.onConfirm}
                    />
                ) : openedModalProps.type === "confirm" ? (
                    <SimpleModal
                        type="confirm"
                        title={openedModalProps.title}
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
                ))}
        </div>
    );
}